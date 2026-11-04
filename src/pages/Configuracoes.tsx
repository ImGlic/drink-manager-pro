import React from "react";
import Layout from "@/components/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/context/AuthContext";
import AbaBar from "@/components/configuracoes/AbaBar";
import AbaUsuarios from "@/components/configuracoes/AbaUsuarios";
import AbaPerfis from "@/components/configuracoes/AbaPerfis";
import AbaFiscal from "@/components/configuracoes/AbaFiscal";
import AbaImpressora from "@/components/configuracoes/AbaImpressora";

const Configuracoes = () => {
  const { hasPermission } = useAuth();

  const abas = [
    { id: "bar", nome: "Bar", permitido: hasPermission("configuracoes"), el: <AbaBar /> },
    { id: "usuarios", nome: "Usuários", permitido: hasPermission("usuarios"), el: <AbaUsuarios /> },
    { id: "perfis", nome: "Perfis", permitido: hasPermission("perfis") || hasPermission("usuarios"), el: <AbaPerfis /> },
    { id: "fiscal", nome: "Fiscal", permitido: hasPermission("configuracoes"), el: <AbaFiscal /> },
    { id: "impressora", nome: "Impressora", permitido: true, el: <AbaImpressora /> },
  ].filter((a) => a.permitido);

  return (
    <Layout>
      <div className="space-y-4">
        <h2 className="text-2xl sm:text-3xl font-display font-semibold tracking-tight">Ajustes</h2>
        <Tabs defaultValue={abas[0]?.id} className="w-full">
          <TabsList className="w-full justify-start overflow-x-auto h-auto">
            {abas.map((a) => (
              <TabsTrigger key={a.id} value={a.id}>
                {a.nome}
              </TabsTrigger>
            ))}
          </TabsList>
          {abas.map((a) => (
            <TabsContent key={a.id} value={a.id} className="mt-4">
              {a.el}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </Layout>
  );
};

export default Configuracoes;
