import { useState, useCallback, useEffect } from "react";
import { useGame } from "@/lib/game-store";
import { useLiveGame } from "@/lib/live-game-store";
import { LiveGameLayout } from "./LiveGameLayout";

interface Tile {
  id: number;
  revealed: boolean;
  isMine: boolean;
}

const CHOICES = [{ id: "mines", label: "Mines", payout: "Flexible" }];

export function MinesGame() {
  const balance = useGame((s) => s.balance);
  const betAmount = useLiveGame((s) => s.betAmount);
  const setBetAmount = useLiveGame((s) => s.setBetAmount);
  const phase = useLiveGame((s) => s.phase);
  const finishRound = useLiveGame((s) => s.finishRound);
  const resetRound = useLiveGame((s) => s.resetRound);
  const setGameType = useLiveGame((s) => s.setGameType);
  const startMines = useLiveGame((s) => s.startMines);
  const revealMines = useLiveGame((s) => s.revealMines);
  const cashoutMines = useLiveGame((s) => s.cashoutMines);

  const [mineCount, setMineCount] = useState<number>(3);
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [hitMine, setHitMine] = useState<boolean>(false);
  const [revealedCount, setRevealedCount] = useState<number>(0);
  const [currentMultiplier, setCurrentMultiplier] = useState<number>(1);

  // Initialize
  useEffect(() => {
    setGameType("mines");
    generateTiles();
  }, [setGameType]);

  const generateTiles = () => {
    const arr: Tile[] = Array.from({ length: 25 }, (_, i) => ({
      id: i,
      revealed: false,
      isMine: false,
    }));
    setTiles(arr);
    setHitMine(false);
    setRevealedCount(0);
    setCurrentMultiplier(1);
  };

  const onPlay = async () => {
    if (balance < betAmount) return;

    try {
      await startMines(mineCount);
      const arr: Tile[] = Array.from({ length: 25 }, (_, i) => ({
        id: i,
        revealed: false,
        isMine: false,
      }));
      setTiles(arr);
      setHitMine(false);
      setRevealedCount(0);
      setCurrentMultiplier(1);
    } catch (err) {
      console.error("Mines play error:", err);
    }
  };

  const handleTileClick = async (tile: Tile) => {
    if (phase !== "playing" || tile.revealed || hitMine) return;

    try {
      const res = await revealMines(tile.id);
      if (!res) return;

      const updated = [...tiles];
      updated[tile.id].revealed = true;

      if (res.hitMine) {
        setHitMine(true);
        // Reveal all mines returned by server
        updated.forEach((t) => {
          if (res.mines.includes(t.id)) {
            t.isMine = true;
            t.revealed = true;
          }
        });
        setTiles(updated);
        setRevealedCount(res.revealedCount);
        setCurrentMultiplier(0);
      } else {
        // Star revealed
        setRevealedCount(res.revealedCount);
        setCurrentMultiplier(res.currentMultiplier);
        setTiles(updated);

        // Auto win resolved by server
        if (res.won) {
          const finalTiles = updated.map((t) => {
            if (res.mines.includes(t.id)) {
              t.isMine = true;
            }
            return { ...t, revealed: true };
          });
          setTiles(finalTiles);
        }
      }
    } catch (err) {
      console.error("Mines reveal error:", err);
    }
  };

  const handleCashout = async () => {
    if (phase !== "playing" || hitMine) return;

    try {
      const res = await cashoutMines();
      if (!res) return;

      const finalTiles = tiles.map((t) => {
        if (res.mines?.includes(t.id)) {
          t.isMine = true;
        }
        return { ...t, revealed: true };
      });
      setTiles(finalTiles);
    } catch (err) {
      console.error("Mines cashout error:", err);
    }
  };

  return (
    <LiveGameLayout
      title="1win Mines"
      glyph="💣"
      choices={[]}
      onPlay={onPlay}
      canPlay={phase === "betting"}
    >
      <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
        {/* Game settings panel when betting */}
        {phase === "betting" && (
          <div className="flex items-center gap-3 mb-4 bg-secondary/50 p-2 rounded-xl border border-border/40">
            <span className="text-xs text-muted-foreground">Mines count:</span>
            <select
              value={mineCount}
              onChange={(e) => setMineCount(Number(e.target.value))}
              className="bg-background text-xs font-semibold px-3 py-1.5 rounded-lg border border-border outline-none cursor-pointer"
            >
              {[1, 2, 3, 5, 10, 15, 20, 24].map((n) => (
                <option key={n} value={n}>
                  {n} {n === 1 ? "mine" : "mines"}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Live game progress panel */}
        {phase === "playing" && (
          <div className="flex items-center justify-between w-full max-w-sm mb-4 px-2">
            <div className="text-xs">
              <span className="text-muted-foreground">Multiplier: </span>
              <span className="font-bold text-[var(--gold)] text-sm">
                {currentMultiplier.toFixed(2)}x
              </span>
            </div>
            <button
              onClick={() => handleCashout()}
              className="px-4 py-1.5 rounded-xl bg-gradient-to-b from-[var(--gold)] to-[var(--gold)]/70 text-background text-xs font-bold shadow-lg hover:scale-105 transition-transform"
            >
              Cash Out ({(betAmount * currentMultiplier).toFixed(2)})
            </button>
          </div>
        )}

        {/* Mines 5x5 grid */}
        <div className="grid grid-cols-5 gap-2 w-full max-w-[320px] aspect-square">
          {tiles.map((tile) => {
            let style =
              "bg-secondary hover:bg-secondary/80 border-border/60 hover:-translate-y-0.5";
            let content = "❓";

            if (tile.revealed) {
              if (tile.isMine) {
                style = "bg-red-500/20 border-red-500/50 scale-95";
                content = "💥";
              } else {
                style = "bg-green-500/20 border-green-500/50 scale-95";
                content = "⭐️";
              }
            } else if (phase !== "playing") {
              style = "bg-secondary/40 border-border/20 opacity-60 cursor-not-allowed";
              content = "";
            }

            return (
              <button
                key={tile.id}
                onClick={() => handleTileClick(tile)}
                className={`rounded-xl border flex items-center justify-center text-lg font-bold transition-all ${style}`}
              >
                {content}
              </button>
            );
          })}
        </div>

        {/* Result splash overlay */}
        {phase === "result" && (
          <div className="mt-4 text-center">
            <div className="text-lg font-bold text-[var(--gold)] mb-1">
              {currentMultiplier > 1 && !hitMine ? "Success!" : "Boom!"}
            </div>
            <button
              onClick={resetRound}
              className="px-4 py-1 bg-secondary text-xs rounded-lg hover:bg-secondary/80"
            >
              Reset Board
            </button>
          </div>
        )}
      </div>
    </LiveGameLayout>
  );
}
