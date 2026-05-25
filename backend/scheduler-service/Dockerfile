FROM node:24-slim
WORKDIR /app
RUN npm install -g pnpm
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl ca-certificates default-mysql-client tzdata \
    && rm -rf /var/lib/apt/lists/*
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .pnpmrc* ./
COPY backend/scheduler-service/package.json ./backend/scheduler-service/
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store pnpm install --frozen-lockfile --ignore-scripts --filter scheduler-service
COPY backend/scheduler-service/ ./backend/scheduler-service/
WORKDIR /app/backend/scheduler-service
ARG DATABASE_URL="mysql://dummy:dummy@localhost:3306/dummy"
RUN npx prisma generate
RUN mkdir -p /app/backups
EXPOSE 3009
CMD ["sh", "-c", "npx tsx src/app.ts"]
