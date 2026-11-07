import { useState } from "react";
import * as api from "@api";
import { useLoad } from "../../lib/auth";
import { WEEKDAYS, time12 } from "../../lib/format";
import { ErrorNote, Loading, PageTitle } from "../../components/ui";

export default function Schedule() {
  const [onlyMine, setOnlyMine] = useState(true);
  const { data, error, reload } = useLoad(async () => {
    const [classes, mine] = await Promise.all([api.listClasses(), api.myEnrolledClassIds()]);
    return { classes, mine: new Set(mine) };
  });

  if (error) return <ErrorNote error={error} onRetry={reload} />;
  if (!data) return <Loading />;

  const today = new Date().getDay();
  const order = [...Array(7)].map((_, i) => (today + i) % 7); // week starting today
  const shown = data.classes.filter((c) => !onlyMine || data.mine.has(c.id));

  return (
    <div className="stack">
      <PageTitle>الجدول الأسبوعي</PageTitle>
      <div className="seg" role="group" aria-label="عرض">
        <button aria-pressed={onlyMine} onClick={() => setOnlyMine(true)}>حصصي</button>
        <button aria-pressed={!onlyMine} onClick={() => setOnlyMine(false)}>كل الحصص</button>
      </div>
      {shown.length === 0 && <p className="muted">{onlyMine ? "لست مسجلاً في أي حصة بعد." : "لا توجد حصص."}</p>}
      {order.map((d) => {
        const list = shown.filter((c) => c.weekday === d);
        if (!list.length) return null;
        return (
          <section key={d} className="day">
            <h2>{WEEKDAYS[d]}{d === today && <span className="tag-today">اليوم</span>}</h2>
            {list.map((c) => (
              <div key={c.id} className={`slot ${data.mine.has(c.id) ? "slot-mine" : ""}`}>
                <div className="slot-time">{time12(c.start_time)}<span>{time12(c.end_time)}</span></div>
                <div>
                  <p className="slot-title">{c.title}</p>
                  <p className="muted">{[c.coach_name, c.location].filter(Boolean).join("، ")}</p>
                </div>
                {!onlyMine && data.mine.has(c.id) && <span className="tag-mine">مسجّل</span>}
              </div>
            ))}
          </section>
        );
      })}
    </div>
  );
}
