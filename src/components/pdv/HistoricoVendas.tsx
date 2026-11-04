import React, { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Ban, FileText, Loader2, Printer, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/context/AuthContext";
import { formatBRL, mensagemErro } from "@/lib/format";
import { NOMES_PAGAMENTO } from "@/lib/printing/cupom";
import { imprimirCupom } from "@/lib/printing/impressora";
import { cancelarVenda, listarVendas, notaAutorizada, vendaParaCupom, type VendaCompleta } from "@/services/vendasService";
import { cancelarNfce, emitirNfce } from "@/services/baresService";
import type { Produto } from "@/services/produtosService";

const STATUS_NOTA: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  autorizada: { label: "NFC-e autorizada", variant: "default" },
  processando: { label: "NFC-e processando", variant: "secondary" },
  pendente: { label: "NFC-e pendente", variant: "secondary" },
  rejeitada: { label: "NFC-e rejeitada", variant: "destructive" },
  erro: { label: "NFC-e com erro", variant: "destructive" },
  cancelada: { label: "NFC-e cancelada", variant: "outline" },
};

const hojeISO = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
};

const HistoricoVendas: React.FC<{ produtos: Produto[] }> = ({ produtos }) => {
  const { barAtivo, hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [dia, setDia] = useState(hojeISO());
  const [acao, setAcao] = useState<string | null>(null);
  const [cancelando, setCancelando] = useState<VendaCompleta | null>(null);
  const [motivo, setMotivo] = useState("");
  const barId = barAtivo!.bar.id;

  const [inicio, fim] = useMemo(() => {
    const i = new Date(`${dia}T00:00:00`);
    const f = new Date(i);
    f.setDate(f.getDate() + 1);
    return [i, f];
  }, [dia]);

  const { data: vendas = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ["vendas", barId, dia],
    queryFn: () => listarVendas(barId, inicio, fim),
  });

  const recarregar = () => {
    queryClient.invalidateQueries({ queryKey: ["vendas", barId] });
    queryClient.invalidateQueries({ queryKey: ["produtos", barId] });
  };

  const totalDia = vendas.filter((v) => v.status === "finalizada").reduce((s, v) => s + Number(v.total), 0);

  const reimprimir = async (venda: VendaCompleta) => {
    try {
      await imprimirCupom(vendaParaCupom(venda, barAtivo!.bar, produtos));
    } catch (e) {
      toast.error(mensagemErro(e, "Falha ao imprimir"));
    }
  };

  const emitir = async (venda: VendaCompleta) => {
    setAcao(venda.id);
    try {
      const nota = await emitirNfce(venda.id);
      if (nota.status === "autorizada") toast.success(`NFC-e nº ${nota.numero} autorizada`);
      else toast.error(`NFC-e não autorizada: ${nota.mensagem ?? nota.status}`);
      recarregar();
    } catch (e) {
      toast.error(mensagemErro(e, "Erro ao emitir NFC-e"));
    } finally {
      setAcao(null);
    }
  };

  const confirmarCancelamento = async () => {
    if (!cancelando) return;
    const nota = notaAutorizada(cancelando);
    if (nota && motivo.trim().length < 15) {
      toast.warning("Para cancelar a NFC-e a justificativa precisa ter pelo menos 15 caracteres.");
      return;
    }
    setAcao(cancelando.id);
    try {
      if (nota) await cancelarNfce(nota.id, motivo.trim());
      await cancelarVenda(cancelando.id, motivo.trim());
      toast.success(`Venda nº ${cancelando.numero} cancelada e estoque devolvido.`);
      setCancelando(null);
      setMotivo("");
      recarregar();
    } catch (e) {
      toast.error(mensagemErro(e, "Erro ao cancelar"));
      recarregar();
    } finally {
      setAcao(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 justify-between">
        <div className="space-y-1.5">
          <Label>Dia</Label>
          <Input type="date" value={dia} onChange={(e) => setDia(e.target.value)} className="w-auto" />
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs text-muted-foreground">{vendas.filter((v) => v.status === "finalizada").length} vendas</p>
            <p className="font-semibold">{formatBRL(totalDia)}</p>
          </div>
          <Button variant="outline" size="icon" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">Carregando vendas...</div>
      ) : vendas.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">Nenhuma venda neste dia.</div>
      ) : (
        <div className="space-y-2">
          {vendas.map((venda) => {
            const nota = [...(venda.notas ?? [])].sort((a, b) => b.created_at.localeCompare(a.created_at))[0] ?? null;
            const autorizada = notaAutorizada(venda);
            const cancelada = venda.status === "cancelada";
            return (
              <Card key={venda.id} className={cancelada ? "opacity-60" : ""}>
                <CardContent className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">#{venda.numero}</span>
                      <span className="text-sm text-muted-foreground">
                        {new Date(venda.criado_em ?? "").toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      {venda.origem === "mobile" && <Badge variant="outline">Celular</Badge>}
                      {cancelada && <Badge variant="destructive">Cancelada</Badge>}
                      {nota && (
                        <Badge variant={STATUS_NOTA[nota.status]?.variant ?? "outline"} title={nota.mensagem ?? ""}>
                          {STATUS_NOTA[nota.status]?.label ?? nota.status}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {venda.itens.map((i) => `${Number(i.quantidade)}x ${i.nome_produto}`).join(", ")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {venda.operador?.nome ?? "-"} ·{" "}
                      {venda.pagamentos.map((p) => NOMES_PAGAMENTO[p.forma] ?? p.forma).join(" + ")}
                      {nota && ["rejeitada", "erro"].includes(nota.status) && nota.mensagem && (
                        <span className="text-destructive"> · {nota.mensagem}</span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-2">
                    <span className="font-semibold text-lg sm:mr-2">{formatBRL(Number(venda.total))}</span>
                    <div className="flex gap-1">
                      <Button variant="outline" size="icon" title="Reimprimir" onClick={() => reimprimir(venda)}>
                        <Printer className="h-4 w-4" />
                      </Button>
                      {!cancelada && !autorizada && hasPermission("fiscal") && (
                        <Button
                          variant="outline"
                          size="icon"
                          title="Emitir NFC-e"
                          onClick={() => emitir(venda)}
                          disabled={acao === venda.id}
                        >
                          {acao === venda.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                        </Button>
                      )}
                      {!cancelada && hasPermission("vendas_cancelar") && (
                        <Button
                          variant="outline"
                          size="icon"
                          title="Cancelar venda"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setCancelando(venda)}
                        >
                          <Ban className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!cancelando} onOpenChange={(o) => !o && setCancelando(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar venda #{cancelando?.numero}</DialogTitle>
            <DialogDescription>
              O estoque dos itens será devolvido.
              {cancelando && notaAutorizada(cancelando) &&
                " A NFC-e autorizada também será cancelada na SEFAZ (prazo legal: em geral até 30 minutos após a emissão, varia por estado)."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label>Motivo</Label>
            <Textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ex.: cliente desistiu da compra" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelando(null)}>
              Voltar
            </Button>
            <Button variant="destructive" onClick={confirmarCancelamento} disabled={acao === cancelando?.id}>
              {acao === cancelando?.id ? "Cancelando..." : "Confirmar cancelamento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HistoricoVendas;
