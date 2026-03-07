import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Mail, Phone, Eye, EyeOff, ArrowLeft, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type AuthTab = "signin" | "signup";
type AuthMethod = "email" | "phone";
type PhoneStep = "input" | "otp";

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
}

const AuthModal = ({ open, onClose }: AuthModalProps) => {
  const [tab, setTab] = useState<AuthTab>("signin");
  const [method, setMethod] = useState<AuthMethod>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [forgotPassword, setForgotPassword] = useState(false);

  // Phone OTP state
  const [phoneStep, setPhoneStep] = useState<PhoneStep>("input");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const resetForm = () => {
    setEmail(""); setPassword(""); setFullName(""); setPhone("");
    setShowPassword(false); setForgotPassword(false);
    setPhoneStep("input"); setOtp(["", "", "", "", "", ""]);
  };

  const handleClose = () => { resetForm(); onClose(); };

  // ── Google ──────────────────────────────────────────────────────────────────

  const handleGoogleSignIn = async () => {
    setLoading(true);
    const signedOut = localStorage.getItem("et_signed_out") === "true";
    if (signedOut) localStorage.removeItem("et_signed_out");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
        ...(signedOut && { queryParams: { prompt: "select_account" } }),
      },
    });
    if (error) toast.error(error.message);
    setLoading(false);
  };

  // ── Email / password ────────────────────────────────────────────────────────

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return toast.error("Enter your email address");
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) toast.error(error.message);
    else toast.success("Check your email for the reset link!");
    setLoading(false);
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    if (tab === "signup") {
      const { error } = await supabase.auth.signUp({
        email, password,
        options: { data: { full_name: fullName }, emailRedirectTo: window.location.origin },
      });
      if (error) toast.error(error.message);
      else { toast.success("Check your email to confirm your account!"); handleClose(); }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) toast.error(error.message);
      else { toast.success("Welcome back!"); handleClose(); }
    }
    setLoading(false);
  };

  // ── Phone OTP ───────────────────────────────────────────────────────────────

  const normalisePhone = (p: string) =>
    p.startsWith("+") ? p : `+91${p.replace(/\D/g, "")}`;

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      phone: normalisePhone(phone),
      options: { shouldCreateUser: true },
    });
    if (error) toast.error(error.message);
    else { toast.success("OTP sent to your mobile"); setPhoneStep("otp"); }
    setLoading(false);
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = otp.join("");
    if (token.length < 6) return toast.error("Enter the full 6-digit code");
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      phone: normalisePhone(phone), token, type: "sms",
    });
    if (error) {
      toast.error(error.message);
    } else {
      if (fullName.trim()) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user)
          await supabase.from("profiles").update({ full_name: fullName.trim() })
            .eq("id", user.id).is("full_name", null);
      }
      toast.success("Welcome!");
      handleClose();
    }
    setLoading(false);
  };

  // ── OTP input helpers ───────────────────────────────────────────────────────

  const handleOtpChange = (i: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const next = [...otp]; next[i] = value.slice(-1); setOtp(next);
    if (value && i < 5) otpRefs.current[i + 1]?.focus();
  };

  const handleOtpKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[i] && i > 0) otpRefs.current[i - 1]?.focus();
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) { setOtp(pasted.split("")); otpRefs.current[5]?.focus(); }
    e.preventDefault();
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  const isPhoneOtpStep = method === "phone" && phoneStep === "otp";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/40 backdrop-blur-sm p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", duration: 0.5 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl bg-card p-8 shadow-elevated"
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isPhoneOtpStep && (
                  <button onClick={() => setPhoneStep("input")} className="rounded-full p-1.5 text-muted-foreground hover:bg-secondary">
                    <ArrowLeft size={16} />
                  </button>
                )}
                <div>
                  <h2 className="font-display text-2xl font-bold text-foreground">
                    {forgotPassword ? "Reset Password" : isPhoneOtpStep ? "Enter Code" : tab === "signin" ? "Welcome Back" : "Create Account"}
                  </h2>
                  <p className="mt-0.5 font-body text-sm text-muted-foreground">
                    {forgotPassword ? "We'll send you a reset link"
                      : isPhoneOtpStep ? `Code sent to ${phone}`
                      : tab === "signin" ? "Sign in to your account"
                      : "Join Earthly Trinkets"}
                  </p>
                </div>
              </div>
              <button onClick={handleClose} className="rounded-full p-2 text-muted-foreground hover:bg-secondary">
                <X size={18} />
              </button>
            </div>

            {/* Google + method toggle — hidden during phone OTP step or forgot password */}
            {!forgotPassword && !isPhoneOtpStep && (
              <>
                <button
                  onClick={handleGoogleSignIn} disabled={loading}
                  className="mt-6 flex w-full items-center justify-center gap-3 rounded-xl border border-border bg-card py-3 font-body text-sm font-medium text-foreground transition-colors hover:bg-secondary disabled:opacity-50"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Continue with Google
                </button>

                <div className="my-5 flex items-center gap-3">
                  <div className="h-px flex-1 bg-border" />
                  <span className="font-body text-xs text-muted-foreground">or continue with</span>
                  <div className="h-px flex-1 bg-border" />
                </div>

                <div className="flex rounded-xl bg-secondary p-1">
                  <button
                    onClick={() => setMethod("email")}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 font-body text-xs font-medium transition-colors ${method === "email" ? "bg-card text-foreground shadow-soft" : "text-muted-foreground"}`}
                  >
                    <Mail size={13} /> Email
                  </button>
                  <div className="my-1 w-px bg-border" />
                  <button
                    disabled
                    className="flex flex-1 cursor-not-allowed items-center justify-center gap-2 rounded-lg py-2 font-body text-xs font-medium text-muted-foreground/40"
                  >
                    <Phone size={13} /> Mobile <span className="text-[9px]">(coming soon)</span>
                  </button>
                </div>
              </>
            )}

            {/* ── Email form ── */}
            {method === "email" && (
              <form
                onSubmit={forgotPassword ? handleForgotPassword : handleEmailAuth}
                className="mt-5 space-y-4"
              >
                {tab === "signup" && !forgotPassword && (
                  <div>
                    <label className="font-body text-xs font-medium text-foreground">Full Name</label>
                    <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)}
                      placeholder="Your name"
                      className="mt-1 w-full rounded-lg border border-border bg-background px-4 py-3 font-body text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring" />
                  </div>
                )}

                <div>
                  <label className="font-body text-xs font-medium text-foreground">Email</label>
                  <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="mt-1 w-full rounded-lg border border-border bg-background px-4 py-3 font-body text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring" />
                </div>

                {!forgotPassword && (
                  <div>
                    <label className="font-body text-xs font-medium text-foreground">Password</label>
                    <div className="relative mt-1">
                      <input type={showPassword ? "text" : "password"} required minLength={6}
                        value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
                        className="w-full rounded-lg border border-border bg-background px-4 py-3 pr-10 font-body text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                )}

                {tab === "signin" && !forgotPassword && (
                  <button type="button" onClick={() => setForgotPassword(true)}
                    className="font-body text-xs text-primary hover:underline">
                    Forgot password?
                  </button>
                )}

                <button type="submit" disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 font-body text-sm font-semibold text-primary-foreground transition-all hover:shadow-glow disabled:opacity-50">
                  {loading && <Loader2 size={16} className="animate-spin" />}
                  {forgotPassword ? "Send Reset Link" : tab === "signin" ? "Sign In" : "Create Account"}
                </button>
              </form>
            )}

            {/* ── Phone form: step 1 ── */}
            {method === "phone" && phoneStep === "input" && (
              <form onSubmit={handleSendOtp} className="mt-5 space-y-4">
                {tab === "signup" && (
                  <div>
                    <label className="font-body text-xs font-medium text-foreground">Full Name</label>
                    <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
                      placeholder="Your name"
                      className="mt-1 w-full rounded-lg border border-border bg-background px-4 py-3 font-body text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring" />
                  </div>
                )}
                <div>
                  <label className="font-body text-xs font-medium text-foreground">Mobile Number</label>
                  <input type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 9876543210"
                    className="mt-1 w-full rounded-lg border border-border bg-background px-4 py-3 font-body text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring" />
                  <p className="mt-1 font-body text-[10px] text-muted-foreground">Include country code, e.g. +91 for India</p>
                </div>
                <button type="submit" disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 font-body text-sm font-semibold text-primary-foreground transition-all hover:shadow-glow disabled:opacity-50">
                  {loading && <Loader2 size={16} className="animate-spin" />}
                  Send OTP
                </button>
              </form>
            )}

            {/* ── Phone form: step 2 (OTP) ── */}
            {method === "phone" && phoneStep === "otp" && (
              <form onSubmit={handleVerifyOtp} className="mt-8 space-y-6">
                <div>
                  <label className="font-body text-xs font-medium text-foreground">6-digit verification code</label>
                  <div className="mt-3 flex gap-2" onPaste={handleOtpPaste}>
                    {otp.map((digit, i) => (
                      <input key={i} ref={(el) => (otpRefs.current[i] = el)}
                        type="text" inputMode="numeric" maxLength={1} value={digit}
                        onChange={(e) => handleOtpChange(i, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(i, e)}
                        className="h-12 w-full rounded-lg border border-border bg-background text-center font-display text-lg font-semibold text-foreground outline-none focus:ring-2 focus:ring-ring" />
                    ))}
                  </div>
                </div>
                <button type="submit" disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 font-body text-sm font-semibold text-primary-foreground transition-all hover:shadow-glow disabled:opacity-50">
                  {loading && <Loader2 size={16} className="animate-spin" />}
                  Verify & Sign In
                </button>
                <p className="text-center font-body text-xs text-muted-foreground">
                  Didn't receive a code?{" "}
                  <button type="button" onClick={(e) => handleSendOtp(e as never)}
                    className="font-medium text-primary hover:underline">
                    Resend
                  </button>
                </p>
              </form>
            )}

            {/* Toggle sign in / sign up */}
            {!isPhoneOtpStep && (
              <p className="mt-6 text-center font-body text-xs text-muted-foreground">
                {forgotPassword ? (
                  <button onClick={() => setForgotPassword(false)} className="font-medium text-primary hover:underline">
                    Back to sign in
                  </button>
                ) : tab === "signin" ? (
                  <>Don't have an account?{" "}
                    <button onClick={() => { setTab("signup"); resetForm(); }} className="font-medium text-primary hover:underline">Sign up</button>
                  </>
                ) : (
                  <>Already have an account?{" "}
                    <button onClick={() => { setTab("signin"); resetForm(); }} className="font-medium text-primary hover:underline">Sign in</button>
                  </>
                )}
              </p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AuthModal;
