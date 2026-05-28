#!/bin/sh
set -e

echo "=== scheduler-service: running Prisma migrations ==="
npx prisma migrate deploy

echo "=== Starting scheduler-service ==="
exec npx tsx src/app.ts