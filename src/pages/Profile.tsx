import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import type { Post, Profile as Member } from "../types";
import { supabase } from "../services/client";
import { usePhotos } from "../hooks/usePhotos";
import { useAuth } from "../hooks/useAuth";
import { Avatar } from "../components/PostCard";
import { Photo } from "../components/Photo";
import { Viewer } from "../components/Viewer";
import { ListStatus } from "./Feed";
export function Profile() {
  const { id } = useParams();
  const { profile: me } = useAuth();
  const [member, setMember] = useState<Member | null>(null);
  const [count, setCount] = useState(0);
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);
  const [viewer, setViewer] = useState<Post | null>(null);
  const list = usePhotos(undefined, id);
  useEffect(() => {
    let alive = true;
    setMember(null);
    setError(false);
    Promise.all([
      supabase.from("profiles").select("*,teams(name)").eq("id", id!).single(),
      supabase
        .from("posts")
        .select("id", { count: "exact", head: true })
        .eq("user_id", id!),
    ]).then(([profile, count]) => {
      if (alive) {
        setError(Boolean(profile.error || count.error));
        setMember(profile.data as Member);
        setCount(count.count || 0);
      }
    });
    return () => {
      alive = false;
    };
  }, [id, revision]);
  return (
    <>
      {error ? (
        <div className="list-status">
          <p className="error">לא ניתן לטעון את הפרופיל.</p>
          <button onClick={() => setRevision((v) => v + 1)}>נסה שוב</button>
        </div>
      ) : member ? (
        <header className="profile-heading card">
          <Avatar name={member.display_name} path={member.avatar_path} />
          <h1>{member.display_name}</h1>
          <p>{member.teams.name}</p>
          <strong>{count} תמונות</strong>
        </header>
      ) : (
        <p>טוענים פרופיל…</p>
      )}
      <div className="grid">
        {list.posts.map((p) => (
          <button
            className="grid-photo"
            key={p.id}
            aria-label={`פתיחת תמונה מתאריך ${p.created_at.slice(0, 10)}`}
            onClick={() => setViewer(p)}
          >
            <Photo
              path={p.image_path}
              alt={`תמונה של ${p.display_name}`}
              width={p.image_width}
              height={p.image_height}
            />
          </button>
        ))}
      </div>
      <ListStatus
        {...list}
        empty={
          me?.id === id ? "עדיין לא העלית תמונות." : "עדיין אין כאן תמונות 📷"
        }
      />
      {viewer && <Viewer post={viewer} onClose={() => setViewer(null)} />}
    </>
  );
}
