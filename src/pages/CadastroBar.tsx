import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { LogoMarca } from "@/components/Logo";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import FormDadosBar, { valoresVazios, type ValoresBar } from "@/components/configuracoes/FormDadosBar";
import { useAuth } from "@/context/AuthContext";
import { criarBar } from "@/services/baresService";
import { mensagemErro } from "@/lib/format";

/** Onboarding: cadastro de um novo bar. Quem cadastra vira Administrador dele. */
const CadastroBar = () => {
  const [valores, setValores] = useState<ValoresBar>(valoresVazios);
  const [salvando, setSalvando] = useState(false);
  const { recarregarBares, selecionarBar, bares, logout, currentUser } = useAuth();
  const navigate = useNavigate();

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valores.nome?.trim()) {
      toast.warning("Informe o nome do bar.");
      return;
    }
    setSalvando(true);
    try {
      const id = await criarBar({ ...valores, nome: valores.nome.trim() });
      await recarregarBares();
      selecionarBar(id);
      toast.success("Bar cadastrado! Agora cadastre seus produtos.");
      navigate("/estoque");
    } catch (error) {
      toast.error(mensagemErro(error, "Erro ao cadastrar o bar"));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="min-h-screen bg-background py-8 px-3">
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <LogoMarca className="h-12 w-12" />
            <div>
              <h1 className="text-2xl font-display font-semibold">Cadastrar bar</h1>
              <p className="text-sm text-muted-foreground">Olá, {currentUser?.nome}. Você será o administrador.</p>
            </div>
          </div>
          {bares.length === 0 ? (
            <Button variant="ghost" size="sm" onClick={logout}>
              <LogOut className="h-4 w-4 mr-2" /> Sair
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              Voltar
            </Button>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Dados do estabelecimento</CardTitle>
            <CardDescription>
              Só o nome é obrigatório agora. CNPJ, inscrição estadual e endereço completo são necessários para
              emitir NFC-e e podem ser preenchidos depois em Ajustes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={salvar} className="space-y-6">
              <FormDadosBar valores={valores} onChange={setValores} desabilitado={salvando} />
              <Button type="submit" size="lg" className="w-full" disabled={salvando}>
                {salvando ? "Cadastrando..." : "Cadastrar bar"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CadastroBar;
