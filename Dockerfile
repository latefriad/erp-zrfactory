FROM node:22-bookworm-slim

WORKDIR /app

# Install native build tools for better-sqlite3 and sqlite3 runtime
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    sqlite3 \
    && rm -rf /var/lib/apt/lists/*

# Copy package manifests
COPY package*.json ./
COPY shared/package*.json ./shared/
COPY server/package*.json ./server/
COPY client/package*.json ./client/
COPY store/package*.json ./store/

# Install all dependencies including devDependencies for TypeScript build
RUN npm install --include=dev

# Copy configuration and source files
COPY tsconfig.base.json ./
COPY shared/ ./shared/
COPY server/ ./server/
COPY client/ ./client/
COPY store/ ./store/

# Build all workspaces (shared, server, client)
RUN npm run build

# Ensure database directory exists
RUN mkdir -p /app/server/data /app/server/data/backups

ENV NODE_ENV=production
ENV PORT=3000
ENV NODE_OPTIONS="--max-old-space-size=450"

EXPOSE 3000

# Start server directly (automatically applies migrations and seeds on startup)
CMD ["node", "server/dist/index.js"]
