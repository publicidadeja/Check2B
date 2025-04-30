import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Users, ClipboardList, CheckCircle, AlertCircle, BarChart3 } from "lucide-react";
// Import necessary chart components directly from recharts or the custom wrapper
import { BarChart, XAxis, YAxis, Bar } from "@/components/ui/chart"; // Import Recharts components from the wrapper
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"; // Import chart container and tooltip

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
} satisfies import("@/components/ui/chart").ChartConfig;


export default function DashboardPage() {
  // Replace with actual data fetching logic
  const totalColaboradores = 15; // Example value
  const colaboradoresAtivos = 12; // Example value
  const tarefasAtivas = 35; // Example value
  const avaliacoesHoje = 10; // Example value
  const alertasDesempenho = 2; // Example value

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Colaboradores</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalColaboradores}</div>
          <p className="text-xs text-muted-foreground">{colaboradoresAtivos} ativos</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Tarefas Ativas</CardTitle>
          <ClipboardList className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{tarefasAtivas}</div>
          <p className="text-xs text-muted-foreground">Configuradas no sistema</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Avaliações Concluídas (Hoje)</CardTitle>
          <CheckCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{avaliacoesHoje} / {colaboradoresAtivos}</div>
          <p className="text-xs text-muted-foreground">
            {colaboradoresAtivos > 0 ? ((avaliacoesHoje / colaboradoresAtivos) * 100).toFixed(0) : 0}% de conclusão
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Alertas de Desempenho</CardTitle>
          <AlertCircle className="h-4 w-4 text-destructive" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-destructive">{alertasDesempenho}</div>
          <p className="text-xs text-muted-foreground">Colaboradores com &gt;3 zeros este mês</p>
        </CardContent>
      </Card>

      {/* Chart Example */}
       <Card className="md:col-span-2 lg:col-span-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
             <BarChart3 className="h-5 w-5" />
             Visão Geral de Avaliações (Últimos 6 Meses)
          </CardTitle>
          <CardDescription>Total de avaliações realizadas por mês.</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px] w-full">
             {/* Use ChartContainer and pass the specific chart type as children */}
            <ChartContainer config={chartConfig} className="h-full w-full">
                <BarChart accessibilityLayer data={chartData}>
                    <XAxis
                    dataKey="month"
                    tickLine={false}
                    tickMargin={10}
                    axisLine={false}
                    tickFormatter={(value) => value.slice(0, 3)}
                    />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="total" fill="var(--color-total)" radius={4} />
                </BarChart>
            </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}