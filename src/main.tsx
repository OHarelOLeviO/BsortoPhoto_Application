import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter, NavLink, Route, Routes, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { LikesProvider } from "./hooks/useLikes";
import { configured, supabase } from "./services/client";
import { Login } from "./pages/Login";
import { Feed } from "./pages/Feed";
import { Upload } from "./pages/Upload";
import { Profile } from "./pages/Profile";
import { useState } from "react";
import "./styles.css";
function App() {
  const { session, profile, loading, error, retry } = useAuth();
  const [logoutError, setLogoutError] = useState("");
  async function logout() {
    const { error } = await supabase.auth.signOut();
    setLogoutError(error ? "ההתנתקות נכשלה. נסה שוב." : "");
  }
  if (loading)
    return (
      <main className="login" aria-live="polite">
        טוענים את האלבום…
      </main>
    );
  if (!session) return <Login />;
  if (!profile)
    return (
      <main className="login">
        <p role="alert">{error || "החיבור פג. יש להתחבר שוב."}</p>
        <button onClick={retry}>נסה שוב</button>
        <button onClick={() => void logout()}>התנתקות</button>
        {logoutError && <p>{logoutError}</p>}
      </main>
    );
  return (
    <LikesProvider key={session.user.id}>
      <header className="topbar">
        <NavLink className="logo" to="/">
          <img src={`${import.meta.env.BASE_URL}bsortophoto-logo.png`} alt="" />
          <span dir="ltr">BsortoPhoto</span>
        </NavLink>
        <button onClick={() => void logout()}>התנתקות</button>
      </header>
      {logoutError && (
        <p role="alert" className="error">
          {logoutError}
        </p>
      )}
      <div className="layout">
        <nav className="navigation" aria-label="ניווט ראשי">
          <NavLink to="/" end>
            ▦ <span>הפיד</span>
          </NavLink>
          <NavLink to="/upload">
            ＋ <span>העלאה</span>
          </NavLink>
          <NavLink to={`/user/${profile.id}`}>
            ◯ <span>הפרופיל שלי</span>
          </NavLink>
        </nav>
        <main className="content">
          <Routes>
            <Route path="/" element={<Feed />} />
            <Route path="/upload" element={<Upload />} />
            <Route path="/user/:id" element={<Profile />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </LikesProvider>
  );
}
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {configured ? (
      <HashRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </HashRouter>
    ) : (
      <main className="login">
        <img className="brand-mark" src={`${import.meta.env.BASE_URL}bsortophoto-logo.png`} alt="BsortoPhoto" />
        <h1 dir="ltr">BsortoPhoto</h1>
        <p>האתר מחכה לחיבור ל-Supabase.</p>
        <p>
          מנהל האתר צריך להגדיר את כתובת הפרויקט, המפתח הציבורי ודומיין ההתחברות
          לפי README.
        </p>
      </main>
    )}
  </React.StrictMode>,
);
