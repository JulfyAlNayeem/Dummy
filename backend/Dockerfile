# Backend Dockerfile for Monorepo
FROM node:20

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy workspace files from root
COPY pnpm-lock.yaml* pnpm-workspace.yaml* ./
COPY backend/package.json ./backend/

# Install dependencies for backend workspace only
# Use --no-frozen-lockfile if pnpm-lock.yaml doesn't exist yet
RUN if [ -f pnpm-lock.yaml ]; then \
      pnpm install --frozen-lockfile --filter dummyprojectbackend; \
    else \
      pnpm install --filter dummyprojectbackend; \
    fi

# Copy backend source code
COPY backend/ ./backend/

# Set working directory to backend
WORKDIR /app/backend

# Generate Prisma client if prisma schema exists
RUN if [ -f prisma/schema.prisma ]; then npx prisma generate; fi

# Expose port
EXPOSE 3001

# Start the application
CMD ["node", "app.js"]