
import React, { useState, useEffect } from "react";
import { Wine } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { FadeIn } from "@/components/ui/motion";

const Login = () => {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [lembrar, setLembrar] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, currentUser } = useAuth();
  const navigate = useNavigate();

  // If user is already logged in, redirect to home
  useEffect(() => {
    if (currentUser) {
      navigate("/");
    }
  }, [currentUser, navigate]);

  // Load remembered email if available
  useEffect(() => {
    const rememberedEmail = localStorage.getItem("rememberedEmail");
    if (rememberedEmail) {
      setEmail(rememberedEmail);
      setLembrar(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !senha) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const success = await login(email, senha);
      
      if (success) {
        // Handle "remember me" option
        if (lembrar) {
          localStorage.setItem("rememberedEmail", email);
        } else {
          localStorage.removeItem("rememberedEmail");
        }
        
        navigate("/");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check if we need to create a demo user
  useEffect(() => {
    const usuarios = localStorage.getItem("usuarios");
    if (!usuarios || JSON.parse(usuarios).length === 0) {
      // Create default admin user if no users exist
      const defaultPerfil = {
        id: "admin-perfil",
        nome: "Administrador",
        descricao: "Acesso completo ao sistema",
        permissoes: ["dashboard", "estoque", "vendas", "configuracoes", "usuarios", "perfis", "permissoes"]
      };
      
      const defaultUser = {
        id: "admin-user",
        nome: "Administrador",
        email: "admin@robinhowhiskeria.com",
        senha: "admin123",
        cpf: "000.000.000-00",
        perfil: defaultPerfil
      };
      
      // Initialize the users array with the default admin
      localStorage.setItem("usuarios", JSON.stringify([defaultUser]));
      
      // Also initialize perfis if not exists
      const perfis = localStorage.getItem("perfis");
      if (!perfis) {
        localStorage.setItem("perfis", JSON.stringify([defaultPerfil]));
      }
      
      console.log("Created default admin user:", defaultUser.email);
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-100 to-amber-50 p-4">
      <FadeIn>
        <div className="w-full max-w-md bg-white/90 backdrop-blur-sm p-8 rounded-xl shadow-lg border border-amber-100">
          <div className="flex flex-col items-center mb-8">
            <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 mb-4">
              <Wine className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-2xl font-display font-medium">
              <span className="text-primary">Robinho</span>Whiskeria
            </h1>
            <p className="text-muted-foreground mt-2 text-center">
              Faça login para acessar o sistema
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu.email@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="senha">Senha</Label>
              <Input
                id="senha"
                type="password"
                placeholder="********"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="lembrar"
                  checked={lembrar}
                  onCheckedChange={(checked) => 
                    setLembrar(checked === true)
                  }
                />
                <Label
                  htmlFor="lembrar"
                  className="text-sm font-normal cursor-pointer"
                >
                  Lembrar-me
                </Label>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Entrando..." : "Entrar"}
            </Button>

            <div className="text-center text-sm text-muted-foreground mt-4">
              <span>Usuário padrão: </span>
              <span className="font-medium">admin@robinhowhiskeria.com</span>
              <br />
              <span>Senha: </span>
              <span className="font-medium">admin123</span>
            </div>
          </form>
        </div>
      </FadeIn>
    </div>
  );
};

export default Login;
