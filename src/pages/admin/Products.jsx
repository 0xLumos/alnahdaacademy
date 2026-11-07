import { useState } from "react";
import * as api from "@api";
import { confirmAction } from "../../lib/config";
import { useLoad } from "../../lib/auth";
import { errText } from "../../lib/format";
import ProductGrid from "../../components/ProductGrid";
import { PaymentForm } from "../../components/MoneyForms";
import { ErrorNote, Field, Loading, Modal, PageTitle } from "../../components/ui";

const EMPTY = { name: "", description: "", price: "", type: "equipment", available: true };

export default function Products() {
  const { data, error, reload } = useLoad(() => api.listProducts());
  const [editing, setEditing] = useState(null);
  const [selling, setSelling] = useState(null);
  const [msg, setMsg] = useState(null);

  if (error) return <ErrorNote error={error} onRetry={reload} />;
  if (!data) return <Loading />;

  return (
    <div className="stack">
      <PageTitle action={<button className="btn btn-red" onClick={() => setEditing(EMPTY)}>إضافة منتج</button>}>المتجر</PageTitle>
      <p className="muted">المنتجات المتوفرة تظهر للزوار في صفحة المتجر وللطلاب في البوابة. سجّل كل بيع نقدي ليدخل في المالية.</p>
      {msg && <div className={`note ${msg.ok ? "note-ok" : "note-error"}`} role="status">{msg.text}</div>}
      <ProductGrid products={data} renderActions={(p) => (
        <div className="row-start product-actions">
          <button className="btn btn-red btn-sm" onClick={() => setSelling(p)} disabled={!p.available}>تسجيل بيع</button>
          <button className="btn btn-ghost btn-sm" onClick={() => setEditing(p)}>تعديل</button>
        </div>
      )} />
      {editing && (
        <ProductForm initial={editing} onClose={() => setEditing(null)}
          onDone={(text) => { setEditing(null); setMsg({ ok: true, text }); reload(); }} />
      )}
      {selling && (
        <PaymentForm preset={{ kind: selling.type === "clothing" ? "clothing" : "product", product_id: selling.id }}
          onClose={() => setSelling(null)}
          onDone={() => { setMsg({ ok: true, text: `تم تسجيل بيع ${selling.name}.` }); setSelling(null); }} />
      )}
    </div>
  );
}

function ProductForm({ initial, onClose, onDone }) {
  const [f, setF] = useState({ ...initial, price: String(initial.price ?? "") });
  const [file, setFile] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });

  async function submit(e) {
    e.preventDefault();
    if (file && file.size > 3 * 1024 * 1024) { setErr("حجم الصورة أكبر من 3 ميغابايت. اختر صورة أصغر."); return; }
    setBusy(true);
    try { await api.saveProduct(f, file); onDone(f.id ? "تم حفظ المنتج." : "تمت إضافة المنتج."); }
    catch (e2) { setErr(errText(e2)); setBusy(false); }
  }
  async function remove() {
    if (!confirmAction(`حذف ${f.name}؟ المبيعات المسجلة سابقاً تبقى في المالية.`)) return;
    try { await api.deleteProduct(f); onDone("تم حذف المنتج."); } catch (e2) { setErr(errText(e2)); }
  }

  return (
    <Modal title={f.id ? "تعديل المنتج" : "إضافة منتج"} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <Field label="اسم المنتج"><input required maxLength={80} value={f.name} onChange={set("name")} /></Field>
        <Field label="الوصف"><input maxLength={300} value={f.description ?? ""} onChange={set("description")} /></Field>
        <div className="form-row">
          <Field label="السعر (₪)">
            <input type="number" min="0" step="0.5" inputMode="decimal" dir="ltr" required value={f.price} onChange={set("price")} />
          </Field>
          <Field label="النوع">
            <select value={f.type} onChange={set("type")}>
              <option value="equipment">معدات</option>
              <option value="clothing">ملابس (بكجات)</option>
            </select>
          </Field>
        </div>
        <Field label="صورة المنتج" hint="JPG أو PNG، حتى 3 ميغابايت">
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </Field>
        <label className="check"><input type="checkbox" checked={f.available} onChange={set("available")} />
          <span><b>متوفر للبيع</b><small>المنتج غير المتوفر يختفي من صفحة المتجر</small></span></label>
        {err && <div className="note note-error">{err}</div>}
        <div className="row-end">
          {f.id && <button type="button" className="btn btn-ghost btn-danger" onClick={remove}>حذف المنتج</button>}
          <button type="button" className="btn btn-ghost" onClick={onClose}>إلغاء</button>
          <button className="btn btn-red" disabled={busy}>{f.id ? "حفظ التعديلات" : "إضافة المنتج"}</button>
        </div>
      </form>
    </Modal>
  );
}
