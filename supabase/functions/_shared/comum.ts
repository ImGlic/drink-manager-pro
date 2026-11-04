// Utilidades compartilhadas pelas Edge Functions (Deno).
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2.75.0";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

/** Envolve o handler com CORS e tratamento de erros padronizado ({ error: "mensagem" }). */
export function servir(handler: (req: Request) => Promise<Response>) {
  Deno.serve(async (req) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
    try {
      return await handler(req);
    } catch (e) {
      if (e instanceof HttpError) return json({ error: e.message }, e.status);
      console.error(e);
      return json({ error: e instanceof Error ? e.message : "Erro interno" }, 500);
    }
  });
}

export interface Contexto {
  admin: SupabaseClient;
  usuario: SupabaseClient;
  userId: string;
}

/** Cria os clientes (service role e do usuário) e valida o JWT de quem chamou. */
export async function contexto(req: Request): Promise<Contexto> {
  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) throw new HttpError(401, "Não autenticado");

  const usuario = createClient(url, anon, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
  const { data, error } = await usuario.auth.getUser();
  if (error || !data.user) throw new HttpError(401, "Sessão inválida. Faça login novamente.");

  const admin = createClient(url, service, { auth: { persistSession: false } });
  return { admin, usuario, userId: data.user.id };
}

/** Verifica permissão no bar usando a própria função do banco, como o usuário. */
export async function exigirPermissao(ctx: Contexto, barId: string, ...permissoes: string[]) {
  if (!barId) throw new HttpError(400, "bar_id é obrigatório");
  for (const p of permissoes) {
    const { data, error } = await ctx.usuario.rpc("tem_permissao", { _bar_id: barId, _permissao: p });
    if (error) throw new HttpError(500, error.message);
    if (data === true) return;
  }
  throw new HttpError(403, "Você não tem permissão para esta ação neste bar.");
}

// ------------------------- Criptografia (AES-GCM) ------------------------------
const b64 = {
  encode: (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)),
  decode: (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0)),
};
export { b64 };

async function chave() {
  const segredo = Deno.env.get("CERT_ENCRYPTION_KEY");
  if (!segredo || segredo.length < 32) {
    throw new HttpError(500, "CERT_ENCRYPTION_KEY não configurada (mínimo 32 caracteres) nas secrets do Supabase.");
  }
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(segredo));
  return crypto.subtle.importKey("raw", hash, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function cifrar(texto: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cifrado = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await chave(), new TextEncoder().encode(texto));
  return { cifrado: b64.encode(new Uint8Array(cifrado)), iv: b64.encode(iv) };
}

export async function decifrar(cifrado: string, iv: string) {
  const claro = await crypto.subtle.decrypt({ name: "AES-GCM", iv: b64.decode(iv) }, await chave(), b64.decode(cifrado));
  return new TextDecoder().decode(claro);
}

export const somenteDigitos = (v: unknown) => String(v ?? "").replace(/\D/g, "");
