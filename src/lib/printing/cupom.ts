import { formatCNPJ, formatCPF } from "@/lib/format";
import { EscPos } from "./escpos";

export type Bloco =
  | { tipo: "texto"; texto: string; align?: "left" | "center" | "right"; bold?: boolean; grande?: boolean; pequeno?: boolean }
  | { tipo: "colunas"; esquerda: string; direita: string; bold?: boolean }
  | { tipo: "separador" }
  | { tipo: "qrcode"; dados: string }
  | { tipo: "espaco" };

export interface CupomItem {
  codigo?: string | null;
  nome: string;
  quantidade: number;
  unidade?: string | null;
  preco_unitario: number;
  subtotal: number;
}

export interface CupomDados {
  bar: {
    nome: string;
    razao_social?: string | null;
    cnpj?: string | null;
    inscricao_estadual?: string | null;
    endereco?: string | null;
    telefone?: string | null;
  };
  venda: {
    numero?: number | null;
    data: Date;
    operador?: string | null;
    itens: CupomItem[];
    subtotal: number;
    desconto: number;
    total: number;
    troco: number;
    pagamentos: { forma: string; valor: number }[];
    cliente_cpf?: string | null;
    cliente_nome?: string | null;
    observacao?: string | null;
  };
  nfce?: {
    numero: number;
    serie: number;
    chave?: string | null;
    protocolo?: string | null;
    ambiente: string;
    qrcode_url?: string | null;
    url_consulta?: string | null;
    autorizada_em?: Date | null;
  } | null;
  rodape?: string | null;
}

export const NOMES_PAGAMENTO: Record<string, string> = {
  dinheiro: "Dinheiro",
  credito: "Cartão de Crédito",
  debito: "Cartão de Débito",
  pix: "PIX",
  vale_refeicao: "Vale Refeição",
  vale_alimentacao: "Vale Alimentação",
  outros: "Outros",
};

const dataHora = (d: Date) =>
  d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

