import React, { useState } from "react";
import { Bluetooth, Cable, Monitor, Printer, Usb } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/context/AuthContext";
import { mensagemErro } from "@/lib/format";
import {
  conectarImpressora,
  imprimirTeste,
  lerConfigImpressora,
  salvarConfigImpressora,
  suporteConexao,
  type ConfigImpressora,
  type TipoConexao,
} from "@/lib/printing/impressora";

const CONEXOES: { tipo: TipoConexao; nome: string; descricao: string; icon: React.ElementType }[] = [
  {
    tipo: "navegador",
    nome: "Driver do sistema",
    descricao: "Qualquer impressora instalada no Windows/Android. Mais simples e compatível.",
    icon: Monitor,
  },
  { tipo: "usb", nome: "USB direto", descricao: "Envia ESC/POS sem driver (Chrome/Edge, Android com cabo OTG).", icon: Usb },
  { tipo: "serial", nome: "Serial / COM", descricao: "Impressoras que criam porta COM (Elgin, Bematech, Daruma).", icon: Cable },
  { tipo: "bluetooth", nome: "Bluetooth", descricao: "Mini impressoras portáteis 58mm (Chrome no Android).", icon: Bluetooth },
];

const AbaImpressora: React.FC = () => {
  const { barAtivo } = useAuth();
  const [cfg, setCfg] = useState<ConfigImpressora>(lerConfigImpressora);
  const [conectado, setConectado] = useState<string | null>(null);
  const set = <K extends keyof ConfigImpressora>(k: K, v: ConfigImpressora[K]) => {
    const novo = { ...cfg, [k]: v };
    setCfg(novo);
    salvarConfigImpressora(novo);
  };

  const conectar = async () => {
    try {
      const nome = await conectarImpressora(cfg.conexao, cfg.baudRate);
      setConectado(nome);
      toast.success(`Conectado: ${nome}`);
    } catch (e) {
      if ((e as Error)?.name === "NotFoundError") return; // usuário fechou o seletor
      toast.error(mensagemErro(e, "Não foi possível conectar"));
    }
  };

  const testar = async () => {
    try {
      await imprimirTeste(cfg, barAtivo!.bar.nome);
    } catch (e) {
      toast.error(mensagemErro(e, "Falha na impressão"));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Printer className="h-5 w-5" /> Impressora térmica
        </CardTitle>
        <CardDescription>
          Configuração deste dispositivo. Cada caixa, tablet ou celular pode usar uma impressora diferente.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {CONEXOES.map(({ tipo, nome, descricao, icon: Icon }) => {
            const suportado = suporteConexao[tipo]();
            return (
              <button
                key={tipo}
                type="button"
                disabled={!suportado}
                onClick={() => set("conexao", tipo)}
                className={`text-left rounded-lg border p-3 transition-colors disabled:opacity-40 ${
                  cfg.conexao === tipo ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                }`}
              >
                <p className="font-medium flex items-center gap-2">
                  <Icon className="h-4 w-4" /> {nome}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {suportado ? descricao : "Não suportado neste navegador. Use Chrome ou Edge."}
                </p>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="space-y-1.5">
            <Label>Largura do papel</Label>
            <Select value={String(cfg.largura)} onValueChange={(v) => set("largura", Number(v) as 58 | 80)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="80">80 mm</SelectItem>
                <SelectItem value="58">58 mm</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Vias</Label>
            <Input
              type="number"
              min={1}
              max={3}
              value={cfg.vias}
              onChange={(e) => set("vias", Math.min(3, Math.max(1, Number(e.target.value) || 1)))}
            />
          </div>
          {cfg.conexao === "serial" && (
            <div className="space-y-1.5">
              <Label>Velocidade (baud)</Label>
              <Select value={String(cfg.baudRate)} onValueChange={(v) => set("baudRate", Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[9600, 19200, 38400, 57600, 115200].map((b) => (
                    <SelectItem key={b} value={String(b)}>
                      {b}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <Label>Mensagem no rodapé</Label>
          <Input value={cfg.rodape} onChange={(e) => set("rodape", e.target.value)} />
        </div>

        <div className="space-y-3 rounded-lg border p-3">
          <label className="flex items-center justify-between text-sm">
            Imprimir automaticamente ao finalizar venda
            <Switch checked={cfg.imprimirAutomatico} onCheckedChange={(v) => set("imprimirAutomatico", v)} />
          </label>
          {cfg.conexao !== "navegador" && (
            <>
              <label className="flex items-center justify-between text-sm">
                Cortar papel (guilhotina)
                <Switch checked={cfg.cortarPapel} onCheckedChange={(v) => set("cortarPapel", v)} />
              </label>
              <label className="flex items-center justify-between text-sm">
                Abrir gaveta de dinheiro
                <Switch checked={cfg.abrirGaveta} onCheckedChange={(v) => set("abrirGaveta", v)} />
              </label>
            </>
          )}
        </div>

        {cfg.conexao === "navegador" && (
          <p className="text-xs text-muted-foreground">
            No diálogo de impressão escolha a impressora térmica, papel {cfg.largura}mm, margens "Nenhuma" e desmarque
            "Cabeçalhos e rodapés". No Chrome, abrir com <code>--kiosk-printing</code> imprime sem mostrar o diálogo.
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          {cfg.conexao !== "navegador" && (
            <Button variant="outline" onClick={conectar}>
              {conectado ? `Conectado: ${conectado}` : "Conectar impressora"}
            </Button>
          )}
          <Button onClick={testar}>
            <Printer className="h-4 w-4 mr-2" /> Imprimir teste
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AbaImpressora;
