import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import * as api from "@api";
import {
  EXPENSE_CATEGORY, PAYMENT_KIND, STATUS_LABEL, currentSubscription, errText, fmtDate, fmtMonth, money, monthRange, todayISO,
} from "../../lib/format";
import { PageTitle } from "../../components/ui";

const LAST_KEY = "nahda-last-backup";
const readLast = () => { try { return localStorage.getItem(LAST_KEY); } catch { return null; } };
const markBackup = () => { try { localStorage.setItem(LAST_KEY, new Date().toISOString()); } catch { /* ignore */ } };

const sum = (rows) => rows.reduce((s, r) => s + Number(r.amount), 0);
const groupSum = (rows, key) => rows.reduce((m, r) => ({ ...m, [r[key]]: (m[r[key]] ?? 0) + Number(r.amount) }), {});

export default function Backup() {
  const [period, setPeriod] = useState("all"); // "all" or "YYYY-MM"
  const [busy, setBusy] = useState(null);
  const [msg, setMsg] = useState(null);
  const [report, setReport] = useState(null);
  const [last, setLast] = useState(readLast());

  // Print once the report has rendered; the browser's print dialog saves it as PDF.
  useEffect(() => {
    if (!report) return;
    const title = document.title;
    document.title = `nahda-report-${todayISO()}`; // becomes the suggested PDF file name
    const done = () => { document.title = title; setReport(null); window.removeEventListener("afterprint", done); };
    window.addEventListener("afterprint", done);
    const t = setTimeout(() => window.print(), 300); // let fonts and layout settle
    return () => clearTimeout(t);
  }, [report]);

  async function makePdf() {
    setBusy("pdf"); setMsg(null);
    try {
      setReport(await api.exportAll());
      markBackup(); setLast(readLast());
    } catch (e) { setMsg({ ok: false, text: errText(e) }); }
    finally { setBusy(null); }
  }

  async function downloadData() {
    setBusy("data"); setMsg(null);
    try {
      const data = await api.exportAll();
      const file = { app: "nahda-academy", version: 1, exported_at: new Date().toISOString(), tables: data };
      const blob = new Blob([JSON.stringify(file, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `nahda-backup-${todayISO()}.json`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      const counts = Object.entries(data).map(([t, rows]) => rows.length).reduce((a, b) => a + b, 0);
      setMsg({ ok: true, text: `تم تنزيل ملف البيانات (${counts} سجلاً).` });
      markBackup(); setLast(readLast());
    } catch (e) { setMsg({ ok: false, text: errText(e) }); }
    finally { setBusy(null); }
  }

  const months = [...Array(24)].map((_, i) => {
    const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  return (
    <div className="stack">
      <PageTitle>النسخ الاحتياطي</PageTitle>
      <p className="muted">
        {last ? `آخر نسخة احتياطية من هذا الجهاز: ${fmtDate(last)}.` : "لم تُنزَّل أي نسخة احتياطية من هذا الجهاز بعد."}
        {" "}يُنصح بتنزيل نسخة مرة في الشهر على الأقل وحفظها خارج الهاتف، مثلاً في Google Drive أو على حاسوب.
      </p>
      {msg && <div className={`note ${msg.ok ? "note-ok" : "note-error"}`} role="status">{msg.text}</div>}

      <section className="panel">
        <h2>تقرير PDF</h2>
        <p>كل الطلاب ومبلغ ما دفعه كل واحد، وكل الدفعات، وكل المصروفات، مع المجاميع. للقراءة والطباعة والأرشفة.</p>
        <label className="field">
          <span className="field-label">الفترة</span>
          <select value={period} onChange={(e) => setPeriod(e.target.value)}>
            <option value="all">كل البيانات</option>
            {months.map((m) => <option key={m} value={m}>{fmtMonth(m)}</option>)}
          </select>
        </label>
        <button className="btn btn-red self-start" onClick={makePdf} disabled={Boolean(busy)}>
          {busy === "pdf" ? "جارٍ التحضير…" : "تنزيل تقرير PDF"}
        </button>
        <p className="muted">ستظهر نافذة الطباعة: اختر "حفظ كملف PDF" (Save as PDF) كوجهة للطباعة.</p>
      </section>

      <section className="panel">
        <h2>ملف البيانات الكامل</h2>
        <p>نسخة من كل شيء في قاعدة البيانات: الطلاب، الاشتراكات، الحصص، الدفعات، المصروفات، المنتجات، الإعلانات والمحادثات. هذا الملف هو الذي يمكن استرجاع البيانات منه إذا حدثت مشكلة.</p>
        <button className="btn btn-ghost self-start" onClick={downloadData} disabled={Boolean(busy)}>
          {busy === "data" ? "جارٍ التنزيل…" : "تنزيل ملف البيانات"}
        </button>
        <p className="muted">كلمات المرور غير موجودة في الملف، فهي محفوظة مشفّرة لدى Supabase فقط.</p>
      </section>

      {report && createPortal(<Report data={report} period={period} />, document.body)}
    </div>
  );
}

// The printable report. Hidden on screen; shown only when printing (see .print-report in styles.css).
function Report({ data, period }) {
  const [from, to] = period === "all" ? ["0000-01-01", "9999-12-31"] : monthRange(period);
  const inRange = (d) => d >= from && d <= to;
  const payments = data.payments.filter((p) => inRange(p.paid_on)).sort((a, b) => a.paid_on.localeCompare(b.paid_on));
  const expenses = data.expenses.filter((x) => inRange(x.spent_on)).sort((a, b) => a.spent_on.localeCompare(b.spent_on));
  const income = sum(payments), spent = sum(expenses);
  const byKind = groupSum(payments, "kind"), byCat = groupSum(expenses, "category");

  const profiles = data.profiles;
  const nameOf = (p) => profiles.find((s) => s.id === p.student_id)?.full_name ?? p.payer_name ?? "بدون اسم";
  const catLabel = (k) => data.categories.find((c) => c.key === k)?.label ?? "";
  const prodName = (id) => data.products.find((p) => p.id === id)?.name;
  const paidBy = groupSum(payments.filter((p) => p.student_id), "student_id");
  const paidAll = groupSum(data.payments.filter((p) => p.student_id), "student_id");
  const students = profiles.filter((p) => p.role === "student")
    .map((s) => ({ ...s, paid: paidBy[s.id] ?? 0, paidAll: paidAll[s.id] ?? 0,
      ...currentSubscription(data.subscriptions.filter((x) => x.student_id === s.id)) }))
    .sort((a, b) => a.full_name.localeCompare(b.full_name, "ar"));
  const label = period === "all" ? "كل البيانات" : fmtMonth(period);

  return (
    <div className="print-report" dir="rtl" lang="ar">
      <header className="pr-head">
        <h1>أكاديمية النهضة الرياضية</h1>
        <p>تقرير مالي ونسخة احتياطية، الفترة: {label}</p>
        <p>تاريخ الإنشاء: {new Date().toLocaleString("ar")}</p>
      </header>

      <h2>الملخص</h2>
      <table className="pr-table pr-summary">
        <tbody>
          <tr><th>مجموع الدخل</th><td className="num">{money(income)}</td></tr>
          <tr><th>مجموع المصروفات</th><td className="num">{money(spent)}</td></tr>
          <tr><th>الصافي</th><td className="num">{money(income - spent)}</td></tr>
          <tr><th>عدد الطلاب</th><td className="num">{students.length} (فعّال: {students.filter((s) => s.active).length})</td></tr>
        </tbody>
      </table>
      <div className="pr-two">
        <table className="pr-table">
          <thead><tr><th>الدخل حسب النوع</th><th>المبلغ</th></tr></thead>
          <tbody>{Object.entries(PAYMENT_KIND).map(([k, v]) => <tr key={k}><td>{v}</td><td className="num">{money(byKind[k])}</td></tr>)}</tbody>
        </table>
        <table className="pr-table">
          <thead><tr><th>المصروفات حسب البند</th><th>المبلغ</th></tr></thead>
          <tbody>{Object.entries(EXPENSE_CATEGORY).map(([k, v]) => <tr key={k}><td>{v}</td><td className="num">{money(byCat[k])}</td></tr>)}</tbody>
        </table>
      </div>

      <h2>الطلاب ({students.length})</h2>
      <table className="pr-table">
        <thead>
          <tr><th>#</th><th>الاسم</th><th>اسم المستخدم</th><th>الهاتف</th><th>الفئة</th><th>الحالة</th><th>ينتهي الاشتراك</th>
            <th>دفع في الفترة</th><th>مجموع ما دفع</th></tr>
        </thead>
        <tbody>
          {students.map((s, i) => (
            <tr key={s.id}>
              <td className="num">{i + 1}</td><td>{s.full_name}</td><td dir="ltr">{s.username}</td><td dir="ltr">{s.phone ?? ""}</td>
              <td>{catLabel(s.category)}</td><td>{s.active ? STATUS_LABEL[s.status] : "موقوف"}</td>
              <td>{s.sub ? fmtDate(s.sub.end_date) : ""}</td><td className="num">{money(s.paid)}</td><td className="num">{money(s.paidAll)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>الدفعات ({payments.length})</h2>
      <table className="pr-table">
        <thead><tr><th>التاريخ</th><th>الاسم</th><th>النوع</th><th>التفاصيل</th><th>المبلغ</th></tr></thead>
        <tbody>
          {payments.map((p) => (
            <tr key={p.id}>
              <td>{fmtDate(p.paid_on)}</td><td>{nameOf(p)}</td><td>{PAYMENT_KIND[p.kind]}</td>
              <td>{[prodName(p.product_id) && `${prodName(p.product_id)}${p.quantity > 1 ? ` ×${p.quantity}` : ""}`, p.note].filter(Boolean).join("، ")}</td>
              <td className="num">{money(p.amount)}</td>
            </tr>
          ))}
          <tr className="pr-total"><td colSpan={4}>المجموع</td><td className="num">{money(income)}</td></tr>
        </tbody>
      </table>

      <h2>المصروفات ({expenses.length})</h2>
      <table className="pr-table">
        <thead><tr><th>التاريخ</th><th>البند</th><th>ملاحظة</th><th>المبلغ</th></tr></thead>
        <tbody>
          {expenses.map((x) => (
            <tr key={x.id}><td>{fmtDate(x.spent_on)}</td><td>{EXPENSE_CATEGORY[x.category]}</td><td>{x.note ?? ""}</td><td className="num">{money(x.amount)}</td></tr>
          ))}
          <tr className="pr-total"><td colSpan={3}>المجموع</td><td className="num">{money(spent)}</td></tr>
        </tbody>
      </table>
    </div>
  );
}
