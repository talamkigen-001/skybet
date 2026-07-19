import { useEffect } from "react";
import { useWallet } from "@/hooks/use-wallet";
import { useGame } from "@/lib/game-store";
import { useLocale } from "@/lib/locale";

/**
 * An invisible component that continuously synchronizes the real
 * backend wallet balance (from Supabase) into the local game store.
 * This guarantees that whenever the user deposits, wins, or loses,
 * the local game state exactly mirrors their real balance.
 */
export function WalletSync() {
  const { data: wallet } = useWallet();
  const setBalance = useGame((s) => s.setBalance);
  const store = useLocale();

  useEffect(() => {
    if (wallet) {
      setBalance(Number(wallet.balance));
      if (wallet.currency && wallet.currency !== store.currency) {
        store.setCurrency(wallet.currency as any);
      }
    }
  }, [wallet, setBalance, store]);

  return null;
}
