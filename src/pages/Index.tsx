
import React from "react";
import Layout from "@/components/Layout";
import StatsCard from "@/components/Dashboard/StatsCard";
import RecentSales from "@/components/Dashboard/RecentSales";
import StockAlert from "@/components/Dashboard/StockAlert";
import { 
  ShoppingCart, 
  TrendingUp, 
  Package, 
  Wine, 
  DollarSign, 
  Percent 
} from "lucide-react";
import { mockSales, mockProducts, salesSummary, stockSummary, financialSummary } from "@/data/mockData";
import { StaggeredContainer, SlideInFromBottom } from "@/components/ui/motion";

const Dashboard = () => {
  const currentDate = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <Layout>
      <div className="space-y-8">
        <StaggeredContainer delay={0.1} staggerDelay={0.1}>
          <SlideInFromBottom>
            <div className="space-y-1">
              <h2 className="text-3xl font-display font-semibold tracking-tight">Dashboard</h2>
              <p className="text-muted-foreground">
                {currentDate.charAt(0).toUpperCase() + currentDate.slice(1)}
              </p>
            </div>
          </SlideInFromBottom>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
            <StatsCard
              title="Vendas Totais"
              value={`R$ ${salesSummary.totalSales.toFixed(2)}`}
              description={`${salesSummary.salesCount} vendas este mês`}
              icon={<ShoppingCart className="h-5 w-5" />}
              trend={{ value: 12.5, isPositive: true }}
              delay={0.1}
            />
            <StatsCard
              title="Ticket Médio"
              value={`R$ ${salesSummary.averageTicket.toFixed(2)}`}
              description="Por venda finalizada"
              icon={<TrendingUp className="h-5 w-5" />}
              trend={{ value: 3.2, isPositive: true }}
              delay={0.2}
            />
            <StatsCard
              title="Valor em Estoque"
              value={`R$ ${stockSummary.totalValue.toFixed(2)}`}
              description={`${stockSummary.totalProducts} produtos cadastrados`}
              icon={<Package className="h-5 w-5" />}
              delay={0.3}
            />
            <StatsCard
              title="Margem de Lucro"
              value={`${financialSummary.margin.toFixed(1)}%`}
              description={`Lucro: R$ ${financialSummary.profit.toFixed(2)}`}
              icon={<Percent className="h-5 w-5" />}
              trend={{ value: 2.1, isPositive: true }}
              delay={0.4}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
            <div className="lg:col-span-2">
              <RecentSales sales={mockSales} />
            </div>
            <div className="lg:col-span-1">
              <StockAlert products={mockProducts} />
            </div>
          </div>
        </StaggeredContainer>
      </div>
    </Layout>
  );
};

export default Dashboard;
