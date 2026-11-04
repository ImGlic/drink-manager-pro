import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

/**
 * Configuração em tempo de execução: no Docker, /config.js define window.__ENV__
 * a partir das variáveis do container (a mesma imagem serve teste e produção).
 * Em desenvolvimento (npm run dev) vale o .env do Vite.
 */
declare global {
  interface Window {
    __ENV__?: { SUPABASE_URL?: string; SUPABASE_PUBLISHABLE_KEY?: string };
  }
}

const SUPABASE_URL = window.__ENV__?.SUPABASE_URL || (import.meta.env.VITE_SUPABASE_URL as string);
const SUPABASE_PUBLISHABLE_KEY =
  window.__ENV__?.SUPABASE_PUBLISHABLE_KEY || (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string);

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  console.error("Supabase não configurado: defina SUPABASE_URL e SUPABASE_PUBLISHABLE_KEY.");
}

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
