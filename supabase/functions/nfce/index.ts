// NFC-e (modelo 65) via Nuvem Fiscal.
//   { acao: "sincronizar_empresa", bar_id }   -> cadastra/atualiza emitente, CSC e certificado no provedor
//   { acao: "emitir", venda_id }              -> emite (ou reenvia) a NFC-e da venda
//   { acao: "consultar", nota_id }            -> atualiza status de nota em processamento
//   { acao: "cancelar", nota_id, justificativa }
//
// Regras implementadas: Simples Nacional / MEI (CSOSN), consumidor final presencial,
// rateio de desconto por item, troco, CPF opcional e exigências do ambiente de homologação.
import { contexto, decifrar, exigirPermissao, HttpError, json, servir, somenteDigitos } from "../_shared/comum.ts";
import { erroNF, nf } from "../_shared/nuvemfiscal.ts";

const UF_IBGE: Record<string, number> = {
  RO: 11, AC: 12, AM: 13, RR: 14, PA: 15, AP: 16, TO: 17, MA: 21, PI: 22, CE: 23, RN: 24, PB: 25, PE: 26,
  AL: 27, SE: 28, BA: 29, MG: 31, ES: 32, RJ: 33, SP: 35, PR: 41, SC: 42, RS: 43, MS: 50, MT: 51, GO: 52, DF: 53,
};
const FUSO: Record<string, string> = { AC: "-05:00", AM: "-04:00", RO: "-04:00", RR: "-04:00", MT: "-04:00", MS: "-04:00" };

const TPAG: Record<string, string> = {
  dinheiro: "01",
  credito: "03",
  debito: "04",
  vale_alimentacao: "10",
  vale_refeicao: "11",
  pix: "17",
  outros: "99",
};

const HOMOLOGACAO_TXT = "NOTA FISCAL EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL";
const r2 = (v: number) => Math.round(v * 100) / 100;

function dataHoraLocal(uf: string) {
  const fuso = FUSO[uf] ?? "-03:00";
  const [sinal, hh, mm] = [fuso[0], Number(fuso.slice(1, 3)), Number(fuso.slice(4))];
  const offsetMs = (sinal === "-" ? -1 : 1) * (hh * 60 + mm) * 60_000;
  return new Date(Date.now() + offsetMs).toISOString().slice(0, 19) + fuso;
}

// deno-lint-ignore no-explicit-any
type Row = Record<string, any>;

async function carregarBarFiscal(ctx: Awaited<ReturnType<typeof contexto>>, barId: string) {
  const [{ data: bar }, { data: cfg }] = await Promise.all([
    ctx.admin.from("bares").select("*").eq("id", barId).single(),
    ctx.admin.from("configuracoes_fiscais").select("*").eq("bar_id", barId).single(),
  ]);
  if (!bar || !cfg) throw new HttpError(404, "Bar ou configuração fiscal não encontrados");
  return { bar: bar as Row, cfg: cfg as Row };
}

function validarEmitente(bar: Row, cfg: Row) {
  const faltando: string[] = [];
  if (somenteDigitos(bar.cnpj).length !== 14) faltando.push("CNPJ");
  if (!bar.razao_social) faltando.push("razão social");
  if (!bar.inscricao_estadual) faltando.push("inscrição estadual");
  if (!bar.logradouro || !bar.numero || !bar.bairro) faltando.push("endereço completo");
  if (somenteDigitos(bar.codigo_municipio).length !== 7) faltando.push("código IBGE do município");
  if (!UF_IBGE[bar.uf]) faltando.push("UF");
  if (somenteDigitos(bar.cep).length !== 8) faltando.push("CEP");
  if (!cfg.csc_id || !cfg.csc_token) faltando.push("CSC (ID e código)");
  if (faltando.length) {
    throw new HttpError(400, `Complete os dados fiscais do bar: ${faltando.join(", ")}.`);
  }
  if (![1, 2, 4].includes(Number(bar.regime_tributario))) {
    throw new HttpError(400, "Emissão para Regime Normal ainda não suportada (somente Simples Nacional/MEI).");
  }
}

