// In-memory backend for previewing the UI without Supabase (npm run demo).
// Log in as "admin" or "ahmad" with any password of 8+ characters. Data resets on reload.
import { todayISO, addDaysISO } from "./format";

const id = () => crypto.randomUUID();
const now = () => new Date().toISOString();
const ago = (min) => new Date(Date.now() - min * 60000).toISOString();
const t = todayISO();

const P = {
  admin: { id: "u-admin", username: "admin", full_name: "مدير الأكاديمية", phone: "0790000000", role: "admin", active: true },
  ahmad: { id: "u-ahmad", username: "ahmad", full_name: "أحمد خالد", phone: "0791112233", role: "student", active: true },
  sara: { id: "u-sara", username: "sara", full_name: "سارة يوسف", phone: "0795556677", role: "student", active: true },
  omar: { id: "u-omar", username: "omar", full_name: "عمر الحسن", phone: null, role: "student", active: false },
  layan: { id: "u-layan", username: "layan", full_name: "ليان محمود", phone: "0798889900", role: "student", active: true },
};
const CATS = [
  { key: "youth", label: "شباب (15 سنة وما فوق)", description: "MMA وكيك بوكسينغ", monthly_price: 250, sort: 1 },
  { key: "kids", label: "صبيان وأطفال (أقل من 15 سنة)", description: null, monthly_price: 200, sort: 2 },
  { key: "women", label: "سيدات", description: null, monthly_price: 150, sort: 3 },
];
const db = {
  categories: CATS,
  // Sample products for the demo only. The real shop starts empty.
  products: [
    { id: "p1", name: "قفازات ملاكمة", description: "مقاسات 10 و12 و14 أونصة.", price: 120, type: "equipment", image_path: null, available: true, sort: 1 },
    { id: "p2", name: "واقي أسنان", description: "يُشكَّل بالماء الساخن.", price: 25, type: "equipment", image_path: null, available: true, sort: 2 },
    { id: "p3", name: "رباط يد", description: "طول 4.5 متر، زوج.", price: 30, type: "equipment", image_path: null, available: true, sort: 3 },
    { id: "p4", name: "قفازات MMA", description: "أصابع مفتوحة للتدريب والمنازلة.", price: 140, type: "equipment", image_path: null, available: true, sort: 4 },
    { id: "p5", name: "بكج ملابس الأكاديمية", description: "تيشيرت وشورت بشعار الأكاديمية.", price: 90, type: "clothing", image_path: null, available: true, sort: 5 },
    { id: "p6", name: "واقي ساق", description: "للكيك بوكسينغ.", price: 80, type: "equipment", image_path: null, available: false, sort: 6 },
  ],
  payments: [],
  expenses: [
    { id: id(), category: "rent", amount: 2500, spent_on: t.slice(0, 8) + "01", note: "إيجار الشهر", created_at: now() },
    { id: id(), category: "electricity", amount: 430, spent_on: t.slice(0, 8) + "05", note: null, created_at: now() },
    { id: id(), category: "water", amount: 90, spent_on: t.slice(0, 8) + "05", note: null, created_at: now() },
    { id: id(), category: "coaches", amount: 3000, spent_on: t.slice(0, 8) + "01", note: "كابتن سامر وكابتن رامي", created_at: now() },
  ],
  profiles: Object.values(P).map((p) => ({ ...p, category: { ahmad: "youth", sara: "women", omar: "youth", layan: "kids" }[p.username] ?? null, created_at: ago(60 * 24 * 30), announcements_seen_at: ago(60 * 24) })),
  classes: [
    { id: "c1", title: "MMA شباب", coach_name: "كابتن سامر", location: "الصالة الرئيسية", weekday: 0, start_time: "17:00", end_time: "18:30", active: true },
    { id: "c2", title: "كيك بوكسينغ شباب", coach_name: "كابتن رامي", location: "الصالة الرئيسية", weekday: 1, start_time: "19:00", end_time: "20:30", active: true },
    { id: "c3", title: "سيدات", coach_name: "كابتن رنا", location: "الصالة الرئيسية", weekday: 2, start_time: "18:00", end_time: "19:00", active: true },
    { id: "c4", title: "MMA شباب", coach_name: "كابتن سامر", location: "الصالة الرئيسية", weekday: 3, start_time: "17:00", end_time: "18:30", active: true },
    { id: "c5", title: "صبيان وأطفال", coach_name: "كابتن ليث", location: "الصالة الرئيسية", weekday: 5, start_time: "10:00", end_time: "11:00", active: true },
    { id: "c6", title: "كيك بوكسينغ شباب", coach_name: "كابتن رامي", location: "الصالة الرئيسية", weekday: 6, start_time: "16:00", end_time: "17:30", active: false },
  ],
  enrollments: [
    ["u-ahmad", "c1"], ["u-ahmad", "c2"], ["u-ahmad", "c4"], ["u-sara", "c3"], ["u-layan", "c5"], ["u-omar", "c1"],
  ].map(([student_id, class_id]) => ({ student_id, class_id })),
  subscriptions: [
    { id: id(), student_id: "u-ahmad", plan: "شهري", start_date: addDaysISO(t, -12), end_date: addDaysISO(t, 18), amount: 35, notes: "دفع نقداً" },
    { id: id(), student_id: "u-ahmad", plan: "شهري", start_date: addDaysISO(t, -42), end_date: addDaysISO(t, -13), amount: 35, notes: null },
    { id: id(), student_id: "u-sara", plan: "3 أشهر", start_date: addDaysISO(t, -85), end_date: addDaysISO(t, 4), amount: 90, notes: null },
    { id: id(), student_id: "u-layan", plan: "شهري", start_date: addDaysISO(t, -40), end_date: addDaysISO(t, -10), amount: 30, notes: null },
    { id: id(), student_id: "u-omar", plan: "شهري", start_date: addDaysISO(t, -200), end_date: addDaysISO(t, -170), amount: 35, notes: null },
  ],
  announcements: [
    { id: id(), title: "تغيير موعد حصة الأحد", body: "حصة MMA يوم الأحد تبدأ الساعة 5:30 بدلاً من 5:00 هذا الأسبوع فقط.", class_id: "c1", created_at: ago(90) },
    { id: id(), title: "بطولة الأكاديمية الداخلية", body: "التسجيل مفتوح لبطولة نهاية الشهر. سجّل اسمك عند الاستقبال قبل يوم الخميس.", class_id: null, created_at: ago(60 * 26) },
    { id: id(), title: "إغلاق يوم الجمعة", body: "الأكاديمية مغلقة يوم الجمعة القادم للصيانة.", class_id: null, created_at: ago(60 * 24 * 4) },
  ],
  chat: [
    { id: id(), student_id: "u-ahmad", sender_id: "u-ahmad", body: "مرحباً، هل يمكنني حضور حصة الكيك بوكسينغ يوم السبت للتجربة؟", created_at: ago(300), read_at: ago(250) },
    { id: id(), student_id: "u-ahmad", sender_id: "u-admin", body: "أهلاً أحمد. نعم، تعال قبل الحصة بعشر دقائق وكلّم كابتن سامر.", created_at: ago(240), read_at: null },
    { id: id(), student_id: "u-sara", sender_id: "u-sara", body: "اشتراكي ينتهي قريباً، هل يوجد عرض على 3 أشهر؟", created_at: ago(35), read_at: null },
    { id: id(), student_id: "u-layan", sender_id: "u-layan", body: "شكراً على الحصة اليوم", created_at: ago(60 * 30), read_at: ago(60 * 29) },
  ],
};

