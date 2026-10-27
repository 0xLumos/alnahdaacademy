import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import * as api from "@api";
import { useLoad } from "../../lib/auth";
import { STATUS_LABEL, currentSubscription, dayWord, daysLeft, errText, fmtDate, money } from "../../lib/format";
import { ErrorNote, Field, Loading, Modal, PageTitle, genPassword } from "../../components/ui";

const FILTERS = [
  ["all", "الكل"], ["paid", "اشتراك ساري"], ["soon", "ينتهي قريباً"], ["expired", "بدون اشتراك ساري"], ["off", "موقوف"],
];
const match = (f, r) => ({
  all: true,
  paid: r.active && (r.status === "active" || r.status === "soon"),
  soon: r.active && r.status === "soon",
  expired: r.active && (r.status === "expired" || r.status === "none"),
  off: !r.active,
}[f]);

export default function Students() {
  const [params, setParams] = useSearchParams();
  const f = params.get("f") ?? "all";
  const [q, setQ] = useState("");
  const [adding, setAdding] = useState(false);
  const { data, error, reload } = useLoad(async () => {
    const [students, subs] = await Promise.all([api.listStudents(), api.allSubscriptions()]);
    return students.map((s) => ({ ...s, ...currentSubscription(subs.filter((x) => x.student_id === s.id)) }));
  });

  if (error) return <ErrorNote error={error} onRetry={reload} />;
  if (!data) return <Loading />;

  const needle = q.trim().toLowerCase();
  const rows = data.filter((r) => match(f, r) && (!needle ||
    r.full_name.toLowerCase().includes(needle) || r.username.includes(needle) || (r.phone ?? "").includes(needle)));

  return (
    <div className="stack">
      <PageTitle action={<button className="btn btn-red" onClick={() => setAdding(true)}>إضافة طالب</button>}>الطلاب</PageTitle>
      <div className="toolbar">
        <input type="search" placeholder="ابحث بالاسم أو اسم المستخدم أو الهاتف" aria-label="بحث"
          value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="seg" role="group" aria-label="تصفية">
          {FILTERS.map(([k, label]) => (
            <button key={k} aria-pressed={f === k} onClick={() => setParams(k === "all" ? {} : { f: k })}>{label}</button>
          ))}
        </div>
      </div>

      <div className="table-wrap">
        <table className="table table-stack">
          <thead><tr><th>الاسم</th><th>اسم المستخدم</th><th>الاشتراك</th><th>ينتهي</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="cell-title"><Link to={`/admin/students/${r.id}`}>{r.full_name}</Link></td>
                <td data-label="اسم المستخدم"><span dir="ltr" className="mono-ish">{r.username}</span></td>
                <td data-label="الاشتراك">
                  {r.active
                    ? <span className={`chip chip-${r.status}`}>{STATUS_LABEL[r.status]}</span>
                    : <span className="chip chip-off">موقوف</span>}
                </td>
                <td data-label="ينتهي" className="muted">
                  {r.sub ? fmtDate(r.sub.end_date) : "لا يوجد"}
                  {r.active && (r.status === "active" || r.status === "soon") && ` (${dayWord(daysLeft(r.sub.end_date))})`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="muted pad">لا يوجد طلاب بهذا التصفية.</p>}
      </div>

      {adding && <AddStudent onClose={() => setAdding(false)} onDone={reload} />}
    </div>
  );
}

function AddStudent({ onClose, onDone }) {
  const nav = useNavigate();
  const [form, setForm] = useState({ full_name: "", username: "", phone: "", category: "", password: genPassword() });
  const { data: cats } = useLoad(() => api.listCategories());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [created, setCreated] = useState(null);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setErr("");
    try {
      const { id } = await api.createUser({ ...form, username: form.username.trim().toLowerCase(), role: "student" });
      setCreated({ id, ...form, username: form.username.trim().toLowerCase() });
      onDone();
    } catch (e2) { setErr(errText(e2)); }
    finally { setBusy(false); }
  }

  if (created) return (
    <Modal title="تم إنشاء الحساب" onClose={onClose}>
      <p>أعطِ الطالب هذه البيانات لتسجيل الدخول. لن تظهر كلمة المرور مرة أخرى، ويمكنك تعيين كلمة جديدة لاحقاً.</p>
      <dl className="creds">
        <dt>اسم المستخدم</dt><dd dir="ltr">{created.username}</dd>
        <dt>كلمة المرور</dt><dd dir="ltr">{created.password}</dd>
      </dl>
      <div className="row-end">
        <button className="btn btn-ghost" onClick={() => navigator.clipboard?.writeText(`${created.username}\n${created.password}`)}>نسخ البيانات</button>
        <button className="btn btn-red" onClick={() => nav(`/admin/students/${created.id}`)}>إضافة اشتراك وحصص</button>
      </div>
    </Modal>
  );

  return (
    <Modal title="إضافة طالب" onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <Field label="الاسم الكامل"><input required minLength={2} value={form.full_name} onChange={set("full_name")} /></Field>
        <Field label="اسم المستخدم" hint="أحرف إنجليزية صغيرة أو أرقام أو _ أو . (3 إلى 32)">
          <input required dir="ltr" pattern="[a-z0-9_.]{3,32}" autoCapitalize="none" spellCheck="false"
            value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase() })} />
        </Field>
        <Field label="رقم الهاتف"><input dir="ltr" type="tel" value={form.phone} onChange={set("phone")} /></Field>
        <Field label="الفئة" hint="15 سنة وما فوق تُعتبر شباب">
          <select value={form.category} onChange={set("category")}>
            <option value="">لم تُحدَّد</option>
            {(cats ?? []).map((c) => <option key={c.key} value={c.key}>{c.label} ({money(c.monthly_price)})</option>)}
          </select>
        </Field>
        <Field label="كلمة المرور" hint="8 أحرف على الأقل. تم توليدها تلقائياً ويمكنك تغييرها.">
          <input required dir="ltr" minLength={8} value={form.password} onChange={set("password")} />
        </Field>
        {err && <div className="note note-error" role="alert">{err}</div>}
        <div className="row-end">
          <button type="button" className="btn btn-ghost" onClick={onClose}>إلغاء</button>
          <button className="btn btn-red" disabled={busy}>{busy ? "جارٍ الإنشاء…" : "إنشاء الحساب"}</button>
        </div>
      </form>
    </Modal>
  );
}
