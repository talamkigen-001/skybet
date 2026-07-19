import { useGame } from "@/lib/game-store";
import { useLocale, formatMoney } from "@/lib/locale";
import { Switch } from "@/components/ui/switch";

const QUICK = [5, 25, 50, 100];

export function MobileBetBar() {
  const s = useGame();
  const currency = useLocale((st) => st.currency);

  const canCashout = s.phase === "running" && s.myBet && !s.myBet.cashedAt;
  const hasQueued = s.pendingBet;
  const inRound = s.myBet && !s.myBet.cashedAt && s.phase === "running";
  const liveWin = inRound ? s.myBet!.amount * s.multiplier : 0;
  const disabled = !!hasQueued || !!inRound;
  const step = s.betAmount >= 100 ? 10 : s.betAmount >= 20 ? 5 : 1;
  const adjust = (mult: 1 | -1) => s.setBetAmount(Math.max(1, s.betAmount + mult * step), 0);

  return (
    <div
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background/95 backdrop-blur-xl px-3 pt-2 shadow-[0_-8px_24px_-12px_rgba(0,0,0,0.6)]"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0) + 8px)" }}
    >
      {/* Quick amounts + auto toggles */}
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 mb-2">
        <div className="flex items-center gap-1 min-w-0 overflow-x-auto">
          {QUICK.map((v) => (
            <button
              key={v}
              onClick={() => s.setBetAmount(v, 0)}
              disabled={disabled}
              className="shrink-0 text-[11px] px-2 py-1 rounded-md bg-secondary/60 hover:bg-secondary text-muted-foreground disabled:opacity-40"
            >
              {v}
            </button>
          ))}
        </div>
        <label className="shrink-0 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Switch
            checked={s.autoCashout !== null}
            onCheckedChange={(v) => s.setAutoCashout(v ? 2.0 : null, 0)}
            className="scale-75"
          />
          Auto
          {s.autoCashout !== null && (
            <input
              type="number"
              step={0.1}
              min={1.01}
              value={s.autoCashout}
              onChange={(e) => s.setAutoCashout(e.target.value ? Number(e.target.value) : null, 0)}
              className="w-12 h-6 px-1 rounded bg-secondary/60 text-[11px] font-mono-tabular text-foreground outline-none"
            />
          )}
        </label>
      </div>

      {/* Stepper + big action button */}
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-2">
        <div className="flex items-center rounded-xl bg-secondary/50 h-12">
          <button
            onClick={() => adjust(-1)}
            disabled={disabled}
            className="w-10 h-12 grid place-items-center text-lg font-bold disabled:opacity-40"
          >
            −
          </button>
          <input
            type="number"
            value={s.betAmount}
            onChange={(e) => s.setBetAmount(Number(e.target.value) || 0, 0)}
            disabled={disabled}
            className="flex-1 min-w-0 bg-transparent text-center font-mono-tabular font-bold text-base outline-none"
          />
          <button
            onClick={() => adjust(1)}
            disabled={disabled}
            className="w-10 h-12 grid place-items-center text-lg font-bold disabled:opacity-40"
          >
            +
          </button>
        </div>

        {canCashout ? (
          <button
            onClick={() => s.cashOut(0)}
            className="h-12 rounded-xl font-display font-extrabold text-background bg-gradient-to-b from-[var(--gold)] to-[var(--gold)]/70 shadow-[0_8px_24px_-8px_var(--gold)] active:scale-[0.98] flex items-center justify-center gap-2 px-2 min-w-0"
            style={{ animation: "pulse-glow 1.2s ease-in-out infinite" }}
          >
            <span className="text-[10px] uppercase tracking-wider opacity-80 shrink-0">
              Cash out
            </span>
            <span className="font-mono-tabular text-base truncate">
              {formatMoney(liveWin, currency)}
            </span>
          </button>
        ) : hasQueued ? (
          <button
            onClick={() => s.cancelBet(0)}
            className="h-12 rounded-xl font-display font-bold border-2 border-destructive text-destructive"
          >
            CANCEL
          </button>
        ) : (
          <button
            onClick={() => s.placeBet(0)}
            disabled={s.balance < s.betAmount}
            className="h-12 rounded-xl font-display font-extrabold text-lg text-primary-foreground bg-gradient-to-b from-primary to-primary/70 shadow-[0_8px_24px_-8px_hsl(var(--primary))] active:scale-[0.98] disabled:opacity-50"
          >
            BET {formatMoney(s.betAmount, currency)}
          </button>
        )}
      </div>
    </div>
  );
}
