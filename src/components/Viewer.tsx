import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import type { Post } from "../types";
import { Photo } from "./Photo";
import { Like, dateLabel } from "./PostCard";
export function Viewer({ post, onClose }: { post: Post; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const dialog = ref.current;
    dialog?.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      dialog?.close();
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="viewer"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      aria-labelledby="viewer-name"
    >
      <button
        className="close"
        autoFocus
        onClick={onClose}
        aria-label="סגירת תמונה"
      >
        ✕
      </button>
      <Photo
        path={post.image_path}
        alt={`תמונה של ${post.display_name}`}
        width={post.image_width}
        height={post.image_height}
      />
      <div className="viewer-info">
        <Link id="viewer-name" to={`/user/${post.user_id}`} onClick={onClose}>
          {post.display_name} · {post.team_name}
        </Link>
        <time>{dateLabel(post.created_at)}</time>
        <Like post={post} />
      </div>
    </dialog>
  );
}
