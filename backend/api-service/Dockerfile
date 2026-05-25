# Backend Dockerfile for Monorepo (TypeScript + Prisma)
FROM node:24-slim

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Install system utilities required by healthchecks and Prisma
RUN apt-get update \
	&& apt-get install -y --no-install-recommends wget openssl ca-certificates \
	&& rm -rf /var/lib/apt/lists/*

# Copy workspace files
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .pnpmrc* ./
COPY backend/api-service/package.json ./backend/api-service/

# Install dependencies for api-service workspace only
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store pnpm install --frozen-lockfile --ignore-scripts --filter dummyprojectbackend

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