import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const syncGoogleProfile = async (user: User) => {
    const meta = user.user_metadata;
    const name = meta?.full_name || meta?.name;
    const avatar = meta?.avatar_url || meta?.picture;

    const { data: existing } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url")
      .eq("id", user.id)
      .maybeSingle();

    if (!existing) {
      await supabase.from("profiles").insert({ id: user.id, full_name: name, avatar_url: avatar });
      // Send welcome email for new Google OAuth sign-ups
      if (user.email) {
        supabase.functions.invoke("send-order-email", {
          body: { event: "welcome", email: user.email, name: name ?? "" },
        }).catch(console.error);
      }
    } else {
      // Only fill fields the user hasn't already customised
      const updates: Record<string, string | undefined> = {};
      if (!existing.full_name && name) updates.full_name = name;
      if (!existing.avatar_url && avatar) updates.avatar_url = avatar;
      if (Object.keys(updates).length > 0)
        await supabase.from("profiles").update(updates).eq("id", user.id);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      if (session?.user) syncGoogleProfile(session.user);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    localStorage.setItem("et_signed_out", "true");
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
