import { useCallback, useEffect, useRef, useState } from "react";
import type { Post } from "../types";
import { feed } from "../services/photos";
export function usePhotos(team?: string, user?: string) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [more, setMore] = useState(true);
  const generation = useRef(0);
  const cursor = useRef<Post | undefined>(undefined);
  const busy = useRef(false);
  const load = useCallback(
    async (reset = false) => {
      if (busy.current && !reset) return;
      const token = reset ? ++generation.current : generation.current;
      busy.current = true;
      setLoading(true);
      setError("");
      if (reset) {
        cursor.current = undefined;
        setPosts([]);
      }
      try {
        const rows = await feed(team, user, cursor.current);
        if (token !== generation.current) return;
        cursor.current = rows.at(-1) || cursor.current;
        setPosts((old) =>
          reset
            ? rows
            : [...old, ...rows.filter((p) => !old.some((q) => q.id === p.id))],
        );
        setMore(rows.length === 20);
      } catch {
        if (token === generation.current) setError("משהו השתבש. נסה שוב.");
      } finally {
        if (token === generation.current) {
          busy.current = false;
          setLoading(false);
        }
      }
    },
    [team, user],
  );
  const invalidate = useCallback(() => {
    generation.current++;
    busy.current = false;
  }, []);
  useEffect(() => {
    void load(true);
    return invalidate;
  }, [load, invalidate]);
  return { posts, loading, error, more, load };
}
