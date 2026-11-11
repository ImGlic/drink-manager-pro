#!/usr/bin/env bash
# Compila a imagem NO PRÓPRIO SERVIDOR e sobe o container (modo proxy).
# Alternativa ao "pull" da imagem pronta da pipeline.
#
# Uso (no servidor):
#   cd /opt/apps/HML/drink-manager-pro && sudo git pull
#   sudo ./deploy/build-servidor.sh
#
# Usa o builder clássico do Docker (DOCKER_BUILDKIT=0): neste servidor o BuildKit
# falha com "exec /bin/sh: exec format error", enquanto o builder clássico funciona.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> Compilando a imagem meu-bar:local (pode levar alguns minutos)..."
DOCKER_BUILDKIT=0 docker build -t meu-bar:local .

cd deploy
if [ ! -f .env ]; then
  echo "Arquivo deploy/.env não encontrado. Crie com DOMAIN, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY e APP_PORT." >&2
  exit 1
fi

# aponta o compose para a imagem compilada aqui
sed -i 's|^IMAGE=.*|IMAGE=meu-bar|; s|^IMAGE_TAG=.*|IMAGE_TAG=local|' .env
grep -q '^IMAGE=' .env || echo 'IMAGE=meu-bar' >> .env
grep -q '^IMAGE_TAG=' .env || echo 'IMAGE_TAG=local' >> .env

echo "==> Subindo o container..."
docker compose -f docker-compose.proxy.yml up -d

PORTA="$(grep '^APP_PORT=' .env | cut -d= -f2)"
PORTA="${PORTA:-3080}"
for _ in $(seq 1 20); do
  if curl -fsS "http://127.0.0.1:${PORTA}/health" >/dev/null 2>&1; then
    echo "==> OK: Meu Bar no ar em 127.0.0.1:${PORTA}"
    docker image prune -f >/dev/null
    exit 0
  fi
  sleep 2
done

echo "O container não respondeu ao health check:" >&2
docker compose -f docker-compose.proxy.yml logs --tail 40 web >&2
exit 1
