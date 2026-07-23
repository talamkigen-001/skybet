"use client";
import { useEffect, useRef, useCallback } from "react";
import { useLiveGame } from "@/lib/live-game-store";
import { LiveGameLayout } from "./LiveGameLayout";

const DC_SEGMENTS = [
  { value: 1, color: "#f59e0b", weight: 23 },
  { value: 2, color: "#3b82f6", weight: 15 },
  { value: 5, color: "#8b5cf6", weight: 7 },
  { value: 10, color: "#22c55e", weight: 4 },
  { value: 20, color: "#ef4444", weight: 2 },
  { value: 40, color: "#ec4899", weight: 1 },
  { value: -2, color: "#fbbf24", weight: 1 }, // 2x multiplier segment
  { value: -7, color: "#a78bfa", weight: 1 }, // 7x multiplier segment
];

// Build the actual wheel with proper segment distribution
function buildWheel(): { value: number; color: string; label: string }[] {
  const wheel: { value: number; color: string; label: string }[] = [];
  for (const seg of DC_SEGMENTS) {
    for (let i = 0; i < seg.weight; i++) {
      if (seg.value < 0) {
        wheel.push({ value: seg.value, color: seg.color, label: `${Math.abs(seg.value)}x MULT` });
      } else {
        wheel.push({ value: seg.value, color: seg.color, label: String(seg.value) });
      }
    }
  }
  return wheel;
}

const WHEEL = buildWheel();

const CHOICES = [
  { id: "1", label: "💰 1", color: "#f59e0b", payout: "2x" },
  { id: "2", label: "💎 2", color: "#3b82f6", payout: "3x" },
  { id: "5", label: "⭐ 5", color: "#8b5cf6", payout: "6x" },
  { id: "10", label: "🔥 10", color: "#22c55e", payout: "11x" },
  { id: "20", label: "👑 20", color: "#ef4444", payout: "21x" },
  { id: "40", label: "🌟 40", color: "#ec4899", payout: "41x" },
];

