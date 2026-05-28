#!/bin/sh
set -e

echo "=== alarm-service: running Prisma migrations ==="
npx prisma migrate deploy

echo "=== Starting alarm-service ==="
exec npx tsx src/app.ts