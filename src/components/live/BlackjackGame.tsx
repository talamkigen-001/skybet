import { useEffect, useRef, useCallback } from "react";
import { useLiveGame, handValue } from "@/lib/live-game-store";
import { LiveGameLayout } from "./LiveGameLayout";

const CHOICES = [{ id: "deal", label: "♣ Deal", payout: "2x" }];

function drawCard(): number {
  return Math.floor(Math.random() * 52);
}

export function BlackjackGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const phase = useLiveGame((s) => s.phase);
  const playerCards = useLiveGame((s) => s.playerCards);
  const dealerCards = useLiveGame((s) => s.dealerCards);
  const playerValue = useLiveGame((s) => s.playerValue);
  const dealerValue = useLiveGame((s) => s.dealerValue);
  const blackjackPhase = useLiveGame((s) => s.blackjackPhase);
  const dealBlackjack = useLiveGame((s) => s.dealBlackjack);
  const setGameType = useLiveGame((s) => s.setGameType);
  const hit = useLiveGame((s) => s.hit);
  const stand = useLiveGame((s) => s.stand);
  const doubleDown = useLiveGame((s) => s.doubleDown);

  useEffect(() => {
    setGameType("blackjack");
  }, [setGameType]);

  const onPlay = useCallback(async () => {
    try {
      await dealBlackjack();
    } catch (err) {
      console.error("Blackjack play error:", err);
    }
  }, [dealBlackjack]);

  // Canvas rendering
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

      // Background - casino table green
      const bg = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.7);
      bg.addColorStop(0, "rgba(20, 80, 50, 0.95)");
      bg.addColorStop(1, "rgba(8, 30, 18, 1)");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      // Table felt pattern
      ctx.strokeStyle = "rgba(255,200,80,0.08)";
      ctx.lineWidth = 1;
      ctx.setLineDash([8, 8]);
      ctx.beginPath();
      ctx.arc(w / 2, h * 0.9, Math.min(w, h) * 0.65, Math.PI * 0.15, Math.PI * 0.85, true);
      ctx.stroke();
      ctx.setLineDash([]);

      const s = useLiveGame.getState();
      const cardW = Math.min(70, w * 0.1);
      const cardH = cardW * 1.4;

      // Dealer area label
      ctx.font = "600 14px Inter, system-ui";
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.textAlign = "center";
      ctx.fillText("DEALER", w / 2, h * 0.12);

      // Draw dealer cards
      const dealerStartX = w / 2 - (s.dealerCards.length * (cardW + 8)) / 2;
      s.dealerCards.forEach((card, i) => {
        const x = dealerStartX + i * (cardW + 8);
        const y = h * 0.15;
        const showFace = s.blackjackPhase === "result" || s.blackjackPhase === "dealer" || i === 0;
        drawCardRect(ctx, x, y, cardW, cardH, showFace ? card : -1);
      });

      // Dealer value
      if (s.dealerCards.length > 0) {
        const dv =
          s.blackjackPhase === "result" || s.blackjackPhase === "dealer"
            ? handValue(s.dealerCards)
            : handValue([s.dealerCards[0]]);
        ctx.font = "700 18px 'Space Grotesk', system-ui";
        ctx.fillStyle = dv > 21 ? "#ff5b5b" : "#ffd86b";
        ctx.textAlign = "center";
        ctx.fillText(
          `${dv}${s.blackjackPhase !== "result" && s.blackjackPhase !== "dealer" && s.dealerCards.length > 1 ? "+" : ""}`,
          w / 2,
          h * 0.15 + cardH + 24,
        );
      }

      // Player area label
      ctx.font = "600 14px Inter, system-ui";
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.textAlign = "center";
      ctx.fillText("YOUR HAND", w / 2, h * 0.53);

      // Draw player cards
      const playerStartX = w / 2 - (s.playerCards.length * (cardW + 8)) / 2;
      s.playerCards.forEach((card, i) => {
        const x = playerStartX + i * (cardW + 8);
        const y = h * 0.56;
        drawCardRect(ctx, x, y, cardW, cardH, card);
      });

      // Player value
      if (s.playerCards.length > 0) {
        ctx.font = "700 22px 'Space Grotesk', system-ui";
        ctx.fillStyle = s.playerValue > 21 ? "#ff5b5b" : s.playerValue === 21 ? "#22c55e" : "#fff";
        ctx.textAlign = "center";
        ctx.fillText(String(s.playerValue), w / 2, h * 0.56 + cardH + 28);
      }

      // Action buttons (hit/stand/double) rendered on canvas during player phase
      if (s.blackjackPhase === "player" && s.playerValue < 21) {
        const btnY = h * 0.56 + cardH + 50;
        const btnW = 80;
        const btnH = 32;
        const gap = 12;
        const totalW = btnW * 3 + gap * 2;
        const startX = w / 2 - totalW / 2;

        const buttons = [
          { label: "HIT", color: "#22c55e" },
          { label: "STAND", color: "#f59e0b" },
          { label: "DOUBLE", color: "#8b5cf6" },
        ];

        buttons.forEach((btn, i) => {
          const bx = startX + i * (btnW + gap);
          ctx.fillStyle = btn.color;
          ctx.globalAlpha = 0.9;
          ctx.beginPath();
          ctx.roundRect(bx, btnY, btnW, btnH, 8);
          ctx.fill();
          ctx.globalAlpha = 1;

          ctx.font = "700 12px Inter, system-ui";
          ctx.fillStyle = "#fff";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(btn.label, bx + btnW / 2, btnY + btnH / 2);
        });
      }

      // Result overlay
      if (s.phase === "result") {
        ctx.font = "700 36px 'Space Grotesk', system-ui";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const won = s.lastWin > 0;
        ctx.fillStyle = won ? "#22c55e" : "#ff5b5b";
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 20;
        ctx.fillText(s.roundResult, w / 2, h * 0.48);
        ctx.shadowBlur = 0;
      } else if (s.phase === "betting") {
        ctx.font = "500 22px Inter, system-ui";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "rgba(255,255,255,0.6)";
        ctx.fillText("Select 'Deal' and place your bet", w / 2, h / 2);
      }

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Handle canvas clicks for hit/stand/double buttons
  useEffect(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;

    const handleClick = (e: MouseEvent) => {
      const s = useLiveGame.getState();
      if (s.blackjackPhase !== "player" || s.playerValue >= 21) return;

      const rect = cvs.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const w = rect.width;
      const h = rect.height;

      const cardW = Math.min(70, w * 0.1);
      const cardH = cardW * 1.4;
      const btnY = h * 0.56 + cardH + 50;
      const btnW = 80;
      const btnH = 32;
      const gap = 12;
      const totalW = btnW * 3 + gap * 2;
      const startX = w / 2 - totalW / 2;

      for (let i = 0; i < 3; i++) {
        const bx = startX + i * (btnW + gap);
        if (mx >= bx && mx <= bx + btnW && my >= btnY && my <= btnY + btnH) {
          if (i === 0) hit();
          else if (i === 1) stand();
          else if (i === 2) doubleDown();
          break;
        }
      }
    };

    cvs.addEventListener("click", handleClick);
    return () => cvs.removeEventListener("click", handleClick);
  }, [hit, stand, doubleDown]);

  void phase;
  void playerCards;
  void dealerCards;
  void playerValue;
  void dealerValue;
  void blackjackPhase;

  return (
    <LiveGameLayout
      title="Grandeur Blackjack"
      glyph="♣"
      choices={CHOICES}
      onPlay={onPlay}
      canPlay={phase === "betting"}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-pointer"
        aria-label="Blackjack table"
      />
    </LiveGameLayout>
  );
}

