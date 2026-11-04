import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import type { CupomDados } from "@/lib/printing/cupom";
import type { Bar } from "@/context/AuthContext";

export type FormaPagamento =
  | "dinheiro"
  | "credito"
  | "debito"
  | "pix"
  | "vale_refeicao"
  | "vale_alimentacao"
  | "outros";

export interface ItemCarrinho {
  produto_id: string;
  nome: string;
  preco: number;
  quantidade: number;
  codigo_barras?: string | null;
  unidade?: string | null;
}

export interface FinalizarVendaParams {
  barId: string;
  itens: ItemCarrinho[];
  pagamentos: { forma: FormaPagamento; valor: number }[];
  desconto?: number;
  clienteNome?: string;
  clienteCpf?: string;
  origem?: "pdv" | "mobile";
  observacao?: string;
}

export interface VendaFinalizada {
  id: string;
  numero: number;
  subtotal: number;
  desconto: number;
  total: number;
  troco: number;
}

export type NotaFiscal = Tables<"notas_fiscais">;

export type VendaCompleta = Tables<"vendas"> & {
  itens: Tables<"itens_venda">[];
  pagamentos: Tables<"venda_pagamentos">[];
  operador: { nome: string } | null;
  notas: NotaFiscal[];
};

const SELECT_COMPLETA =
  "*, itens:itens_venda(*), pagamentos:venda_pagamentos(*), operador:profiles!vendas_usuario_id_fkey(nome), notas:notas_fiscais(*)";

export async function finalizarVenda(p: FinalizarVendaParams): Promise<VendaFinalizada> {
  const { data, error } = await supabase.rpc("finalizar_venda", {
    _bar_id: p.barId,
    _itens: p.itens.map((i) => ({ produto_id: i.produto_id, quantidade: i.quantidade })),
    _pagamentos: p.pagamentos,
    _desconto: p.desconto ?? 0,
    _cliente_nome: p.clienteNome ?? null,
    _cliente_cpf: p.clienteCpf ?? null,
    _origem: p.origem ?? "pdv",
    _observacao: p.observacao ?? null,
  });
  if (error) throw error;
  return data as unknown as VendaFinalizada;
}

export async function listarVendas(barId: string, inicio: Date, fim: Date): Promise<VendaCompleta[]> {
  const { data, error } = await supabase
    .from("vendas")
    .select(SELECT_COMPLETA)
    .eq("bar_id", barId)
    .gte("criado_em", inicio.toISOString())
    .lt("criado_em", fim.toISOString())
    .order("criado_em", { ascending: false })
    .limit(500);
  if (error) throw error;
  return (data ?? []) as unknown as VendaCompleta[];
}

export async function carregarVenda(id: string): Promise<VendaCompleta> {
  const { data, error } = await supabase.from("vendas").select(SELECT_COMPLETA).eq("id", id).single();
  if (error) throw error;
  return data as unknown as VendaCompleta;
}

export async function cancelarVenda(id: string, motivo: string) {
  const { error } = await supabase.rpc("cancelar_venda", { _venda_id: id, _motivo: motivo });
  if (error) throw error;
}

export const notaAutorizada = (venda: Pick<VendaCompleta, "notas">) =>
  venda.notas?.find((n) => n.status === "autorizada") ?? null;

export const enderecoBar = (bar: Bar) =>
  [
    [bar.logradouro, bar.numero].filter(Boolean).join(", "),
    bar.complemento,
    bar.bairro,
    [bar.municipio, bar.uf].filter(Boolean).join("/"),
  ]
    .filter(Boolean)
    .join(" - ");

/** Converte uma venda do banco nos dados do cupom (com DANFE NFC-e se houver nota autorizada). */
export function vendaParaCupom(
  venda: VendaCompleta,
  bar: Bar,
  produtos?: { id: string; codigo_barras: string | null; unidade: string | null }[]
): CupomDados {
  const nota = notaAutorizada(venda);
  return {
    bar: {
      nome: bar.nome,
      razao_social: bar.razao_social,
      cnpj: bar.cnpj,
      inscricao_estadual: bar.inscricao_estadual,
      endereco: enderecoBar(bar),
      telefone: bar.telefone,
    },
    venda: {
      numero: venda.numero,
      data: new Date(venda.criado_em ?? Date.now()),
      operador: venda.operador?.nome,
      itens: venda.itens.map((i) => {
        const prod = produtos?.find((p) => p.id === i.produto_id);
        return {
          nome: i.nome_produto ?? "Produto",
          quantidade: Number(i.quantidade),
          preco_unitario: Number(i.preco_unitario),
          subtotal: Number(i.subtotal ?? Number(i.quantidade) * Number(i.preco_unitario)),
          codigo: prod?.codigo_barras,
          unidade: prod?.unidade,
        };
      }),
      subtotal: Number(venda.subtotal),
      desconto: Number(venda.desconto),
      total: Number(venda.total),
      troco: Number(venda.troco),
      pagamentos: venda.pagamentos.map((p) => ({ forma: p.forma, valor: Number(p.valor) })),
      cliente_cpf: venda.cliente_cpf,
      cliente_nome: venda.cliente_nome,
      observacao: venda.observacao,
    },
    nfce: nota
      ? {
          numero: Number(nota.numero),
          serie: nota.serie,
          chave: nota.chave,
          protocolo: nota.protocolo,
          ambiente: nota.ambiente,
          qrcode_url: nota.qrcode_url,
          url_consulta: nota.url_consulta,
          autorizada_em: nota.updated_at ? new Date(nota.updated_at) : null,
        }
      : null,
  };
}

export interface ResumoDashboard {
  faturamento: number;
  quantidade: number;
  ticket_medio: number;
  descontos: number;
  custo: number;
  troco: number;
  por_forma: Record<string, number>;
  top_produtos: { nome: string; quantidade: number; total: number }[];
  por_hora: { hora: number; total: number; quantidade: number }[];
}

export async function resumoDashboard(barId: string, inicio: Date, fim: Date): Promise<ResumoDashboard> {
  const { data, error } = await supabase.rpc("resumo_dashboard", {
    _bar_id: barId,
    _inicio: inicio.toISOString(),
    _fim: fim.toISOString(),
  });
  if (error) throw error;
  return data as unknown as ResumoDashboard;
}
