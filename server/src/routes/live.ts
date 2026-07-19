import { Router, Response } from "express";
import { query, pool } from "../db/db.js";
import { authenticateToken, AuthenticatedRequest } from "../middleware/auth.js";

const router = Router();

// ============================================================
// HELPERS
// ============================================================

// Baccarat value helper
function getBaccaratValue(cards: number[]): number {
  let total = 0;
  for (const c of cards) {
    const rank = c % 13;
    if (rank >= 10)
      total += 0; // 10, J, Q, K = 0
    else if (rank === 0)
      total += 1; // Ace = 1
    else total += rank + 1;
  }
  return total % 10;
}

// Baccarat outcome resolution helper
function resolveBaccaratHand() {
  const drawCard = () => Math.floor(Math.random() * 52);
  const p1 = drawCard(),
    p2 = drawCard();
  const b1 = drawCard(),
    b2 = drawCard();
  let pCards = [p1, p2];
  let bCards = [b1, b2];

  const pVal = getBaccaratValue(pCards);
  const bVal = getBaccaratValue(bCards);

  // Natural check
  if (pVal < 8 && bVal < 8) {
    // Player draws third card if 0-5
    let playerThird: number | null = null;
    if (pVal <= 5) {
      playerThird = drawCard();
      pCards.push(playerThird);
    }

    // Banker third card rules
    if (playerThird === null) {
      // Player stood, banker draws on 0-5
      if (bVal <= 5) bCards.push(drawCard());
    } else {
      const ptVal =
        playerThird % 13 >= 10 ? 0 : playerThird % 13 === 0 ? 1 : (playerThird % 13) + 1;
      if (bVal <= 2) bCards.push(drawCard());
      else if (bVal === 3 && ptVal !== 8) bCards.push(drawCard());
      else if (bVal === 4 && ptVal >= 2 && ptVal <= 7) bCards.push(drawCard());
      else if (bVal === 5 && ptVal >= 4 && ptVal <= 7) bCards.push(drawCard());
      else if (bVal === 6 && ptVal >= 6 && ptVal <= 7) bCards.push(drawCard());
    }
  }

  const finalP = getBaccaratValue(pCards);
  const finalB = getBaccaratValue(bCards);
  let winner = "tie";
  if (finalP > finalB) winner = "player";
  else if (finalB > finalP) winner = "banker";

  return { pCards, bCards, finalP, finalB, winner };
}

// Blackjack value helper
const CARD_VALUES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 10, 10]; // A-K
function getHandValue(cards: number[]): number {
  let total = 0;
  let aces = 0;
  for (const c of cards) {
    const v = CARD_VALUES[c % 13];
    if (v === 1) aces++;
    total += v;
  }
  while (aces > 0 && total + 10 <= 21) {
    total += 10;
    aces--;
  }
  return total;
}

// Poker hand evaluation helper
const POKER_RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
function evaluatePokerHand(cards: number[]) {
  const ranks = cards.map((c) => c % 13).sort((a, b) => a - b);
  const suits = cards.map((c) => Math.floor(c / 13) % 4);

  const isFlush = suits[0] === suits[1] && suits[1] === suits[2];
  const isStraight =
    (ranks[2] - ranks[0] === 2 && ranks[1] - ranks[0] === 1) ||
    (ranks[0] === 0 && ranks[1] === 11 && ranks[2] === 12); // A-Q-K

  const isThreeOfAKind = ranks[0] === ranks[1] && ranks[1] === ranks[2];
  const isPair = ranks[0] === ranks[1] || ranks[1] === ranks[2] || ranks[0] === ranks[2];

  if (isFlush && isStraight) return { rank: 6, name: "Straight Flush" };
  if (isThreeOfAKind) return { rank: 5, name: "Three of a Kind" };
  if (isStraight) return { rank: 4, name: "Straight" };
  if (isFlush) return { rank: 3, name: "Flush" };
  if (isPair) return { rank: 2, name: "Pair" };

  const highest = Math.max(...ranks);
  const name = highest >= 11 ? `High ${POKER_RANKS[highest]}` : `High ${POKER_RANKS[highest]}`;
  return { rank: highest >= 11 ? 1 : 0, name };
}

const POKER_PAYOUTS: Record<number, number> = {
  6: 40, // Straight flush
  5: 30, // Three of a kind
  4: 6, // Straight
  3: 3, // Flush
  2: 1, // Pair
};

