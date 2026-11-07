export const DEMO = import.meta.env.VITE_DEMO === "1";
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
// Usernames map to internal emails. Must match EMAIL_DOMAIN in supabase/functions/admin-users.
export const EMAIL_DOMAIN = "nahda.local";
// Demo previews can block window.confirm, and demo data resets anyway, so skip the prompt there.
export const confirmAction = (msg) => (DEMO ? true : window.confirm(msg));
export const usernameToEmail = (u) => `${u.trim().toLowerCase()}@${EMAIL_DOMAIN}`;
