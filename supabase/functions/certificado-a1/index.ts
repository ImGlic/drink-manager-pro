// Cadastro do certificado digital A1 (.pfx/.p12) do bar.
//   { acao: "enviar", bar_id, pfx_base64, senha }
//   { acao: "remover", bar_id, certificado_id }
//
// Segurança:
//  - O arquivo fica no bucket privado "certificados" (sem policies: só a service role lê).
//  - A senha é cifrada com AES-GCM (chave CERT_ENCRYPTION_KEY) em "certificados_segredos",
//    tabela sem policies de acesso para o app.
//  - O navegador nunca recebe o arquivo nem a senha de volta.
import { cifrar, contexto, exigirPermissao, HttpError, json, servir, somenteDigitos } from "../_shared/comum.ts";
import { nf, nuvemFiscalConfigurada } from "../_shared/nuvemfiscal.ts";
import { lerCertificado } from "../_shared/certificado.ts";

servir(async (req) => {
  const ctx = await contexto(req);
  const body = await req.json();
  const barId = String(body.bar_id ?? "");
  await exigirPermissao(ctx, barId, "configuracoes");

  if (body.acao === "enviar") {
    const pfx = String(body.pfx_base64 ?? "");
    const senha = String(body.senha ?? "");
    if (!pfx || !senha) throw new HttpError(400, "Envie o arquivo do certificado e a senha.");

    const info = lerCertificado(pfx, senha);
    if (new Date(info.valido_ate) < new Date()) {
      throw new HttpError(400, `Certificado vencido em ${new Date(info.valido_ate).toLocaleDateString("pt-BR")}.`);
    }

    const { data: bar } = await ctx.admin.from("bares").select("cnpj").eq("id", barId).single();
    const cnpjBar = somenteDigitos(bar?.cnpj);
    if (cnpjBar && info.cnpj && cnpjBar !== info.cnpj) {
      throw new HttpError(400, `Este certificado é do CNPJ ${info.cnpj}, diferente do CNPJ do bar (${cnpjBar}).`);
    }
    // mesmo CNPJ raiz (matriz/filial) seria aceito pela SEFAZ, mas exigimos o mesmo CNPJ por segurança

    const id = crypto.randomUUID();
    const caminho = `${barId}/${id}.pfx`;
    const bytes = Uint8Array.from(atob(pfx), (c) => c.charCodeAt(0));
    const up = await ctx.admin.storage
      .from("certificados")
      .upload(caminho, bytes, { contentType: "application/x-pkcs12", upsert: false });
    if (up.error) throw new HttpError(500, `Falha ao armazenar certificado: ${up.error.message}`);

    const { cifrado, iv } = await cifrar(senha);

    await ctx.admin.from("certificados_digitais").update({ ativo: false }).eq("bar_id", barId);
    const { data: registro, error } = await ctx.admin
      .from("certificados_digitais")
      .insert({ id, bar_id: barId, storage_path: caminho, ativo: true, created_by: ctx.userId, ...info })
      .select()
      .single();
    if (error) throw new HttpError(500, error.message);

    const seg = await ctx.admin.from("certificados_segredos").insert({ certificado_id: id, senha_cifrada: cifrado, iv });
    if (seg.error) throw new HttpError(500, seg.error.message);

    // Envia ao provedor fiscal, se a empresa já estiver cadastrada nele
    let enviado = false;
    if (nuvemFiscalConfigurada() && (cnpjBar || info.cnpj)) {
      const r = await nf("PUT", `/empresas/${cnpjBar || info.cnpj}/certificado`, { certificado: pfx, password: senha });
      enviado = r.ok;
      if (enviado) await ctx.admin.from("certificados_digitais").update({ enviado_provedor: true }).eq("id", id);
    }

    return json({ ...registro, enviado_provedor: enviado });
  }

  if (body.acao === "remover") {
    const { data: cert } = await ctx.admin
      .from("certificados_digitais")
      .select("id, storage_path")
      .eq("id", body.certificado_id)
      .eq("bar_id", barId)
      .maybeSingle();
    if (!cert) throw new HttpError(404, "Certificado não encontrado");
    await ctx.admin.storage.from("certificados").remove([cert.storage_path]);
    await ctx.admin.from("certificados_digitais").delete().eq("id", cert.id);
    return json({ ok: true });
  }

  throw new HttpError(400, "Ação inválida");
});
