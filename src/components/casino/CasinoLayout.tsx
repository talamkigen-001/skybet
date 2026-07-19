import { type ReactNode } from "react";
import { CasinoTopBar } from "./CasinoTopBar";
import { Sidebar } from "./Sidebar";
import { CasinoFooter } from "./CasinoFooter";

export function CasinoLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <CasinoTopBar />
      <div className="flex-1 flex max-w-[1600px] mx-auto w-full">
        <Sidebar />
        <main className="flex-1 min-w-0 px-3 sm:px-5 md:px-7 py-5 space-y-8">{children}</main>
      </div>
      <CasinoFooter />
    </div>
  );
}
