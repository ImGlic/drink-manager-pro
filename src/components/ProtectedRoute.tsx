import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { ROTAS } from "@/lib/permissoes";
import Layout from "@/components/Layout";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission?: string;
  /** Rotas como o cadastro de bar não exigem bar selecionado. */
  semBar?: boolean;
}

export const Carregando = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full" />
  </div>
);

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredPermission, semBar }) => {
  const { currentUser, isLoading, hasPermission, barAtivo } = useAuth();
  const location = useLocation();

  if (isLoading) return <Carregando />;

  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (semBar) return <>{children}</>;

  if (!barAtivo) return <Navigate to="/cadastro-bar" replace />;

  if (requiredPermission && !hasPermission(requiredPermission)) {
    const alternativa = ROTAS.find((r) => hasPermission(r.permissao));
    if (alternativa && alternativa.path !== location.pathname) {
      return <Navigate to={alternativa.path} replace />;
    }
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center text-center gap-3 py-24">
          <ShieldAlert className="h-12 w-12 text-muted-foreground" />
          <h2 className="text-xl font-semibold">Sem acesso</h2>
          <p className="text-muted-foreground max-w-sm">
            Seu perfil no bar "{barAtivo.bar.nome}" não tem permissão para esta área. Fale com o administrador do bar.
          </p>
        </div>
      </Layout>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
