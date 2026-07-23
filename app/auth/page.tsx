"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export default function AuthPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
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

  return (
    <div className="min-h-screen grid place-items-center px-4 bg-background relative overflow-hidden">
      <div
        className="absolute inset-0 -z-10 opacity-50"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 0%, hsl(var(--primary)/0.25), transparent 60%), radial-gradient(40% 40% at 100% 100%, hsl(var(--accent)/0.2), transparent 60%)",
        }}
      />
      <div className="w-full max-w-md rounded-3xl glass-panel p-8">
        <Link href="/" className="flex items-center gap-2 justify-center font-display font-extrabold mb-6">
          <span className="inline-grid place-items-center w-10 h-10 rounded-lg bg-gradient-to-br from-[var(--gold)] via-accent to-primary text-background font-black">
            N
          </span>
          <span className="leading-none">
            <span className="block tracking-wide">NOROC</span>
            <span className="block text-[10px] font-bold text-[var(--gold)] tracking-[0.3em]">
              JETX
            </span>
          </span>
        </Link>

        <div className="flex rounded-full bg-secondary/60 p-1 mb-5">
          {(["signin", "signup"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMode(m);
                setErr(null);
                setMsg(null);
              }}
              className={`flex-1 py-2 text-sm rounded-full font-semibold transition ${
                mode === m
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {m === "signin" ? "Sign in" : "Register"}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="space-y-3">
          {mode === "signup" && (
            <input
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              className="w-full h-11 px-4 rounded-xl bg-secondary/50 border border-border outline-none focus:ring-1 focus:ring-primary text-sm"
            />
          )}
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full h-11 px-4 rounded-xl bg-secondary/50 border border-border outline-none focus:ring-1 focus:ring-primary text-sm"
          />
          <input
            required
            type="password"
            value={password}
            minLength={6}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password (min 6)"
            className="w-full h-11 px-4 rounded-xl bg-secondary/50 border border-border outline-none focus:ring-1 focus:ring-primary text-sm"
          />
          {err && <div className="text-sm text-red-400 bg-red-500/10 rounded-lg p-2">{err}</div>}
          {msg && (
            <div className="text-sm text-emerald-400 bg-emerald-500/10 rounded-lg p-2">{msg}</div>
          )}
          <button
            type="submit"
            disabled={busy}
            className="w-full h-11 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-bold disabled:opacity-50 transition hover:brightness-110 active:scale-[0.98]"
          >
            {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>

        <p className="mt-4 text-[11px] text-muted-foreground text-center">
          By continuing you agree to our Terms & Privacy Policy. 18+ only.
        </p>
      </div>
    </div>
  );
}
