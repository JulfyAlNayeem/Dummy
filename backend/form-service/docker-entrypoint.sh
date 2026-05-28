#!/bin/sh
set -e

echo "=== form-service: running Prisma migrations ==="

FIRST_MIGRATION=$(ls prisma/migrations/ | grep -v migration_lock | sort | head -1)

set +e
MIGRATE_OUTPUT=$(npx prisma migrate deploy 2>&1)
MIGRATE_STATUS=$?
set -e

echo "$MIGRATE_OUTPUT"

if [ $MIGRATE_STATUS -ne 0 ]; then
	if ! echo "$MIGRATE_OUTPUT" | grep -Eq "P3009|P3018|already exists"; then
		echo "ERROR: Non-recoverable migration failure"
		exit $MIGRATE_STATUS
	fi

	echo "WARNING: Initial migrate deploy failed, attempting recovery..."
	FAILED_MIGRATION=$(echo "$MIGRATE_OUTPUT" | sed -n "s/.*The \`\([^\`]*\)\` migration started.*/\1/p" | head -1 || true)
	if [ -n "$FAILED_MIGRATION" ] && [ -d "prisma/migrations/$FAILED_MIGRATION" ]; then
		npx prisma migrate resolve --rolled-back "$FAILED_MIGRATION" >/dev/null 2>&1 || true
		npx prisma migrate resolve --applied "$FAILED_MIGRATION" >/dev/null 2>&1 || true
	fi

	if [ -n "$FIRST_MIGRATION" ]; then
		npx prisma migrate resolve --rolled-back "$FIRST_MIGRATION" >/dev/null 2>&1 || true
		npx prisma migrate resolve --applied "$FIRST_MIGRATION" >/dev/null 2>&1 || true
	fi
	npx prisma migrate deploy
fi

echo "=== Starting form-service ==="
exec npx tsx src/app.ts