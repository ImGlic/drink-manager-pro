import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

export type Categoria = Tables<"categorias">;
export type Produto = Tables<"produtos"> & { categoria: { id: string; nome: string } | null };

export type ProdutoForm = Omit<
  TablesInsert<"produtos">,
  "id" | "bar_id" | "criado_em" | "atualizado_em"
>;

export async function listarProdutos(barId: string): Promise<Produto[]> {
  const { data, error } = await supabase
    .from("produtos")
    .select("*, categoria:categorias(id, nome)")
    .eq("bar_id", barId)
    .order("nome");
  if (error) throw error;
  return (data ?? []) as Produto[];
}

export async function listarCategorias(barId: string): Promise<Categoria[]> {
  const { data, error } = await supabase.from("categorias").select("*").eq("bar_id", barId).order("nome");
  if (error) throw error;
  return data ?? [];
}

export async function criarCategoria(barId: string, nome: string): Promise<Categoria> {
  const { data, error } = await supabase
    .from("categorias")
    .insert({ bar_id: barId, nome: nome.trim() })
    .select()
    .single();
  if (error) {
    if (error.code === "23505") throw new Error("Já existe uma categoria com esse nome.");
    throw error;
  }
  return data;
}

const tratarErroProduto = (error: { code?: string; message: string }) => {
  if (error.code === "23505") return new Error("Já existe um produto com esse código de barras neste bar.");
  return new Error(error.message);
};

export async function criarProduto(barId: string, produto: ProdutoForm): Promise<Produto> {
  const { data, error } = await supabase
    .from("produtos")
    .insert({ ...produto, bar_id: barId, codigo_barras: produto.codigo_barras || null })
    .select("*, categoria:categorias(id, nome)")
    .single();
  if (error) throw tratarErroProduto(error);
  return data as Produto;
}

/** Atualiza cadastro. O estoque não é alterado aqui (use movimentarEstoque para manter o histórico). */
export async function atualizarProduto(id: string, produto: ProdutoForm): Promise<Produto> {
  const { estoque_atual: _ignorado, ...resto } = produto;
  const { data, error } = await supabase
    .from("produtos")
    .update({ ...resto, codigo_barras: produto.codigo_barras || null })
    .eq("id", id)
    .select("*, categoria:categorias(id, nome)")
    .single();
  if (error) throw tratarErroProduto(error);
  return data as Produto;
}

export async function excluirProduto(id: string) {
  const { error } = await supabase.from("produtos").delete().eq("id", id);
  if (error) throw error;
}

export type TipoMovimentacao = "entrada" | "perda" | "ajuste" | "saida";

export async function movimentarEstoque(produtoId: string, tipo: TipoMovimentacao, quantidade: number, observacao?: string) {
  const { data, error } = await supabase.rpc("movimentar_estoque", {
    _produto_id: produtoId,
    _tipo: tipo,
    _quantidade: quantidade,
    _observacao: observacao ?? null,
  });
  if (error) throw error;
  return Number(data);
}

/** Procura produto pelo código de barras, código interno ou id (QR Code gerado pelo sistema). */
export function buscarPorCodigo<T extends Pick<Produto, "id" | "codigo_barras" | "codigo_interno">>(
  produtos: T[],
  codigo: string
): T | undefined {
  const c = codigo.trim();
  if (!c) return undefined;
  const semZeros = c.replace(/^0+/, "");
  return produtos.find(
    (p) =>
      p.codigo_barras === c ||
      (p.codigo_barras && p.codigo_barras.replace(/^0+/, "") === semZeros) ||
      p.codigo_interno === c ||
      p.id === c ||
      `produto:${p.id}` === c
  );
}
