#!/bin/bash

# This script sets up an Amazon Linux 2 EC2 instance from scratch to run the Fantasy Football Analytics Dashboard application.
# It installs Docker, Docker Compose, clones the repository, sets up certificates, and starts the application using docker-compose.
# Assumptions:
# - Running as ec2-user with sudo privileges.
# - Instance has internet access and necessary security groups for ports 80/443.
# - Domain name is pointed to the instance's public IP.
# - You will be prompted for your email and domain for Let's Encrypt.

set -euo pipefail

echo "Updating system packages..."
sudo yum update -y

echo "Installing Docker..."
sudo yum install -y docker
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -a -G docker ec2-user

echo "Installing Git..."
sudo yum install -y git

echo "Installing Docker Compose..."
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
docker-compose --version

echo "Cloning the repository..."
git clone https://github.com/bsamaha/dk.git
cd dk

echo "Setting up environment file..."
cat << EOF > .env.production
# Add any other required env vars here
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
EOF

# Prompt for email and domain
read -p "Enter your email for Let's Encrypt: " EMAIL
read -p "Enter your domain (e.g., example.com): " DOMAIN

export LETSENCRYPT_EMAIL="$EMAIL"

echo "Bootstrapping certificates..."
./scripts/bootstrap-cert.sh "$DOMAIN"

echo "Building and starting the application with docker-compose..."
docker-compose up -d --build

echo "Installing CloudWatch Agent for logging..."
sudo yum install -y amazon-cloudwatch-agent

echo "Setup complete!"
echo "Please configure CloudWatch Agent manually if needed."
echo "Access your application at https://$DOMAIN"
echo "To renew certificates, set up a cron job for: docker-compose --profile certbot run --rm certbot renew && docker-compose exec nginx nginx -s reload"
