#!/bin/sh
set -e

echo "=== class-service: running Prisma migrations ==="
npx prisma migrate deploy

echo "=== Starting class-service ==="
exec npx tsx src/app.ts