// ─── Card drawing helper ──────────────────────────────────────────────────────

const CARD_RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const CARD_SUITS = ["♠", "♥", "♦", "♣"];
const RED_SUITS = new Set(["♥", "♦"]);

function drawCardRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  card: number,
) {
  // Card shadow
  ctx.shadowColor = "rgba(0,0,0,0.4)";
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 3;

  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 8);

  if (card < 0) {
    // Face down
    const grad = ctx.createLinearGradient(x, y, x + w, y + h);
    grad.addColorStop(0, "#2d2d5e");
    grad.addColorStop(1, "#1a1a3e");
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = "rgba(255,200,80,0.3)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Pattern
    ctx.fillStyle = "rgba(255,200,80,0.1)";
    ctx.font = `${w * 0.4}px serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("?", x + w / 2, y + h / 2);
  } else {
    // Face up
    ctx.fillStyle = "#fafafa";
    ctx.fill();

    const rank = CARD_RANKS[card % 13];
    const suit = CARD_SUITS[Math.floor(card / 13) % 4];
    const isRed = RED_SUITS.has(suit);

    ctx.fillStyle = isRed ? "#dc2626" : "#111";
    ctx.font = `bold ${w * 0.28}px 'Space Grotesk', system-ui`;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(rank, x + 5, y + 5);
    ctx.font = `${w * 0.22}px serif`;
    ctx.fillText(suit, x + 5, y + w * 0.28 + 5);

    // Center suit
    ctx.font = `${w * 0.45}px serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(suit, x + w / 2, y + h / 2);
  }

  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
}
