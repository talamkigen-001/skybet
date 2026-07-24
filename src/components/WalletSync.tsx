"use client";

import { useEffect } from "react";
import { useWallet } from "@/hooks/use-wallet";
import { useGame } from "@/lib/game-store";
import { useLocale, convertMoney, CurrencyCode } from "@/lib/locale";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

/**
 * An invisible component that continuously synchronizes the real
 * backend wallet balance (from Supabase) into the local game store.
 * Subscribes to Postgres Realtime changes on wallets table for instantaneous updates.
 */
export function WalletSync() {
  const { user } = useAuth();
  const { data: wallet } = useWallet();
  const setBalance = useGame((s) => s.setBalance);
  const activeCurrency = useLocale((s) => s.currency);

  // Sync balance from query
  useEffect(() => {
    if (wallet) {
      const rawBalance = Number(wallet.balance);
      const dbCurrency = (wallet.currency as CurrencyCode) || "USD";
      const convertedBalance = convertMoney(rawBalance, dbCurrency, activeCurrency);
      setBalance(convertedBalance);
    }
  }, [wallet, setBalance, activeCurrency]);

  // Real-time Postgres subscription to wallets table
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`realtime-wallet-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "wallets",
          filter: `user_id=eq.${user.id}`,
        },
        (payload: any) => {
          if (payload.new && typeof payload.new.balance !== "undefined") {
            const rawBal = Number(payload.new.balance);
            const dbCurr = (payload.new.currency as CurrencyCode) || "USD";
            const converted = convertMoney(rawBal, dbCurr, useLocale.getState().currency);
            useGame.getState().setBalance(converted);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return null;
}
