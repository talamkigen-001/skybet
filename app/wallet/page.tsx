"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CasinoLayout } from "@/components/casino/CasinoLayout";
import { useAuth } from "@/hooks/use-auth";
import {
  useWallet,
  useTransactions,
  useDepositRequests,
  useCreateDeposit,
  useCreateWithdrawal,
} from "@/hooks/use-wallet";
import { formatMoney, convertMoney, useLocale, CurrencyCode } from "@/lib/locale";
import { useTranslation } from "@/lib/i18n";
import { useGame } from "@/lib/game-store";
import {
  CreditCard,
  Coins,
  Send,
  Copy,
  Check,
  Mail,
  ArrowRight,
  ShieldCheck,
  Headphones,
  ArrowDownLeft,
  ArrowUpRight,
  AlertTriangle,
  Building2,
  QrCode,
  Lock,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

const CRYPTO_METHODS = [
  { id: "binance_pay", label: "Binance Pay", icon: "🟡", kind: "crypto" },
  { id: "btc", label: "Bitcoin (BTC)", icon: "₿", kind: "crypto" },
  { id: "eth", label: "Ethereum (ETH)", icon: "Ξ", kind: "crypto" },
  { id: "usdt_trc20", label: "USDT (TRC20)", icon: "₮", kind: "crypto" },
  { id: "usdt_erc20", label: "USDT (ERC20)", icon: "₮", kind: "crypto" },
  { id: "bnb", label: "BNB (BEP20)", icon: "◆", kind: "crypto" },
  { id: "ltc", label: "Litecoin (LTC)", icon: "Ł", kind: "crypto" },
] as const;

const CRYPTO_INFO: Record<string, { address: string; network: string; note: string }> = {
  binance_pay: {
    address: "948271034",
    network: "Binance Pay Merchant ID",
    note: "Open your Binance App -> Pay -> Send -> Binance ID. Enter exact deposit amount.",
  },
  btc: {
    address: "bc1qxy2kg3ut5xgz35jdf6nr85c8sw7w2x348q72xt",
    network: "Bitcoin Mainnet (BTC)",
    note: "Send only Bitcoin (BTC) to this address.",
  },
  eth: {
    address: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
    network: "Ethereum Mainnet (ERC20)",
    note: "Send only Ethereum (ETH) to this address.",
  },
  usdt_trc20: {
    address: "TXsZ9A2sHjG6Z3fD4gH2j9K3L4m5n6P7qR",
    network: "TRON (TRC20)",
    note: "Send only USDT TRC20 to this address.",
  },
  usdt_erc20: {
    address: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
    network: "Ethereum (ERC20)",
    note: "Send only USDT ERC20 to this address.",
  },
  bnb: {
    address: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
    network: "BNB Smart Chain (BEP20)",
    note: "Send only BNB BEP20 to this address.",
  },
  ltc: {
    address: "Lbz1y8D3Xz7fD5gH6j2K3L4m5n6P7qRstS",
    network: "Litecoin Mainnet (LTC)",
    note: "Send only Litecoin (LTC) to this address.",
  },
};

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-400 border border-amber-500/30",
  processing: "bg-sky-500/15 text-sky-400 border border-sky-500/30",
  completed: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
  failed: "bg-red-500/15 text-red-400 border border-red-500/30",
  rejected: "bg-red-500/15 text-red-400 border border-red-500/30",
  cancelled: "bg-muted text-muted-foreground",
};

