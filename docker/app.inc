root /usr/share/nginx/html;
index index.html;

gzip on;
gzip_types text/plain text/css application/javascript application/json image/svg+xml;
gzip_min_length 1024;

# Atenção: não usar add_header dentro dos "location" (anularia estes headers).
add_header Cache-Control $cache_control always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "SAMEORIGIN" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
# câmera (leitura de código) e USB/Serial/Bluetooth (impressora) liberados para o próprio site
add_header Permissions-Policy "camera=(self), usb=(self), serial=(self), bluetooth=(self), microphone=()" always;

location = /health {
  access_log off;
  default_type text/plain;
  return 200 "ok\n";
}

location /assets/ {
  try_files $uri =404;
}

# SPA: rotas do React Router caem no index.html
location / {
  try_files $uri $uri/ /index.html;
}
