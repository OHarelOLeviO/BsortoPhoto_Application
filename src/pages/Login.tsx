import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  listLoginMembers,
  loginAsMember,
  type MemberChoice,
} from "../services/nameLogin";
export function Login() {
  const [members, setMembers] = useState<MemberChoice[]>([]);
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const lock = useRef(false);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    listLoginMembers(controller.signal)
      .then((rows) => {
        if (!controller.signal.aborted) setMembers(rows);
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setError("לא ניתן לטעון את השמות. נסה שוב.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [revision]);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!selected || lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await loginAsMember(selected);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <main className="login">
      <div className="brand-mark">📷</div>
      <p className="eyebrow">האלבום של כולנו</p>
      <h1>הרגעים שלנו</h1>
      <p className="muted">התמונות, האנשים והזיכרונות שנשארים איתנו.</p>
      <form className="card login-form" onSubmit={submit}>
        <h2>טוב לראות אותך</h2>
        <label htmlFor="member-choice">מה השם שלך?</label>
        <select
          id="member-choice"
          style={{width:'100%',marginTop:8,background:'#f8faff',border:'1px solid #cdd8e8',borderRadius:10,padding:14,font:'inherit',minHeight:48}}
          required
          disabled={loading || busy}
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
        >
          <option value="">
            {loading ? "טוענים שמות…" : "בחירת שם מהרשימה"}
          </option>
          {members.map((member) => (
            <option key={member.id} value={member.id}>
              {member.display_name} · {member.team_name}
            </option>
          ))}
        </select>
        {!loading && !error && !members.length && (
          <p>עדיין אין חברים ברשימה. פנה למנהל האתר.</p>
        )}
        {error && (
          <div role="alert">
            <p className="error">{error}</p>
            {!members.length && (
              <button type="button" onClick={() => setRevision((v) => v + 1)}>
                נסה שוב
              </button>
            )}
          </div>
        )}
        <button className="primary" disabled={loading || busy || !selected}>
          {busy ? "מתחברים…" : "כניסה לאלבום"}
        </button>
        <small>בוחרים שם ונכנסים — ללא קוד גישה.</small>
      </form>
    </main>
  );
}
