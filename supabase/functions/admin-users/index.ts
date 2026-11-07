// Admin-only account management. Holds the service-role key server side.
// Actions: create, reset_password, set_active.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const URL = Deno.env.get("SUPABASE_URL")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
export const EMAIL_DOMAIN = "nahda.local"; // must match src/lib/config.js

const cors = {
  "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") ?? "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const USERNAME_RE = /^[a-z0-9_.]{3,32}$/;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });

  // 1. Identify caller from their JWT and require an active admin.
  const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!jwt) return json(401, { error: "unauthorized" });
  const asCaller = createClient(URL, ANON, { global: { headers: { Authorization: `Bearer ${jwt}` } } });
  const { data: who, error: whoErr } = await asCaller.auth.getUser(jwt);
  if (whoErr || !who?.user) return json(401, { error: "unauthorized" });

  const admin = createClient(URL, SERVICE, { auth: { persistSession: false } });
  const { data: me } = await admin.from("profiles").select("role, active").eq("id", who.user.id).single();
  if (!me || me.role !== "admin" || !me.active) return json(403, { error: "forbidden" });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json(400, { error: "bad_json" }); }

  switch (body.action) {
    case "create": {
      const username = String(body.username ?? "").trim().toLowerCase();
      const password = String(body.password ?? "");
      const full_name = String(body.full_name ?? "").trim();
      const phone = body.phone ? String(body.phone).trim() : null;
      const role = body.role === "admin" ? "admin" : "student";
      const category = body.category ? String(body.category) : null; // FK to categories; invalid keys are rejected by the DB
      if (!USERNAME_RE.test(username)) return json(400, { error: "invalid_username" });
      if (password.length < 8) return json(400, { error: "weak_password" });
      if (full_name.length < 2) return json(400, { error: "invalid_name" });

      const { data: created, error } = await admin.auth.admin.createUser({
        email: `${username}@${EMAIL_DOMAIN}`, password, email_confirm: true,
      });
      if (error) {
        const taken = /already|exists|registered/i.test(error.message);
        return json(taken ? 409 : 400, { error: taken ? "username_taken" : error.message });
      }
      const { error: pErr } = await admin.from("profiles")
        .insert({ id: created.user.id, username, full_name, phone, role, category });
      if (pErr) { // roll back the auth user so the username is not stuck
        await admin.auth.admin.deleteUser(created.user.id);
        return json(pErr.code === "23505" ? 409 : 400, { error: pErr.code === "23505" ? "username_taken" : pErr.message });
      }
      return json(200, { id: created.user.id });
    }

    case "reset_password": {
      const id = String(body.user_id ?? "");
      const password = String(body.password ?? "");
      if (password.length < 8) return json(400, { error: "weak_password" });
      const { error } = await admin.auth.admin.updateUserById(id, { password });
      return error ? json(400, { error: error.message }) : json(200, { ok: true });
    }

    case "set_active": {
      const id = String(body.user_id ?? "");
      const active = body.active === true;
      if (id === who.user.id) return json(400, { error: "cannot_deactivate_self" });
      // Ban blocks new logins and token refresh; the profile flag blocks data access via RLS immediately.
      const { error } = await admin.auth.admin.updateUserById(id, { ban_duration: active ? "none" : "876000h" });
      if (error) return json(400, { error: error.message });
      const { error: pErr } = await admin.from("profiles").update({ active }).eq("id", id);
      return pErr ? json(400, { error: pErr.message }) : json(200, { ok: true });
    }

    default:
      return json(400, { error: "unknown_action" });
  }
});
