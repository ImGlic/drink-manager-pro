import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { DollarSign, Percent, ShoppingCart, TrendingUp } from "lucide-react";
import Layout from "@/components/Layout";
import StatsCard from "@/components/Dashboard/StatsCard";
import StockAlert from "@/components/Dashboard/StockAlert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { formatBRL } from "@/lib/format";
import { NOMES_PAGAMENTO } from "@/lib/printing/cupom";
import { resumoDashboard } from "@/services/vendasService";
import { listarProdutos } from "@/services/produtosService";

const PERIODOS = [
  { id: "hoje", nome: "Hoje", dias: 0 },
  { id: "7d", nome: "7 dias", dias: 6 },
  { id: "30d", nome: "30 dias", dias: 29 },
] as const;

const Dashboard = () => {
  const { barAtivo } = useAuth();
  const barId = barAtivo!.bar.id;
  const [periodo, setPeriodo] = useState<(typeof PERIODOS)[number]["id"]>("hoje");

  const [inicio, fim] = useMemo(() => {
    const dias = PERIODOS.find((p) => p.id === periodo)!.dias;
    const i = new Date();
    i.setHours(0, 0, 0, 0);
    i.setDate(i.getDate() - dias);
    const f = new Date();
    f.setHours(24, 0, 0, 0);
    return [i, f];
  }, [periodo]);

  const { data: resumo, isLoading } = useQuery({
    queryKey: ["dashboard", barId, periodo],
    queryFn: () => resumoDashboard(barId, inicio, fim),
    refetchInterval: 60_000,
  });
  const { data: produtos = [] } = useQuery({ queryKey: ["produtos", barId], queryFn: () => listarProdutos(barId) });

  const faturamento = Number(resumo?.faturamento ?? 0);
  const lucro = faturamento - Number(resumo?.custo ?? 0);
  const margem = faturamento > 0 ? (lucro / faturamento) * 100 : 0;
  const porHora = Array.from({ length: 24 }, (_, h) => ({
    hora: `${h}h`,
    total: Number(resumo?.por_hora?.find((x) => x.hora === h)?.total ?? 0),
  })).filter((x, i, arr) => x.total > 0 || arr.slice(0, i).some((y) => y.total > 0));

  const dataExtenso = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl sm:text-3xl font-display font-semibold tracking-tight">Dashboard</h2>
            <p className="text-muted-foreground capitalize">{dataExtenso}</p>
          </div>
          <div className="flex gap-1 rounded-lg bg-muted p-1 self-start">
            {PERIODOS.map((p) => (
              <Button
                key={p.id}
                size="sm"
                variant={periodo === p.id ? "default" : "ghost"}
                onClick={() => setPeriodo(p.id)}
              >
                {p.nome}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatsCard
            title="Faturamento"
            value={isLoading ? "..." : formatBRL(faturamento)}
            description={`${resumo?.quantidade ?? 0} vendas`}
            icon={<DollarSign className="h-5 w-5" />}
          />
          <StatsCard
            title="Ticket médio"
            value={isLoading ? "..." : formatBRL(Number(resumo?.ticket_medio ?? 0))}
            description="Por venda"
            icon={<TrendingUp className="h-5 w-5" />}
          />
          <StatsCard
            title="Lucro bruto"
            value={isLoading ? "..." : formatBRL(lucro)}
            description="Venda menos custo dos produtos"
            icon={<ShoppingCart className="h-5 w-5" />}
          />
          <StatsCard
            title="Margem"
            value={isLoading ? "..." : `${margem.toFixed(1)}%`}
            description={`Descontos: ${formatBRL(Number(resumo?.descontos ?? 0))}`}
            icon={<Percent className="h-5 w-5" />}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg">Vendas por hora</CardTitle>
            </CardHeader>
            <CardContent className="h-64">
              {porHora.length === 0 ? (
                <div className="h-full flex items-center justify-center text-muted-foreground">Sem vendas no período.</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={porHora}>
                    <XAxis dataKey="hora" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis fontSize={12} tickLine={false} axisLine={false} width={60} tickFormatter={(v) => `R$${v}`} />
                    <Tooltip formatter={(v: number) => formatBRL(v)} />
                    <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Formas de pagamento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {Object.entries(resumo?.por_forma ?? {}).length === 0 && (
                <p className="text-muted-foreground text-sm">Sem pagamentos no período.</p>
              )}
              {Object.entries(resumo?.por_forma ?? {}).map(([forma, valor]) => (
                <div key={forma} className="flex justify-between text-sm">
                  <span>{NOMES_PAGAMENTO[forma] ?? forma}</span>
                  <span className="font-medium">
                    {formatBRL(forma === "dinheiro" ? Number(valor) - Number(resumo?.troco ?? 0) : Number(valor))}
                  </span>
                </div>
              ))}
              {Number(resumo?.troco ?? 0) > 0 && (
                <p className="text-xs text-muted-foreground pt-2">Dinheiro já descontado o troco de {formatBRL(Number(resumo?.troco))}.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg">Mais vendidos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(resumo?.top_produtos ?? []).length === 0 && <p className="text-muted-foreground text-sm">Sem vendas no período.</p>}
              {(resumo?.top_produtos ?? []).map((p, i) => (
                <div key={p.nome} className="flex items-center gap-3">
                  <span className="h-7 w-7 rounded-full bg-primary/10 text-primary text-sm font-semibold flex items-center justify-center">
                    {i + 1}
                  </span>
                  <span className="flex-1 truncate">{p.nome}</span>
                  <span className="text-sm text-muted-foreground">{Number(p.quantidade)} un</span>
                  <span className="font-medium w-24 text-right">{formatBRL(Number(p.total))}</span>
                </div>
              ))}
            </CardContent>
          </Card>
          <StockAlert
            products={produtos
              .filter((p) => p.ativo)
              .map((p) => ({
                id: p.id,
                name: p.nome,
                category: p.categoria?.nome ?? "Sem categoria",
                currentStock: p.estoque_atual ?? 0,
                minimumStock: p.estoque_minimo ?? 0,
              }))}
          />
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
