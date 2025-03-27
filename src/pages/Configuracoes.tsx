import React, { useState, useEffect } from "react";
import { v4 as uuidv4 } from 'uuid';
import { toast } from "sonner";
import { Perfil, Usuario, Permissao } from "@/types/configuracoes";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area"
import { Form } from "@/components/ui/form"
import Layout from "@/components/Layout";

const Configuracoes: React.FC = () => {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [perfis, setPerfis] = useState<Perfil[]>([]);
  const [permissoes, setPermissoes] = useState<Permissao[]>([]);

  const [showUsuarioForm, setShowUsuarioForm] = useState(false);
  const [showPerfilForm, setShowPerfilForm] = useState(false);
  const [showPermissaoForm, setShowPermissaoForm] = useState(false);

  const [nomeUsuario, setNomeUsuario] = useState("");
  const [emailUsuario, setEmailUsuario] = useState("");
  const [senhaUsuario, setSenhaUsuario] = useState("");
  const [cpfUsuario, setCpfUsuario] = useState("");
  const [perfilUsuario, setPerfilUsuario] = useState<string | undefined>("");
  const [usuarioEmEdicao, setUsuarioEmEdicao] = useState<Usuario | null>(null);

  const [nomePerfil, setNomePerfil] = useState("");
  const [descricaoPerfil, setDescricaoPerfil] = useState("");
  const [permissoesSelecionadas, setPermissoesSelecionadas] = useState<string[]>([]);
  const [perfilEmEdicao, setPerfilEmEdicao] = useState<Perfil | null>(null);

  const [nomePermissao, setNomePermissao] = useState("");
  const [descricaoPermissao, setDescricaoPermissao] = useState("");
  const [permissaoEmEdicao, setPermissaoEmEdicao] = useState<Permissao | null>(null);

  useEffect(() => {
    // Load data from localStorage
    const storedUsuarios = localStorage.getItem("usuarios");
    if (storedUsuarios) {
      setUsuarios(JSON.parse(storedUsuarios));
    }

    const storedPerfis = localStorage.getItem("perfis");
    if (storedPerfis) {
      setPerfis(JSON.parse(storedPerfis));
    }

    const storedPermissoes = localStorage.getItem("permissoes");
    if (storedPermissoes) {
      setPermissoes(JSON.parse(storedPermissoes));
    }
  }, []);

  useEffect(() => {
    // Save data to localStorage
    localStorage.setItem("usuarios", JSON.stringify(usuarios));
    localStorage.setItem("perfis", JSON.stringify(perfis));
    localStorage.setItem("permissoes", JSON.stringify(permissoes));
  }, [usuarios, perfis, permissoes]);

  function handleSaveUsuario() {
    if (!nomeUsuario || !emailUsuario || !senhaUsuario || !cpfUsuario || !perfilUsuario) {
      toast.error("Todos os campos são obrigatórios!");
      return;
    }

    const selectedPerfil = perfis.find((perfil) => perfil.id === perfilUsuario);

    if (!selectedPerfil) {
      toast.error("Perfil selecionado inválido!");
      return;
    }

    const newUsuario: Usuario = {
      id: usuarioEmEdicao ? usuarioEmEdicao.id : uuidv4(),
      nome: nomeUsuario,
      email: emailUsuario,
      senha: senhaUsuario,
      cpf: cpfUsuario,
      perfil: selectedPerfil,
    };

    setUsuarios((prev) => {
      if (usuarioEmEdicao) {
        return prev.map((u) => (u.id === usuarioEmEdicao.id ? newUsuario : u));
      } else {
        return [...prev, newUsuario];
      }
    });

    // Reset the form
    setNomeUsuario("");
    setEmailUsuario("");
    setSenhaUsuario("");
    setCpfUsuario("");
    setPerfilUsuario(undefined);
    setUsuarioEmEdicao(null);
    setShowUsuarioForm(false);
    toast.success(`Usuário ${usuarioEmEdicao ? "atualizado" : "criado"} com sucesso!`);
  }

  function handleSavePerfil() {
    if (!nomePerfil) {
      toast.error("O nome do perfil é obrigatório!");
      return;
    }

    const newPerfil: Perfil = {
      id: perfilEmEdicao ? perfilEmEdicao.id : uuidv4(),
      nome: nomePerfil,
      descricao: descricaoPerfil || "",
      permissoes: permissoesSelecionadas
    };

    // Make sure we're explicitly setting the new Perfil type
    setPerfis((prev) => {
      if (perfilEmEdicao) {
        return prev.map((p) => (p.id === perfilEmEdicao.id ? newPerfil : p));
      } else {
        return [...prev, newPerfil];
      }
    });

    // Reset the form
    setNomePerfil("");
    setDescricaoPerfil("");
    setPermissoesSelecionadas([]);
    setPerfilEmEdicao(null);
    setShowPerfilForm(false);
    toast.success(`Perfil ${perfilEmEdicao ? "atualizado" : "criado"} com sucesso!`);
  }

  function handleSavePermissao() {
    if (!nomePermissao) {
      toast.error("O nome da permissão é obrigatório!");
      return;
    }

    const newPermissao: Permissao = {
      id: permissaoEmEdicao ? permissaoEmEdicao.id : uuidv4(),
      nome: nomePermissao,
      descricao: descricaoPermissao || "",
    };

    setPermissoes((prev) => {
      if (permissaoEmEdicao) {
        return prev.map((p) => (p.id === permissaoEmEdicao.id ? newPermissao : p));
      } else {
        return [...prev, newPermissao];
      }
    });

    // Reset the form
    setNomePermissao("");
    setDescricaoPermissao("");
    setPermissaoEmEdicao(null);
    setShowPermissaoForm(false);
    toast.success(`Permissão ${permissaoEmEdicao ? "atualizada" : "criada"} com sucesso!`);
  }

  function handleEditUsuario(usuario: Usuario) {
    setUsuarioEmEdicao(usuario);
    setNomeUsuario(usuario.nome);
    setEmailUsuario(usuario.email);
    setSenhaUsuario(usuario.senha);
    setCpfUsuario(usuario.cpf);
    setPerfilUsuario(usuario.perfil.id);
    setShowUsuarioForm(true);
  }

  function handleEditPerfil(perfil: Perfil) {
    setPerfilEmEdicao(perfil);
    setNomePerfil(perfil.nome);
    setDescricaoPerfil(perfil.descricao);
    setPermissoesSelecionadas(perfil.permissoes);
    setShowPerfilForm(true);
  }

  function handleEditPermissao(permissao: Permissao) {
    setPermissaoEmEdicao(permissao);
    setNomePermissao(permissao.nome);
    setDescricaoPermissao(permissao.descricao);
    setShowPermissaoForm(true);
  }

  function handleDeleteUsuario(id: string) {
    setUsuarios((prev) => prev.filter((u) => u.id !== id));
    toast.success("Usuário excluído com sucesso!");
  }

  function handleDeletePerfil(id: string) {
    setPerfis((prev) => prev.filter((p) => p.id !== id));
    // Also update usuarios to remove the perfil
    setUsuarios((prev) =>
      prev.map((usuario) =>
        usuario.perfil.id === id ? { ...usuario, perfil: { ...usuario.perfil, id: "", nome: "Sem perfil", descricao: "", permissoes: [] } } : usuario
      )
    );
    toast.success("Perfil excluído com sucesso!");
  }

  function handleDeletePermissao(id: string) {
    setPermissoes((prev) => prev.filter((p) => p.id !== id));
    // Also update perfis to remove the permissao
    setPerfis((prev) =>
      prev.map((perfil) => ({
        ...perfil,
        permissoes: perfil.permissoes.filter((permissaoId) => permissaoId !== id),
      }))
    );
    toast.success("Permissão excluída com sucesso!");
  }

  function togglePermissao(permissaoId: string) {
    setPermissoesSelecionadas((prev) => {
      if (prev.includes(permissaoId)) {
        return prev.filter((id) => id !== permissaoId);
      } else {
        return [...prev, permissaoId];
      }
    });
  }

  return (
    <Layout>
      <div className="container max-w-7xl mx-auto p-4">
        <h1 className="text-2xl font-semibold mb-4">Configurações</h1>

        {/* Usuários */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-semibold">Usuários</h2>
            <Button size="sm" onClick={() => setShowUsuarioForm(true)}>
              Adicionar Usuário
            </Button>
          </div>

          <Table>
            <TableCaption>Lista de usuários cadastrados no sistema.</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">ID</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>CPF</TableHead>
                <TableHead>Perfil</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usuarios.map((usuario) => (
                <TableRow key={usuario.id}>
                  <TableCell className="font-medium">{usuario.id}</TableCell>
                  <TableCell>{usuario.nome}</TableCell>
                  <TableCell>{usuario.email}</TableCell>
                  <TableCell>{usuario.cpf}</TableCell>
                  <TableCell>{usuario.perfil.nome}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Abrir menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Ações</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => handleEditUsuario(usuario)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          <span>Editar</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDeleteUsuario(usuario.id)}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          <span>Excluir</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>

        {/* Perfis */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-semibold">Perfis</h2>
            <Button size="sm" onClick={() => setShowPerfilForm(true)}>
              Adicionar Perfil
            </Button>
          </div>

          <Table>
            <TableCaption>Lista de perfis cadastrados no sistema.</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">ID</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {perfis.map((perfil) => (
                <TableRow key={perfil.id}>
                  <TableCell className="font-medium">{perfil.id}</TableCell>
                  <TableCell>{perfil.nome}</TableCell>
                  <TableCell>{perfil.descricao}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Abrir menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Ações</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => handleEditPerfil(perfil)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          <span>Editar</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDeletePerfil(perfil.id)}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          <span>Excluir</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>

        {/* Permissões */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-semibold">Permissões</h2>
            <Button size="sm" onClick={() => setShowPermissaoForm(true)}>
              Adicionar Permissão
            </Button>
          </div>

          <Table>
            <TableCaption>Lista de permissões cadastradas no sistema.</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">ID</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {permissoes.map((permissao) => (
                <TableRow key={permissao.id}>
                  <TableCell className="font-medium">{permissao.id}</TableCell>
                  <TableCell>{permissao.nome}</TableCell>
                  <TableCell>{permissao.descricao}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Abrir menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Ações</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => handleEditPermissao(permissao)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          <span>Editar</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDeletePermissao(permissao.id)}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          <span>Excluir</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>

        {/* Usuário Sheet */}
        <Sheet open={showUsuarioForm} onOpenChange={setShowUsuarioForm}>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>{usuarioEmEdicao ? "Editar Usuário" : "Adicionar Usuário"}</SheetTitle>
              <SheetDescription>
                Preencha os campos abaixo para {usuarioEmEdicao ? "editar" : "criar"} um usuário.
              </SheetDescription>
            </SheetHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Nome</Label>
                <Input id="name" value={nomeUsuario} onChange={(e) => setNomeUsuario(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={emailUsuario} onChange={(e) => setEmailUsuario(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="senha">Senha</Label>
                <Input id="senha" type="password" value={senhaUsuario} onChange={(e) => setSenhaUsuario(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="cpf">CPF</Label>
                <Input id="cpf" value={cpfUsuario} onChange={(e) => setCpfUsuario(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="perfil">Perfil</Label>
                <select
                  id="perfil"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={perfilUsuario}
                  onChange={(e) => setPerfilUsuario(e.target.value)}
                >
                  <option value="">Selecione um perfil</option>
                  {perfis.map((perfil) => (
                    <option key={perfil.id} value={perfil.id}>
                      {perfil.nome}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <Button onClick={handleSaveUsuario}>{usuarioEmEdicao ? "Salvar Alterações" : "Criar Usuário"}</Button>
          </SheetContent>
        </Sheet>

        {/* Perfil Sheet */}
        <Sheet open={showPerfilForm} onOpenChange={setShowPerfilForm}>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>{perfilEmEdicao ? "Editar Perfil" : "Adicionar Perfil"}</SheetTitle>
              <SheetDescription>
                Preencha os campos abaixo para {perfilEmEdicao ? "editar" : "criar"} um perfil.
              </SheetDescription>
            </SheetHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="nome">Nome</Label>
                <Input id="nome" value={nomePerfil} onChange={(e) => setNomePerfil(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="descricao">Descrição</Label>
                <Textarea id="descricao" value={descricaoPerfil} onChange={(e) => setDescricaoPerfil(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>Permissões</Label>
                <ScrollArea className="h-[200px] w-full rounded-md border">
                  <div className="p-4">
                    {permissoes.map((permissao) => (
                      <div key={permissao.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={permissao.id}
                          checked={permissoesSelecionadas.includes(permissao.id)}
                          onCheckedChange={() => togglePermissao(permissao.id)}
                        />
                        <Label htmlFor={permissao.id}>{permissao.nome}</Label>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </div>
            <Button onClick={handleSavePerfil}>{perfilEmEdicao ? "Salvar Alterações" : "Criar Perfil"}</Button>
          </SheetContent>
        </Sheet>

        {/* Permissão Sheet */}
        <Sheet open={showPermissaoForm} onOpenChange={setShowPermissaoForm}>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>{permissaoEmEdicao ? "Editar Permissão" : "Adicionar Permissão"}</SheetTitle>
              <SheetDescription>
                Preencha os campos abaixo para {permissaoEmEdicao ? "editar" : "criar"} uma permissão.
              </SheetDescription>
            </SheetHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="nome">Nome</Label>
                <Input id="nome" value={nomePermissao} onChange={(e) => setNomePermissao(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="descricao">Descrição</Label>
                <Textarea id="descricao" value={descricaoPermissao} onChange={(e) => setDescricaoPermissao(e.target.value)} />
              </div>
            </div>
            <Button onClick={handleSavePermissao}>{permissaoEmEdicao ? "Salvar Alterações" : "Criar Permissão"}</Button>
          </SheetContent>
        </Sheet>
      </div>
    </Layout>
  );
};

export default Configuracoes;
