export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      bar_membros: {
        Row: {
          ativo: boolean
          bar_id: string
          created_at: string
          id: string
          perfil_id: string | null
          user_id: string
        }
        Insert: {
          ativo?: boolean
          bar_id: string
          created_at?: string
          id?: string
          perfil_id?: string | null
          user_id: string
        }
        Update: {
          ativo?: boolean
          bar_id?: string
          created_at?: string
          id?: string
          perfil_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bar_membros_bar_id_fkey"
            columns: ["bar_id"]
            isOneToOne: false
            referencedRelation: "bares"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bar_membros_perfil_id_fkey"
            columns: ["perfil_id"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bar_membros_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bar_sequencias: {
        Row: {
          bar_id: string
          nome: string
          valor: number
        }
        Insert: {
          bar_id: string
          nome: string
          valor?: number
        }
        Update: {
          bar_id?: string
          nome?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "bar_sequencias_bar_id_fkey"
            columns: ["bar_id"]
            isOneToOne: false
            referencedRelation: "bares"
            referencedColumns: ["id"]
          },
        ]
      }
      bares: {
        Row: {
          ativo: boolean
          bairro: string | null
          cep: string | null
          cnpj: string | null
          codigo_municipio: string | null
          complemento: string | null
          cor_primaria: string | null
          created_at: string
          criado_por: string | null
          email: string | null
          id: string
          inscricao_estadual: string | null
          inscricao_municipal: string | null
          logo_url: string | null
          logradouro: string | null
          municipio: string | null
          nome: string
          numero: string | null
          permitir_estoque_negativo: boolean
          razao_social: string | null
          regime_tributario: number
          telefone: string | null
          uf: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          bairro?: string | null
          cep?: string | null
          cnpj?: string | null
          codigo_municipio?: string | null
          complemento?: string | null
          cor_primaria?: string | null
          created_at?: string
          criado_por?: string | null
          email?: string | null
          id?: string
          inscricao_estadual?: string | null
          inscricao_municipal?: string | null
          logo_url?: string | null
          logradouro?: string | null
          municipio?: string | null
          nome: string
          numero?: string | null
          permitir_estoque_negativo?: boolean
          razao_social?: string | null
          regime_tributario?: number
          telefone?: string | null
          uf?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          bairro?: string | null
          cep?: string | null
          cnpj?: string | null
          codigo_municipio?: string | null
          complemento?: string | null
          cor_primaria?: string | null
          created_at?: string
          criado_por?: string | null
          email?: string | null
          id?: string
          inscricao_estadual?: string | null
          inscricao_municipal?: string | null
          logo_url?: string | null
          logradouro?: string | null
          municipio?: string | null
          nome?: string
          numero?: string | null
          permitir_estoque_negativo?: boolean
          razao_social?: string | null
          regime_tributario?: number
          telefone?: string | null
          uf?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      categorias: {
        Row: {
          bar_id: string
          created_at: string | null
          id: string
          nome: string
        }
        Insert: {
          bar_id: string
          created_at?: string | null
          id?: string
          nome: string
        }
        Update: {
          bar_id?: string
          created_at?: string | null
          id?: string
          nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "categorias_bar_id_fkey"
            columns: ["bar_id"]
            isOneToOne: false
            referencedRelation: "bares"
            referencedColumns: ["id"]
          },
        ]
      }
      certificados_digitais: {
        Row: {
          ativo: boolean
          bar_id: string
          cnpj: string | null
          created_at: string
          created_by: string | null
          emissor: string | null
          enviado_provedor: boolean
          id: string
          numero_serie: string | null
          storage_path: string
          titular: string | null
          valido_ate: string | null
          valido_de: string | null
        }
        Insert: {
          ativo?: boolean
          bar_id: string
          cnpj?: string | null
          created_at?: string
          created_by?: string | null
          emissor?: string | null
          enviado_provedor?: boolean
          id?: string
          numero_serie?: string | null
          storage_path: string
          titular?: string | null
          valido_ate?: string | null
          valido_de?: string | null
        }
        Update: {
          ativo?: boolean
          bar_id?: string
          cnpj?: string | null
          created_at?: string
          created_by?: string | null
          emissor?: string | null
          enviado_provedor?: boolean
          id?: string
          numero_serie?: string | null
          storage_path?: string
          titular?: string | null
          valido_ate?: string | null
          valido_de?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "certificados_digitais_bar_id_fkey"
            columns: ["bar_id"]
            isOneToOne: false
            referencedRelation: "bares"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificados_digitais_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      certificados_segredos: {
        Row: {
          certificado_id: string
          iv: string
          senha_cifrada: string
        }
        Insert: {
          certificado_id: string
          iv: string
          senha_cifrada: string
        }
        Update: {
          certificado_id?: string
          iv?: string
          senha_cifrada?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificados_segredos_certificado_id_fkey"
            columns: ["certificado_id"]
            isOneToOne: true
            referencedRelation: "certificados_digitais"
            referencedColumns: ["id"]
          },
        ]
      }
      configuracoes_fiscais: {
        Row: {
          ambiente: string
          bar_id: string
          csc_id: string | null
          csc_token: string | null
          emitir_automaticamente: boolean
          informacoes_adicionais: string | null
          natureza_operacao: string
          provedor: string
          proximo_numero_nfce: number
          serie_nfce: number
          updated_at: string
        }
        Insert: {
          ambiente?: string
          bar_id: string
          csc_id?: string | null
          csc_token?: string | null
          emitir_automaticamente?: boolean
          informacoes_adicionais?: string | null
          natureza_operacao?: string
          provedor?: string
          proximo_numero_nfce?: number
          serie_nfce?: number
          updated_at?: string
        }
        Update: {
          ambiente?: string
          bar_id?: string
          csc_id?: string | null
          csc_token?: string | null
          emitir_automaticamente?: boolean
          informacoes_adicionais?: string | null
          natureza_operacao?: string
          provedor?: string
          proximo_numero_nfce?: number
          serie_nfce?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "configuracoes_fiscais_bar_id_fkey"
            columns: ["bar_id"]
            isOneToOne: true
            referencedRelation: "bares"
            referencedColumns: ["id"]
          },
        ]
      }
      estoque_movimentacoes: {
        Row: {
          bar_id: string
          created_at: string
          id: string
          observacao: string | null
          produto_id: string
          quantidade: number
          tipo: string
          usuario_id: string | null
          venda_id: string | null
        }
        Insert: {
          bar_id: string
          created_at?: string
          id?: string
          observacao?: string | null
          produto_id: string
          quantidade: number
          tipo: string
          usuario_id?: string | null
          venda_id?: string | null
        }
        Update: {
          bar_id?: string
          created_at?: string
          id?: string
          observacao?: string | null
          produto_id?: string
          quantidade?: number
          tipo?: string
          usuario_id?: string | null
          venda_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "estoque_movimentacoes_bar_id_fkey"
            columns: ["bar_id"]
            isOneToOne: false
            referencedRelation: "bares"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estoque_movimentacoes_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estoque_movimentacoes_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estoque_movimentacoes_venda_id_fkey"
            columns: ["venda_id"]
            isOneToOne: false
            referencedRelation: "vendas"
            referencedColumns: ["id"]
          },
        ]
      }
      itens_venda: {
        Row: {
          bar_id: string | null
          custo_unitario: number
          id: string
          nome_produto: string | null
          preco_unitario: number
          produto_id: string | null
          quantidade: number
          subtotal: number | null
          venda_id: string | null
        }
        Insert: {
          bar_id?: string | null
          custo_unitario?: number
          id?: string
          nome_produto?: string | null
          preco_unitario: number
          produto_id?: string | null
          quantidade: number
          subtotal?: number | null
          venda_id?: string | null
        }
        Update: {
          bar_id?: string | null
          custo_unitario?: number
          id?: string
          nome_produto?: string | null
          preco_unitario?: number
          produto_id?: string | null
          quantidade?: number
          subtotal?: number | null
          venda_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "itens_venda_bar_id_fkey"
            columns: ["bar_id"]
            isOneToOne: false
            referencedRelation: "bares"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itens_venda_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itens_venda_venda_id_fkey"
            columns: ["venda_id"]
            isOneToOne: false
            referencedRelation: "vendas"
            referencedColumns: ["id"]
          },
        ]
      }
      loja_config: {
        Row: {
          cnpj: string | null
          cor_primaria: string | null
          cor_secundaria: string | null
          created_at: string | null
          email: string | null
          endereco: string | null
          id: string
          logo_url: string | null
          nome: string
          telefone: string | null
          updated_at: string | null
        }
        Insert: {
          cnpj?: string | null
          cor_primaria?: string | null
          cor_secundaria?: string | null
          created_at?: string | null
          email?: string | null
          endereco?: string | null
          id?: string
          logo_url?: string | null
          nome: string
          telefone?: string | null
          updated_at?: string | null
        }
        Update: {
          cnpj?: string | null
          cor_primaria?: string | null
          cor_secundaria?: string | null
          created_at?: string | null
          email?: string | null
          endereco?: string | null
          id?: string
          logo_url?: string | null
          nome?: string
          telefone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      notas_fiscais: {
        Row: {
          ambiente: string
          bar_id: string
          chave: string | null
          created_at: string
          id: string
          mensagem: string | null
          modelo: number
          numero: number
          protocolo: string | null
          provedor_id: string | null
          qrcode_url: string | null
          serie: number
          status: string
          updated_at: string
          url_consulta: string | null
          venda_id: string | null
          xml: string | null
        }
        Insert: {
          ambiente: string
          bar_id: string
          chave?: string | null
          created_at?: string
          id?: string
          mensagem?: string | null
          modelo?: number
          numero: number
          protocolo?: string | null
          provedor_id?: string | null
          qrcode_url?: string | null
          serie: number
          status?: string
          updated_at?: string
          url_consulta?: string | null
          venda_id?: string | null
          xml?: string | null
        }
        Update: {
          ambiente?: string
          bar_id?: string
          chave?: string | null
          created_at?: string
          id?: string
          mensagem?: string | null
          modelo?: number
          numero?: number
          protocolo?: string | null
          provedor_id?: string | null
          qrcode_url?: string | null
          serie?: number
          status?: string
          updated_at?: string
          url_consulta?: string | null
          venda_id?: string | null
          xml?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notas_fiscais_bar_id_fkey"
            columns: ["bar_id"]
            isOneToOne: false
            referencedRelation: "bares"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notas_fiscais_venda_id_fkey"
            columns: ["venda_id"]
            isOneToOne: false
            referencedRelation: "vendas"
            referencedColumns: ["id"]
          },
        ]
      }
      perfis: {
        Row: {
          bar_id: string
          created_at: string
          descricao: string | null
          id: string
          is_admin: boolean
          nome: string
          permissoes: string[]
        }
        Insert: {
          bar_id: string
          created_at?: string
          descricao?: string | null
          id?: string
          is_admin?: boolean
          nome: string
          permissoes?: string[]
        }
        Update: {
          bar_id?: string
          created_at?: string
          descricao?: string | null
          id?: string
          is_admin?: boolean
          nome?: string
          permissoes?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "perfis_bar_id_fkey"
            columns: ["bar_id"]
            isOneToOne: false
            referencedRelation: "bares"
            referencedColumns: ["id"]
          },
        ]
      }
      permissoes: {
        Row: {
          created_at: string | null
          descricao: string | null
          id: string
          nome: string
        }
        Insert: {
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome: string
        }
        Update: {
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome?: string
        }
        Relationships: []
      }
      produtos: {
        Row: {
          ativo: boolean
          atualizado_em: string | null
          bar_id: string
          categoria_id: string | null
          cest: string | null
          cfop: string
          codigo_barras: string | null
          codigo_interno: string | null
          criado_em: string | null
          csosn: string
          estoque_atual: number | null
          estoque_minimo: number | null
          id: string
          imagem_url: string | null
          ncm: string | null
          nome: string
          origem: number
          preco_custo: number | null
          preco_venda: number | null
          unidade: string
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string | null
          bar_id: string
          categoria_id?: string | null
          cest?: string | null
          cfop?: string
          codigo_barras?: string | null
          codigo_interno?: string | null
          criado_em?: string | null
          csosn?: string
          estoque_atual?: number | null
          estoque_minimo?: number | null
          id?: string
          imagem_url?: string | null
          ncm?: string | null
          nome: string
          origem?: number
          preco_custo?: number | null
          preco_venda?: number | null
          unidade?: string
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string | null
          bar_id?: string
          categoria_id?: string | null
          cest?: string | null
          cfop?: string
          codigo_barras?: string | null
          codigo_interno?: string | null
          criado_em?: string | null
          csosn?: string
          estoque_atual?: number | null
          estoque_minimo?: number | null
          id?: string
          imagem_url?: string | null
          ncm?: string | null
          nome?: string
          origem?: number
          preco_custo?: number | null
          preco_venda?: number | null
          unidade?: string
        }
        Relationships: [
          {
            foreignKeyName: "produtos_bar_id_fkey"
            columns: ["bar_id"]
            isOneToOne: false
            referencedRelation: "bares"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produtos_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          cpf: string | null
          created_at: string | null
          email: string | null
          id: string
          nome: string
          updated_at: string | null
        }
        Insert: {
          cpf?: string | null
          created_at?: string | null
          email?: string | null
          id: string
          nome: string
          updated_at?: string | null
        }
        Update: {
          cpf?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          nome?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          id: string
          permissao_id: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          id?: string
          permissao_id: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          id?: string
          permissao_id?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permissao_id_fkey"
            columns: ["permissao_id"]
            isOneToOne: false
            referencedRelation: "permissoes"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      venda_pagamentos: {
        Row: {
          bar_id: string
          created_at: string
          forma: string
          id: string
          valor: number
          venda_id: string
        }
        Insert: {
          bar_id: string
          created_at?: string
          forma: string
          id?: string
          valor: number
          venda_id: string
        }
        Update: {
          bar_id?: string
          created_at?: string
          forma?: string
          id?: string
          valor?: number
          venda_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venda_pagamentos_bar_id_fkey"
            columns: ["bar_id"]
            isOneToOne: false
            referencedRelation: "bares"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venda_pagamentos_venda_id_fkey"
            columns: ["venda_id"]
            isOneToOne: false
            referencedRelation: "vendas"
            referencedColumns: ["id"]
          },
        ]
      }
      vendas: {
        Row: {
          bar_id: string
          cancelada_em: string | null
          cancelada_por: string | null
          cliente_cpf: string | null
          cliente_nome: string | null
          criado_em: string | null
          desconto: number
          id: string
          motivo_cancelamento: string | null
          numero: number | null
          observacao: string | null
          origem: string
          status: string
          subtotal: number
          total: number | null
          troco: number
          usuario_id: string | null
        }
        Insert: {
          bar_id: string
          cancelada_em?: string | null
          cancelada_por?: string | null
          cliente_cpf?: string | null
          cliente_nome?: string | null
          criado_em?: string | null
          desconto?: number
          id?: string
          motivo_cancelamento?: string | null
          numero?: number | null
          observacao?: string | null
          origem?: string
          status?: string
          subtotal?: number
          total?: number | null
          troco?: number
          usuario_id?: string | null
        }
        Update: {
          bar_id?: string
          cancelada_em?: string | null
          cancelada_por?: string | null
          cliente_cpf?: string | null
          cliente_nome?: string | null
          criado_em?: string | null
          desconto?: number
          id?: string
          motivo_cancelamento?: string | null
          numero?: number | null
          observacao?: string | null
          origem?: string
          status?: string
          subtotal?: number
          total?: number | null
          troco?: number
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendas_bar_id_fkey"
            columns: ["bar_id"]
            isOneToOne: false
            referencedRelation: "bares"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendas_cancelada_por_fkey"
            columns: ["cancelada_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendas_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cancelar_venda: {
        Args: { _motivo: string; _venda_id: string }
        Returns: undefined
      }
      compartilha_bar: { Args: { _user_id: string }; Returns: boolean }
      criar_bar: { Args: { _dados: Json }; Returns: string }
      criar_perfis_padrao: { Args: { _bar_id: string }; Returns: string }
      finalizar_venda: {
        Args: {
          _bar_id: string
          _cliente_cpf?: string
          _cliente_nome?: string
          _desconto?: number
          _itens: Json
          _observacao?: string
          _origem?: string
          _pagamentos: Json
        }
        Returns: Json
      }
      get_user_permissions: {
        Args: { _user_id: string }
        Returns: {
          permissao_nome: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_membro_bar: { Args: { _bar_id: string }; Returns: boolean }
      movimentar_estoque: {
        Args: {
          _observacao?: string
          _produto_id: string
          _quantidade: number
          _tipo: string
        }
        Returns: number
      }
      proximo_numero: {
        Args: { _bar_id: string; _nome: string }
        Returns: number
      }
      reservar_numero_nfce: {
        Args: { _bar_id: string }
        Returns: {
          ambiente: string
          numero: number
          serie: number
        }[]
      }
      resumo_dashboard: {
        Args: { _bar_id: string; _fim: string; _inicio: string }
        Returns: Json
      }
      tem_permissao: {
        Args: { _bar_id: string; _permissao: string }
        Returns: boolean
      }
      tem_permissao_pasta: {
        Args: { _pasta: string; _permissao: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user" | "vendedor" | "gerente"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user", "vendedor", "gerente"],
    },
  },
} as const
