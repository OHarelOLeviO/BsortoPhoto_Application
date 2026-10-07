import { useEffect, useState } from "react";
import { supabase } from "../services/client";
import type { Post, Team } from "../types";
import { usePhotos } from "../hooks/usePhotos";
import { PostCard } from "../components/PostCard";
import { Viewer } from "../components/Viewer";
export function Feed() {
  const [team, setTeam] = useState("");
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamError, setTeamError] = useState(false);
  const [revision, setRevision] = useState(0);
  const [viewer, setViewer] = useState<Post | null>(null);
  const list = usePhotos(team);
  useEffect(() => {
    let alive = true;
    supabase
      .from("teams")
      .select("id,name")
      .order("name")
      .then(({ data, error }) => {
        if (alive) {
          setTeams(data || []);
          setTeamError(Boolean(error));
        }
      });
    return () => {
      alive = false;
    };
  }, [revision]);
  return (
    <>
      <div className="filters" aria-label="סינון לפי צוות">
        <button
          aria-pressed={!team}
          className={!team ? "active" : ""}
          onClick={() => setTeam("")}
        >
          הכול
        </button>
        {teams.map((t) => (
          <button
            key={t.id}
            aria-pressed={team === t.id}
            className={team === t.id ? "active" : ""}
            onClick={() => setTeam(t.id)}
          >
            {t.name}
          </button>
        ))}
      </div>
      {teamError && (
        <button onClick={() => setRevision((v) => v + 1)}>
          טעינת הצוותים נכשלה · נסה שוב
        </button>
      )}
      <div className="feed">
        {list.posts.map((p) => (
          <PostCard key={p.id} post={p} onOpen={() => setViewer(p)} />
        ))}
      </div>
      <ListStatus
        {...list}
        empty={
          team ? "עדיין לא הועלו תמונות מהצוות הזה." : "עדיין אין כאן תמונות 📷"
        }
      />
      {viewer && <Viewer post={viewer} onClose={() => setViewer(null)} />}
    </>
  );
}
export function ListStatus({
  posts,
  loading,
  error,
  more,
  load,
  empty,
}: {
  posts: Post[];
  loading: boolean;
  error: string;
  more: boolean;
  load: (reset?: boolean) => Promise<void>;
  empty: string;
}) {
  if (!loading && !error && posts.length > 0 && !more) return null;
  return (
    <div className="list-status" aria-live="polite">
      {loading ? (
        <p>טוענים תמונות…</p>
      ) : error ? (
        <>
          <p className="error">{error}</p>
          <button onClick={() => void load(posts.length === 0)}>נסה שוב</button>
        </>
      ) : posts.length === 0 ? (
        <p>{empty}</p>
      ) : more ? (
        <button onClick={() => void load()}>עוד רגעים</button>
      ) : null}
    </div>
  );
}
