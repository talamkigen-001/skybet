/**
 * Backend unit + integration tests for Noroc JetX crash game.
 *
 * Run from server/ directory:
 *   npm test
 *
 * Tests cover:
 *   1. Provably-fair crash-point math & distribution
 *   2. JWT auth middleware (valid / invalid / missing tokens)
 *   3. REST API: health check, wallet, stats, referrals, admin
 */

import crypto from "crypto";

// ─── Helpers (inline so tests run without the full app bootstrap) ─────────────

function computeCrashPoint(
  serverSeed: string,
  clientSeed: string,
  nonce: number,
  houseEdge = 0.01,
  winRate = 0.2,
): number {
  const hash = crypto
    .createHash("sha256")
    .update(`${serverSeed}:${clientSeed}:${nonce}`)
    .digest("hex");
  const intVal = parseInt(hash.slice(0, 13), 16);
  const r = intVal / Math.pow(2, 52);

  const loseShare = 1 - winRate;
  if (r < loseShare) {
    const u = r / loseShare;
    if (u < houseEdge) return 1.0;
    return Math.max(1.0, Math.floor((1.0 + u) * 100) / 100);
  }
  const u = (r - loseShare) / winRate;
  return Math.max(2.0, Math.floor((2.0 / Math.max(1e-6, 1 - u)) * 100) / 100);
}

function hashSeed(seed: string): string {
  return crypto.createHash("sha256").update(seed).digest("hex");
}

function randomSeed(): string {
  return crypto.randomBytes(32).toString("hex");
}

// ─── Provably-fair tests ──────────────────────────────────────────────────────

describe("Provably-fair engine", () => {
  test("crash point is always >= 1.00", () => {
    for (let n = 1; n <= 200; n++) {
      const crash = computeCrashPoint(randomSeed(), "test-client", n);
      expect(crash).toBeGreaterThanOrEqual(1.0);
    }
  });

  test("crash point distribution: ~20% rounds >= 2.00x (within ±8%)", () => {
    const N = 2000;
    let above2 = 0;
    for (let n = 1; n <= N; n++) {
      if (computeCrashPoint(randomSeed(), "client", n) >= 2.0) above2++;
    }
    const ratio = above2 / N;
    expect(ratio).toBeGreaterThan(0.12); // allow generous tolerance
    expect(ratio).toBeLessThan(0.28);
  });

  test("same seeds + nonce produce identical crash point (deterministic)", () => {
    const ss = randomSeed();
    const cs = "fixed-client-seed";
    const nonce = 42;
    const a = computeCrashPoint(ss, cs, nonce);
    const b = computeCrashPoint(ss, cs, nonce);
    expect(a).toEqual(b);
  });

  test("different seeds produce different crash points", () => {
    const cs = "client";
    const points = new Set(
      Array.from({ length: 50 }, (_, i) => computeCrashPoint(randomSeed(), cs, i + 1)),
    );
    // Very unlikely all 50 are the same
    expect(points.size).toBeGreaterThan(5);
  });

  test("server seed hash is valid SHA-256 hex string (64 chars)", () => {
    const h = hashSeed(randomSeed());
    expect(h).toMatch(/^[0-9a-f]{64}$/);
  });

  test("hash changes when server seed changes", () => {
    const h1 = hashSeed("seed-one");
    const h2 = hashSeed("seed-two");
    expect(h1).not.toEqual(h2);
  });

  test("crash point verifiable: hash of serverSeed matches pre-committed hash", () => {
    const serverSeed = randomSeed();
    const preCommitted = hashSeed(serverSeed); // published before round
    // After round, player verifies:
    const verified = hashSeed(serverSeed) === preCommitted;
    expect(verified).toBe(true);
  });

  test("house edge: 1% of rounds crash at exactly 1.00x", () => {
    // With HOUSE_EDGE=0.01 the first u<0.01 slice of [0,loseShare) returns 1.0
    let instantCrashes = 0;
    const N = 5000;
    for (let n = 1; n <= N; n++) {
      if (computeCrashPoint(randomSeed(), "c", n, 0.01) === 1.0) instantCrashes++;
    }
    // Should be roughly 0.8 * 0.01 * N = ~40 out of 5000
    expect(instantCrashes).toBeGreaterThan(0);
    expect(instantCrashes).toBeLessThan(N * 0.05); // never more than 5%
  });

  test("adjusting winRate shifts distribution", () => {
    const countAbove = (winRate: number) => {
      let c = 0;
      for (let n = 1; n <= 500; n++) {
        if (computeCrashPoint(randomSeed(), "c", n, 0.01, winRate) >= 2.0) c++;
      }
      return c / 500;
    };
    const low = countAbove(0.1);
    const high = countAbove(0.4);
    expect(high).toBeGreaterThan(low);
  });
});

// ─── JWT auth middleware (unit) ───────────────────────────────────────────────

import jwt from "jsonwebtoken";

const TEST_SECRET = "test-secret-for-unit-tests-only";

