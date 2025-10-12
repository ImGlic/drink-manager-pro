import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Types
export interface UserRole {
  role: 'admin' | 'moderator' | 'user' | 'vendedor' | 'gerente';
}

export interface Profile {
  id: string;
  nome: string;
  cpf: string | null;
  created_at: string;
  updated_at: string;
}

export interface Permission {
  id: string;
  nome: string;
  descricao: string | null;
}

export interface StoreConfig {
  id: string;
  nome: string;
  cnpj: string | null;
  endereco: string | null;
  telefone: string | null;
  email: string | null;
  cor_primaria: string;
  cor_secundaria: string;
  logo_url: string | null;
}

// Auth helpers
export async function signUpUser(email: string, password: string, nome: string, cpf?: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        nome,
        cpf
      },
      emailRedirectTo: `${window.location.origin}/`
    }
  });

  if (error) {
    toast.error(error.message);
    return { success: false, error };
  }

  toast.success("Usuário criado com sucesso!");
  return { success: true, data };
}

export async function signInUser(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    toast.error(error.message);
    return { success: false, error };
  }

  return { success: true, data };
}

export async function signOutUser() {
  const { error } = await supabase.auth.signOut();
  
  if (error) {
    toast.error(error.message);
    return { success: false, error };
  }

  toast.info("Sessão encerrada");
  return { success: true };
}

// Profile helpers
export async function getCurrentUserProfile() {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error) {
    console.error('Error fetching profile:', error);
    return null;
  }

  return data as Profile;
}

export async function getUserPermissions(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .rpc('get_user_permissions', { _user_id: userId });

  if (error) {
    console.error('Error fetching permissions:', error);
    return [];
  }

  return (data || []).map((row: { permissao_nome: string }) => row.permissao_nome);
}

export async function getUserRoles(userId: string): Promise<UserRole[]> {
  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId);

  if (error) {
    console.error('Error fetching roles:', error);
    return [];
  }

  return data as UserRole[];
}

export async function assignRoleToUser(userId: string, role: string) {
  const { error } = await supabase
    .from('user_roles')
    .insert([{ user_id: userId, role: role as any }]);

  if (error) {
    toast.error("Erro ao atribuir perfil");
    return { success: false, error };
  }

  toast.success("Perfil atribuído com sucesso!");
  return { success: true };
}

// Store config helpers
export async function getStoreConfig() {
  const { data, error } = await supabase
    .from('loja_config')
    .select('*')
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Error fetching store config:', error);
    return null;
  }

  return data as StoreConfig | null;
}

export async function updateStoreConfig(config: Partial<StoreConfig>) {
  // First, check if a config exists
  const existing = await getStoreConfig();

  if (existing) {
    // Update existing config
    const { error } = await supabase
      .from('loja_config')
      .update(config as any)
      .eq('id', existing.id);

    if (error) {
      toast.error("Erro ao atualizar configurações");
      return { success: false, error };
    }
  } else {
    // Create new config
    const { error } = await supabase
      .from('loja_config')
      .insert([config as any]);

    if (error) {
      toast.error("Erro ao salvar configurações");
      return { success: false, error };
    }
  }

  toast.success("Configurações salvas com sucesso!");
  return { success: true };
}

// Permissions helpers
export async function getAllPermissions() {
  const { data, error } = await supabase
    .from('permissoes')
    .select('*')
    .order('nome');

  if (error) {
    console.error('Error fetching permissions:', error);
    return [];
  }

  return data as Permission[];
}

export async function getAllProfiles() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('nome');

  if (error) {
    console.error('Error fetching profiles:', error);
    return [];
  }

  return data as Profile[];
}
