#!/bin/sh
set -e

echo "=== calling-service: running Prisma migrations ==="

# The init migration creates shared tables that may already exist.
# Mark it as applied so deploy can continue safely.
npx prisma migrate resolve --applied 20260526074145_init 2>/dev/null || true

npx prisma migrate deploy

echo "=== Starting calling-service ==="
exec npx tsx src/app.ts