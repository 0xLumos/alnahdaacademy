import { useState } from "react";
import * as api from "@api";
import { confirmAction } from "../../lib/config";
import { useLoad } from "../../lib/auth";
import { WEEKDAYS, errText, time12 } from "../../lib/format";
import { ErrorNote, Field, Loading, Modal, PageTitle } from "../../components/ui";

const EMPTY = { title: "", coach_name: "", location: "", weekday: new Date().getDay(), start_time: "17:00", end_time: "18:00", active: true };

export default function Classes() {
  const [editing, setEditing] = useState(null);
  const { data, error, reload } = useLoad(async () => {
    const classes = await api.listClasses();
    const counts = await Promise.all(classes.map((c) => api.classRoster(c.id).then((r) => r.length)));
    return classes.map((c, i) => ({ ...c, count: counts[i] }));
  });

  if (error) return <ErrorNote error={error} onRetry={reload} />;
  if (!data) return <Loading />;

  return (
    <div className="stack">
      <PageTitle action={<button className="btn btn-red" onClick={() => setEditing(EMPTY)}>إضافة حصة</button>}>الحصص</PageTitle>
      {data.length === 0 && <p className="muted">لا توجد حصص. أضف أول حصة في الجدول الأسبوعي.</p>}
      {WEEKDAYS.map((name, d) => {
        const list = data.filter((c) => c.weekday === d);
        if (!list.length) return null;
        return (
          <section key={d} className="day">
            <h2>{name}</h2>
            {list.map((c) => (
              <div key={c.id} className={`slot ${c.active ? "" : "is-off"}`}>
                <div className="slot-time">{time12(c.start_time)}<span>{time12(c.end_time)}</span></div>
                <div>
                  <p className="slot-title">{c.title}{!c.active && <span className="chip chip-off">متوقفة</span>}</p>
                  <p className="muted">{[c.coach_name, c.location, `${c.count} ${c.count === 1 ? "طالب" : c.count === 2 ? "طالبان" : c.count <= 10 ? "طلاب" : "طالباً"}`].filter(Boolean).join("، ")}</p>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => setEditing(c)}>تعديل</button>
              </div>
            ))}
          </section>
        );
      })}
      {editing && <ClassForm initial={editing} onClose={() => setEditing(null)} onDone={() => { setEditing(null); reload(); }} />}
    </div>
  );
}

function ClassForm({ initial, onClose, onDone }) {
  const [f, setF] = useState(initial);
  const [err, setErr] = useState("");
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });

  async function submit(e) {
    e.preventDefault();
    if (f.end_time <= f.start_time) { setErr("وقت النهاية يجب أن يكون بعد وقت البداية."); return; }
    try { await api.saveClass(f); onDone(); } catch (e2) { setErr(errText(e2)); }
  }
  async function remove() {
    if (!confirmAction(`حذف حصة ${f.title}؟ سيُلغى تسجيل كل الطلاب فيها وتُحذف إعلاناتها.`)) return;
    try { await api.deleteClass(f.id); onDone(); } catch (e2) { setErr(errText(e2)); }
  }

  return (
    <Modal title={f.id ? "تعديل الحصة" : "إضافة حصة"} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <Field label="اسم الحصة"><input required maxLength={80} value={f.title} onChange={set("title")} /></Field>
        <Field label="المدرب"><input maxLength={80} value={f.coach_name ?? ""} onChange={set("coach_name")} /></Field>
        <Field label="المكان"><input maxLength={80} value={f.location ?? ""} onChange={set("location")} /></Field>
        <Field label="اليوم">
          <select value={f.weekday} onChange={set("weekday")}>
            {WEEKDAYS.map((n, i) => <option key={i} value={i}>{n}</option>)}
          </select>
        </Field>
        <div className="form-row">
          <Field label="من"><input type="time" required value={f.start_time.slice(0, 5)} onChange={set("start_time")} /></Field>
          <Field label="إلى"><input type="time" required value={f.end_time.slice(0, 5)} onChange={set("end_time")} /></Field>
        </div>
        <label className="check"><input type="checkbox" checked={f.active} onChange={set("active")} />
          <span><b>الحصة فعّالة</b><small>الحصص المتوقفة لا تظهر للطلاب</small></span></label>
        {err && <div className="note note-error">{err}</div>}
        <div className="row-end">
          {f.id && <button type="button" className="btn btn-ghost btn-danger" onClick={remove}>حذف الحصة</button>}
          <button type="button" className="btn btn-ghost" onClick={onClose}>إلغاء</button>
          <button className="btn btn-red">{f.id ? "حفظ التعديلات" : "إضافة الحصة"}</button>
        </div>
      </form>
    </Modal>
  );
}
