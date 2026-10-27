import { Link } from "react-router-dom";
import * as api from "@api";
import { useLoad } from "../../lib/auth";
import { WEEKDAYS, currentSubscription, dayWord, daysLeft, time12 } from "../../lib/format";
import { ErrorNote, Loading, PageTitle } from "../../components/ui";

export default function Dashboard() {
  const { data, error, reload } = useLoad(async () => {
    const [students, subs, classes, threads] = await Promise.all([
      api.listStudents(), api.allSubscriptions(), api.listClasses(), api.adminThreads(),
    ]);
    const rows = students.filter((s) => s.active).map((s) => ({
      ...s, ...currentSubscription(subs.filter((x) => x.student_id === s.id)),
    }));
    return { rows, classes, threads, suspended: students.length - rows.length };
  });

  if (error) return <ErrorNote error={error} onRetry={reload} />;
  if (!data) return <Loading />;

  const { rows, classes, threads } = data;
  const soon = rows.filter((r) => r.status === "soon").sort((a, b) => a.sub.end_date.localeCompare(b.sub.end_date));
  const lapsed = rows.filter((r) => r.status === "expired" || r.status === "none");
  const paying = rows.filter((r) => r.status === "active" || r.status === "soon").length;
  const unread = threads.filter((t) => Number(t.unread) > 0);
  const today = new Date().getDay();
  const todays = classes.filter((c) => c.active && c.weekday === today);

  return (
    <div className="stack">
      <PageTitle>لوحة التحكم</PageTitle>
      <div className="stats">
        <Link to="/admin/students" className="stat"><b>{rows.length}</b><span>طالب فعّال</span></Link>
        <Link to="/admin/students?f=paid" className="stat"><b>{paying}</b><span>اشتراك ساري</span></Link>
        <Link to="/admin/students?f=soon" className="stat stat-warn"><b>{soon.length}</b><span>ينتهي خلال 7 أيام</span></Link>
        <Link to="/admin/students?f=expired" className="stat stat-bad"><b>{lapsed.length}</b><span>بدون اشتراك ساري</span></Link>
      </div>

      <div className="grid-2">
        <section className="panel">
          <h2>اشتراكات تنتهي قريباً</h2>
          {soon.length === 0 && <p className="muted">لا يوجد اشتراك ينتهي خلال الأيام السبعة القادمة.</p>}
          <ul className="list">
            {soon.map((r) => (
              <li key={r.id}>
                <Link to={`/admin/students/${r.id}`}>{r.full_name}</Link>
                <span className="chip chip-soon">{dayWord(daysLeft(r.sub.end_date))}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="panel">
          <h2>رسائل غير مقروءة</h2>
          {unread.length === 0 && <p className="muted">لا توجد رسائل جديدة.</p>}
          <ul className="list">
            {unread.map((t) => (
              <li key={t.student_id}>
                <Link to={`/admin/inbox/${t.student_id}`}>{t.full_name}</Link>
                <span className="badge">{t.unread}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="panel">
          <h2>حصص اليوم، {WEEKDAYS[today]}</h2>
          {todays.length === 0 && <p className="muted">لا توجد حصص اليوم.</p>}
          <ul className="list">
            {todays.map((c) => (
              <li key={c.id}><span>{c.title}</span><span className="muted">{time12(c.start_time)}</span></li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
