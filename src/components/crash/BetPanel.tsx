"use client";
import { useGame } from "@/lib/game-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export function BetPanel() {
  const s = useGame();
  const canCashout = s.phase === "running" && s.myBet && !s.myBet.cashedAt;
  const hasQueued = s.pendingBet;
  const inRound = s.myBet && !s.myBet.cashedAt && s.phase === "running";

  const liveWin = inRound ? (s.myBet!.amount * s.multiplier).toFixed(2) : null;

  return (
    <div className="glass-panel rounded-2xl p-5 flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs text-muted-foreground">Bet amount</Label>
          <div className="flex items-center gap-2 mt-1">
            <Input
              type="number"
              min={1}
              step={1}
              value={s.betAmount}
              onChange={(e) => s.setBetAmount(Number(e.target.value))}
              className="font-mono-tabular"
              disabled={hasQueued || !!inRound}
            />
          </div>
          <div className="flex gap-1 mt-2">
            {[10, 50, 100, 500].map((v) => (
              <button
                key={v}
                onClick={() => s.setBetAmount(v)}
                className="text-xs px-2 py-1 rounded-md bg-secondary hover:bg-muted transition-colors"
              >
                {v}
              </button>
            ))}
            <button
              onClick={() => s.setBetAmount(Math.floor(s.balance / 2))}
              className="text-xs px-2 py-1 rounded-md bg-secondary hover:bg-muted"
            >
              ½
            </button>
            <button
              onClick={() => s.setBetAmount(Math.floor(s.balance))}
              className="text-xs px-2 py-1 rounded-md bg-secondary hover:bg-muted"
            >
              Max
            </button>
          </div>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Auto cashout</Label>
          <Input
            type="number"
            step={0.1}
            min={1.01}
            placeholder="—"
            value={s.autoCashout ?? ""}
            onChange={(e) => s.setAutoCashout(e.target.value ? Number(e.target.value) : null)}
            className="font-mono-tabular mt-1"
          />
          <div className="flex items-center gap-2 mt-3">
            <Switch checked={s.autoBet} onCheckedChange={s.setAutoBet} id="autobet" />
            <Label htmlFor="autobet" className="text-xs">
              Auto bet
            </Label>
          </div>
        </div>
      </div>

      {canCashout ? (
        <Button
          onClick={() => s.cashOut()}
          className="h-16 text-xl font-bold bg-[var(--gold)] hover:bg-[var(--gold)]/90 text-background"
          style={{ animation: "pulse-glow 1.2s ease-in-out infinite" }}
        >
          Cash out {liveWin}
        </Button>
      ) : hasQueued ? (
        <Button
          onClick={() => s.cancelBet()}
          variant="outline"
          className="h-16 text-lg border-destructive text-destructive hover:bg-destructive/10"
        >
          Cancel (queued for next round)
        </Button>
      ) : inRound ? (
        <Button disabled className="h-16 text-lg">
          In flight…
        </Button>
      ) : (
        <Button
          onClick={() => s.placeBet()}
          disabled={s.balance < s.betAmount}
          className="h-16 text-xl font-bold bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          {s.phase === "betting" ? "Place bet" : "Bet next round"}
        </Button>
      )}

      {s.myBet?.cashedAt && (
        <div className="text-center text-sm text-[var(--win)] font-medium">
          Cashed out @ {s.myBet.cashedAt.toFixed(2)}x · +
          {(s.myBet.amount * s.myBet.cashedAt - s.myBet.amount).toFixed(2)}
        </div>
      )}
    </div>
  );
}
