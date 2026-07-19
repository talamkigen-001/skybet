import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { TopBar } from "@/components/crash/TopBar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useGame } from "@/lib/game-store";
import { computeCrashPoint, hashServerSeed } from "@/lib/crash-engine";

const searchSchema = z.object({ nonce: z.number().optional() });

export const Route = createFileRoute("/fairness")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Provably Fair — Noroc JetX" },
      {
        name: "description",
        content:
          "Verify any round's crash multiplier using SHA-256, server seed, client seed, and nonce.",
      },
    ],
  }),
  component: FairnessPage,
});

function FairnessPage() {
  const { nonce: queryNonce } = Route.useSearch();
  const history = useGame((s) => s.history);
  const clientSeedDefault = useGame((s) => s.clientSeed);
  const setClientSeed = useGame((s) => s.setClientSeed);

  const target = history.find((h) => h.nonce === queryNonce) ?? history[0];

  const [serverSeed, setServerSeed] = useState(target?.serverSeed ?? "");
  const [clientSeed, setLocalSeed] = useState(target?.clientSeed ?? clientSeedDefault);
  const [nonce, setNonce] = useState(target?.nonce ?? 1);
  const [hash, setHash] = useState("");
  const [crash, setCrash] = useState<number | null>(null);

  useEffect(() => {
    if (target) {
      setServerSeed(target.serverSeed);
      setLocalSeed(target.clientSeed);
      setNonce(target.nonce);
    }
  }, [target]);

  async function verify() {
    const h = await hashServerSeed(serverSeed);
    setHash(h);
    const c = await computeCrashPoint(serverSeed, clientSeed, nonce);
    setCrash(c);
  }

  return (
    <div className="min-h-screen flex flex-col">
      <TopBar />
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-8">
        <h1 className="text-3xl font-display font-bold mb-2">Provably fair</h1>
        <p className="text-muted-foreground mb-6">
          Each round's crash multiplier is generated from{" "}
          <code className="text-primary">SHA-256(serverSeed:clientSeed:nonce)</code> before the
          round begins. The <strong>hash of the server seed</strong> is published in advance. After
          the round ends, the server seed is revealed so anyone can reproduce the result.
        </p>

        <div className="glass-panel rounded-2xl p-6 space-y-4">
          <div>
            <Label className="text-xs text-muted-foreground">
              Server seed (revealed after round)
            </Label>
            <Input
              value={serverSeed}
              onChange={(e) => setServerSeed(e.target.value)}
              className="font-mono text-xs"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Client seed</Label>
            <Input
              value={clientSeed}
              onChange={(e) => setLocalSeed(e.target.value)}
              className="font-mono text-xs"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Nonce</Label>
            <Input
              type="number"
              value={nonce}
              onChange={(e) => setNonce(Number(e.target.value))}
              className="font-mono text-xs"
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={verify} className="bg-primary text-primary-foreground">
              Verify
            </Button>
            <Button variant="outline" onClick={() => setClientSeed(clientSeed)}>
              Use this client seed for future rounds
            </Button>
          </div>
          {hash && (
            <div className="pt-2 border-t border-border/60 space-y-2">
              <div>
                <div className="text-xs text-muted-foreground">SHA-256 of server seed</div>
                <div className="font-mono text-xs break-all">{hash}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Crash point</div>
                <div className="font-mono-tabular text-3xl text-[var(--gold)] font-bold">
                  {crash?.toFixed(2)}x
                </div>
                {target && (
                  <div className="text-xs text-muted-foreground mt-1">
                    Recorded result:{" "}
                    <span className="font-mono-tabular">{target.crash.toFixed(2)}x</span> ·{" "}
                    {crash === target.crash ? (
                      <span className="text-[var(--win)]">Match ✓</span>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <h2 className="text-xl font-display font-semibold mt-10 mb-3">Recent rounds</h2>
        <div className="glass-panel rounded-2xl divide-y divide-border/60 overflow-hidden">
          {history.slice(0, 20).map((h) => (
            <button
              key={h.nonce}
              onClick={() => {
                setServerSeed(h.serverSeed);
                setLocalSeed(h.clientSeed);
                setNonce(h.nonce);
              }}
              className="w-full grid grid-cols-[60px_1fr_80px] gap-3 px-4 py-2 text-xs text-left hover:bg-secondary/40"
            >
              <span className="font-mono-tabular text-muted-foreground">#{h.nonce}</span>
              <span className="font-mono truncate text-muted-foreground">{h.serverSeedHash}</span>
              <span className="font-mono-tabular text-right text-[var(--gold)] font-semibold">
                {h.crash.toFixed(2)}x
              </span>
            </button>
          ))}
          {history.length === 0 && (
            <div className="px-4 py-6 text-sm text-muted-foreground text-center">
              Play a few rounds to populate history.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