// Mines multiplier calculator
function getMinesMultiplier(revealed: number, minesCount: number): number {
  let mult = 1;
  for (let i = 0; i < revealed; i++) {
    mult *= (25 - i) / (25 - minesCount - i);
  }
  // 1% house edge
  return Math.max(1.0, Math.round(mult * 0.99 * 100) / 100);
}

// Transaction execution helper
async function executeLiveBet(userId: string, amount: number) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Lock wallet row
    const walletRes = await client.query(
      "SELECT balance FROM public.wallets WHERE user_id = $1 FOR UPDATE",
      [userId],
    );
    if (walletRes.rows.length === 0) {
      throw new Error("Wallet not found");
    }

    const balance = Number(walletRes.rows[0].balance);
    if (balance < amount) {
      throw new Error("Insufficient balance");
    }

    // Deduct bet amount
    await client.query(
      "UPDATE public.wallets SET balance = balance - $1, updated_at = now() WHERE user_id = $2",
      [amount, userId],
    );

    // Insert transaction
    await client.query(
      `INSERT INTO public.transactions (user_id, type, status, amount, meta)
       VALUES ($1, 'bet', 'completed', $2, $3)`,
      [userId, -amount, JSON.stringify({ source: "live_games" })],
    );

    await client.query("COMMIT");
    return balance - amount;
  } catch (err: any) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function executeLivePayout(
  userId: string,
  payout: number,
  gameType: string,
  roundId?: string | number,
) {
  if (payout <= 0) return;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Add payout amount
    await client.query(
      "UPDATE public.wallets SET balance = balance + $1, updated_at = now() WHERE user_id = $2",
      [payout, userId],
    );

    // Insert transaction
    await client.query(
      `INSERT INTO public.transactions (user_id, type, status, amount, meta)
       VALUES ($1, 'win', 'completed', $2, $3)`,
      [userId, payout, JSON.stringify({ source: "live_games", gameType, roundId })],
    );

    await client.query("COMMIT");
  } catch (err: any) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

// ============================================================
// ONE-SHOT GAMES ROUTE (Roulette, Baccarat, Dream Catcher, etc.)
// ============================================================

