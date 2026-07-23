#!/usr/bin/env bash
set -euo pipefail

echo "=== Fikir Deployment Script ==="

if [ ! -f .env ]; then
  echo "Error: .env file not found. Copy .env.example to .env and fill in your values."
  exit 1
fi

echo "Building images..."
docker compose build

echo "Starting services..."
docker compose up -d

echo "Applying database schema..."
docker compose exec backend npx prisma db push

echo "Seeding database..."
docker compose exec backend npx prisma db seed

echo ""
echo "=== Deployment complete ==="
echo "App: https://app.yourdomain.com"
echo "API: https://api.yourdomain.com"
