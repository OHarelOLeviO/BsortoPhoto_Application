import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  listLoginMembers,
  loginAsMember,
  type MemberChoice,
} from "../services/nameLogin";
export function Login() {
  const [members, setMembers] = useState<MemberChoice[]>([]);
  const [selected, setSelected] = useState("");
  const [team, setTeam] = useState("");
  const teams = [...new Set(members.map((member) => member.team_name))].sort(new Intl.Collator("he", { numeric: true }).compare);
  const teamMembers = members.filter((member) => member.team_name === team);
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
    if (!teamMembers.some((member) => member.id === selected) || lock.current) return;
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
      <img className="brand-mark" src={`${import.meta.env.BASE_URL}bsortophoto-logo.png`} alt="הלוגו של BsortoPhoto" />
      <h1 dir="ltr">BsortoPhoto</h1>
      <form className="card login-form" onSubmit={submit}>
        <h2>כניסה</h2>
        <label htmlFor="team-choice">צוות</label>
        <select id="team-choice" required disabled={loading || busy} value={team} onChange={(e) => { setTeam(e.target.value); setSelected(""); }}>
          <option value="">בחירת צוות מהרשימה</option>
          {teams.map((name) => <option key={name} value={name}>{name}</option>)}
        </select>
        <label htmlFor="member-choice" style={{ marginTop: 20 }}>שם</label>
        <select
          id="member-choice"
          required
          disabled={loading || busy || !team}
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
        >
          <option value="">
            {loading ? "טוענים שמות…" : "בחירת שם מהרשימה"}
          </option>
          {teamMembers.map((member) => (
            <option key={member.id} value={member.id}>
              {member.display_name}
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
      </form>
    </main>
  );
}
