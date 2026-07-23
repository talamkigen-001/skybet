"use client";
import { useEffect, useRef, useCallback } from "react";
import { useLiveGame, ROULETTE_NUMBERS, RED_NUMBERS } from "@/lib/live-game-store";
import { LiveGameLayout } from "./LiveGameLayout";

const CHOICES = [
  { id: "red", label: "🔴 Red", color: "#ef4444", payout: "2x" },
  { id: "black", label: "⚫ Black", color: "#1e1e2e", payout: "2x" },
  { id: "green", label: "🟢 Zero", color: "#22c55e", payout: "36x" },
  { id: "odd", label: "Odd", payout: "2x" },
  { id: "even", label: "Even", payout: "2x" },
  { id: "1-18", label: "1–18", payout: "2x" },
  { id: "19-36", label: "19–36", payout: "2x" },
];

export function RouletteGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const phase = useLiveGame((s) => s.phase);
  const rouletteNumber = useLiveGame((s) => s.rouletteNumber);
  const placeBet = useLiveGame((s) => s.placeBet);
  const finishRound = useLiveGame((s) => s.finishRound);
  const selectedChoice = useLiveGame((s) => s.selectedChoice);
  const betAmount = useLiveGame((s) => s.betAmount);
  const setGameType = useLiveGame((s) => s.setGameType);
  const spinAngleRef = useRef(0);
  const spinSpeedRef = useRef(0);
  const isSpinningRef = useRef(false);
  const resultNumRef = useRef(-1);

  useEffect(() => {
    setGameType("roulette");
  }, [setGameType]);

  const onPlay = useCallback(async () => {
    try {
      const res = await placeBet();
      if (!res) return;

      const targetNum = res.data.number;
      const idx = ROULETTE_NUMBERS.findIndex((x) => x.num === targetNum);
      resultNumRef.current = targetNum;

      // Start spin animation
      const targetAngle = (idx / ROULETTE_NUMBERS.length) * Math.PI * 2;
      const fullRotations = 5 + Math.random() * 3;
      spinAngleRef.current = 0;
      spinSpeedRef.current = 0.15 + Math.random() * 0.05;
      isSpinningRef.current = true;

      const totalTarget = fullRotations * Math.PI * 2 + targetAngle;
      let elapsed = 0;
      const duration = 4000;

      const animate = () => {
        elapsed += 16;
        const progress = Math.min(elapsed / duration, 1);
        // Ease out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        spinAngleRef.current = eased * totalTarget;

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          isSpinningRef.current = false;
          finishRound(`${res.data.number} ${res.data.color}`, res.won, res.payout, {
            rouletteNumber: res.data.number,
          });
        }
      };
      requestAnimationFrame(animate);
    } catch (err) {
      console.error("Roulette play error:", err);
    }
  }, [placeBet, finishRound]);

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

      // Background
      const bg = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.6);
      bg.addColorStop(0, "rgba(30, 60, 40, 0.9)");
      bg.addColorStop(1, "rgba(10, 15, 12, 1)");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      // Draw wheel
      const cx = w / 2;
      const cy = h / 2;
      const radius = Math.min(w, h) * 0.38;
      const segmentAngle = (Math.PI * 2) / ROULETTE_NUMBERS.length;
      const currentAngle = spinAngleRef.current;

      // Outer ring glow
      ctx.beginPath();
      ctx.arc(cx, cy, radius + 8, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255, 200, 80, 0.3)";
      ctx.lineWidth = 4;
      ctx.shadowColor = "rgba(255, 200, 80, 0.5)";
      ctx.shadowBlur = 20;
      ctx.stroke();
      ctx.shadowBlur = 0;

      for (let i = 0; i < ROULETTE_NUMBERS.length; i++) {
        const startA = i * segmentAngle - currentAngle - Math.PI / 2;
        const endA = startA + segmentAngle;
        const entry = ROULETTE_NUMBERS[i];

        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, radius, startA, endA);
        ctx.closePath();

        if (entry.color === "red") ctx.fillStyle = "#dc2626";
        else if (entry.color === "black") ctx.fillStyle = "#1e1e2e";
        else ctx.fillStyle = "#16a34a";
        ctx.fill();

        ctx.strokeStyle = "rgba(255,255,255,0.15)";
        ctx.lineWidth = 1;
        ctx.stroke();

        // Number labels
        const midA = startA + segmentAngle / 2;
        const tx = cx + Math.cos(midA) * (radius * 0.78);
        const ty = cy + Math.sin(midA) * (radius * 0.78);

        ctx.save();
        ctx.translate(tx, ty);
        ctx.rotate(midA + Math.PI / 2);
        ctx.fillStyle = "#fff";
        ctx.font = `bold ${Math.max(10, radius * 0.08)}px 'Space Grotesk', system-ui`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(entry.num), 0, 0);
        ctx.restore();
      }

      // Center circle
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 0.18, 0, Math.PI * 2);
      const centerGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * 0.18);
      centerGrad.addColorStop(0, "#3a3a4a");
      centerGrad.addColorStop(1, "#1a1a2a");
      ctx.fillStyle = centerGrad;
      ctx.fill();
      ctx.strokeStyle = "rgba(255,200,80,0.5)";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Ball pointer (top)
      ctx.beginPath();
      ctx.moveTo(cx, cy - radius - 15);
      ctx.lineTo(cx - 10, cy - radius - 28);
      ctx.lineTo(cx + 10, cy - radius - 28);
      ctx.closePath();
      ctx.fillStyle = "#ffd86b";
      ctx.shadowColor = "rgba(255,200,80,0.8)";
      ctx.shadowBlur = 12;
      ctx.fill();
      ctx.shadowBlur = 0;

      // Result text
      const state = useLiveGame.getState();
      if (state.phase === "result" && state.rouletteNumber >= 0) {
        const num = state.rouletteNumber;
        const color = num === 0 ? "green" : RED_NUMBERS.has(num) ? "red" : "black";
        ctx.font = "700 48px 'Space Grotesk', system-ui";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = color === "red" ? "#ef4444" : color === "green" ? "#22c55e" : "#fff";
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 20;
        ctx.fillText(String(num), cx, cy);
        ctx.shadowBlur = 0;

        // Win/loss banner
        const won = state.lastWin > 0;
        ctx.font = "600 20px Inter, system-ui";
        ctx.fillStyle = won ? "#22c55e" : "#ff5b5b";
        ctx.fillText(won ? `WIN! +${state.lastWin.toFixed(2)}` : "No win", cx, cy + 40);
      } else if (state.phase === "betting") {
        ctx.font = "500 22px Inter, system-ui";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "rgba(255,255,255,0.7)";
        ctx.fillText("Place your bet", cx, cy);
      }

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Keep canvas reactive
  void phase;
  void rouletteNumber;

  return (
    <LiveGameLayout
      title="Velvet Roulette Live"
      glyph="⚂"
      choices={CHOICES}
      onPlay={onPlay}
      canPlay={phase === "betting"}
    >
      <canvas ref={canvasRef} className="w-full h-full" aria-label="Roulette wheel" />
    </LiveGameLayout>
  );
}