router.post("/play", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const { gameType, betAmount, choice } = req.body;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const bet = Number(betAmount);
  if (isNaN(bet) || bet <= 0) {
    return res.status(400).json({ error: "Invalid bet amount" });
  }

  try {
    // 1. Deduct Bet
    const newBalanceAfterBet = await executeLiveBet(userId, bet);

    let won = false;
    let payout = 0;
    let result = "";
    let data: any = {};

    // 2. Resolve game
    if (gameType === "roulette") {
      const ROULETTE_NUMBERS = [
        { num: 0, color: "green" },
        { num: 32, color: "red" },
        { num: 15, color: "black" },
        { num: 19, color: "red" },
        { num: 4, color: "black" },
        { num: 21, color: "red" },
        { num: 2, color: "black" },
        { num: 25, color: "red" },
        { num: 17, color: "black" },
        { num: 34, color: "red" },
        { num: 6, color: "black" },
        { num: 27, color: "red" },
        { num: 13, color: "black" },
        { num: 36, color: "red" },
        { num: 11, color: "black" },
        { num: 30, color: "red" },
        { num: 8, color: "black" },
        { num: 23, color: "red" },
        { num: 10, color: "black" },
        { num: 5, color: "red" },
        { num: 24, color: "black" },
        { num: 16, color: "red" },
        { num: 33, color: "black" },
        { num: 1, color: "red" },
        { num: 20, color: "black" },
        { num: 14, color: "red" },
        { num: 31, color: "black" },
        { num: 9, color: "red" },
        { num: 22, color: "black" },
        { num: 18, color: "red" },
        { num: 29, color: "black" },
        { num: 7, color: "red" },
        { num: 28, color: "black" },
        { num: 12, color: "red" },
        { num: 35, color: "black" },
        { num: 3, color: "red" },
        { num: 26, color: "black" },
      ];
      const rolled = ROULETTE_NUMBERS[Math.floor(Math.random() * ROULETTE_NUMBERS.length)];
      result = `${rolled.num} ${rolled.color}`;

      // Check win
      if (choice === rolled.color) {
        won = true;
        payout = rolled.color === "green" ? bet * 35 : bet * 2;
      } else if (choice === "odd" && rolled.num !== 0 && rolled.num % 2 !== 0) {
        won = true;
        payout = bet * 2;
      } else if (choice === "even" && rolled.num !== 0 && rolled.num % 2 === 0) {
        won = true;
        payout = bet * 2;
      } else if (choice === "1-18" && rolled.num >= 1 && rolled.num <= 18) {
        won = true;
        payout = bet * 2;
      } else if (choice === "19-36" && rolled.num >= 19 && rolled.num <= 36) {
        won = true;
        payout = bet * 2;
      } else if (choice === String(rolled.num)) {
        won = true;
        payout = bet * 36;
      }
      data = { number: rolled.num, color: rolled.color };
    } else if (gameType === "baccarat") {
      const bac = resolveBaccaratHand();
      result =
        bac.winner === "tie"
          ? `Tie ${bac.finalP}–${bac.finalB}`
          : `${bac.winner === "player" ? "Player" : "Banker"} win`;

      if (choice === bac.winner) {
        won = true;
        payout = bac.winner === "player" ? bet * 2 : bac.winner === "banker" ? bet * 1.95 : bet * 8;
      } else if (bac.winner === "tie" && (choice === "player" || choice === "banker")) {
        // Push on Tie for player/banker bets
        won = true;
        payout = bet;
      }
      data = {
        playerBacCards: bac.pCards,
        bankerBacCards: bac.bCards,
        finalP: bac.finalP,
        finalB: bac.finalB,
      };
    } else if (gameType === "dreamcatcher" || gameType === "wheel" || gameType === "crazytime") {
      const DC_SEGMENTS = [
        { value: 1, payout: 2, weight: 23 },
        { value: 2, payout: 3, weight: 15 },
        { value: 5, payout: 6, weight: 7 },
        { value: 10, payout: 11, weight: 4 },
        { value: 20, payout: 21, weight: 2 },
        { value: 40, payout: 41, weight: 1 },
      ];
      // Weighted roll
      const poolList: number[] = [];
      DC_SEGMENTS.forEach((s, idx) => {
        for (let i = 0; i < s.weight; i++) poolList.push(idx);
      });
      const rolledIdx = poolList[Math.floor(Math.random() * poolList.length)];
      const rolledSeg = DC_SEGMENTS[rolledIdx];
      result = String(rolledSeg.value);

      if (choice === String(rolledSeg.value)) {
        won = true;
        payout = bet * rolledSeg.payout;
      }
      data = { segment: rolledSeg.value };
    } else if (gameType === "coinflip") {
      const coin = Math.random() < 0.5 ? "red" : "blue";
      result = coin;
      if (choice === coin) {
        won = true;
        payout = bet * 2;
      }
      data = { coin };
    } else if (gameType === "plinko") {
      // Bins: 10x, 2x, 0.5x, 0.2x, 0.5x, 2x, 10x
      const PlinkoBins = [10, 2, 0.5, 0.2, 0.5, 2, 10];
      const weights = [0.03, 0.12, 0.2, 0.3, 0.2, 0.12, 0.03]; // Symmetric weights centered on 0.2x
      const rand = Math.random();
      let cumulative = 0;
      let binIdx = 3; // fallback middle bin
      for (let i = 0; i < weights.length; i++) {
        cumulative += weights[i];
        if (rand <= cumulative) {
          binIdx = i;
          break;
        }
      }
      const multiplier = PlinkoBins[binIdx];
      result = `${multiplier}x`;
      won = multiplier >= 1;
      payout = Number((bet * multiplier).toFixed(2));
      data = { binIdx, multiplier };
    } else {
      return res.status(400).json({ error: "Unknown game type" });
    }

    // 3. Payout Winnings
    if (won && payout > 0) {
      await executeLivePayout(userId, payout, gameType);
    }

    // 4. Fetch final updated balance
    const walletRes = await query("SELECT balance FROM public.wallets WHERE user_id = $1", [
      userId,
    ]);
    const finalBalance = Number(walletRes.rows[0]?.balance || 0);

    res.json({
      won,
      payout,
      result,
      newBalance: finalBalance,
      data,
    });
  } catch (err: any) {
    console.error("One-shot live play error:", err.message);
    res.status(500).json({ error: err.message || "Failed to execute bet" });
  }
});

// ============================================================
// STATEFUL GAMES: BLACKJACK
// ============================================================

