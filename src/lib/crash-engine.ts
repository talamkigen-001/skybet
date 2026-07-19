// Provably fair crash engine for NOROC JETX.
// SHA-256(serverSeed:clientSeed:nonce) → uniform r ∈ [0,1) → crash multiplier.
// Distribution is tuned so ~20% of rounds crash at >= 2.00x ("winning" rounds for
// players cashing out at 2x) and ~80% crash below 2.00x. Result is deterministic
// from the seeds, so every round remains verifiable on /fairness.

const WIN_RATE = 0.2; // fraction of rounds crashing >= 2.00x
const HOUSE_EDGE = 0.01; // 1% of losing rounds crash instantly at 1.00x

async function sha256Hex(message: string): Promise<string> {
  const data = new TextEncoder().encode(message);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function computeCrashPoint(
  serverSeed: string,
  clientSeed: string,
  nonce: number,
): Promise<number> {
  const hash = await sha256Hex(`${serverSeed}:${clientSeed}:${nonce}`);
  const intVal = parseInt(hash.slice(0, 13), 16);
  const r = intVal / 2 ** 52; // uniform [0,1)

  const winThreshold = 1 - WIN_RATE; // 0.80
  const loseThreshold = Math.min(0.60, winThreshold);

  if (r < loseThreshold) {
    // 60% of rounds -> crash in [1.00, 1.20)
    const u = r / loseThreshold;
    if (u < HOUSE_EDGE) return 1.0; // instant crash sliver
    const m = 1.0 + u * 0.20; // 1.00 -> 1.20
    return Math.max(1.0, Math.floor(m * 100) / 100);
  } else if (r < winThreshold) {
    // 20% of rounds -> crash in [1.20, 2.00)
    const rangeSize = winThreshold - loseThreshold;
    const u = rangeSize > 0 ? (r - loseThreshold) / rangeSize : 0;
    const m = 1.20 + u * 0.80; // 1.20 -> 2.00
    return Math.max(1.20, Math.floor(m * 100) / 100);
  } else {
    // 20% of rounds -> heavy-tail in [2.00, ∞)
    const u = (r - winThreshold) / WIN_RATE;
    const m = 2 / Math.max(1e-6, 1 - u);
    return Math.max(2.0, Math.floor(m * 100) / 100);
  }
}

export async function hashServerSeed(serverSeed: string): Promise<string> {
  return sha256Hex(serverSeed);
}

export function randomSeed(len = 32): string {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Multiplier curve over elapsed seconds — exponential growth
export function multiplierAt(elapsedMs: number): number {
  const t = elapsedMs / 1000;
  return Math.max(1, Math.pow(1.07, t * 4));
}

export function timeToReach(target: number): number {
  return (Math.log(target) / Math.log(1.07) / 4) * 1000;
}
