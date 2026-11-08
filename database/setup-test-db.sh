#!/usr/bin/env bash
# Creates (or recreates) the database used by the automated tests and applies all migrations.
# Usage:  bash database/setup-test-db.sh            -> database "localbuka_test"
#         bash database/setup-test-db.sh my_test    -> custom name (must end in _test)
# Needs psql on your PATH. Set PGPASSWORD first, or psql will ask for the password.
set -euo pipefail

DB_NAME="${1:-localbuka_test}"
DB_USER="${PGUSER:-postgres}"

if [[ "$DB_NAME" != *_test ]]; then
  echo "Refusing to run: the database name must end in _test (got '$DB_NAME')." >&2
  exit 1
fi

cd "$(dirname "$0")"

psql -U "$DB_USER" -d postgres -v ON_ERROR_STOP=1 -q \
  -c "DROP DATABASE IF EXISTS $DB_NAME;" \
  -c "CREATE DATABASE $DB_NAME;"

for migration in migrations/*.sql; do
  echo "Applying $migration"
  psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 -q -f "$migration"
done

echo "Test database '$DB_NAME' is ready."
