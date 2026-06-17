# Backend Dockerfile
FROM node:24-alpine

WORKDIR /app/backend

# Install pnpm
RUN npm install -g pnpm

# Copy ROOT lockfile and workspace files (lockfile is at root, not in backend/)
COPY pnpm-lock.yaml ../
COPY pnpm-workspace.yaml ../
COPY package.json ../
COPY backend/package.json ./


# Install only backend dependencies using root lockfile
RUN cd .. && pnpm install --frozen-lockfile --ignore-scripts --filter dummyprojectbackend

# Copy backend source code
COPY backend/ ./

# Create uploads directory
RUN mkdir -p /app/backend/uploads && chmod 777 /app/backend/uploads

EXPOSE 3001

# Use --env-file to load env vars before ANY module imports
# This ensures livekit.service.js and others see process.env at import time
CMD ["node", "app.js"]

