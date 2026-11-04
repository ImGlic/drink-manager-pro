import React, { useEffect, useMemo, useState } from "react";
import { Banknote, CreditCard, QrCode, Ticket, Trash2, Wallet } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { formatBRL, formatCPF, somenteDigitos } from "@/lib/format";
import { NOMES_PAGAMENTO } from "@/lib/printing/cupom";
import type { FormaPagamento } from "@/services/vendasService";

export interface ResultadoCheckout {
  pagamentos: { forma: FormaPagamento; valor: number }[];
  desconto: number;
  clienteCpf: string;
  emitirNota: boolean;
  imprimir: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subtotal: number;
  podeEmitirNota: boolean;
  emitirNotaPadrao: boolean;
  imprimirPadrao: boolean;
  processando: boolean;
  onConfirmar: (r: ResultadoCheckout) => void;
}

const FORMAS: { forma: FormaPagamento; icon: React.ElementType }[] = [
  { forma: "dinheiro", icon: Banknote },
  { forma: "pix", icon: QrCode },
  { forma: "debito", icon: CreditCard },
  { forma: "credito", icon: CreditCard },
  { forma: "vale_refeicao", icon: Ticket },
  { forma: "outros", icon: Wallet },
];

const r2 = (v: number) => Math.round(v * 100) / 100;
const paraNumero = (v: string) => {
  const n = Number(v.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};
const paraTexto = (v: number) => (v > 0 ? v.toFixed(2).replace(".", ",") : "");

const CheckoutDialog: React.FC<Props> = ({
  open,
  onOpenChange,
  subtotal,
  podeEmitirNota,
  emitirNotaPadrao,
  imprimirPadrao,
  processando,
  onConfirmar,
}) => {
  const [pagamentos, setPagamentos] = useState<{ forma: FormaPagamento; valor: number }[]>([]);
  const [forma, setForma] = useState<FormaPagamento>("dinheiro");
  const [valor, setValor] = useState("");
  const [desconto, setDesconto] = useState("");
  const [cpf, setCpf] = useState("");
  const [emitirNota, setEmitirNota] = useState(emitirNotaPadrao);
  const [imprimir, setImprimir] = useState(imprimirPadrao);

  useEffect(() => {
    if (open) {
      setPagamentos([]);
      setForma("dinheiro");
      setDesconto("");
      setCpf("");
      setValor(paraTexto(subtotal));
      setEmitirNota(podeEmitirNota && emitirNotaPadrao);
      setImprimir(imprimirPadrao);
    }
  }, [open, subtotal, podeEmitirNota, emitirNotaPadrao, imprimirPadrao]);

  const descontoNum = Math.min(r2(paraNumero(desconto)), subtotal);
  const total = r2(subtotal - descontoNum);
  const pagoLancado = r2(pagamentos.reduce((s, p) => s + p.valor, 0));
  const restante = r2(Math.max(0, total - pagoLancado));
  const valorAtual = r2(paraNumero(valor));

  // ao mudar desconto/pagamentos, sugere o restante
  useEffect(() => {
    if (open) setValor(paraTexto(restante));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [descontoNum, pagoLancado]);

  const efetivos = useMemo(
    () => (valorAtual > 0 ? [...pagamentos, { forma, valor: valorAtual }] : pagamentos),
    [pagamentos, forma, valorAtual]
  );
  const pagoTotal = r2(efetivos.reduce((s, p) => s + p.valor, 0));
  const troco = r2(Math.max(0, pagoTotal - total));
  const temDinheiro = efetivos.some((p) => p.forma === "dinheiro");
  const cpfDigitos = somenteDigitos(cpf);

  const erro =
    pagoTotal < total
      ? `Faltam ${formatBRL(total - pagoTotal)}`
      : troco > 0 && !temDinheiro
      ? "Troco só é permitido em dinheiro"
      : cpfDigitos && cpfDigitos.length !== 11
      ? "CPF incompleto"
      : null;

  const adicionarPagamento = () => {
    if (valorAtual <= 0) return;
    setPagamentos((p) => [...p, { forma, valor: valorAtual }]);
  };

  const confirmar = () => {
    if (erro) return;
    onConfirmar({ pagamentos: efetivos, desconto: descontoNum, clienteCpf: cpfDigitos, emitirNota, imprimir });
  };

  const notasRapidas = [restante, 10, 20, 50, 100, 200].filter((v, i, arr) => v >= restante && arr.indexOf(v) === i);

  return (
    <Dialog open={open} onOpenChange={(o) => !processando && onOpenChange(o)}>
      <DialogContent className="sm:max-w-lg max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Pagamento</DialogTitle>
          <DialogDescription>
            Total a pagar: <span className="font-semibold text-foreground text-base">{formatBRL(total)}</span>
            {descontoNum > 0 && <span> (desconto de {formatBRL(descontoNum)})</span>}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {FORMAS.map(({ forma: f, icon: Icon }) => (
              <Button
                key={f}
                type="button"
                variant={forma === f ? "default" : "outline"}
                className="h-auto py-3 flex-col gap-1"
                onClick={() => setForma(f)}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs">{NOMES_PAGAMENTO[f]}</span>
              </Button>
            ))}
          </div>

          <div className="space-y-1.5">
            <Label>{forma === "dinheiro" ? "Valor recebido" : "Valor"}</Label>
            <div className="flex gap-2">
              <Input
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                inputMode="decimal"
                className="text-lg h-11"
                placeholder="0,00"
              />
              {restante > 0 && valorAtual > 0 && valorAtual < restante && (
                <Button type="button" variant="secondary" onClick={adicionarPagamento} className="h-11">
                  + Dividir
                </Button>
              )}
            </div>
            {forma === "dinheiro" && restante > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {notasRapidas.map((v) => (
                  <Button key={v} type="button" size="sm" variant="outline" onClick={() => setValor(paraTexto(v))}>
                    {v === restante ? "Exato" : formatBRL(v)}
                  </Button>
                ))}
              </div>
            )}
          </div>

          {pagamentos.length > 0 && (
            <div className="rounded-lg border divide-y">
              {pagamentos.map((p, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-2 text-sm">
                  <span>{NOMES_PAGAMENTO[p.forma]}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{formatBRL(p.valor)}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setPagamentos((lista) => lista.filter((_, j) => j !== i))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Desconto (R$)</Label>
              <Input value={desconto} onChange={(e) => setDesconto(e.target.value)} inputMode="decimal" placeholder="0,00" />
            </div>
            <div className="space-y-1.5">
              <Label>CPF na nota</Label>
              <Input value={formatCPF(cpf)} onChange={(e) => setCpf(e.target.value)} inputMode="numeric" placeholder="Opcional" />
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-lg bg-muted/50 p-3">
            {podeEmitirNota && (
              <label className="flex items-center justify-between text-sm">
                Emitir NFC-e
                <Switch checked={emitirNota} onCheckedChange={setEmitirNota} />
              </label>
            )}
            <label className="flex items-center justify-between text-sm">
              Imprimir cupom
              <Switch checked={imprimir} onCheckedChange={setImprimir} />
            </label>
          </div>

          <div
            className={cn(
              "flex justify-between items-center rounded-lg p-3 text-lg font-semibold",
              troco > 0 ? "bg-green-100 text-green-900" : "bg-muted/30"
            )}
          >
            <span>Troco</span>
            <span>{formatBRL(troco)}</span>
          </div>
        </div>

        <DialogFooter className="gap-2">
          {erro && <p className="text-sm text-destructive self-center mr-auto">{erro}</p>}
          <Button size="lg" onClick={confirmar} disabled={!!erro || processando} className="w-full sm:w-auto">
            {processando ? "Finalizando..." : "Finalizar venda"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CheckoutDialog;