let me = null;
const listeners = new Set();
const emit = (table) => listeners.forEach((l) => l.table === table && l.cb());
const wait = (v) => new Promise((r) => setTimeout(() => r(structuredClone(v)), 120));
const need = (cond, code = "forbidden") => { if (!cond) throw new Error(code); };
const isAdmin = () => me?.role === "admin";

export async function signIn(username, password) {
  const p = db.profiles.find((x) => x.username === username.trim().toLowerCase());
  if (!p || !p.active || password.length < 8) throw new Error("bad_login");
  me = p; emit("auth");
}
export async function signOut() { me = null; emit("auth"); }
export const getMe = () => wait(me);
export function onAuthChange(cb) { const l = { table: "auth", cb }; listeners.add(l); return () => listeners.delete(l); }

export async function createUser({ username, password, full_name, phone, role, category }) {
  need(isAdmin());
  username = String(username).trim().toLowerCase();
  need(/^[a-z0-9_.]{3,32}$/.test(username), "invalid_username");
  need(password.length >= 8, "weak_password");
  need(full_name.trim().length >= 2, "invalid_name");
  need(!db.profiles.some((p) => p.username === username), "username_taken");
  const p = { id: id(), username, full_name: full_name.trim(), phone: phone || null, role: role === "admin" ? "admin" : "student", category: category || null, active: true, created_at: now(), announcements_seen_at: now() };
  db.profiles.push(p);
  return wait({ id: p.id });
}
export async function resetPassword(_id, pw) { need(isAdmin()); need(pw.length >= 8, "weak_password"); return wait({ ok: true }); }
export async function setActive(uid, active) {
  need(isAdmin()); need(uid !== me.id, "cannot_deactivate_self");
  db.profiles.find((p) => p.id === uid).active = active; return wait({ ok: true });
}

