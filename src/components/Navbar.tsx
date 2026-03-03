import { Link, useLocation, useNavigate } from "react-router-dom";
import { ShoppingBag, Menu, X, Sun, Moon, User, LogOut, Settings } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AuthModal from "@/components/AuthModal";
import logo from "@/assets/logo.png";

const navLinks = [
  { to: "/", label: "Home" },
  { to: "/shop", label: "Shop" },
  { to: "/custom-orders", label: "Custom Orders" },
  { to: "/contact", label: "Contact" },
];

const Navbar = () => {
  const { totalItems } = useCart();
  const { theme, toggleTheme } = useTheme();
  const { user, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <>
      <header className="sticky top-0 z-50 glass">
        <div className="container mx-auto flex items-center justify-between px-4 py-4 lg:px-8">
          <Link to="/" className="flex items-center gap-3">
            <img src={logo} alt="Earthly Trinkets" className="h-10 w-10 rounded-full object-cover md:h-12 md:w-12" />
            <span className="font-display text-xl font-bold italic tracking-wide text-foreground md:text-2xl lg:text-[1.7rem]">
              <span className="text-primary">Earthly</span>{" "}
              <span>Trinkets</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-8 md:flex">
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

          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              aria-label="Toggle theme"
            >
              {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
            </button>
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

            {user ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  <User size={18} />
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
                        <Settings size={14} /> My Profile
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
              <div className="container mx-auto flex flex-col gap-1 px-4 py-4">
                {navLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={() => setMobileOpen(false)}
                    className={`rounded-lg px-4 py-3 font-body text-sm font-medium transition-colors hover:bg-secondary ${
                      location.pathname === link.to ? "text-primary bg-secondary" : "text-muted-foreground"
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
                {!user && (
                  <button
                    onClick={() => { setAuthOpen(true); setMobileOpen(false); }}
                    className="mt-2 rounded-lg bg-primary px-4 py-3 font-body text-sm font-semibold text-primary-foreground"
                  >
                    Sign In
                  </button>
                )}
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
