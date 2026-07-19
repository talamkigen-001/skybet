import { useEffect, useRef, useCallback } from "react";
import { useLiveGame } from "@/lib/live-game-store";
import { LiveGameLayout } from "./LiveGameLayout";

const SEGMENTS = [
  { value: 1, color: "#f59e0b", label: "1" },
  { value: 2, color: "#3b82f6", label: "2" },
  { value: 5, color: "#8b5cf6", label: "5" },
  { value: 10, color: "#22c55e", label: "10" },
  { value: 20, color: "#ef4444", label: "20" },
  { value: 40, color: "#ec4899", label: "40" },
  { value: 1, color: "#f59e0b", label: "1" },
  { value: 2, color: "#3b82f6", label: "2" },
  { value: 5, color: "#8b5cf6", label: "5" },
  { value: 1, color: "#f59e0b", label: "1" },
  { value: 2, color: "#3b82f6", label: "2" },
  { value: 10, color: "#22c55e", label: "10" },
  { value: 1, color: "#f59e0b", label: "1" },
  { value: 5, color: "#8b5cf6", label: "5" },
  { value: 2, color: "#3b82f6", label: "2" },
  { value: 1, color: "#f59e0b", label: "1" },
  { value: 20, color: "#ef4444", label: "20" },
  { value: 2, color: "#3b82f6", label: "2" },
  { value: 1, color: "#f59e0b", label: "1" },
  { value: 5, color: "#8b5cf6", label: "5" },
  { value: 1, color: "#f59e0b", label: "1" },
  { value: 10, color: "#22c55e", label: "10" },
  { value: 2, color: "#3b82f6", label: "2" },
  { value: 1, color: "#f59e0b", label: "1" },
];

const CHOICES = [
  { id: "1", label: "1x", color: "#f59e0b", payout: "2x" },
  { id: "2", label: "2x", color: "#3b82f6", payout: "3x" },
  { id: "5", label: "5x", color: "#8b5cf6", payout: "6x" },
  { id: "10", label: "10x", color: "#22c55e", payout: "11x" },
  { id: "20", label: "20x", color: "#ef4444", payout: "21x" },
  { id: "40", label: "40x", color: "#ec4899", payout: "41x" },
];

