import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../services/client";
import { useAuth } from "../hooks/useAuth";
import { dateLabel } from "./PostCard";
type Comment = {
  id: string;
  user_id: string;
  body: string;
  created_at: string;
  profiles: { display_name: string };
};
export function Comments({ postId }: { postId: string }) {
  const { profile } = useAuth();
  const [rows, setRows] = useState<Comment[]>([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [more, setMore] = useState(false);
  const [revision, setRevision] = useState(0);
  const lock = useRef(false);
  const generation = useRef(0);
  useEffect(() => {
    const token = ++generation.current;
    setLoading(true);
    setError("");
    setRows([]);
    supabase
      .from("comments")
      .select("id,user_id,body,created_at,profiles(display_name)")
      .eq("post_id", postId)
      .order("created_at")
      .order("id")
      .range(0, 19)
      .then(({ data, error }) => {
        if (token !== generation.current) return;
        setLoading(false);
        if (error) setError("טעינת התגובות נכשלה.");
        else {
          setRows((data || []) as unknown as Comment[]);
          setMore(data?.length === 20);
        }
      });
    return () => {
      generation.current = token + 1;
    };
  }, [postId, revision]);
  async function loadMore() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    const token = generation.current;
    try {
      const { data, error } = await supabase
        .from("comments")
        .select("id,user_id,body,created_at,profiles(display_name)")
        .eq("post_id", postId)
        .order("created_at")
        .order("id")
        .range(rows.length, rows.length + 19);
      if (error) throw error;
      if (token === generation.current) {
        setRows((old) => [...old, ...((data || []) as unknown as Comment[])]);
        setMore(data?.length === 20);
      }
    } catch {
      if (token === generation.current) setError("טעינת התגובות נכשלה.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (lock.current || !body.trim() || !profile) return;
    lock.current = true;
    setBusy(true);
    setError("");
    const token = generation.current;
    try {
      const { error } = await supabase
        .from("comments")
        .insert({ post_id: postId, user_id: profile.id, body: body.trim() });
      if (error) throw error;
      if (token === generation.current) {
        setBody("");
        setRevision((v) => v + 1);
        window.dispatchEvent(new Event("posts-changed"));
      }
    } catch {
      if (token === generation.current)
        setError("שליחת התגובה נכשלה. נסה שוב.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <section className="comments" aria-label="תגובות">
      <h2>תגובות</h2>
      <div className="comment-list" aria-live="polite">
        {loading ? (
          <p>טוענים תגובות…</p>
        ) : rows.length ? (
          rows.map((c) => (
            <article className="comment" key={c.id}>
              <Link to={`/user/${c.user_id}`}>{c.profiles.display_name}</Link>
              <time dateTime={c.created_at}>{dateLabel(c.created_at)}</time>
              <p>{c.body}</p>
            </article>
          ))
        ) : (
          !error && <p className="muted">אין תגובות</p>
        )}
      </div>
      {more && (
        <button disabled={busy} onClick={() => void loadMore()}>
          תגובות נוספות
        </button>
      )}
      {error && (
        <div role="alert">
          <p className="error">{error}</p>
          <button disabled={busy} onClick={() => setRevision((v) => v + 1)}>
            נסה שוב
          </button>
        </div>
      )}
      <form onSubmit={(e) => void submit(e)}>
        <label htmlFor={`comment-${postId}`}>תגובה</label>
        <textarea
          id={`comment-${postId}`}
          maxLength={1000}
          rows={2}
          value={body}
          disabled={busy}
          onChange={(e) => setBody(e.target.value)}
          required
        />
        <button className="primary" disabled={busy || !body.trim() || loading}>
          {busy ? "שולחים…" : "שליחה"}
        </button>
      </form>
    </section>
  );
}
