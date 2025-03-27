
import React, { createContext, useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  perfil: {
    id: string;
    nome: string;
    permissoes: string[];
  };
}

interface AuthContextType {
  currentUser: Usuario | null;
  login: (email: string, senha: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<Usuario | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // Load user from localStorage on initial load
  useEffect(() => {
    const storedUser = localStorage.getItem("currentUser");
    if (storedUser) {
      try {
        setCurrentUser(JSON.parse(storedUser));
      } catch (error) {
        console.error("Failed to parse stored user", error);
        localStorage.removeItem("currentUser");
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, senha: string): Promise<boolean> => {
    setIsLoading(true);
    
    try {
      // In a real app, this would be an API call
      // For now, we'll use mock data from localStorage
      const usuariosString = localStorage.getItem("usuarios");
      
      if (!usuariosString) {
        toast.error("Nenhum usuário cadastrado no sistema");
        setIsLoading(false);
        return false;
      }
      
      const usuarios = JSON.parse(usuariosString);
      const user = usuarios.find(
        (u: any) => u.email === email && u.senha === senha
      );
      
      if (!user) {
        toast.error("Email ou senha incorretos");
        setIsLoading(false);
        return false;
      }
      
      // Store user in state and localStorage
      const userWithoutSenha = {
        id: user.id,
        nome: user.nome,
        email: user.email,
        perfil: user.perfil
      };
      
      setCurrentUser(userWithoutSenha);
      localStorage.setItem("currentUser", JSON.stringify(userWithoutSenha));
      toast.success(`Bem-vindo, ${user.nome}!`);
      
      setIsLoading(false);
      return true;
    } catch (error) {
      console.error("Login error:", error);
      toast.error("Erro ao fazer login");
      setIsLoading(false);
      return false;
    }
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem("currentUser");
    toast.info("Sessão encerrada");
    navigate("/login");
  };

  const hasPermission = (permission: string): boolean => {
    if (!currentUser) return false;
    return currentUser.perfil.permissoes.includes(permission);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        login,
        logout,
        isLoading,
        hasPermission
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
