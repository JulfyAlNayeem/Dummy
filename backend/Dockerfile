# Backend Dockerfile for Monorepo (Node 20 standardized)
FROM node:20-alpine

WORKDIR /app/backend

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY backend/package.json ./

# Install dependencies first (better caching)
RUN pnpm install

# Copy backend source code
COPY backend/ ./

# Create uploads directory with proper permissions
RUN mkdir -p /app/backend/uploads && chmod 777 /app/backend/uploads



EXPOSE 3001
CMD ["node", "app.js"]