# Message Service Dockerfile
FROM node:24-slim

WORKDIR /app

RUN npm install -g pnpm

RUN apt-get update && \
    apt-get install -y --no-install-recommends openssl ca-certificates && \
    rm -rf /var/lib/apt/lists/*

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .pnpmrc* ./
COPY backend/message-service/package.json ./backend/message-service/

RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store pnpm install --frozen-lockfile --ignore-scripts --filter message-service

COPY backend/message-service/ ./backend/message-service/

WORKDIR /app/backend/message-service

ARG DATABASE_URL="mysql://dummy:dummy@localhost:3306/dummy"

RUN npx prisma generate

EXPOSE 3004

CMD ["sh", "-c", "npx tsx src/app.ts"]
