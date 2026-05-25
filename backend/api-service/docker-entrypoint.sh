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
  # Attempt migrate deploy; if it fails due to a failed baseline (P3009),
  # auto-resolve the baseline as applied and retry.
  if ! npx prisma migrate deploy 2>&1; then
    echo ""
    echo "⚠️  Migration failed. Checking for failed baseline migration..."

    # Check if the baseline migration is the one that failed
    if npx prisma migrate status 2>&1 | grep -q "0001_baseline"; then
      echo "Resolving baseline migration as already applied..."
      npx prisma migrate resolve --applied 0001_baseline
      echo "Retrying migrate deploy..."
      npx prisma migrate deploy
    else
      echo "❌ Migration failure is not a baseline issue. Exiting."
      exit 1
    fi
  fi
fi

echo "✅ Migrations complete. Starting application..."
exec npx tsx src/app.ts
