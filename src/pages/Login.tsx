
import React, { useState, useEffect } from "react";
import { Wine } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { FadeIn } from "@/components/ui/motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { signUpUser } from "@/lib/supabase-helpers";

const Login = () => {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
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

  const handleLogin = async (e: React.FormEvent) => {
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

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !senha || !nome) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const result = await signUpUser(email, senha, nome, cpf || undefined);
      
      if (result.success) {
        // Auto-login after signup
        await login(email, senha);
        navigate("/");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

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
              Sistema de Gestão
            </p>
          </div>

          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="signup">Cadastro</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-5">
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
              </form>
            </TabsContent>
            
            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="signup-nome">Nome completo</Label>
                  <Input
                    id="signup-nome"
                    type="text"
                    placeholder="Seu nome"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="seu.email@exemplo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-cpf">CPF (opcional)</Label>
                  <Input
                    id="signup-cpf"
                    type="text"
                    placeholder="000.000.000-00"
                    value={cpf}
                    onChange={(e) => setCpf(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-senha">Senha</Label>
                  <Input
                    id="signup-senha"
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Criando conta..." : "Criar conta"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </FadeIn>
    </div>
  );
};

export default Login;
