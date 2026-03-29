import { Link, useLocation, useNavigate } from "react-router-dom";
import { ShoppingBag, Menu, X, Sun, Moon, LogOut, Settings } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import AuthModal from "@/components/AuthModal";
import logo from "@/assets/logo.png";
import { supabase } from "@/integrations/supabase/client";


const Navbar = () => {
  const { totalItems } = useCart();
  const { theme, toggleTheme } = useTheme();
  const { user, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { isAdmin, roleChecked } = useIsAdmin();

  const navLinks = [
    { to: "/shop", label: roleChecked && isAdmin ? "Shop (View Only)" : "Shop" },
    { to: "/about", label: "About" },
    ...(!!user && !(roleChecked && isAdmin) ? [{ to: "/custom-orders", label: "Custom Orders" }] : []),
    { to: "/contact", label: "Contact" },
  ];
  const userMenuRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    if (userMenuOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [userMenuOpen]);

  // Share cache key with Profile page so avatar updates instantly everywhere
  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("avatar_url, full_name")
        .eq("id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });


  return (
    <>
      <header className="sticky top-0 z-50 glass">
        <div className="container mx-auto grid grid-cols-3 items-center px-4 py-4 lg:px-8">
          <Link to="/" className="flex items-center gap-3">
            <img src={logo} alt="Earthly Trinkets" className="h-10 w-10 rounded-full object-cover md:h-12 md:w-12" />
            <span className="font-display text-xl font-bold italic tracking-wide text-foreground md:text-2xl lg:text-[1.7rem]">
              <span className="text-primary">Earthly</span>{" "}
              <span>Trinkets</span>
            </span>
          </Link>

          <nav className="hidden items-center justify-center gap-8 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`relative font-body text-sm font-medium tracking-wide transition-colors hover:text-primary after:content-[''] after:absolute after:bottom-[-4px] after:left-0 after:h-[2px] after:bg-primary after:transition-all after:duration-300 after:ease-out ${
                  location.pathname === link.to
                    ? "text-primary after:w-full"
                    : "text-muted-foreground after:w-0 hover:after:w-full"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="col-start-3 flex items-center justify-end gap-2">
            <button
              onClick={toggleTheme}
              className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              aria-label="Toggle theme"
            >
              {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            {!(roleChecked && isAdmin) && (
              <Link
                to="/cart"
                className="relative rounded-full p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <ShoppingBag size={18} />
                {totalItems > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-accent-foreground">
                    {totalItems}
                  </span>
                )}
              </Link>
            )}

            {user ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="rounded-full p-0.5 text-muted-foreground transition-colors hover:ring-2 hover:ring-primary/30"
                >
                  {(() => {
                    const avatarUrl = profile?.avatar_url || user.user_metadata?.avatar_url || user.user_metadata?.picture;
                    const initials = (profile?.full_name || user.user_metadata?.full_name || user.user_metadata?.name || user.email || "?")[0].toUpperCase();
                    return avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt="avatar"
                        referrerPolicy="no-referrer"
                        className="h-8 w-8 rounded-full object-cover"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; (e.currentTarget.nextElementSibling as HTMLElement)?.removeAttribute("style"); }}
                      />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-display font-bold text-sm">
                        {initials}
                      </div>
                    );
                  })()}
                </button>
                <AnimatePresence>
                  {userMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      className="absolute right-0 top-full mt-2 w-48 rounded-xl bg-card p-2 shadow-elevated border border-border"
                    >
                      <div className="px-3 py-2">
                        {(user.user_metadata?.full_name || user.user_metadata?.name) && (
                          <p className="font-body text-sm font-medium text-foreground truncate">
                            {user.user_metadata?.full_name || user.user_metadata?.name}
                          </p>
                        )}
                        <p className="font-body text-xs text-muted-foreground truncate">
                          {user.email || user.phone}
                        </p>
                      </div>
                      <div className="h-px bg-border my-1" />
                      <Link
                        to="/profile"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 font-body text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                      >
                        <Settings size={14} /> Settings
                      </Link>
                      <button
                        onClick={async () => { await signOut(); setUserMenuOpen(false); navigate('/'); }}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 font-body text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                      >
                        <LogOut size={14} /> Sign Out
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <button
                onClick={() => setAuthOpen(true)}
                className="hidden rounded-full bg-primary px-5 py-2 font-body text-xs font-semibold text-primary-foreground transition-all hover:shadow-glow md:block"
              >
                Sign In
              </button>
            )}

            <button
              className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground md:hidden"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {mobileOpen && (
            <motion.nav
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-t border-border md:hidden"
            >
              <div className="container mx-auto px-4 py-3">
                {/* Nav links — compact 2-column grid */}
                <div className="grid grid-cols-2 gap-1">
                  {navLinks.map((link) => (
                    <Link
                      key={link.to}
                      to={link.to}
                      onClick={() => setMobileOpen(false)}
                      className={`rounded-lg px-3 py-2.5 font-body text-sm font-medium transition-colors hover:bg-secondary ${
                        location.pathname === link.to ? "text-primary bg-secondary" : "text-muted-foreground"
                      }`}
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>

                {/* User section */}
                <div className="mt-3 border-t border-border pt-3">
                  {user ? (
                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      {(() => {
                        const avatarUrl = profile?.avatar_url || user.user_metadata?.avatar_url || user.user_metadata?.picture;
                        const name = profile?.full_name || user.user_metadata?.full_name || user.user_metadata?.name;
                        const initials = (name || user.email || "?")[0].toUpperCase();
                        return avatarUrl ? (
                          <img src={avatarUrl} alt="avatar" referrerPolicy="no-referrer" className="h-8 w-8 rounded-full object-cover shrink-0" />
                        ) : (
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 font-display text-sm font-bold text-primary">
                            {initials}
                          </div>
                        );
                      })()}
                      {/* Name + email */}
                      <div className="flex-1 min-w-0">
                        <p className="font-body text-sm font-medium text-foreground truncate">
                          {profile?.full_name || user.user_metadata?.full_name || user.user_metadata?.name || user.email || ""}
                        </p>
                      </div>
                      {/* Action icon buttons */}
                      <Link
                        to="/profile"
                        onClick={() => setMobileOpen(false)}
                        className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                        title="Settings"
                      >
                        <Settings size={16} />
                      </Link>
                      <button
                        onClick={async () => { await signOut(); setMobileOpen(false); navigate("/"); }}
                        className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                        title="Sign Out"
                      >
                        <LogOut size={16} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setAuthOpen(true); setMobileOpen(false); }}
                      className="w-full rounded-lg bg-primary px-4 py-2.5 font-body text-sm font-semibold text-primary-foreground"
                    >
                      Sign In
                    </button>
                  )}
                </div>
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </header>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
};

export default Navbar;
