import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, Receipt, ScanBarcode, Search, ShoppingCart, Wine } from "lucide-react";
import { toast } from "sonner";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import CameraScanner from "@/components/scanner/CameraScanner";
import Carrinho, { totalCarrinho } from "@/components/pdv/Carrinho";
import CheckoutDialog, { type ResultadoCheckout } from "@/components/pdv/CheckoutDialog";
import HistoricoVendas from "@/components/pdv/HistoricoVendas";
import { useAuth } from "@/context/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { bip, useBarcodeScanner } from "@/hooks/useBarcodeScanner";
import { formatBRL, mensagemErro } from "@/lib/format";
import { imprimirCupom, lerConfigImpressora } from "@/lib/printing/impressora";
import { buscarPorCodigo, listarProdutos, type Produto } from "@/services/produtosService";
import { carregarConfigFiscal, emitirNfce } from "@/services/baresService";
import { carregarVenda, finalizarVenda, vendaParaCupom, type ItemCarrinho } from "@/services/vendasService";

const chaveCarrinho = (barId: string) => `dmp:carrinho:${barId}`;

const lerCarrinho = (barId: string): ItemCarrinho[] => {
  try {
    return JSON.parse(localStorage.getItem(chaveCarrinho(barId)) ?? "[]");
  } catch {
    return [];
  }
};

