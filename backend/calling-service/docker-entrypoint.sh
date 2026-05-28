#!/bin/sh
set -e

echo "=== calling-service: running Prisma migrations ==="
npx prisma migrate deploy

echo "=== Starting calling-service ==="
exec npx tsx src/app.ts