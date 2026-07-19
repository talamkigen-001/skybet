import { useEffect, useRef, useCallback, useState } from "react";
import { useLiveGame } from "@/lib/live-game-store";
import { LiveGameLayout } from "./LiveGameLayout";

const CHOICES = [
  { id: "red", label: "🔴 Red Side", color: "#ef4444", payout: "Flexible Multiplier" },
  { id: "blue", label: "🔵 Blue Side", color: "#3b82f6", payout: "Flexible Multiplier" },
];

export function CoinFlipGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const phase = useLiveGame((s) => s.phase);
  const setGameType = useLiveGame((s) => s.setGameType);
  const placeBet = useLiveGame((s) => s.placeBet);
  const finishRound = useLiveGame((s) => s.finishRound);

  // Flipper state
  const [multipliers, setMultipliers] = useState<{ red: number; blue: number }>({
    red: 2,
    blue: 2,
  });
  const spinProgressRef = useRef(0);
  const coinSideRef = useRef<"red" | "blue">("red");
  const isFlippingRef = useRef(false);

  useEffect(() => {
    setGameType("coinflip");
  }, [setGameType]);

  const onPlay = useCallback(async () => {
    try {
      const res = await placeBet();
      if (!res) return;

      const outcome = res.data.coin; // 'red' or 'blue'
      const mRed = 2;
      const mBlue = 2;
      setMultipliers({ red: mRed, blue: mBlue });

      coinSideRef.current = outcome;
      spinProgressRef.current = 0;
      isFlippingRef.current = true;

      // Flip animation (3D coin spin simulation)
      let elapsed = 0;
      const duration = 3000;
      const totalFlips = 12; // number of full rotations

      const animate = () => {
        elapsed += 16;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3); // Ease out
        spinProgressRef.current = eased * totalFlips * Math.PI;

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          isFlippingRef.current = false;
          finishRound(outcome.toUpperCase(), res.won, res.payout);
        }
      };
      requestAnimationFrame(animate);
    } catch (err) {
      console.error("Coin Flip play error:", err);
    }
  }, [placeBet, finishRound]);

  // Canvas drawing
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

      // Background gradient
      const bg = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.6);
      bg.addColorStop(0, "rgba(20, 35, 45, 0.95)");
      bg.addColorStop(1, "rgba(5, 10, 15, 1)");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      const cx = w / 2;
      const cy = h / 2;
      const state = useLiveGame.getState();

      // Draw active multipliers (red/blue sides)
      if (state.phase !== "betting") {
        // Red multiplier left
        ctx.fillStyle = "#ef4444";
        ctx.font = "bold 14px 'Space Grotesk', system-ui";
        ctx.textAlign = "left";
        ctx.fillText(`Red Side: ${multipliers.red}x`, w * 0.1, h * 0.15);

        // Blue multiplier right
        ctx.fillStyle = "#3b82f6";
        ctx.textAlign = "right";
        ctx.fillText(`Blue Side: ${multipliers.blue}x`, w * 0.9, h * 0.15);
      }

      // Draw Spinning 3D Coin Flipper
      if (state.phase !== "betting") {
        ctx.save();
        ctx.translate(cx, cy);

        // Calculate 3D vertical scale
        const angle = spinProgressRef.current;
        const scaleY = Math.abs(Math.cos(angle));

        // Determine visible face side
        const fullTurns = Math.floor(angle / Math.PI);
        const faceIsRed = fullTurns % 2 === 0;

        ctx.scale(1, scaleY);

        // Coin shadow
        ctx.shadowColor = "rgba(0,0,0,0.5)";
        ctx.shadowBlur = 20;
        ctx.shadowOffsetY = 15;

        // Coin body
        ctx.beginPath();
        ctx.arc(0, 0, 70, 0, Math.PI * 2);
        ctx.fillStyle = faceIsRed ? "#ef4444" : "#3b82f6";
        ctx.fill();

        ctx.shadowColor = "transparent";
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;

        // Outer border
        ctx.strokeStyle = "#ffd86b";
        ctx.lineWidth = 6;
        ctx.stroke();

        // Inner text (mult or emblem)
        ctx.fillStyle = "#fff";
        ctx.font = "bold 26px 'Space Grotesk', system-ui";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(faceIsRed ? "RED" : "BLUE", 0, 0);

        ctx.restore();
      }

      // Results overlay
      if (state.phase === "result") {
        const won = state.lastWin > 0;
        ctx.font = "700 32px 'Space Grotesk', system-ui";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = won ? "#22c55e" : "#ff5b5b";
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 15;
        ctx.fillText(state.roundResult, cx, h * 0.85);
        ctx.shadowBlur = 0;
        if (won) {
          ctx.font = "600 16px Inter, system-ui";
          ctx.fillText(`+${state.lastWin.toFixed(2)}`, cx, h * 0.85 + 28);
        }
      } else if (state.phase === "betting") {
        ctx.font = "500 20px Inter, system-ui";
        ctx.fillStyle = "rgba(255,255,255,0.5)";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("Bet on Red or Blue Side", cx, cy);
      }

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [multipliers]);

  void phase;

  return (
    <LiveGameLayout
      title="Coin Flip"
      glyph="🪙"
      choices={CHOICES}
      onPlay={onPlay}
      canPlay={phase === "betting"}
    >
      <canvas ref={canvasRef} className="w-full h-full" aria-label="Coin Flip Game View" />
    </LiveGameLayout>
  );
}
