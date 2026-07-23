"use client";
import { useEffect, useRef } from "react";
import { useGame } from "@/lib/game-store";
import { useLiveGame } from "@/lib/live-game-store";
import { LiveGameLayout } from "./LiveGameLayout";

interface Props {
  slug: "lucky-jet" | "speed-and-cash" | "rocket-queen" | "aviator" | "jetx";
  title: string;
  glyph: string;
}

const CHOICES = [{ id: "bet", label: "Bet / Play", payout: "Dynamic Multiplier" }];

export function CrashVariantGame({ slug, title, glyph }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const init = useGame((s) => s.init);
  const phase = useGame((s) => s.phase);
  const multiplier = useGame((s) => s.multiplier);
  const crashPoint = useGame((s) => s.crashPoint);
  const countdown = useGame((s) => s.countdown);
  const placeBet = useGame((s) => s.placeBet);
  const cancelBet = useGame((s) => s.cancelBet);
  const cashOut = useGame((s) => s.cashOut);
  const myBet = useGame((s) => s.myBet);
  const balance = useGame((s) => s.balance);
  const betAmount = useGame((s) => s.betAmount);
  const pendingBet = useGame((s) => s.pendingBet);

  // Sync to Live Game store for the Sidebar/History
  const finishRound = useLiveGame((s) => s.finishRound);
  const setGameType = useLiveGame((s) => s.setGameType);

  useEffect(() => {
    void init();
    setGameType("roulette"); // placeholder choice type
  }, [init, setGameType]);

  // Sync history and local round outcomes to Live store
  const lastPhaseRef = useRef(phase);
  useEffect(() => {
    if (phase === "crashed" && lastPhaseRef.current !== "crashed") {
      const isWon = !!myBet?.cashedAt;
      const winPayout = isWon ? myBet!.amount * myBet!.cashedAt! : 0;
      finishRound(`${multiplier.toFixed(2)}x`, isWon, winPayout);
    }
    lastPhaseRef.current = phase;
  }, [phase, myBet, multiplier, finishRound]);

  // Main canvas animation logic matching the selected game theme
  useEffect(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext("2d")!;
    let raf = 0;

    const stars: { x: number; y: number; s: number; v: number }[] = Array.from(
      { length: 60 },
      () => ({
        x: Math.random(),
        y: Math.random(),
        s: Math.random() * 1.5 + 0.3,
        v: Math.random() * 0.001 + 0.0003,
      }),
    );

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

      // 1. Draw thematic background gradient
      const bg = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.7);
      if (slug === "lucky-jet") {
        bg.addColorStop(0, "rgba(25, 10, 45, 0.95)");
        bg.addColorStop(1, "rgba(5, 2, 15, 1)");
      } else if (slug === "speed-and-cash") {
        bg.addColorStop(0, "rgba(20, 25, 45, 0.95)");
        bg.addColorStop(1, "rgba(2, 6, 18, 1)");
      } else if (slug === "rocket-queen") {
        bg.addColorStop(0, "rgba(45, 10, 35, 0.95)");
        bg.addColorStop(1, "rgba(18, 2, 12, 1)");
      } else if (slug === "aviator") {
        bg.addColorStop(0, "rgba(35, 8, 12, 0.95)");
        bg.addColorStop(1, "rgba(15, 2, 4, 1)");
      } else {
        // jetx
        bg.addColorStop(0, "rgba(10, 20, 35, 0.95)");
        bg.addColorStop(1, "rgba(2, 5, 15, 1)");
      }
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      // 2. Stars
      ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
      for (const st of stars) {
        st.x -= st.v;
        if (st.x < 0) st.x = 1;
        ctx.globalAlpha = 0.3 + Math.sin(performance.now() / 500 + st.s * 10) * 0.4 + 0.3;
        ctx.fillRect(st.x * w, st.y * h * 0.75, st.s, st.s);
      }
      ctx.globalAlpha = 1;

      // 3. Thematic grid lines
      ctx.strokeStyle =
        slug === "aviator" ? "rgba(239, 68, 68, 0.05)" : "rgba(255, 255, 255, 0.03)";
      ctx.lineWidth = 1;
      for (let i = 1; i < 6; i++) {
        const y = (h / 6) * i;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      const s = useGame.getState();
      const elapsed = s.phase === "running" ? performance.now() - s.roundStartAt : 0;
      const m = s.multiplier;

      // 4. Calculate curve coordinates
      const pad = 40;
      const progress = s.phase === "betting" ? 0 : 1 - Math.exp(-(m - 1) / 3);
      const rx = pad + progress * (w - pad * 2 - 80);
      const ry = h - pad - progress * (h - pad * 2 - 80);

      const points: [number, number][] = [
        [pad, h - pad],
        [rx, ry],
      ];

      // 5. Draw curve and fill area
      if (points.length > 1 && s.phase !== "betting") {
        ctx.beginPath();
        ctx.moveTo(pad, h - pad);
        for (const [x, y] of points) ctx.lineTo(x, y);
        ctx.lineTo(points[points.length - 1][0], h - pad);
        ctx.closePath();

        const areaGrd = ctx.createLinearGradient(0, 0, 0, h);
        if (slug === "lucky-jet") {
          areaGrd.addColorStop(0, "rgba(167, 139, 250, 0.25)");
          areaGrd.addColorStop(1, "rgba(167, 139, 250, 0)");
        } else if (slug === "speed-and-cash") {
          areaGrd.addColorStop(0, "rgba(249, 115, 22, 0.25)");
          areaGrd.addColorStop(1, "rgba(249, 115, 22, 0)");
        } else if (slug === "rocket-queen") {
          areaGrd.addColorStop(0, "rgba(236, 72, 153, 0.25)");
          areaGrd.addColorStop(1, "rgba(236, 72, 153, 0)");
        } else if (slug === "aviator") {
          areaGrd.addColorStop(0, "rgba(239, 68, 68, 0.25)");
          areaGrd.addColorStop(1, "rgba(239, 68, 68, 0)");
        } else {
          areaGrd.addColorStop(0, "rgba(234, 179, 8, 0.25)");
          areaGrd.addColorStop(1, "rgba(234, 179, 8, 0)");
        }
        ctx.fillStyle = areaGrd;
        ctx.fill();

        // Line
        ctx.beginPath();
        ctx.moveTo(points[0][0], points[0][1]);
        for (const [x, y] of points) ctx.lineTo(x, y);
        ctx.lineWidth = 3.5;

        if (s.phase === "crashed") {
          ctx.strokeStyle = "#ef4444";
          ctx.shadowColor = "rgba(239, 68, 68, 0.5)";
        } else {
          if (slug === "lucky-jet") ctx.strokeStyle = "#a78bfa";
          else if (slug === "speed-and-cash") ctx.strokeStyle = "#f97316";
          else if (slug === "rocket-queen") ctx.strokeStyle = "#ec4899";
          else if (slug === "aviator") ctx.strokeStyle = "#ef4444";
          else ctx.strokeStyle = "#eab308";
          ctx.shadowColor = ctx.strokeStyle;
        }

        ctx.shadowBlur = 12;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Draw character/vehicle
        const [rx, ry] = points[points.length - 1];
        drawThematicSprite(ctx, rx, ry, slug, s.phase === "crashed");
      }

      // 6. Multiplier overlay text
      ctx.font = "700 80px 'Space Grotesk', system-ui";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      if (s.phase === "betting") {
        const sec = Math.max(0, s.countdown / 1000).toFixed(1);
        ctx.font = "500 18px Inter, system-ui";
        ctx.fillStyle = "rgba(255,255,255,0.6)";
        ctx.fillText("Next flight in", w / 2, h / 2 - 40);
        ctx.font = "700 84px 'Space Grotesk'";
        ctx.fillStyle = "#ffd86b";
        ctx.fillText(`${sec}s`, w / 2, h / 2 + 15);
      } else if (s.phase === "crashed") {
        ctx.fillStyle = "#ef4444";
        ctx.fillText(`CRASHED @ ${s.crashPoint.toFixed(2)}x`, w / 2, h / 2);
      } else {
        ctx.fillStyle = "#ffffff";
        ctx.fillText(`${m.toFixed(2)}x`, w / 2, h / 2);
      }

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [slug]);

  // Play handler connecting back to the main game bet action
  const onPlay = () => {
    if (pendingBet) {
      cancelBet();
    } else if (phase === "running") {
      cashOut();
    } else {
      placeBet();
    }
  };

  const choiceOption = [
    {
      id: "bet",
      label: pendingBet
        ? "Cancel Bet"
        : phase === "running" && myBet && !myBet.cashedAt
          ? `Cash Out (${(myBet.amount * multiplier).toFixed(2)})`
          : `Bet ${betAmount}`,
      color:
        slug === "lucky-jet"
          ? "#a78bfa"
          : slug === "speed-and-cash"
            ? "#f97316"
            : slug === "rocket-queen"
              ? "#ec4899"
              : slug === "aviator"
                ? "#ef4444"
                : "#eab308",
    },
  ];

  return (
    <LiveGameLayout
      title={title}
      glyph={glyph}
      choices={choiceOption}
      onPlay={onPlay}
      canPlay={true}
    >
      <canvas ref={canvasRef} className="w-full h-full" aria-label="Crash Game Visual" />
    </LiveGameLayout>
  );
}