// 1. Deal cards
router.post(
  "/blackjack/deal",
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    const { betAmount } = req.body;
    const userId = req.user?.id;

    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const bet = Number(betAmount);
    if (isNaN(bet) || bet <= 0) return res.status(400).json({ error: "Invalid bet" });

    try {
      // Delete any active blackjack sessions for the user to avoid leaks/multi-bets
      await query(
        "UPDATE public.live_game_sessions SET status = 'completed' WHERE user_id = $1 AND game_type = 'blackjack' AND status = 'active'",
        [userId],
      );

      // Deduct bet from database wallet
      const newBalance = await executeLiveBet(userId, bet);

      // Draw initial cards
      const draw = () => Math.floor(Math.random() * 52);
      const p1 = draw(),
        p2 = draw();
      const d1 = draw(),
        d2 = draw();
      const playerCards = [p1, p2];
      const dealerCards = [d1, d2];

      const playerValue = getHandValue(playerCards);
      const dealerValue = getHandValue([d1]); // initially show only the first dealer card value

      // Check for natural Blackjack
      if (playerValue === 21) {
        const payout = bet * 2.5;
        await executeLivePayout(userId, payout, "blackjack");

        // Save as completed
        const sessionRes = await query(
          `INSERT INTO public.live_game_sessions (user_id, game_type, bet_amount, state, status)
         VALUES ($1, 'blackjack', $2, $3, 'completed') RETURNING id`,
          [
            userId,
            bet,
            JSON.stringify({
              playerCards,
              dealerCards,
              playerValue,
              dealerValue: getHandValue(dealerCards),
              won: true,
              payout,
            }),
          ],
        );

        return res.json({
          sessionId: sessionRes.rows[0].id,
          phase: "result",
          playerCards,
          dealerCards,
          playerValue,
          dealerValue: getHandValue(dealerCards),
          won: true,
          payout,
          newBalance: newBalance + payout,
          roundResult: "Blackjack!",
        });
      }

      // Save as active
      const sessionRes = await query(
        `INSERT INTO public.live_game_sessions (user_id, game_type, bet_amount, state, status)
       VALUES ($1, 'blackjack', $2, $3, 'active') RETURNING id`,
        [userId, bet, JSON.stringify({ playerCards, dealerCards })],
      );

      res.json({
        sessionId: sessionRes.rows[0].id,
        phase: "playing",
        playerCards,
        dealerCards: [d1], // Hide second dealer card
        playerValue,
        dealerValue,
        newBalance,
      });
    } catch (err: any) {
      console.error("Blackjack deal error:", err.message);
      res.status(500).json({ error: err.message || "Failed to deal cards" });
    }
  },
);

// 2. Hit
router.post(
  "/blackjack/hit",
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    const { sessionId } = req.body;
    const userId = req.user?.id;

    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    try {
      const sessionRes = await query(
        "SELECT id, bet_amount, state FROM public.live_game_sessions WHERE id = $1 AND user_id = $2 AND status = 'active'",
        [sessionId, userId],
      );

      if (sessionRes.rows.length === 0) {
        return res.status(400).json({ error: "Active game session not found" });
      }

      const { playerCards, dealerCards } = sessionRes.rows[0].state;
      const bet = Number(sessionRes.rows[0].bet_amount);

      const newCard = Math.floor(Math.random() * 52);
      const updatedPlayerCards = [...playerCards, newCard];
      const playerValue = getHandValue(updatedPlayerCards);

      if (playerValue > 21) {
        // Bust! Game over.
        await query(
          "UPDATE public.live_game_sessions SET status = 'completed', state = $1 WHERE id = $2",
          [
            JSON.stringify({
              playerCards: updatedPlayerCards,
              dealerCards,
              playerValue,
              won: false,
              payout: 0,
            }),
            sessionId,
          ],
        );

        return res.json({
          phase: "result",
          playerCards: updatedPlayerCards,
          playerValue,
          roundResult: `Bust (${playerValue})`,
          won: false,
          payout: 0,
        });
      }

      // Still active
      await query("UPDATE public.live_game_sessions SET state = $1 WHERE id = $2", [
        JSON.stringify({ playerCards: updatedPlayerCards, dealerCards }),
        sessionId,
      ]);

      res.json({
        phase: "playing",
        playerCards: updatedPlayerCards,
        playerValue,
      });
    } catch (err: any) {
      console.error("Blackjack hit error:", err.message);
      res.status(500).json({ error: "Failed to draw card" });
    }
  },
);

