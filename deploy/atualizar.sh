#!/usr/bin/env bash
# Executado no servidor pela pipeline (job "server").
# Espera as variáveis: IMAGE IMAGE_TAG DOMAIN SUPABASE_URL SUPABASE_PUBLISHABLE_KEY GHCR_USER GHCR_TOKEN
set -euo pipefail
cd "$(dirname "$0")"

{
  echo "IMAGE=${IMAGE}"
  echo "IMAGE_TAG=${IMAGE_TAG}"
  echo "DOMAIN=${DOMAIN}"
  echo "SUPABASE_URL=${SUPABASE_URL}"
  echo "SUPABASE_PUBLISHABLE_KEY=${SUPABASE_PUBLISHABLE_KEY}"
} > .env

COMPOSE="docker compose -f docker-compose.prod.yml"

echo "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USER" --password-stdin
$COMPOSE pull
$COMPOSE up -d --remove-orphans
docker logout ghcr.io
docker image prune -f

# health check
for _ in $(seq 1 20); do
  if $COMPOSE exec -T web wget -qO- http://127.0.0.1/health >/dev/null 2>&1; then
    echo "Deploy OK: https://${DOMAIN} (imagem ${IMAGE_TAG})"
    exit 0
  fi
  sleep 3
done

echo "A aplicação não respondeu ao health check" >&2
$COMPOSE logs --tail 50 web >&2
exit 1
