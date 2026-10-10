import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Avatar } from "../components/PostCard";
import { listMembers, type DirectoryMember } from "../services/members";
export function Members() {
  const [members, setMembers] = useState<DirectoryMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(false);
    listMembers()
      .then((rows) => {
        if (alive) setMembers(rows);
      })
      .catch(() => {
        if (alive) setError(true);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [revision]);
  const teams = [...new Set(members.map((m) => m.team_name))];
  return (
    <>
      <div className="page-heading">
        <h1>חברי הפלוגה</h1>
      </div>
      {loading ? (
        <p>טוענים חברים…</p>
      ) : error ? (
        <div role="alert">
          <p className="error">טעינת החברים נכשלה.</p>
          <button onClick={() => setRevision((v) => v + 1)}>נסה שוב</button>
        </div>
      ) : (
        teams.map((team) => (
          <section className="member-team" key={team}>
            <h2>{team}</h2>
            <div className="member-grid">
              {members
                .filter((m) => m.team_name === team)
                .map((m) => (
                  <Link
                    className="card person member-link"
                    key={m.id}
                    to={`/user/${m.id}`}
                  >
                    <Avatar name={m.display_name} path={m.avatar_path} />
                    <strong>{m.display_name}</strong>
                    <span className="arrow" aria-hidden="true">
                      ←
                    </span>
                  </Link>
                ))}
            </div>
          </section>
        ))
      )}
    </>
  );
}
