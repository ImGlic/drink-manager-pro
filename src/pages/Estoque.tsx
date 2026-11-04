import React, { useCallback, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDownUp, Camera, PackagePlus, Pencil, Plus, ScanBarcode, Search, Trash2, Wine } from "lucide-react";
import { toast } from "sonner";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ProdutoModal from "@/components/estoque/ProdutoModal";
import CameraScanner from "@/components/scanner/CameraScanner";
import { useAuth } from "@/context/AuthContext";
import { bip, useBarcodeScanner } from "@/hooks/useBarcodeScanner";
import { formatBRL, mensagemErro } from "@/lib/format";
import {
  buscarPorCodigo,
  excluirProduto,
  listarCategorias,
  listarProdutos,
  movimentarEstoque,
  type Produto,
  type TipoMovimentacao,
  type Categoria,
} from "@/services/produtosService";

const Estoque = () => {
  const { barAtivo } = useAuth();
  const barId = barAtivo!.bar.id;
  const queryClient = useQueryClient();

  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState<string | null>(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<Produto | null>(null);
  const [codigoNovo, setCodigoNovo] = useState<string | undefined>();
  const [excluindo, setExcluindo] = useState<Produto | null>(null);
  const [movimentando, setMovimentando] = useState<Produto | null>(null);
  const [tipoMov, setTipoMov] = useState<TipoMovimentacao>("entrada");
  const [qtdMov, setQtdMov] = useState("1");
  const [obsMov, setObsMov] = useState("");
  const [entradaRapida, setEntradaRapida] = useState(false);
  const [camera, setCamera] = useState(false);

  const { data: produtos = [], isLoading } = useQuery({
    queryKey: ["produtos", barId],
    queryFn: () => listarProdutos(barId),
  });
  const { data: categorias = [] } = useQuery({
    queryKey: ["categorias", barId],
    queryFn: () => listarCategorias(barId),
  });

  const atualizarLista = (fn: (lista: Produto[]) => Produto[]) =>
    queryClient.setQueryData<Produto[]>(["produtos", barId], (atual) => fn(atual ?? []));

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return produtos.filter(
      (p) =>
        (!categoria || p.categoria_id === categoria) &&
        (!termo || p.nome.toLowerCase().includes(termo) || p.codigo_barras?.includes(termo) || p.codigo_interno === termo)
    );
  }, [produtos, busca, categoria]);

  const abrirNovo = (codigo?: string) => {
    setEditando(null);
    setCodigoNovo(codigo);
    setModalAberto(true);
  };

  const abrirMovimentacao = (p: Produto, tipo: TipoMovimentacao = "entrada") => {
    setMovimentando(p);
    setTipoMov(tipo);
    setQtdMov(tipo === "ajuste" ? String(p.estoque_atual ?? 0) : "1");
    setObsMov("");
  };

  const aplicarMovimentacao = async (produto: Produto, tipo: TipoMovimentacao, qtd: number, obs?: string) => {
    const novo = await movimentarEstoque(produto.id, tipo, qtd, obs);
    atualizarLista((lista) => lista.map((p) => (p.id === produto.id ? { ...p, estoque_atual: novo } : p)));
    return novo;
  };

  const confirmarMovimentacao = async () => {
    if (!movimentando) return;
    const qtd = Number(qtdMov.replace(",", "."));
    if (!Number.isFinite(qtd) || qtd < 0) return toast.warning("Quantidade inválida");
    try {
      const novo = await aplicarMovimentacao(movimentando, tipoMov, qtd, obsMov);
      toast.success(`${movimentando.nome}: estoque agora é ${novo}`);
      setMovimentando(null);
    } catch (e) {
      toast.error(mensagemErro(e, "Erro ao movimentar estoque"));
    }
  };

  /** Leitura de código (BIP, coletor ou câmera). */
  const lerCodigo = useCallback(
    async (codigo: string) => {
      const produto = buscarPorCodigo(produtos, codigo);
      if (!produto) {
        bip(false);
        toast.info(`Código ${codigo} não cadastrado. Cadastre o produto.`);
        abrirNovo(codigo);
        return;
      }
      if (entradaRapida) {
        try {
          const novo = await aplicarMovimentacao(produto, "entrada", 1, "Entrada por leitura");
          bip(true);
          toast.success(`+1 ${produto.nome} (estoque: ${novo})`, { duration: 1500 });
        } catch (e) {
          bip(false);
          toast.error(mensagemErro(e));
        }
        return;
      }
      bip(true);
      abrirMovimentacao(produto, "entrada");
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [produtos, entradaRapida]
  );

  useBarcodeScanner({ onScan: lerCodigo, enabled: !modalAberto && !movimentando && !camera });

  const confirmarExclusao = async () => {
    if (!excluindo) return;
    try {
      await excluirProduto(excluindo.id);
      atualizarLista((lista) => lista.filter((p) => p.id !== excluindo.id));
      toast.success("Produto excluído");
    } catch (e) {
      toast.error(mensagemErro(e, "Erro ao excluir. Desative o produto em vez de excluir."));
    } finally {
      setExcluindo(null);
    }
  };

  const valorEstoque = produtos.reduce((s, p) => s + Number(p.preco_custo ?? 0) * Math.max(0, p.estoque_atual ?? 0), 0);
  const baixos = produtos.filter((p) => p.ativo && (p.estoque_atual ?? 0) <= (p.estoque_minimo ?? 0)).length;

  const Acoes = ({ p }: { p: Produto }) => (
    <div className="flex gap-1">
      <Button variant="ghost" size="icon" className="h-8 w-8" title="Movimentar estoque" onClick={() => abrirMovimentacao(p)}>
        <ArrowDownUp className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        title="Editar"
        onClick={() => {
          setEditando(p);
          setModalAberto(true);
        }}
      >
        <Pencil className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-destructive hover:text-destructive"
        title="Excluir"
        onClick={() => setExcluindo(p)}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between gap-3">
          <div>
            <h2 className="text-2xl sm:text-3xl font-display font-semibold tracking-tight">Estoque</h2>
            <p className="text-muted-foreground text-sm">
              {produtos.length} produtos · {formatBRL(valorEstoque)} em estoque (custo)
              {baixos > 0 && <span className="text-destructive"> · {baixos} com estoque baixo</span>}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setCamera(true)} className="gap-2">
              <Camera className="h-4 w-4" /> <span className="hidden sm:inline">Ler código</span>
            </Button>
            <Button onClick={() => abrirNovo()} className="gap-2 flex-1 sm:flex-none">
              <Plus className="h-4 w-4" /> Novo produto
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-3 flex flex-col sm:flex-row gap-3 sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                data-barcode-input
                placeholder="Buscar por nome ou código..."
                className="pl-8"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && busca.trim()) {
                    e.preventDefault();
                    if (buscarPorCodigo(produtos, busca) || /^\d{8,14}$/.test(busca.trim())) {
                      lerCodigo(busca.trim());
                      setBusca("");
                    }
                  }
                }}
              />
            </div>
            <Select value={categoria ?? "todas"} onValueChange={(c) => setCategoria(c === "todas" ? null : c)}>
              <SelectTrigger className="sm:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as categorias</SelectItem>
                {categorias.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <label className="flex items-center gap-2 text-sm whitespace-nowrap" title="Cada leitura soma +1 no estoque">
              <ScanBarcode className="h-4 w-4" />
              Entrada rápida
              <Switch checked={entradaRapida} onCheckedChange={setEntradaRapida} />
            </label>
          </CardContent>
        </Card>
        {entradaRapida && (
          <p className="text-sm rounded-lg bg-amber-50 border border-amber-200 p-3 text-amber-900">
            Modo entrada rápida ligado: cada código lido pelo leitor BIP, coletor ou câmera soma 1 unidade no estoque.
          </p>
        )}

        {isLoading ? (
          <div className="py-12 text-center text-muted-foreground">Carregando produtos...</div>
        ) : filtrados.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground flex flex-col items-center gap-3">
            <PackagePlus className="h-10 w-10 opacity-40" />
            Nenhum produto encontrado.
          </div>
        ) : (
          <>
            {/* Celular: cartões */}
            <div className="md:hidden space-y-2">
              {filtrados.map((p) => {
                const baixo = (p.estoque_atual ?? 0) <= (p.estoque_minimo ?? 0);
                return (
                  <Card key={p.id} className={p.ativo ? "" : "opacity-60"}>
                    <CardContent className="p-3 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{p.nome}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {p.categoria?.nome ?? "Sem categoria"} · {formatBRL(Number(p.preco_venda))}
                          {p.codigo_barras && ` · ${p.codigo_barras}`}
                        </p>
                      </div>
                      <Badge variant={baixo ? "destructive" : "outline"}>{p.estoque_atual ?? 0}</Badge>
                      <Acoes p={p} />
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Desktop: tabela */}
            <Card className="hidden md:block">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead className="text-right">Custo</TableHead>
                    <TableHead className="text-right">Venda</TableHead>
                    <TableHead className="text-right">Margem</TableHead>
                    <TableHead className="text-right">Estoque</TableHead>
                    <TableHead>Fiscal</TableHead>
                    <TableHead className="w-[120px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtrados.map((p) => {
                    const baixo = (p.estoque_atual ?? 0) <= (p.estoque_minimo ?? 0);
                    const custo = Number(p.preco_custo ?? 0);
                    const venda = Number(p.preco_venda ?? 0);
                    return (
                      <TableRow key={p.id} className={p.ativo ? "" : "opacity-60"}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                              <Wine className="h-5 w-5" />
                            </div>
                            <div>
                              {p.nome}
                              {!p.ativo && <Badge variant="outline" className="ml-2">Inativo</Badge>}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{p.codigo_barras ?? p.codigo_interno ?? "-"}</TableCell>
                        <TableCell>{p.categoria?.nome ?? "-"}</TableCell>
                        <TableCell className="text-right">{custo ? formatBRL(custo) : "-"}</TableCell>
                        <TableCell className="text-right">{formatBRL(venda)}</TableCell>
                        <TableCell className="text-right">{custo && venda ? `${(((venda - custo) / venda) * 100).toFixed(0)}%` : "-"}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={baixo ? "destructive" : "outline"}>
                            {p.estoque_atual ?? 0} / mín {p.estoque_minimo ?? 0}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {p.ncm ? (
                            <span className="text-xs text-muted-foreground">NCM {p.ncm}</span>
                          ) : (
                            <span className="text-xs text-amber-600">Sem NCM</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Acoes p={p} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          </>
        )}
      </div>

      <ProdutoModal
        open={modalAberto}
        onOpenChange={setModalAberto}
        barId={barId}
        categorias={categorias}
        produto={editando}
        codigoInicial={codigoNovo}
        onSalvo={(salvo) =>
          atualizarLista((lista) =>
            lista.some((p) => p.id === salvo.id) ? lista.map((p) => (p.id === salvo.id ? salvo : p)) : [...lista, salvo]
          )
        }
        onCategoriaCriada={(c) =>
          queryClient.setQueryData<Categoria[]>(["categorias", barId], (atual) => [...(atual ?? []), c])
        }
      />

      <CameraScanner
        open={camera}
        onOpenChange={setCamera}
        onScan={lerCodigo}
        continuo={entradaRapida}
        titulo={entradaRapida ? "Entrada rápida" : "Ler código"}
      />

      <Dialog open={!!movimentando} onOpenChange={(o) => !o && setMovimentando(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Movimentar estoque</DialogTitle>
            <DialogDescription>
              {movimentando?.nome} · atual: <strong>{movimentando?.estoque_atual ?? 0}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  ["entrada", "Entrada"],
                  ["perda", "Perda"],
                  ["ajuste", "Contagem"],
                ] as const
              ).map(([t, nome]) => (
                <Button
                  key={t}
                  type="button"
                  variant={tipoMov === t ? "default" : "outline"}
                  onClick={() => {
                    setTipoMov(t);
                    if (t === "ajuste") setQtdMov(String(movimentando?.estoque_atual ?? 0));
                  }}
                >
                  {nome}
                </Button>
              ))}
            </div>
            <div className="space-y-1.5">
              <Label>{tipoMov === "ajuste" ? "Quantidade contada (novo estoque)" : "Quantidade"}</Label>
              <Input
                value={qtdMov}
                onChange={(e) => setQtdMov(e.target.value)}
                inputMode="numeric"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && confirmarMovimentacao()}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Observação</Label>
              <Input value={obsMov} onChange={(e) => setObsMov(e.target.value)} placeholder="Ex.: nota do fornecedor 123" />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={confirmarMovimentacao} className="w-full">
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!excluindo} onOpenChange={(o) => !o && setExcluindo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {excluindo?.nome}?</AlertDialogTitle>
            <AlertDialogDescription>
              O histórico de vendas é mantido, mas o histórico de movimentações deste produto será apagado. Para apenas
              tirar do PDV, edite o produto e desmarque "ativo".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmarExclusao} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
};

export default Estoque;
