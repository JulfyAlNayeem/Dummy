# Class Service Dockerfile
FROM node:24-slim
WORKDIR /app
RUN npm install -g pnpm
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .pnpmrc* ./
COPY backend/class-service/package.json ./backend/class-service/
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    for attempt in 1 2 3 4 5; do \
        echo "=== pnpm install attempt $attempt/5 ===" && \
        pnpm install --frozen-lockfile --ignore-scripts --filter class-service && break || \
        { echo "Attempt $attempt failed, waiting 30s before retry..."; sleep 30; }; \
    done
COPY backend/class-service/ ./backend/class-service/
WORKDIR /app/backend/class-service
ARG DATABASE_URL="mysql://dummy:dummy@localhost:3306/dummy"
RUN npx prisma generate
EXPOSE 3005
CMD ["sh", "-c", "npx tsx src/app.ts"]
