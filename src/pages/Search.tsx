import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../services/client";
import type { Profile } from "../types";
import { Avatar } from "../components/PostCard";
export function Search() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);
  const generation = useRef(0);
  useEffect(() => {
    let cancelled = false;
    const token = ++generation.current;
    setResults([]);
    setError(false);
    const text = query.trim();
    if (!text) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const timer = setTimeout(() => {
      const escaped = text.replace(/[\\%_]/g, (c) => "\\" + c);
      supabase
        .from("profiles")
        .select("*,teams(name)")
        .eq("is_active", true)
        .ilike("display_name", `%${escaped}%`)
        .order("display_name")
        .order("id")
        .limit(20)
        .then(({ data, error }) => {
          if (!cancelled && token === generation.current) {
            setResults((data || []) as Profile[]);
            setError(Boolean(error));
            setLoading(false);
          }
        });
    }, 300);
    return () => {
      clearTimeout(timer);
      cancelled = true;
    };
  }, [query, revision]);
  return (
    <>
      <div className="page-heading">
        <p className="eyebrow">האנשים שלנו</p>
        <h1>חיפוש חברים</h1>
      </div>
      <label className="search-label">
        שם החבר
        <input
          type="search"
          placeholder="חיפוש לפי שם…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      <div className="search-results" aria-live="polite">
        {loading ? (
          <p>מחפשים…</p>
        ) : error ? (
          <>
            <p className="error">משהו השתבש. נסה שוב.</p>
            <button onClick={() => setRevision((v) => v + 1)}>נסה שוב</button>
          </>
        ) : (
          results.map((p) => (
            <Link className="card person" key={p.id} to={`/user/${p.id}`}>
              <Avatar name={p.display_name} path={p.avatar_path} />
              <span>
                <strong>{p.display_name}</strong>
                <small>{p.teams.name}</small>
              </span>
              <span className="arrow">←</span>
            </Link>
          ))
        )}
        {query.trim() && !loading && !error && !results.length && (
          <p>לא נמצאו חברים בשם הזה.</p>
        )}
      </div>
    </>
  );
}