export function WheelGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const phase = useLiveGame((s) => s.phase);
  const wheelResult = useLiveGame((s) => s.wheelResult);
  const wheelMultiplier = useLiveGame((s) => s.wheelMultiplier);
  const setGameType = useLiveGame((s) => s.setGameType);
  const placeBet = useLiveGame((s) => s.placeBet);
  const finishRound = useLiveGame((s) => s.finishRound);
  const spinAngleRef = useRef(0);

  useEffect(() => {
    setGameType("wheel");
  }, [setGameType]);

  const onPlay = useCallback(async () => {
    try {
      const res = await placeBet();
      if (!res) return;

      const targetValue = res.data.segment;
      // Find all matching segments indices
      const indices: number[] = [];
      SEGMENTS.forEach((seg, idx) => {
        if (seg.value === targetValue) indices.push(idx);
      });
      const resultIdx =
        indices.length > 0 ? indices[Math.floor(Math.random() * indices.length)] : 0;

      // Spin animation
      const targetAngle = (resultIdx / SEGMENTS.length) * Math.PI * 2;
      const fullRotations = 6 + Math.random() * 4;
      const totalTarget = fullRotations * Math.PI * 2 + targetAngle;
      let elapsed = 0;
      const duration = 5000;

      const animate = () => {
        elapsed += 16;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 4);
        spinAngleRef.current = eased * totalTarget;

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          finishRound(res.result, res.won, res.payout, {
            wheelResult: targetValue,
            wheelMultiplier: 1, // simplified lightning mult
          });
        }
      };
      requestAnimationFrame(animate);
    } catch (err) {
      console.error("Wheel play error:", err);
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

      // Dark background with electric atmosphere
      const bg = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.6);
      bg.addColorStop(0, "rgba(20, 15, 50, 0.95)");
      bg.addColorStop(1, "rgba(5, 5, 15, 1)");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      // Lightning bolt decorations
      ctx.strokeStyle = "rgba(255, 220, 100, 0.06)";
      ctx.lineWidth = 2;
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        const sx = Math.random() * w;
        ctx.moveTo(sx, 0);
        let cy = 0;
        while (cy < h) {
          cy += 20 + Math.random() * 30;
          ctx.lineTo(sx + (Math.random() - 0.5) * 40, cy);
        }
        ctx.stroke();
      }

      const cx = w / 2;
      const cy = h / 2;
      const radius = Math.min(w, h) * 0.38;
      const segAngle = (Math.PI * 2) / SEGMENTS.length;
      const angle = spinAngleRef.current;

      // Outer glow
      ctx.beginPath();
      ctx.arc(cx, cy, radius + 12, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255, 220, 80, 0.3)";
      ctx.lineWidth = 5;
      ctx.shadowColor = "rgba(255, 220, 80, 0.6)";
      ctx.shadowBlur = 25;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Segments
      for (let i = 0; i < SEGMENTS.length; i++) {
        const startA = i * segAngle - angle - Math.PI / 2;
        const endA = startA + segAngle;
        const seg = SEGMENTS[i];

        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, radius, startA, endA);
        ctx.closePath();

        ctx.fillStyle = seg.color;
        ctx.globalAlpha = 0.85;
        ctx.fill();
        ctx.globalAlpha = 1;

        ctx.strokeStyle = "rgba(255,255,255,0.2)";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Labels
        const midA = startA + segAngle / 2;
        const tx = cx + Math.cos(midA) * (radius * 0.7);
        const ty = cy + Math.sin(midA) * (radius * 0.7);

        ctx.save();
        ctx.translate(tx, ty);
        ctx.rotate(midA + Math.PI / 2);
        ctx.fillStyle = "#fff";
        ctx.font = `bold ${Math.max(12, radius * 0.1)}px 'Space Grotesk', system-ui`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(seg.label, 0, 0);
        ctx.restore();
      }

      // Center hub
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 0.15, 0, Math.PI * 2);
      const hubGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * 0.15);
      hubGrad.addColorStop(0, "#ffd86b");
      hubGrad.addColorStop(1, "#b8860b");
      ctx.fillStyle = hubGrad;
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.5)";
      ctx.lineWidth = 2;
      ctx.stroke();

      // ⚡ on hub
      ctx.font = `${radius * 0.12}px sans-serif`;
      ctx.fillStyle = "#000";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("⚡", cx, cy);

      // Pointer
      ctx.beginPath();
      ctx.moveTo(cx, cy - radius - 18);
      ctx.lineTo(cx - 12, cy - radius - 34);
      ctx.lineTo(cx + 12, cy - radius - 34);
      ctx.closePath();
      ctx.fillStyle = "#ffd86b";
      ctx.shadowColor = "rgba(255,200,80,0.8)";
      ctx.shadowBlur = 12;
      ctx.fill();
      ctx.shadowBlur = 0;

      // Result
      const s = useLiveGame.getState();
      if (s.phase === "result") {
        const won = s.lastWin > 0;
        const lightStr = s.wheelMultiplier > 1 ? ` ⚡${s.wheelMultiplier}x` : "";
        ctx.font = "700 36px 'Space Grotesk', system-ui";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = won ? "#22c55e" : "#ff5b5b";
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 15;
        ctx.fillText(`${s.wheelResult}x${lightStr}`, cx, cy);
        ctx.shadowBlur = 0;

        if (won) {
          ctx.font = "600 16px Inter, system-ui";
          ctx.fillText(`+${s.lastWin.toFixed(2)}`, cx, cy + 28);
        }
      } else if (s.phase === "betting") {
        ctx.font = "500 18px Inter, system-ui";
        ctx.fillStyle = "rgba(255,255,255,0.5)";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("Pick a segment", cx, cy);
      }

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  void phase;
  void wheelResult;
  void wheelMultiplier;

  return (
    <LiveGameLayout
      title="Lightning Wheel"
      glyph="⚡"
      choices={CHOICES}
      onPlay={onPlay}
      canPlay={phase === "betting"}
    >
      <canvas ref={canvasRef} className="w-full h-full" aria-label="Lightning wheel" />
    </LiveGameLayout>
  );
}
