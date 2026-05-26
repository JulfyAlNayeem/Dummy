#!/bin/sh
set -e

echo "Running Prisma migrations..."

# If DB_FORCE_RESET=true, drop and recreate the schema before migrating.
# The app's autoInitializeDatabase() will seed once it detects no users.
if [ "${DB_FORCE_RESET:-false}" = "true" ]; then
  echo "⚠️  DB_FORCE_RESET=true: resetting database schema..."
  npx prisma migrate reset --force --skip-seed
  echo "✅ Schema reset complete. App will auto-seed on startup."
else
  # Resolve any legacy rolled-back or renamed migrations whose files no longer exist.
  for LEGACY in 0001_baseline 0002_notification_system_upgrade 0003_add_social_profile_fields; do
    npx prisma migrate resolve --applied "$LEGACY" 2>/dev/null || true
  done

  # Attempt migrate deploy; on failure (e.g. tables already exist from old
  # migrations), resolve the current init migration as applied and retry.
  if ! npx prisma migrate deploy 2>&1; then
    echo ""
    echo "⚠️  Migration deploy failed. Attempting drift recovery..."

    MIGRATION_NAME=$(ls prisma/migrations/ | grep -v migration_lock | head -1)
    if [ -n "$MIGRATION_NAME" ]; then
      echo "Resolving '$MIGRATION_NAME' as already applied (drift recovery)..."
      npx prisma migrate resolve --applied "$MIGRATION_NAME" 2>/dev/null || true
      echo "Retrying migrate deploy..."
      npx prisma migrate deploy
    else
      echo "❌ No migration found to resolve. Exiting."
      exit 1
    fi
  fi
fi

echo "✅ Migrations complete. Starting application..."
exec npx tsx src/app.ts
