// src/app/page.tsx - Root page, typically defaults to Admin Dashboard
'use client';

import * as React from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Users, ClipboardList, CheckCircle, AlertCircle, BarChart3, Loader2 } from "lucide-react";
import { BarChart, XAxis, YAxis, Bar, CartesianGrid, ResponsiveContainer } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import type { ChartConfig } from "@/components/ui/chart";
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useAuth } from '@/hooks/use-auth';
import {
    countTotalUsersByOrganization,
    countActiveUsersByOrganization
} from '@/lib/user-service';
import { countTasksByOrganization } from '@/lib/task-service';
import {
    countDistinctEvaluatedEmployeesForDate,
    countUsersWithExcessiveZeros,
    getMonthlyEvaluationStats
} from '@/lib/evaluation-service';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const initialChartData = [
  { month: "Jan", total: 0 },
  { month: "Fev", total: 0 },
  { month: "Mar", total: 0 },
  { month: "Abr", total: 0 },
  { month: "Mai", total: 0 },
  { month: "Jun", total: 0 },
];

const chartConfig = {
  total: {
    label: "Avaliações", // Changed label for clarity
    color: "hsl(var(--primary))", // Use primary color from CSS variables
  },
} satisfies ChartConfig;

// Constants for dashboard logic
const ZERO_LIMIT_FOR_ALERTS = 3; // Example limit for zero-score alerts
const MONTHS_FOR_CHART = 6; // Number of past months for the chart

