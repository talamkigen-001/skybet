import crypto from "crypto";
import { query, pool } from "../db/db.js";
import { set as cacheSet } from "../cache/redis.js";

export type Phase = "betting" | "running" | "crashed";

export interface RoundRecord {
  id: string | number;
  crashPoint: number;
  serverSeed: string;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
  endedAt: number;
}

export interface ActiveBet {
  userId: string;
  username: string;
  amount: number;
  autoCashout?: number;
  cashedAt?: number; // Multiplier at which cashed
  isBot?: boolean;
  betIndex?: number;
}

export class GameEngine {
  public phase: Phase = "betting";
  public multiplier = 1.0;
  public crashPoint = 1.0;
  public countdown = 3000; // ms
  public roundStartAt = 0;
  public currentRoundId: number | null = null;

  public activeBets: ActiveBet[] = [];
  public recentRounds: RoundRecord[] = [];
  public broadcastCallback: (event: string, data: any) => void = () => {};

  // Provably Fair Seeds
  private serverSeed = "";
  public serverSeedHash = "";
  private clientSeed = "lucky-player";
  public nonce = 0;

  // Game Settings (RTP configurable)
  public houseEdge = 0.01; // 1% instant crash at 1.00
  public winRate = 0.2; // 20% heavy tail, 80% [1.00, 2.00)

  private tickTimeout: NodeJS.Timeout | null = null;
  private bettingTimeout: NodeJS.Timeout | null = null;

  private BOT_NAMES = [
    "NovaHawk",
    "ZetaWolf",
    "Crimson7",
    "LunaPilot",
    "K1ngFly",
    "ApexJet",
    "Mira",
    "Soren",
    "Vix",
    "Echo",
    "Quill",
    "RoninX",
    "Suki",
    "Drake",
    "Nyx",
    "Orion",
    "Jade",
    "Pax",
    "Wren",
    "Kairo",
  ];

  constructor() {
    this.nonce = Math.floor(Math.random() * 1000);
  }

  public setBroadcastCallback(cb: (event: string, data: any) => void) {
    this.broadcastCallback = cb;
  }

  public async start() {
    await this.startNewRound();
  }

  private generateServerSeed(): string {
    return crypto.randomBytes(32).toString("hex");
  }

  private hashServerSeed(seed: string): string {
    return crypto.createHash("sha256").update(seed).digest("hex");
  }

  private computeCrashPoint(serverSeed: string, clientSeed: string, nonce: number): number {
    const hash = crypto
      .createHash("sha256")
      .update(`${serverSeed}:${clientSeed}:${nonce}`)
      .digest("hex");
    const intVal = parseInt(hash.slice(0, 13), 16);
    const r = intVal / Math.pow(2, 52); // uniform [0,1)

    const winThreshold = 1 - this.winRate; // e.g. 0.80
    // 60% of all rounds will crash in the lower range [1.00, 1.20)
    const loseThreshold = Math.min(0.60, winThreshold);

    if (r < loseThreshold) {
      // 60% of rounds -> crash in [1.00, 1.20)
      const u = r / loseThreshold;
      if (u < this.houseEdge) return 1.0; // instant crash
      const m = 1.0 + u * 0.20; // 1.00 to 1.20
      return Math.max(1.0, Math.floor(m * 100) / 100);
    } else if (r < winThreshold) {
      // 20% of rounds -> crash in [1.20, 2.00)
      const rangeSize = winThreshold - loseThreshold;
      const u = rangeSize > 0 ? (r - loseThreshold) / rangeSize : 0;
      const m = 1.20 + u * 0.80; // 1.20 to 2.00
      return Math.max(1.20, Math.floor(m * 100) / 100);
    } else {
      // 20% of rounds -> heavy-tail in [2.00, infinity)
      const u = (r - winThreshold) / this.winRate;
      const m = 2.0 / Math.max(1e-6, 1.0 - u);
      return Math.max(2.0, Math.floor(m * 100) / 100);
    }
  }

