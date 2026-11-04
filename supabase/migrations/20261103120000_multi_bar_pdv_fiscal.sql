-- =====================================================================
-- MULTI-BAR (multi-tenant) + PDV + ESTOQUE + FISCAL (NFC-e)
--
-- Idempotente: funciona em banco novo E no banco atual, onde as tabelas
-- categorias / produtos / vendas / itens_venda já existem sem migration.
-- Dados antigos (sem bar) são migrados para um bar criado automaticamente.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. PROFILES: e-mail (necessário para gestão de usuários por bar)
-- ---------------------------------------------------------------------
alter table public.profiles add column if not exists email text;

update public.profiles p
   set email = u.email
  from auth.users u
 where u.id = p.id and p.email is null;

create index if not exists profiles_email_idx on public.profiles (lower(email));

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nome, cpf, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', 'Usuário'),
    new.raw_user_meta_data->>'cpf',
    new.email
  )
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- 1. BARES, PERFIS E MEMBROS
-- ---------------------------------------------------------------------
create table if not exists public.bares (
  id uuid primary key default gen_random_uuid(),
  nome text not null,                       -- nome fantasia
  razao_social text,
  cnpj text,
  inscricao_estadual text,
  inscricao_municipal text,
  -- CRT: 1 = Simples Nacional, 2 = Simples (excesso sublimite), 3 = Regime Normal, 4 = MEI
  regime_tributario smallint not null default 1 check (regime_tributario in (1, 2, 3, 4)),
  telefone text,
  email text,
  cep text,
  logradouro text,
  numero text,
  complemento text,
  bairro text,
  municipio text,
  codigo_municipio text,                    -- código IBGE (7 dígitos), exigido na NFC-e
  uf char(2),
  logo_url text,
  cor_primaria text default '#8B4513',
  permitir_estoque_negativo boolean not null default false,
  ativo boolean not null default true,
  criado_por uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists bares_cnpj_unique
  on public.bares (cnpj) where cnpj is not null and cnpj <> '';

create table if not exists public.perfis (
  id uuid primary key default gen_random_uuid(),
  bar_id uuid not null references public.bares (id) on delete cascade,
  nome text not null,
  descricao text,
  permissoes text[] not null default '{}',
  is_admin boolean not null default false,  -- administrador do bar: todas as permissões
  created_at timestamptz not null default now(),
  unique (bar_id, nome)
);

create table if not exists public.bar_membros (
  id uuid primary key default gen_random_uuid(),
  bar_id uuid not null references public.bares (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  perfil_id uuid references public.perfis (id) on delete set null,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  unique (bar_id, user_id)
);

create index if not exists bar_membros_user_idx on public.bar_membros (user_id);

create table if not exists public.bar_sequencias (
  bar_id uuid not null references public.bares (id) on delete cascade,
  nome text not null,
  valor bigint not null default 0,
  primary key (bar_id, nome)
);

-- Catálogo de permissões (exibido na tela de perfis)
insert into public.permissoes (nome, descricao) values
  ('dashboard', 'Ver o dashboard'),
  ('vendas', 'Registrar vendas no PDV'),
  ('vendas_cancelar', 'Cancelar vendas'),
  ('estoque', 'Gerenciar produtos e estoque'),
  ('relatorios', 'Ver histórico e relatórios'),
  ('fiscal', 'Emitir NFC-e e gerenciar certificado digital'),
  ('configuracoes', 'Configurar dados do bar e impressora'),
  ('usuarios', 'Gerenciar usuários do bar'),
  ('perfis', 'Gerenciar perfis de acesso')
on conflict (nome) do update set descricao = excluded.descricao;

-- ---------------------------------------------------------------------
-- 2. FUNÇÕES DE SEGURANÇA
-- ---------------------------------------------------------------------
create or replace function public.is_membro_bar(_bar_id uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.bar_membros
     where bar_id = _bar_id and user_id = auth.uid() and ativo
  );
$$;

create or replace function public.tem_permissao(_bar_id uuid, _permissao text)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.bar_membros m
      join public.perfis p on p.id = m.perfil_id
     where m.bar_id = _bar_id
       and m.user_id = auth.uid()
       and m.ativo
       and (p.is_admin or _permissao = any (p.permissoes))
  );
$$;

create or replace function public.tem_permissao_pasta(_pasta text, _permissao text)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.bar_membros m
      join public.perfis p on p.id = m.perfil_id
     where m.bar_id::text = _pasta
       and m.user_id = auth.uid()
       and m.ativo
       and (p.is_admin or _permissao = any (p.permissoes))
  );
$$;

create or replace function public.compartilha_bar(_user_id uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.bar_membros a
      join public.bar_membros b on b.bar_id = a.bar_id
     where a.user_id = auth.uid() and a.ativo
       and b.user_id = _user_id
  );
$$;

