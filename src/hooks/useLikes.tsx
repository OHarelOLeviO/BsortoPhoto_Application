import {
  createContext,
  useContext,
  useState,
  useRef,
  type ReactNode,
} from "react";
import type { Post } from "../types";
import { setLike, readLike } from "../services/photos";
import { useAuth } from "./useAuth";
type State = { liked: boolean; like_count: number; busy: boolean };
const Context = createContext<{
  values: Record<string, State>;
  toggle: (p: Post) => Promise<void>;
}>({ values: {}, toggle: async () => {} });
export function LikesProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const [values, setValues] = useState<Record<string, State>>({});
  const valuesRef = useRef<Record<string, State>>({});
  const locks = useRef(new Set<string>());
  const update = (id: string, value: State) => {
    valuesRef.current = { ...valuesRef.current, [id]: value };
    setValues(valuesRef.current);
  };
  async function toggle(p: Post) {
    if (!profile || locks.current.has(p.id)) return;
    locks.current.add(p.id);
    const previous = valuesRef.current[p.id] || {
      liked: p.liked,
      like_count: Number(p.like_count),
      busy: false,
    };
    update(p.id, {
      liked: !previous.liked,
      like_count: previous.like_count + (previous.liked ? -1 : 1),
      busy: true,
    });
    try {
      const count = await setLike(p.id, profile.id, !previous.liked);
      update(p.id, { liked: !previous.liked, like_count: count, busy: false });
    } catch {
      update(p.id, { ...previous, busy: true });
      try {
        const actual = await readLike(p.id, profile.id);
        update(p.id, { ...actual, busy: false });
      } catch {
        update(p.id, { ...previous, busy: false });
      }
      throw new Error("לא ניתן לעדכן את הלייק. נסה שוב.");
    } finally {
      locks.current.delete(p.id);
    }
  }
  return (
    <Context.Provider value={{ values, toggle }}>{children}</Context.Provider>
  );
}
export const useLikes = () => useContext(Context);
