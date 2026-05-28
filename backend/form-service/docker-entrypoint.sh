#!/bin/sh
set -e

echo "=== form-service: running Prisma migrations ==="

# The init migration creates shared tables that may already exist.
# Mark it as applied so deploy can continue safely.
npx prisma migrate resolve --applied 20260527195500_init 2>/dev/null || true

npx prisma migrate deploy

echo "=== Starting form-service ==="
exec npx tsx src/app.ts