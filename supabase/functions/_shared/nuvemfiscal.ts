// Cliente mínimo da API Nuvem Fiscal (https://dev.nuvemfiscal.com.br/docs/api).
// Credenciais nas secrets do Supabase:
//   NUVEMFISCAL_CLIENT_ID, NUVEMFISCAL_CLIENT_SECRET
//   NUVEMFISCAL_API_URL (padrão: sandbox https://api.sandbox.nuvemfiscal.com.br)
import { HttpError } from "./comum.ts";

let tokenCache: { token: string; expira: number } | null = null;

export const nuvemFiscalConfigurada = () =>
  !!Deno.env.get("NUVEMFISCAL_CLIENT_ID") && !!Deno.env.get("NUVEMFISCAL_CLIENT_SECRET");

async function token() {
  if (tokenCache && tokenCache.expira > Date.now() + 60_000) return tokenCache.token;
  const id = Deno.env.get("NUVEMFISCAL_CLIENT_ID");
  const secret = Deno.env.get("NUVEMFISCAL_CLIENT_SECRET");
  if (!id || !secret) {
    throw new HttpError(500, "Provedor fiscal não configurado: defina NUVEMFISCAL_CLIENT_ID e NUVEMFISCAL_CLIENT_SECRET.");
  }
  const resp = await fetch("https://auth.nuvemfiscal.com.br/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: id,
      client_secret: secret,
      scope: "empresa nfce cep",
    }),
  });
  if (!resp.ok) throw new HttpError(502, `Falha ao autenticar no provedor fiscal (${resp.status}).`);
  const data = await resp.json();
  tokenCache = { token: data.access_token, expira: Date.now() + data.expires_in * 1000 };
  return tokenCache.token;
}

const baseUrl = () => Deno.env.get("NUVEMFISCAL_API_URL") ?? "https://api.sandbox.nuvemfiscal.com.br";

export interface RespostaNF {
  ok: boolean;
  status: number;
  // deno-lint-ignore no-explicit-any
  data: any;
  texto: string;
}

export async function nf(metodo: string, caminho: string, corpo?: unknown, aceitar = "application/json"): Promise<RespostaNF> {
  const resp = await fetch(`${baseUrl()}${caminho}`, {
    method: metodo,
    headers: {
      Authorization: `Bearer ${await token()}`,
      "Content-Type": "application/json",
      Accept: aceitar,
    },
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  });
  const texto = await resp.text();
  let data = null;
  try {
    data = texto ? JSON.parse(texto) : null;
  } catch {
    data = null;
  }
  return { ok: resp.ok, status: resp.status, data, texto };
}

/** Mensagem de erro amigável a partir da resposta da Nuvem Fiscal. */
export function erroNF(r: RespostaNF) {
  const e = r.data?.error;
  const detalhes = Array.isArray(e?.errors) ? e.errors.map((x: { message?: string }) => x.message).join("; ") : "";
  return [e?.message ?? `Erro ${r.status} no provedor fiscal`, detalhes].filter(Boolean).join(": ");
}
