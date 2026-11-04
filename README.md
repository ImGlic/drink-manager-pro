# Meu Bar — PDV web para bares

Sistema 100% web (computador, tablet e celular pelo navegador), multi-bar:
cada bar tem seus perfis, usuários, produtos, vendas e configuração fiscal isolados por RLS.

## Rodar localmente

```sh
npm install
npm run dev          # http://localhost:8080
npm run dev:https    # https na rede local — necessário para usar a câmera do celular
```

## Testar com Docker

```sh
docker compose up -d --build     # usa VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY do .env
```

- Computador: http://localhost:3080 ou https://localhost:3443
- Celular na mesma rede: `https://<IP-do-PC>:3443` (aceite o aviso do certificado de teste).
  Para o certificado incluir o IP: `HOST_IP=192.168.x.x docker compose up -d`
- Portas: `HTTP_PORT` / `HTTPS_PORT`. Parar: `docker compose down`.

A imagem é a mesma para teste e produção: URL e chave do Supabase são lidas do ambiente do
container ao iniciar (`/config.js`), não ficam fixas no build.

## Pipeline (GitHub Actions)

- **CI** (`.github/workflows/ci.yml`, em PRs e branches): lint, tipos, build, `deno check` das
  Edge Functions, migrations aplicadas num Postgres descartável e build da imagem.
- **Deploy** (`.github/workflows/deploy.yml`, push na `main`): CI → imagem no GHCR →
  migrations + Edge Functions no Supabase → servidor via SSH com `docker compose`
  (`deploy/docker-compose.prod.yml`) e Caddy com HTTPS automático.

O servidor precisa apenas de Docker, portas 80/443 liberadas e um domínio apontando para ele.
As variáveis e secrets necessárias estão listadas no topo do `deploy.yml`; os jobs de Supabase e
servidor só rodam quando `DEPLOY_SUPABASE` / `DEPLOY_SERVER` = `true`.

## Implantação no Supabase

1. **Banco**: `npx supabase link --project-ref <ref>` e `npx supabase db push`
   (ou cole as migrations de `supabase/migrations` no SQL Editor, na ordem).
2. **Secrets das funções**:
   ```sh
   npx supabase secrets set CERT_ENCRYPTION_KEY="<texto aleatório com 32+ caracteres>"
   npx supabase secrets set NUVEMFISCAL_CLIENT_ID="..." NUVEMFISCAL_CLIENT_SECRET="..."
   # produção fiscal: NUVEMFISCAL_API_URL="https://api.nuvemfiscal.com.br" (padrão: sandbox)
   ```
   Guarde a `CERT_ENCRYPTION_KEY`: se ela mudar, os certificados precisam ser reenviados.
3. **Funções**: `npx supabase functions deploy gerenciar-usuarios certificado-a1 nfce`
4. **Frontend**: publique o `dist/` (Vercel, Netlify, Cloudflare Pages) com HTTPS — a câmera exige HTTPS.

## Módulos

| Área | Onde |
| --- | --- |
| Bares, perfis, membros, RLS, RPCs de venda/estoque | `supabase/migrations/20261103120000_multi_bar_pdv_fiscal.sql` |
| Usuários do bar (cria login) | `supabase/functions/gerenciar-usuarios` |
| Certificado A1 (.pfx) cifrado | `supabase/functions/certificado-a1` |
| NFC-e via Nuvem Fiscal | `supabase/functions/nfce` |
| Leitor BIP / coletor (teclado) | `src/hooks/useBarcodeScanner.ts` |
| Câmera (QR e código de barras) | `src/components/scanner/CameraScanner.tsx` |
| Impressão térmica ESC/POS e 58/80mm | `src/lib/printing/` |

## Fluxo fiscal

Comece em **homologação**: cadastre CNPJ, IE, endereço com código IBGE, certificado A1 e CSC em
Ajustes > Fiscal, clique em "Sincronizar com provedor" e emita vendas de teste. Só depois mude para produção.
