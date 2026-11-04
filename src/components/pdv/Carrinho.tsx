import React from "react";
import { MinusCircle, PlusCircle, ShoppingCart, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatBRL } from "@/lib/format";
import type { ItemCarrinho } from "@/services/vendasService";

interface Props {
  itens: ItemCarrinho[];
  onAlterarQuantidade: (produtoId: string, delta: number) => void;
  onRemover: (produtoId: string) => void;
  onLimpar: () => void;
  onFinalizar: () => void;
  processando?: boolean;
}

export const totalCarrinho = (itens: ItemCarrinho[]) =>
  Math.round(itens.reduce((s, i) => s + i.preco * i.quantidade, 0) * 100) / 100;

const Carrinho: React.FC<Props> = ({ itens, onAlterarQuantidade, onRemover, onLimpar, onFinalizar, processando }) => {
  const total = totalCarrinho(itens);
  const qtd = itens.reduce((s, i) => s + i.quantidade, 0);

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="p-4 border-b flex justify-between items-center">
        <h3 className="font-display font-medium">
          Carrinho {qtd > 0 && <span className="text-muted-foreground font-normal">({qtd} itens)</span>}
        </h3>
        {itens.length > 0 && (
          <Button variant="ghost" size="sm" onClick={onLimpar} className="h-8 text-destructive hover:text-destructive">
            <Trash2 className="h-4 w-4 mr-1" /> Limpar
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-auto p-3 min-h-0">
        {itens.length > 0 ? (
          <div className="space-y-2">
            {itens.map((item) => (
              <div key={item.produto_id} className="flex items-center gap-2 p-2 rounded-lg border">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{item.nome}</p>
                  <p className="text-muted-foreground text-xs">
                    {formatBRL(item.preco)} · <span className="font-medium text-foreground">{formatBRL(item.preco * item.quantidade)}</span>
                  </p>
                </div>
                <div className="flex items-center">
                  <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => onAlterarQuantidade(item.produto_id, -1)}>
                    <MinusCircle className="h-5 w-5" />
                  </Button>
                  <span className="text-sm w-6 text-center font-medium">{item.quantidade}</span>
                  <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => onAlterarQuantidade(item.produto_id, 1)}>
                    <PlusCircle className="h-5 w-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-destructive hover:text-destructive"
                    onClick={() => onRemover(item.produto_id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-32 text-muted-foreground text-center gap-2">
            <ShoppingCart className="h-8 w-8 opacity-20" />
            <p>Carrinho vazio</p>
            <p className="text-xs">Toque nos produtos ou leia o código de barras</p>
          </div>
        )}
      </div>

      <div className="p-4 border-t space-y-3">
        <div className="flex justify-between text-lg font-semibold">
          <span>Total</span>
          <span>{formatBRL(total)}</span>
        </div>
        <Button className="w-full" size="lg" disabled={itens.length === 0 || processando} onClick={onFinalizar}>
          {processando ? "Processando..." : "Cobrar"}
        </Button>
      </div>
    </div>
  );
};

export default Carrinho;
