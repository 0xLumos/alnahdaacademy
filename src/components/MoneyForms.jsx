import { useEffect, useState } from "react";
import * as api from "@api";
import { EXPENSE_CATEGORY, PAYMENT_KIND, errText, money, todayISO } from "../lib/format";
import { Field, Modal } from "./ui";

// Records cash received. Used from Finance, the shop (product sale) and a student's page.
// `preset` can fix student_id, kind or product_id.
export function PaymentForm({ preset = {}, onClose, onDone }) {
  const [lists, setLists] = useState({ students: [], products: [] });
  const [f, setF] = useState({
    student_id: "", payer_name: "", kind: "subscription", product_id: "", quantity: 1,
    amount: "", paid_on: todayISO(), note: "", ...preset,
  });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([api.listStudents(), api.listProducts()])
      .then(([students, products]) => setLists({ students: students.filter((s) => s.active || s.id === preset.student_id), products }))
      .catch((e) => setErr(errText(e)));
  }, [preset.student_id]);

  const isSale = f.kind === "product" || f.kind === "clothing";
  const product = lists.products.find((p) => p.id === f.product_id);
  // A sale's amount follows price x quantity until the admin types a different amount.
  const [amountTouched, setAmountTouched] = useState(Boolean(preset.amount));
  useEffect(() => {
    if (isSale && product && !amountTouched) setF((x) => ({ ...x, amount: String(product.price * (Number(x.quantity) || 1)) }));
  }, [isSale, product, f.quantity, amountTouched]);

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const pickProduct = (e) => {
    const p = lists.products.find((x) => x.id === e.target.value);
    setAmountTouched(false);
    setF({ ...f, product_id: e.target.value, kind: p?.type === "clothing" ? "clothing" : f.kind === "clothing" || f.kind === "product" ? "product" : f.kind });
  };

  async function submit(e) {
    e.preventDefault();
    if (!(Number(f.amount) > 0)) { setErr(errText({ message: "invalid_amount" })); return; }
    if (!f.student_id && !f.payer_name.trim()) { setErr("اختر الطالب أو اكتب اسم الدافع."); return; }
    setBusy(true);
    try {
      await api.addPayment({ ...f, product_id: isSale ? f.product_id : null, quantity: isSale ? f.quantity : null,
        payer_name: f.student_id ? null : f.payer_name.trim() });
      onDone();
    } catch (e2) { setErr(errText(e2)); setBusy(false); }
  }

  return (
    <Modal title="تسجيل دفعة نقدية" onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <Field label="نوع الدفعة">
          <select value={f.kind} onChange={(e) => { setAmountTouched(false); setF({ ...f, kind: e.target.value }); }}>
            {Object.entries(PAYMENT_KIND).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
        {f.kind === "subscription" && (
          <p className="muted">لتسجيل اشتراك جديد مع تواريخه، استخدم "تسجيل اشتراك" في صفحة الطالب. هذا النموذج لدفعة إضافية فقط، مثل باقي مبلغ.</p>
        )}
        <Field label="الطالب">
          <select value={f.student_id} onChange={set("student_id")} disabled={Boolean(preset.student_id)}>
            <option value="">بدون حساب (زائر)</option>
            {lists.students.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
          </select>
        </Field>
        {!f.student_id && (
          <Field label="اسم الدافع"><input maxLength={80} value={f.payer_name} onChange={set("payer_name")} /></Field>
        )}
        {isSale && (
          <div className="form-row">
            <Field label="المنتج">
              <select required value={f.product_id} onChange={pickProduct}>
                <option value="">اختر منتجاً</option>
                {lists.products.map((p) => <option key={p.id} value={p.id}>{p.name} ({money(p.price)})</option>)}
              </select>
            </Field>
            <Field label="الكمية">
              <input type="number" min="1" max="999" inputMode="numeric" dir="ltr" value={f.quantity} onChange={set("quantity")} />
            </Field>
          </div>
        )}
        <div className="form-row">
          <Field label="المبلغ المستلم (₪)">
            <input type="number" min="0.5" step="0.5" inputMode="decimal" dir="ltr" required value={f.amount}
              onChange={(e) => { setAmountTouched(true); setF({ ...f, amount: e.target.value }); }} />
          </Field>
          <Field label="التاريخ"><input type="date" required value={f.paid_on} onChange={set("paid_on")} /></Field>
        </div>
        <Field label="ملاحظة"><input maxLength={300} value={f.note} onChange={set("note")} /></Field>
        {err && <div className="note note-error" role="alert">{err}</div>}
        <div className="row-end">
          <button type="button" className="btn btn-ghost" onClick={onClose}>إلغاء</button>
          <button className="btn btn-red" disabled={busy}>حفظ الدفعة</button>
        </div>
      </form>
    </Modal>
  );
}

export function ExpenseForm({ onClose, onDone }) {
  const [f, setF] = useState({ category: "rent", amount: "", spent_on: todayISO(), note: "" });
  const [err, setErr] = useState("");
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  async function submit(e) {
    e.preventDefault();
    if (!(Number(f.amount) > 0)) { setErr(errText({ message: "invalid_amount" })); return; }
    try { await api.addExpense(f); onDone(); } catch (e2) { setErr(errText(e2)); }
  }
  return (
    <Modal title="تسجيل مصروف" onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <Field label="البند">
          <select value={f.category} onChange={set("category")}>
            {Object.entries(EXPENSE_CATEGORY).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
        <div className="form-row">
          <Field label="المبلغ (₪)">
            <input type="number" min="0.5" step="0.5" inputMode="decimal" dir="ltr" required value={f.amount} onChange={set("amount")} />
          </Field>
          <Field label="التاريخ"><input type="date" required value={f.spent_on} onChange={set("spent_on")} /></Field>
        </div>
        <Field label="ملاحظة" hint="مثلاً: اسم الموظف أو رقم الفاتورة"><input maxLength={300} value={f.note} onChange={set("note")} /></Field>
        {err && <div className="note note-error" role="alert">{err}</div>}
        <div className="row-end">
          <button type="button" className="btn btn-ghost" onClick={onClose}>إلغاء</button>
          <button className="btn btn-red">حفظ المصروف</button>
        </div>
      </form>
    </Modal>
  );
}
