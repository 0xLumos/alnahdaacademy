import { useEffect, useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import * as api from "@api";
import { useAuth } from "../lib/auth";
import { Badge, Ropes } from "./ui";
import logo from "../assets/logo.jpg";

function Brand({ sub }) {
  return (
    <Link className="brand" to="/" title="الصفحة الرئيسية للأكاديمية">
      <img src={logo} alt="" width="44" height="44" />
      <div>
        <strong>أكاديمية النهضة</strong>
        <span>{sub}</span>
      </div>
    </Link>
  );
}

function SignOut() {
  return <button className="btn btn-ghost btn-sm" onClick={() => api.signOut()}>تسجيل الخروج</button>;
}

// Re-counts whenever chat rows change (realtime) so badges stay current.
function useUnread(loader) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let alive = true;
    const run = () => loader().then((v) => alive && setN(v)).catch(() => {});
    run();
    const off = api.subscribe("chat_messages", run);
    return () => { alive = false; off(); };
  }, [loader]);
  return n;
}
const studentUnread = () => api.myUnreadCount();
const adminUnread = () => api.adminThreads().then((t) => t.reduce((s, x) => s + Number(x.unread), 0));

export function StudentShell() {
  const { me } = useAuth();
  const unread = useUnread(studentUnread);
  const links = [
    ["/portal", "الرئيسية", "⌂"], ["/portal/schedule", "الجدول", "▦"], ["/portal/news", "الإعلانات", "✦"], ["/portal/chat", "المحادثة", "✉"], ["/portal/shop", "المتجر", "◈"],
  ];
  return (
    <div className="shell shell-student">
      <header className="topbar">
        <Brand sub={me.full_name} />
        <SignOut />
      </header>
      <main className="content"><Outlet /></main>
      <nav className="bottomnav" aria-label="القائمة">
        {links.map(([to, label, icon]) => (
          <NavLink key={to} to={to} end={to === "/portal"}>
            <span className="nav-icon" aria-hidden="true">{icon}</span>
            <span>{label}</span>
            {to === "/portal/chat" && <Badge n={unread} />}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

export function AdminShell() {
  const unread = useUnread(adminUnread);
  const links = [
    ["/admin", "لوحة التحكم"], ["/admin/students", "الطلاب"], ["/admin/classes", "الحصص"],
    ["/admin/news", "الإعلانات"], ["/admin/inbox", "المحادثات"],
    ["/admin/finance", "المالية"], ["/admin/shop", "المتجر"],
  ];
  return (
    <div className="shell shell-admin">
      <aside className="sidebar">
        <Brand sub="لوحة الإدارة" />
        <Ropes />
        <nav aria-label="قائمة الإدارة">
          {links.map(([to, label]) => (
            <NavLink key={to} to={to} end={to === "/admin"}>
              {label}{to === "/admin/inbox" && <Badge n={unread} />}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-foot"><SignOut /></div>
      </aside>
      <main className="content"><Outlet /></main>
    </div>
  );
}
