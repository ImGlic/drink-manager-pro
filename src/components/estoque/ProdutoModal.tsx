import React, { useEffect, useState } from "react";
import { Camera, ChevronDown, Plus } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import CameraScanner from "@/components/scanner/CameraScanner";
import { formatBRL, mensagemErro } from "@/lib/format";
import {
  atualizarProduto,
  criarCategoria,
  criarProduto,
  type Categoria,
  type Produto,
  type ProdutoForm,
} from "@/services/produtosService";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  barId: string;
  categorias: Categoria[];
  produto?: Produto | null;
  codigoInicial?: string;
  onSalvo: (produto: Produto) => void;
  onCategoriaCriada: (c: Categoria) => void;
}

type Valores = {
  nome: string;
  categoria_id: string;
  codigo_barras: string;
  codigo_interno: string;
  unidade: string;
  preco_custo: string;
  preco_venda: string;
  estoque_atual: string;
  estoque_minimo: string;
  ncm: string;
  cest: string;
  cfop: string;
  csosn: string;
  origem: string;
  ativo: boolean;
};

const UNIDADES = ["UN", "LT", "GF", "LA", "CX", "DZ", "PCT", "KG", "ML", "DOSE"];

const num = (v: string) => {
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

const deProduto = (p?: Produto | null, codigo?: string): Valores => ({
  nome: p?.nome ?? "",
  categoria_id: p?.categoria_id ?? "",
  codigo_barras: p?.codigo_barras ?? codigo ?? "",
  codigo_interno: p?.codigo_interno ?? "",
  unidade: p?.unidade ?? "UN",
  preco_custo: p?.preco_custo != null ? String(p.preco_custo) : "",
  preco_venda: p?.preco_venda != null ? String(p.preco_venda) : "",
  estoque_atual: p?.estoque_atual != null ? String(p.estoque_atual) : "0",
  estoque_minimo: p?.estoque_minimo != null ? String(p.estoque_minimo) : "0",
  ncm: p?.ncm ?? "",
  cest: p?.cest ?? "",
  cfop: p?.cfop ?? "5102",
  csosn: p?.csosn ?? "102",
  origem: String(p?.origem ?? 0),
  ativo: p?.ativo ?? true,
});

const ProdutoModal: React.FC<Props> = ({
  open,
  onOpenChange,
  barId,
  categorias,
  produto,
  codigoInicial,
  onSalvo,
  onCategoriaCriada,
}) => {
  const [v, setV] = useState<Valores>(deProduto(produto, codigoInicial));
  const [salvando, setSalvando] = useState(false);
  const [camera, setCamera] = useState(false);
  const [novaCategoria, setNovaCategoria] = useState("");
  const [fiscalAberto, setFiscalAberto] = useState(false);
  const edicao = !!produto;

  useEffect(() => {
    if (open) {
      setV(deProduto(produto, codigoInicial));
      setNovaCategoria("");
      setFiscalAberto(false);
    }
  }, [open, produto, codigoInicial]);

  const set = <K extends keyof Valores>(k: K, valor: Valores[K]) => setV((atual) => ({ ...atual, [k]: valor }));

  const custo = num(v.preco_custo);
  const venda = num(v.preco_venda);
  const margem = custo > 0 && venda > 0 ? ((venda - custo) / venda) * 100 : null;

  const adicionarCategoria = async () => {
    if (!novaCategoria.trim()) return;
    try {
      const c = await criarCategoria(barId, novaCategoria);
      onCategoriaCriada(c);
      set("categoria_id", c.id);
      setNovaCategoria("");
    } catch (e) {
      toast.error(mensagemErro(e, "Erro ao criar categoria"));
    }
  };

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (v.nome.trim().length < 2) return toast.warning("Informe o nome do produto.");
    if (venda <= 0) return toast.warning("Informe o preço de venda.");
    if (v.ncm && v.ncm.replace(/\D/g, "").length !== 8) return toast.warning("O NCM deve ter 8 dígitos.");

    const dados: ProdutoForm = {
      nome: v.nome.trim(),
      categoria_id: v.categoria_id || null,
      codigo_barras: v.codigo_barras.trim() || null,
      codigo_interno: v.codigo_interno.trim() || null,
      unidade: v.unidade,
      preco_custo: custo,
      preco_venda: venda,
      estoque_atual: Math.round(num(v.estoque_atual)),
      estoque_minimo: Math.round(num(v.estoque_minimo)),
      ncm: v.ncm.replace(/\D/g, "") || null,
      cest: v.cest.replace(/\D/g, "") || null,
      cfop: v.cfop || "5102",
      csosn: v.csosn || "102",
      origem: Number(v.origem),
      ativo: v.ativo,
    };

    setSalvando(true);
    try {
      const salvo = edicao ? await atualizarProduto(produto!.id, dados) : await criarProduto(barId, dados);
      toast.success(edicao ? "Produto atualizado" : "Produto cadastrado");
      onSalvo(salvo);
      onOpenChange(false);
    } catch (err) {
      toast.error(mensagemErro(err, "Erro ao salvar produto"));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[560px] max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{edicao ? "Editar produto" : "Novo produto"}</DialogTitle>
            <DialogDescription>
              {edicao ? "Para alterar a quantidade em estoque use o botão de movimentação." : "Cadastre o produto e o estoque inicial."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={salvar} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nome *</Label>
              <Input value={v.nome} onChange={(e) => set("nome", e.target.value)} placeholder="Cerveja Heineken Long Neck 330ml" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Código de barras (EAN)</Label>
                <div className="flex gap-2">
                  <Input
                    data-barcode-input
                    value={v.codigo_barras}
                    onChange={(e) => set("codigo_barras", e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
                    placeholder="Bipe ou digite"
                    inputMode="numeric"
                  />
                  <Button type="button" variant="outline" size="icon" onClick={() => setCamera(true)}>
                    <Camera className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Código interno</Label>
                <Input value={v.codigo_interno} onChange={(e) => set("codigo_interno", e.target.value)} placeholder="Ex.: 101" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Categoria</Label>
                <Select value={v.categoria_id || "nenhuma"} onValueChange={(c) => set("categoria_id", c === "nenhuma" ? "" : c)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nenhuma">Sem categoria</SelectItem>
                    {categorias.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Nova categoria</Label>
                <div className="flex gap-2">
                  <Input
                    value={novaCategoria}
                    onChange={(e) => setNovaCategoria(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        adicionarCategoria();
                      }
                    }}
                    placeholder="Ex.: Petiscos"
                  />
                  <Button type="button" variant="outline" size="icon" onClick={adicionarCategoria}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Custo (R$)</Label>
                <Input value={v.preco_custo} onChange={(e) => set("preco_custo", e.target.value)} inputMode="decimal" />
              </div>
              <div className="space-y-1.5">
                <Label>Venda (R$) *</Label>
                <Input value={v.preco_venda} onChange={(e) => set("preco_venda", e.target.value)} inputMode="decimal" />
              </div>
              <div className="space-y-1.5 col-span-2 sm:col-span-1">
                <Label>Unidade</Label>
                <Select value={v.unidade} onValueChange={(u) => set("unidade", u)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UNIDADES.map((u) => (
                      <SelectItem key={u} value={u}>
                        {u}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {margem !== null && (
              <p className="text-xs text-muted-foreground -mt-2">
                Margem: <span className={margem < 0 ? "text-destructive" : "font-medium"}>{margem.toFixed(1)}%</span> · lucro de{" "}
                {formatBRL(venda - custo)} por unidade
              </p>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{edicao ? "Estoque atual" : "Estoque inicial"}</Label>
                <Input
                  value={v.estoque_atual}
                  onChange={(e) => set("estoque_atual", e.target.value)}
                  inputMode="numeric"
                  disabled={edicao}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Estoque mínimo</Label>
                <Input value={v.estoque_minimo} onChange={(e) => set("estoque_minimo", e.target.value)} inputMode="numeric" />
              </div>
            </div>

            <Collapsible open={fiscalAberto} onOpenChange={setFiscalAberto} className="rounded-lg border">
              <CollapsibleTrigger asChild>
                <button type="button" className="flex w-full items-center justify-between p-3 text-sm font-medium">
                  Dados fiscais (NFC-e)
                  {!v.ncm && <span className="text-xs text-amber-600 font-normal ml-2">NCM obrigatório para emitir nota</span>}
                  <ChevronDown className={`h-4 w-4 ml-auto transition-transform ${fiscalAberto ? "rotate-180" : ""}`} />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="grid grid-cols-2 gap-3 p-3 pt-0">
                <div className="space-y-1.5">
                  <Label>NCM</Label>
                  <Input value={v.ncm} onChange={(e) => set("ncm", e.target.value)} placeholder="22030000" inputMode="numeric" />
                </div>
                <div className="space-y-1.5">
                  <Label>CEST</Label>
                  <Input value={v.cest} onChange={(e) => set("cest", e.target.value)} placeholder="0302100" inputMode="numeric" />
                </div>
                <div className="space-y-1.5">
                  <Label>CFOP</Label>
                  <Input value={v.cfop} onChange={(e) => set("cfop", e.target.value)} placeholder="5102 ou 5405" inputMode="numeric" />
                </div>
                <div className="space-y-1.5">
                  <Label>CSOSN</Label>
                  <Select value={v.csosn} onValueChange={(c) => set("csosn", c)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="102">102 - Sem permissão de crédito</SelectItem>
                      <SelectItem value="103">103 - Isenção (faixa de receita)</SelectItem>
                      <SelectItem value="300">300 - Imune</SelectItem>
                      <SelectItem value="400">400 - Não tributada</SelectItem>
                      <SelectItem value="500">500 - ICMS cobrado por ST</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label>Origem</Label>
                  <Select value={v.origem} onValueChange={(o) => set("origem", o)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">0 - Nacional</SelectItem>
                      <SelectItem value="1">1 - Estrangeira (importação direta)</SelectItem>
                      <SelectItem value="2">2 - Estrangeira (mercado interno)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <p className="col-span-2 text-xs text-muted-foreground">
                  Bebidas com substituição tributária normalmente usam CFOP 5405 e CSOSN 500. Confirme a tributação
                  de cada produto com o contador do bar.
                </p>
              </CollapsibleContent>
            </Collapsible>

            <label className="flex items-center justify-between text-sm">
              Produto ativo (aparece no PDV)
              <Switch checked={v.ativo} onCheckedChange={(a) => set("ativo", a)} />
            </label>

            <DialogFooter>
              <Button type="submit" disabled={salvando} className="w-full sm:w-auto">
                {salvando ? "Salvando..." : edicao ? "Salvar alterações" : "Cadastrar produto"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <CameraScanner open={camera} onOpenChange={setCamera} onScan={(c) => set("codigo_barras", c)} titulo="Ler código do produto" />
    </>
  );
};

export default ProdutoModal;
