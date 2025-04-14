#!/bin/bash
set -e

# Wait for PostgreSQL to be ready using pg_isready
echo "Waiting for PostgreSQL to be ready..."
until pg_isready -h postgres -p 5432 -U postgres; do
  echo "PostgreSQL is unavailable - sleeping"
  sleep 1
done
echo "PostgreSQL is up and running!"

# Create the generated directory if it doesn't exist
mkdir -p ./generated

# Generate Prisma client
echo "Generating Prisma client..."
npx prisma generate --schema=./prisma/schema.prisma

# Run Prisma migrations
echo "Running Prisma migrations..."
npx prisma migrate deploy
# Note: replaced reset --force with deploy for production safety

# Then exec the container's main process
echo "Starting application..."
exec "$@"