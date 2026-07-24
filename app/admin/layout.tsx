"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import {
  LayoutDashboard,
  Users,
  ArrowDownLeft,
  ArrowUpRight,
  History,
  ArrowLeft,
  LogOut,
  ShieldAlert,
} from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    if (!user) router.push("/auth");
  }, [user, loading, router]);

  if (loading)
    return (
      <div className="min-h-screen grid place-items-center text-muted-foreground bg-background">
        Loading Admin Dashboard…
      </div>
    );

  if (!user) {
    return (
      <div className="min-h-screen grid place-items-center p-6 bg-background relative overflow-hidden">
        <div className="w-full max-w-md rounded-3xl glass-panel p-8 border border-border/60 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/20 text-primary font-bold text-xl mb-1">
              🔐
            </div>
            <h1 className="font-display text-2xl font-extrabold">Admin Access Portal</h1>
            <p className="text-xs text-muted-foreground">
              Sign in with your System Administrator credentials to manage users, deposits, and payouts.
            </p>
          </div>

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const emailInput = (form.elements.namedItem("email") as HTMLInputElement).value;
              const passInput = (form.elements.namedItem("password") as HTMLInputElement).value;
              try {
                const { error } = await supabase.auth.signInWithPassword({
                  email: emailInput,
                  password: passInput,
                });
                if (error) {
                  // Auto-provision admin user if sign in fails on first attempt
                  await supabase.auth.signUp({
                    email: emailInput,
                    password: passInput,
                    options: { data: { username: "AdminTalam" } },
                  });
                }
                router.refresh();
              } catch {
                /* non-critical */
              }
            }}
            className="space-y-4"
          >
            <div>
              <label className="text-[11px] font-bold text-muted-foreground block mb-1">
                Admin Email
              </label>
              <input
                name="email"
                type="email"
                defaultValue="talam.kigen@gmail.com"
                required
                className="w-full h-11 px-4 rounded-xl bg-secondary/50 border border-border text-sm font-semibold outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-muted-foreground block mb-1">
                Admin Password
              </label>
              <input
                name="password"
                type="password"
                defaultValue="M@lakwen@mypass123"
                required
                className="w-full h-11 px-4 rounded-xl bg-secondary/50 border border-border text-sm font-semibold outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <button
              type="submit"
              className="w-full h-12 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-extrabold shadow-lg hover:brightness-110 transition text-sm"
            >
              Sign In to Admin Dashboard →
            </button>
          </form>

          <div className="pt-4 border-t border-border/40 text-center text-xs text-muted-foreground">
            Noroc Bet Casino · System Administration
          </div>
        </div>
      </div>
    );
  }

  const navLinks = [
    { href: "/admin", label: "Overview", icon: LayoutDashboard },
    { href: "/admin/users", label: "Users", icon: Users },
    { href: "/admin/deposits", label: "Deposits", icon: ArrowDownLeft },
    { href: "/admin/withdrawals", label: "Withdrawals", icon: ArrowUpRight },
    { href: "/admin/transactions", label: "Transactions", icon: History },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Left Sidebar Navigation */}
      <aside className="w-full md:w-64 shrink-0 bg-card border-r border-border flex flex-col justify-between p-4 md:sticky md:top-0 md:h-screen">
        <div className="space-y-6">
          {/* Logo & Header */}
          <div className="px-2 py-2 flex items-center justify-between border-b border-border/60 pb-4">
            <Link href="/" className="font-display font-extrabold text-lg tracking-tight">
              NOROC <span className="text-[var(--gold)]">JETX</span>
            </Link>
            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30 flex items-center gap-1">
              <ShieldAlert className="w-2.5 h-2.5" /> Admin
            </span>
          </div>

          {/* Links list */}
          <nav className="space-y-1">
            {navLinks.map((l) => {
              const Icon = l.icon;
              const isActive =
                l.href === "/admin" ? pathname === "/admin" : pathname.startsWith(l.href);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition ${
                    isActive
                      ? "bg-primary/15 text-primary border-l-2 border-primary"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{l.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer Actions */}
        <div className="space-y-2 pt-4 border-t border-border/60 mt-6">
          <div className="px-3 py-2 rounded-xl bg-secondary/40 border border-border/40 text-[11px] font-mono text-muted-foreground truncate leading-relaxed">
            Logged in as:<br />
            <span className="text-foreground font-bold font-sans">{user.email}</span>
          </div>
          <Link
            href="/"
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-secondary transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Casino</span>
          </Link>
          <button
            onClick={() => signOut()}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-500/10 transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header bar */}
        <header className="h-14 border-b border-border/60 bg-card/45 backdrop-blur-md sticky top-0 z-20 px-6 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <span>Admin Control Panel</span>
            <span>/</span>
            <span className="text-foreground capitalize font-bold">
              {pathname === "/admin" ? "Overview" : pathname.split("/").pop()}
            </span>
          </div>
          <div className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full flex items-center gap-1">
            🟢 System Active
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 p-6 overflow-y-auto max-w-[1600px] w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
