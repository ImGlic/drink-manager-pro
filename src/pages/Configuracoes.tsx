
import React, { useState } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { SlideInFromBottom, FadeIn } from "@/components/ui/motion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Edit, Trash2, UserPlus, UserCog, Shield, KeyRound, Plus, X } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";

// Tipos de perfil e permissões
interface Perfil {
  id: string;
  nome: string;
  descricao: string;
}

interface Permissao {
  id: string;
  nome: string;
  descricao: string;
}

interface Usuario {
  id: string;
  nome: string;
  email: string;
  cpf: string;
  perfilId: string;
}

const Configuracoes = () => {
  const { toast } = useToast();
  const [activeUserTab, setActiveUserTab] = useState<string>("usuarios");
  const [perfis, setPerfis] = useState<Perfil[]>([
    { id: "1", nome: "Gerente", descricao: "Acesso completo ao sistema" },
    { id: "2", nome: "Caixa", descricao: "Acesso apenas às vendas e consulta de estoque" },
  ]);

  const [permissoes, setPermissoes] = useState<Permissao[]>([
    { id: "1", nome: "dashboard", descricao: "Acesso ao Dashboard" },
    { id: "2", nome: "estoque", descricao: "Acesso ao Estoque" },
    { id: "3", nome: "vendas", descricao: "Acesso às Vendas" },
    { id: "4", nome: "configuracoes", descricao: "Acesso às Configurações" },
  ]);

  const [usuarios, setUsuarios] = useState<Usuario[]>([
    { id: "1", nome: "Admin", email: "admin@bebidas.com", cpf: "123.456.789-00", perfilId: "1" },
  ]);

  const [perfilPermissoes, setPerfilPermissoes] = useState<Record<string, string[]>>({
    "1": ["1", "2", "3", "4"], // Gerente tem todas as permissões
    "2": ["1", "2", "3"], // Caixa não tem acesso às configurações
  });

  const [editingPerfil, setEditingPerfil] = useState<Perfil | null>(null);
  const [editingUsuario, setEditingUsuario] = useState<Usuario | null>(null);
  const [showPerfilForm, setShowPerfilForm] = useState(false);
  const [showUsuarioForm, setShowUsuarioForm] = useState(false);

  // Esquema de validação para o formulário de perfil
  const perfilSchema = z.object({
    nome: z.string().min(2, { message: "Nome deve ter pelo menos 2 caracteres" }),
    descricao: z.string().min(5, { message: "Descrição deve ter pelo menos 5 caracteres" })
  });

  // Esquema de validação para o formulário de usuário
  const usuarioSchema = z.object({
    nome: z.string().min(2, { message: "Nome deve ter pelo menos 2 caracteres" }),
    email: z.string().email({ message: "Email inválido" }),
    cpf: z.string().regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, { message: "CPF inválido (formato: 123.456.789-00)" }),
    senha: z.string().min(6, { message: "Senha deve ter pelo menos 6 caracteres" }),
    perfilId: z.string({ required_error: "Selecione um perfil" })
  });

  // Formulário de perfil
  const perfilForm = useForm<z.infer<typeof perfilSchema>>({
    resolver: zodResolver(perfilSchema),
    defaultValues: {
      nome: "",
      descricao: ""
    }
  });

  // Formulário de usuário
  const usuarioForm = useForm<z.infer<typeof usuarioSchema>>({
    resolver: zodResolver(usuarioSchema),
    defaultValues: {
      nome: "",
      email: "",
      cpf: "",
      senha: "",
      perfilId: ""
    }
  });

  // Funções para manipulação de perfis
  const handlePerfilSubmit = (values: z.infer<typeof perfilSchema>) => {
    if (editingPerfil) {
      setPerfis(perfis.map(p => p.id === editingPerfil.id ? { ...p, ...values } : p));
      toast({
        title: "Perfil atualizado",
        description: `O perfil ${values.nome} foi atualizado com sucesso.`
      });
    } else {
      const newPerfil = {
        id: Date.now().toString(),
        ...values
      };
      setPerfis([...perfis, newPerfil]);
      setPerfilPermissoes({
        ...perfilPermissoes,
        [newPerfil.id]: []
      });
      toast({
        title: "Perfil criado",
        description: `O perfil ${values.nome} foi criado com sucesso.`
      });
    }
    setEditingPerfil(null);
    setShowPerfilForm(false);
    perfilForm.reset();
  };

  const handleEditPerfil = (perfil: Perfil) => {
    setEditingPerfil(perfil);
    perfilForm.reset({
      nome: perfil.nome,
      descricao: perfil.descricao
    });
    setShowPerfilForm(true);
  };

  const handleDeletePerfil = (id: string) => {
    // Verificar se há usuários com este perfil
    const usuariosComPerfil = usuarios.filter(u => u.perfilId === id);
    if (usuariosComPerfil.length > 0) {
      toast({
        title: "Não é possível excluir",
        description: "Existem usuários vinculados a este perfil.",
        variant: "destructive"
      });
      return;
    }
    
    setPerfis(perfis.filter(p => p.id !== id));
    const newPerfilPermissoes = { ...perfilPermissoes };
    delete newPerfilPermissoes[id];
    setPerfilPermissoes(newPerfilPermissoes);
    toast({
      title: "Perfil excluído",
      description: "O perfil foi excluído com sucesso."
    });
  };

  // Funções para manipulação de permissões
  const togglePermissao = (perfilId: string, permissaoId: string) => {
    const currentPermissions = perfilPermissoes[perfilId] || [];
    if (currentPermissions.includes(permissaoId)) {
      setPerfilPermissoes({
        ...perfilPermissoes,
        [perfilId]: currentPermissions.filter(id => id !== permissaoId)
      });
    } else {
      setPerfilPermissoes({
        ...perfilPermissoes,
        [perfilId]: [...currentPermissions, permissaoId]
      });
    }
  };

  // Funções para manipulação de usuários
  const handleUsuarioSubmit = (values: z.infer<typeof usuarioSchema>) => {
    if (editingUsuario) {
      setUsuarios(usuarios.map(u => u.id === editingUsuario.id ? { ...u, nome: values.nome, email: values.email, cpf: values.cpf, perfilId: values.perfilId } : u));
      toast({
        title: "Usuário atualizado",
        description: `O usuário ${values.nome} foi atualizado com sucesso.`
      });
    } else {
      const newUsuario = {
        id: Date.now().toString(),
        nome: values.nome,
        email: values.email,
        cpf: values.cpf,
        perfilId: values.perfilId
      };
      setUsuarios([...usuarios, newUsuario]);
      toast({
        title: "Usuário criado",
        description: `O usuário ${values.nome} foi criado com sucesso.`
      });
    }
    setEditingUsuario(null);
    setShowUsuarioForm(false);
    usuarioForm.reset();
  };

  const handleEditUsuario = (usuario: Usuario) => {
    setEditingUsuario(usuario);
    usuarioForm.reset({
      nome: usuario.nome,
      email: usuario.email,
      cpf: usuario.cpf,
      senha: "",
      perfilId: usuario.perfilId
    });
    setShowUsuarioForm(true);
  };

  const handleDeleteUsuario = (id: string) => {
    setUsuarios(usuarios.filter(u => u.id !== id));
    toast({
      title: "Usuário excluído",
      description: "O usuário foi excluído com sucesso."
    });
  };

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
              {/* Mantendo o conteúdo original da aba Geral */}
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
                    Configure usuários, perfis e permissões do sistema
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <Tabs value={activeUserTab} onValueChange={setActiveUserTab} className="w-full">
                    <TabsList className="mb-4 grid grid-cols-3 w-full">
                      <TabsTrigger value="usuarios" className="flex items-center gap-2">
                        <UserCog className="h-4 w-4" />
                        Usuários
                      </TabsTrigger>
                      <TabsTrigger value="perfis" className="flex items-center gap-2">
                        <UserPlus className="h-4 w-4" />
                        Perfis
                      </TabsTrigger>
                      <TabsTrigger value="permissoes" className="flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        Permissões
                      </TabsTrigger>
                    </TabsList>

                    {/* Conteúdo da aba Usuários */}
                    <TabsContent value="usuarios" className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h3 className="text-lg font-medium">Lista de Usuários</h3>
                        <Button 
                          onClick={() => {
                            setEditingUsuario(null);
                            usuarioForm.reset({
                              nome: "",
                              email: "",
                              cpf: "",
                              senha: "",
                              perfilId: ""
                            });
                            setShowUsuarioForm(true);
                          }}
                          className="flex items-center gap-2"
                        >
                          <UserPlus className="h-4 w-4" />
                          Novo Usuário
                        </Button>
                      </div>

                      <Collapsible 
                        open={showUsuarioForm} 
                        onOpenChange={setShowUsuarioForm}
                        className="mb-6"
                      >
                        <CollapsibleContent className="p-4 border rounded-md bg-muted/20 space-y-4">
                          <div className="flex justify-between items-center">
                            <h3 className="text-lg font-medium">
                              {editingUsuario ? "Editar Usuário" : "Novo Usuário"}
                            </h3>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => setShowUsuarioForm(false)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>

                          <Form {...usuarioForm}>
                            <form onSubmit={usuarioForm.handleSubmit(handleUsuarioSubmit)} className="space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField
                                  control={usuarioForm.control}
                                  name="nome"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Nome</FormLabel>
                                      <FormControl>
                                        <Input placeholder="Nome completo" {...field} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                
                                <FormField
                                  control={usuarioForm.control}
                                  name="email"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Email</FormLabel>
                                      <FormControl>
                                        <Input type="email" placeholder="usuario@exemplo.com" {...field} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />

                                <FormField
                                  control={usuarioForm.control}
                                  name="cpf"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>CPF</FormLabel>
                                      <FormControl>
                                        <Input placeholder="123.456.789-00" {...field} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />

                                <FormField
                                  control={usuarioForm.control}
                                  name="senha"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>{editingUsuario ? "Nova Senha (deixe em branco para manter)" : "Senha"}</FormLabel>
                                      <FormControl>
                                        <Input type="password" placeholder="******" {...field} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>

                              <FormField
                                control={usuarioForm.control}
                                name="perfilId"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Perfil</FormLabel>
                                    <Select 
                                      onValueChange={field.onChange} 
                                      defaultValue={field.value}
                                    >
                                      <FormControl>
                                        <SelectTrigger>
                                          <SelectValue placeholder="Selecione um perfil" />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        {perfis.map((perfil) => (
                                          <SelectItem key={perfil.id} value={perfil.id}>
                                            {perfil.nome}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <div className="flex justify-end space-x-2">
                                <Button 
                                  type="button" 
                                  variant="outline" 
                                  onClick={() => setShowUsuarioForm(false)}
                                >
                                  Cancelar
                                </Button>
                                <Button type="submit">
                                  {editingUsuario ? "Atualizar" : "Criar"} Usuário
                                </Button>
                              </div>
                            </form>
                          </Form>
                        </CollapsibleContent>
                      </Collapsible>

                      {usuarios.length > 0 ? (
                        <div className="border rounded-md">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Nome</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>CPF</TableHead>
                                <TableHead>Perfil</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {usuarios.map((usuario) => {
                                const perfil = perfis.find(p => p.id === usuario.perfilId);
                                
                                return (
                                  <TableRow key={usuario.id}>
                                    <TableCell className="font-medium">{usuario.nome}</TableCell>
                                    <TableCell>{usuario.email}</TableCell>
                                    <TableCell>{usuario.cpf}</TableCell>
                                    <TableCell>{perfil?.nome || "Sem perfil"}</TableCell>
                                    <TableCell className="text-right">
                                      <div className="flex justify-end gap-2">
                                        <Button 
                                          variant="ghost" 
                                          size="icon"
                                          onClick={() => handleEditUsuario(usuario)}
                                        >
                                          <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button 
                                          variant="ghost" 
                                          size="icon"
                                          onClick={() => handleDeleteUsuario(usuario.id)}
                                        >
                                          <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      ) : (
                        <div className="text-center py-8 border rounded-md">
                          <UserPlus className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                          <p className="text-muted-foreground">Nenhum usuário cadastrado</p>
                          <Button 
                            variant="outline" 
                            onClick={() => setShowUsuarioForm(true)}
                            className="mt-2"
                          >
                            Adicionar Usuário
                          </Button>
                        </div>
                      )}
                    </TabsContent>

                    {/* Conteúdo da aba Perfis */}
                    <TabsContent value="perfis" className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h3 className="text-lg font-medium">Perfis de Acesso</h3>
                        <Button 
                          onClick={() => {
                            setEditingPerfil(null);
                            perfilForm.reset({
                              nome: "",
                              descricao: ""
                            });
                            setShowPerfilForm(true);
                          }}
                          className="flex items-center gap-2"
                        >
                          <Plus className="h-4 w-4" />
                          Novo Perfil
                        </Button>
                      </div>

                      <Collapsible 
                        open={showPerfilForm} 
                        onOpenChange={setShowPerfilForm}
                        className="mb-6"
                      >
                        <CollapsibleContent className="p-4 border rounded-md bg-muted/20 space-y-4">
                          <div className="flex justify-between items-center">
                            <h3 className="text-lg font-medium">
                              {editingPerfil ? "Editar Perfil" : "Novo Perfil"}
                            </h3>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => setShowPerfilForm(false)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>

                          <Form {...perfilForm}>
                            <form onSubmit={perfilForm.handleSubmit(handlePerfilSubmit)} className="space-y-4">
                              <FormField
                                control={perfilForm.control}
                                name="nome"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Nome do Perfil</FormLabel>
                                    <FormControl>
                                      <Input placeholder="Ex: Gerente, Caixa, etc." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              
                              <FormField
                                control={perfilForm.control}
                                name="descricao"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Descrição</FormLabel>
                                    <FormControl>
                                      <Textarea 
                                        placeholder="Descreva as funções deste perfil" 
                                        className="resize-none" 
                                        {...field} 
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <div className="flex justify-end space-x-2">
                                <Button 
                                  type="button" 
                                  variant="outline" 
                                  onClick={() => setShowPerfilForm(false)}
                                >
                                  Cancelar
                                </Button>
                                <Button type="submit">
                                  {editingPerfil ? "Atualizar" : "Criar"} Perfil
                                </Button>
                              </div>
                            </form>
                          </Form>
                        </CollapsibleContent>
                      </Collapsible>

                      {perfis.length > 0 ? (
                        <div className="border rounded-md">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Nome</TableHead>
                                <TableHead>Descrição</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {perfis.map((perfil) => (
                                <TableRow key={perfil.id}>
                                  <TableCell className="font-medium">{perfil.nome}</TableCell>
                                  <TableCell>{perfil.descricao}</TableCell>
                                  <TableCell className="text-right">
                                    <div className="flex justify-end gap-2">
                                      <Button 
                                        variant="ghost" 
                                        size="icon"
                                        onClick={() => handleEditPerfil(perfil)}
                                      >
                                        <Edit className="h-4 w-4" />
                                      </Button>
                                      <Button 
                                        variant="ghost" 
                                        size="icon"
                                        onClick={() => handleDeletePerfil(perfil.id)}
                                      >
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      ) : (
                        <div className="text-center py-8 border rounded-md">
                          <UserCog className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                          <p className="text-muted-foreground">Nenhum perfil cadastrado</p>
                          <Button 
                            variant="outline" 
                            onClick={() => setShowPerfilForm(true)}
                            className="mt-2"
                          >
                            Adicionar Perfil
                          </Button>
                        </div>
                      )}
                    </TabsContent>

                    {/* Conteúdo da aba Permissões */}
                    <TabsContent value="permissoes" className="space-y-4">
                      <div>
                        <h3 className="text-lg font-medium mb-4">Configurar Permissões por Perfil</h3>
                        
                        {perfis.length > 0 ? (
                          <div className="space-y-6">
                            {perfis.map((perfil) => (
                              <Card key={perfil.id} className="overflow-hidden">
                                <CardHeader className="bg-muted/30 py-4">
                                  <CardTitle className="text-lg">{perfil.nome}</CardTitle>
                                  <CardDescription>{perfil.descricao}</CardDescription>
                                </CardHeader>
                                <CardContent className="p-6">
                                  <div className="space-y-4">
                                    <h4 className="text-sm font-medium text-muted-foreground mb-2">
                                      Acesso a Funcionalidades:
                                    </h4>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      {permissoes.map((permissao) => {
                                        const isChecked = (perfilPermissoes[perfil.id] || []).includes(permissao.id);
                                        
                                        return (
                                          <div key={permissao.id} className="flex items-start space-x-2">
                                            <Checkbox 
                                              id={`${perfil.id}-${permissao.id}`}
                                              checked={isChecked}
                                              onCheckedChange={() => togglePermissao(perfil.id, permissao.id)}
                                            />
                                            <div className="grid gap-1.5 leading-none">
                                              <label
                                                htmlFor={`${perfil.id}-${permissao.id}`}
                                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                              >
                                                {permissao.descricao}
                                              </label>
                                              <p className="text-xs text-muted-foreground">
                                                Tela: {permissao.nome}
                                              </p>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8 border rounded-md">
                            <Shield className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                            <p className="text-muted-foreground">Nenhum perfil cadastrado para configurar permissões</p>
                            <Button 
                              variant="outline" 
                              onClick={() => {
                                setActiveUserTab("perfis");
                                setShowPerfilForm(true);
                              }}
                              className="mt-2"
                            >
                              Adicionar Perfil
                            </Button>
                          </div>
                        )}
                      </div>
                    </TabsContent>
                  </Tabs>
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
