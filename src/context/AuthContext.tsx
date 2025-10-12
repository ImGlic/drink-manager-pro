
import React, { createContext, useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { 
  signInUser, 
  signOutUser, 
  getCurrentUserProfile, 
  getUserPermissions,
  Profile 
} from "@/lib/supabase-helpers";

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  permissions: string[];
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
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<Usuario | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // Load user from Supabase on mount
  useEffect(() => {
    const loadUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        await updateCurrentUser(session.user);
      }
      
      setIsLoading(false);
    };

    loadUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          await updateCurrentUser(session.user);
        } else {
          setCurrentUser(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const updateCurrentUser = async (user: User) => {
    const profile = await getCurrentUserProfile();
    const permissions = await getUserPermissions(user.id);

    if (profile) {
      setCurrentUser({
        id: user.id,
        nome: profile.nome,
        email: user.email || "",
        permissions
      });
    }
  };

  const login = async (email: string, senha: string): Promise<boolean> => {
    setIsLoading(true);
    
    try {
      const result = await signInUser(email, senha);
      
      if (result.success && result.data.user) {
        await updateCurrentUser(result.data.user);
        toast.success("Login realizado com sucesso!");
        setIsLoading(false);
        return true;
      }
      
      setIsLoading(false);
      return false;
    } catch (error) {
      console.error("Login error:", error);
      toast.error("Erro ao fazer login");
      setIsLoading(false);
      return false;
    }
  };

  const logout = async () => {
    await signOutUser();
    setCurrentUser(null);
    navigate("/login");
  };

  const hasPermission = (permission: string): boolean => {
    if (!currentUser) return false;
    return currentUser.permissions.includes(permission);
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
