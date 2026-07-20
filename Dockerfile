# ── Stage 1: Build ────────────────────────────────────────────────────────────
# Must use Debian-based image (not alpine) — rolldown uses native Rust bindings
# compiled for glibc; alpine uses musl which is incompatible and causes build failures.
FROM node:20-slim AS builder
WORKDIR /app

# Copy package files and install ALL deps (including dev for the build)
COPY package.json package-lock.json ./
RUN npm ci

# Copy source
COPY . .

# Tell Nitro to target Node.js server (not Cloudflare which is the Lovable default)
ENV NITRO_PRESET=node-server

# Build args for Vite — passed at build time from Railway variables
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ARG VITE_WS_URL
ARG VITE_API_URL
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY
ENV VITE_WS_URL=$VITE_WS_URL
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# ── Stage 2: Production image ─────────────────────────────────────────────────
FROM node:20-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy the Nitro node-server output (.output/server + .output/public)
COPY --from=builder /app/.output ./.output

EXPOSE 3000

# Run the Nitro node server entry point
CMD ["node", ".output/server/index.mjs"]
