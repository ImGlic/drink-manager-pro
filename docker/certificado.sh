#!/bin/sh
# Aponta /etc/nginx/certs para o certificado em uso:
#  - Let's Encrypt (/etc/letsencrypt/live/$DOMAIN), quando existir;
#  - senão, um certificado autoassinado (testes locais / primeira subida).
# Retorna 0 se trocou de certificado (nginx precisa de reload).
set -e

CERT_DIR=/etc/nginx/certs
mkdir -p "$CERT_DIR"
LE_DIR="/etc/letsencrypt/live/${DOMAIN:-_sem_dominio_}"

if [ -n "$DOMAIN" ] && [ -f "$LE_DIR/fullchain.pem" ] && [ -f "$LE_DIR/privkey.pem" ]; then
  if [ "$(readlink "$CERT_DIR/cert.pem" 2>/dev/null)" != "$LE_DIR/fullchain.pem" ]; then
    ln -sf "$LE_DIR/fullchain.pem" "$CERT_DIR/cert.pem"
    ln -sf "$LE_DIR/privkey.pem" "$CERT_DIR/key.pem"
    echo "Usando certificado Let's Encrypt de $DOMAIN"
    exit 0
  fi
  exit 1
fi

if [ ! -e "$CERT_DIR/cert.pem" ] || [ ! -e "$CERT_DIR/key.pem" ]; then
  echo "Gerando certificado autoassinado..."
  openssl req -x509 -nodes -newkey rsa:2048 -days 825 \
    -keyout "$CERT_DIR/key.pem" -out "$CERT_DIR/cert.pem" \
    -subj "/CN=${DOMAIN:-meu-bar}" \
    -addext "subjectAltName=DNS:${DOMAIN:-localhost},DNS:localhost,IP:127.0.0.1${HOST_IP:+,IP:$HOST_IP}" >/dev/null 2>&1
  exit 0
fi
exit 1