// 3. Stand
router.post(
  "/blackjack/stand",
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    const { sessionId } = req.body;
    const userId = req.user?.id;

    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    try {
      const sessionRes = await query(
        "SELECT id, bet_amount, state FROM public.live_game_sessions WHERE id = $1 AND user_id = $2 AND status = 'active'",
        [sessionId, userId],
      );

      if (sessionRes.rows.length === 0) {
        return res.status(400).json({ error: "Active game session not found" });
      }

      const { playerCards, dealerCards } = sessionRes.rows[0].state;
      const bet = Number(sessionRes.rows[0].bet_amount);

      let updatedDealerCards = [...dealerCards];
      let dealerValue = getHandValue(updatedDealerCards);

      // Dealer draws until >= 17
      while (dealerValue < 17) {
        updatedDealerCards.push(Math.floor(Math.random() * 52));
        dealerValue = getHandValue(updatedDealerCards);
      }

      const playerValue = getHandValue(playerCards);
      let won = false;
      let payout = 0;
      let result = "";

      if (dealerValue > 21) {
        won = true;
        payout = bet * 2;
        result = `Dealer busts (${dealerValue})`;
      } else if (playerValue > dealerValue) {
        won = true;
        payout = bet * 2;
        result = `${playerValue} vs ${dealerValue}`;
      } else if (playerValue === dealerValue) {
        won = true;
        payout = bet; // Push, return bet
        result = `Push (${playerValue})`;
      } else {
        result = `${playerValue} vs ${dealerValue}`;
      }

      // Payout transaction
      if (payout > 0) {
        await executeLivePayout(userId, payout, "blackjack", sessionId);
      }

      // Mark completed
      await query(
        "UPDATE public.live_game_sessions SET status = 'completed', state = $1 WHERE id = $2",
        [
          JSON.stringify({
            playerCards,
            dealerCards: updatedDealerCards,
            playerValue,
            dealerValue,
            won,
            payout,
          }),
          sessionId,
        ],
      );

      // Get final balance
      const walletRes = await query("SELECT balance FROM public.wallets WHERE user_id = $1", [
        userId,
      ]);
      const finalBalance = Number(walletRes.rows[0]?.balance || 0);

      res.json({
        phase: "result",
        playerCards,
        dealerCards: updatedDealerCards,
        playerValue,
        dealerValue,
        won,
        payout,
        newBalance: finalBalance,
        roundResult: result,
      });
    } catch (err: any) {
      console.error("Blackjack stand error:", err.message);
      res.status(500).json({ error: "Failed to resolve round" });
    }
  },
);

// 4. Double down
router.post(
  "/blackjack/double",
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    const { sessionId } = req.body;
    const userId = req.user?.id;

    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    try {
      const sessionRes = await query(
        "SELECT id, bet_amount, state FROM public.live_game_sessions WHERE id = $1 AND user_id = $2 AND status = 'active'",
        [sessionId, userId],
      );

      if (sessionRes.rows.length === 0) {
        return res.status(400).json({ error: "Active game session not found" });
      }

      const { playerCards, dealerCards } = sessionRes.rows[0].state;
      const originalBet = Number(sessionRes.rows[0].bet_amount);

      // Deduct additional bet (doubling)
      const newBalance = await executeLiveBet(userId, originalBet);
      const doubledBet = originalBet * 2;

      // Draw exactly one card
      const newCard = Math.floor(Math.random() * 52);
      const updatedPlayerCards = [...playerCards, newCard];
      const playerValue = getHandValue(updatedPlayerCards);

      if (playerValue > 21) {
        // Bust
        await query(
          "UPDATE public.live_game_sessions SET status = 'completed', state = $1 WHERE id = $2",
          [
            JSON.stringify({
              playerCards: updatedPlayerCards,
              dealerCards,
              playerValue,
              won: false,
              payout: 0,
            }),
            sessionId,
          ],
        );

        return res.json({
          phase: "result",
          playerCards: updatedPlayerCards,
          playerValue,
          roundResult: `Bust (${playerValue})`,
          won: false,
          payout: 0,
          newBalance,
        });
      }

      // Dealer draws
      let updatedDealerCards = [...dealerCards];
      let dealerValue = getHandValue(updatedDealerCards);
      while (dealerValue < 17) {
        updatedDealerCards.push(Math.floor(Math.random() * 52));
        dealerValue = getHandValue(updatedDealerCards);
      }

      let won = false;
      let payout = 0;
      let result = "";

      if (dealerValue > 21) {
        won = true;
        payout = doubledBet * 2;
        result = `Dealer busts (${dealerValue})`;
      } else if (playerValue > dealerValue) {
        won = true;
        payout = doubledBet * 2;
        result = `${playerValue} vs ${dealerValue}`;
      } else if (playerValue === dealerValue) {
        won = true;
        payout = doubledBet; // Push
        result = `Push (${playerValue})`;
      } else {
        result = `${playerValue} vs ${dealerValue}`;
      }

      // Payout transaction
      if (payout > 0) {
        await executeLivePayout(userId, payout, "blackjack", sessionId);
      }

      // Update database session
      await query(
        "UPDATE public.live_game_sessions SET status = 'completed', bet_amount = $1, state = $2 WHERE id = $3",
        [
          doubledBet,
          JSON.stringify({
            playerCards: updatedPlayerCards,
            dealerCards: updatedDealerCards,
            playerValue,
            dealerValue,
            won,
            payout,
          }),
          sessionId,
        ],
      );

      // Final balance
      const walletRes = await query("SELECT balance FROM public.wallets WHERE user_id = $1", [
        userId,
      ]);
      const finalBalance = Number(walletRes.rows[0]?.balance || 0);

      res.json({
        phase: "result",
        playerCards: updatedPlayerCards,
        dealerCards: updatedDealerCards,
        playerValue,
        dealerValue,
        won,
        payout,
        newBalance: finalBalance,
        roundResult: result,
      });
    } catch (err: any) {
      console.error("Blackjack double error:", err.message);
      res.status(500).json({ error: "Failed to double down" });
    }
  },
);

