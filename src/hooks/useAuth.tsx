import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../services/client";
import type { Profile } from "../types";
const AuthContext = createContext<{
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  error: string;
  retry: () => void;
}>({ session: null, profile: null, loading: true, error: "", retry: () => {} });
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data, error }) => {
      if (alive) {
        if (error) {
          setError("החיבור פג. יש להתחבר שוב.");
          setLoading(false);
        }
        setSession(data.session);
        if (!data.session) setLoading(false);
      }
    });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      if (alive) {
        setSession(next);
        if (!next) {
          setProfile(null);
          setLoading(false);
        }
      }
    });
    return () => {
      alive = false;
      data.subscription.unsubscribe();
    };
  }, []);
  useEffect(() => {
    if (!session) return;
    let alive = true;
    async function check() {
      const { data, error } = await supabase
        .from("profiles")
        .select("*,teams(name)")
        .eq("id", session!.user.id)
        .single();
      if (!alive) return;
      if (error || !data?.is_active) {
        setProfile(null);
        setError("הגישה אינה זמינה. נסה שוב או פנה למנהל האתר.");
      } else {
        setProfile(data as Profile);
        setError("");
      }
      setLoading(false);
    }
    void check();
    const timer = setInterval(() => void check(), 60000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [session, revision]);
  return (
    <AuthContext.Provider
      value={{
        session,
        profile,
        loading,
        error,
        retry: () => {
          setLoading(true);
          setRevision((v) => v + 1);
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
export const useAuth = () => useContext(AuthContext);
