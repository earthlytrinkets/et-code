import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

/**
 * Returns admin status with localStorage caching to prevent flashes.
 * `roleChecked` is true once the status is confirmed (either from cache or DB).
 */
export const useIsAdmin = () => {
  const { user } = useAuth();

  const [isAdmin, setIsAdmin] = useState(() => {
    if (typeof window === "undefined" || !user) return false;
    return localStorage.getItem(`et_admin_${user.id}`) === "true";
  });

  const [roleChecked, setRoleChecked] = useState(() => {
    if (!user) return true;
    return localStorage.getItem(`et_admin_${user.id}`) !== null;
  });

  useEffect(() => {
    if (!user) { setIsAdmin(false); setRoleChecked(true); return; }
    const cached = localStorage.getItem(`et_admin_${user.id}`);
    if (cached !== null) { setIsAdmin(cached === "true"); setRoleChecked(true); }
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle()
      .then(({ data }) => {
        const admin = !!data;
        setIsAdmin(admin);
        setRoleChecked(true);
        localStorage.setItem(`et_admin_${user.id}`, String(admin));
      });
  }, [user?.id]);

  return { isAdmin, roleChecked };
};
