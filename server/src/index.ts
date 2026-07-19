import express from "express";
import http from "http";
import { WebSocketServer, WebSocket } from "ws";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname } from "path";
import apiRouter from "./routes/api.js";
import liveRouter from "./routes/live.js";
import { verifyWebSocketToken } from "./middleware/auth.js";
import { gameEngine } from "./game/engine.js";
import { query, checkDbConnection } from "./db/db.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5001;

// Middlewares
app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "*",
    credentials: true,
  }),
);
app.use(express.json());

// API Rate Limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
});
app.use("/api", apiLimiter);

// API Routes
app.use("/api", apiRouter);
app.use("/api/live", liveRouter);

// Health Check
app.get("/health", async (req, res) => {
  const dbConnected = await checkDbConnection();
  res.json({
    status: "ok",
    database: dbConnected ? "connected" : "disconnected",
    enginePhase: gameEngine.phase,
  });
});

// Create HTTP & WebSocket Server
const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });

// Heartbeat ping/pong structure to handle dead WebSocket connections
interface CustomWebSocket extends WebSocket {
  isAlive: boolean;
  userId?: string;
  username?: string;
}

wss.on(
  "connection",
  (ws: CustomWebSocket, request, clientInfo?: { id: string; email: string; username: string }) => {
    ws.isAlive = true;

    if (clientInfo) {
      ws.userId = clientInfo.id;
      ws.username = clientInfo.username;
    }

    console.log(`WebSocket client connected. User: ${ws.username || "Guest (Spectator)"}`);

    ws.on("pong", () => {
      ws.isAlive = true;
    });

    // Send initial state
    ws.send(
      JSON.stringify({
        event: "state",
        data: {
          phase: gameEngine.phase,
          multiplier: gameEngine.multiplier,
          countdown: gameEngine.countdown,
          serverSeedHash: gameEngine.serverSeedHash,
          nonce: gameEngine.nonce,
          bets: gameEngine.activeBets,
          history: gameEngine.recentRounds.map((r) => ({
            id: r.id,
            crash: r.crashPoint,
            serverSeed: r.serverSeed,
            serverSeedHash: r.serverSeedHash,
            clientSeed: r.clientSeed,
            nonce: r.nonce,
            endedAt: r.endedAt,
          })),
        },
      }),
    );

    ws.on("message", async (messageStr: string) => {
      try {
        const { event, data } = JSON.parse(messageStr);

        switch (event) {
          case "ping":
            ws.send(JSON.stringify({ event: "pong" }));
            break;

          case "bet":
            if (!ws.userId || !ws.username) {
              ws.send(
                JSON.stringify({
                  event: "error",
                  data: { message: "Authentication required to bet" },
                }),
              );
              break;
            }
            const betAmount = Number(data.amount);
            const autoCashout = data.autoCashout ? Number(data.autoCashout) : undefined;
            const betIndex = typeof data.betIndex === "number" ? data.betIndex : 0;

            if (isNaN(betAmount) || betAmount <= 0) {
              ws.send(JSON.stringify({ event: "error", data: { message: "Invalid bet amount" } }));
              break;
            }

            const success = await gameEngine.placeBet(
              ws.userId,
              ws.username,
              betAmount,
              autoCashout,
              betIndex,
            );
            if (!success) {
              ws.send(
                JSON.stringify({
                  event: "error",
                  data: { message: "Failed to place bet. Verify balance / phase." },
                }),
              );
            }
            break;

          case "cashout":
            if (!ws.userId) {
              ws.send(
                JSON.stringify({
                  event: "error",
                  data: { message: "Authentication required to cash out" },
                }),
              );
              break;
            }
            const targetBetIndex = typeof data.betIndex === "number" ? data.betIndex : 0;
            const payoutRes = await gameEngine.cashOut(ws.userId, targetBetIndex);
            if (!payoutRes.success) {
              ws.send(
                JSON.stringify({
                  event: "error",
                  data: { message: "Cashout failed. Not in active round or already cashed." },
                }),
              );
            } else {
              ws.send(
                JSON.stringify({
                  event: "cashout_success",
                  data: {
                    multiplier: payoutRes.multiplier,
                    winAmount: payoutRes.winAmount,
                    betIndex: targetBetIndex,
                  },
                }),
              );
            }
            break;

          case "chat":
            if (!ws.userId || !ws.username) {
              ws.send(
                JSON.stringify({
                  event: "error",
                  data: { message: "Authentication required to chat" },
                }),
              );
              break;
            }
            const chatMsg = data.message ? data.message.trim() : "";
            if (chatMsg.length === 0 || chatMsg.length > 200) {
              ws.send(
                JSON.stringify({ event: "error", data: { message: "Invalid message length" } }),
              );
              break;
            }

            // XSS Prevention / HTML Stripping
            const cleanMsg = chatMsg.replace(/</g, "&lt;").replace(/>/g, "&gt;");

            // Save to database
            await query(
              "INSERT INTO public.chat_messages (user_id, username, message) VALUES ($1, $2, $3)",
              [ws.userId, ws.username, cleanMsg],
            ).catch((err) => {
              console.error("Chat save error:", err);
            });

            // Broadcast chat message
            broadcast("chat", {
              username: ws.username,
              message: cleanMsg,
              created_at: new Date().toISOString(),
            });
            break;

          default:
            ws.send(JSON.stringify({ event: "error", data: { message: "Unknown event" } }));
        }
      } catch (err) {
        ws.send(JSON.stringify({ event: "error", data: { message: "Invalid payload format" } }));
      }
    });

    ws.on("close", () => {
      console.log(`WebSocket client disconnected. User: ${ws.username || "Guest"}`);
    });
  },
);

