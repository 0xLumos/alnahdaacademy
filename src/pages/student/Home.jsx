import { Link } from "react-router-dom";
import * as api from "@api";
import { useAuth, useLoad } from "../../lib/auth";
import { STATUS_LABEL, WEEKDAYS, currentSubscription, daysLeft, fmtDate, fmtDateTime, time12 } from "../../lib/format";
import { ErrorNote, Loading, Ropes } from "../../components/ui";

// Next occurrence of an enrolled class from now, looking ahead one week.
export function nextClass(classes) {
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  let best = null;
  for (const c of classes) {
    const [h, m] = c.start_time.split(":").map(Number);
    let ahead = (c.weekday - now.getDay() + 7) % 7;
    if (ahead === 0 && h * 60 + m <= nowMin) ahead = 7;
    const score = ahead * 1440 + h * 60 + m;
    if (!best || score < best.score) best = { c, ahead, score };
  }
  return best;
}

export default function Home() {
  const { me } = useAuth();
  const { data, error, reload } = useLoad(async () => {
    const [subs, classes, mine, news] = await Promise.all([
      api.mySubscriptions(), api.listClasses(), api.myEnrolledClassIds(), api.listAnnouncements(),
    ]);
    return { subs, myClasses: classes.filter((c) => mine.includes(c.id)), news };
  });

  if (error) return <ErrorNote error={error} onRetry={reload} />;
  if (!data) return <Loading />;

  const { sub, status } = currentSubscription(data.subs);
  const days = sub && (status === "active" || status === "soon") ? daysLeft(sub.end_date) : 0;
  const next = nextClass(data.myClasses);
  const fresh = data.news.filter((a) => a.created_at > me.announcements_seen_at);

  return (
    <div className="stack">
      <section className={`countdown status-${status}`} aria-label="حالة الاشتراك">
        <Ropes />
        <div className="countdown-body">
          {status === "active" || status === "soon" ? (
            <>
              <span className="countdown-num">{days}</span>
              <div>
                <p className="countdown-label">{days === 1 ? "يوم متبقٍ في اشتراكك" : days === 2 ? "يومان متبقيان في اشتراكك" : days <= 10 ? "أيام متبقية في اشتراكك" : "يوماً متبقياً في اشتراكك"}</p>
                <p className="muted">{sub.plan}، ينتهي في {fmtDate(sub.end_date)}</p>
                {status === "soon" && <p className="warn">جدّد اشتراكك عند الاستقبال قبل انتهائه.</p>}
              </div>
            </>
          ) : (
            <div>
              <p className="countdown-label">{STATUS_LABEL[status]}</p>
              <p className="muted">
                {status === "upcoming" && `يبدأ اشتراكك في ${fmtDate(sub.start_date)}.`}
                {status === "expired" && `انتهى اشتراكك في ${fmtDate(sub.end_date)}. جدّده عند الاستقبال.`}
                {status === "none" && "سجّل اشتراكك عند الاستقبال في الأكاديمية."}
              </p>
            </div>
          )}
        </div>
        <Ropes />
      </section>

      <section className="panel">
        <h2>حصتك القادمة</h2>
        {next ? (
          <div className="next-class">
            <p className="next-title">{next.c.title}</p>
            <p>
              {next.ahead === 0 ? "اليوم" : next.ahead === 1 ? "غداً" : WEEKDAYS[next.c.weekday]}،{" "}
              {time12(next.c.start_time)} إلى {time12(next.c.end_time)}
            </p>
            <p className="muted">{[next.c.coach_name, next.c.location].filter(Boolean).join("، ")}</p>
          </div>
        ) : <p className="muted">لست مسجلاً في أي حصة بعد. اطلب من الإدارة تسجيلك.</p>}
        <Link className="link" to="/portal/schedule">عرض الجدول الأسبوعي</Link>
      </section>

      <section className="panel">
        <h2>آخر الإعلانات</h2>
        {data.news.length === 0 && <p className="muted">لا توجد إعلانات.</p>}
        {data.news.slice(0, 2).map((a) => (
          <article key={a.id} className="news-item">
            <h3>{a.title}{fresh.includes(a) && <span className="tag-new">جديد</span>}</h3>
            <p>{a.body}</p>
            <time className="muted">{fmtDateTime(a.created_at)}</time>
          </article>
        ))}
        {data.news.length > 2 && <Link className="link" to="/portal/news">كل الإعلانات</Link>}
      </section>
    </div>
  );
}
