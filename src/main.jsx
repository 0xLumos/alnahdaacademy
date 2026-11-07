import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, MemoryRouter, Navigate, Route, Routes } from "react-router-dom";
import * as api from "@api";
import { AuthProvider, useAuth } from "./lib/auth";
import { AdminShell, StudentShell } from "./components/Shell";
import { Loading } from "./components/ui";
import Login from "./pages/Login";
import Landing from "./pages/Landing";
import Shop, { PortalShop } from "./pages/Shop";
import Finance from "./pages/admin/Finance";
import Products from "./pages/admin/Products";
import Home from "./pages/student/Home";
import Schedule from "./pages/student/Schedule";
import News from "./pages/student/News";
import StudentChat from "./pages/student/Chat";
import Dashboard from "./pages/admin/Dashboard";
import Students from "./pages/admin/Students";
import StudentDetail from "./pages/admin/StudentDetail";
import Classes from "./pages/admin/Classes";
import AdminNews from "./pages/admin/News";
import Inbox from "./pages/admin/Inbox";
import Thread from "./pages/admin/Thread";
import { DEMO } from "./lib/config";
import "./styles.css";

// The demo runs from a single file or an embedded preview, so it keeps routes in memory.
const Router = DEMO ? MemoryRouter : BrowserRouter;

// "/" is the public gym page. Everything else is the portal (students at /portal, admin at /admin).
function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/shop" element={<Shop />} />
      <Route path="*" element={<Portal />} />
    </Routes>
  );
}

function Portal() {
  const { me, loading, error } = useAuth();
  if (loading) return <div className="splash"><Loading /></div>;
  if (error) return (
    <div className="splash">
      <p>تعذّر الاتصال بالخادم. تحقق من الإنترنت ثم أعد تحميل الصفحة.</p>
      <button className="btn btn-ghost" onClick={() => location.reload()}>إعادة التحميل</button>
    </div>
  );
  if (!me) return <Login />;
  if (!me.active) return (
    <div className="splash">
      <p>هذا الحساب موقوف. راجع إدارة الأكاديمية.</p>
      <button className="btn btn-ghost" onClick={() => api.signOut()}>تسجيل الخروج</button>
    </div>
  );

  return me.role === "admin" ? (
    <Routes>
      <Route path="/admin" element={<AdminShell />}>
        <Route index element={<Dashboard />} />
        <Route path="students" element={<Students />} />
        <Route path="students/:id" element={<StudentDetail />} />
        <Route path="classes" element={<Classes />} />
        <Route path="news" element={<AdminNews />} />
        <Route path="finance" element={<Finance />} />
        <Route path="shop" element={<Products />} />
        <Route path="inbox" element={<Inbox />} />
        <Route path="inbox/:id" element={<Thread />} />
      </Route>
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  ) : (
    <Routes>
      <Route path="/portal" element={<StudentShell />}>
        <Route index element={<Home />} />
        <Route path="schedule" element={<Schedule />} />
        <Route path="news" element={<News />} />
        <Route path="chat" element={<StudentChat />} />
        <Route path="shop" element={<PortalShop />} />
      </Route>
      <Route path="*" element={<Navigate to="/portal" replace />} />
    </Routes>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Router {...(DEMO ? {} : { basename: import.meta.env.BASE_URL.replace(/\/$/, "") || "/" })}>
      <AuthProvider><App /></AuthProvider>
    </Router>
  </React.StrictMode>
);

if ("serviceWorker" in navigator && import.meta.env.PROD && !DEMO) {
  window.addEventListener("load", () => navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`));
}
