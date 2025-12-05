# Backend Dockerfile for Monorepo
FROM node:20

WORKDIR /app

# Install build dependencies for bcrypt native module
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

# Install pnpm
RUN npm install -g pnpm

# Copy workspace files
COPY pnpm-lock.yaml pnpm-workspace.yaml .pnpmrc* ./
COPY backend/package.json ./backend/

# Install dependencies and rebuild bcrypt for Linux
RUN pnpm install --filter dummyprojectbackend && \
    cd /app/node_modules/.pnpm/bcrypt@*/node_modules/bcrypt && npm rebuild

# Copy backend source code
COPY backend/ ./backend/

# Set working directory to backend
WORKDIR /app/backend

# Generate Prisma client
RUN npx prisma generate || true

EXPOSE 3001
CMD ["node", "app.js"]