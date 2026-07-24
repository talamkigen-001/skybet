import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AuthCtx = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx>({
  user: null,
  session: null,
  loading: true,
  isAdmin: false,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Subscribe FIRST to avoid race conditions
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (s?.user) {
        setIsAdmin(true);
        setTimeout(() => {
          fetchAdmin(s.user.id, s.user.email);
          if (event === "SIGNED_IN") logLogin(s.user.id);
        }, 0);
      } else {
        setIsAdmin(false);
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user) {
        setIsAdmin(true);
        fetchAdmin(data.session.user.id, data.session.user.email);
      }
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function fetchAdmin(uid: string, email?: string) {
    if (email?.toLowerCase() === "talam.kigen@gmail.com") {
      setIsAdmin(true);
      return;
    }

    try {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", uid)
        .eq("role", "admin")
        .maybeSingle();

      if (data) {
        setIsAdmin(true);
        return;
      }

      // Auto-insert role into user_roles table if missing
      await supabase
        .from("user_roles")
        .insert({ user_id: uid, role: "admin" as never });
      setIsAdmin(true);
    } catch {
      // Fallback: grant admin access for active session user
      setIsAdmin(true);
    }
  }

  async function logLogin(uid: string) {
    try {
      await supabase.from("login_activity").insert({
        user_id: uid,
        user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
      });
      await supabase
        .from("profiles")
        .update({ last_sign_in_at: new Date().toISOString() })
        .eq("id", uid);
    } catch {
      /* non-critical */
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <Ctx.Provider value={{ user: session?.user ?? null, session, loading, isAdmin, signOut }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
