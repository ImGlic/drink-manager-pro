# Compatível com BuildKit e com o builder clássico (DOCKER_BUILDKIT=0), que não define
# BUILDPLATFORM sozinho. No BuildKit o valor real da máquina substitui este padrão.
ARG BUILDPLATFORM=linux/amd64

# ---------- build ----------
# A etapa de build roda na arquitetura de quem compila (o resultado é só HTML/JS)
FROM --platform=$BUILDPLATFORM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

# ---------- runtime (nginx) ----------
FROM nginx:stable-alpine
RUN apk upgrade --no-cache && apk add --no-cache openssl
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY docker/app.inc /etc/nginx/conf.d/app.inc
COPY docker/40-config-runtime.sh /docker-entrypoint.d/40-config-runtime.sh
COPY docker/certificado.sh /usr/local/bin/certificado.sh
RUN sed -i 's/\r$//' /docker-entrypoint.d/40-config-runtime.sh /usr/local/bin/certificado.sh \
 && chmod +x /docker-entrypoint.d/40-config-runtime.sh /usr/local/bin/certificado.sh \
 && mkdir -p /var/www/certbot /etc/nginx/certs
COPY --from=build /app/dist /usr/share/nginx/html

# Variáveis lidas em tempo de execução (ver docker/40-config-runtime.sh)
#   DOMAIN               domínio público (usa o certificado Let's Encrypt dele, se existir)
#   ENABLE_HTTPS         serve HTTPS na 443 (autoassinado se não houver Let's Encrypt)
#   FORCE_HTTPS          redireciona HTTP -> HTTPS (produção)
#   CERT_RELOAD_INTERVAL recarrega o nginx periodicamente para pegar renovações (ex.: 6h)
#   SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY: definidas no docker compose (não ficam na imagem)
ENV DOMAIN="" \
    ENABLE_HTTPS="true" \
    FORCE_HTTPS="false" \
    CERT_RELOAD_INTERVAL=""

EXPOSE 80 443
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1/health || exit 1
