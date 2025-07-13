#!/usr/bin/env bash
# Lightweight deployment script for the Fantasy Football Dashboard.
# Usage: ./deploy.sh <IMAGE_TAG>
# Example: ./deploy.sh 311352839382.dkr.ecr.us-east-2.amazonaws.com/bestball:abcd1234
set -euo pipefail

IMAGE="$1"
CONTAINER_NAME="dk-app"
REGISTRY="311352839382.dkr.ecr.us-east-2.amazonaws.com"
REGION="us-east-2"

if [ -z "$IMAGE" ]; then
  echo "Usage: $0 <IMAGE_TAG>"
  exit 1
fi

# Ensure we are logged in to ECR (instance role provides credentials)
aws ecr get-login-password --region "$REGION" | docker login --username AWS --password-stdin "$REGISTRY"

echo "Pulling new image: $IMAGE"
docker pull "$IMAGE"

if docker ps -a --format '{{.Names}}' | grep -Eq "^${CONTAINER_NAME}$"; then
  echo "Stopping existing container $CONTAINER_NAME"
  docker stop "$CONTAINER_NAME" || true
  docker rm "$CONTAINER_NAME" || true
fi

echo "Starting new container..."
docker run -d \
  --name "$CONTAINER_NAME" \
  -p 80:80 \
  -e ENV=prod \
  --restart always \
  "$IMAGE"

echo "Deployment complete."
