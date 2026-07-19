import { useEffect, useRef } from "react";
import { useGame } from "@/lib/game-store";

// Canvas-rendered multiplier graph with Lucky Joe jetpack flight path and animation.
export function CrashGraph() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext("2d")!;
    let raf = 0;
    
    // Background starfield
    const stars: { x: number; y: number; s: number; v: number }[] = Array.from(
      { length: 80 },
      () => ({
        x: Math.random(),
        y: Math.random(),
        s: Math.random() * 1.4 + 0.2,
        v: Math.random() * 0.0008 + 0.0002,
      }),
    );

    let lastPhase = "betting";
    let crashTime = 0;

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

      // Deep space/sky gradient
      const sky = ctx.createRadialGradient(w / 2, h * 1.1, 0, w / 2, h * 1.1, h * 1.2);
      sky.addColorStop(0, "rgba(88, 28, 135, 0.4)"); // Deep violet glow
      sky.addColorStop(0.5, "rgba(23, 15, 52, 0.7)");
      sky.addColorStop(1, "rgba(9, 6, 22, 1)");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h);

      // Stars
      ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
      for (const st of stars) {
        st.x -= st.v;
        if (st.x < 0) st.x = 1;
        ctx.globalAlpha = 0.3 + Math.sin(performance.now() / 600 + st.s * 10) * 0.3 + 0.4;
        ctx.fillRect(st.x * w, st.y * h * 0.7, st.s, st.s);
      }
      ctx.globalAlpha = 1;

      // Subtle horizontal grid lines
      ctx.strokeStyle = "rgba(255, 255, 255, 0.03)";
      ctx.lineWidth = 1;
      for (let i = 1; i < 6; i++) {
        const y = (h / 6) * i;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      const s = useGame.getState();
      
      // Track phase transition to crashed
      if (s.phase === "crashed" && lastPhase !== "crashed") {
        crashTime = performance.now();
      }
      lastPhase = s.phase;

      const m = s.multiplier;
      const pad = 40;
      
      // Calculate normal progress along the curve
      const progress = s.phase === "betting" ? 0 : 1 - Math.exp(-(m - 1) / 3);
      const rxBase = pad + progress * (w - pad * 2 - 100);
      const ryBase = h - pad - progress * (h - pad * 2 - 100);

      const points: [number, number][] = [
        [pad, h - pad],
        [rxBase, ryBase],
      ];

      // Draw the neon violet trail line & area under the curve
      if (points.length > 1) {
        ctx.beginPath();
        ctx.moveTo(pad, h - pad);
        for (const [x, y] of points) ctx.lineTo(x, y);
        ctx.lineTo(points[points.length - 1][0], h - pad);
        ctx.closePath();
        
        const grd = ctx.createLinearGradient(0, ryBase, 0, h - pad);
        grd.addColorStop(0, "rgba(139, 92, 246, 0.25)"); // Glowing neon purple
        grd.addColorStop(1, "rgba(139, 92, 246, 0)");
        ctx.fillStyle = grd;
        ctx.fill();

        // Glowing flight path line
        ctx.beginPath();
        ctx.moveTo(points[0][0], points[0][1]);
        for (const [x, y] of points) ctx.lineTo(x, y);
        ctx.strokeStyle = s.phase === "crashed" ? "rgba(168, 85, 247, 0.3)" : "rgba(168, 85, 247, 1)";
        ctx.lineWidth = 3.5;
        ctx.shadowColor = "rgba(139, 92, 246, 0.8)";
        ctx.shadowBlur = s.phase === "crashed" ? 5 : 15;
        ctx.stroke();
        ctx.shadowBlur = 0; // Reset shadow

        // Animate Lucky Joe flying off the screen to the top-right after crash
        let joeX = rxBase;
        let joeY = ryBase;

        if (s.phase === "crashed" && crashTime > 0) {
          const elapsedCrash = performance.now() - crashTime;
          // Lucky Joe detaches and flies away rapidly
          joeX += elapsedCrash * 0.55;
          joeY -= elapsedCrash * 0.45;
        }

        // Draw Lucky Joe character
        drawLuckyJoe(ctx, joeX, joeY, s.phase === "crashed");
      }

      // Middle Overlay texts
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      if (s.phase === "betting") {
        const sec = Math.max(0, s.countdown / 1000).toFixed(1);
        ctx.font = "600 16px Inter, sans-serif";
        ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
        ctx.fillText("Next round in", w / 2, h / 2 - 50);

        ctx.font = "700 96px 'Space Grotesk', sans-serif";
        ctx.fillStyle = "#a855f7"; // Neon purple countdown
        ctx.fillText(`${sec}s`, w / 2, h / 2 + 10);
      } else if (s.phase === "crashed") {
        // Stylish "Flew Away" message matching Lucky Jet
        ctx.fillStyle = "#8b5cf6"; // Neon violet
        ctx.font = "700 48px 'Space Grotesk', sans-serif";
        ctx.fillText("Flew Away", w / 2, h / 2 - 35);

        ctx.fillStyle = "#ffffff";
        ctx.font = "700 90px 'Space Grotesk', sans-serif";
        ctx.fillText(`${s.crashPoint.toFixed(2)}x`, w / 2, h / 2 + 35);
      } else {
        // Active golden multiplier text
        ctx.fillStyle = "#ffffff";
        ctx.font = "700 100px 'Space Grotesk', sans-serif";
        ctx.fillText(`${m.toFixed(2)}x`, w / 2, h / 2);
      }

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full rounded-2xl"
      aria-label="Lucky Jet multiplier graph"
    />
  );
}