const enderecoNF = (bar: Row) => ({
  logradouro: bar.logradouro,
  numero: bar.numero,
  complemento: bar.complemento || undefined,
  bairro: bar.bairro,
  codigo_municipio: somenteDigitos(bar.codigo_municipio),
  cidade: bar.municipio,
  uf: bar.uf,
  cep: somenteDigitos(bar.cep),
  codigo_pais: "1058",
  pais: "Brasil",
});

async function sincronizarEmpresa(ctx: Awaited<ReturnType<typeof contexto>>, barId: string) {
  const { bar, cfg } = await carregarBarFiscal(ctx, barId);
  validarEmitente(bar, cfg);
  const cnpj = somenteDigitos(bar.cnpj);

  const empresa = {
    cpf_cnpj: cnpj,
    inscricao_estadual: somenteDigitos(bar.inscricao_estadual),
    inscricao_municipal: bar.inscricao_municipal || undefined,
    nome_razao_social: bar.razao_social,
    nome_fantasia: bar.nome,
    fone: somenteDigitos(bar.telefone) || undefined,
    email: bar.email || "contato@exemplo.com",
    endereco: enderecoNF(bar),
  };

  const existe = await nf("GET", `/empresas/${cnpj}`);
  const r = existe.ok ? await nf("PUT", `/empresas/${cnpj}`, empresa) : await nf("POST", "/empresas", empresa);
  if (!r.ok) throw new HttpError(400, `Cadastro do emitente: ${erroNF(r)}`);

  const conf = await nf("PUT", `/empresas/${cnpj}/nfce`, {
    CRT: Number(bar.regime_tributario),
    ambiente: cfg.ambiente,
    sefaz: { id_csc: Number(cfg.csc_id), csc: cfg.csc_token },
  });
  if (!conf.ok) throw new HttpError(400, `Configuração NFC-e: ${erroNF(conf)}`);

  // certificado ativo
  const { data: cert } = await ctx.admin
    .from("certificados_digitais")
    .select("id, storage_path")
    .eq("bar_id", barId)
    .eq("ativo", true)
    .maybeSingle();
  if (!cert) return { ok: true, mensagem: "Emitente sincronizado. Cadastre o certificado A1 para emitir." };

  const [{ data: arquivo }, { data: seg }] = await Promise.all([
    ctx.admin.storage.from("certificados").download(cert.storage_path),
    ctx.admin.from("certificados_segredos").select("*").eq("certificado_id", cert.id).single(),
  ]);
  if (!arquivo || !seg) throw new HttpError(500, "Certificado armazenado não encontrado");

  const bytes = new Uint8Array(await arquivo.arrayBuffer());
  let bin = "";
  for (const byte of bytes) bin += String.fromCharCode(byte);
  const senha = await decifrar(seg.senha_cifrada, seg.iv);
  const c = await nf("PUT", `/empresas/${cnpj}/certificado`, { certificado: btoa(bin), password: senha });
  if (!c.ok) throw new HttpError(400, `Envio do certificado: ${erroNF(c)}`);
  await ctx.admin.from("certificados_digitais").update({ enviado_provedor: true }).eq("id", cert.id);

  return { ok: true, mensagem: "Emitente, CSC e certificado sincronizados com o provedor fiscal." };
}

