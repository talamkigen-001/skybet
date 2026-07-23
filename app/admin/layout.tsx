"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";

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
      <div className="min-h-screen grid place-items-center text-muted-foreground">Loading…</div>
    );
  if (!user) return null;
  if (!isAdmin) {
    return (
      <div className="min-h-screen grid place-items-center p-6">
        <div className="max-w-md text-center rounded-3xl glass-panel p-8">
          <h1 className="font-display text-2xl font-bold mb-2">Admin access required</h1>
          <p className="text-sm text-muted-foreground mb-4">
            Your account isn&apos;t an admin. To grant admin, run this in the SQL editor:
          </p>
          <pre className="text-[11px] bg-secondary/60 rounded-lg p-3 text-left overflow-auto">
            <code>{`INSERT INTO public.user_roles (user_id, role)\nVALUES ('${user.id}', 'admin')\nON CONFLICT DO NOTHING;`}</code>
          </pre>
          <Link href="/" className="inline-block mt-4 text-sm text-primary underline">
            Back home
          </Link>
        </div>
      </div>
    );
  }

  const navLinks = [
    { href: "/admin", label: "Overview" },
    { href: "/admin/users", label: "Users" },
    { href: "/admin/deposits", label: "Deposits" },
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
