import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/context/AuthContext";
import { formatCPF, mensagemErro } from "@/lib/format";
import {
  atualizarMembro,
  criarUsuarioNoBar,
  listarMembros,
  listarPerfis,
  redefinirSenha,
  removerMembro,
  type Membro,
} from "@/services/baresService";

const AbaUsuarios: React.FC = () => {
  const { barAtivo, currentUser } = useAuth();
  const barId = barAtivo!.bar.id;
  const queryClient = useQueryClient();
  const [novo, setNovo] = useState<{ nome: string; email: string; senha: string; cpf: string; perfilId: string } | null>(null);
  const [senhaDe, setSenhaDe] = useState<Membro | null>(null);
  const [novaSenha, setNovaSenha] = useState("");
  const [salvando, setSalvando] = useState(false);

  const { data: membros = [] } = useQuery({ queryKey: ["membros", barId], queryFn: () => listarMembros(barId) });
  const { data: perfis = [] } = useQuery({ queryKey: ["perfis", barId], queryFn: () => listarPerfis(barId) });
  const recarregar = () => queryClient.invalidateQueries({ queryKey: ["membros", barId] });

  const criar = async () => {
    if (!novo) return;
    if (!novo.nome || !novo.email || !novo.perfilId) return toast.warning("Preencha nome, e-mail e perfil");
    setSalvando(true);
    try {
      const r = await criarUsuarioNoBar({ barId, ...novo });
      toast.success(r.existente ? "Usuário já existia e foi vinculado ao bar" : "Usuário criado");
      setNovo(null);
      recarregar();
    } catch (e) {
      toast.error(mensagemErro(e, "Erro ao criar usuário"));
    } finally {
      setSalvando(false);
    }
  };

  const alterar = async (m: Membro, dados: { perfil_id?: string; ativo?: boolean }) => {
    try {
      await atualizarMembro(m.id, dados);
      recarregar();
    } catch (e) {
      toast.error(mensagemErro(e, "Erro ao atualizar usuário"));
    }
  };

  const remover = async (m: Membro) => {
    if (!confirm(`Remover ${m.usuario?.nome} deste bar? A conta continua existindo.`)) return;
    try {
      await removerMembro(m.id);
      recarregar();
    } catch (e) {
      toast.error(mensagemErro(e, "Erro ao remover"));
    }
  };

  const trocarSenha = async () => {
    if (!senhaDe || novaSenha.length < 6) return toast.warning("A senha deve ter pelo menos 6 caracteres");
    setSalvando(true);
    try {
      await redefinirSenha(barId, senhaDe.user_id, novaSenha);
      toast.success("Senha redefinida");
      setSenhaDe(null);
      setNovaSenha("");
    } catch (e) {
      toast.error(mensagemErro(e, "Erro ao redefinir senha"));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Usuários do bar</CardTitle>
          <CardDescription>Garçons, caixas e gerentes acessam pelo celular ou computador com o próprio login.</CardDescription>
        </div>
        <Button
          size="sm"
          onClick={() => setNovo({ nome: "", email: "", senha: "", cpf: "", perfilId: perfis.find((p) => p.nome === "Garçom")?.id ?? "" })}
        >
          <UserPlus className="h-4 w-4 mr-1" /> Novo
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {membros.map((m) => {
          const souEu = m.user_id === currentUser?.id;
          return (
            <div key={m.id} className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-lg border p-3">
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">
                  {m.usuario?.nome ?? "Usuário"} {souEu && <Badge variant="outline">você</Badge>}
                  {!m.ativo && <Badge variant="destructive" className="ml-1">inativo</Badge>}
                </p>
                <p className="text-xs text-muted-foreground truncate">{m.usuario?.email}</p>
              </div>
              <div className="flex items-center gap-2">
                <Select value={m.perfil_id ?? ""} onValueChange={(v) => alterar(m, { perfil_id: v })} disabled={souEu}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Sem perfil" />
                  </SelectTrigger>
                  <SelectContent>
                    {perfis.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!souEu && (
                  <>
                    <Switch checked={m.ativo} onCheckedChange={(a) => alterar(m, { ativo: a })} title="Ativo" />
                    <Button variant="ghost" size="icon" className="h-8 w-8" title="Redefinir senha" onClick={() => setSenhaDe(m)}>
                      <KeyRound className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" title="Remover" onClick={() => remover(m)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>

      <Dialog open={!!novo} onOpenChange={(o) => !o && setNovo(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo usuário</DialogTitle>
            <DialogDescription>Se o e-mail já tiver conta (ex.: trabalha em outro bar), ele só será vinculado.</DialogDescription>
          </DialogHeader>
          {novo && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Nome</Label>
                <Input value={novo.nome} onChange={(e) => setNovo({ ...novo, nome: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>E-mail (login)</Label>
                <Input type="email" value={novo.email} onChange={(e) => setNovo({ ...novo, email: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Senha inicial</Label>
                  <Input type="password" value={novo.senha} onChange={(e) => setNovo({ ...novo, senha: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>CPF</Label>
                  <Input value={formatCPF(novo.cpf)} onChange={(e) => setNovo({ ...novo, cpf: e.target.value })} inputMode="numeric" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Perfil</Label>
                <Select value={novo.perfilId} onValueChange={(v) => setNovo({ ...novo, perfilId: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {perfis.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={criar} disabled={salvando}>
              {salvando ? "Salvando..." : "Criar usuário"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!senhaDe} onOpenChange={(o) => !o && setSenhaDe(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Redefinir senha</DialogTitle>
            <DialogDescription>{senhaDe?.usuario?.nome}</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label>Nova senha</Label>
            <Input type="password" value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} />
          </div>
          <DialogFooter>
            <Button onClick={trocarSenha} disabled={salvando}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default AbaUsuarios;
