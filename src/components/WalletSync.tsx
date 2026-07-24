"use client";

import { useEffect } from "react";
import { useWallet } from "@/hooks/use-wallet";
import { useGame } from "@/lib/game-store";
import { useLocale, convertMoney, CurrencyCode } from "@/lib/locale";

/**
 * An invisible component that continuously synchronizes the real
 * backend wallet balance (from Supabase) into the local game store.
 * Converts the wallet balance directly to the active viewing currency.
 */
export function WalletSync() {
  const { data: wallet } = useWallet();
  const setBalance = useGame((s) => s.setBalance);
  const activeCurrency = useLocale((s) => s.currency);

  useEffect(() => {
    if (wallet) {
      const rawBalance = Number(wallet.balance);
      const dbCurrency = (wallet.currency as CurrencyCode) || "USD";
      const convertedBalance = convertMoney(rawBalance, dbCurrency, activeCurrency);
      setBalance(convertedBalance);
    }
  }, [wallet, setBalance, activeCurrency]);

  return null;
}
