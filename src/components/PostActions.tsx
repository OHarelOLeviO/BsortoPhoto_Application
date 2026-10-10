import { useRef, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { deletePost } from "../services/photos";
import type { Post } from "../types";
export function PostActions({
  post,
  onDeleted,
}: {
  post: Post;
  onDeleted?: () => void;
}) {
  const { profile } = useAuth();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  if (profile?.id !== post.user_id) return null;
  async function remove() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const clean = await deletePost(post);
      window.dispatchEvent(
        new CustomEvent("posts-changed", {
          detail: {
            message: clean
              ? ""
              : "הפוסט נמחק. ניקוי קובץ התמונה נכשל; יש לעדכן את מנהל האתר.",
          },
        }),
      );
      onDeleted?.();
    } catch {
      setError("מחיקת הפוסט נכשלה. נסה שוב.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <div className="post-actions">
      {confirm ? (
        <>
          <p>למחוק את הפוסט והתגובות שלו?</p>
          <div className="action-row">
            <button
              className="danger"
              disabled={busy}
              onClick={() => void remove()}
            >
              {busy ? "מוחקים…" : "מחיקת הפוסט"}
            </button>
            <button
              disabled={busy}
              onClick={() => {
                setConfirm(false);
                setError("");
              }}
            >
              ביטול
            </button>
          </div>
        </>
      ) : (
        <button className="delete-post" onClick={() => setConfirm(true)}>
          מחיקת הפוסט
        </button>
      )}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
    </div>
  );
}
