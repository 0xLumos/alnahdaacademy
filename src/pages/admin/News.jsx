import { useState } from "react";
import * as api from "@api";
import { confirmAction } from "../../lib/config";
import { useLoad } from "../../lib/auth";
import { WEEKDAYS, errText, fmtDateTime, time12 } from "../../lib/format";
import { ErrorNote, Field, Loading, PageTitle } from "../../components/ui";

export default function AdminNews() {
  const { data, error, reload } = useLoad(async () => {
    const [news, classes] = await Promise.all([api.listAnnouncements(), api.listClasses()]);
    return { news, classes };
  });
  const [f, setF] = useState({ title: "", body: "", class_id: "" });
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  if (error) return <ErrorNote error={error} onRetry={reload} />;
  if (!data) return <Loading />;
  const classLabel = (id) => {
    const c = data.classes.find((x) => x.id === id);
    return c ? `${c.title}، ${WEEKDAYS[c.weekday]} ${time12(c.start_time)}` : "حصة محذوفة";
  };

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await api.postAnnouncement(f);
      setF({ title: "", body: "", class_id: "" });
      setMsg({ ok: true, text: "تم نشر الإعلان." });
      reload();
    } catch (e2) { setMsg({ ok: false, text: errText(e2) }); }
    finally { setBusy(false); }
  }

  return (
    <div className="stack">
      <PageTitle>الإعلانات</PageTitle>
      <section className="panel">
        <h2>إعلان جديد</h2>
        <form className="form" onSubmit={submit}>
          <Field label="إلى">
            <select value={f.class_id} onChange={(e) => setF({ ...f, class_id: e.target.value })}>
              <option value="">كل الطلاب</option>
              {data.classes.map((c) => <option key={c.id} value={c.id}>طلاب حصة: {classLabel(c.id)}</option>)}
            </select>
          </Field>
          <Field label="العنوان"><input required maxLength={120} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
          <Field label="النص"><textarea required rows={4} maxLength={4000} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} /></Field>
          {msg && <div className={`note ${msg.ok ? "note-ok" : "note-error"}`} role="status">{msg.text}</div>}
          <div className="row-end"><button className="btn btn-red" disabled={busy}>نشر الإعلان</button></div>
        </form>
      </section>

      {data.news.map((a) => (
        <article key={a.id} className="panel news-item">
          <div className="panel-head">
            <h3>{a.title}</h3>
            <button className="btn btn-ghost btn-sm" onClick={async () => {
              if (!confirmAction("حذف هذا الإعلان؟")) return;
              try { await api.deleteAnnouncement(a.id); reload(); } catch (e2) { setMsg({ ok: false, text: errText(e2) }); }
            }}>حذف</button>
          </div>
          <p>{a.body}</p>
          <p className="muted">{a.class_id ? `إلى طلاب حصة ${classLabel(a.class_id)}` : "إلى كل الطلاب"}، {fmtDateTime(a.created_at)}</p>
        </article>
      ))}
    </div>
  );
}
