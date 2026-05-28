FROM node:24-slim
WORKDIR /app
RUN npm install -g pnpm
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl ca-certificates default-mysql-client tzdata \
    && rm -rf /var/lib/apt/lists/*
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .pnpmrc* ./
COPY backend/scheduler-service/package.json ./backend/scheduler-service/
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    for attempt in 1 2 3 4 5; do \
        echo "=== pnpm install attempt $attempt/5 ===" && \
        pnpm install --frozen-lockfile --ignore-scripts --filter scheduler-service && break || \
        { echo "Attempt $attempt failed, waiting 30s before retry..."; sleep 30; }; \
    done
COPY backend/scheduler-service/ ./backend/scheduler-service/
WORKDIR /app/backend/scheduler-service
ARG DATABASE_URL="mysql://dummy:dummy@localhost:3306/dummy"
RUN npx prisma generate
RUN mkdir -p /app/backups
COPY backend/scheduler-service/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh
EXPOSE 3009
CMD ["sh", "./docker-entrypoint.sh"]