// Vector-drawn Lucky Joe with jetpack character
// Safe helper to draw round rects even in environments/browsers lacking ctx.roundRect support
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.rect(x, y, w, h);
  }
}

// Vector-drawn Lucky Joe with jetpack character
function drawLuckyJoe(ctx: CanvasRenderingContext2D, x: number, y: number, crashed: boolean) {
  ctx.save();
  ctx.translate(x, y);
  
  // Rotate slightly upwards during flight, tumble slightly when crashed
  ctx.rotate(crashed ? Math.PI / 12 : -Math.PI / 12);

  // 1. Draw Jetpack Flame particles
  if (!crashed) {
    const time = performance.now();
    const flameLen = 28 + Math.sin(time / 45) * 8;

    // Outer flame
    const outerFlame = ctx.createLinearGradient(-15, 8, -15 - flameLen, 12);
    outerFlame.addColorStop(0, "rgba(255, 90, 0, 0.9)");
    outerFlame.addColorStop(0.5, "rgba(255, 180, 0, 0.7)");
    outerFlame.addColorStop(1, "rgba(255, 230, 0, 0)");
    ctx.fillStyle = outerFlame;
    ctx.beginPath();
    ctx.moveTo(-12, 4);
    ctx.lineTo(-12 - flameLen, 10);
    ctx.lineTo(-12, 16);
    ctx.closePath();
    ctx.fill();

    // Inner flame
    const innerFlame = ctx.createLinearGradient(-15, 8, -15 - flameLen * 0.6, 10);
    innerFlame.addColorStop(0, "rgba(255, 255, 255, 1)");
    innerFlame.addColorStop(0.5, "rgba(255, 165, 0, 0.8)");
    innerFlame.addColorStop(1, "rgba(255, 50, 0, 0)");
    ctx.fillStyle = innerFlame;
    ctx.beginPath();
    ctx.moveTo(-12, 6);
    ctx.lineTo(-12 - flameLen * 0.6, 10);
    ctx.lineTo(-12, 14);
    ctx.closePath();
    ctx.fill();
  }

  // 2. Draw Jetpack (red body on the back)
  ctx.fillStyle = "#ef4444"; // Red
  ctx.beginPath();
  roundRect(ctx, -18, -4, 9, 18, 3.5);
  ctx.fill();
  
  // Metal thruster nozzle
  ctx.fillStyle = "#6b7280"; // Gray
  ctx.beginPath();
  roundRect(ctx, -15, 10, 4, 3, 1);
  ctx.fill();

  // 3. Draw Torso (Lucky Joe's iconic blue tracksuit)
  ctx.fillStyle = "#3b82f6"; // Royal blue
  ctx.beginPath();
  roundRect(ctx, -10, -8, 14, 18, 5.5);
  ctx.fill();

  // 4. Draw Legs (flight position, bent backward)
  ctx.fillStyle = "#1d4ed8"; // Dark blue pants
  // Left leg
  ctx.beginPath();
  ctx.moveTo(-6, 8);
  ctx.lineTo(-18, 15);
  ctx.lineTo(-15, 18);
  ctx.lineTo(-4, 10);
  ctx.closePath();
  ctx.fill();
  // Right leg (overlapping)
  ctx.beginPath();
  ctx.moveTo(-2, 8);
  ctx.lineTo(-14, 17);
  ctx.lineTo(-11, 20);
  ctx.lineTo(0, 10);
  ctx.closePath();
  ctx.fill();

  // 5. Draw Head with golden hair/helmet and black sunglasses
  // Golden Helmet/Hair
  ctx.fillStyle = "#f59e0b"; // Yellow gold
  ctx.beginPath();
  ctx.arc(4, -13, 7.5, 0, Math.PI * 2);
  ctx.fill();

  // Face skin
  ctx.fillStyle = "#ffedd5";
  ctx.beginPath();
  ctx.arc(5, -12, 5.5, -Math.PI / 3, Math.PI / 2);
  ctx.fill();

  // Visor/Glasses (cool shades)
  ctx.fillStyle = "#09090b";
  ctx.beginPath();
  roundRect(ctx, 4, -15.5, 7.5, 4, 1.5);
  ctx.fill();
  // Visor reflection
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(8.5, -14.5, 1.5, 1.5);

  // 6. Draw Arm (holding jetpack controls)
  ctx.fillStyle = "#3b82f6";
  ctx.beginPath();
  ctx.ellipse(3.5, -1, 8.5, 3.2, Math.PI / 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}
