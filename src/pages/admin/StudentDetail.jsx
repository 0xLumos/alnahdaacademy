import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import * as api from "@api";
import { confirmAction } from "../../lib/config";
import { useLoad } from "../../lib/auth";
import {
  PAYMENT_KIND, STATUS_LABEL, WEEKDAYS, addDaysISO, currentSubscription, dayWord, daysLeft, errText, fmtDate, money, time12, todayISO,
} from "../../lib/format";
import { ErrorNote, Field, Loading, Modal, PageTitle, genPassword } from "../../components/ui";
import { PaymentForm } from "../../components/MoneyForms";

// Plan presets: name, length in days (end = start + days - 1), and months for the default price.
const PLANS = [["شهري", 30, 1], ["3 أشهر", 90, 3], ["6 أشهر", 180, 6], ["سنوي", 365, 12]];

export default function StudentDetail() {
  const { id } = useParams();
  const { data, error, reload } = useLoad(async () => {
    const [p, subs, classes, enrolled, cats, payments] = await Promise.all([
      api.getProfile(id), api.studentSubscriptions(id), api.listClasses(), api.studentEnrolledClassIds(id),
      api.listCategories(), api.studentPayments(id),
    ]);
    return { p, subs, classes, enrolled: new Set(enrolled), cats, payments };
  }, [id]);
  const [msg, setMsg] = useState(null);
  const [paying, setPaying] = useState(false);

  if (error) return <ErrorNote error={error} onRetry={reload} />;
  if (!data) return <Loading />;
  const { p, subs, classes, enrolled, cats, payments } = data;
  const catLabel = (k) => cats.find((c) => c.key === k)?.label;
  const paidTotal = payments.reduce((s, x) => s + Number(x.amount), 0);
  const cur = currentSubscription(subs);

  const act = (fn, ok) => async () => {
    try { await fn(); setMsg({ ok: true, text: ok }); reload(); }
    catch (e) { setMsg({ ok: false, text: errText(e) }); }
  };

  return (
    <div className="stack">
      <Link className="link back" to="/admin/students">الطلاب</Link>
      <PageTitle action={<Link className="btn btn-ghost" to={`/admin/inbox/${p.id}`}>مراسلة</Link>}>
        {p.full_name}
      </PageTitle>
      {msg && <div className={`note ${msg.ok ? "note-ok" : "note-error"}`} role="status">{msg.text}</div>}

      <div className="grid-2">
        <ProfileCard p={p} cats={cats} onSaved={() => { setMsg({ ok: true, text: "تم حفظ البيانات." }); reload(); }} />
        <AccountCard p={p} act={act} />
      </div>

      <section className="panel">
        <div className="panel-head">
          <h2>الاشتراكات</h2>
          {p.active
            ? <span className={`chip chip-${cur.status}`}>{STATUS_LABEL[cur.status]}
                {(cur.status === "active" || cur.status === "soon") && `، ${dayWord(daysLeft(cur.sub.end_date))}`}</span>
            : <span className="chip chip-off">موقوف</span>}
        </div>
        <AddSubscription key={subs.length} studentId={p.id} subs={subs} cats={cats} category={p.category} onAdded={() => { setMsg({ ok: true, text: "تمت إضافة الاشتراك." }); reload(); }} />
        {subs.length === 0 ? <p className="muted">لا توجد اشتراكات مسجلة.</p> : (
          <div className="table-wrap">
            <table className="table table-stack">
              <thead><tr><th>الخطة</th><th>الفئة</th><th>من</th><th>إلى</th><th>المبلغ</th><th>ملاحظات</th><th /></tr></thead>
              <tbody>
                {subs.map((s) => (
                  <tr key={s.id}>
                    <td className="cell-title">{s.plan}</td><td data-label="الفئة">{catLabel(s.category) ?? ""}</td><td data-label="من">{fmtDate(s.start_date)}</td><td data-label="إلى">{fmtDate(s.end_date)}</td>
                    <td data-label="المبلغ">{s.amount ? money(s.amount) : ""}</td><td data-label="ملاحظات" className="muted">{s.notes}</td>
                    <td className="cell-action">
                      <button className="btn btn-ghost btn-sm" onClick={() => {
                        if (confirmAction("حذف هذا الاشتراك؟ دفعته المسجلة في المالية تُحذف معه.")) act(() => api.deleteSubscription(s.id), "تم حذف الاشتراك.")();
                      }}>حذف</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>المدفوعات</h2>
          <span className="muted">المجموع: <b className="num">{money(paidTotal)}</b></span>
        </div>
        <button className="btn btn-ghost self-start" onClick={() => setPaying(true)}>تسجيل دفعة (ملابس، منتج، أخرى)</button>
        {payments.length === 0 ? <p className="muted">لا توجد دفعات مسجلة.</p> : (
          <ul className="ledger">
            {payments.map((x) => (
              <li key={x.id}>
                <div><b>{PAYMENT_KIND[x.kind]}</b>{x.note && <span className="muted">{x.note}</span>}<time className="muted">{fmtDate(x.paid_on)}</time></div>
                <b className="num amount-in">+{money(x.amount)}</b>
              </li>
            ))}
          </ul>
        )}
      </section>
      {paying && (
        <PaymentForm preset={{ student_id: p.id, kind: "clothing" }} onClose={() => setPaying(false)}
          onDone={() => { setPaying(false); setMsg({ ok: true, text: "تم تسجيل الدفعة." }); reload(); }} />
      )}

      <section className="panel">
        <h2>الحصص المسجّل فيها</h2>
        {classes.length === 0 && <p className="muted">أضف حصصاً من صفحة الحصص أولاً.</p>}
        <div className="checks">
          {classes.map((c) => (
            <label key={c.id} className={`check ${c.active ? "" : "is-off"}`}>
              <input type="checkbox" checked={enrolled.has(c.id)}
                onChange={(e) => act(() => api.setEnrollment(p.id, c.id, e.target.checked),
                  e.target.checked ? `تم تسجيله في ${c.title}.` : `تم إلغاء تسجيله من ${c.title}.`)()} />
              <span>
                <b>{c.title}</b>
                <small>{WEEKDAYS[c.weekday]}، {time12(c.start_time)}{c.active ? "" : "، متوقفة"}</small>
              </span>
            </label>
          ))}
        </div>
      </section>
    </div>
  );
}

function ProfileCard({ p, cats, onSaved }) {
  const [f, setF] = useState({ full_name: p.full_name, phone: p.phone ?? "", category: p.category ?? "" });
  const [err, setErr] = useState("");
  async function save(e) {
    e.preventDefault();
    try { await api.updateProfile(p.id, { full_name: f.full_name.trim(), phone: f.phone.trim() || null, category: f.category || null }); setErr(""); onSaved(); }
    catch (e2) { setErr(errText(e2)); }
  }
  return (
    <section className="panel">
      <h2>البيانات</h2>
      <form className="form" onSubmit={save}>
        <Field label="الاسم الكامل"><input required minLength={2} value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} /></Field>
        <Field label="رقم الهاتف"><input dir="ltr" type="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
        <Field label="الفئة" hint="تحدد سعر الاشتراك الافتراضي">
          <select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>
            <option value="">لم تُحدَّد</option>
            {cats.map((c) => <option key={c.key} value={c.key}>{c.label} ({money(c.monthly_price)})</option>)}
          </select>
        </Field>
        <Field label="اسم المستخدم"><input dir="ltr" value={p.username} disabled /></Field>
        {err && <div className="note note-error">{err}</div>}
        <div className="row-end"><button className="btn btn-ghost">حفظ البيانات</button></div>
      </form>
    </section>
  );
}

function AccountCard({ p, act }) {
  const [newPw, setNewPw] = useState(null);
  return (
    <section className="panel">
      <h2>الحساب</h2>
      <p className="muted">إذا نسي الطالب كلمة المرور، عيّن له كلمة جديدة وأعطه إياها.</p>
      <div className="row-start">
        <button className="btn btn-ghost" onClick={() => setNewPw(genPassword())}>تعيين كلمة مرور جديدة</button>
        {p.active
          ? <button className="btn btn-ghost btn-danger" onClick={() => {
              if (confirmAction(`إيقاف حساب ${p.full_name}؟ لن يتمكن من الدخول حتى تعيد تفعيله.`)) act(() => api.setActive(p.id, false), "تم إيقاف الحساب.")();
            }}>إيقاف الحساب</button>
          : <button className="btn btn-red" onClick={act(() => api.setActive(p.id, true), "تم تفعيل الحساب.")}>تفعيل الحساب</button>}
      </div>
      {newPw && (
        <Modal title="كلمة مرور جديدة" onClose={() => setNewPw(null)}>
          <form className="form" onSubmit={async (e) => {
            e.preventDefault();
            await act(() => api.resetPassword(p.id, newPw), `تم تعيين كلمة المرور الجديدة: ${newPw}`)();
            setNewPw(null);
          }}>
            <Field label="كلمة المرور" hint="8 أحرف على الأقل">
              <input dir="ltr" minLength={8} required value={newPw} onChange={(e) => setNewPw(e.target.value)} />
            </Field>
            <div className="row-end">
              <button type="button" className="btn btn-ghost" onClick={() => setNewPw(null)}>إلغاء</button>
              <button className="btn btn-red">حفظ كلمة المرور</button>
            </div>
          </form>
        </Modal>
      )}
    </section>
  );
}

function AddSubscription({ studentId, subs, cats, category, onAdded }) {
  // A renewal starts the day after the latest end date if that is still in the future.
  const latestEnd = subs.reduce((m, s) => (s.end_date > m ? s.end_date : m), "");
  const defStart = latestEnd >= todayISO() ? addDaysISO(latestEnd, 1) : todayISO();
  const [open, setOpen] = useState(false);
  // Default amount = category monthly price x plan months. Typing an amount (e.g. a discount) stops the auto-fill.
  const priceFor = (cat, plan) => {
    const c = cats.find((x) => x.key === cat); const months = PLANS.find(([n]) => n === plan)?.[2];
    return c && months ? String(c.monthly_price * months) : "";
  };
  const [f, setF] = useState({ plan: "شهري", category: category ?? "", start_date: defStart, end_date: addDaysISO(defStart, 29),
    amount: priceFor(category, "شهري"), notes: "" });
  const [err, setErr] = useState("");
  const [touched, setTouched] = useState(false);

  const pick = (plan) => {
    const days = PLANS.find(([n]) => n === plan)?.[1];
    setF({ ...f, plan, end_date: days ? addDaysISO(f.start_date, days - 1) : f.end_date, amount: touched ? f.amount : priceFor(f.category, plan) });
  };
  const setStart = (start_date) => {
    const days = PLANS.find(([n]) => n === f.plan)?.[1];
    setF({ ...f, start_date, end_date: days ? addDaysISO(start_date, days - 1) : f.end_date });
  };

  async function submit(e) {
    e.preventDefault();
    if (f.end_date < f.start_date) { setErr("تاريخ الانتهاء قبل تاريخ البداية."); return; }
    try {
      await api.addSubscription({ student_id: studentId, category: f.category || null, plan: f.plan, start_date: f.start_date, end_date: f.end_date,
        amount: f.amount, notes: f.notes.trim() || null });
      setOpen(false); setErr(""); onAdded();
    } catch (e2) { setErr(errText(e2)); }
  }

  if (!open) return <button className="btn btn-red self-start" onClick={() => setOpen(true)}>تسجيل اشتراك</button>;
  return (
    <form className="form form-inline" onSubmit={submit}>
      <Field label="الخطة">
        <select value={PLANS.some(([n]) => n === f.plan) ? f.plan : "other"}
          onChange={(e) => (e.target.value === "other" ? setF({ ...f, plan: "" }) : pick(e.target.value))}>
          {PLANS.map(([n]) => <option key={n}>{n}</option>)}
          <option value="other">خطة أخرى</option>
        </select>
      </Field>
      {!PLANS.some(([n]) => n === f.plan) && (
        <Field label="اسم الخطة"><input required value={f.plan} onChange={(e) => setF({ ...f, plan: e.target.value })} /></Field>
      )}
      <Field label="الفئة">
        <select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value, amount: touched ? f.amount : priceFor(e.target.value, f.plan) })}>
          <option value="">بدون فئة</option>
          {cats.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
        </select>
      </Field>
      <Field label="من"><input type="date" required value={f.start_date} onChange={(e) => setStart(e.target.value)} /></Field>
      <Field label="إلى"><input type="date" required value={f.end_date} onChange={(e) => setF({ ...f, end_date: e.target.value })} /></Field>
      <Field label="المبلغ المدفوع نقداً (₪)" hint="يُسجَّل في المالية تلقائياً">
        <input type="number" min="0" step="0.5" inputMode="decimal" dir="ltr" value={f.amount}
          onChange={(e) => { setTouched(true); setF({ ...f, amount: e.target.value }); }} />
      </Field>
      <Field label="ملاحظات"><input maxLength={500} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></Field>
      {err && <div className="note note-error">{err}</div>}
      <div className="row-end">
        <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>إلغاء</button>
        <button className="btn btn-red">حفظ الاشتراك</button>
      </div>
    </form>
  );
}
