# Backend Dockerfile for Monorepo
FROM node:20

WORKDIR /app/backend

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY backend/package.json ./

# Install dependencies first (better caching)
RUN pnpm install

# Copy backend source code
COPY backend/ ./

# Generate Prisma client
RUN npx prisma generate || true

EXPOSE 3001
CMD ["node", "app.js"]