const num = (v: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const qtd = (v: number) => (Number.isInteger(v) ? String(v) : v.toLocaleString("pt-BR", { maximumFractionDigits: 3 }));

/** Monta o layout do cupom (DANFE NFC-e ou cupom não fiscal) como blocos independentes da impressora. */
export function montarCupom(dados: CupomDados): Bloco[] {
  const { bar, venda, nfce } = dados;
  const b: Bloco[] = [];
  const homologacao = nfce?.ambiente === "homologacao";

  b.push({ tipo: "texto", texto: bar.razao_social || bar.nome, align: "center", bold: true });
  if (bar.razao_social && bar.razao_social !== bar.nome) b.push({ tipo: "texto", texto: bar.nome, align: "center" });
  if (bar.cnpj) {
    b.push({
      tipo: "texto",
      texto: `CNPJ: ${formatCNPJ(bar.cnpj)}${bar.inscricao_estadual ? `  IE: ${bar.inscricao_estadual}` : ""}`,
      align: "center",
      pequeno: true,
    });
  }
  if (bar.endereco) b.push({ tipo: "texto", texto: bar.endereco, align: "center", pequeno: true });
  if (bar.telefone) b.push({ tipo: "texto", texto: `Tel: ${bar.telefone}`, align: "center", pequeno: true });
  b.push({ tipo: "separador" });

  if (nfce) {
    b.push({ tipo: "texto", texto: "DANFE NFC-e - Documento Auxiliar", align: "center", bold: true, pequeno: true });
    b.push({ tipo: "texto", texto: "da Nota Fiscal de Consumidor Eletrônica", align: "center", pequeno: true });
  } else {
    b.push({ tipo: "texto", texto: "CUPOM NÃO FISCAL", align: "center", bold: true });
    b.push({ tipo: "texto", texto: "Não é documento fiscal", align: "center", pequeno: true });
  }
  if (homologacao) {
    b.push({ tipo: "texto", texto: "EMITIDA EM AMBIENTE DE HOMOLOGAÇÃO", align: "center", bold: true, pequeno: true });
    b.push({ tipo: "texto", texto: "SEM VALOR FISCAL", align: "center", bold: true, pequeno: true });
  }
  b.push({ tipo: "separador" });

  b.push({ tipo: "colunas", esquerda: "ITEM / DESCRIÇÃO", direita: "TOTAL", bold: true });
  venda.itens.forEach((item, i) => {
    const prefixo = `${String(i + 1).padStart(3, "0")} `;
    b.push({ tipo: "texto", texto: `${prefixo}${item.codigo ? `${item.codigo} ` : ""}${item.nome}`, pequeno: true });
    b.push({
      tipo: "colunas",
      esquerda: `    ${qtd(item.quantidade)} ${item.unidade || "UN"} x ${num(item.preco_unitario)}`,
      direita: num(item.subtotal),
    });
  });
  b.push({ tipo: "separador" });

  const qtdItens = venda.itens.reduce((s, i) => s + i.quantidade, 0);
  b.push({ tipo: "colunas", esquerda: "Qtde. total de itens", direita: qtd(qtdItens) });
  b.push({ tipo: "colunas", esquerda: "Valor total R$", direita: num(venda.subtotal) });
  if (venda.desconto > 0) b.push({ tipo: "colunas", esquerda: "Desconto R$", direita: `-${num(venda.desconto)}` });
  b.push({ tipo: "colunas", esquerda: "VALOR A PAGAR R$", direita: num(venda.total), bold: true });
  b.push({ tipo: "colunas", esquerda: "FORMA DE PAGAMENTO", direita: "VALOR PAGO R$", bold: true });
  venda.pagamentos.forEach((p) =>
    b.push({ tipo: "colunas", esquerda: NOMES_PAGAMENTO[p.forma] ?? p.forma, direita: num(p.valor) })
  );
  if (venda.troco > 0) b.push({ tipo: "colunas", esquerda: "Troco R$", direita: num(venda.troco) });
  b.push({ tipo: "separador" });

  if (nfce) {
    if (nfce.url_consulta) {
      b.push({ tipo: "texto", texto: "Consulte pela Chave de Acesso em", align: "center", pequeno: true });
      b.push({ tipo: "texto", texto: nfce.url_consulta, align: "center", pequeno: true });
    }
    if (nfce.chave) {
      b.push({ tipo: "texto", texto: nfce.chave.replace(/(\d{4})(?=\d)/g, "$1 "), align: "center", pequeno: true });
    }
    b.push({ tipo: "separador" });
    b.push({
      tipo: "texto",
      texto: venda.cliente_cpf ? `CONSUMIDOR CPF: ${formatCPF(venda.cliente_cpf)}` : "CONSUMIDOR NÃO IDENTIFICADO",
      align: "center",
      bold: true,
      pequeno: true,
    });
    b.push({ tipo: "separador" });
    b.push({
      tipo: "texto",
      texto: `NFC-e nº ${nfce.numero}  Série ${nfce.serie}  ${dataHora(venda.data)}`,
      align: "center",
      bold: true,
      pequeno: true,
    });
    if (nfce.protocolo) {
      b.push({ tipo: "texto", texto: `Protocolo de autorização: ${nfce.protocolo}`, align: "center", pequeno: true });
      if (nfce.autorizada_em) {
        b.push({
          tipo: "texto",
          texto: `Data de autorização: ${dataHora(nfce.autorizada_em)}`,
          align: "center",
          pequeno: true,
        });
      }
    }
    if (nfce.qrcode_url) {
      b.push({ tipo: "espaco" });
      b.push({ tipo: "qrcode", dados: nfce.qrcode_url });
    }
  } else {
    b.push({
      tipo: "texto",
      texto: `Venda nº ${venda.numero ?? "-"}  ${dataHora(venda.data)}`,
      align: "center",
      pequeno: true,
    });
    if (venda.cliente_nome || venda.cliente_cpf) {
      b.push({
        tipo: "texto",
        texto: `Cliente: ${venda.cliente_nome ?? ""} ${venda.cliente_cpf ? formatCPF(venda.cliente_cpf) : ""}`.trim(),
        align: "center",
        pequeno: true,
      });
    }
  }

  if (venda.operador) b.push({ tipo: "texto", texto: `Operador: ${venda.operador}`, align: "center", pequeno: true });
  if (venda.observacao) b.push({ tipo: "texto", texto: `Obs: ${venda.observacao}`, pequeno: true });
  if (dados.rodape) {
    b.push({ tipo: "espaco" });
    b.push({ tipo: "texto", texto: dados.rodape, align: "center", pequeno: true });
  }
  return b;
}

/** Quebra texto em linhas do tamanho da bobina. */
const quebrar = (texto: string, colunas: number) => {
  const linhas: string[] = [];
  for (const paragrafo of texto.split("\n")) {
    let atual = "";
    for (const palavra of paragrafo.split(" ")) {
      if (palavra.length > colunas) {
        if (atual) linhas.push(atual);
        for (let i = 0; i < palavra.length; i += colunas) linhas.push(palavra.slice(i, i + colunas));
        atual = "";
        continue;
      }
      const candidato = atual ? `${atual} ${palavra}` : palavra;
      if (candidato.length > colunas) {
        linhas.push(atual);
        atual = palavra;
      } else {
        atual = candidato;
      }
    }
    if (atual) linhas.push(atual);
  }
  return linhas;
};

const colunasLinha = (esq: string, dir: string, colunas: number) => {
  const espaco = colunas - dir.length - 1;
  const esquerda = esq.length > espaco ? esq.slice(0, espaco) : esq;
  return esquerda + " ".repeat(Math.max(1, colunas - esquerda.length - dir.length)) + dir;
};

export interface OpcoesEscPos {
  colunas: number;
  cortar?: boolean;
  abrirGaveta?: boolean;
}

/** Converte os blocos em bytes ESC/POS. */
export function cupomParaEscPos(blocos: Bloco[], { colunas, cortar = true, abrirGaveta = false }: OpcoesEscPos) {
  const p = new EscPos(colunas).init();
  for (const bloco of blocos) {
    switch (bloco.tipo) {
      case "texto": {
        p.align(bloco.align ?? "left").bold(!!bloco.bold);
        if (bloco.grande) p.size(2, 2);
        const cols = bloco.grande ? Math.floor(colunas / 2) : colunas;
        quebrar(bloco.texto, cols).forEach((l) => p.line(l));
        if (bloco.grande) p.size(1, 1);
        p.bold(false);
        break;
      }
      case "colunas":
        p.align("left").bold(!!bloco.bold).line(colunasLinha(bloco.esquerda, bloco.direita, colunas)).bold(false);
        break;
      case "separador":
        p.align("left").line("-".repeat(colunas));
        break;
      case "qrcode":
        p.align("center").qrcode(bloco.dados, colunas >= 48 ? 6 : 5).line();
        break;
      case "espaco":
        p.line();
        break;
    }
  }
  p.feed(4);
  if (cortar) p.cut();
  if (abrirGaveta) p.abrirGaveta();
  return p.encode();
}

const escapar = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Converte os blocos em HTML para impressão pelo navegador (driver da impressora no Windows/Android). */
export async function cupomParaHtml(blocos: Bloco[], larguraMm: 58 | 80) {
  const QRCode = (await import("qrcode")).default;
  const partes: string[] = [];
  for (const bloco of blocos) {
    switch (bloco.tipo) {
      case "texto":
        partes.push(
          `<div class="t ${bloco.align ?? "left"}${bloco.bold ? " b" : ""}${bloco.grande ? " g" : ""}${
            bloco.pequeno ? " p" : ""
          }">${escapar(bloco.texto)}</div>`
        );
        break;
      case "colunas":
        partes.push(
          `<div class="c${bloco.bold ? " b" : ""}"><span>${escapar(bloco.esquerda)}</span><span>${escapar(
            bloco.direita
          )}</span></div>`
        );
        break;
      case "separador":
        partes.push('<div class="s"></div>');
        break;
      case "qrcode": {
        const url = await QRCode.toDataURL(bloco.dados, { margin: 0, width: 220, errorCorrectionLevel: "M" });
        partes.push(`<div class="center"><img class="qr" src="${url}" alt="QR Code" /></div>`);
        break;
      }
      case "espaco":
        partes.push("<div>&nbsp;</div>");
        break;
    }
  }

  const conteudo = larguraMm === 80 ? 72 : 48;
  return `<!doctype html><html><head><meta charset="utf-8"><title>Cupom</title><style>
    @page { size: ${larguraMm}mm auto; margin: 0; }
    * { box-sizing: border-box; }
    body { margin: 0; padding: 2mm ${(larguraMm - conteudo) / 2}mm; width: ${larguraMm}mm;
           font-family: "Courier New", monospace; font-size: ${larguraMm === 80 ? 12 : 10}px; color: #000; }
    .t { white-space: pre-wrap; word-break: break-word; }
    .p { font-size: 0.9em; }
    .g { font-size: 1.6em; }
    .b { font-weight: bold; }
    .center { text-align: center; } .left { text-align: left; } .right { text-align: right; }
    .c { display: flex; justify-content: space-between; gap: 4px; }
    .c span:first-child { overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
    .c span:last-child { white-space: nowrap; }
    .s { border-top: 1px dashed #000; margin: 3px 0; }
    .qr { width: ${larguraMm === 80 ? 40 : 32}mm; height: auto; margin: 4px auto; }
  </style></head><body>${partes.join("")}</body></html>`;
}
