#!/usr/bin/env bash
set -euo pipefail

# One-time script to obtain initial Let’s Encrypt certificate for the domain
# Usage:
#   export LETSENCRYPT_EMAIL="user@example.com"
#   ./scripts/bootstrap-cert.sh  thesignalcallers.com

# Load env file if exists and variable not exported
DOMAIN="${1:-thesignalcallers.com}"
if [ -z "${LETSENCRYPT_EMAIL:-}" ] && [ -f .env.production ]; then
  # shellcheck source=/dev/null
  source .env.production
fi
EMAIL="${LETSENCRYPT_EMAIL:-${SSL_EMAIL:-}}"
if [ -z "$EMAIL" ]; then
  echo "❌ Provide email either via LETSENCRYPT_EMAIL env var or SSL_EMAIL in .env.production"
  exit 1
fi

# Start nginx (HTTP-only) so webroot validation works
docker compose up -d nginx

echo "➡️  Requesting certificate for $DOMAIN and www.$DOMAIN …"
docker run --rm \
  -v "$(pwd)/certbot/conf:/etc/letsencrypt" \
  -v "$(pwd)/certbot/www:/var/www/certbot" \
  certbot/certbot certonly \
    --webroot -w /var/www/certbot \
    --agree-tos --no-eff-email \
    -m "$EMAIL" \
    -d "$DOMAIN" -d "www.$DOMAIN"

echo "♻️  Reloading nginx with TLS…"
docker compose restart nginx

echo "✅ Certificate obtained and nginx reloaded. Verify via https://$DOMAIN"
