import { useEffect, useRef } from "react";
import * as api from "@api";
import { useAuth, useLoad } from "../../lib/auth";
import { fmtDateTime } from "../../lib/format";
import { ErrorNote, Loading, PageTitle } from "../../components/ui";

export default function News() {
  const { me, refresh } = useAuth();
  const seenBefore = useRef(me.announcements_seen_at); // keep "new" tags for this visit
  const { data, error, reload } = useLoad(() => api.listAnnouncements());

  useEffect(() => api.subscribe("announcements", reload), [reload]);
  useEffect(() => { if (data) api.markAnnouncementsSeen().then(refresh).catch(() => {}); }, [data, refresh]);

  if (error) return <ErrorNote error={error} onRetry={reload} />;
  if (!data) return <Loading />;
  return (
    <div className="stack">
      <PageTitle>الإعلانات</PageTitle>
      {data.length === 0 && <p className="muted">لا توجد إعلانات حتى الآن.</p>}
      {data.map((a) => (
        <article key={a.id} className="panel news-item">
          <h3>{a.title}{a.created_at > seenBefore.current && <span className="tag-new">جديد</span>}</h3>
          <p>{a.body}</p>
          <time className="muted">{fmtDateTime(a.created_at)}</time>
        </article>
      ))}
    </div>
  );
}
