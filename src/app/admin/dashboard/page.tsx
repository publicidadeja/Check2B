import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Users, CheckSquare, AlertCircle, TrendingUp } from 'lucide-react';

// Mock data - Replace with actual data fetching
const dashboardData = {
  teamPerformance: 85, // Example percentage
  pendingEvaluations: 5,
  criticalAlerts: 2,
  topPerformers: [
    { name: "Alice Silva", department: "Vendas", score: 98 },
    { name: "Bruno Costa", department: "Engenharia", score: 95 },
  ],
  recentActivity: [
    { timestamp: "2024-07-27 10:00", description: "Avaliação de Carlos Souza concluída." },
    { timestamp: "2024-07-27 09:30", description: "Nova tarefa 'Relatório Semanal' adicionada." },
  ],
   departmentPerformance: [
    { name: "Vendas", performance: 90 },
    { name: "Engenharia", performance: 80 },
    { name: "Marketing", performance: 75 },
  ],
  failedTasks: [
    { name: "Follow-up Cliente X", count: 5 },
    { name: "Atualizar CRM", count: 3 },
  ]
};

export default function AdminDashboard() {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Desempenho da Equipe</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{dashboardData.teamPerformance}%</div>
          <p className="text-xs text-muted-foreground">Média geral do mês atual</p>
           <Progress value={dashboardData.teamPerformance} className="mt-2 h-2" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Avaliações Pendentes</CardTitle>
          <CheckSquare className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{dashboardData.pendingEvaluations}</div>
          <p className="text-xs text-muted-foreground">Avaliações a serem concluídas hoje</p>
        </CardContent>
      </Card>
       <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Alertas Críticos</CardTitle>
          <AlertCircle className="h-4 w-4 text-destructive" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{dashboardData.criticalAlerts}</div>
          <p className="text-xs text-muted-foreground">Colaboradores com desempenho baixo</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Melhores Desempenhos</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {dashboardData.topPerformers.map((performer, index) => (
             <div key={index} className="flex items-center justify-between text-sm mb-1">
               <span>{performer.name}</span>
               <Badge variant="secondary">{performer.score}%</Badge>
             </div>
           ))}
        </CardContent>
      </Card>

       <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Desempenho por Departamento</CardTitle>
          <CardDescription>Performance média mensal por departamento.</CardDescription>
        </CardHeader>
        <CardContent>
           <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Departamento</TableHead>
                <TableHead className="text-right">Performance</TableHead>
                <TableHead className="w-[120px]">Progresso</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dashboardData.departmentPerformance.map((dept) => (
                <TableRow key={dept.name}>
                  <TableCell className="font-medium">{dept.name}</TableCell>
                  <TableCell className="text-right">{dept.performance}%</TableCell>
                   <TableCell>
                     <Progress value={dept.performance} className="h-2" />
                   </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

       <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Atividade Recente</CardTitle>
           <CardDescription>Últimas ações realizadas no sistema.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {dashboardData.recentActivity.map((activity, index) => (
              <div key={index} className="flex items-start space-x-3">
                 <div className="flex-shrink-0 pt-1">
                   <div className="h-2 w-2 rounded-full bg-primary"></div>
                 </div>
                <div className="flex-1">
                  <p className="text-sm">{activity.description}</p>
                  <p className="text-xs text-muted-foreground">{activity.timestamp}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
