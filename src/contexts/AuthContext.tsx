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
      .select("id, full_name, avatar_url, created_at")
      .eq("id", user.id)
      .maybeSingle();

    const welcomeKey = `et_welcome_sent_${user.id}`;

    if (!existing) {
      await supabase.from("profiles").insert({ id: user.id, full_name: name, avatar_url: avatar });
      // Send welcome email for new Google OAuth sign-ups
      if (user.email && !localStorage.getItem(welcomeKey)) {
        localStorage.setItem(welcomeKey, "1");
        supabase.functions.invoke("send-order-email", {
          body: { event: "welcome", email: user.email, name: name ?? "" },
        }).catch(console.error);
      }
    } else {
      // Profile auto-created by handle_new_user() trigger — detect new user
      // by checking the localStorage flag (avoids fragile time-window heuristics)
      const isNewUser = !localStorage.getItem(welcomeKey);
      // Only send once: within 2 minutes of account creation to avoid sending
      // on returning logins where localStorage was cleared
      const accountAge = Date.now() - new Date(user.created_at).getTime();
      if (isNewUser && accountAge < 120_000 && user.email) {
        localStorage.setItem(welcomeKey, "1");
        supabase.functions.invoke("send-order-email", {
          body: { event: "welcome", email: user.email, name: name ?? "" },
        }).catch(console.error);
      }

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
    localStorage.removeItem("et_shiprocket_token");
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