// ============================================================
// STATEFUL GAMES: MINES
// ============================================================

// 1. Start board
router.post("/mines/start", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const { betAmount, mineCount } = req.body;
  const userId = req.user?.id;

  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const bet = Number(betAmount);
  const minesNum = Number(mineCount);

  if (isNaN(bet) || bet <= 0) return res.status(400).json({ error: "Invalid bet" });
  if (isNaN(minesNum) || minesNum < 1 || minesNum > 24)
    return res.status(400).json({ error: "Invalid mines count" });

  try {
    // End any existing mines sessions
    await query(
      "UPDATE public.live_game_sessions SET status = 'completed' WHERE user_id = $1 AND game_type = 'mines' AND status = 'active'",
      [userId],
    );

    // Deduct bet from database wallet
    const newBalance = await executeLiveBet(userId, bet);

    // Generate mine positions (choosing mineCount distinct integers from 0 to 24)
    const mines: number[] = [];
    while (mines.length < minesNum) {
      const idx = Math.floor(Math.random() * 25);
      if (!mines.includes(idx)) mines.push(idx);
    }

    const sessionRes = await query(
      `INSERT INTO public.live_game_sessions (user_id, game_type, bet_amount, state, status)
       VALUES ($1, 'mines', $2, $3, 'active') RETURNING id`,
      [userId, bet, JSON.stringify({ mines, revealed: [], minesCount: minesNum })],
    );

    res.json({
      sessionId: sessionRes.rows[0].id,
      phase: "playing",
      minesCount: minesNum,
      revealedCount: 0,
      currentMultiplier: 1.0,
      newBalance,
    });
  } catch (err: any) {
    console.error("Mines start error:", err.message);
    res.status(500).json({ error: "Failed to start Mines" });
  }
});

