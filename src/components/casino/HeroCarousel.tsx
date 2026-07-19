import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

interface Slide {
  eyebrow: string;
  title: string;
  body: string;
  cta: string;
  to: string;
  gradient: string;
  glyph: string;
}

const SLIDES: Slide[] = [
  {
    eyebrow: "Featured · Popular",
    title: "1win Lucky Jet — fly high",
    body: "Fly with Lucky Joe and cash out before he flies away. Multipliers up to 100x and beyond!",
    cta: "Play now",
    to: "/games/live/lucky-jet",
    gradient: "linear-gradient(120deg, #06b6d4 0%, #3b82f6 50%, #8b5cf6 100%)",
    glyph: "🚀",
  },
  {
    eyebrow: "Welcome offer",
    title: "+500% on your first deposit",
    body: "Get matched credits, daily cashback bonuses, and free rounds on 1win games.",
    cta: "Claim bonus",
    to: "/promotions",
    gradient: "linear-gradient(120deg, #7c3aed 0%, #ec4899 60%, #f59e0b 100%)",
    glyph: "🎁",
  },
  {
    eyebrow: "Live casino",
    title: "1win Live Casino studio",
    body: "Mines, Plinko, Crazy Time, Coin Flip and live roulette tables streamed 24/7.",
    cta: "Enter the lobby",
    to: "/games/live",
    gradient: "linear-gradient(120deg, #f43f5e 0%, #fb923c 50%, #eab308 100%)",
    glyph: "🎥",
  },
];

export function HeroCarousel() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((x) => (x + 1) % SLIDES.length), 6000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="relative overflow-hidden rounded-3xl border border-border/60 h-[260px] sm:h-[300px] md:h-[340px]">
      {SLIDES.map((s, idx) => (
        <div
          key={idx}
          className="absolute inset-0 transition-opacity duration-700"
          style={{ opacity: i === idx ? 1 : 0, background: s.gradient }}
        >
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "radial-gradient(ellipse at 80% 30%, rgba(255,255,255,0.25), transparent 40%), radial-gradient(ellipse at 10% 90%, rgba(0,0,0,0.4), transparent 50%)",
            }}
          />
          <div className="relative h-full max-w-7xl mx-auto px-6 md:px-10 grid md:grid-cols-[1.3fr_1fr] items-center gap-6">
            <div className="text-white">
              <div className="text-xs font-bold uppercase tracking-wider opacity-90">
                {s.eyebrow}
              </div>
              <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-extrabold mt-2 drop-shadow leading-tight">
                {s.title}
              </h1>
              <p className="mt-2 text-sm md:text-base opacity-90 max-w-md">{s.body}</p>
              <Link
                to={s.to as never}
                className="inline-flex mt-4 px-6 py-3 rounded-full bg-white text-black text-sm font-bold hover:scale-105 transition-transform shadow-xl"
              >
                {s.cta} →
              </Link>
            </div>
            <div className="hidden md:flex items-center justify-center text-[200px] opacity-80 drop-shadow-2xl select-none">
              {s.glyph}
            </div>
          </div>
        </div>
      ))}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
        {SLIDES.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setI(idx)}
            aria-label={`Slide ${idx + 1}`}
            className={`h-1.5 rounded-full transition-all ${i === idx ? "w-8 bg-white" : "w-3 bg-white/40"}`}
          />
        ))}
      </div>
    </div>
  );
}
