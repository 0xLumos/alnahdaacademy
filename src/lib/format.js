// Weekday 0 = Sunday, matching Postgres classes.weekday and JS Date.getDay().
export const WEEKDAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

export const time12 = (t) => {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const suffix = h < 12 ? "ص" : "م";
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${String(m).padStart(2, "0")} ${suffix}`;
};

const dateFmt = new Intl.DateTimeFormat("ar", { day: "numeric", month: "long", year: "numeric" });
const dateTimeFmt = new Intl.DateTimeFormat("ar", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
export const fmtDate = (d) => (d ? dateFmt.format(new Date(d)) : "");
export const fmtDateTime = (d) => (d ? dateTimeFmt.format(new Date(d)) : "");

export const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
export const addDaysISO = (iso, n) => {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// Days left including today. A subscription ending today has 1 day left; ended yesterday = 0.
export const daysLeft = (endISO) => {
  const end = new Date(endISO + "T00:00:00");
  const today = new Date(todayISO() + "T00:00:00");
  return Math.max(0, Math.round((end - today) / 86400000) + 1);
};

// Current subscription = the one covering today with the latest end date; else the most recent one.
export const currentSubscription = (subs) => {
  const t = todayISO();
  const covering = subs.filter((s) => s.start_date <= t && s.end_date >= t)
    .sort((a, b) => b.end_date.localeCompare(a.end_date));
  if (covering.length) return { sub: covering[0], status: daysLeft(covering[0].end_date) <= 7 ? "soon" : "active" };
  const upcoming = subs.filter((s) => s.start_date > t).sort((a, b) => a.start_date.localeCompare(b.start_date));
  if (upcoming.length) return { sub: upcoming[0], status: "upcoming" };
  const past = [...subs].sort((a, b) => b.end_date.localeCompare(a.end_date));
  return { sub: past[0] ?? null, status: past.length ? "expired" : "none" };
};

// Arabic counted noun for days: 1 يوم, 2 يومان, 3-10 أيام, 11+ يوماً.
export const dayWord = (n) => (n === 1 ? "يوم واحد" : n === 2 ? "يومان" : n <= 10 ? `${n} أيام` : `${n} يوماً`);

export const STATUS_LABEL = {
  active: "فعّال", soon: "ينتهي قريباً", upcoming: "يبدأ قريباً", expired: "منتهي", none: "لا يوجد اشتراك",
};

// Shekels, whole numbers without decimals, halves shown as .5
export const money = (n) => `${Number(n || 0).toLocaleString("en", { maximumFractionDigits: 2 })} ₪`;
export const PAYMENT_KIND = { subscription: "اشتراك", clothing: "ملابس (بكجات)", product: "معدات ومنتجات", other: "أخرى" };
export const EXPENSE_CATEGORY = {
  rent: "إيجار", electricity: "كهرباء", water: "مياه", staff: "رواتب موظفين", coaches: "رواتب مدربين", equipment: "معدات وصيانة", other: "أخرى",
};
// First and last day of a "YYYY-MM" month, as ISO dates.
export const monthRange = (ym) => {
  const [y, m] = ym.split("-").map(Number);
  const last = new Date(y, m, 0).getDate();
  return [`${ym}-01`, `${ym}-${String(last).padStart(2, "0")}`];
};
const monthFmt = new Intl.DateTimeFormat("ar", { month: "long", year: "numeric" });
export const fmtMonth = (ym) => monthFmt.format(new Date(ym + "-01T00:00:00"));

export const ERRORS = {
  invalid_amount: "أدخل مبلغاً أكبر من صفر.",
  invalid_username: "اسم المستخدم يجب أن يكون 3 إلى 32 حرفاً إنجليزياً صغيراً أو أرقاماً أو _ أو .",
  weak_password: "كلمة المرور يجب أن تكون 8 أحرف على الأقل.",
  invalid_name: "أدخل الاسم الكامل.",
  username_taken: "اسم المستخدم مستخدم من قبل. اختر اسماً آخر.",
  cannot_deactivate_self: "لا يمكنك إيقاف حسابك.",
  forbidden: "هذه العملية للمدير فقط.",
  unauthorized: "انتهت الجلسة. سجّل الدخول من جديد.",
};
export const errText = (e) => ERRORS[e?.message] ?? e?.message ?? "حدث خطأ غير متوقع.";
