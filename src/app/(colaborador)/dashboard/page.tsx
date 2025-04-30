
'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton"; // Import Skeleton
import { AlertTriangle, CheckCircle, Target, CalendarCheck, Loader2, LineChart, Bell } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

// Mock data (replace with actual data fetching)
const mockData = {
  dailyStatus: 'pending' as 'evaluated' | 'pending', // 'evaluated' or 'pending'
  zerosCount: 2,
  maxZeros: 5, // Example threshold from settings
  projectedBonus: 70, // Example value (R$ 70 or R$ 90)
  dailyTasks: [
    { id: 'task1', title: 'Verificar emails e responder pendências' },
    { id: 'task2', title: 'Organizar estação de trabalho' },
    { id: 'task3', title: 'Participar da reunião matinal' },
  ],
  activeChallenges: [
    { id: 'ch1', title: 'Organização Nota 10', deadline: '2024-08-18' },
    { id: 'ch2', title: 'Feedback Construtivo', deadline: '2024-08-20' },
  ],
  recentNotifications: [
    { id: 'notif1', text: 'Sua avaliação de ontem foi concluída.', timestamp: 'Há 2 horas' },
    { id: 'notif2', text: 'Novo desafio "Inovação Operacional" disponível!', timestamp: 'Há 1 dia' },
  ],
   performanceHistory: [ // Example data for the chart (last 7 days)
    { date: '10/08', score: 90 },
    { date: '11/08', score: 100 },
    { date: '12/08', score: 80 },
    { date: '13/08', score: 100 },
    { date: '14/08', score: 90 },
    { date: '15/08', score: 100 },
    { date: '16/08', score: 95 }, // Placeholder for today if evaluated
  ]
};