// 2. Reveal tile
router.post(
  "/mines/reveal",
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    const { sessionId, tileId } = req.body;
    const userId = req.user?.id;

    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const tile = Number(tileId);
    if (isNaN(tile) || tile < 0 || tile > 24)
      return res.status(400).json({ error: "Invalid tile ID" });

    try {
      const sessionRes = await query(
        "SELECT id, bet_amount, state FROM public.live_game_sessions WHERE id = $1 AND user_id = $2 AND status = 'active'",
        [sessionId, userId],
      );

      if (sessionRes.rows.length === 0) {
        return res.status(400).json({ error: "Active game session not found" });
      }

      const { mines, revealed, minesCount } = sessionRes.rows[0].state;
      const bet = Number(sessionRes.rows[0].bet_amount);

      if (revealed.includes(tile)) {
        return res.status(400).json({ error: "Tile already revealed" });
      }

      const updatedRevealed = [...revealed, tile];

      if (mines.includes(tile)) {
        // BOOM! Hit a mine.
        await query(
          "UPDATE public.live_game_sessions SET status = 'completed', state = $1 WHERE id = $2",
          [
            JSON.stringify({ mines, revealed: updatedRevealed, minesCount, won: false, payout: 0 }),
            sessionId,
          ],
        );

        return res.json({
          phase: "result",
          hitMine: true,
          mines, // reveal all mine positions to client
          revealedCount: updatedRevealed.length,
          currentMultiplier: 0,
          won: false,
          payout: 0,
          roundResult: "BOOM!",
        });
      }

      // Star! Calculate multiplier.
      const nextMult = getMinesMultiplier(updatedRevealed.length, minesCount);

      // If all safe tiles have been revealed, automatically cash out
      if (updatedRevealed.length === 25 - minesCount) {
        const payout = Number((bet * nextMult).toFixed(2));
        await executeLivePayout(userId, payout, "mines", sessionId);

        await query(
          "UPDATE public.live_game_sessions SET status = 'completed', state = $1 WHERE id = $2",
          [
            JSON.stringify({ mines, revealed: updatedRevealed, minesCount, won: true, payout }),
            sessionId,
          ],
        );

        // Get final balance
        const walletRes = await query("SELECT balance FROM public.wallets WHERE user_id = $1", [
          userId,
        ]);
        const finalBalance = Number(walletRes.rows[0]?.balance || 0);

        return res.json({
          phase: "result",
          hitMine: false,
          mines,
          revealedCount: updatedRevealed.length,
          currentMultiplier: nextMult,
          won: true,
          payout,
          newBalance: finalBalance,
          roundResult: `${nextMult.toFixed(2)}x`,
        });
      }

      // Save state
      await query("UPDATE public.live_game_sessions SET state = $1 WHERE id = $2", [
        JSON.stringify({ mines, revealed: updatedRevealed, minesCount }),
        sessionId,
      ]);

      res.json({
        phase: "playing",
        hitMine: false,
        revealedCount: updatedRevealed.length,
        currentMultiplier: nextMult,
      });
    } catch (err: any) {
      console.error("Mines reveal error:", err.message);
      res.status(500).json({ error: "Failed to reveal tile" });
    }
  },
);

// 3. Cash out
router.post(
  "/mines/cashout",
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    const { sessionId } = req.body;
    const userId = req.user?.id;

    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    try {
      const sessionRes = await query(
        "SELECT id, bet_amount, state FROM public.live_game_sessions WHERE id = $1 AND user_id = $2 AND status = 'active'",
        [sessionId, userId],
      );

      if (sessionRes.rows.length === 0) {
        return res.status(400).json({ error: "Active game session not found" });
      }

      const { mines, revealed, minesCount } = sessionRes.rows[0].state;
      const bet = Number(sessionRes.rows[0].bet_amount);

      if (revealed.length === 0) {
        return res
          .status(400)
          .json({ error: "Cannot cash out without revealing at least one tile" });
      }

      const mult = getMinesMultiplier(revealed.length, minesCount);
      const payout = Number((bet * mult).toFixed(2));

      // Execute database payout
      await executeLivePayout(userId, payout, "mines", sessionId);

      // Save as completed
      await query(
        "UPDATE public.live_game_sessions SET status = 'completed', state = $1 WHERE id = $2",
        [JSON.stringify({ mines, revealed, minesCount, won: true, payout }), sessionId],
      );

      // Final balance
      const walletRes = await query("SELECT balance FROM public.wallets WHERE user_id = $1", [
        userId,
      ]);
      const finalBalance = Number(walletRes.rows[0]?.balance || 0);

      res.json({
        phase: "result",
        hitMine: false,
        mines,
        revealedCount: revealed.length,
        currentMultiplier: mult,
        won: true,
        payout,
        newBalance: finalBalance,
        roundResult: `${mult.toFixed(2)}x`,
      });
    } catch (err: any) {
      console.error("Mines cashout error:", err.message);
      res.status(500).json({ error: "Failed to cash out" });
    }
  },
);

// ============================================================
// STATEFUL GAMES: POKER
// ============================================================

