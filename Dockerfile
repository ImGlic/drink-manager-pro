# ---------- build ----------
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

# ---------- runtime ----------
FROM nginx:1.27-alpine
RUN apk add --no-cache openssl
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY docker/app.inc /etc/nginx/conf.d/app.inc
COPY docker/40-config-runtime.sh /docker-entrypoint.d/40-config-runtime.sh
RUN sed -i 's/\r$//' /docker-entrypoint.d/40-config-runtime.sh && chmod +x /docker-entrypoint.d/40-config-runtime.sh
COPY --from=build /app/dist /usr/share/nginx/html

# Variáveis lidas em tempo de execução (ver docker/40-config-runtime.sh)
ENV SUPABASE_URL="" \
    SUPABASE_PUBLISHABLE_KEY="" \
    ENABLE_HTTPS="true"

EXPOSE 80 443
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1/health || exit 1
