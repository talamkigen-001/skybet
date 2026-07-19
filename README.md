# 🚀 Sky High Bets — Noroc JetX

**Production-ready multiplayer crash betting game** — provably fair, real-time WebSocket multiplayer, full admin dashboard, referral system, and Docker deployment.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Tech Stack](#tech-stack)
3. [Folder Structure](#folder-structure)
4. [Installation](#installation)
5. [Environment Variables](#environment-variables)
6. [Running Locally](#running-locally)
7. [API Documentation](#api-documentation)
8. [WebSocket Protocol](#websocket-protocol)
9. [Provably Fair Algorithm](#provably-fair-algorithm)
10. [Database Schema](#database-schema)
11. [Testing Guide](#testing-guide)
12. [Docker & Production Deployment](#docker--production-deployment)
13. [Production Checklist](#production-checklist)
14. [Security](#security)

---

## Architecture Overview

```
Browser ────── WebSocket (/ws) ──────┐
               HTTP (/api)  ─────────┤──► Nginx Reverse Proxy
                                     │         │
                                     │    ┌────▼─────────────────┐
                                     │    │  Node.js Backend      │
                                     │    │  Express + ws         │
                                     │    │  Game Engine (loop)   │
                                     │    └──┬──────────┬─────────┘
                                     │       │          │
                                     │    PostgreSQL   Redis
                                     │    (Supabase)  (state cache)
                                     │
                              ┌──────▼───────────────────────────┐
                              │  React Frontend (TanStack Start)  │
                              │  Zustand game-store               │
                              │  WebSocket → live multiplier      │
                              └──────────────────────────────────┘
```

---

## Tech Stack

| Layer           | Technology                                             |
| --------------- | ------------------------------------------------------ |
| **Frontend**    | React 19, TanStack Router, Zustand, Tailwind CSS v4    |
| **Backend**     | Node.js 20, TypeScript, Express, `ws` WebSockets       |
| **Database**    | PostgreSQL via Supabase (or direct pg)                 |
| **Cache**       | Redis (ioredis) with in-memory fallback                |
| **Auth**        | Supabase Auth + JWT verification                       |
| **Game Engine** | Custom TypeScript state machine, SHA-256 provably fair |
| **Deployment**  | Docker Compose, Nginx reverse proxy                    |

---

## Folder Structure

```
Sky High Bets/
├── src/                          # Frontend (React / TanStack Start)
│   ├── components/
│   │   ├── crash/                # CrashGraph, BetPanelV2, ChatFeed, LiveBets …
│   │   └── casino/               # Layout, TopBar, Footer, GameRow …
│   ├── lib/
│   │   ├── game-store.ts         # Zustand store + WebSocket integration
│   │   └── crash-engine.ts       # Provably fair math (client-side fallback)
│   └── routes/                   # TanStack file-based routes
│       ├── games.crash.tsx        # Main game page
│       ├── fairness.tsx           # Verification page
│       ├── wallet.tsx             # Deposit / withdraw / history
│       ├── profile.tsx            # Profile + referral system
│       ├── stats.tsx              # Game statistics
│       └── admin.*.tsx            # Admin dashboard
│
├── server/                       # Backend (Node.js + TypeScript)
│   ├── src/
│   │   ├── index.ts              # Express + WebSocket server entry point
│   │   ├── game/engine.ts        # Multiplayer game loop + provably fair
│   │   ├── routes/api.ts         # REST API router
│   │   ├── middleware/auth.ts    # JWT verification + admin guard
│   │   ├── db/db.ts              # PostgreSQL pool
│   │   ├── cache/redis.ts        # Redis client + in-memory fallback
│   │   └── tests/game.test.ts   # Unit + integration tests
│   ├── Dockerfile
│   ├── package.json
│   └── tsconfig.json
│
├── supabase/
│   └── migrations/               # PostgreSQL schema migrations
│       ├── 20260629135437_*.sql  # Profiles, wallets, transactions
│       └── 20260630000000_crash_game_tables.sql  # Rounds, bets, chat, referrals
│
├── docker-compose.yml            # Full stack orchestration
├── nginx.conf                    # Reverse proxy configuration
├── .env.example                  # Environment variable template
└── README.md
```

---

## Installation

### Prerequisites

- **Node.js** >= 20
- **npm** >= 9
- **Docker** + **Docker Compose** (for full-stack deployment)
- **Supabase account** (or local PostgreSQL)

### 1. Clone and install frontend dependencies

```bash
cd "Sky High Bets"
npm install
```

### 2. Install backend dependencies

```bash
cd server
npm install
```

### 3. Configure environment variables

```bash
cp .env.example .env
# Edit .env with your Supabase keys and database credentials
```

---

## Environment Variables

| Variable                        | Required     | Description                                                 |
| ------------------------------- | ------------ | ----------------------------------------------------------- |
| `VITE_SUPABASE_URL`             | ✅           | Supabase project URL                                        |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | ✅           | Supabase anon/publishable key                               |
| `VITE_WS_URL`                   | Optional     | WebSocket server URL (default: `ws://localhost:5001/ws`)    |
| `VITE_API_URL`                  | Optional     | Backend REST API URL (default: `http://localhost:5001/api`) |
| `DATABASE_URL`                  | ✅ (backend) | PostgreSQL connection string                                |
| `REDIS_URL`                     | Optional     | Redis URL (falls back to in-memory if unavailable)          |
| `JWT_SECRET`                    | ✅ (backend) | JWT signing secret (must match Supabase JWT secret)         |
| `PORT`                          | Optional     | Backend server port (default: `5001`)                       |

---

## Running Locally

### Frontend only (with offline simulation)

```bash
npm run dev
# Opens http://localhost:3000
# The game runs in offline mode if no backend is available
```

### Backend server

```bash
cd server
npm run dev
# Starts on http://localhost:5001
# WebSocket: ws://localhost:5001/ws
# REST API:  http://localhost:5001/api
```

### Full stack with Docker

```bash
docker compose up --build
# Frontend: http://localhost:3000
# Backend:  http://localhost:5001
# Nginx:    http://localhost:80
```

---

## API Documentation

### Authentication

All protected endpoints require `Authorization: Bearer <jwt_token>` header. Obtain the token from Supabase Auth on sign-in.

---

### Wallet

| Method | Endpoint               | Auth | Description                        |
| ------ | ---------------------- | ---- | ---------------------------------- |
| `GET`  | `/api/wallet`          | ✅   | Get balance + last 20 transactions |
| `POST` | `/api/wallet/deposit`  | ✅   | Mock deposit funds                 |
| `POST` | `/api/wallet/withdraw` | ✅   | Mock withdrawal                    |

**POST /api/wallet/deposit**

```json
{ "amount": 100 }
```

Response: `{ "success": true, "transaction": { ... } }`

---

### Statistics

| Method | Endpoint                 | Auth | Description                               |
| ------ | ------------------------ | ---- | ----------------------------------------- |
| `GET`  | `/api/stats/leaderboard` | ❌   | Top 10 winners                            |
| `GET`  | `/api/stats/summary`     | ❌   | Total rounds, average multiplier, wagered |

---

### Referrals

| Method | Endpoint               | Auth | Description                      |
| ------ | ---------------------- | ---- | -------------------------------- |
| `GET`  | `/api/referrals`       | ✅   | Get your referral code + history |
| `POST` | `/api/referrals/claim` | ✅   | Claim a friend's referral code   |

**POST /api/referrals/claim**

```json
{ "code": "ABCD1234" }
```

---

### Admin (Admin role required)

| Method | Endpoint                       | Description                            |
| ------ | ------------------------------ | -------------------------------------- |
| `GET`  | `/api/admin/stats`             | GGR, user count, deposits, withdrawals |
| `GET`  | `/api/admin/users`             | List all users with balances           |
| `POST` | `/api/admin/users/:id/suspend` | Suspend/unsuspend a user               |
| `POST` | `/api/admin/settings`          | Configure RTP (houseEdge, winRate)     |

**POST /api/admin/settings**

```json
{ "houseEdge": 0.01, "winRate": 0.2 }
```

---

## WebSocket Protocol

Connect to `ws://localhost:5001/ws` (or `wss://yourdomain/ws` in production).

Optionally pass an auth token: `ws://localhost:5001/ws?token=<jwt>`

### Server → Client Events

| Event             | Payload                                      | Description                  |
| ----------------- | -------------------------------------------- | ---------------------------- |
| `state`           | Full game state object                       | Sent on connect/reconnect    |
| `countdown`       | `{ countdown: number }`                      | Betting phase countdown (ms) |
| `tick`            | `{ multiplier: number }`                     | Live multiplier update       |
| `bets`            | `{ bets: ActiveBet[] }`                      | Full bets list updated       |
| `cashout`         | `{ username, cashedAt, winAmount }`          | A player cashed out          |
| `cashout_success` | `{ multiplier, winAmount }`                  | YOUR cashout confirmed       |
| `crashed`         | `{ crashPoint, serverSeed, nonce, history }` | Round crashed                |
| `chat`            | `{ username, message, created_at }`          | Chat message                 |
| `pong`            | —                                            | Heartbeat response           |
| `error`           | `{ message }`                                | Error response               |

### Client → Server Events

| Event     | Payload                    | Description          |
| --------- | -------------------------- | -------------------- |
| `bet`     | `{ amount, autoCashout? }` | Place a bet          |
| `cashout` | —                          | Cash out current bet |
| `chat`    | `{ message }`              | Send a chat message  |
| `ping`    | —                          | Heartbeat            |

---

## Provably Fair Algorithm

Each round's crash point is generated **before** the round begins using:

```
SHA-256(serverSeed : clientSeed : nonce) → hex hash
→ integer from first 13 hex chars → uniform r ∈ [0, 1)
→ crash_point = f(r, houseEdge, winRate)
```

- **Server seed** — random 32-byte hex, kept secret until round ends
- **Server seed hash** — SHA-256 of server seed, published **before** the round
- **Client seed** — set by the player (fully customisable)
- **Nonce** — auto-increments per round (prevents reuse)

**Verification**: After the round ends, the server seed is revealed. Any player can reproduce the exact crash point on the `/fairness` page or by running the same SHA-256 computation independently.

Distribution formula:

- **80% of rounds**: crash ∈ [1.00, 2.00) — losing range for 2x targets
- **20% of rounds**: crash ∈ [2.00, ∞) — heavy-tail distribution
- **~1% instant crash**: crash = 1.00 (house edge slice)

---

## Database Schema

Tables created by migrations in `supabase/migrations/`:

| Table              | Description                                                    |
| ------------------ | -------------------------------------------------------------- |
| `profiles`         | User profile, username, KYC status, referral code              |
| `wallets`          | User balance, bonus balance, total deposited/withdrawn         |
| `transactions`     | All financial movements (deposit, withdrawal, bet, win, bonus) |
| `deposit_requests` | Manual deposit requests awaiting admin approval                |
| `crash_rounds`     | Round history with seeds, crash point, status                  |
| `crash_bets`       | Individual bets per round with cashout details                 |
| `chat_messages`    | Chat history                                                   |
| `referrals`        | Referral relationships and reward amounts                      |
| `user_roles`       | Admin role assignments                                         |
| `login_activity`   | IP + user agent login audit log                                |

---

## Testing Guide

### Run backend tests

```bash
cd server
npm test
```

Tests cover:

- **Provably fair math**: crash point bounds, determinism, distribution (±8% of 20% target), house edge verification
- **JWT auth**: valid tokens, expired tokens, wrong secret, malformed strings
- **HTTP API**: health check, protected routes (401/403/200), wallet deposit validation
- **Input validation**: XSS sanitisation, chat length limits, bet amount constraints, referral code format

### Run frontend lint

```bash
npm run lint
```

---

## Docker & Production Deployment

### Quick start

```bash
# Copy and configure environment
cp .env.example .env
# Edit .env with production values

# Build and start all services
docker compose up -d --build

# View logs
docker compose logs -f backend
docker compose logs -f nginx
```

### CI/CD (GitHub Actions template)

```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build and push Docker image
        run: |
          docker build -t norocjetx-backend ./server
      - name: Deploy to server
        run: |
          ssh deploy@your-server "cd /app && docker compose pull && docker compose up -d"
```

---

## Production Checklist

### Environment & Configuration

- [ ] All `.env` values set — no defaults remain in production
- [ ] `JWT_SECRET` is long, random, and matches `SUPABASE_JWT_SECRET`
- [ ] `NODE_ENV=production` set on backend
- [ ] `FRONTEND_URL` set to the exact production origin (for CORS)

### Database

- [ ] All Supabase migrations applied (`supabase db push`)
- [ ] Row Level Security (RLS) enabled on all tables ✅ (already configured)
- [ ] Database backups configured (Supabase handles daily by default)

### Security

- [ ] SSL certificate installed at `/etc/nginx/ssl/`
- [ ] Nginx HTTPS redirect active (port 80 → 443)
- [ ] CORS restricted to production domain
- [ ] Rate limiting tuned to expected traffic
- [ ] `SUPABASE_SERVICE_ROLE_KEY` never exposed to client-side code

### Monitoring

- [ ] Docker health checks passing (`docker compose ps`)
- [ ] Log aggregation configured (e.g. Logtail, Papertrail)
- [ ] Alerting on backend 5xx errors

### Game

- [ ] Provably fair verification page tested end-to-end
- [ ] Admin panel accessible at `/admin` (requires admin role in DB)
- [ ] RTP settings verified: houseEdge ≤ 5%, winRate ≥ 10%
- [ ] WebSocket reconnection tested (kill backend, confirm client recovers)

---

## Security

| Threat               | Mitigation                                                   |
| -------------------- | ------------------------------------------------------------ |
| SQL Injection        | Parameterised queries everywhere (`pg` driver)               |
| XSS                  | Chat messages HTML-stripped server-side; CSP header in Nginx |
| CSRF                 | JWT Bearer token auth (not cookies) — CSRF not applicable    |
| Auth bypass          | JWT verified on every protected route and WS connection      |
| Brute force          | Rate limiting: 20 req/s API, 5 conn/s WebSocket              |
| Cheating             | Server owns crash point and multiplier; client is read-only  |
| Insufficient balance | Atomic DB transactions with `SELECT FOR UPDATE` before debit |
| Admin escalation     | Role verified in DB (`user_roles`) on every admin request    |

---

_Built with ❤️ — Original implementation, all rights reserved._
