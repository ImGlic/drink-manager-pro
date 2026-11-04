import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesUpdate } from "@/integrations/supabase/types";
import { somenteDigitos } from "@/lib/format";

export type DadosBar = Omit<TablesUpdate<"bares">, "id" | "criado_por" | "created_at" | "updated_at" | "ativo">;
export type Perfil = Tables<"perfis">;
export type ConfigFiscal = Tables<"configuracoes_fiscais">;
export type Certificado = Tables<"certificados_digitais">;

export async function criarBar(dados: DadosBar & { nome: string }): Promise<string> {
  const { data, error } = await supabase.rpc("criar_bar", { _dados: dados as never });
  if (error) {
    if (error.code === "23505") throw new Error("Já existe um bar cadastrado com esse CNPJ.");
    throw error;
  }
  return data as string;
}

export async function atualizarBar(barId: string, dados: DadosBar) {
  const { error } = await supabase
    .from("bares")
    .update({
      ...dados,
      cnpj: dados.cnpj ? somenteDigitos(dados.cnpj) : null,
      cep: dados.cep ? somenteDigitos(dados.cep) : null,
      uf: dados.uf ? dados.uf.toUpperCase() : null,
    })
    .eq("id", barId);
  if (error) {
    if (error.code === "23505") throw new Error("Já existe um bar cadastrado com esse CNPJ.");
    throw error;
  }
}

export async function enviarLogo(barId: string, arquivo: File): Promise<string> {
  const ext = arquivo.name.split(".").pop()?.toLowerCase() || "png";
  const caminho = `${barId}/logo-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("logos").upload(caminho, arquivo, { upsert: true });
  if (error) throw error;
  return supabase.storage.from("logos").getPublicUrl(caminho).data.publicUrl;
}

/** Busca endereço pelo CEP (ViaCEP), incluindo o código IBGE exigido na NFC-e. */
export async function buscarCep(cep: string) {
  const digitos = somenteDigitos(cep);
  if (digitos.length !== 8) return null;
  const resp = await fetch(`https://viacep.com.br/ws/${digitos}/json/`);
  if (!resp.ok) return null;
  const json = await resp.json();
  if (json.erro) return null;
  return {
    logradouro: json.logradouro as string,
    bairro: json.bairro as string,
    municipio: json.localidade as string,
    uf: json.uf as string,
    codigo_municipio: json.ibge as string,
  };
}

// ----------------------------- Perfis -----------------------------------------
export async function listarPerfis(barId: string): Promise<Perfil[]> {
  const { data, error } = await supabase.from("perfis").select("*").eq("bar_id", barId).order("nome");
  if (error) throw error;
  return data ?? [];
}

export async function salvarPerfil(
  barId: string,
  perfil: { id?: string; nome: string; descricao?: string; permissoes: string[] }
) {
  const dados = { nome: perfil.nome.trim(), descricao: perfil.descricao ?? null, permissoes: perfil.permissoes };
  const { error } = perfil.id
    ? await supabase.from("perfis").update(dados).eq("id", perfil.id)
    : await supabase.from("perfis").insert({ ...dados, bar_id: barId });
  if (error) {
    if (error.code === "23505") throw new Error("Já existe um perfil com esse nome.");
    throw error;
  }
}

export async function excluirPerfil(id: string) {
  const { error } = await supabase.from("perfis").delete().eq("id", id);
  if (error) throw error;
}

// ----------------------------- Membros ----------------------------------------
export interface Membro {
  id: string;
  ativo: boolean;
  perfil_id: string | null;
  user_id: string;
  usuario: { id: string; nome: string; email: string | null; cpf: string | null } | null;
}

export async function listarMembros(barId: string): Promise<Membro[]> {
  const { data, error } = await supabase
    .from("bar_membros")
    .select("id, ativo, perfil_id, user_id, usuario:profiles(id, nome, email, cpf)")
    .eq("bar_id", barId);
  if (error) throw error;
  return ((data ?? []) as Membro[]).sort((a, b) => (a.usuario?.nome ?? "").localeCompare(b.usuario?.nome ?? ""));
}

export async function atualizarMembro(id: string, dados: { perfil_id?: string | null; ativo?: boolean }) {
  const { error } = await supabase.from("bar_membros").update(dados).eq("id", id);
  if (error) throw error;
}

export async function removerMembro(id: string) {
  const { error } = await supabase.from("bar_membros").delete().eq("id", id);
  if (error) throw error;
}

/** Chama uma Edge Function e devolve a mensagem de erro enviada por ela, se houver. */
export async function invocarFuncao<T>(nome: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(nome, { body });
  if (error) {
    const contexto = (error as { context?: Response }).context;
    if (contexto && typeof contexto.json === "function") {
      const json = await contexto.json().catch(() => null);
      if (json?.error) throw new Error(json.error);
    }
    throw new Error(
      error.message?.includes("Failed to send")
        ? `Função "${nome}" indisponível. Verifique se ela foi publicada no Supabase.`
        : error.message
    );
  }
  return data as T;
}

export async function criarUsuarioNoBar(dados: {
  barId: string;
  nome: string;
  email: string;
  senha?: string;
  cpf?: string;
  perfilId: string;
}) {
  return invocarFuncao<{ user_id: string; existente: boolean }>("gerenciar-usuarios", {
    acao: "criar",
    bar_id: dados.barId,
    nome: dados.nome,
    email: dados.email,
    senha: dados.senha,
    cpf: dados.cpf,
    perfil_id: dados.perfilId,
  });
}

export async function redefinirSenha(barId: string, userId: string, senha: string) {
  return invocarFuncao("gerenciar-usuarios", { acao: "redefinir_senha", bar_id: barId, user_id: userId, senha });
}

// ----------------------------- Fiscal -----------------------------------------
export async function carregarConfigFiscal(barId: string): Promise<ConfigFiscal | null> {
  const { data, error } = await supabase.from("configuracoes_fiscais").select("*").eq("bar_id", barId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function salvarConfigFiscal(barId: string, dados: Partial<ConfigFiscal>) {
  const { bar_id: _b, updated_at: _u, ...resto } = dados;
  const { error } = await supabase.from("configuracoes_fiscais").update(resto).eq("bar_id", barId);
  if (error) throw error;
}

export async function listarCertificados(barId: string): Promise<Certificado[]> {
  const { data, error } = await supabase
    .from("certificados_digitais")
    .select("*")
    .eq("bar_id", barId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

const lerBase64 = (arquivo: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(arquivo);
  });

export async function enviarCertificado(barId: string, arquivo: File, senha: string) {
  if (arquivo.size > 50 * 1024) throw new Error("Arquivo muito grande para um certificado A1 (.pfx/.p12).");
  const pfx = await lerBase64(arquivo);
  return invocarFuncao<Certificado>("certificado-a1", { acao: "enviar", bar_id: barId, pfx_base64: pfx, senha });
}

export async function removerCertificado(barId: string, certificadoId: string) {
  return invocarFuncao("certificado-a1", { acao: "remover", bar_id: barId, certificado_id: certificadoId });
}

export async function sincronizarEmpresaFiscal(barId: string) {
  return invocarFuncao<{ ok: boolean; mensagem: string }>("nfce", { acao: "sincronizar_empresa", bar_id: barId });
}

export async function emitirNfce(vendaId: string) {
  return invocarFuncao<Tables<"notas_fiscais">>("nfce", { acao: "emitir", venda_id: vendaId });
}

export async function cancelarNfce(notaId: string, justificativa: string) {
  return invocarFuncao<Tables<"notas_fiscais">>("nfce", { acao: "cancelar", nota_id: notaId, justificativa });
}
