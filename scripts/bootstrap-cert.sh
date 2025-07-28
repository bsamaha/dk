#!/usr/bin/env bash
set -euo pipefail

# One-time script to obtain initial Let's Encrypt certificate for the domain
# Usage:
#   ./scripts/bootstrap-cert.sh

# Hardcoded values for thesignalcallers.com
DOMAIN="thesignalcallers.com"
EMAIL="blake.samaha16@gmail.com"

echo "🔧 Starting certificate bootstrap for $DOMAIN..."

# Stop any existing containers
echo "🛑 Stopping existing containers..."
docker-compose down

# Start nginx with bootstrap configuration (HTTP-only)
echo "📦 Starting nginx with bootstrap configuration..."
docker run -d \
  --name nginx-bootstrap \
  --network dk_app-network \
  -p 80:80 \
  -v "$(pwd)/nginx-bootstrap.conf:/etc/nginx/nginx.conf:ro" \
  -v "$(pwd)/certbot/www:/var/www/certbot" \
  nginx:alpine

echo "➡️  Requesting certificate for $DOMAIN and www.$DOMAIN …"
docker run --rm \
  -v "$(pwd)/certbot/conf:/etc/letsencrypt" \
  -v "$(pwd)/certbot/www:/var/www/certbot" \
  certbot/certbot certonly \
    --webroot -w /var/www/certbot \
    --agree-tos --no-eff-email \
    -m "$EMAIL" \
    -d "$DOMAIN" -d "www.$DOMAIN"

echo "🛑 Stopping bootstrap nginx..."
docker stop nginx-bootstrap
docker rm nginx-bootstrap

echo "♻️  Starting full application with SSL..."
docker-compose up -d

echo "✅ Certificate obtained and application started. Verify via https://$DOMAIN"