create or replace function public.proximo_numero(_bar_id uuid, _nome text)
returns bigint
language sql volatile security definer
set search_path = public
as $$
  insert into public.bar_sequencias (bar_id, nome, valor)
  values (_bar_id, _nome, 1)
  on conflict (bar_id, nome) do update set valor = public.bar_sequencias.valor + 1
  returning valor;
$$;

create or replace function public.criar_perfis_padrao(_bar_id uuid)
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  _admin uuid;
begin
  insert into public.perfis (bar_id, nome, descricao, permissoes, is_admin)
  values (_bar_id, 'Administrador', 'Acesso total ao bar', '{}', true)
  on conflict (bar_id, nome) do update set is_admin = true
  returning id into _admin;

  insert into public.perfis (bar_id, nome, descricao, permissoes) values
    (_bar_id, 'Gerente', 'Vendas, estoque, relatórios e fiscal',
      array['dashboard','vendas','vendas_cancelar','estoque','relatorios','fiscal']),
    (_bar_id, 'Caixa', 'Registra vendas e emite NFC-e',
      array['vendas','fiscal']),
    (_bar_id, 'Garçom', 'Registra vendas pelo celular',
      array['vendas'])
  on conflict (bar_id, nome) do nothing;

  return _admin;
end;
$$;

-- ---------------------------------------------------------------------
-- 3. CATEGORIAS / PRODUTOS
-- ---------------------------------------------------------------------
create table if not exists public.categorias (
  id uuid primary key default gen_random_uuid(),
  nome text not null
);
alter table public.categorias add column if not exists bar_id uuid references public.bares (id) on delete cascade;
alter table public.categorias add column if not exists created_at timestamptz default now();

-- nome de categoria deixa de ser único globalmente: passa a ser único por bar
do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
     where conrelid = 'public.categorias'::regclass and contype = 'u'
  loop
    execute format('alter table public.categorias drop constraint %I', c.conname);
  end loop;
end $$;

create table if not exists public.produtos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  categoria_id uuid references public.categorias (id) on delete set null,
  preco_custo numeric(12, 2) default 0,
  preco_venda numeric(12, 2) default 0,
  estoque_atual integer default 0,
  estoque_minimo integer default 0,
  criado_em timestamptz default now(),
  atualizado_em timestamptz default now()
);
alter table public.produtos add column if not exists bar_id uuid references public.bares (id) on delete cascade;
alter table public.produtos add column if not exists codigo_barras text;   -- EAN/GTIN ou código próprio
alter table public.produtos add column if not exists codigo_interno text;
alter table public.produtos add column if not exists unidade text not null default 'UN';
alter table public.produtos add column if not exists ncm text;             -- obrigatório na NFC-e (8 dígitos)
alter table public.produtos add column if not exists cest text;
alter table public.produtos add column if not exists cfop text not null default '5102';
alter table public.produtos add column if not exists csosn text not null default '102';
alter table public.produtos add column if not exists origem smallint not null default 0;
alter table public.produtos add column if not exists ativo boolean not null default true;
alter table public.produtos add column if not exists imagem_url text;

create or replace function public.set_atualizado_em()
returns trigger language plpgsql set search_path = public as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

drop trigger if exists produtos_atualizado_em on public.produtos;
create trigger produtos_atualizado_em before update on public.produtos
  for each row execute function public.set_atualizado_em();

-- ---------------------------------------------------------------------
-- 4. VENDAS / ITENS / PAGAMENTOS / MOVIMENTAÇÕES DE ESTOQUE
-- ---------------------------------------------------------------------
create table if not exists public.vendas (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid references public.profiles (id) on delete set null,
  total numeric(12, 2) default 0,
  criado_em timestamptz default now()
);
alter table public.vendas add column if not exists bar_id uuid references public.bares (id) on delete cascade;
alter table public.vendas add column if not exists numero bigint;
alter table public.vendas add column if not exists status text not null default 'finalizada';
alter table public.vendas add column if not exists subtotal numeric(12, 2) not null default 0;
alter table public.vendas add column if not exists desconto numeric(12, 2) not null default 0;
alter table public.vendas add column if not exists troco numeric(12, 2) not null default 0;
alter table public.vendas add column if not exists cliente_nome text;
alter table public.vendas add column if not exists cliente_cpf text;
alter table public.vendas add column if not exists observacao text;
alter table public.vendas add column if not exists origem text not null default 'pdv';
alter table public.vendas add column if not exists cancelada_em timestamptz;
alter table public.vendas add column if not exists cancelada_por uuid references public.profiles (id) on delete set null;
alter table public.vendas add column if not exists motivo_cancelamento text;

alter table public.vendas drop constraint if exists vendas_status_check;
alter table public.vendas add constraint vendas_status_check
  check (status in ('aberta', 'finalizada', 'cancelada'));

create index if not exists vendas_bar_data_idx on public.vendas (bar_id, criado_em desc);

