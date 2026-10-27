import { useState } from "react";
import { Link } from "react-router-dom";
import * as api from "@api";
import { confirmAction } from "../../lib/config";
import { useLoad } from "../../lib/auth";
import {
  EXPENSE_CATEGORY, PAYMENT_KIND, STATUS_LABEL, currentSubscription, errText, fmtDate, fmtMonth, money, monthRange, todayISO,
} from "../../lib/format";
import { ErrorNote, Loading, PageTitle } from "../../components/ui";
import { ExpenseForm, PaymentForm } from "../../components/MoneyForms";

const sum = (rows) => rows.reduce((s, r) => s + Number(r.amount), 0);
const groupSum = (rows, key) => rows.reduce((m, r) => ({ ...m, [r[key]]: (m[r[key]] ?? 0) + Number(r.amount) }), {});

export default function Finance() {
  const [month, setMonth] = useState(todayISO().slice(0, 7));
  const [modal, setModal] = useState(null);
  const [msg, setMsg] = useState(null);
  const { data, error, reload } = useLoad(async () => {
    const [from, to] = monthRange(month);
    const [payments, expenses, students, subs, cats, products] = await Promise.all([
      api.listPayments(from, to), api.listExpenses(from, to), api.listStudents(), api.allSubscriptions(),
      api.listCategories(), api.listProducts(),
    ]);
    return { payments, expenses, students, subs, cats, products };
  }, [month]);

  if (error) return <ErrorNote error={error} onRetry={reload} />;
  if (!data) return <Loading />;

  const { payments, expenses, students, subs, cats, products } = data;
  const income = sum(payments), spent = sum(expenses), net = income - spent;
  const byKind = groupSum(payments, "kind"), byCat = groupSum(expenses, "category");
  const name = (p) => students.find((s) => s.id === p.student_id)?.full_name ?? p.payer_name ?? "بدون اسم";
  const catLabel = (k) => cats.find((c) => c.key === k)?.label ?? "بدون فئة";
  const prodName = (id) => products.find((p) => p.id === id)?.name;

  // Per-person: every active student plus anyone who paid this month.
  const paidBy = groupSum(payments.filter((p) => p.student_id), "student_id");
  const people = students.filter((s) => s.active || paidBy[s.id])
    .map((s) => ({ ...s, paid: paidBy[s.id] ?? 0, ...currentSubscription(subs.filter((x) => x.student_id === s.id)) }))
    .sort((a, b) => b.paid - a.paid || a.full_name.localeCompare(b.full_name, "ar"));

  const del = async (fn, text) => {
    try { await fn(); setMsg({ ok: true, text }); reload(); } catch (e) { setMsg({ ok: false, text: errText(e) }); }
  };
  const done = (text) => () => { setModal(null); setMsg({ ok: true, text }); reload(); };

  return (
    <div className="stack">
      <PageTitle action={
        <label className="month-pick">
          <span className="muted">الشهر</span>
          <input type="month" value={month} max={todayISO().slice(0, 7)} onChange={(e) => e.target.value && setMonth(e.target.value)} />
        </label>
      }>المالية</PageTitle>
      {msg && <div className={`note ${msg.ok ? "note-ok" : "note-error"}`} role="status">{msg.text}</div>}

      <div className="stats">
        <div className="stat"><b>{money(income)}</b><span>الدخل في {fmtMonth(month)}</span></div>
        <div className="stat stat-bad"><b>{money(spent)}</b><span>المصروفات</span></div>
        <div className={`stat ${net >= 0 ? "stat-ok" : "stat-bad"}`}><b>{money(net)}</b><span>الصافي</span></div>
      </div>

      <div className="row-start">
        <button className="btn btn-red" onClick={() => setModal("pay")}>تسجيل دفعة نقدية</button>
        <button className="btn btn-ghost" onClick={() => setModal("exp")}>تسجيل مصروف</button>
      </div>

      <div className="grid-2">
        <section className="panel">
          <h2>الدخل حسب النوع</h2>
          <ul className="list">
            {Object.entries(PAYMENT_KIND).map(([k, v]) => (
              <li key={k}><span>{v}</span><b className="num">{money(byKind[k])}</b></li>
            ))}
          </ul>
        </section>
        <section className="panel">
          <h2>المصروفات حسب البند</h2>
          <ul className="list">
            {Object.entries(EXPENSE_CATEGORY).map(([k, v]) => (
              <li key={k}><span>{v}</span><b className="num">{money(byCat[k])}</b></li>
            ))}
          </ul>
        </section>
      </div>

      <section className="panel">
        <h2>مدفوعات كل طالب في {fmtMonth(month)}</h2>
        <div className="table-wrap">
          <table className="table table-stack">
            <thead><tr><th>الاسم</th><th>الفئة</th><th>الاشتراك الآن</th><th>دفع هذا الشهر</th></tr></thead>
            <tbody>
              {people.map((p) => (
                <tr key={p.id}>
                  <td className="cell-title"><Link to={`/admin/students/${p.id}`}>{p.full_name}</Link></td>
                  <td data-label="الفئة">{p.category ? catLabel(p.category) : <span className="muted">لم تُحدَّد</span>}</td>
                  <td data-label="الاشتراك الآن">
                    {p.active ? <span className={`chip chip-${p.status}`}>{STATUS_LABEL[p.status]}</span> : <span className="chip chip-off">موقوف</span>}
                  </td>
                  <td data-label="دفع هذا الشهر"><b className={`num ${p.paid ? "" : "muted"}`}>{money(p.paid)}</b></td>
                </tr>
              ))}
            </tbody>
          </table>
          {people.length === 0 && <p className="muted pad">لا يوجد طلاب.</p>}
        </div>
      </section>

      <section className="panel">
        <h2>سجل الدفعات</h2>
        {payments.length === 0 ? <p className="muted">لا توجد دفعات مسجلة في هذا الشهر.</p> : (
          <ul className="ledger">
            {payments.map((p) => (
              <li key={p.id}>
                <div>
                  <b>{name(p)}</b>
                  <span className="muted">
                    {PAYMENT_KIND[p.kind]}{p.product_id && prodName(p.product_id) ? `: ${prodName(p.product_id)}${p.quantity > 1 ? ` ×${p.quantity}` : ""}` : ""}
                    {p.note ? `، ${p.note}` : ""}
                  </span>
                  <time className="muted">{fmtDate(p.paid_on)}</time>
                </div>
                <b className="num amount-in">+{money(p.amount)}</b>
                <button className="btn btn-ghost btn-sm" aria-label={`حذف دفعة ${name(p)}`} onClick={() => {
                  if (confirmAction(p.subscription_id ? "هذه دفعة اشتراك. حذفها لا يحذف الاشتراك نفسه. متابعة؟" : "حذف هذه الدفعة؟"))
                    del(() => api.deletePayment(p.id), "تم حذف الدفعة.");
                }}>حذف</button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel">
        <h2>سجل المصروفات</h2>
        {expenses.length === 0 ? <p className="muted">لا توجد مصروفات مسجلة في هذا الشهر.</p> : (
          <ul className="ledger">
            {expenses.map((x) => (
              <li key={x.id}>
                <div>
                  <b>{EXPENSE_CATEGORY[x.category]}</b>
                  {x.note && <span className="muted">{x.note}</span>}
                  <time className="muted">{fmtDate(x.spent_on)}</time>
                </div>
                <b className="num amount-out">−{money(x.amount)}</b>
                <button className="btn btn-ghost btn-sm" aria-label={`حذف مصروف ${EXPENSE_CATEGORY[x.category]}`} onClick={() => {
                  if (confirmAction("حذف هذا المصروف؟")) del(() => api.deleteExpense(x.id), "تم حذف المصروف.");
                }}>حذف</button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <PriceEditor cats={cats} onSaved={() => { setMsg({ ok: true, text: "تم حفظ الأسعار." }); reload(); }} />

      {modal === "pay" && <PaymentForm onClose={() => setModal(null)} onDone={done("تم تسجيل الدفعة.")} />}
      {modal === "exp" && <ExpenseForm onClose={() => setModal(null)} onDone={done("تم تسجيل المصروف.")} />}
    </div>
  );
}

function PriceEditor({ cats, onSaved }) {
  const [prices, setPrices] = useState(Object.fromEntries(cats.map((c) => [c.key, String(c.monthly_price)])));
  const [err, setErr] = useState("");
  const changed = cats.filter((c) => Number(prices[c.key]) !== Number(c.monthly_price));
  async function save(e) {
    e.preventDefault();
    try {
      for (const c of changed) await api.updateCategory(c.key, { monthly_price: Number(prices[c.key]) });
      setErr(""); onSaved();
    } catch (e2) { setErr(errText(e2)); }
  }
  return (
    <section className="panel">
      <h2>أسعار الاشتراك الشهرية</h2>
      <p className="muted">تظهر في الصفحة الرئيسية وتُستخدم كسعر افتراضي عند تسجيل اشتراك.</p>
      <form className="form" onSubmit={save}>
        {cats.map((c) => (
          <label key={c.key} className="price-row">
            <span>{c.label}{c.description && <small className="muted">{c.description}</small>}</span>
            <input type="number" min="0" step="1" inputMode="numeric" dir="ltr" required value={prices[c.key]}
              onChange={(e) => setPrices({ ...prices, [c.key]: e.target.value })} />
            <span className="muted">₪</span>
          </label>
        ))}
        {err && <div className="note note-error">{err}</div>}
        <div className="row-end"><button className="btn btn-ghost" disabled={!changed.length}>حفظ الأسعار</button></div>
      </form>
    </section>
  );
}
