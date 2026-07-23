"use client";

import Link from "next/link";
import { CasinoLayout } from "@/components/casino/CasinoLayout";

const OFFERS = [
  {
    tier: "Welcome",
    title: "+200% first deposit",
    desc: "Up to 2,000 credits matched + 100 free spins.",
    color: "from-fuchsia-500 to-orange-400",
    cta: "Activate",
  },
  {
    tier: "Cashback",
    title: "10% weekly cashback",
    desc: "Auto-credited every Monday on net losses.",
    color: "from-cyan-400 to-blue-600",
    cta: "Opt in",
  },
  {
    tier: "Referral",
    title: "Invite friends · earn 25%",
    desc: "Lifetime revenue share on every referred player.",
    color: "from-emerald-400 to-teal-600",
    cta: "Get link",
  },
  {
    tier: "VIP",
    title: "Diamond rewards",
    desc: "Personal manager, faster cashouts, exclusive drops.",
    color: "from-yellow-400 to-rose-500",
    cta: "View tiers",
  },
  {
    tier: "Daily",
    title: "Daily login bonus",
    desc: "Up to 500 credits per day for active streaks.",
    color: "from-violet-500 to-indigo-600",
    cta: "Claim today",
  },
  {
    tier: "Code",
    title: "Redeem promo code",
    desc: "Enter a campaign code to unlock bonus credits.",
    color: "from-pink-500 to-purple-600",
    cta: "Enter code",
  },
];

export default function Promotions() {
  return (
    <CasinoLayout>
      <div>
        <h1 className="font-display text-4xl font-extrabold">Promotions</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Bonuses, cashback, and loyalty rewards.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {OFFERS.map((o) => (
          <div
            key={o.title}
            className={`rounded-2xl p-5 bg-gradient-to-br ${o.color} text-white relative overflow-hidden`}
          >
            <div className="absolute -bottom-10 -right-10 text-[140px] opacity-20 select-none">
              🎁
            </div>
            <div className="text-[10px] uppercase font-bold tracking-wider opacity-90">
              {o.tier}
            </div>
            <h3 className="font-display text-xl font-extrabold mt-1">{o.title}</h3>
            <p className="text-sm opacity-90 mt-1">{o.desc}</p>
            <button className="mt-4 px-4 py-2 rounded-full bg-white text-black text-xs font-bold hover:scale-105 transition-transform">
              {o.cta}
            </button>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Demonstration only.{" "}
        <Link href="/" className="underline">
          Back home
        </Link>
      </p>
    </CasinoLayout>
  );
}
