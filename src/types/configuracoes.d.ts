
// Define the types for the configuracoes module
export interface Perfil {
  id: string;
  nome: string;
  descricao: string;
  permissoes: string[];
}

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  senha: string;
  cpf: string;
  perfil: Perfil;
}

export interface Permissao {
  id: string;
  nome: string;
  descricao: string;
}
