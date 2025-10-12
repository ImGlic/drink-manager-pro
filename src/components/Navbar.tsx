
import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Wine, ShoppingCart, BarChart3, Settings, Menu, X, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/context/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NavLinkProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  permission?: string;
}

const NavLink: React.FC<NavLinkProps> = ({ to, icon, label, isActive, permission }) => {
  const { hasPermission } = useAuth();
  
  // Don't render if user doesn't have permission
  if (permission && !hasPermission(permission)) {
    return null;
  }
  
  return (
    <Link
      to={to}
      className={cn(
        "flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200",
        "hover:bg-primary/10",
        isActive 
          ? "bg-primary/10 text-primary font-medium" 
          : "text-foreground/80"
      )}
    >
      {icon}
      <span>{label}</span>
      {isActive && (
        <div className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />
      )}
    </Link>
  );
};

const Navbar: React.FC = () => {
  const location = useLocation();
  const isMobile = useIsMobile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { currentUser, logout } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
  }, [mobileMenuOpen]);

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const links = [
    {
      to: "/",
      icon: <BarChart3 className="h-5 w-5" />,
      label: "Dashboard",
      permission: "dashboard"
    },
    {
      to: "/estoque",
      icon: <Wine className="h-5 w-5" />,
      label: "Estoque",
      permission: "estoque"
    },
    {
      to: "/vendas",
      icon: <ShoppingCart className="h-5 w-5" />,
      label: "Vendas",
      permission: "vendas"
    },
    {
      to: "/configuracoes",
      icon: <Settings className="h-5 w-5" />,
      label: "Configurações",
      permission: "configuracoes"
    },
  ];

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full transition-all duration-300",
        scrolled
          ? "bg-white/80 backdrop-blur-md shadow-sm border-b"
          : "bg-transparent"
      )}
    >
      <div className="container max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wine className="h-8 w-8 text-primary" />
          <h1 className="text-xl font-display font-medium">
            <span className="text-primary">Robinho</span>Whiskeria
          </h1>
        </div>

        {isMobile ? (
          <div className="flex items-center gap-2">
            {currentUser && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <User className="h-5 w-5" />
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
            
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? "Fechar menu" : "Abrir menu"}
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          </div>
        ) : (
          <div className="flex items-center">
            <nav className="flex items-center space-x-1 mr-4">
              {links.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  icon={link.icon}
                  label={link.label}
                  isActive={location.pathname === link.to}
                  permission={link.permission}
                />
              ))}
            </nav>
            
            {currentUser && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2">
                    <User className="h-4 w-4" />
                    <span>{currentUser.nome}</span>
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
        )}
      </div>

      {/* Mobile menu */}
      {isMobile && (
        <div
          className={cn(
            "fixed inset-0 bg-background/80 backdrop-blur-sm z-50 transition-all duration-300 lg:hidden",
            mobileMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          )}
        >
          <div className="absolute inset-x-0 top-16 p-4 flex flex-col space-y-1 bg-white rounded-b-xl shadow-elevated border">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                icon={link.icon}
                label={link.label}
                isActive={location.pathname === link.to}
                permission={link.permission}
              />
            ))}
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
