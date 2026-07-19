import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";

export type Wallet = {
  user_id: string;
  balance: number;
  bonus_balance: number;
  currency: string;
  total_deposited: number;
  total_withdrawn: number;
};

export type Transaction = {
  id: string;
  user_id: string;
  type: string;
  status: string;
  amount: number;
  currency: string;
  meta: Record<string, unknown>;
  reference: string | null;
  created_at: string;
};

export function useWallet() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["wallet", user?.id],
    enabled: !!user,
    refetchInterval: 3000,
    queryFn: async (): Promise<Wallet | null> => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("wallets")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data as Wallet | null;
    },
  });

  return q;
}

export function useTransactions(limit = 25) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["transactions", user?.id, limit],
    enabled: !!user,
    refetchInterval: 5000,
    queryFn: async (): Promise<Transaction[]> => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as Transaction[];
    },
  });
}

export function useDepositRequests() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["deposit_requests", user?.id],
    enabled: !!user,
    refetchInterval: 5000,
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("deposit_requests")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateDeposit() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { method: string; amount: number; currency?: string }) => {
      if (!user) throw new Error("Not signed in");
      const { data, error } = await supabase
        .from("deposit_requests")
        .insert({
          user_id: user.id,
          method: vars.method as never,
          amount: vars.amount,
          currency: vars.currency ?? "EUR",
          status: "pending",
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deposit_requests"] });
    },
  });
}
