import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const ADMIN_PREFIX = "et_admin_";
const CURRENT_UID_KEY = "et_current_uid";

/**
 * Returns admin status with localStorage caching to prevent flashes.
 * Stores the user ID separately so the cache can be read before auth resolves.
 * `roleChecked` is true once the status is confirmed (either from cache or DB).
 */
export const useIsAdmin = () => {
  const { user, loading } = useAuth();

  const [isAdmin, setIsAdmin] = useState(() => {
    if (typeof window === "undefined") return false;
    const uid = localStorage.getItem(CURRENT_UID_KEY);
    if (!uid) return false;
    return localStorage.getItem(`${ADMIN_PREFIX}${uid}`) === "true";
  });

  const [roleChecked, setRoleChecked] = useState(() => {
    if (typeof window === "undefined") return false;
    const uid = localStorage.getItem(CURRENT_UID_KEY);
    if (!uid) return false;
    return localStorage.getItem(`${ADMIN_PREFIX}${uid}`) !== null;
  });

  useEffect(() => {
    // Auth still resolving — preserve the cached state, don't flash
    if (loading) return;

    if (!user) {
      localStorage.removeItem(CURRENT_UID_KEY);
      setIsAdmin(false);
      setRoleChecked(true);
      return;
    }
    localStorage.setItem(CURRENT_UID_KEY, user.id);
    const cached = localStorage.getItem(`${ADMIN_PREFIX}${user.id}`);
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
        localStorage.setItem(`${ADMIN_PREFIX}${user.id}`, String(admin));
      });
  }, [user?.id, loading]);

  return { isAdmin, roleChecked };
};
