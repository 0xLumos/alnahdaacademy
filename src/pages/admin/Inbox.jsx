import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import * as api from "@api";
import { useLoad } from "../../lib/auth";
import { fmtDateTime } from "../../lib/format";
import { Badge, ErrorNote, Loading, PageTitle } from "../../components/ui";

export default function Inbox() {
  const nav = useNavigate();
  const [pick, setPick] = useState("");
  const { data, error, reload } = useLoad(async () => {
    const [threads, students] = await Promise.all([api.adminThreads(), api.listStudents()]);
    return { threads, students: students.filter((s) => s.active) };
  });
  useEffect(() => api.subscribe("chat_messages", reload), [reload]);

  if (error) return <ErrorNote error={error} onRetry={reload} />;
  if (!data) return <Loading />;

  return (
    <div className="stack">
      <PageTitle>المحادثات</PageTitle>
      <form className="toolbar" onSubmit={(e) => { e.preventDefault(); if (pick) nav(`/admin/inbox/${pick}`); }}>
        <select aria-label="اختر طالباً" value={pick} onChange={(e) => setPick(e.target.value)}>
          <option value="">اختر طالباً لبدء محادثة</option>
          {data.students.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
        </select>
        <button className="btn btn-ghost" disabled={!pick}>فتح المحادثة</button>
      </form>
      {data.threads.length === 0 && <p className="muted">لا توجد محادثات بعد.</p>}
      <ul className="threads">
        {data.threads.map((t) => (
          <li key={t.student_id}>
            <Link to={`/admin/inbox/${t.student_id}`} className={Number(t.unread) ? "is-unread" : ""}>
              <span className="thread-name">{t.full_name}<Badge n={Number(t.unread)} /></span>
              <span className="thread-last">{t.last_body}</span>
              <time className="muted">{fmtDateTime(t.last_at)}</time>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
