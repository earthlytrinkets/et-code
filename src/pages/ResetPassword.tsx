import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // PKCE flow: Supabase v2 redirects with ?code= query param
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (error) toast.error("Invalid or expired reset link.");
        else setReady(true);
      });
      return;
    }

    // Implicit flow fallback: token arrives via hash fragment
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) toast.error(error.message);
    else {
      toast.success("Password updated successfully!");
      navigate("/");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="container mx-auto flex min-h-[60vh] items-center justify-center px-4">
        <div className="w-full max-w-md rounded-2xl bg-card p-8 shadow-elevated">
          <h1 className="font-display text-2xl font-bold text-foreground">Set New Password</h1>
          {ready ? (
            <>
              <p className="mt-1 font-body text-sm text-muted-foreground">Enter your new password below.</p>
              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="New password"
                    className="w-full rounded-lg border border-border bg-background px-4 py-3 pr-10 font-body text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 font-body text-sm font-semibold text-primary-foreground hover:shadow-glow disabled:opacity-50">
                  {loading && <Loader2 size={16} className="animate-spin" />}
                  Update Password
                </button>
              </form>
            </>
          ) : (
            <p className="mt-4 font-body text-sm text-muted-foreground">Verifying reset link…</p>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ResetPassword;
