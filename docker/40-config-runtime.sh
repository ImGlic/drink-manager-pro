#!/bin/sh
# Executado pelo entrypoint do nginx antes de iniciar.
set -e

# 1) Configuração do frontend a partir das variáveis do container
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_PUBLISHABLE_KEY" ]; then
  echo "AVISO: SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY não definidas" >&2
fi
cat > /usr/share/nginx/html/config.js <<JS
window.__ENV__ = {
  SUPABASE_URL: "${SUPABASE_URL}",
  SUPABASE_PUBLISHABLE_KEY: "${SUPABASE_PUBLISHABLE_KEY}"
};
JS

# 2) URL pública (imagens de compartilhamento precisam de endereço absoluto)
sed -i "s|__SITE_URL__|${SITE_URL:-}|g" /usr/share/nginx/html/index.html

# 3) HTTPS: usa certificado montado em /etc/nginx/certs ou gera um autoassinado
#    (necessário para a câmera do celular na rede local).
CERT_DIR=/etc/nginx/certs
if [ "$ENABLE_HTTPS" = "true" ]; then
  mkdir -p "$CERT_DIR"
  if [ ! -f "$CERT_DIR/cert.pem" ] || [ ! -f "$CERT_DIR/key.pem" ]; then
    echo "Gerando certificado autoassinado para testes..."
    openssl req -x509 -nodes -newkey rsa:2048 -days 825 \
      -keyout "$CERT_DIR/key.pem" -out "$CERT_DIR/cert.pem" \
      -subj "/CN=meu-bar" \
      -addext "subjectAltName=DNS:localhost,IP:127.0.0.1${HOST_IP:+,IP:$HOST_IP}" >/dev/null 2>&1
  fi
else
  # sem HTTPS (ex.: atrás de um proxy como o Caddy em produção)
  sed -i '/# BEGIN HTTPS/,/# END HTTPS/d' /etc/nginx/conf.d/default.conf
fi
