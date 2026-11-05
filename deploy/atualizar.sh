#!/usr/bin/env bash
# Executado no servidor pela pipeline (job "server").
# Variáveis: IMAGE IMAGE_TAG DOMAIN LETSENCRYPT_EMAIL SUPABASE_URL SUPABASE_PUBLISHABLE_KEY GHCR_USER GHCR_TOKEN
#            DEPLOY_MODO (standalone | proxy) APP_PORT (modo proxy, padrão 3080)
set -euo pipefail
cd "$(dirname "$0")"

{
  echo "IMAGE=${IMAGE}"
  echo "IMAGE_TAG=${IMAGE_TAG}"
  echo "DOMAIN=${DOMAIN}"
  echo "SUPABASE_URL=${SUPABASE_URL}"
  echo "SUPABASE_PUBLISHABLE_KEY=${SUPABASE_PUBLISHABLE_KEY}"
  echo "APP_PORT=${APP_PORT:-3080}"
} > .env

# standalone: nginx do container nas portas 80/443 + certbot
# proxy:      nginx do servidor na frente (container em 127.0.0.1:APP_PORT)
MODO="${DEPLOY_MODO:-standalone}"
if [ "$MODO" = "proxy" ]; then
  COMPOSE="docker compose -f docker-compose.proxy.yml"
else
  COMPOSE="docker compose -f docker-compose.prod.yml"
fi

echo "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USER" --password-stdin
$COMPOSE pull
$COMPOSE up -d --remove-orphans
docker logout ghcr.io
docker image prune -f

# health check
ok=0
for _ in $(seq 1 20); do
  if $COMPOSE exec -T web wget -qO- http://127.0.0.1/health >/dev/null 2>&1; then ok=1; break; fi
  sleep 3
done
if [ "$ok" != 1 ]; then
  echo "A aplicação não respondeu ao health check" >&2
  $COMPOSE logs --tail 50 web >&2
  exit 1
fi

if [ "$MODO" = "proxy" ]; then
  echo "Deploy OK (modo proxy): container em 127.0.0.1:${APP_PORT:-3080} (imagem ${IMAGE_TAG})"
  exit 0
fi

# Primeira subida: emite o certificado Let's Encrypt (renovação fica com o container certbot)
if ! $COMPOSE exec -T web test -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem"; then
  echo "Emitindo certificado HTTPS para ${DOMAIN}..."
  $COMPOSE run --rm --entrypoint certbot certbot certonly \
    --webroot -w /var/www/certbot -d "${DOMAIN}" \
    --email "${LETSENCRYPT_EMAIL}" --agree-tos --no-eff-email --non-interactive
fi

# Aponta o nginx para o certificado (se mudou) e recarrega
$COMPOSE exec -T web sh -c '/usr/local/bin/certificado.sh || true; nginx -s reload'

echo "Deploy OK: https://${DOMAIN} (imagem ${IMAGE_TAG})"