export default function ColaboradorDashboard() {
   const [isLoading, setIsLoading] = React.useState(true); // Simulate loading state
   const [dashboardData, setDashboardData] = React.useState<typeof mockData | null>(null);

   // Simulate data fetching
   React.useEffect(() => {
        const timer = setTimeout(() => {
             setDashboardData(mockData);
             setIsLoading(false);
        }, 1500); // Simulate 1.5 second delay
        return () => clearTimeout(timer);
   }, []);

   const zeroPercentage = dashboardData ? (dashboardData.zerosCount / dashboardData.maxZeros) * 100 : 0;
   const isOverLimit = dashboardData ? dashboardData.zerosCount >= dashboardData.maxZeros : false;

   if (isLoading) {
       return (
          <div className="space-y-6">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
       );
   }

   if (!dashboardData) {
        return <p className="text-center text-muted-foreground">Não foi possível carregar os dados do dashboard.</p>;
   }

  return (
    <div className="space-y-6">
      {/* Daily Status & Bonus */}
      <Card>
        <CardHeader>
          <CardTitle>Resumo do Dia</CardTitle>
          <CardDescription>Seu status e projeção de bônus para o mês.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant={dashboardData.dailyStatus === 'evaluated' ? 'default' : 'default'} className={dashboardData.dailyStatus === 'pending' ? 'border-primary bg-primary/5' : ''}>
             {dashboardData.dailyStatus === 'evaluated' ? <CheckCircle className="h-4 w-4 text-green-600" /> : <CalendarCheck className="h-4 w-4 text-primary" />}
            <AlertTitle>{dashboardData.dailyStatus === 'evaluated' ? 'Avaliação de Hoje Concluída' : 'Avaliação de Hoje Pendente'}</AlertTitle>
            <AlertDescription>
              {dashboardData.dailyStatus === 'evaluated'
                ? 'Sua avaliação diária já foi registrada.'
                : 'Aguardando avaliação do gestor.'}
                 {dashboardData.dailyStatus === 'evaluated' && (
                     <Button variant="link" size="sm" className="p-0 h-auto mt-1" asChild>
                         <Link href="/colaborador/historico">Ver avaliação</Link>
                     </Button>
                 )}
            </AlertDescription>
          </Alert>
          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="font-medium">Zeros no Mês:</span>
              <span className={`font-bold ${isOverLimit ? 'text-destructive' : ''}`}>
                {dashboardData.zerosCount} / {dashboardData.maxZeros}
              </span>
            </div>
            <Progress value={zeroPercentage} className={isOverLimit ? '[&>div]:bg-destructive' : ''} />
            <p className={`text-xs ${isOverLimit ? 'text-destructive' : 'text-muted-foreground'}`}>
              {isOverLimit
                ? 'Você atingiu o limite de zeros para o bônus total.'
                : `Limite para bônus total: ${dashboardData.maxZeros} zeros.`}
            </p>
          </div>
          <Separator />
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Projeção Bônus Mês:</span>
            <span className="text-lg font-bold text-primary">
              R$ {dashboardData.projectedBonus.toFixed(2)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Performance Chart (Placeholder) */}
       <Card>
         <CardHeader>
           <CardTitle className="flex items-center gap-2 text-base"><LineChart className="h-4 w-4"/>Desempenho Recente</CardTitle>
            <CardDescription className="text-xs">Média de pontuação nos últimos 7 dias.</CardDescription>
         </CardHeader>
         <CardContent>
             {/* Placeholder for Chart Component */}
            <div className="h-32 flex items-center justify-center bg-muted/50 rounded-md">
                <p className="text-sm text-muted-foreground">(Gráfico de Desempenho - Placeholder)</p>
             </div>
             {/* Example data display */}
             {/* <div className="mt-2 text-xs text-muted-foreground space-y-1">
                 {dashboardData.performanceHistory.map(p => (
                     <div key={p.date} className="flex justify-between"><span>{p.date}:</span> <span>{p.score}%</span></div>
                 ))}
             </div> */}
         </CardContent>
       </Card>


      {/* Daily Checklist */}
      <Card>
        <CardHeader>
          <CardTitle>Checklist do Dia</CardTitle>
          <CardDescription>Suas tarefas esperadas para hoje.</CardDescription>
        </CardHeader>
        <CardContent>
          {dashboardData.dailyTasks.length > 0 ? (
            <ul className="space-y-2 text-sm text-muted-foreground">
              {dashboardData.dailyTasks.map((task) => (
                <li key={task.id} className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-gray-400" /> {/* Placeholder icon */}
                  <span>{task.title}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhuma tarefa específica para hoje.</p>
          )}
        </CardContent>
         <CardFooter>
             <Button variant="outline" size="sm" asChild>
                 <Link href="/colaborador/historico">Ver Histórico Completo</Link>
             </Button>
         </CardFooter>
      </Card>

      {/* Active Challenges */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Target className="h-5 w-5 text-primary" /> Desafios Ativos</CardTitle>
          <CardDescription>Participe para ganhar pontos extras!</CardDescription>
        </CardHeader>
        <CardContent>
          {dashboardData.activeChallenges.length > 0 ? (
            <ul className="space-y-3">
              {dashboardData.activeChallenges.map((challenge) => (
                <li key={challenge.id} className="flex items-center justify-between gap-4 p-3 border rounded-md bg-card">
                  <div className="flex-1">
                     <p className="text-sm font-medium">{challenge.title}</p>
                     <p className="text-xs text-muted-foreground">Prazo: {challenge.deadline}</p>
                  </div>
                  <Button variant="secondary" size="sm" asChild>
                    <Link href={`/colaborador/desafios/${challenge.id}`}>Ver</Link>
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhum desafio ativo no momento.</p>
          )}
        </CardContent>
         <CardFooter>
             <Button variant="default" size="sm" asChild className="bg-accent text-accent-foreground hover:bg-accent/90">
                 <Link href="/colaborador/desafios">Ver Todos os Desafios</Link>
             </Button>
         </CardFooter>
      </Card>

      {/* Notifications */}
       <Card>
         <CardHeader>
           <CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5"/> Notificações Recentes</CardTitle>
           <CardDescription>Mantenha-se atualizado.</CardDescription>
         </CardHeader>
         <CardContent>
           {dashboardData.recentNotifications.length > 0 ? (
             <ul className="space-y-3">
               {dashboardData.recentNotifications.map((notif) => (
                 <li key={notif.id} className="text-sm border-b pb-2 last:border-b-0">
                   <p>{notif.text}</p>
                   <p className="text-xs text-muted-foreground">{notif.timestamp}</p>
                 </li>
               ))}
             </ul>
           ) : (
             <p className="text-sm text-muted-foreground">Nenhuma notificação nova.</p>
           )}
         </CardContent>
       </Card>

    </div>
  );
}