create table if not exists public.itens_venda (
  id uuid primary key default gen_random_uuid(),
  venda_id uuid references public.vendas (id) on delete cascade,
  produto_id uuid references public.produtos (id) on delete set null,
  quantidade numeric(12, 3) not null,
  preco_unitario numeric(12, 2) not null,
  subtotal numeric(12, 2)
);
alter table public.itens_venda add column if not exists bar_id uuid references public.bares (id) on delete cascade;
alter table public.itens_venda add column if not exists nome_produto text;
alter table public.itens_venda add column if not exists custo_unitario numeric(12, 2) not null default 0;

-- Subtotal calculado automaticamente (apenas se a coluna não for "generated")
do $$
begin
  if exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'itens_venda'
       and column_name = 'subtotal' and is_generated = 'NEVER'
  ) then
    create or replace function public.itens_venda_subtotal()
    returns trigger language plpgsql set search_path = public as $f$
    begin
      new.subtotal = round(new.quantidade * new.preco_unitario, 2);
      return new;
    end;
    $f$;

    drop trigger if exists itens_venda_subtotal on public.itens_venda;
    create trigger itens_venda_subtotal before insert or update on public.itens_venda
      for each row execute function public.itens_venda_subtotal();
  end if;
end $$;

create table if not exists public.venda_pagamentos (
  id uuid primary key default gen_random_uuid(),
  venda_id uuid not null references public.vendas (id) on delete cascade,
  bar_id uuid not null references public.bares (id) on delete cascade,
  forma text not null check (forma in ('dinheiro', 'credito', 'debito', 'pix', 'vale_refeicao', 'vale_alimentacao', 'outros')),
  valor numeric(12, 2) not null check (valor > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.estoque_movimentacoes (
  id uuid primary key default gen_random_uuid(),
  bar_id uuid not null references public.bares (id) on delete cascade,
  produto_id uuid not null references public.produtos (id) on delete cascade,
  tipo text not null check (tipo in ('entrada', 'saida', 'ajuste', 'perda', 'venda', 'cancelamento')),
  quantidade numeric(12, 3) not null,       -- positivo = entrou, negativo = saiu
  venda_id uuid references public.vendas (id) on delete set null,
  usuario_id uuid references public.profiles (id) on delete set null,
  observacao text,
  created_at timestamptz not null default now()
);

create index if not exists estoque_mov_produto_idx on public.estoque_movimentacoes (produto_id, created_at desc);

-- ---------------------------------------------------------------------
-- 5. FISCAL: configuração, certificado A1 e notas
-- ---------------------------------------------------------------------
create table if not exists public.configuracoes_fiscais (
  bar_id uuid primary key references public.bares (id) on delete cascade,
  provedor text not null default 'nuvemfiscal',
  ambiente text not null default 'homologacao' check (ambiente in ('homologacao', 'producao')),
  serie_nfce integer not null default 1,
  proximo_numero_nfce bigint not null default 1,
  csc_id text,                              -- ID do CSC (token) fornecido pela SEFAZ
  csc_token text,                           -- código CSC fornecido pela SEFAZ
  emitir_automaticamente boolean not null default false,
  natureza_operacao text not null default 'VENDA',
  informacoes_adicionais text,
  updated_at timestamptz not null default now()
);

create table if not exists public.certificados_digitais (
  id uuid primary key default gen_random_uuid(),
  bar_id uuid not null references public.bares (id) on delete cascade,
  titular text,
  cnpj text,
  emissor text,
  numero_serie text,
  valido_de timestamptz,
  valido_ate timestamptz,
  storage_path text not null,
  ativo boolean not null default true,
  enviado_provedor boolean not null default false,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

-- Segredo do certificado: SEM policies => só a service role (Edge Functions) acessa.
create table if not exists public.certificados_segredos (
  certificado_id uuid primary key references public.certificados_digitais (id) on delete cascade,
  senha_cifrada text not null,
  iv text not null
);

create table if not exists public.notas_fiscais (
  id uuid primary key default gen_random_uuid(),
  bar_id uuid not null references public.bares (id) on delete cascade,
  venda_id uuid references public.vendas (id) on delete set null,
  modelo smallint not null default 65,
  serie integer not null,
  numero bigint not null,
  ambiente text not null,
  status text not null default 'pendente'
    check (status in ('pendente', 'processando', 'autorizada', 'rejeitada', 'cancelada', 'erro')),
  chave text,
  protocolo text,
  mensagem text,
  provedor_id text,
  qrcode_url text,
  url_consulta text,
  xml text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (bar_id, modelo, serie, numero, ambiente)
);

create index if not exists notas_fiscais_venda_idx on public.notas_fiscais (venda_id);

create or replace function public.reservar_numero_nfce(_bar_id uuid)
returns table (serie integer, numero bigint, ambiente text)
language sql volatile security definer
set search_path = public
as $$
  update public.configuracoes_fiscais c
     set proximo_numero_nfce = c.proximo_numero_nfce + 1
   where c.bar_id = _bar_id
  returning c.serie_nfce, c.proximo_numero_nfce - 1, c.ambiente;
$$;

-- Buckets de storage
insert into storage.buckets (id, name, public)
values ('certificados', 'certificados', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('logos', 'logos', true)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- 6. MIGRAÇÃO DE DADOS EXISTENTES (sem bar) -> bar padrão
-- ---------------------------------------------------------------------
do $$
declare
  _bar uuid;
  _admin_perfil uuid;
  _cfg record;
begin
  if exists (select 1 from public.produtos where bar_id is null)
     or exists (select 1 from public.categorias where bar_id is null)
     or exists (select 1 from public.vendas where bar_id is null) then

    select * into _cfg from public.loja_config limit 1;

    insert into public.bares (nome, cnpj, telefone, email, logo_url, cor_primaria)
    values (
      coalesce(_cfg.nome, 'Meu Bar'),
      nullif(_cfg.cnpj, ''),
      _cfg.telefone,
      _cfg.email,
      _cfg.logo_url,
      coalesce(_cfg.cor_primaria, '#8B4513')
    )
    returning id into _bar;

    _admin_perfil := public.criar_perfis_padrao(_bar);
    insert into public.configuracoes_fiscais (bar_id) values (_bar) on conflict do nothing;

    update public.categorias set bar_id = _bar where bar_id is null;
    update public.produtos set bar_id = _bar where bar_id is null;
    update public.vendas set bar_id = _bar where bar_id is null;

    -- quem era admin global vira administrador do bar migrado
    insert into public.bar_membros (bar_id, user_id, perfil_id)
    select distinct _bar, ur.user_id, _admin_perfil
      from public.user_roles ur
     where ur.role = 'admin'
    on conflict (bar_id, user_id) do nothing;

    -- demais usuários existentes entram com perfil Caixa
    insert into public.bar_membros (bar_id, user_id, perfil_id)
    select _bar, p.id, (select id from public.perfis where bar_id = _bar and nome = 'Caixa')
      from public.profiles p
    on conflict (bar_id, user_id) do nothing;
  end if;
end $$;

update public.itens_venda iv
   set bar_id = v.bar_id
  from public.vendas v
 where v.id = iv.venda_id and iv.bar_id is null;


-- numeração das vendas antigas
with numeradas as (
  select id, row_number() over (partition by bar_id order by criado_em, id) as n
    from public.vendas
   where numero is null
)
update public.vendas v set numero = n.n from numeradas n where n.id = v.id;

insert into public.bar_sequencias (bar_id, nome, valor)
select bar_id, 'venda', max(numero) from public.vendas group by bar_id
on conflict (bar_id, nome) do update set valor = greatest(public.bar_sequencias.valor, excluded.valor);

update public.vendas set subtotal = coalesce(total, 0) where subtotal = 0 and coalesce(total, 0) > 0;

alter table public.categorias alter column bar_id set not null;
alter table public.produtos alter column bar_id set not null;
alter table public.vendas alter column bar_id set not null;

create unique index if not exists categorias_bar_nome_unique on public.categorias (bar_id, lower(nome));
create unique index if not exists produtos_bar_codigo_barras_unique
  on public.produtos (bar_id, codigo_barras) where codigo_barras is not null and codigo_barras <> '';
create index if not exists produtos_bar_idx on public.produtos (bar_id);

-- ---------------------------------------------------------------------
-- 7. RPCs DE NEGÓCIO (transacionais)
-- ---------------------------------------------------------------------

-- Cadastro de bar (onboarding): quem cria vira Administrador
create or replace function public.criar_bar(_dados jsonb)
returns uuid
language plpgsql volatile security definer
set search_path = public
as $$
declare
  _bar uuid;
  _admin uuid;
begin
  if auth.uid() is null then
    raise exception 'Faça login para cadastrar um bar' using errcode = '42501';
  end if;
  if coalesce(trim(_dados->>'nome'), '') = '' then
    raise exception 'Informe o nome do bar';
  end if;

  insert into public.bares (
    nome, razao_social, cnpj, inscricao_estadual, regime_tributario, telefone, email,
    cep, logradouro, numero, complemento, bairro, municipio, codigo_municipio, uf, criado_por
  ) values (
    trim(_dados->>'nome'),
    nullif(_dados->>'razao_social', ''),
    nullif(regexp_replace(coalesce(_dados->>'cnpj', ''), '\D', '', 'g'), ''),
    nullif(_dados->>'inscricao_estadual', ''),
    coalesce((_dados->>'regime_tributario')::smallint, 1),
    nullif(_dados->>'telefone', ''),
    nullif(_dados->>'email', ''),
    nullif(regexp_replace(coalesce(_dados->>'cep', ''), '\D', '', 'g'), ''),
    nullif(_dados->>'logradouro', ''),
    nullif(_dados->>'numero', ''),
    nullif(_dados->>'complemento', ''),
    nullif(_dados->>'bairro', ''),
    nullif(_dados->>'municipio', ''),
    nullif(_dados->>'codigo_municipio', ''),
    nullif(upper(_dados->>'uf'), ''),
    auth.uid()
  )
  returning id into _bar;

  _admin := public.criar_perfis_padrao(_bar);

  insert into public.bar_membros (bar_id, user_id, perfil_id)
  values (_bar, auth.uid(), _admin);

  insert into public.configuracoes_fiscais (bar_id) values (_bar);

  insert into public.categorias (bar_id, nome)
  select _bar, c from unnest(array['Cervejas', 'Destilados', 'Drinks', 'Vinhos', 'Não alcoólicos', 'Porções']) c;

  return _bar;
end;
$$;

-- Finaliza uma venda: valida estoque, usa preço do banco, baixa estoque, grava pagamentos
create or replace function public.finalizar_venda(
  _bar_id uuid,
  _itens jsonb,                 -- [{ "produto_id": uuid, "quantidade": number }]
  _pagamentos jsonb,            -- [{ "forma": "dinheiro", "valor": number }]
  _desconto numeric default 0,
  _cliente_nome text default null,
  _cliente_cpf text default null,
  _origem text default 'pdv',
  _observacao text default null
)
returns jsonb
language plpgsql volatile security definer
set search_path = public
as $$
declare
  _venda_id uuid;
  _numero bigint;
  _item jsonb;
  _pag jsonb;
  _prod record;
  _qtd numeric;
  _valor numeric;
  _subtotal numeric := 0;
  _total numeric;
  _pago numeric := 0;
  _troco numeric;
  _tem_dinheiro boolean := false;
  _permite_negativo boolean;
begin
  if auth.uid() is null or not public.tem_permissao(_bar_id, 'vendas') then
    raise exception 'Sem permissão para registrar vendas neste bar' using errcode = '42501';
  end if;
  if _itens is null or jsonb_typeof(_itens) <> 'array' or jsonb_array_length(_itens) = 0 then
    raise exception 'A venda não possui itens';
  end if;
  if _pagamentos is null or jsonb_typeof(_pagamentos) <> 'array' or jsonb_array_length(_pagamentos) = 0 then
    raise exception 'Informe a forma de pagamento';
  end if;

  select permitir_estoque_negativo into _permite_negativo
    from public.bares where id = _bar_id and ativo;
  if not found then
    raise exception 'Bar não encontrado ou inativo';
  end if;

  _numero := public.proximo_numero(_bar_id, 'venda');

  insert into public.vendas (bar_id, numero, usuario_id, status, cliente_nome, cliente_cpf, origem, observacao, criado_em)
  values (_bar_id, _numero, auth.uid(), 'finalizada', nullif(_cliente_nome, ''),
          nullif(regexp_replace(coalesce(_cliente_cpf, ''), '\D', '', 'g'), ''),
          coalesce(_origem, 'pdv'), nullif(_observacao, ''), now())
  returning id into _venda_id;

  for _item in select * from jsonb_array_elements(_itens) loop
    _qtd := (_item->>'quantidade')::numeric;
    if _qtd is null or _qtd <= 0 then
      raise exception 'Quantidade inválida';
    end if;

    select id, nome, preco_venda, preco_custo, estoque_atual into _prod
      from public.produtos
     where id = (_item->>'produto_id')::uuid and bar_id = _bar_id and ativo
     for update;
    if not found then
      raise exception 'Produto não encontrado ou inativo';
    end if;

    if not _permite_negativo and coalesce(_prod.estoque_atual, 0) < _qtd then
      raise exception 'Estoque insuficiente para %', _prod.nome;
    end if;

    insert into public.itens_venda (venda_id, bar_id, produto_id, nome_produto, quantidade, preco_unitario, custo_unitario)
    values (_venda_id, _bar_id, _prod.id, _prod.nome, _qtd, coalesce(_prod.preco_venda, 0), coalesce(_prod.preco_custo, 0));

    update public.produtos set estoque_atual = coalesce(estoque_atual, 0) - _qtd where id = _prod.id;

    insert into public.estoque_movimentacoes (bar_id, produto_id, tipo, quantidade, venda_id, usuario_id)
    values (_bar_id, _prod.id, 'venda', -_qtd, _venda_id, auth.uid());

    _subtotal := _subtotal + round(_qtd * coalesce(_prod.preco_venda, 0), 2);
  end loop;

  _desconto := round(greatest(coalesce(_desconto, 0), 0), 2);
  if _desconto > _subtotal then
    raise exception 'Desconto maior que o valor da venda';
  end if;
  _total := _subtotal - _desconto;

  for _pag in select * from jsonb_array_elements(_pagamentos) loop
    _valor := round((_pag->>'valor')::numeric, 2);
    if _valor is null or _valor <= 0 then
      raise exception 'Valor de pagamento inválido';
    end if;
    if _pag->>'forma' = 'dinheiro' then
      _tem_dinheiro := true;
    end if;
    insert into public.venda_pagamentos (venda_id, bar_id, forma, valor)
    values (_venda_id, _bar_id, _pag->>'forma', _valor);
    _pago := _pago + _valor;
  end loop;

  if _pago < _total then
    raise exception 'Valor pago (%) menor que o total (%)', _pago, _total;
  end if;
  _troco := _pago - _total;
  if _troco > 0 and not _tem_dinheiro then
    raise exception 'Troco só é permitido em pagamentos com dinheiro';
  end if;

  update public.vendas
     set subtotal = _subtotal, desconto = _desconto, total = _total, troco = _troco
   where id = _venda_id;

  return jsonb_build_object(
    'id', _venda_id, 'numero', _numero,
    'subtotal', _subtotal, 'desconto', _desconto, 'total', _total, 'troco', _troco
  );
end;
$$;

-- Cancela venda e devolve estoque (a NFC-e autorizada deve ser cancelada antes)
create or replace function public.cancelar_venda(_venda_id uuid, _motivo text)
returns void
language plpgsql volatile security definer
set search_path = public
as $$
declare
  _venda record;
  _item record;
begin
  select * into _venda from public.vendas where id = _venda_id for update;
  if not found then
    raise exception 'Venda não encontrada';
  end if;
  if not public.tem_permissao(_venda.bar_id, 'vendas_cancelar') then
    raise exception 'Sem permissão para cancelar vendas' using errcode = '42501';
  end if;
  if _venda.status = 'cancelada' then
    raise exception 'Venda já está cancelada';
  end if;
  if exists (select 1 from public.notas_fiscais where venda_id = _venda_id and status = 'autorizada') then
    raise exception 'Esta venda tem NFC-e autorizada. Cancele a nota fiscal primeiro.';
  end if;

  for _item in select * from public.itens_venda where venda_id = _venda_id and produto_id is not null loop
    update public.produtos set estoque_atual = coalesce(estoque_atual, 0) + _item.quantidade
     where id = _item.produto_id;
    insert into public.estoque_movimentacoes (bar_id, produto_id, tipo, quantidade, venda_id, usuario_id, observacao)
    values (_venda.bar_id, _item.produto_id, 'cancelamento', _item.quantidade, _venda_id, auth.uid(), _motivo);
  end loop;

  update public.vendas
     set status = 'cancelada', cancelada_em = now(), cancelada_por = auth.uid(),
         motivo_cancelamento = nullif(_motivo, '')
   where id = _venda_id;
end;
$$;

-- Entrada / perda / ajuste de estoque com histórico
create or replace function public.movimentar_estoque(
  _produto_id uuid, _tipo text, _quantidade numeric, _observacao text default null
)
returns numeric
language plpgsql volatile security definer
set search_path = public
as $$
declare
  _prod record;
  _delta numeric;
  _novo numeric;
begin
  select * into _prod from public.produtos where id = _produto_id for update;
  if not found then
    raise exception 'Produto não encontrado';
  end if;
  if not public.tem_permissao(_prod.bar_id, 'estoque') then
    raise exception 'Sem permissão para movimentar estoque' using errcode = '42501';
  end if;
  if _quantidade is null or _quantidade < 0 then
    raise exception 'Quantidade inválida';
  end if;

  _delta := case _tipo
    when 'entrada' then _quantidade
    when 'perda' then -_quantidade
    when 'saida' then -_quantidade
    when 'ajuste' then _quantidade - coalesce(_prod.estoque_atual, 0)   -- ajuste = contagem (valor absoluto)
    else null end;
  if _delta is null then
    raise exception 'Tipo de movimentação inválido';
  end if;

  update public.produtos set estoque_atual = coalesce(estoque_atual, 0) + _delta
   where id = _produto_id
  returning estoque_atual into _novo;

  insert into public.estoque_movimentacoes (bar_id, produto_id, tipo, quantidade, usuario_id, observacao)
  values (_prod.bar_id, _produto_id, _tipo, _delta, auth.uid(), _observacao);

  return _novo;
end;
$$;

-- Indicadores do dashboard
create or replace function public.resumo_dashboard(_bar_id uuid, _inicio timestamptz, _fim timestamptz)
returns jsonb
language plpgsql stable security definer
set search_path = public
as $$
declare
  _res jsonb;
begin
  if not (public.tem_permissao(_bar_id, 'dashboard') or public.tem_permissao(_bar_id, 'relatorios')) then
    raise exception 'Sem permissão' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'faturamento', coalesce(sum(v.total), 0),
    'quantidade', count(*),
    'ticket_medio', coalesce(avg(v.total), 0),
    'descontos', coalesce(sum(v.desconto), 0)
  ) into _res
  from public.vendas v
  where v.bar_id = _bar_id and v.status = 'finalizada'
    and v.criado_em >= _inicio and v.criado_em < _fim;

  _res := _res || jsonb_build_object(
    'custo', (
      select coalesce(sum(iv.quantidade * iv.custo_unitario), 0)
        from public.itens_venda iv join public.vendas v on v.id = iv.venda_id
       where v.bar_id = _bar_id and v.status = 'finalizada'
         and v.criado_em >= _inicio and v.criado_em < _fim
    ),
    'por_forma', coalesce((
      select jsonb_object_agg(forma, valor) from (
        select p.forma, sum(p.valor) as valor
          from public.venda_pagamentos p join public.vendas v on v.id = p.venda_id
         where v.bar_id = _bar_id and v.status = 'finalizada'
           and v.criado_em >= _inicio and v.criado_em < _fim
         group by p.forma
      ) f
    ), '{}'::jsonb),
    'troco', (
      select coalesce(sum(troco), 0) from public.vendas v
       where v.bar_id = _bar_id and v.status = 'finalizada'
         and v.criado_em >= _inicio and v.criado_em < _fim
    ),
    'top_produtos', coalesce((
      select jsonb_agg(t) from (
        select iv.nome_produto as nome, sum(iv.quantidade) as quantidade, sum(iv.subtotal) as total
          from public.itens_venda iv join public.vendas v on v.id = iv.venda_id
         where v.bar_id = _bar_id and v.status = 'finalizada'
           and v.criado_em >= _inicio and v.criado_em < _fim
         group by iv.nome_produto
         order by sum(iv.subtotal) desc nulls last
         limit 5
      ) t
    ), '[]'::jsonb),
    'por_hora', coalesce((
      select jsonb_agg(h order by h.hora) from (
        select extract(hour from v.criado_em at time zone 'America/Sao_Paulo')::int as hora,
               sum(v.total) as total, count(*) as quantidade
          from public.vendas v
         where v.bar_id = _bar_id and v.status = 'finalizada'
           and v.criado_em >= _inicio and v.criado_em < _fim
         group by 1
      ) h
    ), '[]'::jsonb)
  );

  return _res;
end;
$$;

-- Funções internas não podem ser chamadas pelo app diretamente
revoke execute on function public.proximo_numero(uuid, text) from public, anon, authenticated;
revoke execute on function public.criar_perfis_padrao(uuid) from public, anon, authenticated;
revoke execute on function public.reservar_numero_nfce(uuid) from public, anon, authenticated;
revoke execute on function public.criar_bar(jsonb) from anon;
revoke execute on function public.finalizar_venda(uuid, jsonb, jsonb, numeric, text, text, text, text) from anon;
revoke execute on function public.cancelar_venda(uuid, text) from anon;
revoke execute on function public.movimentar_estoque(uuid, text, numeric, text) from anon;
revoke execute on function public.resumo_dashboard(uuid, timestamptz, timestamptz) from anon;

-- ---------------------------------------------------------------------
-- 8. ROW LEVEL SECURITY (isolamento entre bares)
-- ---------------------------------------------------------------------

-- Remove policies antigas das tabelas de negócio (podem ser permissivas demais)
do $$
declare p record;
begin
  for p in
    select policyname, tablename from pg_policies
     where schemaname = 'public'
       and tablename in ('categorias', 'produtos', 'vendas', 'itens_venda', 'bares', 'perfis',
                         'bar_membros', 'venda_pagamentos', 'estoque_movimentacoes',
                         'configuracoes_fiscais', 'certificados_digitais', 'certificados_segredos',
                         'notas_fiscais', 'bar_sequencias')
  loop
    execute format('drop policy %I on public.%I', p.policyname, p.tablename);
  end loop;
end $$;

alter table public.bares enable row level security;
alter table public.perfis enable row level security;
alter table public.bar_membros enable row level security;
alter table public.bar_sequencias enable row level security;
alter table public.categorias enable row level security;
alter table public.produtos enable row level security;
alter table public.vendas enable row level security;
alter table public.itens_venda enable row level security;
alter table public.venda_pagamentos enable row level security;
alter table public.estoque_movimentacoes enable row level security;
alter table public.configuracoes_fiscais enable row level security;
alter table public.certificados_digitais enable row level security;
alter table public.certificados_segredos enable row level security;
alter table public.notas_fiscais enable row level security;

-- bares
create policy "Membros veem o bar" on public.bares for select to authenticated
  using (public.is_membro_bar(id));
create policy "Configurar bar" on public.bares for update to authenticated
  using (public.tem_permissao(id, 'configuracoes'))
  with check (public.tem_permissao(id, 'configuracoes'));

-- perfis
create policy "Membros veem perfis" on public.perfis for select to authenticated
  using (public.is_membro_bar(bar_id));
create policy "Gerenciar perfis - inserir" on public.perfis for insert to authenticated
  with check (public.tem_permissao(bar_id, 'perfis') and not is_admin);
create policy "Gerenciar perfis - alterar" on public.perfis for update to authenticated
  using (public.tem_permissao(bar_id, 'perfis') and not is_admin)
  with check (public.tem_permissao(bar_id, 'perfis') and not is_admin);
create policy "Gerenciar perfis - excluir" on public.perfis for delete to authenticated
  using (public.tem_permissao(bar_id, 'perfis') and not is_admin);

-- membros
create policy "Ver membros do bar" on public.bar_membros for select to authenticated
  using (user_id = auth.uid() or public.is_membro_bar(bar_id));
create policy "Gerenciar membros - alterar" on public.bar_membros for update to authenticated
  using (public.tem_permissao(bar_id, 'usuarios') and user_id <> auth.uid())
  with check (public.tem_permissao(bar_id, 'usuarios') and user_id <> auth.uid());
create policy "Gerenciar membros - excluir" on public.bar_membros for delete to authenticated
  using (public.tem_permissao(bar_id, 'usuarios') and user_id <> auth.uid());
-- inserção de membros: somente via Edge Function "gerenciar-usuarios"

-- profiles: colegas de bar podem se ver
drop policy if exists "Colegas de bar veem perfis" on public.profiles;
create policy "Colegas de bar veem perfis" on public.profiles for select to authenticated
  using (public.compartilha_bar(id));

-- categorias
create policy "Membros veem categorias" on public.categorias for select to authenticated
  using (public.is_membro_bar(bar_id));
create policy "Estoque gerencia categorias" on public.categorias for all to authenticated
  using (public.tem_permissao(bar_id, 'estoque'))
  with check (public.tem_permissao(bar_id, 'estoque'));

-- produtos (estoque_atual só muda via RPCs, mas o cadastro é direto)
create policy "Membros veem produtos" on public.produtos for select to authenticated
  using (public.is_membro_bar(bar_id));
create policy "Estoque gerencia produtos" on public.produtos for all to authenticated
  using (public.tem_permissao(bar_id, 'estoque'))
  with check (public.tem_permissao(bar_id, 'estoque'));

-- vendas e afins: leitura para membros; escrita somente via RPC
create policy "Membros veem vendas" on public.vendas for select to authenticated
  using (public.is_membro_bar(bar_id));
create policy "Membros veem itens" on public.itens_venda for select to authenticated
  using (public.is_membro_bar(bar_id));
create policy "Membros veem pagamentos" on public.venda_pagamentos for select to authenticated
  using (public.is_membro_bar(bar_id));
create policy "Estoque vê movimentações" on public.estoque_movimentacoes for select to authenticated
  using (public.tem_permissao(bar_id, 'estoque'));

-- fiscal
create policy "Fiscal vê configuração" on public.configuracoes_fiscais for select to authenticated
  using (public.tem_permissao(bar_id, 'fiscal') or public.tem_permissao(bar_id, 'configuracoes'));
create policy "Configurações altera fiscal" on public.configuracoes_fiscais for update to authenticated
  using (public.tem_permissao(bar_id, 'configuracoes'))
  with check (public.tem_permissao(bar_id, 'configuracoes'));
create policy "Fiscal vê certificados" on public.certificados_digitais for select to authenticated
  using (public.tem_permissao(bar_id, 'fiscal') or public.tem_permissao(bar_id, 'configuracoes'));
create policy "Membros veem notas" on public.notas_fiscais for select to authenticated
  using (public.is_membro_bar(bar_id));
-- certificados_segredos e bar_sequencias: sem policies (somente service role)

-- storage: logos (pasta = id do bar)
drop policy if exists "Logos - upload" on storage.objects;
create policy "Logos - upload" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'logos'
    and public.tem_permissao_pasta((storage.foldername(name))[1], 'configuracoes')
  );
drop policy if exists "Logos - atualizar" on storage.objects;
create policy "Logos - atualizar" on storage.objects for update to authenticated
  using (
    bucket_id = 'logos'
    and public.tem_permissao_pasta((storage.foldername(name))[1], 'configuracoes')
  );
-- bucket "certificados": sem policies => somente service role

-- ---------------------------------------------------------------------
-- 9. TRIGGERS updated_at
-- ---------------------------------------------------------------------
drop trigger if exists bares_updated_at on public.bares;
create trigger bares_updated_at before update on public.bares
  for each row execute function public.update_updated_at_column();

drop trigger if exists configuracoes_fiscais_updated_at on public.configuracoes_fiscais;
create trigger configuracoes_fiscais_updated_at before update on public.configuracoes_fiscais
  for each row execute function public.update_updated_at_column();

drop trigger if exists notas_fiscais_updated_at on public.notas_fiscais;
create trigger notas_fiscais_updated_at before update on public.notas_fiscais
  for each row execute function public.update_updated_at_column();