// Upgrade handling for HTTP WebSocket handshakes
server.on("upgrade", async (request, socket, head) => {
  const url = new URL(request.url || "", `http://${request.headers.host}`);

  if (url.pathname === "/ws") {
    // Authenticate WS Handshake via URL query token
    const token = url.searchParams.get("token");
    let clientInfo: { id: string; email: string; username: string } | undefined;

    if (token) {
      const auth = verifyWebSocketToken(token);
      if (auth) {
        // Fetch username from profiles table in database
        try {
          const profileRes = await query("SELECT username FROM public.profiles WHERE id = $1", [
            auth.id,
          ]);
          const username = profileRes.rows[0]?.username || auth.email.split("@")[0];
          clientInfo = {
            id: auth.id,
            email: auth.email,
            username,
          };
        } catch {
          clientInfo = {
            id: auth.id,
            email: auth.email,
            username: auth.email.split("@")[0],
          };
        }
      }
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request, clientInfo);
    });
  } else {
    socket.destroy();
  }
});

// Broadcast Helper
function broadcast(event: string, data: any) {
  const payload = JSON.stringify({ event, data });
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

// Keep-alive heartbeat interval check
const heartbeatInterval = setInterval(() => {
  wss.clients.forEach((client) => {
    const ws = client as CustomWebSocket;
    if (!ws.isAlive) {
      console.log(`Terminating idle socket for user: ${ws.username || "Guest"}`);
      return ws.terminate();
    }
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

wss.on("close", () => {
  clearInterval(heartbeatInterval);
});

// Connect game engine callbacks
gameEngine.setBroadcastCallback(broadcast);

// Start game loop and server listen
server.listen(PORT, async () => {
  console.log(`Server listening on port ${PORT}`);

  // Make sure database is check-connected
  const dbConnected = await checkDbConnection();
  if (dbConnected) {
    console.log("Database connected successfully.");
  } else {
    console.error("CRITICAL: Database connection failed.");
  }

  await gameEngine.start();
  console.log("Multiplayer game loop engine started.");
});
