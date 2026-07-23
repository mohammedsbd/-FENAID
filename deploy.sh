#!/usr/bin/env bash
set -euo pipefail

echo "=== Fikir Deployment Script ==="

if [ ! -f .env ]; then
  echo "Error: .env file not found."
  echo "Copy .env.production.example to .env and fill in your values."
  exit 1
fi

MODE="${1:-docker}"

if [ "$MODE" = "docker" ]; then
  echo "=== Deploying with Docker ==="
  docker compose build
  docker compose up -d
  docker compose exec -T backend npx prisma db push
  docker compose exec -T backend npx prisma db seed
  echo ""
  echo "=== Docker deployment complete ==="
  echo "App: https://app.yourdomain.com"
  echo "API: https://api.yourdomain.com"

elif [ "$MODE" = "pm2" ]; then
  echo "=== Deploying with PM2 (no Docker) ==="
  command -v node >/dev/null || { echo "Node.js is required. Install it first."; exit 1; }
  command -v pnpm >/dev/null || npm install -g pnpm@9.15.4

  pnpm install
  pnpm build
  pnpm db:push
  pnpm db:seed

  command -v pm2 >/dev/null || npm install -g pm2
  pm2 start ecosystem.config.js
  pm2 save
  pm2 startup 2>/dev/null || true

  echo ""
  echo "=== PM2 deployment complete ==="
  echo "App: http://YOUR_VPS_IP:3100"
  echo "API: http://YOUR_VPS_IP:3001"
  echo "Set up Nginx/Caddy for SSL and domain binding."

else
  echo "Usage: ./deploy.sh [docker|pm2]"
  exit 1
fi
