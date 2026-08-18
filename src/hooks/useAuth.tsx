import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AuthValue = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  displayName: string;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthValue>({
  session: null,
  user: null,
  loading: true,
  displayName: "",
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setLoading(false);
      if (next?.user) {
        // Deferred so we never call another Supabase API inside the callback.
        setTimeout(() => {
          void supabase
            .from("profiles")
            .upsert(
              {
                id: next.user.id,
                display_name:
                  (next.user.user_metadata?.["display_name"] as string | undefined) ??
                  next.user.email?.split("@")[0] ??
                  "Viewer",
              },
              { onConflict: "id", ignoreDuplicates: true },
            );
        }, 0);
      }
    });

    void supabase.auth.getSession().then(({ data: { session: current } }) => {
      setSession(current);
      setLoading(false);
    });

    return () => data.subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      displayName:
        (session?.user?.user_metadata?.["display_name"] as string | undefined) ??
        session?.user?.email?.split("@")[0] ??
        "",
      signOut: async () => {
        await supabase.auth.signOut();
      },
    }),
    [session, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
