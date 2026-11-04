#!/bin/sh
# Executado pelo entrypoint do nginx antes de iniciar.
set -e
CONF=/etc/nginx/conf.d/default.conf

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
SITE_URL="${SITE_URL:-${DOMAIN:+https://$DOMAIN}}"
sed -i "s|__SITE_URL__|${SITE_URL}|g" /usr/share/nginx/html/index.html

# 3) HTTPS
if [ "$ENABLE_HTTPS" = "true" ]; then
  /usr/local/bin/certificado.sh || true

  # Produção: HTTP só responde ao Let's Encrypt e redireciona o resto para HTTPS
  if [ "$FORCE_HTTPS" = "true" ]; then
    sed -i '/# BEGIN HTTP_APP/,/# END HTTP_APP/d' "$CONF"
    sed -i 's|# REDIRECT_HTTPS|location / { return 301 https://$host$request_uri; }|' "$CONF"
  fi

  # Recarrega o nginx periodicamente para pegar certificados novos/renovados pelo certbot
  if [ -n "$CERT_RELOAD_INTERVAL" ]; then
    (
      while sleep "$CERT_RELOAD_INTERVAL"; do
        /usr/local/bin/certificado.sh >/dev/null 2>&1 || true
        nginx -s reload >/dev/null 2>&1 || true
      done
    ) &
  fi
else
  # sem HTTPS (ex.: atrás de outro proxy)
  sed -i '/# BEGIN HTTPS/,/# END HTTPS/d' "$CONF"
fi
