# Build stage
FROM node:18-slim AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies including PostgreSQL client (for health checks)
RUN apt-get update && apt-get install -y postgresql-client && rm -rf /var/lib/apt/lists/*
RUN npm ci

# Generate Prisma client
RUN npx prisma generate

# Copy source code
COPY . .

# Build CSS
RUN npm run build:css

# Production stage
FROM node:18-slim

WORKDIR /app

# Install PostgreSQL client for health checks
RUN apt-get update && apt-get install -y postgresql-client wget && rm -rf /var/lib/apt/lists/*

# Copy from builder stage
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/public ./public
COPY --from=builder /app/*.js ./
COPY --from=builder /app/package*.json ./

# Copy the entrypoint script
COPY ./docker-entrypoint.sh /
RUN chmod +x /docker-entrypoint.sh

# Create health check endpoint
RUN echo 'const express = require("express"); const app = express(); app.get("/health", (req, res) => { res.status(200).send("OK"); }); app.listen(5001);' > health.js

EXPOSE 5001

# Use the entrypoint script
ENTRYPOINT ["/docker-entrypoint.sh"]

# Runs the app
CMD ["npm", "run", "start"]