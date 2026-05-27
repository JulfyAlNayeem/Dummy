# Message Service Dockerfile
FROM node:24-slim

WORKDIR /app

RUN npm install -g pnpm

RUN apt-get update && \
    apt-get install -y --no-install-recommends openssl ca-certificates && \
    rm -rf /var/lib/apt/lists/*

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .pnpmrc* ./
COPY backend/message-service/package.json ./backend/message-service/

RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    for attempt in 1 2 3 4 5; do \
        echo "=== pnpm install attempt $attempt/5 ===" && \
        pnpm install --frozen-lockfile --ignore-scripts --filter message-service && break || \
        { echo "Attempt $attempt failed, waiting 30s before retry..."; sleep 30; }; \
    done

COPY backend/message-service/ ./backend/message-service/

WORKDIR /app/backend/message-service

ARG DATABASE_URL="mysql://dummy:dummy@localhost:3306/dummy"

RUN npx prisma generate

COPY backend/message-service/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

EXPOSE 3004

CMD ["sh", "./docker-entrypoint.sh"]
