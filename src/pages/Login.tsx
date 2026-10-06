import { useState, type FormEvent } from "react";
import { supabase } from "../services/client";
import { memberEmail } from "../utils/identity";
export function Login() {
  const [identifier, setIdentifier] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const email = memberEmail(
        identifier,
        import.meta.env.VITE_AUTH_EMAIL_DOMAIN,
      );
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: code,
      });
      if (error)
        throw new Error(
          "המזהה או קוד הגישה אינם נכונים, או שאין חיבור. נסה שוב.",
        );
    } catch (e) {
      setError((e as Error).message);
    } finally {
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
        <label>
          מזהה חבר
          <input
            dir="ltr"
            autoComplete="username"
            required
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
          />
        </label>
        <label>
          קוד גישה אישי
          <input
            dir="ltr"
            type="password"
            autoComplete="current-password"
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
        </label>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <button className="primary" disabled={busy}>
          {busy ? "מתחברים…" : "כניסה לאלבום"}
        </button>
        <small>אין לך קוד גישה? פנה למנהל האתר.</small>
      </form>
    </main>
  );
}