  private async startNewRound() {
    this.phase = "betting";
    this.multiplier = 1.0;
    this.countdown = 3000;
    this.roundStartAt = Date.now() + this.countdown;

    // Load active settings from public.game_settings
    try {
      const settingsRes = await query(
        "SELECT house_edge, win_rate, force_next_crash FROM public.game_settings WHERE id = 1",
      );
      if (settingsRes.rows.length > 0) {
        const row = settingsRes.rows[0];
        this.houseEdge = Number(row.house_edge);
        this.winRate = Number(row.win_rate);

        // Generate Provably Fair Outcomes
        this.serverSeed = this.generateServerSeed();
        this.serverSeedHash = this.hashServerSeed(this.serverSeed);
        this.nonce += 1;

        if (row.force_next_crash !== null && row.force_next_crash !== undefined) {
          this.crashPoint = Number(row.force_next_crash);
          console.log(`[CONTROL] Forced crash point active: ${this.crashPoint}x`);
          // Clear it in DB
          await query("UPDATE public.game_settings SET force_next_crash = NULL WHERE id = 1");
        } else {
          this.crashPoint = this.computeCrashPoint(this.serverSeed, this.clientSeed, this.nonce);
        }
      } else {
        // Fallback to defaults
        this.serverSeed = this.generateServerSeed();
        this.serverSeedHash = this.hashServerSeed(this.serverSeed);
        this.nonce += 1;
        this.crashPoint = this.computeCrashPoint(this.serverSeed, this.clientSeed, this.nonce);
      }
    } catch (err) {
      console.error("Failed to load game settings from DB, using fallback:", err);
      this.serverSeed = this.generateServerSeed();
      this.serverSeedHash = this.hashServerSeed(this.serverSeed);
      this.nonce += 1;
      this.crashPoint = this.computeCrashPoint(this.serverSeed, this.clientSeed, this.nonce);
    }

    console.log(
      `Starting round. Nonce: ${this.nonce}, Hash: ${this.serverSeedHash}, Crash Point: ${this.crashPoint}x`,
    );

    // Reset Bets & Add Bots
    this.activeBets = [];
    this.generateBots();

    // Insert pending round in DB
    try {
      const res = await query(
        `INSERT INTO public.crash_rounds (server_seed, server_seed_hash, client_seed, nonce, crash_point, status)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [
          this.serverSeed,
          this.serverSeedHash,
          this.clientSeed,
          this.nonce,
          this.crashPoint,
          "betting",
        ],
      );
      this.currentRoundId = res.rows[0].id;
    } catch (err) {
      console.error("Failed to insert crash round in DB:", err);
    }

    // Broadcast Betting Phase
    this.broadcastState();

    // Start Countdown Timer
    const endBettingTime = Date.now() + this.countdown;
    this.bettingTimeout = setInterval(() => {
      const remaining = endBettingTime - Date.now();
      if (remaining <= 0) {
        clearInterval(this.bettingTimeout!);
        this.runGame();
      } else {
        this.countdown = remaining;
        this.broadcastCallback("countdown", { countdown: this.countdown });
      }
    }, 100);
  }

  private async runGame() {
    this.phase = "running";
    this.multiplier = 1.0;
    const startTime = Date.now();
    this.roundStartAt = startTime;

    // Update Round status in DB
    if (this.currentRoundId) {
      await query("UPDATE public.crash_rounds SET status = 'running' WHERE id = $1", [
        this.currentRoundId,
      ]).catch((err) => {
        console.error("DB update status error:", err);
      });
    }

    this.broadcastState();
    this.scheduleNextTick(startTime);
  }

  private scheduleNextTick(startTime: number) {
    if (this.phase !== "running") return;
    this.tickTimeout = setTimeout(async () => {
      try {
        await this.gameTick(startTime);
      } catch (err) {
        console.error("Error in game tick:", err);
      }
      if (this.phase === "running") {
        this.scheduleNextTick(startTime);
      }
    }, 50);
  }

  private async gameTick(startTime: number) {
    const elapsedMs = Date.now() - startTime;
    const elapsedSec = elapsedMs / 1000;

    // Multiplier formula: M(t) = 1.07^(t * 4)
    const currentMult = Math.pow(1.07, elapsedSec * 4);
    this.multiplier = Math.floor(currentMult * 100) / 100;

    // Check Auto-Cashouts for users and bots
    await this.checkAutoCashouts();

    if (this.multiplier >= this.crashPoint) {
      if (this.tickTimeout) {
        clearTimeout(this.tickTimeout);
        this.tickTimeout = null;
      }
      await this.handleCrash();
    } else {
      // Cache state in Redis
      await cacheSet("crash:current_multiplier", this.multiplier.toString());
      this.broadcastCallback("tick", { multiplier: this.multiplier });
    }
  }

  private async checkAutoCashouts() {
    for (const bet of this.activeBets) {
      if (!bet.cashedAt && bet.autoCashout && this.multiplier >= bet.autoCashout) {
        bet.cashedAt = bet.autoCashout;

        if (!bet.isBot) {
          const success = await this.payoutUser(bet.userId, bet.amount, bet.autoCashout);
          if (!success) {
            bet.cashedAt = undefined; // Revert in-memory win if payout failed
            console.error(
              `Auto-cashout payout failed for user ${bet.userId}. Reverting cashout status.`,
            );
            continue; // Skip broadcasting false win
          }
        }

        this.broadcastCallback("cashout", {
          userId: bet.userId,
          username: bet.username,
          cashedAt: bet.autoCashout,
          winAmount: bet.amount * bet.autoCashout,
          betIndex: bet.betIndex ?? 0,
        });
      }
    }
  }

  private async payoutUser(
    userId: string,
    betAmount: number,
    multiplier: number,
  ): Promise<boolean> {
    const winAmount = Number((betAmount * multiplier).toFixed(2));
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Add balance
      await client.query(
        "UPDATE public.wallets SET balance = balance + $1, updated_at = now() WHERE user_id = $2",
        [winAmount, userId],
      );

      // Log transaction
      await client.query(
        `INSERT INTO public.transactions (user_id, type, status, amount, meta)
         VALUES ($1, 'win', 'completed', $2, $3)`,
        [userId, winAmount, JSON.stringify({ roundId: this.currentRoundId, multiplier })],
      );

      await client.query("COMMIT");
      return true;
    } catch (err) {
      await client.query("ROLLBACK");
      console.error(`Failed to payout user ${userId}:`, err);
      return false;
    } finally {
      client.release();
    }
  }

  private async handleCrash() {
    this.phase = "crashed";
    this.multiplier = this.crashPoint;

    // Cache state in Redis
    await cacheSet("crash:phase", "crashed");
    await cacheSet("crash:current_multiplier", this.crashPoint.toString());

    // Update Round in DB
    if (this.currentRoundId) {
      await query(
        "UPDATE public.crash_rounds SET status = 'crashed', ended_at = now() WHERE id = $1",
        [this.currentRoundId],
      ).catch((err) => {
        console.error("DB update round error:", err);
      });
    }

    // Save all bets to DB
    for (const bet of this.activeBets) {
      if (bet.isBot) continue; // Don't write bot bets to PostgreSQL

      const winAmount = bet.cashedAt ? Number((bet.amount * bet.cashedAt).toFixed(2)) : 0;
      await query(
        `INSERT INTO public.crash_bets (round_id, user_id, username, bet_amount, auto_cashout, cashout_multiplier, win_amount, cashed_out_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          this.currentRoundId,
          bet.userId,
          bet.username,
          bet.amount,
          bet.autoCashout || null,
          bet.cashedAt || null,
          winAmount,
          bet.cashedAt ? new Date() : null,
        ],
      ).catch((err) => {
        console.error(`DB save bet error for user ${bet.userId}:`, err);
      });
    }

    const roundResult: RoundRecord = {
      id: this.currentRoundId || Date.now(),
      crashPoint: this.crashPoint,
      serverSeed: this.serverSeed,
      serverSeedHash: this.serverSeedHash,
      clientSeed: this.clientSeed,
      nonce: this.nonce,
      endedAt: Date.now(),
    };

    // Add to history
    this.recentRounds.unshift(roundResult);
    if (this.recentRounds.length > 50) this.recentRounds.pop();

    // Broadcast Crash
    this.broadcastCallback("crashed", {
      crashPoint: this.crashPoint,
      serverSeed: this.serverSeed,
      nonce: this.nonce,
      history: this.recentRounds.map((r) => ({
        id: r.id,
        crash: r.crashPoint,
        serverSeed: r.serverSeed,
        serverSeedHash: r.serverSeedHash,
        clientSeed: r.clientSeed,
        nonce: r.nonce,
        endedAt: r.endedAt,
      })),
    });

    // Schedule next round after 2.5 seconds
    setTimeout(() => {
      this.startNewRound();
    }, 2500);
  }

