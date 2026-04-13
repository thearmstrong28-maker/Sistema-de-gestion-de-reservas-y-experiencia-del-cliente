#!/bin/sh
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "${YELLOW}=== Restaurant Reservation System Backend ===${NC}"

# Check if DATABASE_URL is set (takes precedence)
if [ -n "$DATABASE_URL" ]; then
  echo "${YELLOW}Using DATABASE_URL for connection${NC}"
else
  echo "${YELLOW}Using individual DB environment variables${NC}"
  echo "DB_HOST: $DB_HOST"
  echo "DB_PORT: $DB_PORT"
  echo "DB_USER: $DB_USER"
  echo "DB_NAME: $DB_NAME"
fi

# Wait for PostgreSQL to be ready
echo "${YELLOW}Waiting for PostgreSQL at ${DB_HOST}:${DB_PORT}...${NC}"
max_attempts=30
attempt=1

while [ $attempt -le $max_attempts ]; do
  if pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" > /dev/null 2>&1; then
    echo "${GREEN}PostgreSQL is ready!${NC}"
    break
  fi

  if [ $attempt -eq $max_attempts ]; then
    echo "${RED}PostgreSQL did not become ready in time${NC}"
    exit 1
  fi

  echo "PostgreSQL not ready yet. Attempt $attempt/$max_attempts. Waiting..."
  sleep 2
  attempt=$((attempt + 1))
done

# Run database migrations
echo "${YELLOW}Applying database schema...${NC}"
if node scripts/apply-sql.js; then
  echo "${GREEN}Database schema applied successfully!${NC}"
else
  echo "${RED}Failed to apply database schema${NC}"
  exit 1
fi

# Start the application
echo "${YELLOW}Starting NestJS application...${NC}"
exec node dist/main
