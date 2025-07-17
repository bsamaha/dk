#!/bin/bash

# HTTPS Setup Script for Fantasy Analytics
# This script sets up Let's Encrypt SSL certificates and configures Nginx

set -e

# Configuration
DOMAIN="thesignalcallers.com"
EMAIL="your-email@example.com"  # Replace with your email
CERTBOT_CONF_DIR="./certbot/conf"
CERTBOT_WWW_DIR="./certbot/www"

echo "🚀 Setting up HTTPS for $DOMAIN..."

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p $CERTBOT_CONF_DIR
mkdir -p $CERTBOT_WWW_DIR

# Update email in docker-compose file
echo "📧 Updating email in docker-compose.prod.yml..."
sed -i "s/your-email@example.com/$EMAIL/g" docker-compose.prod.yml

# Step 1: Start services without SSL (HTTP only)
echo "🔧 Starting services with HTTP only..."
docker-compose -f docker-compose.prod.yml up -d nginx app

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 10

# Step 2: Obtain SSL certificate
echo "🔐 Obtaining SSL certificate from Let's Encrypt..."
docker-compose -f docker-compose.prod.yml run --rm certbot

# Step 3: Reload Nginx with SSL configuration
echo "🔄 Reloading Nginx with SSL configuration..."
docker-compose -f docker-compose.prod.yml exec nginx nginx -s reload

# Step 4: Test SSL configuration
echo "🧪 Testing SSL configuration..."
if curl -s -o /dev/null -w "%{http_code}" https://$DOMAIN | grep -q "200\|301\|302"; then
    echo "✅ HTTPS setup successful!"
    echo "🌐 Your site is now available at: https://$DOMAIN"
else
    echo "❌ HTTPS setup failed. Please check the logs:"
    docker-compose -f docker-compose.prod.yml logs nginx
    exit 1
fi

# Step 5: Set up automatic certificate renewal
echo "🔄 Setting up automatic certificate renewal..."
cat > scripts/renew-ssl.sh << 'EOF'
#!/bin/bash
cd "$(dirname "$0")/.."
docker-compose -f docker-compose.prod.yml run --rm certbot renew
docker-compose -f docker-compose.prod.yml exec nginx nginx -s reload
EOF

chmod +x scripts/renew-ssl.sh

# Add to crontab (renew every 60 days)
(crontab -l 2>/dev/null; echo "0 12 * * 0 $(pwd)/scripts/renew-ssl.sh") | crontab -

echo "✅ HTTPS setup complete!"
echo "📋 Next steps:"
echo "   1. Update your DNS to point $DOMAIN to this server's IP"
echo "   2. Test the site at https://$DOMAIN"
echo "   3. Certificates will auto-renew every 60 days"
echo ""
echo "🔧 Useful commands:"
echo "   - View logs: docker-compose -f docker-compose.prod.yml logs -f"
echo "   - Restart services: docker-compose -f docker-compose.prod.yml restart"
echo "   - Manual certificate renewal: ./scripts/renew-ssl.sh"
