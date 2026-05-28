#!/bin/sh
set -e

echo "=== form-service: running Prisma migrations ==="
npx prisma migrate deploy

echo "=== Starting form-service ==="
exec npx tsx src/app.ts