// 1. Deal (Ante bet)
router.post("/poker/deal", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const { betAmount } = req.body;
  const userId = req.user?.id;

  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const bet = Number(betAmount);
  if (isNaN(bet) || bet <= 0) return res.status(400).json({ error: "Invalid bet" });

  try {
    // Delete any active sessions
    await query(
      "UPDATE public.live_game_sessions SET status = 'completed' WHERE user_id = $1 AND game_type = 'poker' AND status = 'active'",
      [userId],
    );

    // Deduct bet
    const newBalance = await executeLiveBet(userId, bet);

    // Draw cards (3 cards for player, 3 cards for dealer)
    const draw = () => Math.floor(Math.random() * 52);
    const pCards: number[] = [];
    while (pCards.length < 3) {
      const c = draw();
      if (!pCards.includes(c)) pCards.push(c);
    }
    const dCards: number[] = [];
    while (dCards.length < 3) {
      const c = draw();
      if (!pCards.includes(c) && !dCards.includes(c)) dCards.push(c);
    }

    const sessionRes = await query(
      `INSERT INTO public.live_game_sessions (user_id, game_type, bet_amount, state, status)
       VALUES ($1, 'poker', $2, $3, 'active') RETURNING id`,
      [userId, bet, JSON.stringify({ playerCards: pCards, dealerCards: dCards })],
    );

    res.json({
      sessionId: sessionRes.rows[0].id,
      phase: "playing",
      pokerPlayerCards: pCards,
      pokerHandRank: evaluatePokerHand(pCards).name,
      newBalance,
    });
  } catch (err: any) {
    console.error("Poker deal error:", err.message);
    res.status(500).json({ error: "Failed to deal cards" });
  }
});

// 2. Play or Fold action
router.post(
  "/poker/action",
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    const { sessionId, action } = req.body;
    const userId = req.user?.id;

    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    if (action !== "play" && action !== "fold") {
      return res.status(400).json({ error: "Invalid action" });
    }

    try {
      const sessionRes = await query(
        "SELECT id, bet_amount, state FROM public.live_game_sessions WHERE id = $1 AND user_id = $2 AND status = 'active'",
        [sessionId, userId],
      );

      if (sessionRes.rows.length === 0) {
        return res.status(400).json({ error: "Active game session not found" });
      }

      const { playerCards, dealerCards } = sessionRes.rows[0].state;
      const bet = Number(sessionRes.rows[0].bet_amount);

      if (action === "fold") {
        // Fold: Lose bet immediately.
        await query(
          "UPDATE public.live_game_sessions SET status = 'completed', state = $1 WHERE id = $2",
          [
            JSON.stringify({ playerCards, dealerCards, won: false, payout: 0, result: "Folded" }),
            sessionId,
          ],
        );

        return res.json({
          phase: "result",
          roundResult: "Folded",
          won: false,
          payout: 0,
        });
      }

      // Action === "play"
      const pHand = evaluatePokerHand(playerCards);
      const dHand = evaluatePokerHand(dealerCards);

      const dealerQualifies = dHand.rank >= 1; // Queen-high or better
      let won = false;
      let payout = 0;
      let result = "";

      if (!dealerQualifies) {
        won = true;
        payout = bet; // Ante returned (1:1)
        result = `Dealer doesn't qualify (${dHand.name})`;
      } else if (pHand.rank > dHand.rank) {
        won = true;
        const bonusMult = POKER_PAYOUTS[pHand.rank] ?? 1;
        payout = bet + bet * bonusMult;
        result = `${pHand.name} beats ${dHand.name}`;
      } else if (pHand.rank === dHand.rank) {
        // Compare high cards
        const pHigh = Math.max(...playerCards.map((c: number) => c % 13));
        const dHigh = Math.max(...dealerCards.map((c: number) => c % 13));
        if (pHigh > dHigh) {
          won = true;
          payout = bet * 2;
          result = `${pHand.name} wins (higher)`;
        } else if (pHigh === dHigh) {
          won = true;
          payout = bet; // Push
          result = `Push (${pHand.name})`;
        } else {
          result = `${dHand.name} wins (higher)`;
        }
      } else {
        result = `${dHand.name} beats ${pHand.name}`;
      }

      // Payout transaction
      if (payout > 0) {
        await executeLivePayout(userId, payout, "poker", sessionId);
      }

      // Mark completed
      await query(
        "UPDATE public.live_game_sessions SET status = 'completed', state = $1 WHERE id = $2",
        [JSON.stringify({ playerCards, dealerCards, won, payout, result }), sessionId],
      );

      // Final balance
      const walletRes = await query("SELECT balance FROM public.wallets WHERE user_id = $1", [
        userId,
      ]);
      const finalBalance = Number(walletRes.rows[0]?.balance || 0);

      res.json({
        phase: "result",
        pokerDealerCards: dealerCards,
        won,
        payout,
        newBalance: finalBalance,
        roundResult: result,
      });
    } catch (err: any) {
      console.error("Poker action error:", err.message);
      res.status(500).json({ error: "Failed to resolve round" });
    }
  },
);

export default router;
