import { useGame } from "@/lib/game-store";
import { useLocale, formatMoney } from "@/lib/locale";
import { useTranslation } from "@/lib/i18n";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";

interface Props {
  betIndex?: number;
  variant?: "primary" | "accent";
}

const QUICK = [5, 25, 50, 100];

export function BetPanelV2({ betIndex = 0, variant = "primary" }: Props) {
  const s = useGame();
  const currency = useLocale((st) => st.currency);
  const { t } = useTranslation();

  const betAmount = betIndex === 0 ? s.betAmount : s.betAmount2;
  const autoCashout = betIndex === 0 ? s.autoCashout : s.autoCashout2;
  const autoBet = betIndex === 0 ? s.autoBet : s.autoBet2;
  const pendingBet = betIndex === 0 ? s.pendingBet : s.pendingBet2;
  const myBet = betIndex === 0 ? s.myBet : s.myBet2;

  const canCashout = s.phase === "running" && myBet && !myBet.cashedAt;
  const hasQueued = pendingBet;
  const inRound = myBet && !myBet.cashedAt && s.phase === "running";
  const liveWin = inRound ? myBet!.amount * s.multiplier : 0;
  const disabled = hasQueued || !!inRound;

  const step = betAmount >= 100 ? 10 : betAmount >= 20 ? 5 : 1;
  const adjust = (mult: 1 | -1) => s.setBetAmount(Math.max(1, betAmount + mult * step), betIndex);

  const btnBg =
    variant === "accent"
      ? "bg-gradient-to-b from-accent to-accent/70"
      : "bg-gradient-to-b from-primary to-primary/70";

  return (
    <div className="glass-panel rounded-2xl p-3 sm:p-4">
      {/* Top toggles row */}
      <div className="flex items-center justify-between gap-2 mb-3 text-xs">
        <label className="flex items-center gap-2 cursor-pointer">
          <Switch 
            checked={autoBet} 
            onCheckedChange={(v) => s.setAutoBet(v, betIndex)} 
            className="scale-75" 
          />
          <span className="text-muted-foreground">{t("game.autobet")}</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <Switch
            checked={autoCashout !== null}
            onCheckedChange={(v) => s.setAutoCashout(v ? 2.0 : null, betIndex)}
            className="scale-75"
          />
          <span className="text-muted-foreground">{t("game.autowithdrawal")}</span>
        </label>
        <div className="flex items-center gap-1 bg-secondary/60 rounded-md px-2 py-1">
          <span className="text-muted-foreground">x</span>
          <Input
            type="number"
            step={0.1}
            min={1.01}
            value={autoCashout ?? ""}
            onChange={(e) => s.setAutoCashout(e.target.value ? Number(e.target.value) : null, betIndex)}
            className="h-5 w-12 border-0 bg-transparent p-0 text-xs font-mono-tabular focus-visible:ring-0"
          />
        </div>
      </div>

      {/* Main row: stepper + BET */}
      <div className="grid grid-cols-[1fr_auto] gap-2 sm:gap-3 items-stretch">
        <div className="rounded-xl bg-secondary/40 p-2 flex flex-col gap-2">
          <div className="flex items-center justify-between gap-1">
            <button
              onClick={() => adjust(-1)}
              disabled={disabled}
              className="w-8 h-8 rounded-md bg-background/70 hover:bg-background text-lg font-bold disabled:opacity-40"
            >
              −
            </button>
            <input
              type="number"
              value={betAmount}
              onChange={(e) => s.setBetAmount(Number(e.target.value) || 0, betIndex)}
              disabled={disabled}
              className="flex-1 bg-transparent text-center font-mono-tabular font-bold text-base outline-none min-w-0"
            />
            <button
              onClick={() => adjust(1)}
              disabled={disabled}
              className="w-8 h-8 rounded-md bg-background/70 hover:bg-background text-lg font-bold disabled:opacity-40"
            >
              +
            </button>
          </div>
          <div className="grid grid-cols-4 gap-1">
            {QUICK.map((v) => (
              <button
                key={v}
                onClick={() => s.setBetAmount(v, betIndex)}
                disabled={disabled}
                className="text-[11px] py-1 rounded-md bg-background/50 hover:bg-background text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        {canCashout ? (
          <button
            onClick={() => s.cashOut(betIndex)}
            className="min-w-[110px] sm:min-w-[140px] rounded-xl font-display font-extrabold text-lg sm:text-xl text-background bg-gradient-to-b from-[var(--gold)] to-[var(--gold)]/70 shadow-[0_8px_24px_-8px_var(--gold)] active:scale-[0.98] transition-transform"
            style={{ animation: "pulse-glow 1.2s ease-in-out infinite" }}
          >
            <div className="text-[10px] uppercase tracking-wider opacity-80">
              {t("game.cash_out")}
            </div>
            <div className="font-mono-tabular">{formatMoney(liveWin, currency)}</div>
          </button>
        ) : hasQueued ? (
          <button
            onClick={() => s.cancelBet(betIndex)}
            className="min-w-[110px] sm:min-w-[140px] rounded-xl font-display font-bold text-base border-2 border-destructive text-destructive hover:bg-destructive/10"
          >
            {t("game.cancel")}
          </button>
        ) : (
          <button
            onClick={() => s.placeBet(betIndex)}
            disabled={s.balance < betAmount}
            className={`min-w-[110px] sm:min-w-[140px] rounded-xl font-display font-extrabold text-xl sm:text-2xl text-primary-foreground ${btnBg} shadow-[0_8px_24px_-8px_hsl(var(--primary))] active:scale-[0.98] transition-transform disabled:opacity-50`}
          >
            {t("game.bet")}
          </button>
        )}
      </div>

      {myBet?.cashedAt && (
        <div className="text-center text-xs text-[var(--win)] font-medium mt-2">
          Cashed @ {myBet.cashedAt.toFixed(2)}x · +
          {formatMoney(myBet.amount * myBet.cashedAt - myBet.amount, currency)}
        </div>
      )}
    </div>
  );
}