const Vendas = () => {
  const { barAtivo, hasPermission } = useAuth();
  const barId = barAtivo!.bar.id;
  const permiteNegativo = barAtivo!.bar.permitir_estoque_negativo;
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();

  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState<string | null>(null);
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>(() => lerCarrinho(barId));
  const [cameraAberta, setCameraAberta] = useState(false);
  const [carrinhoAberto, setCarrinhoAberto] = useState(false);
  const [checkoutAberto, setCheckoutAberto] = useState(false);
  const [processando, setProcessando] = useState(false);
  const [aba, setAba] = useState("nova");

  const { data: produtos = [], isLoading } = useQuery({
    queryKey: ["produtos", barId],
    queryFn: () => listarProdutos(barId),
  });

  const podeEmitir = hasPermission("fiscal");
  const { data: configFiscal } = useQuery({
    queryKey: ["config-fiscal", barId],
    queryFn: () => carregarConfigFiscal(barId),
    enabled: podeEmitir,
  });

  // carrinho sobrevive a recarregar a página (útil no celular)
  useEffect(() => setCarrinho(lerCarrinho(barId)), [barId]);
  useEffect(() => {
    try {
      localStorage.setItem(chaveCarrinho(barId), JSON.stringify(carrinho));
    } catch {
      /* armazenamento indisponível */
    }
  }, [carrinho, barId]);

  const ativos = useMemo(() => produtos.filter((p) => p.ativo), [produtos]);
  const categorias = useMemo(
    () => Array.from(new Set(ativos.map((p) => p.categoria?.nome).filter(Boolean))) as string[],
    [ativos]
  );
  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return ativos.filter(
      (p) =>
        (!categoria || p.categoria?.nome === categoria) &&
        (!termo ||
          p.nome.toLowerCase().includes(termo) ||
          p.codigo_barras?.includes(termo) ||
          p.codigo_interno?.toLowerCase() === termo)
    );
  }, [ativos, busca, categoria]);

  const adicionar = useCallback(
    (produto: Produto, quantidade = 1) => {
      const noCarrinho = carrinho.find((i) => i.produto_id === produto.id)?.quantidade ?? 0;
      if (!permiteNegativo && (produto.estoque_atual ?? 0) < noCarrinho + quantidade) {
        bip(false);
        toast.error(`Estoque insuficiente para ${produto.nome}`);
        return false;
      }
      setCarrinho((atual) => {
        const existe = atual.find((i) => i.produto_id === produto.id);
        if (existe) {
          return atual.map((i) => (i.produto_id === produto.id ? { ...i, quantidade: i.quantidade + quantidade } : i));
        }
        return [
          ...atual,
          {
            produto_id: produto.id,
            nome: produto.nome,
            preco: Number(produto.preco_venda ?? 0),
            quantidade,
            codigo_barras: produto.codigo_barras,
            unidade: produto.unidade,
          },
        ];
      });
      return true;
    },
    [carrinho, permiteNegativo]
  );

  const lerCodigo = useCallback(
    (codigo: string) => {
      const produto = buscarPorCodigo(ativos, codigo);
      if (!produto) {
        bip(false);
        toast.error(`Código não cadastrado: ${codigo}`);
        return false;
      }
      if (adicionar(produto)) {
        bip(true);
        toast.success(`${produto.nome} adicionado`, { duration: 1200 });
      }
      return true;
    },
    [ativos, adicionar]
  );

  // Leitor BIP (USB/Bluetooth em modo teclado) funciona em qualquer lugar da tela
  useBarcodeScanner({ onScan: lerCodigo, enabled: aba === "nova" && !checkoutAberto && !cameraAberta });

  const alterarQuantidade = (produtoId: string, delta: number) => {
    const produto = produtos.find((p) => p.id === produtoId);
    const item = carrinho.find((i) => i.produto_id === produtoId);
    if (!item) return;
    if (delta > 0 && produto && !permiteNegativo && item.quantidade + delta > (produto.estoque_atual ?? 0)) {
      toast.error(`Estoque insuficiente para ${item.nome}`);
      return;
    }
    setCarrinho((atual) =>
      atual.map((i) => (i.produto_id === produtoId ? { ...i, quantidade: Math.max(1, i.quantidade + delta) } : i))
    );
  };

  const confirmarVenda = async (r: ResultadoCheckout) => {
    setProcessando(true);
    try {
      const venda = await finalizarVenda({
        barId,
        itens: carrinho,
        pagamentos: r.pagamentos,
        desconto: r.desconto,
        clienteCpf: r.clienteCpf,
        origem: isMobile ? "mobile" : "pdv",
      });

      setCarrinho([]);
      setCheckoutAberto(false);
      setCarrinhoAberto(false);
      toast.success(
        `Venda nº ${venda.numero} finalizada${venda.troco > 0 ? ` · Troco ${formatBRL(venda.troco)}` : ""}`
      );
      queryClient.invalidateQueries({ queryKey: ["produtos", barId] });
      queryClient.invalidateQueries({ queryKey: ["vendas", barId] });

      if (r.emitirNota) {
        try {
          const nota = await emitirNfce(venda.id);
          if (nota.status === "autorizada") toast.success(`NFC-e nº ${nota.numero} autorizada`);
          else toast.error(`NFC-e não autorizada: ${nota.mensagem ?? nota.status}. Reenvie pelo histórico.`);
        } catch (e) {
          toast.error(`${mensagemErro(e, "Erro ao emitir NFC-e")} A venda foi registrada; reenvie pelo histórico.`);
        }
      }

      if (r.imprimir) {
        try {
          const completa = await carregarVenda(venda.id);
          await imprimirCupom(vendaParaCupom(completa, barAtivo!.bar, produtos));
        } catch (e) {
          toast.error(mensagemErro(e, "Falha ao imprimir o cupom"));
        }
      }
    } catch (error) {
      toast.error(mensagemErro(error, "Erro ao finalizar venda"));
      queryClient.invalidateQueries({ queryKey: ["produtos", barId] });
    } finally {
      setProcessando(false);
    }
  };

  const total = totalCarrinho(carrinho);
  const qtdItens = carrinho.reduce((s, i) => s + i.quantidade, 0);
  const podeHistorico = hasPermission("relatorios") || hasPermission("vendas_cancelar");

  const carrinhoEl = (
    <Carrinho
      itens={carrinho}
      onAlterarQuantidade={alterarQuantidade}
      onRemover={(id) => setCarrinho((c) => c.filter((i) => i.produto_id !== id))}
      onLimpar={() => setCarrinho([])}
      onFinalizar={() => setCheckoutAberto(true)}
      processando={processando}
    />
  );

  return (
    <Layout>
      <Tabs value={aba} onValueChange={setAba} className="w-full">
        <div className="flex items-center justify-between gap-2 mb-4">
          <h2 className="text-2xl sm:text-3xl font-display font-semibold tracking-tight">Vendas</h2>
          {podeHistorico && (
            <TabsList>
              <TabsTrigger value="nova">
                <ShoppingCart className="h-4 w-4 mr-2" /> PDV
              </TabsTrigger>
              <TabsTrigger value="historico">
                <Receipt className="h-4 w-4 mr-2" /> Histórico
              </TabsTrigger>
            </TabsList>
          )}
        </div>

        <TabsContent value="nova" className="m-0">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 space-y-3">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    data-barcode-input
                    placeholder="Buscar ou bipar código..."
                    className="pl-8 h-10"
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key !== "Enter" || !busca.trim()) return;
                      e.preventDefault();
                      // Enter com código exato = leitura do leitor com o campo focado
                      if (buscarPorCodigo(ativos, busca)) {
                        lerCodigo(busca);
                        setBusca("");
                      } else if (filtrados.length === 1) {
                        if (adicionar(filtrados[0])) setBusca("");
                      }
                    }}
                  />
                </div>
                <Button variant="outline" className="h-10 gap-2" onClick={() => setCameraAberta(true)}>
                  <Camera className="h-4 w-4" />
                  <span className="hidden sm:inline">Câmera</span>
                </Button>
              </div>

              {categorias.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                  <Button size="sm" variant={!categoria ? "default" : "outline"} onClick={() => setCategoria(null)}>
                    Todos
                  </Button>
                  {categorias.map((c) => (
                    <Button
                      key={c}
                      size="sm"
                      variant={categoria === c ? "default" : "outline"}
                      onClick={() => setCategoria(c)}
                      className="shrink-0"
                    >
                      {c}
                    </Button>
                  ))}
                </div>
              )}

              {isLoading ? (
                <div className="py-12 text-center text-muted-foreground">Carregando produtos...</div>
              ) : filtrados.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground flex flex-col items-center gap-2">
                  <ScanBarcode className="h-8 w-8 opacity-40" />
                  {ativos.length === 0 ? "Nenhum produto cadastrado. Cadastre em Estoque." : "Nenhum produto encontrado."}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3">
                  {filtrados.map((p) => {
                    const semEstoque = !permiteNegativo && (p.estoque_atual ?? 0) <= 0;
                    const baixo = (p.estoque_atual ?? 0) <= (p.estoque_minimo ?? 0);
                    const qtd = carrinho.find((i) => i.produto_id === p.id)?.quantidade;
                    return (
                      <Card
                        key={p.id}
                        role="button"
                        className={`relative overflow-hidden cursor-pointer select-none active:scale-[0.98] transition-transform flex flex-col ${
                          semEstoque ? "opacity-50" : ""
                        }`}
                        onClick={() => (semEstoque ? toast.error(`Sem estoque para ${p.nome}`) : adicionar(p))}
                      >
                        {qtd && (
                          <span className="absolute top-1.5 right-1.5 z-10 h-6 min-w-6 px-1.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold flex items-center justify-center">
                            {qtd}
                          </span>
                        )}
                        <div className="h-16 sm:h-20 bg-primary/10 flex items-center justify-center">
                          {p.imagem_url ? (
                            <img src={p.imagem_url} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <Wine className="h-7 w-7 text-primary/60" />
                          )}
                        </div>
                        <div className="p-2 sm:p-3 flex flex-col flex-1 gap-1">
                          <h3 className="font-medium text-sm leading-tight line-clamp-2 flex-1">{p.nome}</h3>
                          <div className="flex justify-between items-center gap-1">
                            <span className="text-sm font-semibold">{formatBRL(Number(p.preco_venda))}</span>
                            <Badge variant={baixo ? "destructive" : "outline"} className="text-[10px] px-1.5">
                              {p.estoque_atual ?? 0}
                            </Badge>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>

            {!isMobile && (
              <Card className="lg:col-span-1 lg:sticky lg:top-20 h-[calc(100vh-7rem)] overflow-hidden">{carrinhoEl}</Card>
            )}
          </div>

          {/* Barra do carrinho no celular */}
          {isMobile && carrinho.length > 0 && (
            <div className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-30 px-3 pb-2">
              <Button size="lg" className="w-full h-14 justify-between text-base shadow-lg" onClick={() => setCarrinhoAberto(true)}>
                <span className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" /> {qtdItens} {qtdItens === 1 ? "item" : "itens"}
                </span>
                <span className="font-semibold">{formatBRL(total)}</span>
              </Button>
            </div>
          )}
        </TabsContent>

        {podeHistorico && (
          <TabsContent value="historico" className="m-0">
            <HistoricoVendas produtos={produtos} />
          </TabsContent>
        )}
      </Tabs>

      <Sheet open={isMobile && carrinhoAberto} onOpenChange={setCarrinhoAberto}>
        <SheetContent side="bottom" className="h-[85vh] p-0 flex flex-col rounded-t-xl">
          <SheetHeader className="sr-only">
            <SheetTitle>Carrinho</SheetTitle>
          </SheetHeader>
          {carrinhoEl}
        </SheetContent>
      </Sheet>

      <CameraScanner open={cameraAberta} onOpenChange={setCameraAberta} onScan={lerCodigo} continuo titulo="Ler produtos" />

      <CheckoutDialog
        open={checkoutAberto}
        onOpenChange={setCheckoutAberto}
        subtotal={total}
        podeEmitirNota={podeEmitir}
        emitirNotaPadrao={!!configFiscal?.emitir_automaticamente}
        imprimirPadrao={lerConfigImpressora().imprimirAutomatico}
        processando={processando}
        onConfirmar={confirmarVenda}
      />

    </Layout>
  );
};

export default Vendas;
