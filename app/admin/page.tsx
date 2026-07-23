"use client";

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function AdminOverview() {
  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const [users, deps, depsToday, withdraws, pendingDeps, txs] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase
          .from("transactions")
          .select("amount")
          .eq("type", "deposit")
          .eq("status", "completed"),
        supabase
          .from("transactions")
          .select("amount")
          .eq("type", "deposit")
          .eq("status", "completed")
          .gte("created_at", since),
        supabase
          .from("transactions")
          .select("amount")
          .eq("type", "withdrawal")
          .eq("status", "completed"),
        supabase
          .from("deposit_requests")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending"),
        supabase.from("transactions").select("amount,type").in("type", ["bet", "win"]),
      ]);
      const sum = (rows: { amount: number }[] | null) =>
        (rows ?? []).reduce((s, r) => s + Number(r.amount), 0);
      const bets = sum((txs.data ?? []).filter((t) => t.type === "bet"));
      const wins = sum((txs.data ?? []).filter((t) => t.type === "win"));
      const ggr = -bets - wins;
      return {
        userCount: users.count ?? 0,
        totalDeposits: sum(deps.data as never),
        depositsToday: sum(depsToday.data as never),
        totalWithdrawals: sum(withdraws.data as never),
        pendingDeposits: pendingDeps.count ?? 0,
        ggr,
      };
    },
  });

  const cards = [
    { label: "Users", value: stats?.userCount ?? 0, fmt: (v: number) => v.toLocaleString() },
    {
      label: "Deposits today",
      value: stats?.depositsToday ?? 0,
      fmt: (v: number) => `€${v.toFixed(2)}`,
    },
    {
      label: "Total deposits",
      value: stats?.totalDeposits ?? 0,
      fmt: (v: number) => `€${v.toFixed(2)}`,
    },
    {
      label: "Total withdrawals",
      value: stats?.totalWithdrawals ?? 0,
      fmt: (v: number) => `€${v.toFixed(2)}`,
    },
    {
      label: "Pending deposits",
      value: stats?.pendingDeposits ?? 0,
      fmt: (v: number) => v.toLocaleString(),
    },
    { label: "GGR", value: stats?.ggr ?? 0, fmt: (v: number) => `€${v.toFixed(2)}` },
  ];

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold">Overview</h1>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl glass-panel p-4">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
              {c.label}
            </div>
            <div className="text-xl font-display font-extrabold mt-1 font-mono-tabular">
              {c.fmt(Number(c.value))}
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-2xl glass-panel p-6 text-sm text-muted-foreground">
        Use the tabs above to manage users, review pending deposits, and inspect every transaction.
        Live deposit & transaction tables refresh on every navigation.
      </div>
    </div>
  );
}
