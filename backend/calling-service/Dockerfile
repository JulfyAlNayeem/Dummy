# Calling Service Dockerfile (mediasoup + Prisma)
#
# mediasoup is listed in .pnpmrc onlyBuiltDependencies, so pnpm install will
# automatically run its postinstall script which downloads the prebuilt linux-x64
# worker binary (~20s) instead of compiling from source (~4-5 min).
# Build tools (python3/make/g++) are kept as fallback if prebuilt download fails.
FROM node:24-slim

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Build tools: needed only if mediasoup prebuilt download fails and falls back to compile.
# Also: wget/openssl/ca-certificates for runtime SSL.
RUN apt-get update && \
    apt-get install -y --no-install-recommends python3 make g++ wget openssl ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# Copy workspace files
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .pnpmrc* ./
COPY backend/calling-service/package.json ./backend/calling-service/

# Install dependencies for calling-service.
# onlyBuiltDependencies in .pnpmrc ensures mediasoup's postinstall runs (downloads
# prebuilt binary) while all other package scripts are silently skipped — no
# --ignore-scripts needed, no manual rebuild mediasoup needed.
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --filter calling-service

# Copy calling-service source code
COPY backend/calling-service/ ./backend/calling-service/

# Set working directory to calling-service
WORKDIR /app/backend/calling-service

# Provide dummy DATABASE_URL for build-time Prisma commands only
ARG DATABASE_URL="mysql://dummy:dummy@localhost:3306/dummy"

# Generate Prisma client
RUN npx prisma generate

COPY backend/calling-service/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

EXPOSE 3003
# Expose mediasoup RTP ports
EXPOSE 10000-10100/udp
EXPOSE 10000-10100/tcp

# Use tsx to run directly (avoids Node.js ESM extensionless import issues with Prisma 7)
CMD ["sh", "./docker-entrypoint.sh"]
