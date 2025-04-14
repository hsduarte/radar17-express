#!/bin/bash
set -e

# Deployment script for Radar17 Debate application

# Check for environment variable file
if [ ! -f .env ]; then
  echo "Error: .env file not found"
  echo "Please create a .env file with the required environment variables"
  exit 1
fi

# Load environment variables
source .env

# Check for Docker and Docker Compose
if ! command -v docker &> /dev/null || ! command -v docker-compose &> /dev/null; then
  echo "Error: Docker and/or Docker Compose not installed"
  exit 1
fi

# Pull latest changes (if deploying from git)
if [ -d .git ]; then
  echo "Pulling latest changes from git..."
  git pull
fi

# Build and start the containers
echo "Building and starting containers..."
docker-compose -f docker-compose.yml -f docker-compose.prod.yml build
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Check if containers are running
echo "Checking container status..."
sleep 5
CONTAINERS=(radar17-app radar17-postgres)
for container in "${CONTAINERS[@]}"; do
  if [ "$(docker inspect -f {{.State.Running}} $container)" = "true" ]; then
    echo "$container is running"
  else
    echo "Error: $container is not running"
    docker logs $container
    exit 1
  fi
done

echo "Deployment completed successfully!"
echo "Application is running at http://localhost:5001"