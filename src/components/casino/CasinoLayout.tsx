"use client";

import { type ReactNode } from "react";
import { CasinoTopBar } from "./CasinoTopBar";
import { Sidebar } from "./Sidebar";
import { CasinoFooter } from "./CasinoFooter";
import { MobileNav } from "./MobileNav";

export function CasinoLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background relative">
      <CasinoTopBar />
      <div className="flex-1 flex max-w-[1600px] mx-auto w-full">
        <Sidebar />
        <main className="flex-1 min-w-0 px-3 sm:px-5 md:px-7 py-4 sm:py-6 space-y-6 sm:space-y-8 pb-20 lg:pb-8">
          {children}
        </main>
      </div>
      <CasinoFooter />
      <MobileNav />
    </div>
  );
}