function montarPayload(bar: Row, cfg: Row, venda: Row, itens: Row[], produtos: Map<string, Row>, pagamentos: Row[], serie: number, numero: number) {
  const homolog = cfg.ambiente === "homologacao";
  const subtotal = itens.reduce((s, i) => s + r2(Number(i.quantidade) * Number(i.preco_unitario)), 0);
  const desconto = Number(venda.desconto ?? 0);
  let descontoRestante = r2(desconto);

  const det = itens.map((item, idx) => {
    const prod = produtos.get(item.produto_id) ?? {};
    const qtd = Number(item.quantidade);
    const vUn = Number(item.preco_unitario);
    const vProd = r2(qtd * vUn);
    const ultimo = idx === itens.length - 1;
    const vDesc = desconto > 0 ? (ultimo ? descontoRestante : r2((vProd / subtotal) * desconto)) : 0;
    descontoRestante = r2(descontoRestante - vDesc);
    const gtin = /^\d{8}$|^\d{12,14}$/.test(prod.codigo_barras ?? "") ? prod.codigo_barras : "SEM GTIN";
    const unidade = (prod.unidade || "UN").toUpperCase();

    return {
      nItem: idx + 1,
      prod: {
        cProd: prod.codigo_interno || prod.codigo_barras || String(item.produto_id ?? idx + 1).slice(0, 60),
        cEAN: gtin,
        xProd: homolog && idx === 0 ? HOMOLOGACAO_TXT : String(item.nome_produto ?? prod.nome).slice(0, 120),
        NCM: somenteDigitos(prod.ncm),
        CEST: prod.cest ? somenteDigitos(prod.cest) : undefined,
        CFOP: prod.cfop || "5102",
        uCom: unidade,
        qCom: qtd,
        vUnCom: vUn,
        vProd,
        cEANTrib: gtin,
        uTrib: unidade,
        qTrib: qtd,
        vUnTrib: vUn,
        vDesc: vDesc > 0 ? vDesc : undefined,
        indTot: 1,
      },
      imposto: {
        ICMS:
          prod.csosn === "500"
            ? { ICMSSN500: { orig: Number(prod.origem ?? 0), CSOSN: "500" } }
            : { ICMSSN102: { orig: Number(prod.origem ?? 0), CSOSN: prod.csosn || "102" } },
        PIS: { PISOutr: { CST: "49", vBC: 0, pPIS: 0, vPIS: 0 } },
        COFINS: { COFINSOutr: { CST: "49", vBC: 0, pCOFINS: 0, vCOFINS: 0 } },
      },
    };
  });

  const vNF = r2(subtotal - desconto);
  const detPag = pagamentos.map((p) => {
    const tPag = TPAG[p.forma] ?? "99";
    return {
      indPag: 0,
      tPag,
      xPag: tPag === "99" ? "Outros" : undefined,
      vPag: Number(p.valor),
      card: tPag === "03" || tPag === "04" ? { tpIntegra: 2 } : undefined,
    };
  });

  const cpf = somenteDigitos(venda.cliente_cpf);

  return {
    ambiente: cfg.ambiente,
    referencia: venda.id,
    infNFe: {
      versao: "4.00",
      ide: {
        cUF: UF_IBGE[bar.uf],
        natOp: cfg.natureza_operacao || "VENDA",
        mod: 65,
        serie,
        nNF: numero,
        dhEmi: dataHoraLocal(bar.uf),
        tpNF: 1,
        idDest: 1,
        cMunFG: somenteDigitos(bar.codigo_municipio),
        tpImp: 4,
        tpEmis: 1,
        tpAmb: homolog ? 2 : 1,
        finNFe: 1,
        indFinal: 1,
        indPres: 1,
        procEmi: 0,
        verProc: "MeuBar 1.0",
      },
      emit: {
        CNPJ: somenteDigitos(bar.cnpj),
        xNome: homolog ? HOMOLOGACAO_TXT : bar.razao_social,
        xFant: bar.nome,
        enderEmit: {
          xLgr: bar.logradouro,
          nro: bar.numero,
          xCpl: bar.complemento || undefined,
          xBairro: bar.bairro,
          cMun: somenteDigitos(bar.codigo_municipio),
          xMun: bar.municipio,
          UF: bar.uf,
          CEP: somenteDigitos(bar.cep),
          cPais: "1058",
          xPais: "BRASIL",
          fone: somenteDigitos(bar.telefone) || undefined,
        },
        IE: somenteDigitos(bar.inscricao_estadual),
        CRT: Number(bar.regime_tributario),
      },
      dest: cpf.length === 11 ? { CPF: cpf, indIEDest: 9 } : undefined,
      det,
      total: {
        ICMSTot: {
          vBC: 0, vICMS: 0, vICMSDeson: 0, vFCP: 0, vBCST: 0, vST: 0, vFCPST: 0, vFCPSTRet: 0,
          vProd: r2(subtotal), vFrete: 0, vSeg: 0, vDesc: r2(desconto), vII: 0, vIPI: 0, vIPIDevol: 0,
          vPIS: 0, vCOFINS: 0, vOutro: 0, vNF,
        },
      },
      transp: { modFrete: 9 },
      pag: { detPag, vTroco: Number(venda.troco ?? 0) > 0 ? Number(venda.troco) : undefined },
      infAdic: cfg.informacoes_adicionais ? { infCpl: cfg.informacoes_adicionais } : undefined,
    },
  };
}

