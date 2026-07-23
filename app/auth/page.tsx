"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import {
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Check,
  Gift,
  Zap,
  Globe2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

export default function AuthPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (user) router.push("/");
  }, [user, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    setBusy(true);
    try {
      if (mode === "signup") {
        const redirect = `${window.location.origin}/`;
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: redirect,
            data: { username: username || email.split("@")[0] },
          },
        });
        if (error) throw error;

        if (data?.session) {
          router.push("/");
        } else {
          setMsg(
            "Account created successfully! Please check your inbox to confirm your email, then sign in.",
          );
          setMode("signin");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push("/");
      }
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Authentication failed");
    } finally {
      setBusy(false);
    }
  }

  function fillDemo() {
    setEmail("demo@norocjetx.com");
    setPassword("demo123456");
    if (mode === "signup") setUsername("JetPlayer1");
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-background relative overflow-hidden">
      {/* Dynamic Animated Background Glows */}
      <div className="absolute inset-0 pointer-events-none -z-10 overflow-hidden">
        <div
          className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[600px] rounded-full blur-[140px] opacity-35"
          style={{
            background:
              "radial-gradient(ellipse at center, oklch(0.75 0.15 85), oklch(0.6 0.2 30), transparent 70%)",
          }}
        />
        <div
          className="absolute -bottom-40 right-10 w-[600px] h-[500px] rounded-full blur-[120px] opacity-25"
          style={{
            background:
              "radial-gradient(ellipse at center, oklch(0.55 0.18 145), transparent 70%)",
          }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff08_1px,transparent_1px)] [background-size:24px_24px] opacity-40" />
      </div>

      <div className="w-full max-w-5xl grid lg:grid-cols-12 gap-8 items-center">
        {/* Left Side: Brand Showcase & Features (Desktop Only) */}
        <div className="hidden lg:flex lg:col-span-6 flex-col justify-between space-y-8 pr-4">
          <div className="space-y-4">
            <Link href="/" className="inline-flex items-center gap-3 group">
              <img
                src="/logo.png"
                alt="Noroc Bet Logo"
                className="h-20 w-auto object-contain drop-shadow-[0_0_25px_rgba(255,215,0,0.3)] transition-transform group-hover:scale-105"
              />
            </Link>

            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Sparkles className="w-3.5 h-3.5" /> Welcome Bonus Unlocked
              </span>
              <h1 className="font-display text-4xl xl:text-5xl font-extrabold tracking-tight text-foreground leading-[1.15]">
                Play Live Casino & <span className="bg-gradient-to-r from-[var(--gold)] via-amber-300 to-emerald-400 bg-clip-text text-transparent">Instant Crash</span> Games
              </h1>
              <p className="text-muted-foreground text-sm leading-relaxed max-w-md">
                Join thousands of active players. Experience provably fair mechanics, instant crypto & card deposits, and zero-fee cashouts.
              </p>
            </div>
          </div>

          {/* Bonus Highlight Card */}
          <div className="rounded-2xl glass-panel p-5 border border-primary/30 relative overflow-hidden bg-gradient-to-br from-primary/10 via-transparent to-accent/10">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-gradient-to-tr from-[var(--gold)] to-amber-500 text-background font-black shadow-lg shrink-0">
                <Gift className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <div className="text-xs font-extrabold text-[var(--gold)] uppercase tracking-wider">
                  New Player Package
                </div>
                <div className="font-display font-bold text-lg text-foreground">
                  +200% First Deposit Match
                </div>
                <div className="text-xs text-muted-foreground">
                  Plus 100 Free Spins on JetX Crash & Live Roulette
                </div>
              </div>
            </div>
          </div>

          {/* Trust Badges */}
          <div className="grid grid-cols-3 gap-3 pt-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
              <Zap className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Instant Payouts</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
              <ShieldCheck className="w-4 h-4 text-sky-400 shrink-0" />
              <span>256-Bit SSL</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
              <Globe2 className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Provably Fair</span>
            </div>
          </div>
        </div>

        {/* Right Side: High-Conversion Auth Card */}
        <div className="w-full lg:col-span-6">
          <div className="rounded-3xl glass-panel p-6 sm:p-8 border border-border/60 shadow-2xl backdrop-blur-2xl relative">
            {/* Header logo for mobile */}
            <div className="flex lg:hidden justify-center mb-6">
              <Link href="/">
                <img
                  src="/logo.png"
                  alt="Noroc Bet Logo"
                  className="h-16 w-auto object-contain drop-shadow-md"
                />
              </Link>
            </div>

            <div className="text-center lg:text-left mb-6">
              <h2 className="font-display text-2xl font-extrabold tracking-tight">
                {mode === "signin" ? "Welcome back" : "Create an account"}
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                {mode === "signin"
                  ? "Enter your credentials to access your casino wallet"
                  : "Sign up in 10 seconds to claim your welcome bonus"}
              </p>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="flex p-1 rounded-2xl bg-secondary/60 border border-border/40 mb-6">
              <button
                type="button"
                onClick={() => {
                  setMode("signin");
                  setErr(null);
                  setMsg(null);
                }}
                className={`flex-1 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all duration-200 ${
                  mode === "signin"
                    ? "bg-primary text-primary-foreground shadow-lg"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("signup");
                  setErr(null);
                  setMsg(null);
                }}
                className={`flex-1 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all duration-200 ${
                  mode === "signup"
                    ? "bg-primary text-primary-foreground shadow-lg"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Register
              </button>
            </div>

            {/* Auth Form */}
            <form onSubmit={submit} className="space-y-4">
              {mode === "signup" && (
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground block mb-1.5">
                    Username
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="e.g. JetMaster"
                      className="w-full h-11 pl-10 pr-4 rounded-xl bg-secondary/40 border border-border outline-none focus:border-primary focus:ring-1 focus:ring-primary text-sm font-medium transition"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="text-[11px] font-semibold text-muted-foreground block mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    required
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full h-11 pl-10 pr-4 rounded-xl bg-secondary/40 border border-border outline-none focus:border-primary focus:ring-1 focus:ring-primary text-sm font-medium transition"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-semibold text-muted-foreground block">
                    Password
                  </label>
                  {mode === "signin" && (
                    <button
                      type="button"
                      onClick={() => setMsg("Please contact support to reset your password.")}
                      className="text-[11px] text-primary hover:underline font-semibold"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    required
                    type={showPassword ? "text" : "password"}
                    value={password}
                    minLength={6}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full h-11 pl-10 pr-11 rounded-xl bg-secondary/40 border border-border outline-none focus:border-primary focus:ring-1 focus:ring-primary text-sm font-medium transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Status Alert Banners */}
              {err && (
                <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{err}</span>
                </div>
              )}
              {msg && (
                <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{msg}</span>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={busy}
                className="w-full h-12 rounded-xl bg-gradient-to-r from-primary via-emerald-500 to-accent text-primary-foreground font-extrabold shadow-lg shadow-primary/25 hover:brightness-110 active:scale-[0.98] disabled:opacity-50 transition flex items-center justify-center gap-2 text-sm mt-2"
              >
                {busy ? (
                  <span>Please wait…</span>
                ) : (
                  <>
                    <span>{mode === "signin" ? "Sign In to Play" : "Create Free Account"}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Quick Demo Helper Button */}
            <div className="mt-4 pt-4 border-t border-border/40 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Testing out?</span>
              <button
                type="button"
                onClick={fillDemo}
                className="text-xs font-semibold text-[var(--gold)] hover:underline flex items-center gap-1"
              >
                <Sparkles className="w-3.5 h-3.5" /> Fill Demo Credentials
              </button>
            </div>

            <p className="mt-4 text-[10px] text-muted-foreground text-center leading-relaxed">
              By registering or signing in, you confirm you are 18+ and agree to our{" "}
              <Link href="/terms" className="underline hover:text-foreground">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="underline hover:text-foreground">
                Privacy Policy
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
