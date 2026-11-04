import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { FadeIn } from "@/components/ui/motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import Logo from "@/components/Logo";
import { toast } from "sonner";

const Login = () => {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [lembrar, setLembrar] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, currentUser, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Já logado: volta para a página de origem (ou dashboard)
  useEffect(() => {
    if (currentUser && !isLoading) {
      const destino = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? "/";
      navigate(destino, { replace: true });
    }
  }, [currentUser, isLoading, navigate, location.state]);

  useEffect(() => {
    try {
      const rememberedEmail = localStorage.getItem("rememberedEmail");
      if (rememberedEmail) {
        setEmail(rememberedEmail);
        setLembrar(true);
      }
    } catch {
      /* armazenamento indisponível */
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !senha) {
      toast.warning("Preencha todos os campos!");
      return;
    }
    setIsSubmitting(true);
    try {
      const success = await login(email, senha);
      if (success) {
        try {
          if (lembrar) localStorage.setItem("rememberedEmail", email);
          else localStorage.removeItem("rememberedEmail");
        } catch {
          /* armazenamento indisponível */
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !senha || !nome) {
      toast.warning("Preencha todos os campos obrigatórios!");
      return;
    }
    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password: senha,
        options: { data: { nome, cpf: cpf || null }, emailRedirectTo: `${window.location.origin}/` },
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      if (!data.session) {
        toast.success("Conta criada! Confirme o cadastro pelo link enviado ao seu e-mail.");
        return;
      }
      toast.success("Conta criada! Agora cadastre o seu bar.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      {/* Painel da marca (desktop) */}
      <aside className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-[#1c1410] p-12 text-amber-50">
        <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-amber-600/25 blur-3xl" />
        <div className="absolute -bottom-40 -left-24 h-96 w-96 rounded-full bg-orange-900/40 blur-3xl" />
        <Logo tamanho="lg" claro className="relative" />
        <div className="relative space-y-6 max-w-md">
          <h2 className="text-4xl leading-tight text-amber-50">
            O caixa do seu bar, <span className="text-amber-400">no balcão e no bolso.</span>
          </h2>
          <ul className="space-y-3 text-amber-100/80">
            {[
              "Vendas pelo computador ou pelo celular do garçom",
              "Leitor de código de barras, câmera e QR Code",
              "NFC-e e cupom na impressora térmica",
              "Estoque, equipe e relatórios por bar",
            ].map((item) => (
              <li key={item} className="flex items-center gap-3">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-sm text-amber-100/50">© {new Date().getFullYear()} Meu Bar</p>
      </aside>

      {/* Formulário */}
      <main className="flex items-center justify-center p-4 sm:p-8">
        <FadeIn className="w-full max-w-sm">
          <div className="flex flex-col items-center lg:items-start mb-8">
            <Logo tamanho="lg" className="lg:hidden mb-6" />
            <h1 className="text-3xl">Bem-vindo</h1>
            <p className="text-muted-foreground mt-1">Entre para abrir o caixa.</p>
          </div>

          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Criar conta</TabsTrigger>
            </TabsList>

            {/* LOGIN */}
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

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? "Entrando..." : "Entrar"}
                </Button>
              </form>
            </TabsContent>

            {/* CADASTRO */}
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

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? "Criando conta..." : "Criar conta"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </FadeIn>
      </main>
    </div>
  );
};

export default Login;