export const listStudents = () => wait(db.profiles.filter((p) => p.role === "student").sort((a, b) => a.full_name.localeCompare(b.full_name, "ar")));
export const getProfile = (pid) => wait(db.profiles.find((p) => p.id === pid));
export async function updateProfile(pid, patch) { need(isAdmin()); Object.assign(db.profiles.find((p) => p.id === pid), patch); return wait(null); }

const visibleClasses = () => db.classes.filter((c) => isAdmin() || c.active)
  .sort((a, b) => a.weekday - b.weekday || a.start_time.localeCompare(b.start_time));
export const listClasses = () => wait(visibleClasses());
export async function saveClass(c) {
  need(isAdmin());
  const row = { ...c, weekday: Number(c.weekday), active: c.active ?? true };
  if (c.id) Object.assign(db.classes.find((x) => x.id === c.id), row); else db.classes.push({ ...row, id: id() });
  return wait(null);
}
export async function deleteClass(cid) { need(isAdmin()); db.classes = db.classes.filter((c) => c.id !== cid); db.enrollments = db.enrollments.filter((e) => e.class_id !== cid); return wait(null); }

export const myEnrolledClassIds = () => wait(db.enrollments.filter((e) => e.student_id === me.id).map((e) => e.class_id));
export const studentEnrolledClassIds = (sid) => wait(db.enrollments.filter((e) => e.student_id === sid).map((e) => e.class_id));
export const classRoster = (cid) => wait(db.enrollments.filter((e) => e.class_id === cid).map((e) => e.student_id));
export async function setEnrollment(sid, cid, on) {
  need(isAdmin());
  db.enrollments = db.enrollments.filter((e) => !(e.student_id === sid && e.class_id === cid));
  if (on) db.enrollments.push({ student_id: sid, class_id: cid });
  return wait(null);
}

const byEnd = (a, b) => b.end_date.localeCompare(a.end_date);
export const mySubscriptions = () => wait(db.subscriptions.filter((s) => s.student_id === me.id).sort(byEnd));
export const studentSubscriptions = (sid) => wait(db.subscriptions.filter((s) => s.student_id === sid).sort(byEnd));
export const allSubscriptions = () => wait(db.subscriptions);
export async function addSubscription(s) {
  need(isAdmin());
  const sid = id(); const amount = s.amount === "" || s.amount == null ? null : Number(s.amount);
  db.subscriptions.push({ ...s, id: sid, amount, created_at: now() });
  if (amount > 0) db.payments.push({ id: id(), student_id: s.student_id, kind: "subscription", amount, paid_on: todayISO(), subscription_id: sid, note: s.plan, created_at: now() });
  return wait(sid);
}
export async function deleteSubscription(sid) { need(isAdmin()); db.subscriptions = db.subscriptions.filter((s) => s.id !== sid); db.payments = db.payments.filter((p) => p.subscription_id !== sid); return wait(null); }

export function listAnnouncements() {
  const mine = new Set(db.enrollments.filter((e) => e.student_id === me?.id).map((e) => e.class_id));
  return wait(db.announcements.filter((a) => isAdmin() || !a.class_id || mine.has(a.class_id))
    .sort((a, b) => b.created_at.localeCompare(a.created_at)));
}
export async function postAnnouncement(a) { need(isAdmin()); db.announcements.push({ ...a, class_id: a.class_id || null, id: id(), created_at: now() }); emit("announcements"); return wait(null); }
export async function deleteAnnouncement(aid) { need(isAdmin()); db.announcements = db.announcements.filter((a) => a.id !== aid); emit("announcements"); return wait(null); }
export async function markAnnouncementsSeen() { if (me) me.announcements_seen_at = now(); return wait(null); }

