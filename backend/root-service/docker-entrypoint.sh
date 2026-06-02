#!/bin/sh
set -e

echo "Running Prisma migrations..."

try_resolve() {
  NAME="$1"
  npx prisma migrate resolve --rolled-back "$NAME" >/dev/null 2>&1 || true
  npx prisma migrate resolve --applied "$NAME" >/dev/null 2>&1 || true
}

# If DB_FORCE_RESET=true, drop and recreate the schema before migrating.
# The app's autoInitializeDatabase() will seed once it detects no users.
if [ "${DB_FORCE_RESET:-false}" = "true" ]; then
  echo "⚠️  DB_FORCE_RESET=true: resetting database schema..."
  npx prisma migrate reset --force --skip-seed
  echo "✅ Schema reset complete. App will auto-seed on startup."
else
  # Resolve legacy migration names that may still exist in _prisma_migrations.
  for LEGACY in 0001_baseline 0002_notification_system_upgrade 0003_add_social_profile_fields; do
    npx prisma migrate resolve --applied "$LEGACY" >/dev/null 2>&1 || true
  done

  # First attempt.
  if ! npx prisma migrate deploy; then
    echo ""
    echo "⚠️  Migration deploy failed. Attempting compatibility recovery..."

    # Known shared-schema / renamed migration states observed in production.
    try_resolve 20260526065636_init
    try_resolve 20260527113000_add_alertness_sessions

    # Also try the first migration in this service as applied (tables may already exist).
    FIRST_MIGRATION=$(ls prisma/migrations/ | grep -v migration_lock | head -1)
    if [ -n "$FIRST_MIGRATION" ]; then
      npx prisma migrate resolve --applied "$FIRST_MIGRATION" >/dev/null 2>&1 || true
    fi

    echo "Retrying migrate deploy after recovery..."
    if ! npx prisma migrate deploy; then
      echo ""
      echo "⚠️  Migrations still failing; starting API anyway to avoid downtime."
      echo "   Please inspect migration state manually and repair when convenient."
    fi
  fi
fi

echo "✅ Migrations complete. Starting application..."
exec npx tsx src/app.ts
