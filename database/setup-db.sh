#!/usr/bin/env bash
# Creates the development database (default name: localbuka) and applies every migration.
# Usage:  bash database/setup-db.sh            -> database "localbuka"
#         bash database/setup-db.sh my_db      -> custom name
# Needs psql on your PATH. Set PGPASSWORD first, or psql will ask for the password.
# It never touches a database that already exists, so it cannot wipe your data.
set -euo pipefail

DB_NAME="${1:-localbuka}"
DB_USER="${PGUSER:-postgres}"

cd "$(dirname "$0")"

if psql -U "$DB_USER" -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" | grep -q 1; then
  echo "Database '$DB_NAME' already exists, so nothing was changed."
  exit 0
fi

psql -U "$DB_USER" -d postgres -v ON_ERROR_STOP=1 -q -c "CREATE DATABASE $DB_NAME;"

for migration in migrations/*.sql; do
  echo "Applying $migration"
  psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 -q -f "$migration"
done

echo "Database '$DB_NAME' is ready. Next: cd ../backend && npm run seed"