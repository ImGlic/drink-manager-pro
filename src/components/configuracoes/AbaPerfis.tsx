import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Lock, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/context/AuthContext";
import { PERMISSOES } from "@/lib/permissoes";
import { mensagemErro } from "@/lib/format";
import { excluirPerfil, listarPerfis, salvarPerfil, type Perfil } from "@/services/baresService";

const AbaPerfis: React.FC = () => {
  const { barAtivo, hasPermission, recarregarBares } = useAuth();
  const barId = barAtivo!.bar.id;
  const queryClient = useQueryClient();
  const podeEditar = hasPermission("perfis");
  const [editando, setEditando] = useState<Partial<Perfil> | null>(null);
  const [salvando, setSalvando] = useState(false);

  const { data: perfis = [] } = useQuery({ queryKey: ["perfis", barId], queryFn: () => listarPerfis(barId) });

  const salvar = async () => {
    if (!editando?.nome?.trim()) return toast.warning("Informe o nome do perfil");
    setSalvando(true);
    try {
      await salvarPerfil(barId, {
        id: editando.id,
        nome: editando.nome,
        descricao: editando.descricao ?? undefined,
        permissoes: editando.permissoes ?? [],
      });
      toast.success("Perfil salvo");
      setEditando(null);
      queryClient.invalidateQueries({ queryKey: ["perfis", barId] });
      await recarregarBares();
    } catch (e) {
      toast.error(mensagemErro(e, "Erro ao salvar perfil"));
    } finally {
      setSalvando(false);
    }
  };

  const excluir = async (p: Perfil) => {
    if (!confirm(`Excluir o perfil "${p.nome}"? Usuários com esse perfil ficarão sem acesso.`)) return;
    try {
      await excluirPerfil(p.id);
      queryClient.invalidateQueries({ queryKey: ["perfis", barId] });
    } catch (e) {
      toast.error(mensagemErro(e, "Erro ao excluir perfil"));
    }
  };

  const alternar = (codigo: string) =>
    setEditando((p) => {
      const atual = p?.permissoes ?? [];
      return { ...p, permissoes: atual.includes(codigo) ? atual.filter((c) => c !== codigo) : [...atual, codigo] };
    });

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Perfis de acesso</CardTitle>
          <CardDescription>Defina o que cada função do bar pode fazer. Cada bar tem seus próprios perfis.</CardDescription>
        </div>
        {podeEditar && (
          <Button size="sm" onClick={() => setEditando({ nome: "", descricao: "", permissoes: [] })}>
            <Plus className="h-4 w-4 mr-1" /> Novo
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        {perfis.map((p) => (
          <div key={p.id} className="flex items-start gap-3 rounded-lg border p-3">
            <div className="flex-1 min-w-0">
              <p className="font-medium flex items-center gap-2">
                {p.nome} {p.is_admin && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
              </p>
              {p.descricao && <p className="text-xs text-muted-foreground">{p.descricao}</p>}
              <div className="flex flex-wrap gap-1 mt-2">
                {p.is_admin ? (
                  <Badge>Acesso total</Badge>
                ) : (
                  p.permissoes.map((c) => (
                    <Badge key={c} variant="outline">
                      {PERMISSOES.find((x) => x.codigo === c)?.nome ?? c}
                    </Badge>
                  ))
                )}
              </div>
            </div>
            {podeEditar && !p.is_admin && (
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditando(p)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => excluir(p)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        ))}
      </CardContent>

      <Dialog open={!!editando} onOpenChange={(o) => !o && setEditando(null)}>
        <DialogContent className="max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editando?.id ? "Editar perfil" : "Novo perfil"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input value={editando?.nome ?? ""} onChange={(e) => setEditando((p) => ({ ...p, nome: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Input
                value={editando?.descricao ?? ""}
                onChange={(e) => setEditando((p) => ({ ...p, descricao: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Permissões</Label>
              {PERMISSOES.map((perm) => (
                <label key={perm.codigo} className="flex items-start gap-3 rounded-md border p-2.5 cursor-pointer">
                  <Checkbox
                    checked={editando?.permissoes?.includes(perm.codigo) ?? false}
                    onCheckedChange={() => alternar(perm.codigo)}
                    className="mt-0.5"
                  />
                  <span className="text-sm">
                    {perm.nome}
                    <span className="block text-xs text-muted-foreground">{perm.descricao}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button onClick={salvar} disabled={salvando}>
              {salvando ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default AbaPerfis;
