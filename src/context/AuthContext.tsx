import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export interface Usuario {
  id: string;
  nome: string;
  email: string;
}

export type Bar = Tables<"bares">;

export interface PerfilAcesso {
  id: string;
  nome: string;
  is_admin: boolean;
  permissoes: string[];
}

export interface BarMembro {
  membroId: string;
  bar: Bar;
  perfil: PerfilAcesso | null;
}

interface AuthContextType {
  currentUser: Usuario | null;
  isLoading: boolean;
  login: (email: string, senha: string) => Promise<boolean>;
  logout: () => Promise<void>;
  bares: BarMembro[];
  barAtivo: BarMembro | null;
  selecionarBar: (barId: string) => void;
  recarregarBares: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const BAR_ATIVO_KEY = "dmp:bar-ativo";

const lerBarSalvo = () => {
  try {
    return localStorage.getItem(BAR_ATIVO_KEY);
  } catch {
    return null;
  }
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};

/** Atalho para o id do bar ativo (lança erro se não houver bar selecionado). */
export const useBarId = () => {
  const { barAtivo } = useAuth();
  return barAtivo?.bar.id ?? null;
};

async function carregarBares(userId: string): Promise<BarMembro[]> {
  const { data, error } = await supabase
    .from("bar_membros")
    .select("id, ativo, bar:bares(*), perfil:perfis(id, nome, is_admin, permissoes)")
    .eq("user_id", userId)
    .eq("ativo", true);

  if (error) throw error;

  return (data ?? [])
    .filter((m) => m.bar && m.bar.ativo)
    .map((m) => ({
      membroId: m.id,
      bar: m.bar as Bar,
      perfil: (m.perfil as PerfilAcesso | null) ?? null,
    }))
    .sort((a, b) => a.bar.nome.localeCompare(b.bar.nome));
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<Usuario | null>(null);
  const [bares, setBares] = useState<BarMembro[]>([]);
  const [barAtivoId, setBarAtivoId] = useState<string | null>(lerBarSalvo);
  const [isLoading, setIsLoading] = useState(true);

  const carregarUsuario = useCallback(async (user: User) => {
    try {
      const [{ data: profile }, lista] = await Promise.all([
        supabase.from("profiles").select("nome").eq("id", user.id).maybeSingle(),
        carregarBares(user.id),
      ]);

      setCurrentUser({
        id: user.id,
        nome: profile?.nome ?? user.email ?? "Usuário",
        email: user.email ?? "",
      });
      setBares(lista);
    } catch (error) {
      console.error("Erro ao carregar usuário:", error);
      toast.error("Não foi possível carregar seus dados. Verifique a conexão.");
      setCurrentUser({ id: user.id, nome: user.email ?? "Usuário", email: user.email ?? "" });
      setBares([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Importante: não usar await de chamadas do supabase dentro do callback
    // onAuthStateChange (causa deadlock no supabase-js). Por isso o setTimeout.
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "TOKEN_REFRESHED") return;
      if (session?.user) {
        const user = session.user;
        setTimeout(() => carregarUsuario(user), 0);
      } else {
        setCurrentUser(null);
        setBares([]);
        setIsLoading(false);
      }
    });

    return () => data.subscription.unsubscribe();
  }, [carregarUsuario]);

  const barAtivo = useMemo(() => {
    if (bares.length === 0) return null;
    return bares.find((b) => b.bar.id === barAtivoId) ?? bares[0];
  }, [bares, barAtivoId]);

  const selecionarBar = useCallback((barId: string) => {
    setBarAtivoId(barId);
    try {
      localStorage.setItem(BAR_ATIVO_KEY, barId);
    } catch {
      /* armazenamento indisponível: segue só em memória */
    }
  }, []);

  const recarregarBares = useCallback(async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) setBares(await carregarBares(data.user.id));
  }, []);

  const login = async (email: string, senha: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    if (error) {
      toast.error(error.message === "Invalid login credentials" ? "E-mail ou senha inválidos." : error.message);
      return false;
    }
    return true;
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Erro ao sair da conta.");
      return;
    }
    toast.info("Você saiu da sua conta.");
  };

  const hasPermission = useCallback(
    (permission: string) => {
      const perfil = barAtivo?.perfil;
      if (!perfil) return false;
      return perfil.is_admin || perfil.permissoes.includes(permission);
    },
    [barAtivo]
  );

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isLoading,
        login,
        logout,
        bares,
        barAtivo,
        selecionarBar,
        recarregarBares,
        hasPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
