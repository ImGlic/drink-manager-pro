
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScaleIn } from "../ui/motion";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface SaleItem {
  id: string;
  product: string;
  quantity: number;
  price: number;
}

interface Sale {
  id: string;
  customer: string;
  date: Date;
  totalAmount: number;
  items: SaleItem[];
}

interface RecentSalesProps {
  sales: Sale[];
}

const RecentSales: React.FC<RecentSalesProps> = ({ sales }) => {
  return (
    <ScaleIn className="h-full" transition={{ delay: 0.3 }}>
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-xl">Vendas Recentes</CardTitle>
          <CardDescription>
            Você tem {sales.length} vendas recentes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-5">
            {sales.map((sale) => (
              <div key={sale.id} className="flex items-start justify-between pb-4 border-b last:border-0 last:pb-0">
                <div className="space-y-1">
                  <p className="font-medium">{sale.customer}</p>
                  <div className="flex flex-wrap gap-x-2 text-sm text-muted-foreground">
                    <span>
                      {formatDistanceToNow(sale.date, {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </span>
                    <span>•</span>
                    <span>{sale.items.length} itens</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold">
                    R$ {sale.totalAmount.toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </ScaleIn>
  );
};

export default RecentSales;
