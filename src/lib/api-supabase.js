// Real backend. Every function throws Error on failure.
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY, usernameToEmail } from "./config";

const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const unwrap = ({ data, error }) => { if (error) throw new Error(error.message); return data; };
const uid = async () => (await sb.auth.getSession()).data.session?.user.id ?? null;

// ---------- auth ----------
export async function signIn(username, password) {
  const { error } = await sb.auth.signInWithPassword({ email: usernameToEmail(username), password });
  if (error) throw new Error("bad_login");
}
export const signOut = () => sb.auth.signOut();
export async function getMe() {
  const id = await uid();
  if (!id) return null;
  return unwrap(await sb.from("profiles").select("*").eq("id", id).maybeSingle());
}
export function onAuthChange(cb) {
  const { data } = sb.auth.onAuthStateChange(() => cb());
  return () => data.subscription.unsubscribe();
}

// ---------- admin account management (edge function) ----------
async function adminFn(payload) {
  const { data, error } = await sb.functions.invoke("admin-users", { body: payload });
  if (error) {
    let code = error.message;
    try { code = (await error.context.json()).error ?? code; } catch { /* keep message */ }
    throw new Error(code);
  }
  return data;
}
export const createUser = (p) => adminFn({ action: "create", ...p });
export const resetPassword = (user_id, password) => adminFn({ action: "reset_password", user_id, password });
export const setActive = (user_id, active) => adminFn({ action: "set_active", user_id, active });

// ---------- profiles ----------
export const listStudents = async () =>
  unwrap(await sb.from("profiles").select("*").eq("role", "student").order("full_name"));
export const getProfile = async (id) => unwrap(await sb.from("profiles").select("*").eq("id", id).single());
export const updateProfile = async (id, patch) =>
  unwrap(await sb.from("profiles").update(patch).eq("id", id));

// ---------- classes ----------
export const listClasses = async () =>
  unwrap(await sb.from("classes").select("*").order("weekday").order("start_time"));
export async function saveClass(c) {
  const row = { title: c.title, coach_name: c.coach_name || null, location: c.location || null,
    weekday: Number(c.weekday), start_time: c.start_time, end_time: c.end_time, active: c.active ?? true };
  return c.id ? unwrap(await sb.from("classes").update(row).eq("id", c.id))
              : unwrap(await sb.from("classes").insert(row));
}
export const deleteClass = async (id) => unwrap(await sb.from("classes").delete().eq("id", id));

// ---------- enrollments ----------
export const myEnrolledClassIds = async () =>
  (unwrap(await sb.from("enrollments").select("class_id").eq("student_id", await uid()))).map((r) => r.class_id);
export const studentEnrolledClassIds = async (studentId) =>
  (unwrap(await sb.from("enrollments").select("class_id").eq("student_id", studentId))).map((r) => r.class_id);
export const classRoster = async (classId) =>
  (unwrap(await sb.from("enrollments").select("student_id").eq("class_id", classId))).map((r) => r.student_id);
export async function setEnrollment(studentId, classId, on) {
  return on
    ? unwrap(await sb.from("enrollments").upsert({ student_id: studentId, class_id: classId }))
    : unwrap(await sb.from("enrollments").delete().eq("student_id", studentId).eq("class_id", classId));
}

// ---------- subscriptions ----------
export const mySubscriptions = async () =>
  unwrap(await sb.from("subscriptions").select("*").eq("student_id", await uid()).order("end_date", { ascending: false }));
export const studentSubscriptions = async (studentId) =>
  unwrap(await sb.from("subscriptions").select("*").eq("student_id", studentId).order("end_date", { ascending: false }));
export const allSubscriptions = async () => unwrap(await sb.from("subscriptions").select("*"));
// Inserts the subscription and, if an amount was paid, its cash payment, in one transaction.
export const addSubscription = async (s) =>
  unwrap(await sb.rpc("record_subscription", {
    p_student: s.student_id, p_category: s.category || null, p_plan: s.plan, p_start: s.start_date, p_end: s.end_date,
    p_amount: s.amount === "" || s.amount == null ? null : Number(s.amount), p_notes: s.notes || null,
  }));
export const deleteSubscription = async (id) => unwrap(await sb.from("subscriptions").delete().eq("id", id));

