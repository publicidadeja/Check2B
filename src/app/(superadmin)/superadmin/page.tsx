// src/app/(superadmin)/page.tsx
'use client';

import * as React from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Building, Users, BarChart3, DollarSign, Activity } from 'lucide-react';
import { ChartContainer, BarChart, XAxis, YAxis, Bar, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import type { ChartConfig } from "@/components/ui/chart";
import { LoadingSpinner } from '@/components/ui/loading-spinner';

// Mock data for Super Admin dashboard - Replace with actual data fetching
const mockSuperAdminData = {
  totalOrganizations: 5,
  activeOrganizations: 4,
  totalUsers: 150,
  totalAdmins: 12,
  totalCollaborators: 138,
  monthlyRevenue: 1250.50,
  activityLast24h: 350, // Example: Number of evaluations or logins
};

const chartData = [
  { month: "Jan", revenue: Math.floor(Math.random() * 1000) + 500 },
  { month: "Fev", revenue: Math.floor(Math.random() * 1000) + 500 },
  { month: "Mar", revenue: Math.floor(Math.random() * 1000) + 500 },
  { month: "Abr", revenue: Math.floor(Math.random() * 1000) + 500 },
  { month: "Mai", revenue: Math.floor(Math.random() * 1000) + 500 },
  { month: "Jun", revenue: Math.floor(Math.random() * 1000) + 500 },
];

const chartConfig = {
  revenue: {
    label: "Receita",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

const tickFormatter = (value: string) => value.slice(0, 3);

export default function SuperAdminDashboardPage() {
  const [isLoading, setIsLoading] = React.useState(true);
  const [data, setData] = React.useState(mockSuperAdminData); // Use mock initially

  // Simulate data fetching
  React.useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 800));
      // Replace with actual API call to fetch super admin data
      setData(mockSuperAdminData);
      setIsLoading(false);
    };
    fetchData();
  }, []);

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
              <div className="text-2xl font-bold">{data.totalOrganizations}</div>
              <p className="text-xs text-muted-foreground">{data.activeOrganizations} ativas</p>
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
              <div className="text-2xl font-bold">{data.totalUsers}</div>
              <p className="text-xs text-muted-foreground">{data.totalAdmins} Admins / {data.totalCollaborators} Colaboradores</p>
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
              <div className="text-2xl font-bold">R$ {data.monthlyRevenue.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">Estimativa atual</p>
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
              <div className="text-2xl font-bold">{data.activityLast24h}</div>
              <p className="text-xs text-muted-foreground">Ações no sistema</p>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="col-span-1 sm:col-span-2 lg:col-span-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Receita Mensal Recorrente (MRR) - Últimos 6 Meses
          </CardTitle>
          <CardDescription>Visão geral da receita mensal.</CardDescription>
        </CardHeader>
        <CardContent className="h-[250px] sm:h-[300px] w-full flex items-center justify-center">
          {isLoading ? (
            <LoadingSpinner size="md" text="Carregando gráfico..." />
          ) : (
            <ChartContainer config={chartConfig} className="h-full w-full">
              <BarChart accessibilityLayer data={chartData}>
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                  tickFormatter={tickFormatter}
                />
                <YAxis tickFormatter={(value) => `R$${value / 1000}k`} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="revenue" fill="var(--color-revenue)" radius={4} />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
