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
} from "@/hooks/use-wallet";
import { formatMoney, useLocale } from "@/lib/locale";
import { useTranslation } from "@/lib/i18n";
import {
  CreditCard,
  Coins,
  MessageSquare,
  Send,
  Copy,
  Check,
  Mail,
  ExternalLink,
  QrCode,
  Clock,
  ArrowRight,
  ShieldCheck,
  Headphones,
} from "lucide-react";
import { toast } from "sonner";

const METHODS = [
  { id: "card", label: "Card · Visa / Mastercard", icon: "💳", kind: "card" },
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
    note: "Open your Binance App, go to Pay, select Send -> Binance ID, and send the exact amount.",
  },
  btc: {
    address: "bc1qxy2kg3ut5xgz35jdf6nr85c8sw7w2x348q72xt",
    network: "Bitcoin Mainnet (BTC)",
    note: "Send only Bitcoin (BTC) to this address. Sending other assets will result in permanent loss.",
  },
  eth: {
    address: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
    network: "Ethereum Mainnet (ERC20)",
    note: "Send only Ethereum (ETH) to this address. Ensure you use the ERC20 network.",
  },
  usdt_trc20: {
    address: "TXsZ9A2sHjG6Z3fD4gH2j9K3L4m5n6P7qR",
    network: "TRON (TRC20)",
    note: "Send only USDT TRC20 to this address. Verify you are using the TRON network.",
  },
  usdt_erc20: {
    address: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
    network: "Ethereum (ERC20)",
    note: "Send only USDT ERC20 to this address. Verify you are using the Ethereum network.",
  },
  bnb: {
    address: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
    network: "BNB Smart Chain (BEP20)",
    note: "Send only BNB BEP20 to this address. Sending to other chains will cause loss of funds.",
  },
  ltc: {
    address: "Lbz1y8D3Xz7fD5gH6j2K3L4m5n6P7qRstS",
    network: "Litecoin Mainnet (LTC)",
    note: "Send only Litecoin (LTC) to this address. Minimal fees and fast block verification.",
  },
};

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-400",
  processing: "bg-sky-500/15 text-sky-400",
  completed: "bg-emerald-500/15 text-emerald-400",
  failed: "bg-red-500/15 text-red-400",
  rejected: "bg-red-500/15 text-red-400",
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

  const [paymentType, setPaymentType] = useState<"card" | "crypto" | "support">("card");
  const [method, setMethod] = useState<string>("card");
  const [amount, setAmount] = useState<number>(50);
  const [submitted, setSubmitted] = useState<{ id: string; method: string } | null>(null);

  const [copied, setCopied] = useState<boolean>(false);

  const [supportMethod, setSupportMethod] = useState<string>("Revolut");
  const [supportAmount, setSupportAmount] = useState<string>("100");
  const [supportMessage, setSupportMessage] = useState<string>("");
  const [supportSubmitted, setSupportSubmitted] = useState<boolean>(false);

  useEffect(() => {
    if (!loading && !user) router.push("/auth");
  }, [user, loading, router]);

  async function submitDeposit() {
    if (!amount || amount < 5) return;
    try {
      const res = await createDeposit.mutateAsync({ method, amount, currency });
      setSubmitted({ id: res.id, method });
      toast.success("Deposit request registered successfully!");
    } catch (e: any) {
      toast.error(e.message || "Failed to create deposit request");
    }
  }

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Address copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSupportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportAmount || Number(supportAmount) < 5) {
      toast.error(`Please enter a valid amount (minimum ${formatMoney(5, currency)})`);
      return;
    }
    setSupportSubmitted(true);
    toast.success("Inquiry sent to support team!");
  };

  if (!user) return null;

  return (
    <CasinoLayout>
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <div className="grid md:grid-cols-3 gap-4">
          <div className="md:col-span-2 rounded-3xl p-6 glass-panel">
            <div className="text-xs text-muted-foreground uppercase tracking-wider">
              Wallet balance
            </div>
            <div className="text-4xl font-display font-extrabold text-[var(--gold)] mt-1 font-mono-tabular">
              {formatMoney(wallet?.balance ?? 0, currency)}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              Bonus: {formatMoney(wallet?.bonus_balance ?? 0, currency)} · Deposited:{" "}
              {formatMoney(wallet?.total_deposited ?? 0, currency)}
            </div>
          </div>
          <div className="rounded-3xl p-6 glass-panel">
            <div className="text-xs text-muted-foreground uppercase tracking-wider">Account</div>
            <div className="mt-1 font-semibold truncate">{user.email}</div>
            <div className="text-xs text-muted-foreground mt-3">User ID</div>
            <div className="font-mono text-[10px] text-muted-foreground break-all">{user.id}</div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-4">
          {/* Deposit Panel */}
          <div className="rounded-3xl p-6 glass-panel flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-display text-xl font-bold">{t("wallet.deposit")}</h2>
                <span className="text-xs px-2.5 py-1 bg-emerald-500/10 text-emerald-400 rounded-full font-semibold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Secure Checkout
                </span>
              </div>

              <div className="flex p-1 bg-secondary/40 border border-border/40 rounded-2xl mb-6">
                <button
                  type="button"
                  onClick={() => { setPaymentType("card"); setMethod("card"); setSubmitted(null); }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all duration-200 ${paymentType === "card" ? "bg-primary text-primary-foreground shadow-lg" : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"}`}
                >
                  <CreditCard className="w-4 h-4" />
                  <span>{t("wallet.card")}</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setPaymentType("crypto"); setMethod("btc"); setSubmitted(null); }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all duration-200 ${paymentType === "crypto" ? "bg-primary text-primary-foreground shadow-lg" : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"}`}
                >
                  <Coins className="w-4 h-4" />
                  <span>{t("wallet.crypto")}</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setPaymentType("support"); setSubmitted(null); }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all duration-200 ${paymentType === "support" ? "bg-primary text-primary-foreground shadow-lg" : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"}`}
                >
                  <Headphones className="w-4 h-4" />
                  <span>Support</span>
                </button>
              </div>

              {paymentType === "card" && (
                <div className="space-y-4">
                  <div className="text-xs text-muted-foreground">
                    Instant deposits with Credit/Debit cards. Visa, Mastercard, Maestro supported.
                  </div>
                  <div className="text-xs text-muted-foreground mb-1 mt-3">Amount</div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={5}
                      step={5}
                      value={amount}
                      onChange={(e) => setAmount(Number(e.target.value))}
                      className="flex-1 h-12 px-4 rounded-xl bg-secondary/50 border border-border text-lg font-bold outline-none focus:ring-1 focus:ring-primary"
                    />
                    <span className="text-muted-foreground font-mono font-bold px-2">{currency}</span>
                  </div>
                  <div className="flex gap-2">
                    {[20, 50, 100, 250, 500].map((v) => (
                      <button
                        key={v}
                        onClick={() => setAmount(v)}
                        className={`flex-1 h-9 rounded-lg text-xs font-bold transition ${amount === v ? "bg-primary/20 border border-primary text-foreground" : "bg-secondary/50 hover:bg-secondary border border-transparent"}`}
                      >
                        +{v}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={submitDeposit}
                    disabled={createDeposit.isPending || amount < 5}
                    className="w-full h-12 mt-4 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-bold hover:opacity-90 disabled:opacity-50 transition shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                  >
                    {createDeposit.isPending ? "Creating deposit..." : (
                      <>
                        <span>Deposit {formatMoney(amount, currency)}</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                  {submitted && (
                    <div className="mt-4 rounded-xl p-4 border border-border bg-emerald-500/10 text-sm">
                      <div className="font-bold text-emerald-400 mb-1 flex items-center gap-1.5">
                        <Check className="w-4 h-4" /> Deposit Request Created
                      </div>
                      <div className="text-xs text-muted-foreground leading-relaxed">
                        Card checkout simulation complete. Deposit request registered as{" "}
                        <strong className="text-foreground">pending</strong>.
                      </div>
                    </div>
                  )}
                </div>
              )}

              {paymentType === "crypto" && (
                <div className="space-y-4">
                  {!submitted ? (
                    <>
                      <div className="text-xs text-muted-foreground mb-2">Select Cryptocurrency</div>
                      <div className="grid grid-cols-2 gap-2 mb-4">
                        {METHODS.filter((m) => m.kind === "crypto").map((m) => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => setMethod(m.id)}
                            className={`px-3 py-2.5 rounded-xl border text-xs sm:text-sm flex items-center gap-2 text-left transition ${method === m.id ? "border-primary bg-primary/10 text-foreground font-bold" : "border-border bg-secondary/40 hover:bg-secondary text-muted-foreground"}`}
                          >
                            <span className="text-lg leading-none">{m.icon}</span>
                            <span className="truncate">{m.label.replace(/ \([^)]+\)/g, "")}</span>
                          </button>
                        ))}
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={5}
                          step={5}
                          value={amount}
                          onChange={(e) => setAmount(Number(e.target.value))}
                          className="flex-1 h-12 px-4 rounded-xl bg-secondary/50 border border-border text-lg font-bold outline-none focus:ring-1 focus:ring-primary"
                        />
                        <span className="text-muted-foreground font-mono font-bold px-2">{currency}</span>
                      </div>
                      <button
                        onClick={submitDeposit}
                        disabled={createDeposit.isPending || amount < 5}
                        className="w-full h-12 mt-4 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-bold hover:opacity-90 disabled:opacity-50 transition"
                      >
                        {createDeposit.isPending ? "Generating Wallet..." : "Generate Deposit Details"}
                      </button>
                    </>
                  ) : (
                    <div className="space-y-4 rounded-2xl border border-border bg-secondary/20 p-5 mt-2">
                      <div className="text-xs font-mono font-bold">{submitted.id}</div>
                      {CRYPTO_INFO[submitted.method] && (
                        <div>
                          <div className="text-xs font-bold">{CRYPTO_INFO[submitted.method].network}</div>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="text-xs font-mono bg-secondary/80 border border-border/40 px-2.5 py-1.5 rounded-lg break-all flex-1">
                              {CRYPTO_INFO[submitted.method].address}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopy(CRYPTO_INFO[submitted.method].address)}
                              className="p-1.5 bg-primary/10 hover:bg-primary/20 rounded-lg text-primary transition"
                            >
                              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                            </button>
                          </div>
                          <div className="mt-2 text-[11px] text-muted-foreground">{CRYPTO_INFO[submitted.method].note}</div>
                        </div>
                      )}
                      <button type="button" onClick={() => setSubmitted(null)} className="w-full h-9 rounded-lg bg-secondary/60 text-xs font-bold">
                        New Deposit
                      </button>
                    </div>
                  )}
                </div>
              )}

              {paymentType === "support" && (
                <div className="space-y-4">
                  {!supportSubmitted ? (
                    <form onSubmit={handleSupportSubmit} className="space-y-3">
                      <div className="text-xs text-muted-foreground">
                        Need another payment option? Our billing agents support Revolut, PayPal, local bank transfers, Apple/Google Pay, and custom vouchers.
                      </div>
                      <div className="grid grid-cols-2 gap-3 mt-3">
                        <div>
                          <label className="text-[10px] text-muted-foreground block mb-1">Preferred Method</label>
                          <select
                            value={supportMethod}
                            onChange={(e) => setSupportMethod(e.target.value)}
                            className="w-full h-10 px-3 rounded-xl bg-secondary/50 border border-border text-xs font-semibold outline-none"
                          >
                            <option value="Revolut">Revolut Payment</option>
                            <option value="PayPal">PayPal Invoice</option>
                            <option value="Bank Transfer">SEPA Bank Transfer</option>
                            <option value="Apple Pay / Google Pay">Apple / Google Pay</option>
                            <option value="Cash App">Cash App / Venmo</option>
                            <option value="Voucher / Other">Other Local Method</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] text-muted-foreground block mb-1">Amount (EUR)</label>
                          <input
                            type="number"
                            min={5}
                            value={supportAmount}
                            onChange={(e) => setSupportAmount(e.target.value)}
                            className="w-full h-10 px-3 rounded-xl bg-secondary/50 border border-border text-xs font-bold outline-none"
                          />
                        </div>
                      </div>
                      <textarea
                        placeholder="e.g. Please send details for Revolut transfer..."
                        value={supportMessage}
                        onChange={(e) => setSupportMessage(e.target.value)}
                        rows={2}
                        className="w-full p-3 rounded-xl bg-secondary/50 border border-border text-xs outline-none resize-none"
                      />
                      <button
                        type="submit"
                        className="w-full h-11 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-bold hover:opacity-90 transition flex items-center justify-center gap-1.5 text-xs sm:text-sm"
                      >
                        <Send className="w-4 h-4" />
                        <span>Send Deposit Support Request</span>
                      </button>
                    </form>
                  ) : (
                    <div className="rounded-2xl border border-border bg-emerald-500/10 p-5 mt-2">
                      <div className="font-bold text-emerald-400 mb-1">✓ Support Request Received</div>
                      <div className="text-xs text-muted-foreground">
                        Your request for <strong>{formatMoney(Number(supportAmount), currency)}</strong> via <strong>{supportMethod}</strong> has been sent.
                      </div>
                      <button
                        type="button"
                        onClick={() => { setSupportSubmitted(false); setSupportMessage(""); }}
                        className="mt-3 w-full h-9 rounded-lg bg-secondary text-xs font-bold"
                      >
                        Back to Support Options
                      </button>
                    </div>
                  )}
                  <div className="border-t border-border/40 pt-4 grid grid-cols-2 gap-2">
                    <a href="https://t.me/NorocJetX_Support" target="_blank" rel="noopener noreferrer" className="h-10 px-3 rounded-xl border border-border bg-secondary/40 hover:bg-secondary text-xs font-bold flex items-center justify-center gap-1.5">
                      ✈️ Telegram Chat
                    </a>
                    <a href="mailto:support@norocjetx.com" className="h-10 px-3 rounded-xl border border-border bg-secondary/40 hover:bg-secondary text-xs font-bold flex items-center justify-center gap-1.5">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      Email Support
                    </a>
                  </div>
                </div>
              )}
            </div>
            <div className="mt-5 text-[10px] text-muted-foreground text-center">
              Deposits are secure and encrypted.
            </div>
          </div>

          {/* Deposits history */}
          <div className="rounded-3xl p-6 glass-panel">
            <h2 className="font-display text-xl font-bold mb-4">{t("wallet.deposits")}</h2>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {(deposits ?? []).length === 0 && (
                <div className="text-sm text-muted-foreground">No deposits yet.</div>
              )}
              {(deposits ?? []).map((d: any) => (
                <div key={d.id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-secondary/40">
                  <div className="min-w-0">
                    <div className="font-semibold text-sm truncate">
                      {(d.method || "UNKNOWN").toUpperCase()} · {formatMoney(Number(d.amount), d.currency)}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {new Date(d.created_at).toLocaleString()}
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${STATUS_STYLE[d.status] ?? "bg-muted"}`}>
                    {d.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Transactions */}
        <div className="rounded-3xl p-6 glass-panel">
          <h2 className="font-display text-xl font-bold mb-4">{t("wallet.transactions")}</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground uppercase">
                <tr>
                  <th className="text-left py-2">{t("wallet.date")}</th>
                  <th className="text-left">{t("wallet.type")}</th>
                  <th className="text-left">{t("wallet.status")}</th>
                  <th className="text-right">{t("wallet.amount")}</th>
                </tr>
              </thead>
              <tbody>
                {(txs ?? []).map((tx) => (
                  <tr key={tx.id} className="border-t border-border/40">
                    <td className="py-2 text-muted-foreground">
                      {new Date(tx.created_at).toLocaleString()}
                    </td>
                    <td className="capitalize">{tx.type}</td>
                    <td>
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${STATUS_STYLE[tx.status] ?? "bg-muted"}`}>
                        {tx.status}
                      </span>
                    </td>
                    <td className={`text-right font-mono-tabular ${Number(tx.amount) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {Number(tx.amount) >= 0 ? "+" : ""}
                      {formatMoney(Number(tx.amount), tx.currency as never)}
                    </td>
                  </tr>
                ))}
                {(txs ?? []).length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-muted-foreground">
                      No transactions yet.
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
