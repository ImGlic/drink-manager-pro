#!/usr/bin/env bash
# Publica o Meu Bar como site estático servido pelo NGINX DO SERVIDOR (sem container rodando).
#
# Uso (no servidor, dentro da pasta deploy/):
#   sudo ./publicar-estatico.sh            # pega os arquivos da imagem pronta da pipeline (GHCR)
#   sudo ./publicar-estatico.sh --local    # compila aqui com o Node do servidor (npm ci + build)
#
# Lê as configurações do arquivo .env desta pasta:
#   DOMAIN, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY
#   IMAGE / IMAGE_TAG   (opcional; padrão ghcr.io/imglic/drink-manager-pro:latest)
#   DESTINO             (opcional; padrão /var/www/meubar)
set -euo pipefail
cd "$(dirname "$0")"

# shellcheck source=/dev/null
[ -f .env ] && set -a && . ./.env && set +a
: "${SUPABASE_URL:?defina SUPABASE_URL no .env}"
: "${SUPABASE_PUBLISHABLE_KEY:?defina SUPABASE_PUBLISHABLE_KEY no .env}"
IMAGE="${IMAGE:-ghcr.io/imglic/drink-manager-pro}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
DESTINO="${DESTINO:-/var/www/meubar}"
SITE_URL="${SITE_URL:-${DOMAIN:+https://$DOMAIN}}"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
NOVO="$TMP/site"

if [ "${1:-}" = "--local" ]; then
  echo "Compilando com o Node do servidor..."
  (cd .. && npm ci --no-audit --no-fund && npm run build)
  cp -r ../dist "$NOVO"
else
  echo "Baixando $IMAGE:$IMAGE_TAG..."
  docker pull "$IMAGE:$IMAGE_TAG"
  # docker create + cp só copia arquivos: nada é executado dentro da imagem
  CID="$(docker create "$IMAGE:$IMAGE_TAG")"
  docker cp "$CID:/usr/share/nginx/html" "$NOVO"
  docker rm "$CID" >/dev/null
fi

[ -f "$NOVO/index.html" ] || { echo "Build inválido: index.html não encontrado" >&2; exit 1; }

# Configuração em tempo de execução (mesma lógica do container)
cat > "$NOVO/config.js" <<JS
window.__ENV__ = {
  SUPABASE_URL: "${SUPABASE_URL}",
  SUPABASE_PUBLISHABLE_KEY: "${SUPABASE_PUBLISHABLE_KEY}"
};
JS
sed -i "s|__SITE_URL__|${SITE_URL}|g" "$NOVO/index.html"

# Troca atômica: a versão antiga fica em ${DESTINO}.anterior (para voltar, é só renomear)
mkdir -p "$(dirname "$DESTINO")"
rm -rf "${DESTINO}.novo" "${DESTINO}.anterior"
cp -r "$NOVO" "${DESTINO}.novo"
chmod -R a+rX "${DESTINO}.novo"
[ -d "$DESTINO" ] && mv "$DESTINO" "${DESTINO}.anterior"
mv "${DESTINO}.novo" "$DESTINO"

echo "Publicado em $DESTINO ($(du -sh "$DESTINO" | cut -f1))."
echo "Teste: curl -s -H 'Host: ${DOMAIN:-meubar}' http://127.0.0.1/ | head -c 200"
