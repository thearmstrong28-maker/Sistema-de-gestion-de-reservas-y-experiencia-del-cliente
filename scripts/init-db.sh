#!/bin/bash
# PostgreSQL initialization script
# This script runs inside the PostgreSQL container during first initialization

set -e

echo "=== Initializing PostgreSQL for Restaurant Reservation System ==="

# Create the application database if it doesn't exist
DB_NAME="${POSTGRES_DB:-restaurant_reservations}"

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "postgres" <<-EOSQL
    SELECT 'CREATE DATABASE "${DB_NAME}"'
    WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '${DB_NAME}');\gexec

    \c "${DB_NAME}"
    CREATE EXTENSION IF NOT EXISTS pgcrypto;
    CREATE EXTENSION IF NOT EXISTS btree_gist;
EOSQL

echo "=== PostgreSQL initialization complete: database '${DB_NAME}' ready ==="