// Draw custom character based on theme
function drawThematicSprite(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  slug: string,
  crashed: boolean,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(crashed ? Math.PI / 2 : -Math.PI / 8);

  // Flame trails
  if (!crashed) {
    const flameGrd = ctx.createLinearGradient(-40, 0, 0, 0);
    flameGrd.addColorStop(0, "rgba(239, 68, 68, 0)");
    flameGrd.addColorStop(
      1,
      slug === "lucky-jet" ? "#f59e0b" : slug === "rocket-queen" ? "#db2777" : "#ef4444",
    );
    ctx.fillStyle = flameGrd;
    ctx.beginPath();
    ctx.moveTo(-50, -5);
    ctx.lineTo(0, -2);
    ctx.lineTo(0, 2);
    ctx.lineTo(-50, 5);
    ctx.closePath();
    ctx.fill();
  }

  // Draw sprite representation
  if (slug === "lucky-jet") {
    // Lucky Joe with jetpack
    ctx.fillStyle = "#a78bfa"; // Jetpack purple
    ctx.fillRect(-15, -6, 12, 12);
    ctx.fillStyle = "#facc15"; // Suit gold
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#000"; // Visor
    ctx.fillRect(2, -4, 4, 6);
  } else if (slug === "speed-and-cash") {
    // Sporty Racecar
    ctx.fillStyle = "#3b82f6"; // Blue chassis
    ctx.fillRect(-18, -6, 32, 12);
    ctx.fillStyle = "#f97316"; // Spoiler
    ctx.fillRect(-18, -10, 4, 20);
    ctx.fillStyle = "#1e293b"; // Wheels
    ctx.fillRect(-10, -8, 6, 2);
    ctx.fillRect(-10, 6, 6, 2);
    ctx.fillRect(4, -8, 6, 2);
    ctx.fillRect(4, 6, 6, 2);
  } else if (slug === "rocket-queen") {
    // Pink Rocket Queen
    ctx.fillStyle = "#db2777"; // Pink rocket body
    ctx.beginPath();
    ctx.moveTo(16, 0);
    ctx.lineTo(-12, -7);
    ctx.lineTo(-12, 7);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#fdf2f8"; // Blonde hair/head
    ctx.beginPath();
    ctx.arc(-2, -5, 5, 0, Math.PI * 2);
    ctx.fill();
  } else if (slug === "aviator") {
    // Red Propeller Plane
    ctx.fillStyle = "#ef4444"; // Red wings
    ctx.fillRect(-8, -18, 14, 36);
    ctx.fillStyle = "#b91c1c"; // Fuselage
    ctx.beginPath();
    ctx.ellipse(0, 0, 18, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff"; // Propeller line
    ctx.fillRect(18, -10, 2, 20);
  } else {
    // JetX fighter jet
    ctx.fillStyle = "#f59e0b"; // Yellow delta wings
    ctx.beginPath();
    ctx.moveTo(20, 0);
    ctx.lineTo(-15, -15);
    ctx.lineTo(-8, 0);
    ctx.lineTo(-15, 15);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#1e293b"; // Cockpit
    ctx.fillRect(2, -2, 6, 4);
  }

  ctx.restore();
}
