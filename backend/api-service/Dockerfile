# Backend Dockerfile for Monorepo (TypeScript + Prisma)
FROM node:24-slim

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Network timeout/retry env vars — read by pnpm before any config file is parsed
ENV npm_config_network_timeout=600000
ENV npm_config_fetch_retries=5
ENV npm_config_fetch_retry_mintimeout=20000
ENV npm_config_fetch_retry_maxtimeout=120000

# Install system utilities required by healthchecks and Prisma
RUN apt-get update \
	&& apt-get install -y --no-install-recommends wget openssl ca-certificates \
	&& rm -rf /var/lib/apt/lists/*

# Copy workspace files
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .pnpmrc* .npmrc* ./
COPY backend/api-service/package.json ./backend/api-service/

# Install dependencies — retry loop so partial cache downloads survive transient errors
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    for attempt in 1 2 3 4 5; do \
        echo "=== pnpm install attempt $attempt/5 ===" && \
        pnpm install --frozen-lockfile --ignore-scripts --filter dummyprojectbackend && break || \
        { echo "Attempt $attempt failed, waiting 30s before retry..."; sleep 30; }; \
    done; \
    pnpm list --filter dummyprojectbackend 2>/dev/null | grep -q "dummyprojectbackend" || exit 1

# Copy api-service source code
COPY backend/api-service/ ./backend/api-service/

# Set working directory to api-service
WORKDIR /app/backend/api-service

# Provide dummy DATABASE_URL for build-time Prisma commands only (ARG = build-time, not runtime)
ARG DATABASE_URL="mysql://dummy:dummy@localhost:3306/dummy"

# Generate Prisma client
RUN npx prisma generate

# Create uploads directory with proper permissions
RUN mkdir -p /app/backend/api-service/uploads && chmod 755 /app/backend/api-service/uploads

# Copy and prepare entrypoint script
COPY backend/api-service/docker-entrypoint.sh /app/backend/api-service/docker-entrypoint.sh
RUN chmod +x /app/backend/api-service/docker-entrypoint.sh

EXPOSE 3001

# Run pending migrations then start app
CMD ["sh", "/app/backend/api-service/docker-entrypoint.sh"]