function AdminDashboardContent() {
  const { organizationId, isLoading: isAuthLoading } = useAuth();
  const [isDashboardDataLoading, setIsDashboardDataLoading] = React.useState(true);
  const [dashboardStats, setDashboardStats] = React.useState({
      totalColaboradores: 0,
      colaboradoresAtivos: 0,
      tarefasAtivas: 0,
      avaliacoesHoje: 0,
      alertasDesempenho: 0,
  });
  const [chartDynamicData, setChartDynamicData] = React.useState(initialChartData);

  React.useEffect(() => {
    const fetchData = async () => {
      if (!organizationId || isAuthLoading) {
        if (!isAuthLoading) setIsDashboardDataLoading(false); // Stop loading if auth is done but no orgId
        return;
      }

      setIsDashboardDataLoading(true);
      try {
        const todayString = format(new Date(), 'yyyy-MM-dd');
        const sixMonthsAgo = subMonths(new Date(), MONTHS_FOR_CHART -1); // -1 because we include current month
        const firstDayOfPeriod = format(startOfMonth(sixMonthsAgo), 'yyyy-MM-dd');
        const lastDayOfPeriod = format(endOfMonth(new Date()), 'yyyy-MM-dd');


        const [
            totalUsers,
            activeUsers,
            totalTasks,
            evaluatedTodayCount,
            performanceAlerts,
            monthlyStatsData,
        ] = await Promise.all([
            countTotalUsersByOrganization(organizationId, 'collaborator'),
            countActiveUsersByOrganization(organizationId, 'collaborator'),
            countTasksByOrganization(organizationId),
            countDistinctEvaluatedEmployeesForDate(organizationId, todayString),
            countUsersWithExcessiveZeros(organizationId, format(startOfMonth(new Date()), 'yyyy-MM-dd'), todayString, ZERO_LIMIT_FOR_ALERTS),
            getMonthlyEvaluationStats(organizationId, MONTHS_FOR_CHART),
        ]);

        setDashboardStats({
            totalColaboradores: totalUsers,
            colaboradoresAtivos: activeUsers,
            tarefasAtivas: totalTasks,
            avaliacoesHoje: evaluatedTodayCount,
            alertasDesempenho: performanceAlerts,
        });

        if (monthlyStatsData && monthlyStatsData.length > 0) {
            setChartDynamicData(monthlyStatsData);
        } else {
            // Fallback to initialChartData if no stats returned, or adjust as needed
            const defaultChart = Array(MONTHS_FOR_CHART).fill(null).map((_, i) => {
                const month = format(subMonths(new Date(), MONTHS_FOR_CHART - 1 - i), 'MMM', { locale: ptBR });
                return { month, total: 0 };
            });
            setChartDynamicData(defaultChart);
        }

      } catch (error) {
        console.error("Erro ao buscar dados do dashboard:", error);
        // Optionally set an error state to display to the user
      } finally {
        setIsDashboardDataLoading(false);
      }
    };

    fetchData();
  }, [organizationId, isAuthLoading]);

  const tickFormatter = (value: string) => value.slice(0, 3);

  if (isAuthLoading) {
      return <div className="flex items-center justify-center h-[calc(100vh-10rem)]"><LoadingSpinner size="lg" text="Autenticando..."/></div>;
  }

  if (!organizationId && !isAuthLoading) {
      return (
          <Card className="col-span-full">
              <CardHeader>
                  <CardTitle>Organização Não Encontrada</CardTitle>
              </CardHeader>
              <CardContent>
                  <p className="text-muted-foreground">O administrador não está associado a uma organização ou a organização não foi carregada.</p>
              </CardContent>
          </Card>
      );
  }

  return (
    <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Colaboradores</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
           {isDashboardDataLoading ? <LoadingSpinner size="sm" className="py-2"/> : (
              <>
                <div className="text-2xl font-bold">{dashboardStats.totalColaboradores}</div>
                <p className="text-xs text-muted-foreground">{dashboardStats.colaboradoresAtivos} ativos</p>
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
          {isDashboardDataLoading ? <LoadingSpinner size="sm" className="py-2"/> : (
                <>
                <div className="text-2xl font-bold">{dashboardStats.tarefasAtivas}</div>
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
           {isDashboardDataLoading ? <LoadingSpinner size="sm" className="py-2"/> : (
               <>
                <div className="text-2xl font-bold">{dashboardStats.avaliacoesHoje} / {dashboardStats.colaboradoresAtivos}</div>
                <p className="text-xs text-muted-foreground">
                    {dashboardStats.colaboradoresAtivos > 0 ? ((dashboardStats.avaliacoesHoje / dashboardStats.colaboradoresAtivos) * 100).toFixed(0) : 0}% de conclusão
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
          {isDashboardDataLoading ? <LoadingSpinner size="sm" className="py-2"/> : (
               <>
                <div className="text-2xl font-bold text-destructive">{dashboardStats.alertasDesempenho}</div>
                <p className="text-xs text-muted-foreground">Colaboradores com &gt;{ZERO_LIMIT_FOR_ALERTS} zeros este mês</p>
               </>
          )}
        </CardContent>
      </Card>

      <Card className="col-span-1 sm:col-span-2 lg:col-span-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
             <BarChart3 className="h-5 w-5" />
             Visão Geral de Avaliações (Últimos {MONTHS_FOR_CHART} Meses)
          </CardTitle>
          <CardDescription>Total de avaliações realizadas por mês.</CardDescription>
        </CardHeader>
         <CardContent className="h-[250px] sm:h-[300px] w-full flex items-center justify-center">
           {isDashboardDataLoading ? (
               <div className="flex flex-col items-center justify-center h-full">
                   <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                   <p className="text-sm text-muted-foreground">Carregando dados do gráfico...</p>
               </div>
           ) : (
            <ChartContainer config={chartConfig} className="h-full w-full">
                <BarChart accessibilityLayer data={chartDynamicData}>
                     <CartesianGrid vertical={false} />
                    <XAxis
                    dataKey="month"
                    tickLine={false}
                    tickMargin={10}
                    axisLine={false}
                    tickFormatter={tickFormatter}
                    />
                    <YAxis allowDecimals={false} />
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

export default function RootPage() {
    console.log("[RootPage /] Rendering AdminDashboardContent. This should be wrapped by ConditionalLayout -> MainLayout.");
    return <AdminDashboardContent />;
}
