
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScaleIn } from "../ui/motion";
import { Badge } from "@/components/ui/badge";
import { Wine } from "lucide-react";

interface Product {
  id: string;
  name: string;
  currentStock: number;
  minimumStock: number;
  category: string;
}

interface StockAlertProps {
  products: Product[];
}

const StockAlert: React.FC<StockAlertProps> = ({ products }) => {
  // Filter products with low stock
  const lowStockProducts = products.filter(
    (product) => product.currentStock <= product.minimumStock
  );

  // Sort by stock level (lowest first)
  const sortedProducts = [...lowStockProducts].sort(
    (a, b) => (a.currentStock / a.minimumStock) - (b.currentStock / b.minimumStock)
  );

  // Get only the first 5 products
  const productsToShow = sortedProducts.slice(0, 5);

  return (
    <ScaleIn className="h-full" transition={{ delay: 0.2 }}>
      <Card className="h-full">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-xl">Alertas de Estoque</CardTitle>
            <CardDescription>
              {lowStockProducts.length} produtos com estoque baixo
            </CardDescription>
          </div>
          {lowStockProducts.length > 0 && (
            <Badge variant="destructive" className="px-2 py-1">
              {lowStockProducts.length}
            </Badge>
          )}
        </CardHeader>
        <CardContent>
          {productsToShow.length > 0 ? (
            <div className="space-y-4">
              {productsToShow.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-destructive/5 border border-destructive/10"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-destructive/10 flex items-center justify-center text-destructive">
                      <Wine className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{product.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {product.category}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-sm">
                      {product.currentStock} un
                    </p>
                    <p className="text-xs text-destructive">
                      Mínimo: {product.minimumStock}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-32 text-muted-foreground">
              Nenhum produto com estoque baixo.
            </div>
          )}
          {lowStockProducts.length > 5 && (
            <div className="mt-4 text-center">
              <Badge variant="outline" className="hover:bg-secondary cursor-pointer">
                Ver todos os {lowStockProducts.length} alertas
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>
    </ScaleIn>
  );
};

export default StockAlert;
