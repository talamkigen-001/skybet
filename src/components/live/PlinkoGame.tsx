import { useEffect, useRef, useState, useCallback } from "react";
import { useGame } from "@/lib/game-store";
import { useLiveGame } from "@/lib/live-game-store";
import { LiveGameLayout } from "./LiveGameLayout";

const ROWS = 9; // Number of peg rows
const BINS = [10, 2, 0.5, 0.2, 0.5, 2, 10]; // Multipliers at the bottom
const BIN_COLORS = ["#ef4444", "#f97316", "#22c55e", "#64748b", "#22c55e", "#f97316", "#ef4444"];

interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  active: boolean;
  row: number;
  col: number;
}

export function PlinkoGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const balance = useGame((s) => s.balance);
  const betAmount = useLiveGame((s) => s.betAmount);
  const phase = useLiveGame((s) => s.phase);
  const finishRound = useLiveGame((s) => s.finishRound);
  const resetRound = useLiveGame((s) => s.resetRound);
  const setGameType = useLiveGame((s) => s.setGameType);
  const placeBet = useLiveGame((s) => s.placeBet);

  const ballRef = useRef<Ball | null>(null);
  const animFrameId = useRef<number>(0);

  useEffect(() => {
    setGameType("plinko");
  }, [setGameType]);

  const onPlay = useCallback(async () => {
    if (balance < betAmount) return;

    try {
      const res = await placeBet();
      if (!res) return;

      // Instantiate dropping ball at top center
      ballRef.current = {
        x: 0.5, // Normalized X center
        y: 0.1, // Normalized Y top
        vx: 0,
        vy: 0,
        radius: 6,
        active: true,
        row: 0,
        col: 0,
      };
    } catch (err) {
      console.error("Plinko play error:", err);
    }
  }, [balance, betAmount, placeBet]);

  // Main canvas drawing and physical ball animation
  useEffect(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext("2d")!;

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
      bg.addColorStop(0, "rgba(25, 20, 45, 0.95)");
      bg.addColorStop(1, "rgba(5, 5, 12, 1)");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      const boardTop = h * 0.15;
      const boardHeight = h * 0.6;
      const stepY = boardHeight / ROWS;

      // Draw peg board
      ctx.fillStyle = "#fff";
      ctx.globalAlpha = 0.5;
      for (let row = 0; row <= ROWS; row++) {
        const py = boardTop + row * stepY;
        const pegsInRow = row + 3;
        const rowWidth = pegsInRow * 24;
        const startX = w / 2 - rowWidth / 2 + 12;

        for (let col = 0; col < pegsInRow; col++) {
          const px = startX + col * 24;
          ctx.beginPath();
          ctx.arc(px, py, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;

      // Draw bottom bins
      const binY = boardTop + (ROWS + 1) * stepY;
      const binCount = BINS.length;
      const binWidth = 32;
      const binStartX = w / 2 - (binCount * binWidth) / 2;

      for (let i = 0; i < binCount; i++) {
        const bx = binStartX + i * binWidth;
        ctx.fillStyle = BIN_COLORS[i];
        ctx.beginPath();
        ctx.roundRect(bx + 2, binY, binWidth - 4, 20, 4);
        ctx.fill();

        ctx.font = "bold 9px 'Space Grotesk', system-ui";
        ctx.fillStyle = "#000";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(`${BINS[i]}x`, bx + binWidth / 2, binY + 10);
      }

      // Physics update & Draw dropping ball
      const ball = ballRef.current;
      if (ball && ball.active) {
        // Gravity
        ball.vy += 0.0003;
        ball.x += ball.vx;
        ball.y += ball.vy;

        // Nudge ball towards the server-resolved target bin index (stored in wheelResult field)
        const progress = (ball.y - 0.1) / 0.7; // 0 to 1
        if (progress > 0.4) {
          const targetBinIdx = useLiveGame.getState().wheelResult;
          const targetX = (binStartX + targetBinIdx * binWidth + binWidth / 2) / w;
          // Smoothly steer ball's horizontal position
          ball.x = ball.x + (targetX - ball.x) * 0.06 * progress;
        }

        // Current actual coordinates
        const bx = ball.x * w;
        const by = ball.y * h;

        // Collision with pegs
        const currentRow = Math.floor((by - boardTop) / stepY);
        if (currentRow >= 0 && currentRow <= ROWS) {
          const pegsInRow = currentRow + 3;
          const rowWidth = pegsInRow * 24;
          const startX = w / 2 - rowWidth / 2 + 12;

          for (let col = 0; col < pegsInRow; col++) {
            const px = startX + col * 24;
            const py = boardTop + currentRow * stepY;
            const dist = Math.hypot(bx - px, by - py);

            if (dist < ball.radius + 3) {
              // Collide, deflect left or right randomly
              const dir = Math.random() < 0.5 ? -1 : 1;
              ball.vx = dir * 0.003 + (Math.random() - 0.5) * 0.001;
              ball.vy = 0.001; // slow down vertical velocity
              ball.y = (py + 3) / h; // push past peg
            }
          }
        }

        // Draw ball
        ctx.fillStyle = "#ff4444";
        ctx.shadowColor = "#ff4444";
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(bx, by, ball.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Land in bin check
        if (by >= binY) {
          ball.active = false;

          const s = useLiveGame.getState();
          finishRound(s.roundResult, s.lastWin >= s.betAmount, s.lastWin);
        }
      }

      // Draw round multiplier if done
      const state = useLiveGame.getState();
      if (state.phase === "result") {
        ctx.font = "700 24px 'Space Grotesk', system-ui";
        ctx.fillStyle = "#ffd86b";
        ctx.textAlign = "center";
        ctx.fillText(`Outcome: ${state.roundResult}`, w / 2, h * 0.95);
      }

      animFrameId.current = requestAnimationFrame(draw);
    };

    animFrameId.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animFrameId.current);
  }, [betAmount, finishRound]);

  void phase;

  return (
    <LiveGameLayout
      title="Plinko"
      glyph="🔺"
      choices={[]}
      onPlay={onPlay}
      canPlay={phase === "betting"}
    >
      <canvas ref={canvasRef} className="w-full h-full" aria-label="Plinko Pegboard Game" />
    </LiveGameLayout>
  );
}
