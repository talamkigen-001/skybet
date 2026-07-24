"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, isAdmin } = useAuth();
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
    { href: "/admin", label: "Overview" },
    { href: "/admin/users", label: "Users" },
    { href: "/admin/deposits", label: "Deposits" },
    { href: "/admin/withdrawals", label: "Withdrawals" },
    { href: "/admin/transactions", label: "Transactions" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="max-w-[1600px] mx-auto px-4 h-14 flex items-center gap-4">
          <Link href="/" className="font-display font-extrabold">
            NOROC <span className="text-[var(--gold)]">JETX</span>
          </Link>
          <span className="text-muted-foreground">/</span>
          <span className="font-semibold">Admin</span>
          <nav className="flex items-center gap-1 ml-4">
            {navLinks.map((l) => {
              const isActive =
                l.href === "/admin" ? pathname === "/admin" : pathname.startsWith(l.href);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={
                    isActive
                      ? "px-3 py-1.5 rounded-lg text-sm bg-primary/15 text-primary font-semibold"
                      : "px-3 py-1.5 rounded-lg text-sm hover:bg-secondary"
                  }
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>
          <div className="ml-auto text-xs text-muted-foreground">{user.email}</div>
        </div>
      </header>
      <main className="max-w-[1600px] mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
