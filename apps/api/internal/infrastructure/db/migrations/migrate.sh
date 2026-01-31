#!/bin/bash
# Run database migrations
#
# Usage:
#   ./migrate.sh                           # Uses DATABASE_URL from environment
#   ./migrate.sh postgres://user:pass@localhost/db  # Explicit connection string
#
# Requirements:
#   - PostgreSQL client (psql)
#   - DATABASE_URL environment variable or pass connection string as argument

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DB_URL="${1:-$DATABASE_URL}"

if [ -z "$DB_URL" ]; then
    echo "Error: No database URL provided"
    echo "Usage: $0 [database_url]"
    echo "  or set DATABASE_URL environment variable"
    exit 1
fi

echo "Running migrations..."

# Run each migration file in order
for migration in "$SCRIPT_DIR"/*.sql; do
    if [ -f "$migration" ]; then
        filename=$(basename "$migration")
        echo "  Applying: $filename"
        psql "$DB_URL" -f "$migration" -v ON_ERROR_STOP=1
    fi
done

echo "Migrations complete!"

# Verify tables exist
echo ""
echo "Verifying tables..."
psql "$DB_URL" -c "\dt financial_periods" -c "\dt income_statements" -c "\dt balance_sheets" -c "\dt cash_flow_statements" -c "\dt revenue_segments"
