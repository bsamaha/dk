#!/bin/bash

# Fix HTTPS Setup Script for Fantasy Analytics
# This script fixes DNS issues and sets up SSL certificates properly

set -e

# Configuration
DOMAIN="thesignalcallers.com"
EC2_IP="18.221.177.254"

echo "🔧 Fixing HTTPS setup for $DOMAIN..."

# Load environment variables
if [ -f "env.production" ]; then
    source env.production
else
    echo "❌ env.production file not found. Please create it with SSL_EMAIL variable."
    exit 1
fi

# Validate required environment variables
if [ -z "$SSL_EMAIL" ] || [ "$SSL_EMAIL" = "your-email@example.com" ]; then
    echo "❌ SSL_EMAIL not set or still using placeholder."
    echo "📧 Please update env.production with your email address:"
    echo "   SSL_EMAIL=your-actual-email@example.com"
    exit 1
fi

echo "📧 SSL Email: $SSL_EMAIL"
echo "🌐 Domain: $DOMAIN"
echo "🖥️  EC2 IP: $EC2_IP"

# Step 1: Check DNS resolution
echo "🔍 Checking DNS resolution..."
MAIN_DOMAIN_IP=$(nslookup $DOMAIN 2>/dev/null | grep "Address:" | tail -1 | awk '{print $2}')
WWW_DOMAIN_IP=$(nslookup www.$DOMAIN 2>/dev/null | grep "Address:" | tail -1 | awk '{print $2}')

echo "   $DOMAIN -> $MAIN_DOMAIN_IP"
echo "   www.$DOMAIN -> $WWW_DOMAIN_IP"

if [ "$MAIN_DOMAIN_IP" != "$EC2_IP" ]; then
    echo "⚠️  WARNING: $DOMAIN does not point to your EC2 instance ($EC2_IP)"
    echo "   Current IP: $MAIN_DOMAIN_IP"
    echo "   Expected IP: $EC2_IP"
    echo ""
    echo "📋 You need to update your DNS records in AWS Route 53:"
    echo "   1. Go to AWS Route 53 Console"
    echo "   2. Select your hosted zone for $DOMAIN"
    echo "   3. Create/Update A record for $DOMAIN -> $EC2_IP"
    echo "   4. Create/Update A record for www.$DOMAIN -> $EC2_IP"
    echo ""
    read -p "Press Enter after updating DNS records..."
fi

# Step 2: Create necessary directories
echo "📁 Creating directories..."
mkdir -p ./certbot/conf
mkdir -p ./certbot/www

# Step 3: Stop current services
echo "🛑 Stopping current services..."
docker-compose -f docker-compose.prod.yml down 2>/dev/null || true

# Step 4: Start services with temporary nginx config
echo "🚀 Starting services with temporary nginx config..."
# Temporarily use nginx-temp.conf
cp nginx-temp.conf nginx.conf.backup
cp nginx-temp.conf nginx.conf

docker-compose -f docker-compose.prod.yml up -d nginx app

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 15

# Step 5: Test HTTP access
echo "🧪 Testing HTTP access..."
if curl -s -o /dev/null -w "%{http_code}" http://$DOMAIN | grep -q "200\|301\|302"; then
    echo "✅ HTTP access working"
else
    echo "❌ HTTP access failed. Please check:"
    echo "   1. EC2 security group allows port 80"
    echo "   2. DNS records are updated"
    echo "   3. Services are running"
    docker-compose -f docker-compose.prod.yml logs nginx
    exit 1
fi

# Step 6: Obtain SSL certificate
echo "🔐 Obtaining SSL certificate..."
docker-compose -f docker-compose.prod.yml run --rm certbot

# Step 7: Restore full nginx config
echo "🔄 Restoring full nginx config..."
cp nginx.conf.backup nginx.conf
rm nginx.conf.backup

# Step 8: Restart services with full config
echo "🔄 Restarting services with full HTTPS config..."
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d nginx app

# Wait for services to be ready
sleep 10

# Step 9: Test HTTPS
echo "🧪 Testing HTTPS..."
if curl -s -o /dev/null -w "%{http_code}" https://$DOMAIN | grep -q "200\|301\|302"; then
    echo "✅ HTTPS setup successful!"
    echo "🌐 Your site is now available at: https://$DOMAIN"
else
    echo "❌ HTTPS setup failed. Please check the logs:"
    docker-compose -f docker-compose.prod.yml logs nginx
    exit 1
fi

# Step 10: Set up automatic certificate renewal
echo "🔄 Setting up automatic certificate renewal..."
cat > scripts/renew-ssl.sh << 'EOF'
#!/bin/bash
cd "$(dirname "$0")/.."
docker-compose -f docker-compose.prod.yml run --rm certbot renew
docker-compose -f docker-compose.prod.yml exec nginx nginx -s reload
EOF

chmod +x scripts/renew-ssl.sh

# Add to crontab (renew every 60 days)
CRON_ENTRY="0 12 * * 0 $(pwd)/scripts/renew-ssl.sh"
if ! crontab -l 2>/dev/null | grep -q "$(basename scripts/renew-ssl.sh)"; then
    echo "📅 Adding SSL renewal to crontab..."
    (crontab -l 2>/dev/null; echo "$CRON_ENTRY") | crontab -
    echo "✅ Crontab entry added successfully"
else
    echo "ℹ️  SSL renewal crontab entry already exists, skipping..."
fi

echo ""
echo "✅ HTTPS setup complete!"
echo ""
echo "📋 Summary:"
echo "   ✅ SSL certificate obtained for $DOMAIN"
echo "   ✅ Nginx configured for HTTPS"
echo "   ✅ Automatic renewal scheduled"
echo ""
echo "🌐 Your site is now available at: https://$DOMAIN"
echo ""
echo "📧 SSL certificates will send renewal notifications to: $SSL_EMAIL"
echo ""
echo "🔧 Useful commands:"
echo "   - View logs: docker-compose -f docker-compose.prod.yml logs -f"
echo "   - Restart services: docker-compose -f docker-compose.prod.yml restart"
echo "   - Manual certificate renewal: ./scripts/renew-ssl.sh"
echo "   - Remove crontab entry: crontab -l | grep -v 'renew-ssl.sh' | crontab -"
