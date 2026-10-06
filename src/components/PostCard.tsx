import { useState } from "react";
import { Link } from "react-router-dom";
import type { Post } from "../types";
import { useLikes } from "../hooks/useLikes";
import { Photo } from "./Photo";
export const dateLabel = (date: string) =>
  new Intl.DateTimeFormat("he-IL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
export function Like({ post }: { post: Post }) {
  const { values, toggle } = useLikes();
  const state = values[post.id] || post;
  const [error, setError] = useState("");
  return (
    <div>
      <button
        className={`like ${state.liked ? "selected" : ""}`}
        aria-pressed={state.liked}
        disabled={"busy" in state && state.busy}
        onClick={() => {
          setError("");
          void toggle(post).catch((e) => setError((e as Error).message));
        }}
      >
        {state.liked ? "♥" : "♡"} <span>{state.like_count}</span>
        <span className="sr-only"> לייקים</span>
      </button>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
    </div>
  );
}
export function Avatar({ name, path }: { name: string; path?: string | null }) {
  return (
    <span className="avatar">
      {path ? <Photo path={path} alt="תמונת פרופיל" /> : name.slice(0, 1)}
    </span>
  );
}
export function PostCard({ post, onOpen }: { post: Post; onOpen: () => void }) {
  return (
    <article className="card post">
      <header>
        <Link to={`/user/${post.user_id}`} className="person">
          <Avatar name={post.display_name} path={post.avatar_path} />
          <span>
            <strong>{post.display_name}</strong>
            <small>{post.team_name}</small>
          </span>
        </Link>
        <time dateTime={post.created_at}>{dateLabel(post.created_at)}</time>
      </header>
      <button
        className="photo-button"
        onClick={onOpen}
        aria-label={`פתיחת תמונה של ${post.display_name}`}
      >
        <Photo
          path={post.image_path}
          alt={`תמונה של ${post.display_name}`}
          width={post.image_width}
          height={post.image_height}
        />
      </button>
      <footer>
        <Like post={post} />
      </footer>
    </article>
  );
}
