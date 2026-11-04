-- O Postgres concede EXECUTE a PUBLIC por padrão; revogar só de "anon" não basta.
-- Funções de negócio: apenas usuários logados. Funções internas: apenas service role.
do $$
declare f text;
begin
  foreach f in array array[
    'public.criar_bar(jsonb)',
    'public.finalizar_venda(uuid, jsonb, jsonb, numeric, text, text, text, text)',
    'public.cancelar_venda(uuid, text)',
    'public.movimentar_estoque(uuid, text, numeric, text)',
    'public.resumo_dashboard(uuid, timestamptz, timestamptz)',
    'public.tem_permissao(uuid, text)',
    'public.tem_permissao_pasta(text, text)',
    'public.is_membro_bar(uuid)',
    'public.compartilha_bar(uuid)'
  ] loop
    execute format('revoke execute on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated, service_role', f);
  end loop;

  foreach f in array array[
    'public.proximo_numero(uuid, text)',
    'public.criar_perfis_padrao(uuid)',
    'public.reservar_numero_nfce(uuid)'
  ] loop
    execute format('revoke execute on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end $$;
