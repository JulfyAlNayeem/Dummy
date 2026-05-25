FROM node:24-slim
WORKDIR /app
RUN npm install -g pnpm
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .pnpmrc* ./
COPY backend/form-service/package.json ./backend/form-service/
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    for attempt in 1 2 3 4 5; do \
        echo "=== pnpm install attempt $attempt/5 ===" && \
        pnpm install --frozen-lockfile --ignore-scripts --filter form-service && break || \
        { echo "Attempt $attempt failed, waiting 30s before retry..."; sleep 30; }; \
    done
COPY backend/form-service/ ./backend/form-service/
WORKDIR /app/backend/form-service
ARG DATABASE_URL="mysql://dummy:dummy@localhost:3306/dummy"
RUN npx prisma generate
EXPOSE 3006
CMD ["sh", "-c", "npx tsx src/app.ts"]
