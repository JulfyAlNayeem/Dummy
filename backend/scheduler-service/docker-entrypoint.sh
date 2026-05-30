#!/bin/sh
set -e

echo "=== Starting scheduler-service ==="
exec npx tsx src/app.ts