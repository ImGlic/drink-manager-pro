// Gestão de usuários de um bar (exige service role para criar contas no Auth).
//   { acao: "criar", bar_id, nome, email, senha?, cpf?, perfil_id }
//   { acao: "redefinir_senha", bar_id, user_id, senha }
import { contexto, exigirPermissao, HttpError, json, servir, somenteDigitos } from "../_shared/comum.ts";

servir(async (req) => {
  const ctx = await contexto(req);
  const body = await req.json();
  const barId = String(body.bar_id ?? "");
  await exigirPermissao(ctx, barId, "usuarios");

  if (body.acao === "criar") {
    const email = String(body.email ?? "").trim().toLowerCase();
    const nome = String(body.nome ?? "").trim();
    if (!email || !email.includes("@")) throw new HttpError(400, "E-mail inválido");
    if (!nome) throw new HttpError(400, "Nome é obrigatório");

    const { data: perfil } = await ctx.admin
      .from("perfis")
      .select("id, is_admin")
      .eq("id", body.perfil_id)
      .eq("bar_id", barId)
      .maybeSingle();
    if (!perfil) throw new HttpError(400, "Perfil inválido para este bar");

    // Usuário já existe (ex.: trabalha em outro bar)? Apenas vincula.
    const { data: existente } = await ctx.admin
      .from("profiles")
      .select("id")
      .ilike("email", email)
      .maybeSingle();

    let userId = existente?.id as string | undefined;
    if (!userId) {
      const senha = String(body.senha ?? "");
      if (senha.length < 6) throw new HttpError(400, "A senha deve ter pelo menos 6 caracteres");
      const { data, error } = await ctx.admin.auth.admin.createUser({
        email,
        password: senha,
        email_confirm: true,
        user_metadata: { nome, cpf: somenteDigitos(body.cpf) || null },
      });
      if (error) throw new HttpError(400, error.message);
      userId = data.user.id;
    }

    const { error } = await ctx.admin
      .from("bar_membros")
      .upsert({ bar_id: barId, user_id: userId, perfil_id: perfil.id, ativo: true }, { onConflict: "bar_id,user_id" });
    if (error) throw new HttpError(400, error.message);

    return json({ user_id: userId, existente: !!existente });
  }

  if (body.acao === "redefinir_senha") {
    const userId = String(body.user_id ?? "");
    const senha = String(body.senha ?? "");
    if (senha.length < 6) throw new HttpError(400, "A senha deve ter pelo menos 6 caracteres");
    if (userId === ctx.userId) throw new HttpError(400, "Para trocar a sua própria senha use 'Esqueci minha senha'.");

    // Só pode redefinir quem é membro apenas de bares onde o solicitante gerencia usuários.
    const { data: vinculos } = await ctx.admin.from("bar_membros").select("bar_id").eq("user_id", userId);
    if (!vinculos?.some((v) => v.bar_id === barId)) throw new HttpError(404, "Usuário não pertence a este bar");
    for (const v of vinculos) await exigirPermissao(ctx, v.bar_id, "usuarios");

    const { error } = await ctx.admin.auth.admin.updateUserById(userId, { password: senha });
    if (error) throw new HttpError(400, error.message);
    return json({ ok: true });
  }

  throw new HttpError(400, "Ação inválida");
});
