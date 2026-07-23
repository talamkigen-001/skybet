"use client";
import { useLiveGame } from "@/lib/live-game-store";
import { useGame } from "@/lib/game-store";
import { useLocale, formatMoney } from "@/lib/locale";

const QUICK = [5, 10, 25, 50, 100];

interface Props {
  choices: { id: string; label: string; color?: string; payout?: string }[];
  onPlay: () => void;
  canPlay: boolean;
}

export function LiveBetPanel({ choices, onPlay, canPlay }: Props) {
  const phase = useLiveGame((s) => s.phase);
  const betAmount = useLiveGame((s) => s.betAmount);
  const setBetAmount = useLiveGame((s) => s.setBetAmount);
  const selectedChoice = useLiveGame((s) => s.selectedChoice);
  const setSelectedChoice = useLiveGame((s) => s.setSelectedChoice);
  const lastWin = useLiveGame((s) => s.lastWin);
  const resetRound = useLiveGame((s) => s.resetRound);
  const balance = useGame((s) => s.balance);
  const currency = useLocale((s) => s.currency);

  const disabled = phase === "playing";
  const step = betAmount >= 100 ? 10 : betAmount >= 20 ? 5 : 1;
  const adjust = (mult: 1 | -1) => setBetAmount(Math.max(1, betAmount + mult * step));

  return (
    <div className="glass-panel rounded-2xl p-3 sm:p-4 space-y-3">
      {/* Choice selector */}
      {choices.length > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 px-1">
            Place your bet
          </div>
          <div className="flex flex-wrap gap-1.5">
            {choices.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedChoice(c.id)}
                disabled={disabled}
                className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all border ${
                  selectedChoice === c.id
                    ? "bg-primary/20 border-primary text-primary ring-1 ring-primary/40 scale-105"
                    : "bg-secondary/40 border-border/40 text-muted-foreground hover:bg-secondary hover:text-foreground"
                } disabled:opacity-40 disabled:cursor-not-allowed`}
                style={
                  c.color && selectedChoice === c.id
                    ? { borderColor: c.color, color: c.color }
                    : undefined
                }
              >
                <div>{c.label}</div>
                {c.payout && <div className="text-[9px] opacity-70 mt-0.5">{c.payout}</div>}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Amount stepper + action button */}
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
              onChange={(e) => setBetAmount(Number(e.target.value) || 0)}
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
          <div className="grid grid-cols-5 gap-1">
            {QUICK.map((v) => (
              <button
                key={v}
                onClick={() => setBetAmount(v)}
                disabled={disabled}
                className="text-[11px] py-1 rounded-md bg-background/50 hover:bg-background text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        {phase === "result" ? (
          <button
            onClick={resetRound}
            className="min-w-[110px] sm:min-w-[140px] rounded-xl font-display font-extrabold text-lg sm:text-xl text-primary-foreground bg-gradient-to-b from-primary to-primary/70 shadow-[0_8px_24px_-8px_hsl(var(--primary))] active:scale-[0.98] transition-transform"
          >
            <div className="text-[10px] uppercase tracking-wider opacity-80">
              {lastWin > 0 ? "You won!" : "Try again"}
            </div>
            <div className="font-mono-tabular">
              {lastWin > 0 ? `+${formatMoney(lastWin, currency)}` : "New round"}
            </div>
          </button>
        ) : phase === "playing" ? (
          <div className="min-w-[110px] sm:min-w-[140px] rounded-xl font-display font-bold text-base flex items-center justify-center bg-secondary/60 border border-border/40 text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[var(--gold)] animate-pulse" />
              In play...
            </div>
          </div>
        ) : (
          <button
            onClick={() => {
              if (canPlay && selectedChoice) onPlay();
            }}
            disabled={balance < betAmount || !selectedChoice || !canPlay}
            className="min-w-[110px] sm:min-w-[140px] rounded-xl font-display font-extrabold text-xl sm:text-2xl text-primary-foreground bg-gradient-to-b from-primary to-primary/70 shadow-[0_8px_24px_-8px_hsl(var(--primary))] active:scale-[0.98] transition-transform disabled:opacity-50"
          >
            BET
          </button>
        )}
      </div>
    </div>
  );
}
