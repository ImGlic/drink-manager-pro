import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { BarChart3, Check, ChevronsUpDown, LogOut, Plus, Settings, ShoppingCart, Store, User, Wine } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { LogoMarca } from "@/components/Logo";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const LINKS = [
  { to: "/", icon: BarChart3, label: "Dashboard", permission: "dashboard" },
  { to: "/vendas", icon: ShoppingCart, label: "Vendas", permission: "vendas" },
  { to: "/estoque", icon: Wine, label: "Estoque", permission: "estoque" },
  { to: "/configuracoes", icon: Settings, label: "Ajustes", permission: null },
];

const SeletorBar: React.FC = () => {
  const { bares, barAtivo, selecionarBar } = useAuth();
  const navigate = useNavigate();
  if (!barAtivo) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-auto px-2 py-1 gap-2 max-w-[60vw] sm:max-w-xs">
          {barAtivo.bar.logo_url ? (
            <img src={barAtivo.bar.logo_url} alt="" className="h-8 w-8 rounded-full object-cover shrink-0" />
          ) : (
            <LogoMarca className="h-8 w-8" />
          )}
          <div className="flex flex-col items-start min-w-0">
            <span className="font-display font-medium truncate max-w-full">{barAtivo.bar.nome}</span>
            <span className="text-xs text-muted-foreground truncate max-w-full">{barAtivo.perfil?.nome}</span>
          </div>
          <ChevronsUpDown className="h-4 w-4 opacity-50 shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Seus bares</DropdownMenuLabel>
        {bares.map((b) => (
          <DropdownMenuItem key={b.bar.id} onClick={() => selecionarBar(b.bar.id)}>
            <Store className="mr-2 h-4 w-4" />
            <span className="flex-1 truncate">{b.bar.nome}</span>
            {b.bar.id === barAtivo.bar.id && <Check className="h-4 w-4" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate("/cadastro-bar")}>
          <Plus className="mr-2 h-4 w-4" /> Cadastrar novo bar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const Navbar: React.FC = () => {
  const location = useLocation();
  const { currentUser, logout, hasPermission } = useAuth();
  const links = LINKS.filter((l) => !l.permission || hasPermission(l.permission));

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-background/90 backdrop-blur-md border-b pt-[env(safe-area-inset-top)]">
        <div className="container max-w-7xl mx-auto px-3 sm:px-4 py-2 flex items-center justify-between gap-2">
          <SeletorBar />

          <nav className="hidden md:flex items-center gap-1">
            {links.map(({ to, icon: Icon, label }) => (
              <Link
                key={to}
                to={to}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg transition-colors hover:bg-primary/10",
                  location.pathname === to ? "bg-primary/10 text-primary font-medium" : "text-foreground/80"
                )}
              >
                <Icon className="h-5 w-5" />
                <span>{label}</span>
              </Link>
            ))}
          </nav>

          {currentUser && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2 shrink-0">
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline max-w-[140px] truncate">{currentUser.nome}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span>{currentUser.nome}</span>
                    <span className="text-xs text-muted-foreground">{currentUser.email}</span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sair</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </header>

      {/* Navegação inferior no celular */}
      {links.length > 1 && (
        <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-background border-t pb-[env(safe-area-inset-bottom)]">
          <div className="grid" style={{ gridTemplateColumns: `repeat(${links.length}, minmax(0, 1fr))` }}>
            {links.map(({ to, icon: Icon, label }) => (
              <Link
                key={to}
                to={to}
                className={cn(
                  "flex flex-col items-center gap-0.5 py-2 text-xs",
                  location.pathname === to ? "text-primary font-medium" : "text-muted-foreground"
                )}
              >
                <Icon className="h-5 w-5" />
                {label}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </>
  );
};

export default Navbar;