export const listThread = (sid) => wait(db.chat.filter((m) => m.student_id === sid).sort((a, b) => a.created_at.localeCompare(b.created_at)));
export async function sendMessage(sid, body) {
  need(isAdmin() || sid === me.id);
  db.chat.push({ id: id(), student_id: sid, sender_id: me.id, body, created_at: now(), read_at: null });
  emit("chat_messages"); return wait(null);
}
export async function markThreadRead(sid) {
  db.chat.forEach((m) => { if (m.student_id === sid && !m.read_at && (isAdmin() ? m.sender_id === sid : m.sender_id !== sid)) m.read_at = now(); });
  emit("chat_messages"); return wait(null);
}
export async function adminThreads() {
  need(isAdmin());
  const ids = [...new Set(db.chat.map((m) => m.student_id))];
  return wait(ids.map((sid) => {
    const msgs = db.chat.filter((m) => m.student_id === sid).sort((a, b) => b.created_at.localeCompare(a.created_at));
    const p = db.profiles.find((x) => x.id === sid);
    return { student_id: sid, full_name: p.full_name, username: p.username, last_body: msgs[0].body, last_at: msgs[0].created_at,
      unread: msgs.filter((m) => !m.read_at && m.sender_id === sid).length };
  }).sort((a, b) => b.last_at.localeCompare(a.last_at)));
}
export const myUnreadCount = () => wait(db.chat.filter((m) => m.student_id === me?.id && m.sender_id !== me.id && !m.read_at).length);
export function subscribe(table, cb) { const l = { table, cb }; listeners.add(l); return () => listeners.delete(l); }

// Seed the ledger: each demo subscription with an amount was paid in cash on its start date.
db.subscriptions.forEach((x) => {
  const cat = db.profiles.find((p) => p.id === x.student_id)?.category;
  x.category = cat;
  if (cat) x.amount = CATS.find((c) => c.key === cat).monthly_price * (x.plan === "3 أشهر" ? 3 : 1);
  if (x.amount) db.payments.push({ id: id(), student_id: x.student_id, kind: "subscription", amount: x.amount, paid_on: x.start_date, subscription_id: x.id, note: x.plan, created_at: now() });
});
db.payments.push({ id: id(), student_id: "u-ahmad", kind: "clothing", amount: 90, paid_on: t, product_id: "p5", quantity: 1, note: null, created_at: now() });
db.payments.push({ id: id(), student_id: null, payer_name: "زائر", kind: "product", amount: 25, paid_on: t, product_id: "p2", quantity: 1, note: null, created_at: now() });

export const listCategories = () => wait([...db.categories].sort((a, b) => a.sort - b.sort));
export async function updateCategory(key, patch) { need(isAdmin()); Object.assign(db.categories.find((c) => c.key === key), patch); return wait(null); }

export const productImageUrl = (path) => path || null; // demo stores object URLs directly
export const listProducts = () => wait(db.products.filter((p) => isAdmin() || p.available).sort((a, b) => a.sort - b.sort));
export async function saveProduct(p, file) {
  need(isAdmin());
  const image_path = file ? URL.createObjectURL(file) : p.image_path ?? null;
  const row = { ...p, price: Number(p.price), available: p.available ?? true, image_path };
  if (p.id) Object.assign(db.products.find((x) => x.id === p.id), row); else db.products.push({ ...row, id: id(), sort: db.products.length + 1 });
  return wait(null);
}
export async function deleteProduct(p) { need(isAdmin()); db.products = db.products.filter((x) => x.id !== p.id); return wait(null); }

const inRange = (d, from, to) => d >= from && d <= to;
const desc = (k) => (a, b) => b[k].localeCompare(a[k]) || b.created_at.localeCompare(a.created_at);
export async function listPayments(from, to) { need(isAdmin()); return wait(db.payments.filter((p) => inRange(p.paid_on, from, to)).sort(desc("paid_on"))); }
export async function studentPayments(sid) { need(isAdmin()); return wait(db.payments.filter((p) => p.student_id === sid).sort(desc("paid_on"))); }
export async function addPayment(p) {
  need(isAdmin()); need(Number(p.amount) > 0, "invalid_amount");
  db.payments.push({ id: id(), student_id: p.student_id || null, payer_name: p.payer_name || null, kind: p.kind, amount: Number(p.amount),
    paid_on: p.paid_on, product_id: p.product_id || null, quantity: p.quantity ? Number(p.quantity) : null, note: p.note || null, created_at: now() });
  return wait(null);
}
export async function deletePayment(pid) { need(isAdmin()); db.payments = db.payments.filter((p) => p.id !== pid); return wait(null); }
export async function listExpenses(from, to) { need(isAdmin()); return wait(db.expenses.filter((e) => inRange(e.spent_on, from, to)).sort(desc("spent_on"))); }
export async function addExpense(e) { need(isAdmin()); need(Number(e.amount) > 0, "invalid_amount"); db.expenses.push({ ...e, id: id(), amount: Number(e.amount), created_at: now() }); return wait(null); }
export async function deleteExpense(eid) { need(isAdmin()); db.expenses = db.expenses.filter((e) => e.id !== eid); return wait(null); }
