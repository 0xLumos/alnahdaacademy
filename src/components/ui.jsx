import { useEffect, useRef } from "react";
import { errText } from "../lib/format";

// Three ring ropes. Used as the brand divider under headers and around the countdown.
export const Ropes = ({ className = "" }) => (
  <div className={`ropes ${className}`} aria-hidden="true"><i /><i /><i /></div>
);

export const Loading = () => <div className="loading" role="status">جارٍ التحميل…</div>;

export const ErrorNote = ({ error, onRetry }) => error ? (
  <div className="note note-error" role="alert">
    <span>{errText(error)}</span>
    {onRetry && <button className="btn btn-ghost btn-sm" onClick={onRetry}>إعادة المحاولة</button>}
  </div>
) : null;

export const Empty = ({ children, action }) => (
  <div className="empty"><p>{children}</p>{action}</div>
);

export const PageTitle = ({ children, action }) => (
  <div className="page-title"><h1>{children}</h1>{action}</div>
);

export const Badge = ({ n }) => (n > 0 ? <span className="badge" aria-label={`${n} غير مقروءة`}>{n > 99 ? "99+" : n}</span> : null);

export function Modal({ title, onClose, children }) {
  const ref = useRef(null);
  useEffect(() => {
    const prev = document.activeElement;
    ref.current?.querySelector("input, select, textarea, button")?.focus();
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("keydown", onKey); prev?.focus?.(); };
  }, [onClose]);
  return (
    <div className="modal-back" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title} ref={ref}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="إغلاق">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export const Field = ({ label, hint, children }) => (
  <label className="field">
    <span className="field-label">{label}</span>
    {children}
    {hint && <span className="field-hint">{hint}</span>}
  </label>
);

// Generates a readable 10-character password for new accounts and resets.
export function genPassword() {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  const buf = new Uint32Array(10);
  crypto.getRandomValues(buf);
  return Array.from(buf, (n) => chars[n % chars.length]).join("");
}
