import { useCallback, useEffect, useRef, useState } from "react";
import * as api from "@api";
import { fmtDateTime } from "../lib/format";
import { ErrorNote, Loading } from "./ui";

// One thread between a student and the academy. Used by both the student and admin views.
export default function ChatView({ studentId, meId, emptyText }) {
  const [msgs, setMsgs] = useState(null);
  const [error, setError] = useState(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef(null);

  const load = useCallback(async () => {
    try {
      setMsgs(await api.listThread(studentId));
      setError(null);
      await api.markThreadRead(studentId);
    } catch (e) { setError(e); }
  }, [studentId]);

  useEffect(() => {
    load();
    return api.subscribe("chat_messages", load, `student_id=eq.${studentId}`);
  }, [load, studentId]);

  useEffect(() => { endRef.current?.scrollIntoView({ block: "end" }); }, [msgs]);

  async function send(e) {
    e.preventDefault();
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    try { await api.sendMessage(studentId, body); setText(""); await load(); }
    catch (err) { setError(err); }
    finally { setSending(false); }
  }

  return (
    <div className="chat">
      <div className="chat-log" aria-live="polite">
        {!msgs && !error && <Loading />}
        {msgs?.length === 0 && <p className="chat-empty">{emptyText}</p>}
        {msgs?.map((m) => (
          <div key={m.id} className={`bubble ${m.sender_id === meId ? "mine" : "theirs"}`}>
            <p>{m.body}</p>
            <time>{fmtDateTime(m.created_at)}</time>
            {m.sender_id === meId && m.read_at && <span className="seen">قُرئت</span>}
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <ErrorNote error={error} />
      <form className="chat-form" onSubmit={send}>
        <textarea
          rows={1} value={text} maxLength={2000} placeholder="اكتب رسالة"
          aria-label="نص الرسالة"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) send(e); }}
        />
        <button className="btn btn-red" disabled={!text.trim() || sending}>إرسال</button>
      </form>
    </div>
  );
}