const extrair = (xml: string, tag: string) =>
  xml.match(new RegExp(`<${tag}>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</${tag}>`))?.[1]?.trim() ?? null;

// deno-lint-ignore no-explicit-any
async function atualizarComRespostaNF(ctx: Awaited<ReturnType<typeof contexto>>, notaId: string, d: any) {
  const status =
    d.status === "autorizado"
      ? "autorizada"
      : d.status === "cancelado"
      ? "cancelada"
      : d.status === "rejeitado" || d.status === "denegado"
      ? "rejeitada"
      : d.status === "erro"
      ? "erro"
      : "processando";

  const dados: Row = {
    status,
    provedor_id: d.id,
    chave: d.chave ?? null,
    protocolo: d.autorizacao?.numero_protocolo ?? null,
    mensagem: d.autorizacao?.motivo_status ?? d.status,
  };

  if (status === "autorizada" && d.id) {
    const x = await nf("GET", `/nfce/${d.id}/xml`, undefined, "*/*");
    if (x.ok) {
      dados.xml = x.texto;
      dados.qrcode_url = extrair(x.texto, "qrCode");
      dados.url_consulta = extrair(x.texto, "urlChave");
    }
  }

  const { data, error } = await ctx.admin.from("notas_fiscais").update(dados).eq("id", notaId).select().single();
  if (error) throw new HttpError(500, error.message);
  return data;
}

