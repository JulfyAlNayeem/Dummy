#!/bin/sh
set -e

echo "Running Prisma migrations for social-service..."

# Attempt migrate deploy; if it fails (e.g. 0001_init was broken due to table conflicts),
# mark the failed migration as resolved and retry with migration 0002.
if ! npx prisma migrate deploy 2>&1; then
  echo ""
  echo "⚠️  Migration deploy failed. Attempting to resolve 0001_init as applied..."
  npx prisma migrate resolve --applied 0001_init 2>/dev/null || true
  echo "Retrying migrate deploy (will run 0002_fix_table_names)..."
  npx prisma migrate deploy
fi

echo "✅ Migrations complete. Starting social-service..."
exec npx tsx src/app.ts