// ---------- announcements ----------
export const listAnnouncements = async () =>
  unwrap(await sb.from("announcements").select("*").order("created_at", { ascending: false }).limit(100));
export const postAnnouncement = async (a) =>
  unwrap(await sb.from("announcements").insert({ title: a.title, body: a.body, class_id: a.class_id || null, created_by: await uid() }));
export const deleteAnnouncement = async (id) => unwrap(await sb.from("announcements").delete().eq("id", id));
export const markAnnouncementsSeen = async () => unwrap(await sb.rpc("mark_announcements_seen"));

// ---------- chat ----------
export const listThread = async (studentId) =>
  unwrap(await sb.from("chat_messages").select("*").eq("student_id", studentId).order("created_at").limit(500));
export const sendMessage = async (studentId, body) =>
  unwrap(await sb.from("chat_messages").insert({ student_id: studentId, sender_id: await uid(), body }));
export const markThreadRead = async (studentId) => unwrap(await sb.rpc("mark_thread_read", { p_student: studentId }));
export const adminThreads = async () => unwrap(await sb.rpc("admin_threads"));
export async function myUnreadCount() {
  const id = await uid();
  const { count, error } = await sb.from("chat_messages").select("id", { count: "exact", head: true })
    .eq("student_id", id).neq("sender_id", id).is("read_at", null);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

// Realtime: RLS still applies, so each user only receives rows they can read.
export function subscribe(table, cb, filter) {
  const ch = sb.channel(`${table}-${filter ?? "all"}-${Math.random().toString(36).slice(2)}`)
    .on("postgres_changes", { event: "*", schema: "public", table, ...(filter ? { filter } : {}) }, cb)
    .subscribe();
  return () => sb.removeChannel(ch);
}

// ---------- prices ----------
export const listCategories = async () => unwrap(await sb.from("categories").select("*").order("sort"));
export const updateCategory = async (key, patch) => unwrap(await sb.from("categories").update(patch).eq("key", key));

// ---------- products ----------
export const productImageUrl = (path) => (path ? sb.storage.from("products").getPublicUrl(path).data.publicUrl : null);
export const listProducts = async () =>
  unwrap(await sb.from("products").select("*").order("sort").order("created_at"));
export async function saveProduct(p, file) {
  let image_path = p.image_path ?? null;
  if (file) {
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error } = await sb.storage.from("products").upload(path, file, { contentType: file.type, upsert: false });
    if (error) throw new Error(error.message);
    if (image_path) await sb.storage.from("products").remove([image_path]);
    image_path = path;
  }
  const row = { name: p.name, description: p.description || null, price: Number(p.price), type: p.type,
    available: p.available ?? true, image_path };
  return p.id ? unwrap(await sb.from("products").update(row).eq("id", p.id))
              : unwrap(await sb.from("products").insert(row));
}
export async function deleteProduct(p) {
  unwrap(await sb.from("products").delete().eq("id", p.id));
  if (p.image_path) await sb.storage.from("products").remove([p.image_path]);
}

// ---------- money (admin only, enforced by RLS) ----------
export const listPayments = async (from, to) =>
  unwrap(await sb.from("payments").select("*").gte("paid_on", from).lte("paid_on", to).order("paid_on", { ascending: false }).order("created_at", { ascending: false }));
export const studentPayments = async (studentId) =>
  unwrap(await sb.from("payments").select("*").eq("student_id", studentId).order("paid_on", { ascending: false }));
export const addPayment = async (p) => unwrap(await sb.from("payments").insert({
  student_id: p.student_id || null, payer_name: p.payer_name || null, kind: p.kind, amount: Number(p.amount),
  paid_on: p.paid_on, product_id: p.product_id || null, quantity: p.quantity ? Number(p.quantity) : null,
  note: p.note || null, created_by: await uid() }));
export const deletePayment = async (id) => unwrap(await sb.from("payments").delete().eq("id", id));
export const listExpenses = async (from, to) =>
  unwrap(await sb.from("expenses").select("*").gte("spent_on", from).lte("spent_on", to).order("spent_on", { ascending: false }));
export const addExpense = async (e) => unwrap(await sb.from("expenses").insert({
  category: e.category, amount: Number(e.amount), spent_on: e.spent_on, note: e.note || null, created_by: await uid() }));
export const deleteExpense = async (id) => unwrap(await sb.from("expenses").delete().eq("id", id));
