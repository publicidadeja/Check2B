// src/app/(superadmin)/superadmin/page.tsx
'use client';

import * as React from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Building, Users, BarChart3, DollarSign, Activity, AlertTriangle } from 'lucide-react';
// Correção: ResponsiveContainer é importado de 'recharts', outros componentes de gráfico de @/components/ui/chart
import { ChartContainer, BarChart, XAxis, YAxis, Bar, ChartTooltip, ChartTooltipContent, CartesianGrid } from "@/components/ui/chart";
import { ResponsiveContainer } from "recharts";
import type { ChartConfig } from "@/components/ui/chart";
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { getAllOrganizations, type Organization } from '@/lib/organization-service';
import { getAllUsers, type UserProfile } from '@/lib/user-service';
import { format, subMonths, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface SuperAdminDashboardData {
  totalOrganizations: number;
  activeOrganizations: number;
  totalUsers: number;
  totalAdmins: number;
  totalCollaborators: number;
  monthlyRevenue: number;
  activityLast24h: number;
}

const initialChartData = Array(6).fill(null).map((_, i) => {
    const month = subMonths(new Date(), 5 - i);
    return { month: format(month, 'MMM', { locale: ptBR }), organizations: 0 };
});


const chartConfig = {
  organizations: {
    label: "Novas Organizações",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

const tickFormatter = (value: string) => value.slice(0, 3);

export default function SuperAdminDashboardPage() {
  const [isLoading, setIsLoading] = React.useState(true);
  const [dashboardData, setDashboardData] = React.useState<SuperAdminDashboardData>({
    totalOrganizations: 0,
    activeOrganizations: 0,
    totalUsers: 0,
    totalAdmins: 0,
    totalCollaborators: 0,
    monthlyRevenue: 1250.50, // Dado mockado
    activityLast24h: 350,   // Dado mockado
  });
  const [organizationsChartData, setOrganizationsChartData] = React.useState(initialChartData);
  const [error, setError] = React.useState<string | null>(null);


  React.useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [allOrganizations, allUsers] = await Promise.all([
          getAllOrganizations(),
          getAllUsers()
        ]);

        const totalOrganizations = allOrganizations.length;
        const activeOrganizations = allOrganizations.filter(org => org.status === 'active').length;
        
        const totalUsers = allUsers.length;
        const totalAdmins = allUsers.filter(user => user.role === 'admin').length;
        const totalCollaborators = allUsers.filter(user => user.role === 'collaborator').length;

        setDashboardData(prevData => ({
          ...prevData,
          totalOrganizations,
          activeOrganizations,
          totalUsers,
          totalAdmins,
          totalCollaborators,
          // monthlyRevenue and activityLast24h permanecem mockados
        }));

        const orgCreationStats: { [key: string]: number } = {};
        allOrganizations.forEach(org => {
          if (org.createdAt) {
            const createdAtDate = org.createdAt instanceof Date ? org.createdAt : new Date(org.createdAt);
            if (!isNaN(createdAtDate.getTime())) {
                const monthKey = format(createdAtDate, 'yyyy-MM');
                orgCreationStats[monthKey] = (orgCreationStats[monthKey] || 0) + 1;
            } else {
                console.warn(`Invalid createdAt date for organization ${org.id}:`, org.createdAt);
            }
          }
        });

        const lastSixMonthsChartData = Array(6).fill(null).map((_, i) => {
          const dateForMonth = subMonths(new Date(), 5 - i);
          const monthKey = format(dateForMonth, 'yyyy-MM');
          const monthLabel = format(dateForMonth, 'MMM', { locale: ptBR });
          return { month: monthLabel, organizations: orgCreationStats[monthKey] || 0 };
        });
        setOrganizationsChartData(lastSixMonthsChartData);

      } catch (err) {
        console.error("Erro ao buscar dados do Super Admin Dashboard:", err);
        setError("Não foi possível carregar os dados do dashboard.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  if (error) {
    return (
        <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <AlertTriangle className="h-16 w-16 text-destructive mb-4" />
            <h2 className="text-xl font-semibold mb-2">Erro ao Carregar Dashboard</h2>
            <p className="text-muted-foreground">{error}</p>
        </div>
    );
  }

  return (
    <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Organizações</CardTitle>
          <Building className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {isLoading ? <LoadingSpinner size="sm" className="py-2"/> : (
            <>
              <div className="text-2xl font-bold">{dashboardData.totalOrganizations}</div>
              <p className="text-xs text-muted-foreground">{dashboardData.activeOrganizations} ativas</p>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Usuários</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
           {isLoading ? <LoadingSpinner size="sm" className="py-2"/> : (
            <>
              <div className="text-2xl font-bold">{dashboardData.totalUsers}</div>
              <p className="text-xs text-muted-foreground">{dashboardData.totalAdmins} Admins / {dashboardData.totalCollaborators} Colaboradores</p>
            </>
           )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Receita Mensal (MRR)</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {isLoading ? <LoadingSpinner size="sm" className="py-2"/> : (
            <>
              <div className="text-2xl font-bold">R$ {dashboardData.monthlyRevenue.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">Estimativa (dado mockado)</p>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Atividade (24h)</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {isLoading ? <LoadingSpinner size="sm" className="py-2"/> : (
            <>
              <div className="text-2xl font-bold">{dashboardData.activityLast24h}</div>
              <p className="text-xs text-muted-foreground">Ações no sistema (dado mockado)</p>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="col-span-1 sm:col-span-2 lg:col-span-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Organizações Criadas por Mês (Últimos 6 Meses)
          </CardTitle>
          <CardDescription>Novas organizações registradas no sistema.</CardDescription>
        </CardHeader>
        <CardContent className="h-[250px] sm:h-[300px] w-full flex items-center justify-center">
          {isLoading ? (
            <LoadingSpinner size="md" text="Carregando gráfico..." />
          ) : (
            <ChartContainer config={chartConfig} className="h-full w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart accessibilityLayer data={organizationsChartData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    tickMargin={10}
                    axisLine={false}
                    tickFormatter={tickFormatter}
                  />
                  <YAxis allowDecimals={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="organizations" fill="var(--color-organizations)" radius={4} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
