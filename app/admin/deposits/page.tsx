"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-400",
  processing: "bg-sky-500/15 text-sky-400",
  completed: "bg-emerald-500/15 text-emerald-400",
  failed: "bg-red-500/15 text-red-400",
  rejected: "bg-red-500/15 text-red-400",
};

export default function AdminDeposits() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<string>("pending");

  const { data: rows } = useQuery({
    queryKey: ["admin-deposits", filter],
    queryFn: async () => {
      let q = supabase
        .from("deposit_requests")
        .select("*, profiles!inner(email,username)")
        .order("created_at", { ascending: false })
        .limit(200);
      if (filter !== "all") q = q.eq("status", filter as never);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const review = useMutation({
    mutationFn: async (p: { id: string; approve: boolean; note?: string }) => {
      const { data: dep, error } = await supabase
        .from("deposit_requests")
        .select("*")
        .eq("id", p.id)
        .single();
      if (error) throw error;
      const next = p.approve ? "completed" : "rejected";

      await supabase
        .from("deposit_requests")
        .update({
          status: next as never,
          reviewed_by: user?.id ?? null,
          reviewed_at: new Date().toISOString(),
          admin_note: p.note ?? null,
        })
        .eq("id", p.id);

      if (p.approve) {
        const { data: w } = await supabase
          .from("wallets")
          .select("balance,total_deposited")
          .eq("user_id", dep.user_id)
          .maybeSingle();
        await supabase
          .from("wallets")
          .update({
            balance: Number(w?.balance ?? 0) + Number(dep.amount),
            total_deposited: Number(w?.total_deposited ?? 0) + Number(dep.amount),
          })
          .eq("user_id", dep.user_id);
        await supabase.from("transactions").insert({
          user_id: dep.user_id,
          type: "deposit",
          status: "completed",
          amount: dep.amount,
          currency: dep.currency,
          reference: dep.id,
          meta: { method: dep.method, approved_by: user?.id },
        });
      } else {
        await supabase.from("transactions").insert({
          user_id: dep.user_id,
          type: "deposit",
          status: "rejected",
          amount: dep.amount,
          currency: dep.currency,
          reference: dep.id,
          meta: { method: dep.method, rejected_by: user?.id, note: p.note },
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-deposits"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-2xl font-bold">Deposits</h1>
        <div className="ml-auto flex rounded-full bg-secondary/50 p-1">
          {["pending", "completed", "rejected", "all"].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1 text-xs rounded-full capitalize ${filter === s ? "bg-primary text-primary-foreground font-semibold" : "text-muted-foreground"}`}
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
              <th className="text-left px-4 py-2">Method</th>
              <th className="text-right px-4 py-2">Amount</th>
              <th className="text-left px-4 py-2">Status</th>
              <th className="px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(rows ?? []).map((d: any) => (
              <tr key={d.id} className="border-t border-border/40 hover:bg-secondary/20">
                <td className="px-4 py-2 text-muted-foreground text-xs">
                  {new Date(d.created_at).toLocaleString()}
                </td>
                <td className="px-4 py-2">
                  <div className="font-semibold truncate max-w-[220px]">
                    {d.profiles?.username ?? "—"}
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate max-w-[220px]">
                    {d.profiles?.email}
                  </div>
                </td>
                <td className="px-4 py-2 uppercase text-xs">{d.method}</td>
                <td className="px-4 py-2 text-right font-mono-tabular font-bold">
                  €{Number(d.amount).toFixed(2)}
                </td>
                <td className="px-4 py-2">
                  <span
                    className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${STATUS_STYLE[d.status] ?? "bg-muted"}`}
                  >
                    {d.status}
                  </span>
                </td>
                <td className="px-4 py-2">
                  {d.status === "pending" ? (
                    <div className="flex gap-1.5 justify-end">
                      <button
                        onClick={() => review.mutate({ id: d.id, approve: true })}
                        className="text-xs px-3 py-1 rounded-md bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => {
                          const note = prompt("Reason for rejection?") ?? undefined;
                          review.mutate({ id: d.id, approve: false, note });
                        }}
                        className="text-xs px-3 py-1 rounded-md bg-red-500/15 text-red-400 hover:bg-red-500/25"
                      >
                        Reject
                      </button>
                    </div>
                  ) : (
                    <div className="text-right text-[11px] text-muted-foreground truncate">
                      {d.admin_note ?? "—"}
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {(rows ?? []).length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  No deposit requests.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
