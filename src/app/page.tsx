// src/app/page.tsx - Root page, typically defaults to Admin Dashboard
'use client';

import * as React from 'react'; // Import React
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Users, ClipboardList, CheckCircle, AlertCircle, BarChart3 } from "lucide-react";
// Import necessary chart components directly from recharts or the custom wrapper
import { BarChart, XAxis, YAxis, Bar, CartesianGrid } from "recharts"; // Import Recharts components directly
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"; // Import chart container and tooltip
import type { ChartConfig } from "@/components/ui/chart"; // Import ChartConfig type
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { ConditionalLayout } from '@/components/layout/conditional-layout'; // Import ConditionalLayout

// Mock data for the chart - replace with actual data fetching
const chartData = [
  { month: "Jan", total: Math.floor(Math.random() * 100) + 50 },
  { month: "Fev", total: Math.floor(Math.random() * 100) + 50 },
  { month: "Mar", total: Math.floor(Math.random() * 100) + 50 },
  { month: "Abr", total: Math.floor(Math.random() * 100) + 50 },
  { month: "Mai", total: Math.floor(Math.random() * 100) + 50 },
  { month: "Jun", total: Math.floor(Math.random() * 100) + 50 },
];

const chartConfig = {
  total: {
    label: "Total",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

// This component contains the actual UI for the admin dashboard
function AdminDashboardContent() {
  const [isLoading, setIsLoading] = React.useState(true);
  const [dashboardData, setDashboardData] = React.useState({
      totalColaboradores: 0,
      colaboradoresAtivos: 0,
      tarefasAtivas: 0,
      avaliacoesHoje: 0,
      alertasDesempenho: 0,
  });

  React.useEffect(() => {
      const fetchData = async () => {
          setIsLoading(true);
          await new Promise(resolve => setTimeout(resolve, 1000));
          setDashboardData({
             totalColaboradores: 15,
             colaboradoresAtivos: 12,
             tarefasAtivas: 35,
             avaliacoesHoje: 10,
             alertasDesempenho: 2,
          });
          setIsLoading(false);
      }
      fetchData();
  }, []);

  const tickFormatter = (value: string) => value.slice(0, 3);

  return (
    <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Colaboradores</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
           {isLoading ? <LoadingSpinner size="sm" className="py-2"/> : (
              <>
                <div className="text-2xl font-bold">{dashboardData.totalColaboradores}</div>
                <p className="text-xs text-muted-foreground">{dashboardData.colaboradoresAtivos} ativos</p>
              </>
            )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Tarefas Ativas</CardTitle>
          <ClipboardList className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {isLoading ? <LoadingSpinner size="sm" className="py-2"/> : (
                <>
                <div className="text-2xl font-bold">{dashboardData.tarefasAtivas}</div>
                <p className="text-xs text-muted-foreground">Configuradas no sistema</p>
                </>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Avaliações Concluídas (Hoje)</CardTitle>
          <CheckCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
           {isLoading ? <LoadingSpinner size="sm" className="py-2"/> : (
               <>
                <div className="text-2xl font-bold">{dashboardData.avaliacoesHoje} / {dashboardData.colaboradoresAtivos}</div>
                <p className="text-xs text-muted-foreground">
                    {dashboardData.colaboradoresAtivos > 0 ? ((dashboardData.avaliacoesHoje / dashboardData.colaboradoresAtivos) * 100).toFixed(0) : 0}% de conclusão
                </p>
               </>
           )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Alertas de Desempenho</CardTitle>
          <AlertCircle className="h-4 w-4 text-destructive" />
        </CardHeader>
        <CardContent>
          {isLoading ? <LoadingSpinner size="sm" className="py-2"/> : (
               <>
                <div className="text-2xl font-bold text-destructive">{dashboardData.alertasDesempenho}</div>
                <p className="text-xs text-muted-foreground">Colaboradores com &gt;3 zeros este mês</p>
               </>
          )}
        </CardContent>
      </Card>

      <Card className="col-span-1 sm:col-span-2 lg:col-span-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
             <BarChart3 className="h-5 w-5" />
             Visão Geral de Avaliações (Últimos 6 Meses)
          </CardTitle>
          <CardDescription>Total de avaliações realizadas por mês.</CardDescription>
        </CardHeader>
         <CardContent className="h-[250px] sm:h-[300px] w-full flex items-center justify-center">
           {isLoading ? (
               <LoadingSpinner size="md" text="Carregando gráfico..." />
           ) : (
            <ChartContainer config={chartConfig} className="h-full w-full">
                <BarChart accessibilityLayer data={chartData}>
                     <CartesianGrid vertical={false} />
                    <XAxis
                    dataKey="month"
                    tickLine={false}
                    tickMargin={10}
                    axisLine={false}
                    tickFormatter={tickFormatter}
                    />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="total" fill="var(--color-total)" radius={4} />
                </BarChart>
            </ChartContainer>
           )}
        </CardContent>
      </Card>
    </div>
  );
}

// Export default the page component wrapped in ConditionalLayout
export default function RootPage() {
    // ConditionalLayout will handle redirecting if the user is not an admin
    // or rendering the appropriate layout based on the role.
    // We render the Admin Dashboard content here as the default for the root path.
    return (
        <ConditionalLayout>
            <AdminDashboardContent />
        </ConditionalLayout>
    );
}
