# ── Stage 1: build the Vite client ───────────────────────────────────────────
FROM node:24-alpine AS builder

WORKDIR /app

RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build


# ── Stage 2: production image ─────────────────────────────────────────────────
FROM node:24-alpine AS production

WORKDIR /app

RUN npm install -g pnpm

# Install only production dependencies
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

# Copy server source (Node 24 runs TypeScript natively)
COPY server/ ./server/
COPY shared/ ./shared/

# Copy built client from builder stage
COPY --from=builder /app/client/dist ./client/dist

EXPOSE 3000

# Env vars are injected by docker-compose — no --env-file needed
CMD ["node", "server/main.ts"]