export default function WalletPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { currency } = useLocale();
  const { t } = useTranslation();
  const { data: wallet } = useWallet();
  const { data: txs } = useTransactions(20);
  const { data: deposits } = useDepositRequests();

  const createDeposit = useCreateDeposit();
  const createWithdrawal = useCreateWithdrawal();

  const [tab, setTab] = useState<"deposit" | "withdraw">("deposit");

  // Deposit State
  const [depositCategory, setDepositCategory] = useState<"admin_contact" | "crypto">("admin_contact");
  const [cryptoMethod, setCryptoMethod] = useState<string>("btc");

  // Minimum deposit requirement = $200 USD equivalent in active currency
  const minDepositInActiveCurrency = convertMoney(200, "USD", currency);
  const [depositAmount, setDepositAmount] = useState<number>(minDepositInActiveCurrency);

  const [cryptoSubmitted, setCryptoSubmitted] = useState<{ id: string; method: string } | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  // Deposit Admin Contact Form State
  const [contactMethod, setContactMethod] = useState<string>("Bank Transfer");
  const [contactMessage, setContactMessage] = useState<string>("");
  const [contactSubmitted, setContactSubmitted] = useState<boolean>(false);

  // Withdrawal State
  const minWithdrawInActiveCurrency = convertMoney(50, "USD", currency);
  const [withdrawMethod, setWithdrawMethod] = useState<"bank" | "crypto" | "card" | "revolut">("bank");
  const [withdrawAmount, setWithdrawAmount] = useState<number>(minWithdrawInActiveCurrency);
  const [withdrawDetails, setWithdrawDetails] = useState<string>("");
  const [withdrawBusy, setWithdrawBusy] = useState<boolean>(false);

  useEffect(() => {
    if (!loading && !user) router.push("/auth");
  }, [user, loading, router]);

  // Adjust default minimum deposit amount when currency changes
  useEffect(() => {
    setDepositAmount(minDepositInActiveCurrency);
    setWithdrawAmount(minWithdrawInActiveCurrency);
  }, [currency]);

  // Handle Crypto Deposit submission
  async function submitCryptoDeposit() {
    if (depositAmount < minDepositInActiveCurrency) {
      toast.error(
        `Minimum deposit amount is $200 USD (${formatMoney(minDepositInActiveCurrency, currency)})`,
      );
      return;
    }
    try {
      const res = await createDeposit.mutateAsync({
        method: cryptoMethod,
        amount: depositAmount,
        currency,
      });
      setCryptoSubmitted({ id: res.id, method: cryptoMethod });
      toast.success("Deposit request generated successfully!");
    } catch (e: any) {
      toast.error(e.message || "Failed to create deposit request");
    }
  }

  // Handle Admin Contact Inquiry submit
  const handleAdminContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (depositAmount < minDepositInActiveCurrency) {
      toast.error(
        `Minimum deposit amount is $200 USD (${formatMoney(minDepositInActiveCurrency, currency)})`,
      );
      return;
    }
    setContactSubmitted(true);
    toast.success("Deposit request sent to Billing Admin!");
  };

  // Handle Withdrawal submission
  async function submitWithdrawal(e: React.FormEvent) {
    e.preventDefault();
    const currentBalance = wallet?.balance ?? useGame.getState().balance;

    if (withdrawAmount < minWithdrawInActiveCurrency) {
      toast.error(
        `Minimum withdrawal amount is $50 USD (${formatMoney(minWithdrawInActiveCurrency, currency)})`,
      );
      return;
    }

    if (withdrawAmount > currentBalance) {
      toast.error("Insufficient balance for this withdrawal amount");
      return;
    }

    if (!withdrawDetails.trim()) {
      toast.error("Please enter recipient account or wallet details");
      return;
    }

    setWithdrawBusy(true);
    try {
      await createWithdrawal.mutateAsync({
        method: withdrawMethod,
        amount: withdrawAmount,
        currency,
        details: withdrawDetails,
      });

      // Deduct balance locally for instant feedback
      const newBal = Number((currentBalance - withdrawAmount).toFixed(2));
      useGame.getState().setBalance(newBal);

      toast.success("Withdrawal request submitted successfully!");
      setWithdrawDetails("");
    } catch (e: any) {
      toast.error(e.message || "Failed to process withdrawal");
    } finally {
      setWithdrawBusy(false);
    }
  }

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  if (!user) return null;

  return (
    <CasinoLayout>
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        
        {/* Top Wallet Overview Banner */}
        <div className="grid md:grid-cols-3 gap-4">
          <div className="md:col-span-2 rounded-3xl p-6 glass-panel border border-border/60 bg-gradient-to-br from-primary/10 via-transparent to-accent/10">
            <div className="text-xs text-muted-foreground uppercase font-extrabold tracking-wider">
              Available Wallet Balance
            </div>
            <div className="text-4xl font-display font-extrabold text-[var(--gold)] mt-1 font-mono-tabular">
              {formatMoney(wallet?.balance ?? useGame.getState().balance, currency)}
            </div>
            <div className="mt-2 text-xs text-muted-foreground flex flex-wrap gap-4">
              <span>Bonus: <strong className="text-foreground">{formatMoney(wallet?.bonus_balance ?? 0, currency)}</strong></span>
              <span>Total Deposited: <strong className="text-emerald-400">{formatMoney(wallet?.total_deposited ?? 0, currency)}</strong></span>
            </div>
          </div>

          <div className="rounded-3xl p-6 glass-panel border border-border/60 flex flex-col justify-between">
            <div>
              <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Account Details</div>
              <div className="mt-1 font-bold text-sm truncate text-foreground">{user.email}</div>
              <div className="text-[10px] text-muted-foreground font-mono truncate mt-1">ID: {user.id}</div>
            </div>
            <div className="mt-3 pt-3 border-t border-border/40 flex items-center justify-between text-xs text-emerald-400 font-semibold">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-4 h-4" /> Account Verified
              </span>
              <span className="text-muted-foreground font-mono">{currency}</span>
            </div>
          </div>
        </div>

        {/* Primary Tab Switcher: Deposit vs Withdrawal */}
        <div className="flex p-1.5 rounded-2xl bg-secondary/50 border border-border/60">
          <button
            type="button"
            onClick={() => setTab("deposit")}
            className={`flex-1 py-3 text-sm font-extrabold rounded-xl transition flex items-center justify-center gap-2 ${
              tab === "deposit"
                ? "bg-primary text-primary-foreground shadow-lg"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
            <span>Deposit Funds</span>
          </button>
          <button
            type="button"
            onClick={() => setTab("withdraw")}
            className={`flex-1 py-3 text-sm font-extrabold rounded-xl transition flex items-center justify-center gap-2 ${
              tab === "withdraw"
                ? "bg-primary text-primary-foreground shadow-lg"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <ArrowUpRight className="w-4 h-4 text-amber-400" />
            <span>Withdraw Funds</span>
          </button>
        </div>

        {/* ── TAB 1: DEPOSIT ────────────────────────────────────────────────────────── */}
        {tab === "deposit" && (
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="rounded-3xl p-6 glass-panel border border-border/60 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display text-xl font-extrabold">Deposit Funds</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Instant credit to your casino wallet</p>
                </div>
                <div className="px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full text-amber-400 text-xs font-bold flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Min: $200 USD</span>
                </div>
              </div>

              {/* Deposit Method Category Switcher */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-secondary/40 rounded-2xl border border-border/40">
                <button
                  type="button"
                  onClick={() => setDepositCategory("admin_contact")}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                    depositCategory === "admin_contact"
                      ? "bg-primary text-primary-foreground shadow"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Building2 className="w-4 h-4" />
                  <span>Bank / Card / Revolut</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDepositCategory("crypto")}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                    depositCategory === "crypto"
                      ? "bg-primary text-primary-foreground shadow"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Coins className="w-4 h-4" />
                  <span>Crypto (BTC/USDT)</span>
                </button>
              </div>

              {/* Deposit Amount Selector with $200 USD minimum enforcement */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-muted-foreground">Deposit Amount ({currency})</span>
                  <span className="text-[11px] text-amber-400 font-semibold">
                    Min: {formatMoney(minDepositInActiveCurrency, currency)} ($200 USD)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={minDepositInActiveCurrency}
                    step={10}
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(Number(e.target.value))}
                    className="flex-1 h-12 px-4 rounded-xl bg-secondary/50 border border-border text-lg font-bold outline-none focus:ring-1 focus:ring-primary font-mono-tabular"
                  />
                  <span className="text-muted-foreground font-mono font-bold px-3">{currency}</span>
                </div>
                {/* Preset quick buttons */}
                <div className="grid grid-cols-4 gap-2 pt-1">
                  {[200, 500, 1000, 2500].map((usdVal) => {
                    const localVal = convertMoney(usdVal, "USD", currency);
                    return (
                      <button
                        key={usdVal}
                        type="button"
                        onClick={() => setDepositAmount(localVal)}
                        className={`h-9 rounded-lg text-xs font-bold transition ${
                          depositAmount === localVal
                            ? "bg-primary/20 border border-primary text-foreground"
                            : "bg-secondary/50 hover:bg-secondary border border-transparent"
                        }`}
                      >
                        ${usdVal}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* CATEGORY A: Contact Admin for Bank Transfers / Card Payments / Revolut */}
              {depositCategory === "admin_contact" && (
                <div className="space-y-4 pt-2">
                  <div className="rounded-2xl bg-gradient-to-br from-amber-500/10 via-primary/10 to-transparent border border-amber-500/30 p-4 space-y-3">
                    <div className="flex items-center gap-2 font-bold text-sm text-[var(--gold)]">
                      <Headphones className="w-4 h-4" />
                      <span>Contact Admin for Bank, Card & Revolut Payments</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      For Card payments, Revolut, SEPA Bank Transfers, and Apple/Google Pay, contact our Billing Admin directly to receive payment links or bank details.
                    </p>

                    {/* Direct Contact Admin Buttons */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <a
                        href="https://t.me/NorocJetX_Support"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="h-11 px-3 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/30 text-xs font-extrabold flex items-center justify-center gap-2 transition"
                      >
                        <Send className="w-4 h-4" />
                        <span>Telegram Admin</span>
                      </a>
                      <a
                        href="mailto:support@norocjetx.com?subject=Deposit%20Inquiry"
                        className="h-11 px-3 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-xs font-extrabold flex items-center justify-center gap-2 transition"
                      >
                        <Mail className="w-4 h-4" />
                        <span>Email Support</span>
                      </a>
                    </div>
                  </div>

                  {/* Inquiry Form */}
                  {!contactSubmitted ? (
                    <form onSubmit={handleAdminContactSubmit} className="space-y-3 pt-2">
                      <div className="text-xs font-bold text-muted-foreground">Or Send Direct Billing Inquiry:</div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-muted-foreground block mb-1">Method</label>
                          <select
                            value={contactMethod}
                            onChange={(e) => setContactMethod(e.target.value)}
                            className="w-full h-10 px-3 rounded-xl bg-secondary/50 border border-border text-xs font-semibold outline-none"
                          >
                            <option value="Revolut">Revolut Transfer</option>
                            <option value="Card Payment">Card Payment (Visa/Mastercard)</option>
                            <option value="Bank Transfer">SEPA Bank Transfer</option>
                            <option value="Apple/Google Pay">Apple / Google Pay</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] text-muted-foreground block mb-1">Deposit Amount</label>
                          <div className="h-10 px-3 rounded-xl bg-secondary/50 border border-border text-xs font-bold flex items-center">
                            {formatMoney(depositAmount, currency)}
                          </div>
                        </div>
                      </div>
                      <textarea
                        placeholder="Additional details or payment handle..."
                        value={contactMessage}
                        onChange={(e) => setContactMessage(e.target.value)}
                        rows={2}
                        className="w-full p-3 rounded-xl bg-secondary/50 border border-border text-xs outline-none resize-none"
                      />
                      <button
                        type="submit"
                        disabled={depositAmount < minDepositInActiveCurrency}
                        className="w-full h-11 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-extrabold shadow-lg disabled:opacity-50 transition flex items-center justify-center gap-2 text-xs"
                      >
                        <Send className="w-4 h-4" />
                        <span>Send Deposit Request to Admin</span>
                      </button>
                    </form>
                  ) : (
                    <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 space-y-2">
                      <div className="font-bold text-emerald-400 text-sm flex items-center gap-1.5">
                        <Check className="w-4 h-4" /> Inquiry Sent to Billing Admin
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Your deposit inquiry for <strong>{formatMoney(depositAmount, currency)}</strong> via <strong>{contactMethod}</strong> has been transmitted. Our admin team will respond shortly.
                      </p>
                      <button
                        type="button"
                        onClick={() => setContactSubmitted(false)}
                        className="mt-2 text-xs font-bold text-primary hover:underline"
                      >
                        Send another request
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* CATEGORY B: Crypto Deposit */}
              {depositCategory === "crypto" && (
                <div className="space-y-4 pt-2">
                  {!cryptoSubmitted ? (
                    <>
                      <div className="text-xs font-bold text-muted-foreground mb-1">Select Cryptocurrency</div>
                      <div className="grid grid-cols-2 gap-2">
                        {CRYPTO_METHODS.map((m) => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => setCryptoMethod(m.id)}
                            className={`px-3 py-2.5 rounded-xl border text-xs flex items-center gap-2 text-left transition ${
                              cryptoMethod === m.id
                                ? "border-primary bg-primary/15 text-foreground font-bold"
                                : "border-border/60 bg-secondary/40 hover:bg-secondary text-muted-foreground"
                            }`}
                          >
                            <span className="text-base leading-none">{m.icon}</span>
                            <span className="truncate">{m.label.replace(/ \([^)]+\)/g, "")}</span>
                          </button>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={submitCryptoDeposit}
                        disabled={createDeposit.isPending || depositAmount < minDepositInActiveCurrency}
                        className="w-full h-11 mt-3 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-extrabold shadow-lg disabled:opacity-50 transition flex items-center justify-center gap-2 text-xs"
                      >
                        {createDeposit.isPending ? "Generating Wallet..." : "Generate Crypto Deposit Address"}
                      </button>
                    </>
                  ) : (
                    <div className="space-y-3 rounded-2xl border border-border bg-secondary/30 p-4">
                      <div className="text-xs font-mono font-bold text-muted-foreground">Ref: {cryptoSubmitted.id}</div>
                      {CRYPTO_INFO[cryptoSubmitted.method] && (
                        <div className="space-y-2">
                          <div className="text-xs font-bold text-foreground">{CRYPTO_INFO[cryptoSubmitted.method].network}</div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono bg-secondary border border-border/60 px-3 py-2 rounded-xl break-all flex-1 select-all">
                              {CRYPTO_INFO[cryptoSubmitted.method].address}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopy(CRYPTO_INFO[cryptoSubmitted.method].address)}
                              className="p-2 bg-primary/15 hover:bg-primary/25 text-primary rounded-xl transition"
                            >
                              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                            </button>
                          </div>
                          <p className="text-[11px] text-muted-foreground leading-relaxed">{CRYPTO_INFO[cryptoSubmitted.method].note}</p>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => setCryptoSubmitted(null)}
                        className="w-full h-9 rounded-xl bg-secondary text-xs font-bold hover:bg-muted"
                      >
                        New Deposit
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Deposit History */}
            <div className="rounded-3xl p-6 glass-panel border border-border/60 flex flex-col justify-between">
              <div>
                <h3 className="font-display text-lg font-bold mb-4">Recent Deposit Requests</h3>
                <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                  {(deposits ?? []).length === 0 && (
                    <div className="text-xs text-muted-foreground text-center py-8">No deposits registered yet.</div>
                  )}
                  {(deposits ?? []).map((d: any) => (
                    <div key={d.id} className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-secondary/40 border border-border/30">
                      <div className="min-w-0">
                        <div className="font-bold text-xs truncate">
                          {(d.method || "DEPOSIT").toUpperCase()} · {formatMoney(Number(d.amount), d.currency)}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {new Date(d.created_at).toLocaleString()}
                        </div>
                      </div>
                      <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full ${STATUS_STYLE[d.status] ?? "bg-muted"}`}>
                        {d.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="pt-4 border-t border-border/40 text-[11px] text-muted-foreground text-center">
                All deposits are processed securely with SSL encryption.
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 2: WITHDRAWAL ─────────────────────────────────────────────────────── */}
        {tab === "withdraw" && (
          <div className="grid lg:grid-cols-2 gap-6">
            <form onSubmit={submitWithdrawal} className="rounded-3xl p-6 glass-panel border border-border/60 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display text-xl font-extrabold">Withdraw Funds</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Request fast payout to your bank, crypto or card</p>
                </div>
                <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-xs font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Fast Payouts
                </div>
              </div>

              {/* Withdrawal Method Switcher */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: "bank", label: "Bank Transfer", icon: "🏛️" },
                  { id: "crypto", label: "Crypto", icon: "₿" },
                  { id: "card", label: "Card Payout", icon: "💳" },
                  { id: "revolut", label: "Revolut", icon: "⚡" },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setWithdrawMethod(m.id as any)}
                    className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center justify-center gap-1 text-center transition ${
                      withdrawMethod === m.id
                        ? "border-primary bg-primary/15 text-foreground shadow"
                        : "border-border/60 bg-secondary/40 hover:bg-secondary text-muted-foreground"
                    }`}
                  >
                    <span className="text-xl leading-none">{m.icon}</span>
                    <span className="truncate w-full">{m.label}</span>
                  </button>
                ))}
              </div>

              {/* Withdrawal Amount Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-muted-foreground">Withdrawal Amount ({currency})</span>
                  <span className="text-[11px] text-muted-foreground font-semibold">
                    Min: {formatMoney(minWithdrawInActiveCurrency, currency)} ($50 USD)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={minWithdrawInActiveCurrency}
                    max={wallet?.balance ?? useGame.getState().balance}
                    step={10}
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(Number(e.target.value))}
                    className="flex-1 h-12 px-4 rounded-xl bg-secondary/50 border border-border text-lg font-bold outline-none focus:ring-1 focus:ring-primary font-mono-tabular"
                  />
                  <span className="text-muted-foreground font-mono font-bold px-3">{currency}</span>
                </div>
              </div>

              {/* Recipient Details Inputs depending on selected method */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground block">
                  {withdrawMethod === "bank" && "Bank IBAN & Account Holder Name"}
                  {withdrawMethod === "crypto" && "Cryptocurrency Wallet Address & Network"}
                  {withdrawMethod === "card" && "16-Digit Card Number & Expiry"}
                  {withdrawMethod === "revolut" && "Revolut Tag / Registered Phone Number"}
                </label>
                <textarea
                  required
                  rows={3}
                  value={withdrawDetails}
                  onChange={(e) => setWithdrawDetails(e.target.value)}
                  placeholder={
                    withdrawMethod === "bank"
                      ? "e.g. IBAN: DE89 3704 0044 0532 0130 00, Name: John Doe, BIC: COBA..."
                      : withdrawMethod === "crypto"
                      ? "e.g. USDT (TRC20): TXsZ9A2sHjG6Z3fD4gH2j9K3L4m5n6P7qR"
                      : withdrawMethod === "card"
                      ? "e.g. Card: 4532 •••• •••• 8901, Expiry: 08/28, Name: John Doe"
                      : "e.g. @john_revolut or +44 7700 900077"
                  }
                  className="w-full p-3.5 rounded-2xl bg-secondary/50 border border-border text-xs outline-none focus:ring-1 focus:ring-primary resize-none font-mono"
                />
              </div>

              {/* Submit Withdrawal Button */}
              <button
                type="submit"
                disabled={
                  withdrawBusy ||
                  withdrawAmount < minWithdrawInActiveCurrency ||
                  withdrawAmount > (wallet?.balance ?? useGame.getState().balance)
                }
                className="w-full h-12 rounded-xl bg-gradient-to-r from-amber-500 via-primary to-emerald-500 text-primary-foreground font-extrabold shadow-lg hover:brightness-110 disabled:opacity-50 transition flex items-center justify-center gap-2 text-sm"
              >
                {withdrawBusy ? (
                  <span>Processing Payout Request…</span>
                ) : (
                  <>
                    <span>Submit Withdrawal of {formatMoney(withdrawAmount, currency)}</span>
                    <ArrowUpRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Withdrawal Rules & Info */}
            <div className="rounded-3xl p-6 glass-panel border border-border/60 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <h3 className="font-display text-lg font-bold">Withdrawal Policy & Speed</h3>
                <div className="space-y-3 text-xs text-muted-foreground leading-relaxed">
                  <div className="flex items-start gap-3 p-3 rounded-2xl bg-secondary/30 border border-border/40">
                    <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-foreground">Zero Withdrawal Fees</div>
                      <div>All withdrawals are processed with zero casino service fees.</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-2xl bg-secondary/30 border border-border/40">
                    <Coins className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-foreground">Fast Crypto & Revolut Payouts</div>
                      <div>Crypto & Revolut transfers are processed within 15–30 minutes after verification.</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-2xl bg-secondary/30 border border-border/40">
                    <Building2 className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-foreground">SEPA & Card Transfers</div>
                      <div>Bank SEPA transfers and Visa/Mastercard payouts complete within 1-2 business days.</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-gradient-to-br from-primary/15 via-accent/10 to-transparent border border-primary/30 text-xs flex items-center justify-between">
                <span className="font-bold text-foreground">Need help with your payout?</span>
                <a
                  href="https://t.me/NorocJetX_Support"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-primary text-primary-foreground font-bold hover:brightness-110 transition"
                >
                  Contact Support
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Global Transactions Audit Table */}
        <div className="rounded-3xl p-6 glass-panel border border-border/60">
          <h2 className="font-display text-xl font-bold mb-4">{t("wallet.transactions")}</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm">
              <thead className="text-[10px] sm:text-xs text-muted-foreground uppercase">
                <tr>
                  <th className="text-left py-2">{t("wallet.date")}</th>
                  <th className="text-left">{t("wallet.type")}</th>
                  <th className="text-left">{t("wallet.status")}</th>
                  <th className="text-right">{t("wallet.amount")}</th>
                </tr>
              </thead>
              <tbody>
                {(txs ?? []).map((tx) => (
                  <tr key={tx.id} className="border-t border-border/40 hover:bg-secondary/20 transition">
                    <td className="py-2.5 text-muted-foreground font-mono">
                      {new Date(tx.created_at).toLocaleString()}
                    </td>
                    <td className="capitalize font-semibold">{tx.type}</td>
                    <td>
                      <span className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${STATUS_STYLE[tx.status] ?? "bg-muted"}`}>
                        {tx.status}
                      </span>
                    </td>
                    <td className={`text-right font-mono-tabular font-bold ${Number(tx.amount) >= 0 ? "text-emerald-400" : "text-amber-400"}`}>
                      {Number(tx.amount) >= 0 ? "+" : ""}
                      {formatMoney(Number(tx.amount), tx.currency as never)}
                    </td>
                  </tr>
                ))}
                {(txs ?? []).length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-muted-foreground">
                      No transaction history yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </CasinoLayout>
  );
}