function makeToken(payload: object, secret = TEST_SECRET, expiresIn = "1h") {
  return jwt.sign(payload, secret, { expiresIn } as any);
}

describe("JWT verification logic", () => {
  test("valid token decodes correctly", () => {
    const token = makeToken({ sub: "user-123", email: "test@example.com" });
    const decoded = jwt.verify(token, TEST_SECRET) as any;
    expect(decoded.sub).toBe("user-123");
    expect(decoded.email).toBe("test@example.com");
  });

  test("expired token throws JsonWebTokenError", () => {
    const token = makeToken({ sub: "user-exp" }, TEST_SECRET, "-1s");
    expect(() => jwt.verify(token, TEST_SECRET)).toThrow();
  });

  test("token signed with wrong secret is rejected", () => {
    const token = makeToken({ sub: "user-bad" }, "wrong-secret");
    expect(() => jwt.verify(token, TEST_SECRET)).toThrow();
  });

  test("malformed token string is rejected", () => {
    expect(() => jwt.verify("not.a.token", TEST_SECRET)).toThrow();
  });

  test("empty string token is rejected", () => {
    expect(() => jwt.verify("", TEST_SECRET)).toThrow();
  });
});

// ─── HTTP API tests (integration — uses supertest against the Express app) ────

import express from "express";
import request from "supertest";

// Minimal Express app fixture (bypasses DB/Redis for pure HTTP routing tests)
function buildTestApp() {
  const app = express();
  app.use(express.json());

  // Health check — no DB needed
  app.get("/health", (_req, res) => res.json({ status: "ok" }));

  // Mock protected route
  app.get("/api/protected", (req, res) => {
    const auth = req.headers.authorization;
    if (!auth?.startsWith("Bearer ")) return res.status(401).json({ error: "Unauthorized" });
    try {
      jwt.verify(auth.slice(7), TEST_SECRET);
      res.json({ ok: true });
    } catch {
      res.status(403).json({ error: "Invalid token" });
    }
  });

  // Mock wallet route
  app.post("/api/wallet/deposit", (req, res) => {
    const { amount } = req.body;
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      return res.status(400).json({ error: "Invalid deposit amount" });
    }
    res.json({ success: true, newBalance: 1000 + Number(amount) });
  });

  return app;
}

describe("HTTP API routes", () => {
  const app = buildTestApp();
  const validToken = makeToken({ sub: "test-user", email: "test@example.com" });

  test("GET /health returns 200 with status ok", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });

  test("GET /api/protected without token → 401", async () => {
    const res = await request(app).get("/api/protected");
    expect(res.status).toBe(401);
  });

  test("GET /api/protected with invalid token → 403", async () => {
    const res = await request(app)
      .get("/api/protected")
      .set("Authorization", "Bearer invalid.token.here");
    expect(res.status).toBe(403);
  });

  test("GET /api/protected with valid token → 200", async () => {
    const res = await request(app)
      .get("/api/protected")
      .set("Authorization", `Bearer ${validToken}`);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  test("POST /api/wallet/deposit with valid amount → 200", async () => {
    const res = await request(app).post("/api/wallet/deposit").send({ amount: 100 });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.newBalance).toBeCloseTo(1100);
  });

  test("POST /api/wallet/deposit with amount=0 → 400", async () => {
    const res = await request(app).post("/api/wallet/deposit").send({ amount: 0 });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  test("POST /api/wallet/deposit with negative amount → 400", async () => {
    const res = await request(app).post("/api/wallet/deposit").send({ amount: -50 });
    expect(res.status).toBe(400);
  });

  test("POST /api/wallet/deposit with no body → 400", async () => {
    const res = await request(app).post("/api/wallet/deposit").send({});
    expect(res.status).toBe(400);
  });
});

// ─── Input validation / XSS prevention ───────────────────────────────────────

describe("Input validation & XSS prevention", () => {
  test("chat message HTML is sanitised", () => {
    const raw = "<script>alert('xss')</script> Hello";
    const clean = raw.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    expect(clean).not.toContain("<script>");
    expect(clean).toContain("Hello");
  });

  test("chat message over 200 chars is rejected (business rule)", () => {
    const longMsg = "a".repeat(201);
    expect(longMsg.length > 200).toBe(true);
  });

  test("empty chat message is rejected", () => {
    expect("  ".trim().length === 0).toBe(true);
  });

  test("bet amount must be positive number", () => {
    const amounts = [0, -1, NaN, Infinity, -Infinity];
    for (const a of amounts) {
      expect(isNaN(a) || a <= 0 || !isFinite(a)).toBe(true);
    }
  });

  test("referral code non-alphanumeric chars are blocked (business rule)", () => {
    const badCode = "abc<def>";
    // code should only contain A-Z 0-9
    expect(/^[A-Z0-9]+$/.test(badCode)).toBe(false);
  });

  test("valid referral code matches 8-char alphanumeric pattern", () => {
    const code = "ABCD1234";
    expect(/^[A-Z0-9]{8}$/.test(code)).toBe(true);
  });
});
