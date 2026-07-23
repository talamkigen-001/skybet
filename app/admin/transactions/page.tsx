"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-400",
  processing: "bg-sky-500/15 text-sky-400",
  completed: "bg-emerald-500/15 text-emerald-400",
  failed: "bg-red-500/15 text-red-400",
  rejected: "bg-red-500/15 text-red-400",
};

export default function AdminTransactions() {
  const [type, setType] = useState<string>("all");
  const { data: rows } = useQuery({
    queryKey: ["admin-tx", type],
    queryFn: async () => {
      let q = supabase
        .from("transactions")
        .select("*, profiles!inner(email,username)")
        .order("created_at", { ascending: false })
        .limit(300);
      if (type !== "all") q = q.eq("type", type as never);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-2xl font-bold">Transactions</h1>
        <div className="ml-auto flex rounded-full bg-secondary/50 p-1 flex-wrap">
          {["all", "deposit", "withdrawal", "bet", "win", "bonus", "adjustment"].map((s) => (
            <button
              key={s}
              onClick={() => setType(s)}
              className={`px-3 py-1 text-xs rounded-full capitalize ${type === s ? "bg-primary text-primary-foreground font-semibold" : "text-muted-foreground"}`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl glass-panel overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-xs text-muted-foreground uppercase bg-secondary/40">
            <tr>
              <th className="text-left px-4 py-2">When</th>
              <th className="text-left px-4 py-2">User</th>
              <th className="text-left px-4 py-2">Type</th>
              <th className="text-left px-4 py-2">Status</th>
              <th className="text-right px-4 py-2">Amount</th>
            </tr>
          </thead>
          <tbody>
            {(rows ?? []).map((t: any) => (
              <tr key={t.id} className="border-t border-border/40">
                <td className="px-4 py-2 text-muted-foreground text-xs">
                  {new Date(t.created_at).toLocaleString()}
                </td>
                <td className="px-4 py-2">
                  <div className="font-semibold truncate max-w-[220px]">
                    {t.profiles?.username ?? "—"}
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate max-w-[220px]">
                    {t.profiles?.email}
                  </div>
                </td>
                <td className="px-4 py-2 capitalize">{t.type}</td>
                <td className="px-4 py-2">
                  <span
                    className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${STATUS_STYLE[t.status] ?? "bg-muted"}`}
                  >
                    {t.status}
                  </span>
                </td>
                <td
                  className={`px-4 py-2 text-right font-mono-tabular ${Number(t.amount) >= 0 ? "text-emerald-400" : "text-red-400"}`}
                >
                  {Number(t.amount) >= 0 ? "+" : ""}€{Number(t.amount).toFixed(2)}
                </td>
              </tr>
            ))}
            {(rows ?? []).length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  No transactions.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
