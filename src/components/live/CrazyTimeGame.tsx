"use client";
import { useEffect, useRef, useCallback } from "react";
import { useLiveGame } from "@/lib/live-game-store";
import { LiveGameLayout } from "./LiveGameLayout";

const CT_SEGMENTS = [
  { value: "1", color: "#facc15", label: "1" },
  { value: "2", color: "#3b82f6", label: "2" },
  { value: "5", color: "#8b5cf6", label: "5" },
  { value: "10", color: "#22c55e", label: "10" },
  { value: "Coin Flip", color: "#f97316", label: "COIN FLIP" },
  { value: "1", color: "#facc15", label: "1" },
  { value: "2", color: "#3b82f6", label: "2" },
  { value: "Cash Hunt", color: "#ec4899", label: "CASH HUNT" },
  { value: "5", color: "#8b5cf6", label: "5" },
  { value: "1", color: "#facc15", label: "1" },
  { value: "Pachinko", color: "#10b981", label: "PACHINKO" },
  { value: "2", color: "#3b82f6", label: "2" },
  { value: "Crazy Time", color: "#ef4444", label: "CRAZY TIME" },
];

const CHOICES = [
  { id: "1", label: "💰 1", color: "#facc15", payout: "2x" },
  { id: "2", label: "💎 2", color: "#3b82f6", payout: "3x" },
  { id: "5", label: "⭐ 5", color: "#8b5cf6", payout: "6x" },
  { id: "10", label: "🔥 10", color: "#22c55e", payout: "11x" },
  { id: "bonus", label: "🎉 Bonus Game", color: "#ef4444", payout: "Up to 50x" },
];

export function CrazyTimeGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const phase = useLiveGame((s) => s.phase);
  const setGameType = useLiveGame((s) => s.setGameType);
  const placeBet = useLiveGame((s) => s.placeBet);
  const finishRound = useLiveGame((s) => s.finishRound);
  const spinAngleRef = useRef(0);

  useEffect(() => {
    setGameType("crazytime");
  }, [setGameType]);

  const onPlay = useCallback(async () => {
    try {
      const res = await placeBet();
      if (!res) return;

      let targetValStr = String(res.data.segment);
      if (targetValStr === "20") targetValStr = "Pachinko";
      if (targetValStr === "40") targetValStr = "Crazy Time";

      const indexes: number[] = [];
      CT_SEGMENTS.forEach((seg, idx) => {
        if (seg.value === targetValStr) indexes.push(idx);
      });
      const resultIdx =
        indexes.length > 0 ? indexes[Math.floor(Math.random() * indexes.length)] : 0;

      // Spin animation parameters
      const targetAngle = (resultIdx / CT_SEGMENTS.length) * Math.PI * 2;
      const rotations = 6 + Math.random() * 4;
      const totalAngle = rotations * Math.PI * 2 + targetAngle;
      let elapsed = 0;
      const duration = 5000;

      const animate = () => {
        elapsed += 16;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 4);
        spinAngleRef.current = eased * totalAngle;

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          finishRound(res.result, res.won, res.payout, {
            wheelResult: Number(res.data.segment),
            wheelMultiplier: res.won ? res.payout / res.betAmount : 1,
          });
        }
      };
      requestAnimationFrame(animate);
    } catch (err) {
      console.error("Crazy Time play error:", err);
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

      // Gradient background
      const bg = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.6);
      bg.addColorStop(0, "rgba(45, 10, 30, 0.95)");
      bg.addColorStop(1, "rgba(10, 2, 12, 1)");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      const cx = w / 2;
      const cy = h / 2;
      const radius = Math.min(w, h) * 0.36;
      const segAngle = (Math.PI * 2) / CT_SEGMENTS.length;
      const currentAngle = spinAngleRef.current;

      // Draw outer wheel rim
      ctx.beginPath();
      ctx.arc(cx, cy, radius + 10, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(236, 72, 153, 0.25)";
      ctx.lineWidth = 6;
      ctx.stroke();

      // Draw segments
      for (let i = 0; i < CT_SEGMENTS.length; i++) {
        const startA = i * segAngle - currentAngle - Math.PI / 2;
        const endA = startA + segAngle;
        const seg = CT_SEGMENTS[i];

        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, radius, startA, endA);
        ctx.closePath();

        ctx.fillStyle = seg.color;
        ctx.globalAlpha = 0.85;
        ctx.fill();
        ctx.globalAlpha = 1;

        ctx.strokeStyle = "rgba(255,255,255,0.15)";
        ctx.lineWidth = 1;
        ctx.stroke();

        // Label
        const midA = startA + segAngle / 2;
        const tx = cx + Math.cos(midA) * (radius * 0.7);
        const ty = cy + Math.sin(midA) * (radius * 0.7);

        ctx.save();
        ctx.translate(tx, ty);
        ctx.rotate(midA + Math.PI / 2);
        ctx.fillStyle = "#fff";
        ctx.font = `bold ${Math.max(8, radius * 0.07)}px 'Space Grotesk', system-ui`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(seg.label, 0, 0);
        ctx.restore();
      }

      // Center Hub
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 0.16, 0, Math.PI * 2);
      const hubGrd = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * 0.16);
      hubGrd.addColorStop(0, "#fff");
      hubGrd.addColorStop(1, "#ec4899");
      ctx.fillStyle = hubGrd;
      ctx.fill();

      ctx.fillStyle = "#000";
      ctx.font = "bold 11px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("🌟", cx, cy);

      // Flapper pointer (top)
      ctx.beginPath();
      ctx.moveTo(cx, cy - radius - 15);
      ctx.lineTo(cx - 10, cy - radius - 30);
      ctx.lineTo(cx + 10, cy - radius - 30);
      ctx.closePath();
      ctx.fillStyle = "#ec4899";
      ctx.fill();

      // Text outcomes
      const state = useLiveGame.getState();
      if (state.phase === "result") {
        const won = state.lastWin > 0;
        ctx.font = "700 32px 'Space Grotesk', system-ui";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = won ? "#22c55e" : "#ff5b5b";
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 15;
        ctx.fillText(state.roundResult, cx, cy);
        ctx.shadowBlur = 0;
        if (won) {
          ctx.font = "600 16px Inter, system-ui";
          ctx.fillText(`+${state.lastWin.toFixed(2)}`, cx, cy + 28);
        }
      } else if (state.phase === "betting") {
        ctx.font = "500 18px Inter, system-ui";
        ctx.fillStyle = "rgba(255,255,255,0.5)";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("Place your bets", cx, cy);
      }

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  void phase;

  return (
    <LiveGameLayout
      title="Crazy Time"
      glyph="🎡"
      choices={CHOICES}
      onPlay={onPlay}
      canPlay={phase === "betting"}
    >
      <canvas ref={canvasRef} className="w-full h-full" aria-label="Crazy Time Money Wheel" />
    </LiveGameLayout>
  );
}
