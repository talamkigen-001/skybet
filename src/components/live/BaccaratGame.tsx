"use client";
import { useEffect, useRef, useCallback } from "react";
import { useLiveGame } from "@/lib/live-game-store";
import { LiveGameLayout } from "./LiveGameLayout";

const CHOICES = [
  { id: "player", label: "👤 Player", payout: "2x" },
  { id: "banker", label: "🏦 Banker", payout: "1.95x" },
  { id: "tie", label: "🤝 Tie", payout: "8x" },
];

function drawCard(): number {
  return Math.floor(Math.random() * 52);
}

function bacValue(cards: number[]): number {
  let total = 0;
  for (const c of cards) {
    const rank = c % 13;
    if (rank >= 10)
      total += 0; // face cards = 0
    else if (rank === 0)
      total += 1; // ace = 1
    else total += rank + 1;
  }
  return total % 10;
}

export function BaccaratGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const phase = useLiveGame((s) => s.phase);
  const playerBacCards = useLiveGame((s) => s.playerBacCards);
  const bankerBacCards = useLiveGame((s) => s.bankerBacCards);
  const setGameType = useLiveGame((s) => s.setGameType);
  const placeBet = useLiveGame((s) => s.placeBet);
  const finishRound = useLiveGame((s) => s.finishRound);
  const revealStepRef = useRef(0);

  useEffect(() => {
    setGameType("baccarat");
  }, [setGameType]);

  const onPlay = useCallback(async () => {
    try {
      revealStepRef.current = 0;
      const res = await placeBet();
      if (!res) return;

      const { playerBacCards, bankerBacCards } = res.data;

      // Animate card reveals
      let step = 0;
      const totalCards = playerBacCards.length + bankerBacCards.length;
      const revealInterval = setInterval(() => {
        step++;
        revealStepRef.current = step;
        if (step >= totalCards) {
          clearInterval(revealInterval);
          finishRound(res.result, res.won, res.payout);
        }
      }, 600);
    } catch (err) {
      console.error("Baccarat play error:", err);
    }
  }, [placeBet, finishRound]);

  // Canvas
  useEffect(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext("2d")!;
    let raf = 0;

    const draw = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = cvs.clientWidth;
      const h = cvs.clientHeight;
      if (cvs.width !== w * dpr || cvs.height !== h * dpr) {
        cvs.width = w * dpr;
        cvs.height = h * dpr;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      // Background - deep blue
      const bg = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.6);
      bg.addColorStop(0, "rgba(30, 40, 80, 0.95)");
      bg.addColorStop(1, "rgba(10, 12, 30, 1)");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      // Decorative line
      ctx.strokeStyle = "rgba(100, 140, 255, 0.1)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(w * 0.1, h / 2);
      ctx.lineTo(w * 0.9, h / 2);
      ctx.stroke();

      const s = useLiveGame.getState();
      const cardW = Math.min(60, w * 0.09);
      const cardH = cardW * 1.4;
      const revealed = revealStepRef.current;

      // Player side
      ctx.font = "600 16px Inter, system-ui";
      ctx.fillStyle = "rgba(100, 180, 255, 0.8)";
      ctx.textAlign = "center";
      ctx.fillText("PLAYER", w * 0.3, h * 0.12);

      const pStartX = w * 0.3 - (s.playerBacCards.length * (cardW + 6)) / 2;
      s.playerBacCards.forEach((card, i) => {
        const x = pStartX + i * (cardW + 6);
        const show = i < Math.ceil(revealed / 2);
        drawBacCard(ctx, x, h * 0.18, cardW, cardH, show ? card : -1);
      });

      if (
        s.playerBacCards.length > 0 &&
        (s.phase === "result" || revealed >= s.playerBacCards.length + s.bankerBacCards.length)
      ) {
        const val = bacValue(s.playerBacCards);
        ctx.font = "700 32px 'Space Grotesk', system-ui";
        ctx.fillStyle = val >= 8 ? "#22c55e" : "#fff";
        ctx.textAlign = "center";
        ctx.fillText(String(val), w * 0.3, h * 0.18 + cardH + 40);
      }

      // Banker side
      ctx.font = "600 16px Inter, system-ui";
      ctx.fillStyle = "rgba(255, 100, 100, 0.8)";
      ctx.textAlign = "center";
      ctx.fillText("BANKER", w * 0.7, h * 0.12);

      const bStartX = w * 0.7 - (s.bankerBacCards.length * (cardW + 6)) / 2;
      s.bankerBacCards.forEach((card, i) => {
        const x = bStartX + i * (cardW + 6);
        const show = i < Math.floor(revealed / 2);
        drawBacCard(ctx, x, h * 0.18, cardW, cardH, show ? card : -1);
      });

      if (
        s.bankerBacCards.length > 0 &&
        (s.phase === "result" || revealed >= s.playerBacCards.length + s.bankerBacCards.length)
      ) {
        const val = bacValue(s.bankerBacCards);
        ctx.font = "700 32px 'Space Grotesk', system-ui";
        ctx.fillStyle = val >= 8 ? "#22c55e" : "#fff";
        ctx.textAlign = "center";
        ctx.fillText(String(val), w * 0.7, h * 0.18 + cardH + 40);
      }

      // VS or result
      if (s.phase === "result") {
        ctx.font = "700 28px 'Space Grotesk', system-ui";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const won = s.lastWin > 0;
        ctx.fillStyle = won ? "#22c55e" : "#ff5b5b";
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 15;
        ctx.fillText(s.roundResult, w / 2, h * 0.75);
        ctx.shadowBlur = 0;

        if (won) {
          ctx.font = "600 18px Inter, system-ui";
          ctx.fillText(`+${s.lastWin.toFixed(2)}`, w / 2, h * 0.82);
        }
      } else if (s.phase === "playing") {
        ctx.font = "700 24px 'Space Grotesk', system-ui";
        ctx.fillStyle = "rgba(255,200,80,0.6)";
        ctx.textAlign = "center";
        ctx.fillText("VS", w / 2, h * 0.18 + cardH / 2);
      } else {
        ctx.font = "500 20px Inter, system-ui";
        ctx.fillStyle = "rgba(255,255,255,0.5)";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("Player or Banker?", w / 2, h / 2);
      }

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  void phase;
  void playerBacCards;
  void bankerBacCards;

  return (
    <LiveGameLayout
      title="Sapphire Baccarat"
      glyph="♦"
      choices={CHOICES}
      onPlay={onPlay}
      canPlay={phase === "betting"}
    >
      <canvas ref={canvasRef} className="w-full h-full" aria-label="Baccarat table" />
    </LiveGameLayout>
  );
}

// Card rendering
const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const SUITS = ["♠", "♥", "♦", "♣"];

function drawBacCard(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  card: number,
) {
  ctx.shadowColor = "rgba(0,0,0,0.3)";
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 2;

  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 6);

  if (card < 0) {
    const grad = ctx.createLinearGradient(x, y, x + w, y + h);
    grad.addColorStop(0, "#1e3a5f");
    grad.addColorStop(1, "#0a1628");
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = "rgba(100,140,255,0.3)";
    ctx.lineWidth = 1;
    ctx.stroke();
  } else {
    ctx.fillStyle = "#fafafa";
    ctx.fill();

    const rank = RANKS[card % 13];
    const suit = SUITS[Math.floor(card / 13) % 4];
    const isRed = suit === "♥" || suit === "♦";

    ctx.fillStyle = isRed ? "#dc2626" : "#111";
    ctx.font = `bold ${w * 0.3}px 'Space Grotesk', system-ui`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`${rank}${suit}`, x + w / 2, y + h / 2);
  }

  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
}