async function emitir(ctx: Awaited<ReturnType<typeof contexto>>, vendaId: string) {
  const { data: venda } = await ctx.admin.from("vendas").select("*").eq("id", vendaId).single();
  if (!venda) throw new HttpError(404, "Venda não encontrada");
  await exigirPermissao(ctx, venda.bar_id, "fiscal");
  if (venda.status !== "finalizada") throw new HttpError(400, "Só é possível emitir NFC-e de vendas finalizadas.");

  const { data: notas } = await ctx.admin
    .from("notas_fiscais")
    .select("*")
    .eq("venda_id", vendaId)
    .order("created_at", { ascending: false });
  const autorizada = notas?.find((n) => n.status === "autorizada");
  if (autorizada) return autorizada;

  const { bar, cfg } = await carregarBarFiscal(ctx, venda.bar_id);
  validarEmitente(bar, cfg);

  const [{ data: itens }, { data: pagamentos }] = await Promise.all([
    ctx.admin.from("itens_venda").select("*").eq("venda_id", vendaId),
    ctx.admin.from("venda_pagamentos").select("*").eq("venda_id", vendaId),
  ]);
  if (!itens?.length) throw new HttpError(400, "Venda sem itens");

  const ids = itens.map((i) => i.produto_id).filter(Boolean);
  const { data: prods } = await ctx.admin.from("produtos").select("*").in("id", ids);
  const produtos = new Map((prods ?? []).map((p) => [p.id, p]));

  const semNcm = itens.filter((i) => somenteDigitos(produtos.get(i.produto_id)?.ncm).length !== 8);
  if (semNcm.length) {
    throw new HttpError(400, `Produtos sem NCM válido (8 dígitos): ${semNcm.map((i) => i.nome_produto).join(", ")}.`);
  }

  // Reaproveita o número de uma tentativa anterior não autorizada (rejeição não consome numeração)
  let nota = notas?.find((n) => ["pendente", "rejeitada", "erro"].includes(n.status) && n.ambiente === cfg.ambiente);
  if (!nota) {
    const { data: reserva, error } = await ctx.admin.rpc("reservar_numero_nfce", { _bar_id: venda.bar_id });
    if (error || !reserva?.[0]) throw new HttpError(500, "Não foi possível reservar o número da NFC-e");
    const { data: nova, error: e2 } = await ctx.admin
      .from("notas_fiscais")
      .insert({
        bar_id: venda.bar_id,
        venda_id: vendaId,
        serie: reserva[0].serie,
        numero: reserva[0].numero,
        ambiente: reserva[0].ambiente,
        status: "pendente",
      })
      .select()
      .single();
    if (e2) throw new HttpError(500, e2.message);
    nota = nova;
  }

  const payload = montarPayload(bar, cfg, venda, itens, produtos, pagamentos ?? [], nota!.serie, Number(nota!.numero));
  const r = await nf("POST", "/nfce", payload);
  if (!r.ok) {
    const { data } = await ctx.admin
      .from("notas_fiscais")
      .update({ status: "erro", mensagem: erroNF(r) })
      .eq("id", nota!.id)
      .select()
      .single();
    return data;
  }
  return atualizarComRespostaNF(ctx, nota!.id, r.data);
}

servir(async (req) => {
  const ctx = await contexto(req);
  const body = await req.json();

  switch (body.acao) {
    case "sincronizar_empresa": {
      await exigirPermissao(ctx, String(body.bar_id ?? ""), "configuracoes");
      return json(await sincronizarEmpresa(ctx, body.bar_id));
    }
    case "emitir":
      return json(await emitir(ctx, String(body.venda_id ?? "")));

    case "consultar":
    case "cancelar": {
      const { data: nota } = await ctx.admin.from("notas_fiscais").select("*").eq("id", body.nota_id).single();
      if (!nota) throw new HttpError(404, "Nota não encontrada");

      if (body.acao === "consultar") {
        await exigirPermissao(ctx, nota.bar_id, "fiscal");
        if (!nota.provedor_id) return json(nota);
        const r = await nf("GET", `/nfce/${nota.provedor_id}`);
        if (!r.ok) throw new HttpError(400, erroNF(r));
        return json(await atualizarComRespostaNF(ctx, nota.id, r.data));
      }

      await exigirPermissao(ctx, nota.bar_id, "vendas_cancelar");
      const justificativa = String(body.justificativa ?? "").trim();
      if (justificativa.length < 15) throw new HttpError(400, "A justificativa deve ter pelo menos 15 caracteres.");
      if (nota.status !== "autorizada") throw new HttpError(400, "Somente notas autorizadas podem ser canceladas.");

      const r = await nf("POST", `/nfce/${nota.provedor_id}/cancelamento`, { justificativa: justificativa.slice(0, 255) });
      if (!r.ok) throw new HttpError(400, erroNF(r));
      if (r.data?.status !== "registrado") {
        throw new HttpError(400, `Cancelamento não homologado: ${r.data?.motivo_status ?? r.data?.status}`);
      }
      const { data } = await ctx.admin
        .from("notas_fiscais")
        .update({ status: "cancelada", mensagem: `Cancelada: ${justificativa}` })
        .eq("id", nota.id)
        .select()
        .single();
      return json(data);
    }
    default:
      throw new HttpError(400, "Ação inválida");
  }
});

