# Calling Service Dockerfile (mediasoup + Prisma)
FROM node:24-slim

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# mediasoup requires python3, make, g++ for native compilation
RUN apt-get update && \
    apt-get install -y --no-install-recommends python3 make g++ wget openssl ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# Copy workspace files
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .pnpmrc* ./
COPY backend/calling-service/package.json ./backend/calling-service/

# Install dependencies for calling-service workspace only
# --ignore-scripts prevents ERR_PNPM_IGNORED_BUILDS; mediasoup is built manually below
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    for attempt in 1 2 3 4 5; do \
        echo "=== pnpm install attempt $attempt/5 ===" && \
        pnpm install --frozen-lockfile --ignore-scripts --filter calling-service && break || \
        { echo "Attempt $attempt failed, waiting 30s before retry..."; sleep 30; }; \
    done

# Build mediasoup native worker manually (required since --ignore-scripts skips postinstall)
RUN pnpm --filter calling-service rebuild mediasoup

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