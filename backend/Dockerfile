# Backend Dockerfile
FROM node:24-alpine

WORKDIR /app/backend

# Install pnpm
RUN npm install -g pnpm

# Copy package files first (better Docker layer caching)
COPY backend/package.json ./
COPY backend/pnpm-lock.yaml* ./

# Install dependencies
RUN pnpm install --frozen-lockfile --ignore-scripts

# Copy backend source code
COPY backend/ ./

# Create uploads directory
RUN mkdir -p /app/backend/uploads && chmod 777 /app/backend/uploads

EXPOSE 3001

# Use --env-file to load env vars before ANY module imports
# This ensures livekit.service.js and others see process.env at import time
CMD ["node", "--env-file=.env.production", "app.js"]
