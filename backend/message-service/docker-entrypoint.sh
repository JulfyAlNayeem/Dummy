#!/bin/sh
set -e

echo "=== message-service: running Prisma migrations ==="

# The init migration (20260526074317_init) tried to create shared tables
# (users, conversations, messages, etc.) that api-service already owns.
# Mark it as applied so Prisma skips it, then deploy the real migration
# that only creates message-service-exclusive tables.
npx prisma migrate resolve --applied 20260526074317_init 2>/dev/null || true

npx prisma migrate deploy

echo "=== Starting message-service ==="
exec npx tsx src/app.ts
