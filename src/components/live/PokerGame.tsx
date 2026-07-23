"use client";
import { useEffect, useRef, useCallback } from "react";
import { useLiveGame } from "@/lib/live-game-store";
import { LiveGameLayout } from "./LiveGameLayout";

const CHOICES = [{ id: "ante", label: "♠ Ante", payout: "Up to 40x" }];

const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const SUITS = ["♠", "♥", "♦", "♣"];

function drawCard(): number {
  return Math.floor(Math.random() * 52);
}

function draw3Cards(): number[] {
  const cards: number[] = [];
  while (cards.length < 3) {
    const c = drawCard();
    if (!cards.includes(c)) cards.push(c);
  }
  return cards;
}

interface HandResult {
  rank: number;
  name: string;
}

function evaluatePokerHand(cards: number[]): HandResult {
  const ranks = cards.map((c) => c % 13).sort((a, b) => a - b);
  const suits = cards.map((c) => Math.floor(c / 13) % 4);

  const isFlush = suits[0] === suits[1] && suits[1] === suits[2];
  const isStraight =
    (ranks[2] - ranks[0] === 2 && ranks[1] - ranks[0] === 1) ||
    (ranks[0] === 0 && ranks[1] === 11 && ranks[2] === 12); // A-Q-K

  const isThreeOfAKind = ranks[0] === ranks[1] && ranks[1] === ranks[2];
  const isPair = ranks[0] === ranks[1] || ranks[1] === ranks[2] || ranks[0] === ranks[2];

  if (isFlush && isStraight) return { rank: 6, name: "Straight Flush" };
  if (isThreeOfAKind) return { rank: 5, name: "Three of a Kind" };
  if (isStraight) return { rank: 4, name: "Straight" };
  if (isFlush) return { rank: 3, name: "Flush" };
  if (isPair) return { rank: 2, name: "Pair" };

  // High card — check for Queen-high or better (qualifies)
  const highest = Math.max(...ranks);
  if (highest >= 11) return { rank: 1, name: `High ${RANKS[highest]}` };
  return { rank: 0, name: `High ${RANKS[highest]}` };
}

const PAYOUTS: Record<number, number> = {
  6: 40, // Straight flush
  5: 30, // Three of a kind
  4: 6, // Straight
  3: 3, // Flush
  2: 1, // Pair
};