  public async placeBet(
    userId: string,
    username: string,
    amount: number,
    autoCashout?: number,
    betIndex = 0,
  ): Promise<boolean> {
    if (this.phase !== "betting") return false;
    if (this.activeBets.some((b) => b.userId === userId && (b.betIndex ?? 0) === betIndex)) return false; // Already placed

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Re-verify phase inside transaction to avoid TOCTOU race conditions
      if (this.phase !== "betting") {
        throw new Error("Phase changed mid-transaction");
      }

      // Verify wallet balance
      const walletRes = await client.query(
        "SELECT balance FROM public.wallets WHERE user_id = $1 FOR UPDATE",
        [userId],
      );
      if (walletRes.rows.length === 0) {
        throw new Error("Wallet not found");
      }
      const balance = Number(walletRes.rows[0].balance);
      if (balance < amount) {
        throw new Error("Insufficient funds");
      }

      // Deduct balance
      await client.query(
        "UPDATE public.wallets SET balance = balance - $1, updated_at = now() WHERE user_id = $2",
        [amount, userId],
      );

      // Log transaction
      await client.query(
        `INSERT INTO public.transactions (user_id, type, status, amount, meta)
         VALUES ($1, 'bet', 'completed', $2, $3)`,
        [userId, -amount, JSON.stringify({ roundId: this.currentRoundId })],
      );

      await client.query("COMMIT");

      // Add to engine active bets list
      this.activeBets.push({
        userId,
        username,
        amount,
        autoCashout,
        betIndex,
      });

      // Broadcast updated bets
      this.broadcastCallback("bets", { bets: this.activeBets });
      return true;
    } catch (err: any) {
      await client.query("ROLLBACK");
      console.error(`Failed to place bet for user ${userId}:`, err.message);
      return false;
    } finally {
      client.release();
    }
  }

  public async cashOut(
    userId: string,
    betIndex = 0,
  ): Promise<{ success: boolean; multiplier?: number; winAmount?: number }> {
    if (this.phase !== "running") return { success: false };

    const bet = this.activeBets.find((b) => b.userId === userId && (b.betIndex ?? 0) === betIndex);
    if (!bet || bet.cashedAt) return { success: false };

    // Record cashout multiplier at exact current tick multiplier
    const cashedAtMult = this.multiplier;
    bet.cashedAt = cashedAtMult;

    const winAmount = Number((bet.amount * cashedAtMult).toFixed(2));
    const success = await this.payoutUser(userId, bet.amount, cashedAtMult);
    if (!success) {
      bet.cashedAt = undefined; // Revert in-memory cashout if database update failed
      console.error(`Manual cashout payout failed for user ${userId}. Reverting cashout status.`);
      return { success: false };
    }

    // Broadcast payout
    this.broadcastCallback("cashout", {
      userId: bet.userId,
      username: bet.username,
      cashedAt: cashedAtMult,
      winAmount,
      betIndex,
    });

    return {
      success: true,
      multiplier: cashedAtMult,
      winAmount,
    };
  }

  private generateBots() {
    const botCount = 5 + Math.floor(Math.random() * 10); // 5 to 14 bots
    for (let i = 0; i < botCount; i++) {
      const botName =
        this.BOT_NAMES[Math.floor(Math.random() * this.BOT_NAMES.length)] +
        Math.floor(Math.random() * 99);
      const amount = Math.round((Math.random() * 150 + 5) * 10) / 10;
      const autoCashout =
        Math.random() < 0.65 ? Math.round((1.1 + Math.random() * 6) * 100) / 100 : undefined;

      this.activeBets.push({
        userId: `bot-${i}-${Math.floor(Math.random() * 100000)}`,
        username: botName,
        amount,
        autoCashout,
        isBot: true,
      });
    }
  }

  public broadcastState() {
    const state = {
      phase: this.phase,
      multiplier: this.multiplier,
      countdown: this.countdown,
      serverSeedHash: this.serverSeedHash,
      nonce: this.nonce,
      bets: this.activeBets,
      history: this.recentRounds.map((r) => ({
        id: r.id,
        crash: r.crashPoint,
        serverSeed: r.serverSeed,
        serverSeedHash: r.serverSeedHash,
        clientSeed: r.clientSeed,
        nonce: r.nonce,
        endedAt: r.endedAt,
      })),
    };
    this.broadcastCallback("state", state);
  }
}

export const gameEngine = new GameEngine();
