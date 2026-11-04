/** Catálogo de permissões por bar (mesmos códigos usados no banco). */
export const PERMISSOES = [
  { codigo: "dashboard", nome: "Dashboard", descricao: "Ver indicadores do bar" },
  { codigo: "vendas", nome: "Vendas (PDV)", descricao: "Registrar vendas no caixa e no celular" },
  { codigo: "vendas_cancelar", nome: "Cancelar vendas", descricao: "Cancelar vendas e devolver estoque" },
  { codigo: "estoque", nome: "Estoque", descricao: "Cadastrar produtos e movimentar estoque" },
  { codigo: "relatorios", nome: "Relatórios", descricao: "Ver histórico de vendas e relatórios" },
  { codigo: "fiscal", nome: "Fiscal", descricao: "Emitir NFC-e e ver certificado digital" },
  { codigo: "configuracoes", nome: "Configurações", descricao: "Dados do bar, fiscal e impressora" },
  { codigo: "usuarios", nome: "Usuários", descricao: "Cadastrar e gerenciar usuários do bar" },
  { codigo: "perfis", nome: "Perfis", descricao: "Criar e editar perfis de acesso" },
] as const;

export type CodigoPermissao = (typeof PERMISSOES)[number]["codigo"];

/** Rotas do app na ordem de preferência para redirecionamento. */
export const ROTAS = [
  { path: "/", permissao: "dashboard" },
  { path: "/vendas", permissao: "vendas" },
  { path: "/estoque", permissao: "estoque" },
  { path: "/configuracoes", permissao: "configuracoes" },
] as const;
