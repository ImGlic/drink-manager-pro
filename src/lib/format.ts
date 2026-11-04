export const formatBRL = (valor: number | null | undefined) =>
  (valor ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const somenteDigitos = (v: string | null | undefined) => (v ?? "").replace(/\D/g, "");

export const formatCNPJ = (v: string | null | undefined) => {
  const d = somenteDigitos(v).slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
};

export const formatCPF = (v: string | null | undefined) => {
  const d = somenteDigitos(v).slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
};

/** Extrai mensagem legível de erros do Supabase/PostgREST/Edge Functions. */
export const mensagemErro = (error: unknown, padrao = "Ocorreu um erro") => {
  if (!error) return padrao;
  if (typeof error === "string") return error;
  const e = error as { message?: string; context?: unknown };
  return e.message || padrao;
};
