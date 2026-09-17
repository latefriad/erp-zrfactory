FROM node:20-bookworm-slim AS builder

WORKDIR /app

# Install native build tools for better-sqlite3
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy package manifests
COPY package*.json ./
COPY shared/package*.json ./shared/
COPY server/package*.json ./server/
COPY client/package*.json ./client/

# Install dependencies across all workspaces
RUN npm install

# Copy source files
COPY shared/ ./shared/
COPY server/ ./server/
COPY client/ ./client/

# Build all workspaces
RUN npm run build

# Stage 2: Production Runner
FROM node:20-bookworm-slim AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# Install runtime dependencies for SQLite
RUN apt-get update && apt-get install -y --no-install-recommends \
    sqlite3 \
    && rm -rf /var/lib/apt/lists/*

# Copy built assets and installed packages
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/shared ./shared
COPY --from=builder /app/server ./server
COPY --from=builder /app/client/dist ./client/dist

# Create persistent data directories
RUN mkdir -p /app/server/data /app/server/data/backups

# Expose API and frontend single-port
EXPOSE 3000

# Run migrations and start server
CMD ["sh", "-c", "cd /app/server && node dist/db/cli.js migrate && cd /app && npm start"]
