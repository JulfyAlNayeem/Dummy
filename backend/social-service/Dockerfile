FROM node:24-slim
WORKDIR /app
RUN npm install -g pnpm
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .pnpmrc* ./
COPY backend/social-service/package.json ./backend/social-service/
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    for attempt in 1 2 3 4 5; do \
        echo "=== pnpm install attempt $attempt/5 ===" && \
        pnpm install --frozen-lockfile --ignore-scripts --filter social-service && break || \
        { echo "Attempt $attempt failed, waiting 30s before retry..."; sleep 30; }; \
    done
COPY backend/social-service/ ./backend/social-service/
WORKDIR /app/backend/social-service
ARG DATABASE_URL="mysql://dummy:dummy@localhost:3306/dummy"
RUN npx prisma generate
RUN chmod +x /app/backend/social-service/docker-entrypoint.sh
EXPOSE 3008
CMD ["sh", "/app/backend/social-service/docker-entrypoint.sh"]
