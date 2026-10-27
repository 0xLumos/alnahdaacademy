import { useState } from "react";
import { Link } from "react-router-dom";
import * as api from "@api";
import { DEMO } from "../lib/config";
import { Ropes } from "../components/ui";
import logo from "../assets/logo.jpg";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setError("");
    try { await api.signIn(username, password); }
    catch { setError("اسم المستخدم أو كلمة المرور غير صحيحة، أو الحساب موقوف. راجع الاستقبال إذا نسيت بياناتك."); }
    finally { setBusy(false); }
  }

  return (
    <div className="login">
      <img className="login-logo" src={logo} alt="شعار أكاديمية النهضة الرياضية" width="220" height="220" />
      <Ropes />
      <form className="login-card" onSubmit={submit}>
        <h1>بوابة المقاتلين</h1>
        <p className="muted">استخدم اسم المستخدم وكلمة المرور التي حصلت عليها عند التسجيل في الأكاديمية.</p>
        <label className="field">
          <span className="field-label">اسم المستخدم</span>
          <input dir="ltr" autoComplete="username" autoCapitalize="none" spellCheck="false" required
            value={username} onChange={(e) => setUsername(e.target.value)} />
        </label>
        <label className="field">
          <span className="field-label">كلمة المرور</span>
          <input dir="ltr" type="password" autoComplete="current-password" required
            value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {error && <div className="note note-error" role="alert">{error}</div>}
        <button className="btn btn-red btn-block" disabled={busy}>{busy ? "جارٍ الدخول…" : "دخول"}</button>
        <Link className="link login-back" to="/">العودة إلى صفحة الأكاديمية</Link>
        {DEMO && <p className="demo-hint">وضع العرض: ادخل باسم <b dir="ltr">admin</b> أو <b dir="ltr">ahmad</b> وأي كلمة مرور من 8 أحرف.</p>}
      </form>
    </div>
  );
}
