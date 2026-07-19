import { Router, Response } from "express";
import { query, pool } from "../db/db.js";
import { authenticateToken, requireAdmin, AuthenticatedRequest } from "../middleware/auth.js";
import { gameEngine } from "../game/engine.js";

const router = Router();

// ============================================================
// PUBLIC & STATS API
// ============================================================

// Get Leaderboard
router.get("/stats/leaderboard", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT p.display_name, p.avatar_url, SUM(t.amount) as total_wins
       FROM public.transactions t
       JOIN public.profiles p ON t.user_id = p.id
       WHERE t.type = 'win' AND t.status = 'completed'
       GROUP BY p.id, p.display_name, p.avatar_url
       ORDER BY total_wins DESC
       LIMIT 10`,
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Leaderboard error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get Game Stats Summary (scoped to past 24 hours to avoid unbounded full table scans)
router.get("/stats/summary", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const roundsRes = await query(
      "SELECT COUNT(*) as count, AVG(crash_point) as avg_mult FROM public.crash_rounds WHERE ended_at >= now() - interval '24 hours'",
    );
    const betsRes = await query(
      "SELECT SUM(bet_amount) as total_wagered, SUM(win_amount) as total_payout FROM public.crash_bets WHERE created_at >= now() - interval '24 hours'",
    );

    res.json({
      totalRounds: parseInt(roundsRes.rows[0].count || "0", 10),
      averageMultiplier: parseFloat(roundsRes.rows[0].avg_mult || "0").toFixed(2),
      totalWagered: parseFloat(betsRes.rows[0].total_wagered || "0").toFixed(2),
      totalPayout: parseFloat(betsRes.rows[0].total_payout || "0").toFixed(2),
    });
  } catch (err) {
    console.error("Stats summary error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ============================================================
// WALLET API (REQUIRES AUTH)
// ============================================================

// Get balance & transactions
router.get("/wallet", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const walletRes = await query(
      "SELECT balance, currency FROM public.wallets WHERE user_id = $1",
      [req?.user?.id],
    );
    if (walletRes.rows.length === 0) {
      return res.status(404).json({ error: "Wallet not found" });
    }

    const txRes = await query(
      "SELECT id, type, status, amount, created_at FROM public.transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20",
      [req?.user?.id],
    );

    res.json({
      wallet: walletRes.rows[0],
      transactions: txRes.rows,
    });
  } catch (err) {
    console.error("Wallet status error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Mock Deposit
router.post(
  "/wallet/deposit",
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    const { amount } = req.body;
    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ error: "Invalid deposit amount" });
    }

    const userId = req.user?.id;
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Add balance
      await client.query(
        "UPDATE public.wallets SET balance = balance + $1, total_deposited = total_deposited + $1, updated_at = now() WHERE user_id = $2",
        [amount, userId],
      );

      // Create Transaction
      const txRes = await client.query(
        `INSERT INTO public.transactions (user_id, type, status, amount, meta)
       VALUES ($1, 'deposit', 'completed', $2, $3) RETURNING *`,
        [userId, amount, JSON.stringify({ method: "mock_gateway" })],
      );

      await client.query("COMMIT");
      res.json({ success: true, transaction: txRes.rows[0] });
    } catch (err) {
      await client.query("ROLLBACK");
      console.error("Deposit error:", err);
      res.status(500).json({ error: "Deposit transaction failed" });
    } finally {
      client.release();
    }
  },
);

// Mock Withdrawal
router.post(
  "/wallet/withdraw",
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    const { amount } = req.body;
    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ error: "Invalid withdrawal amount" });
    }

    const userId = req.user?.id;
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Check balance
      const walletRes = await client.query(
        "SELECT balance FROM public.wallets WHERE user_id = $1 FOR UPDATE",
        [userId],
      );
      if (walletRes.rows.length === 0) {
        throw new Error("Wallet not found");
      }

      const balance = Number(walletRes.rows[0].balance);
      if (balance < amount) {
        return res.status(400).json({ error: "Insufficient balance" });
      }

      // Deduct balance
      await client.query(
        "UPDATE public.wallets SET balance = balance - $1, total_withdrawn = total_withdrawn + $1, updated_at = now() WHERE user_id = $2",
        [amount, userId],
      );

      // Create Transaction
      const txRes = await client.query(
        `INSERT INTO public.transactions (user_id, type, status, amount, meta)
       VALUES ($1, 'withdrawal', 'completed', $2, $3) RETURNING *`,
        [userId, -amount, JSON.stringify({ method: "mock_bank" })],
      );

      await client.query("COMMIT");
      res.json({ success: true, transaction: txRes.rows[0] });
    } catch (err) {
      await client.query("ROLLBACK");
      console.error("Withdrawal error:", err);
      res.status(500).json({ error: "Withdrawal transaction failed" });
    } finally {
      client.release();
    }
  },
);

// ============================================================
// REFERRAL SYSTEM (REQUIRES AUTH)
// ============================================================

// Get referral state
router.get("/referrals", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const profileRes = await query("SELECT referral_code FROM public.profiles WHERE id = $1", [
      req.user?.id,
    ]);
    const refsRes = await query(
      `SELECT r.created_at, p.display_name, r.reward_amount
       FROM public.referrals r
       JOIN public.profiles p ON r.referee_id = p.id
       WHERE r.referrer_id = $1
       ORDER BY r.created_at DESC`,
      [req.user?.id],
    );

    const code = profileRes.rows[0]?.referral_code || "";
    res.json({
      referralCode: code,
      referralsCount: refsRes.rows.length,
      referrals: refsRes.rows,
    });
  } catch (err) {
    console.error("Get referrals error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Claim Referral Code
router.post(
  "/referrals/claim",
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    const { code } = req.body;
    if (!code || typeof code !== "string" || code.trim().length === 0) {
      return res.status(400).json({ error: "Referral code is required" });
    }

    const userId = req.user?.id;
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Check if user already claimed a code
      const selfRes = await client.query("SELECT referred_by FROM public.profiles WHERE id = $1", [
        userId,
      ]);
      if (selfRes.rows[0]?.referred_by) {
        return res.status(400).json({ error: "You have already claimed a referral code" });
      }

      // Find referrer profile
      const referrerRes = await client.query(
        "SELECT id, referred_by FROM public.profiles WHERE referral_code = $1",
        [code.trim().toUpperCase()],
      );
      if (referrerRes.rows.length === 0) {
        return res.status(404).json({ error: "Referral code not found" });
      }
      const referrerId = referrerRes.rows[0].id;
      const referrerReferredBy = referrerRes.rows[0].referred_by;

      if (referrerId === userId) {
        return res.status(400).json({ error: "You cannot claim your own referral code" });
      }

      if (referrerReferredBy === userId) {
        return res.status(400).json({ error: "Circular referral loops are not allowed" });
      }

      // Update profile
      await client.query("UPDATE public.profiles SET referred_by = $1 WHERE id = $2", [
        referrerId,
        userId,
      ]);

      // Give referral bonus to referrer (€10.00 mock bonus)
      const reward = 10.0;
      await client.query("UPDATE public.wallets SET balance = balance + $1 WHERE user_id = $2", [
        reward,
        referrerId,
      ]);

      // Create transaction for referrer
      await client.query(
        `INSERT INTO public.transactions (user_id, type, status, amount, meta)
       VALUES ($1, 'bonus', 'completed', $2, $3)`,
        [referrerId, reward, JSON.stringify({ type: "referral_bonus", refereeId: userId })],
      );

      // Record referral
      await client.query(
        "INSERT INTO public.referrals (referrer_id, referee_id, reward_amount) VALUES ($1, $2, $3)",
        [referrerId, userId, reward],
      );

      await client.query("COMMIT");
      res.json({ success: true, rewardClaimed: reward });
    } catch (err) {
      await client.query("ROLLBACK");
      console.error("Claim referral error:", err);
      res.status(500).json({ error: "Failed to claim referral code" });
    } finally {
      client.release();
    }
  },
);

// ============================================================
// ADMIN API (REQUIRES ADMIN)
// ============================================================

// Admin Dashboard Stats
router.get(
  "/admin/stats",
  authenticateToken,
  requireAdmin,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userCount = await query("SELECT COUNT(*) as count FROM public.profiles");
      const depositTotal = await query(
        "SELECT SUM(amount) as sum FROM public.transactions WHERE type = 'deposit' AND status = 'completed'",
      );
      const withdrawalTotal = await query(
        "SELECT SUM(amount) as sum FROM public.transactions WHERE type = 'withdrawal' AND status = 'completed'",
      );

      // GGR (Gross Gaming Revenue) = Bets - Wins (Recall: bets are negative amounts in transactions)
      const ggrRes = await query(
        `SELECT
         SUM(CASE WHEN type = 'bet' THEN -amount ELSE 0 END) as total_bets,
         SUM(CASE WHEN type = 'win' THEN amount ELSE 0 END) as total_wins
       FROM public.transactions`,
      );

      const totalBets = Number(ggrRes.rows[0].total_bets || 0);
      const totalWins = Number(ggrRes.rows[0].total_wins || 0);
      const ggr = totalBets - totalWins;

      res.json({
        userCount: parseInt(userCount.rows[0].count || "0", 10),
        totalDeposits: parseFloat(depositTotal.rows[0].sum || "0").toFixed(2),
        totalWithdrawals: parseFloat(withdrawalTotal.rows[0].sum || "0").toFixed(2),
        ggr: ggr.toFixed(2),
        activeEngineSettings: {
          houseEdge: gameEngine.houseEdge,
          winRate: gameEngine.winRate,
          currentRTP: ((1 - gameEngine.houseEdge) * 100).toFixed(1) + "%",
        },
      });
    } catch (err) {
      console.error("Admin stats error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// Manage Users
router.get(
  "/admin/users",
  authenticateToken,
  requireAdmin,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const users = await query(
        `SELECT p.id, p.username, p.display_name, p.email, p.is_suspended, w.balance, p.created_at
       FROM public.profiles p
       JOIN public.wallets w ON p.id = w.user_id
       ORDER BY p.created_at DESC`,
      );
      res.json(users.rows);
    } catch (err) {
      console.error("Admin list users error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// Suspend/Unsuspend User
router.post(
  "/admin/users/:id/suspend",
  authenticateToken,
  requireAdmin,
  async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { suspend } = req.body; // boolean

    try {
      await query(
        "UPDATE public.profiles SET is_suspended = $1, updated_at = now() WHERE id = $2",
        [!!suspend, id],
      );
      res.json({ success: true, isSuspended: !!suspend });
    } catch (err) {
      console.error("Suspend user error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// Configure Game Settings (RTP)
router.post(
  "/admin/settings",
  authenticateToken,
  requireAdmin,
  async (req: AuthenticatedRequest, res: Response) => {
    const { houseEdge, winRate } = req.body;

    if (houseEdge !== undefined) {
      if (isNaN(houseEdge) || houseEdge < 0 || houseEdge > 0.1) {
        return res
          .status(400)
          .json({ error: "House edge must be between 0 and 10% (0.00 to 0.10)" });
      }
      gameEngine.houseEdge = Number(houseEdge);
    }

    if (winRate !== undefined) {
      if (isNaN(winRate) || winRate < 0.05 || winRate > 0.5) {
        return res
          .status(400)
          .json({ error: "Win rate (Rounds >= 2.0x) must be between 5% and 50% (0.05 to 0.50)" });
      }
      gameEngine.winRate = Number(winRate);
    }

    res.json({
      success: true,
      settings: {
        houseEdge: gameEngine.houseEdge,
        winRate: gameEngine.winRate,
        currentRTP: ((1 - gameEngine.houseEdge) * 100).toFixed(1) + "%",
      },
    });
  },
);

// ============================================================
// PROFILE ENDPOINTS (REQUIRES AUTH)
// ============================================================

// Get User Profile
router.get("/profile", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  try {
    const profileRes = await query(
      "SELECT display_name, avatar_url, referral_code, client_seed FROM public.profiles WHERE id = $1",
      [userId],
    );
    if (profileRes.rows.length === 0) {
      return res.status(404).json({ error: "Profile not found" });
    }
    res.json(profileRes.rows[0]);
  } catch (err: any) {
    console.error("Get profile error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update Client Seed
router.post(
  "/profile/client-seed",
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    const { clientSeed } = req.body;
    if (!clientSeed || typeof clientSeed !== "string" || clientSeed.trim().length === 0) {
      return res.status(400).json({ error: "Client seed is required" });
    }
    const userId = req.user?.id;
    try {
      await query("UPDATE public.profiles SET client_seed = $1, updated_at = now() WHERE id = $2", [
        clientSeed.trim(),
        userId,
      ]);
      res.json({ success: true, clientSeed: clientSeed.trim() });
    } catch (err: any) {
      console.error("Update client seed error:", err);
      res.status(500).json({ error: "Failed to update client seed" });
    }
  },
);

export default router;