export function DreamCatcherGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const phase = useLiveGame((s) => s.phase);
  const dreamSegment = useLiveGame((s) => s.dreamSegment);
  const dreamMultiplierActive = useLiveGame((s) => s.dreamMultiplierActive);
  const setGameType = useLiveGame((s) => s.setGameType);
  const placeBet = useLiveGame((s) => s.placeBet);
  const finishRound = useLiveGame((s) => s.finishRound);
  const spinAngleRef = useRef(0);
  const particlesRef = useRef<
    { x: number; y: number; vx: number; vy: number; life: number; color: string }[]
  >([]);

  useEffect(() => {
    setGameType("dreamcatcher");
  }, [setGameType]);

  const onPlay = useCallback(async () => {
    try {
      const res = await placeBet();
      if (!res) return;

      const targetValue = res.data.segment;
      // Find matching wheel index
      const indexes: number[] = [];
      WHEEL.forEach((seg, idx) => {
        if (seg.value === targetValue) indexes.push(idx);
      });
      const resultIdx = indexes[Math.floor(Math.random() * indexes.length)];

      // Spin
      const targetAngle = (resultIdx / WHEEL.length) * Math.PI * 2;
      const fullRotations = 5 + Math.random() * 5;
      const totalTarget = fullRotations * Math.PI * 2 + targetAngle;
      const duration = 5000;

      const doSpin = (target: number, dur: number, onDone: () => void) => {
        let el = 0;
        const startAngle = spinAngleRef.current;
        const animate = () => {
          el += 16;
          const progress = Math.min(el / dur, 1);
          const eased = 1 - Math.pow(1 - progress, 4);
          spinAngleRef.current = startAngle + eased * target;

          if (progress < 1) {
            requestAnimationFrame(animate);
          } else {
            onDone();
          }
        };
        requestAnimationFrame(animate);
      };

      doSpin(totalTarget, duration, () => {
        finishRound(res.result, res.won, res.payout, {
          dreamSegment: targetValue,
          dreamMultiplierActive: false,
        });

        // Spawn particles on win
        if (res.won) {
          const cx = 300; // approximate
          for (let i = 0; i < 30; i++) {
            particlesRef.current.push({
              x: cx,
              y: 200,
              vx: (Math.random() - 0.5) * 8,
              vy: -Math.random() * 6 - 2,
              life: 60,
              color: ["#ffd86b", "#22c55e", "#ec4899", "#3b82f6"][Math.floor(Math.random() * 4)],
            });
          }
        }
      });
    } catch (err) {
      console.error("Dream Catcher play error:", err);
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

      // Dreamy background
      const bg = ctx.createRadialGradient(w / 2, h * 0.4, 0, w / 2, h * 0.4, Math.max(w, h) * 0.7);
      bg.addColorStop(0, "rgba(40, 20, 60, 0.95)");
      bg.addColorStop(0.5, "rgba(20, 10, 40, 0.98)");
      bg.addColorStop(1, "rgba(8, 5, 15, 1)");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      // Sparkle dots
      const time = performance.now() / 1000;
      for (let i = 0; i < 40; i++) {
        const sx = (Math.sin(i * 73.1 + time * 0.3) * 0.5 + 0.5) * w;
        const sy = (Math.cos(i * 42.7 + time * 0.2) * 0.5 + 0.5) * h;
        const alpha = Math.sin(time * 2 + i) * 0.3 + 0.3;
        ctx.fillStyle = `rgba(255,200,255,${alpha})`;
        ctx.fillRect(sx, sy, 2, 2);
      }

      const cx = w / 2;
      const cy = h / 2;
      const radius = Math.min(w, h) * 0.36;
      const segAngle = (Math.PI * 2) / WHEEL.length;
      const angle = spinAngleRef.current;

      // Outer ring with pegs
      ctx.beginPath();
      ctx.arc(cx, cy, radius + 10, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255,200,255,0.2)";
      ctx.lineWidth = 6;
      ctx.stroke();

      // Pegs
      for (let i = 0; i < WHEEL.length; i++) {
        const a = i * segAngle - angle - Math.PI / 2;
        const px = cx + Math.cos(a) * (radius + 10);
        const py = cy + Math.sin(a) * (radius + 10);
        ctx.beginPath();
        ctx.arc(px, py, 3, 0, Math.PI * 2);
        ctx.fillStyle = "#ffd86b";
        ctx.fill();
      }

      // Segments
      for (let i = 0; i < WHEEL.length; i++) {
        const startA = i * segAngle - angle - Math.PI / 2;
        const endA = startA + segAngle;
        const seg = WHEEL[i];

        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, radius, startA, endA);
        ctx.closePath();

        ctx.fillStyle = seg.color;
        ctx.globalAlpha = 0.8;
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
        ctx.font = `bold ${Math.max(8, radius * 0.06)}px 'Space Grotesk', system-ui`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(seg.label, 0, 0);
        ctx.restore();
      }

      // Center
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 0.18, 0, Math.PI * 2);
      const hubGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * 0.18);
      hubGrad.addColorStop(0, "#f0e0ff");
      hubGrad.addColorStop(1, "#8b5cf6");
      ctx.fillStyle = hubGrad;
      ctx.fill();

      ctx.font = `${radius * 0.1}px sans-serif`;
      ctx.fillStyle = "#fff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("◎", cx, cy);

      // Pointer (right side)
      ctx.beginPath();
      ctx.moveTo(cx + radius + 18, cy);
      ctx.lineTo(cx + radius + 32, cy - 10);
      ctx.lineTo(cx + radius + 32, cy + 10);
      ctx.closePath();
      ctx.fillStyle = "#ffd86b";
      ctx.shadowColor = "rgba(255,200,80,0.8)";
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.shadowBlur = 0;

      // Particles
      const particles = particlesRef.current;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.15;
        p.life--;
        if (p.life <= 0) {
          particles.splice(i, 1);
          continue;
        }
        ctx.globalAlpha = p.life / 60;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, 4, 4);
      }
      ctx.globalAlpha = 1;

      // Result / state text
      const s = useLiveGame.getState();
      if (s.dreamMultiplierActive) {
        ctx.font = "700 32px 'Space Grotesk', system-ui";
        ctx.fillStyle = "#ffd86b";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.shadowColor = "#ffd86b";
        ctx.shadowBlur = 20;
        ctx.fillText("MULTIPLIER!", cx, cy);
        ctx.shadowBlur = 0;
      } else if (s.phase === "result") {
        const won = s.lastWin > 0;
        ctx.font = "700 32px 'Space Grotesk', system-ui";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = won ? "#22c55e" : "#ff5b5b";
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 15;
        ctx.fillText(s.roundResult, cx, cy);
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
        ctx.fillText("Pick a number", cx, cy);
      }

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  void phase;
  void dreamSegment;
  void dreamMultiplierActive;

  return (
    <LiveGameLayout
      title="Dream Catcher Pro"
      glyph="◎"
      choices={CHOICES}
      onPlay={onPlay}
      canPlay={phase === "betting"}
    >
      <canvas ref={canvasRef} className="w-full h-full" aria-label="Dream Catcher wheel" />
    </LiveGameLayout>
  );
}
