#!/bin/bash

# Fix HTTPS Setup Script for Fantasy Analytics
# This script fixes DNS issues and sets up SSL certificates properly

set -e

DOMAIN="thesignalcallers.com"
EC2_IP="18.221.177.254"
RENEW_SCRIPT="scripts/renew-ssl.sh"

check_dns() {
    echo "🔍 Checking DNS resolution..."
    MAIN_DOMAIN_IP=$(dig +short "$DOMAIN" | grep -E '^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$' | head -1)
    WWW_DOMAIN_IP=$(dig +short "www.$DOMAIN" | grep -E '^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$' | head -1)

    if [ -z "$MAIN_DOMAIN_IP" ]; then
        echo "❌ ERROR: Could not resolve $DOMAIN. Please check your DNS settings."
    else
        echo "   $DOMAIN -> $MAIN_DOMAIN_IP"
    fi

    if [ -z "$WWW_DOMAIN_IP" ]; then
        echo "❌ ERROR: Could not resolve www.$DOMAIN. Please check your DNS settings."
    else
        echo "   www.$DOMAIN -> $WWW_DOMAIN_IP"
    fi
}

backup_nginx_conf() {
    TIMESTAMP=$(date +%Y%m%d%H%M%S)
    NGINX_BACKUP="nginx.conf.backup.$TIMESTAMP"
    if [ -f nginx.conf ]; then
        cp nginx.conf "$NGINX_BACKUP"
        echo "🗄️  Backed up existing nginx.conf to $NGINX_BACKUP"
        # Store the backup filename for later restoration
        echo "$NGINX_BACKUP" > .nginx_backup_file
    else
        echo "⚠️  No existing nginx.conf found to backup"
    fi
}

setup_renewal_script() {
    echo "🔄 Setting up automatic certificate renewal..."
    if [ -f "$RENEW_SCRIPT" ]; then
        echo "⚠️  $RENEW_SCRIPT already exists."
        read -p "Do you want to overwrite it? [y/N]: " OVERWRITE
        if [[ ! "$OVERWRITE" =~ ^[Yy]$ ]]; then
            echo "ℹ️  Skipping creation of $RENEW_SCRIPT to preserve custom changes."
            return
        fi
    fi
    cat > "$RENEW_SCRIPT" << 'EOF'
#!/bin/bash
cd "$(dirname "$0")/.."
docker-compose -f docker-compose.prod.yml run --rm certbot renew
docker-compose -f docker-compose.prod.yml exec nginx nginx -s reload
EOF
    chmod +x "$RENEW_SCRIPT"
    echo "✅ $RENEW_SCRIPT has been created or overwritten."
}

issue_cert() {
    echo "🔐 Obtaining SSL certificate..."
    docker-compose -f docker-compose.prod.yml run --rm certbot
}

main() {
    echo "🔧 Fixing HTTPS setup for $DOMAIN..."
    if [ -f "env.production" ]; then
        source env.production
    else
        echo "❌ env.production file not found. Please create it with SSL_EMAIL variable."
        exit 1
    fi
    if [ -z "$SSL_EMAIL" ] || [ "$SSL_EMAIL" = "your-email@example.com" ]; then
        echo "❌ SSL_EMAIL not set or still using placeholder."
        echo "📧 Please update env.production with your email address:"
        echo "   SSL_EMAIL=your-actual-email@example.com"
        exit 1
    fi
    echo "📧 SSL Email: $SSL_EMAIL"
    echo "🌐 Domain: $DOMAIN"
    echo "🖥️  EC2 IP: $EC2_IP"

    check_dns

    echo "📁 Creating directories..."
    mkdir -p ./certbot/conf
    mkdir -p ./certbot/www

    echo "🛑 Stopping current services..."
    docker-compose -f docker-compose.prod.yml down 2>/dev/null || true

    echo "🚀 Starting services with temporary nginx config..."
    backup_nginx_conf
    cp nginx-temp.conf nginx.conf
    docker-compose -f docker-compose.prod.yml up -d nginx app

    echo "⏳ Waiting for services to be ready..."
    sleep 15

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

    issue_cert

    echo "🔄 Restoring full nginx config..."
    if [ -f .nginx_backup_file ]; then
        NGINX_BACKUP=$(cat .nginx_backup_file)
        if [ -f "$NGINX_BACKUP" ]; then
            cp "$NGINX_BACKUP" nginx.conf
            echo "🔙 Restored nginx.conf from $NGINX_BACKUP"
            rm .nginx_backup_file
        else
            echo "⚠️  Backup file $NGINX_BACKUP not found, keeping temporary config"
        fi
    else
        echo "⚠️  No backup file found, keeping temporary config"
    fi

    echo "🔄 Restarting services with full HTTPS config..."
    docker-compose -f docker-compose.prod.yml down
    docker-compose -f docker-compose.prod.yml up -d nginx app
    sleep 10

    echo "🧪 Testing HTTPS..."
    if curl -s -o /dev/null -w "%{http_code}" https://$DOMAIN | grep -q "200\|301\|302"; then
        echo "✅ HTTPS setup successful!"
        echo "🌐 Your site is now available at: https://$DOMAIN"
    else
        echo "❌ HTTPS setup failed. Please check the logs:"
        docker-compose -f docker-compose.prod.yml logs nginx
        exit 1
    fi

    setup_renewal_script

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
    echo "   ✅ SSL certificate obtained for $DOMAIN and www.$DOMAIN"
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
}

main "$@"
