# Backend Dockerfile for Monorepo
FROM node:20

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy workspace files
COPY pnpm-lock.yaml pnpm-workspace.yaml .pnpmrc* ./
COPY backend/package.json ./backend/

# Install dependencies
RUN pnpm install --filter dummyprojectbackend

# Copy backend source code
COPY backend/ ./backend/

# Set working directory to backend
WORKDIR /app/backend

# Generate Prisma client
RUN npx prisma generate || true

EXPOSE 3001
CMD ["node", "app.js"]