export function PokerGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const phase = useLiveGame((s) => s.phase);
  const pokerPlayerCards = useLiveGame((s) => s.pokerPlayerCards);
  const pokerDealerCards = useLiveGame((s) => s.pokerDealerCards);
  const pokerHandRank = useLiveGame((s) => s.pokerHandRank);
  const setGameType = useLiveGame((s) => s.setGameType);
  const dealPoker = useLiveGame((s) => s.dealPoker);
  const actionPoker = useLiveGame((s) => s.actionPoker);
  const revealRef = useRef(0);
  const showDealerRef = useRef(false);
  const foldedRef = useRef(false);

  useEffect(() => {
    setGameType("poker");
  }, [setGameType]);

  const onPlay = useCallback(async () => {
    try {
      revealRef.current = 0;
      showDealerRef.current = false;
      foldedRef.current = false;

      await dealPoker();

      // Animate card reveals
      let step = 0;
      const revealInterval = setInterval(() => {
        step++;
        revealRef.current = step;
        if (step >= 3) {
          clearInterval(revealInterval);
        }
      }, 500);
    } catch (err) {
      console.error("Poker play error:", err);
    }
  }, [dealPoker]);

  // Handle play/fold clicks
  const handlePlay = useCallback(async () => {
    const s = useLiveGame.getState();
    if (s.phase !== "playing" || showDealerRef.current) return;

    showDealerRef.current = true;

    try {
      await actionPoker("play");
    } catch (err) {
      console.error("Poker play action error:", err);
    }
  }, [actionPoker]);

  const handleFold = useCallback(async () => {
    const s = useLiveGame.getState();
    if (s.phase !== "playing") return;
    foldedRef.current = true;

    try {
      await actionPoker("fold");
    } catch (err) {
      console.error("Poker fold action error:", err);
    }
  }, [actionPoker]);

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

      // Background
      const bg = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.6);
      bg.addColorStop(0, "rgba(50, 20, 60, 0.95)");
      bg.addColorStop(1, "rgba(15, 8, 20, 1)");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      const s = useLiveGame.getState();
      const cardW = Math.min(75, w * 0.11);
      const cardH = cardW * 1.4;
      const revealed = revealRef.current;

      // Dealer label + cards
      ctx.font = "600 14px Inter, system-ui";
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.textAlign = "center";
      ctx.fillText("DEALER", w / 2, h * 0.1);

      const dStartX = w / 2 - (3 * (cardW + 10)) / 2;
      for (let i = 0; i < 3; i++) {
        const x = dStartX + i * (cardW + 10);
        const card = s.pokerDealerCards[i] ?? -1;
        const show = showDealerRef.current || s.phase === "result";
        drawPokerCard(ctx, x, h * 0.14, cardW, cardH, show ? card : -1);
      }

      // Player label + cards
      ctx.font = "600 14px Inter, system-ui";
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.textAlign = "center";
      ctx.fillText("YOUR HAND", w / 2, h * 0.5);

      const pStartX = w / 2 - (3 * (cardW + 10)) / 2;
      for (let i = 0; i < 3; i++) {
        const x = pStartX + i * (cardW + 10);
        const card = s.pokerPlayerCards[i] ?? -1;
        const show = i < revealed;
        drawPokerCard(ctx, x, h * 0.54, cardW, cardH, show ? card : -1);
      }

      // Hand rank
      if (s.pokerHandRank && s.phase !== "betting") {
        ctx.font = "700 18px 'Space Grotesk', system-ui";
        ctx.fillStyle = "#ffd86b";
        ctx.textAlign = "center";
        ctx.fillText(s.pokerHandRank, w / 2, h * 0.54 + cardH + 28);
      }

      // Play/Fold buttons (during player phase, after cards revealed)
      if (s.phase === "playing" && revealed >= 3 && !showDealerRef.current && !foldedRef.current) {
        const btnY = h * 0.54 + cardH + 48;
        const btnW = 100;
        const btnH = 36;
        const gap = 16;
        const startX = w / 2 - (btnW * 2 + gap) / 2;

        // Play button
        ctx.fillStyle = "#22c55e";
        ctx.globalAlpha = 0.9;
        ctx.beginPath();
        ctx.roundRect(startX, btnY, btnW, btnH, 8);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.font = "700 13px Inter, system-ui";
        ctx.fillStyle = "#fff";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("PLAY", startX + btnW / 2, btnY + btnH / 2);

        // Fold button
        ctx.fillStyle = "#ef4444";
        ctx.globalAlpha = 0.9;
        ctx.beginPath();
        ctx.roundRect(startX + btnW + gap, btnY, btnW, btnH, 8);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.fillStyle = "#fff";
        ctx.fillText("FOLD", startX + btnW + gap + btnW / 2, btnY + btnH / 2);
      }

      // Result
      if (s.phase === "result") {
        ctx.font = "700 28px 'Space Grotesk', system-ui";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const won = s.lastWin > 0;
        ctx.fillStyle = won ? "#22c55e" : "#ff5b5b";
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 15;
        ctx.fillText(s.roundResult, w / 2, h * 0.44);
        ctx.shadowBlur = 0;

        if (won) {
          ctx.font = "600 16px Inter, system-ui";
          ctx.fillText(`+${s.lastWin.toFixed(2)}`, w / 2, h * 0.44 + 30);
        }
      } else if (s.phase === "betting") {
        ctx.font = "500 20px Inter, system-ui";
        ctx.fillStyle = "rgba(255,255,255,0.5)";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("Place your ante", w / 2, h / 2);
      }

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Canvas click handler
  useEffect(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;

    const onClick = (e: MouseEvent) => {
      const s = useLiveGame.getState();
      if (
        s.phase !== "playing" ||
        revealRef.current < 3 ||
        showDealerRef.current ||
        foldedRef.current
      )
        return;

      const rect = cvs.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const w = rect.width;
      const h = rect.height;
      const cardW = Math.min(75, w * 0.11);
      const cardH = cardW * 1.4;

      const btnY = h * 0.54 + cardH + 48;
      const btnW = 100;
      const btnH = 36;
      const gap = 16;
      const startX = w / 2 - (btnW * 2 + gap) / 2;

      if (my >= btnY && my <= btnY + btnH) {
        if (mx >= startX && mx <= startX + btnW) handlePlay();
        else if (mx >= startX + btnW + gap && mx <= startX + btnW * 2 + gap) handleFold();
      }
    };

    cvs.addEventListener("click", onClick);
    return () => cvs.removeEventListener("click", onClick);
  }, [handlePlay, handleFold]);

  void phase;
  void pokerPlayerCards;
  void pokerDealerCards;
  void pokerHandRank;

  return (
    <LiveGameLayout
      title="Studio Poker Live"
      glyph="♠"
      choices={CHOICES}
      onPlay={onPlay}
      canPlay={phase === "betting"}
    >
      <canvas ref={canvasRef} className="w-full h-full cursor-pointer" aria-label="Poker table" />
    </LiveGameLayout>
  );
}

function drawPokerCard(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  card: number,
) {
  ctx.shadowColor = "rgba(0,0,0,0.4)";
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 3;

  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 8);

  if (card < 0) {
    const grad = ctx.createLinearGradient(x, y, x + w, y + h);
    grad.addColorStop(0, "#3d1d5e");
    grad.addColorStop(1, "#1a0a2e");
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = "rgba(180,100,255,0.3)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = "rgba(180,100,255,0.15)";
    ctx.font = `${w * 0.4}px serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("♠", x + w / 2, y + h / 2);
  } else {
    ctx.fillStyle = "#fafafa";
    ctx.fill();

    const rank = RANKS[card % 13];
    const suit = SUITS[Math.floor(card / 13) % 4];
    const isRed = suit === "♥" || suit === "♦";

    ctx.fillStyle = isRed ? "#dc2626" : "#111";
    ctx.font = `bold ${w * 0.28}px 'Space Grotesk', system-ui`;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(rank, x + 6, y + 6);
    ctx.font = `${w * 0.22}px serif`;
    ctx.fillText(suit, x + 6, y + w * 0.28 + 4);

    ctx.font = `${w * 0.45}px serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(suit, x + w / 2, y + h / 2);
  }

  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
}
