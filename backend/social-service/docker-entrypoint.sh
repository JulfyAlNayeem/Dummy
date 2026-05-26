#!/bin/sh
set -e

echo "Running Prisma migrations for social-service..."

# Resolve any legacy rolled-back migrations whose files no longer exist.
# Without this, prisma migrate deploy would fail trying to re-apply them.
for LEGACY in 0002_fix_table_names 0001_init; do
  npx prisma migrate resolve --applied "$LEGACY" 2>/dev/null || true
done

# Attempt migrate deploy; on failure (e.g. tables exist from old migrations),
# resolve the current init migration as applied (drift recovery) and retry.
if ! npx prisma migrate deploy 2>&1; then
  echo ""
  echo "⚠️  Migration deploy failed. Attempting drift recovery..."
  MIGRATION_NAME=$(ls prisma/migrations/ | grep -v migration_lock | head -1)
  if [ -n "$MIGRATION_NAME" ]; then
    echo "Resolving '$MIGRATION_NAME' as already applied..."
    npx prisma migrate resolve --applied "$MIGRATION_NAME" 2>/dev/null || true
    echo "Retrying migrate deploy..."
    npx prisma migrate deploy
  else
    echo "❌ No migration found. Exiting."
    exit 1
  fi
fi

echo "✅ Migrations complete. Starting social-service..."
exec npx tsx src/app.ts
