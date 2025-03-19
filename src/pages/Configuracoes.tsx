
import React from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { SlideInFromBottom, FadeIn } from "@/components/ui/motion";

const Configuracoes = () => {
  return (
    <Layout>
      <div className="space-y-6">
        <SlideInFromBottom>
          <div>
            <h2 className="text-3xl font-display font-semibold tracking-tight">Configurações</h2>
            <p className="text-muted-foreground">
              Personalize o sistema de acordo com as necessidades da sua loja
            </p>
          </div>
        </SlideInFromBottom>

        <FadeIn>
          <Tabs defaultValue="geral" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="geral">Geral</TabsTrigger>
              <TabsTrigger value="loja">Loja</TabsTrigger>
              <TabsTrigger value="fiscal">Fiscal</TabsTrigger>
              <TabsTrigger value="usuarios">Usuários</TabsTrigger>
            </TabsList>

            <TabsContent value="geral" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Configurações Gerais</CardTitle>
                  <CardDescription>
                    Configure as opções básicas do sistema
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="nome-empresa">Nome da Empresa</Label>
                      <Input id="nome-empresa" defaultValue="Loja de Bebidas" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="telefone">Telefone</Label>
                      <Input id="telefone" defaultValue="(11) 98765-4321" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">E-mail</Label>
                      <Input id="email" type="email" defaultValue="contato@bebidas.com" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="website">Website</Label>
                      <Input id="website" defaultValue="www.bebidas.com" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="endereco">Endereço</Label>
                    <Input id="endereco" defaultValue="Rua das Bebidas, 123 - Centro" />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="notificacoes">Notificações por e-mail</Label>
                      <p className="text-sm text-muted-foreground">
                        Receba alertas e relatórios por e-mail
                      </p>
                    </div>
                    <Switch id="notificacoes" defaultChecked />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="autosave">Salvamento automático</Label>
                      <p className="text-sm text-muted-foreground">
                        Salvar alterações automaticamente
                      </p>
                    </div>
                    <Switch id="autosave" defaultChecked />
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button>
                  Salvar Alterações
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="loja" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Configurações da Loja</CardTitle>
                  <CardDescription>
                    Configure os parâmetros da sua loja física e online
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Configurações de loja serão implementadas em breve.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="fiscal" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Configurações Fiscais</CardTitle>
                  <CardDescription>
                    Configure os parâmetros fiscais e tributários
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Configurações fiscais serão implementadas em breve.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="usuarios" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Gerenciar Usuários</CardTitle>
                  <CardDescription>
                    Adicione e gerencie usuários do sistema
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Gestão de usuários será implementada em breve.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </FadeIn>
      </div>
    </Layout>
  );
};

export default Configuracoes;
