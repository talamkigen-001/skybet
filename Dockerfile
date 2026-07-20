# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Copy package files and install ALL deps (including dev for the build)
COPY package.json package-lock.json ./
RUN npm install --frozen-lockfile

# Copy source and build
COPY . .
RUN npm run build

# ── Stage 2: Production image ─────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Install serve to host the static files
RUN npm install -g serve

# Copy only the built output
COPY --from=builder /app/dist ./dist

EXPOSE 3000
CMD ["serve", "dist", "-p", "3000", "--single"]
