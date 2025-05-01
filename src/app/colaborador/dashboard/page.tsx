
 'use client';

 import * as React from 'react';
 import {
   Card,
   CardContent,
   CardDescription,
   CardHeader,
   CardTitle,
   CardFooter,
 } from '@/components/ui/card';
 import {
   AlertTriangle,
   Bell,
   CalendarCheck,
   CheckCircle,
   DollarSign,
   TrendingUp,
   Target, // For challenges
   Info,   // For info tooltip
   Loader2,
 } from 'lucide-react';
 import { Progress } from '@/components/ui/progress';
 import { Badge } from '@/components/ui/badge';
 import { Button } from '@/components/ui/button';
 import { ScrollArea } from '@/components/ui/scroll-area';
 import { Separator } from '@/components/ui/separator';
 import { useToast } from '@/hooks/use-toast';
 import { format, parseISO, startOfMonth } from 'date-fns';
 import { ptBR } from 'date-fns/locale';
 import Link from 'next/link';
 // Removed EmployeeLayout import as it's applied by group layout now
 import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

 // Import necessary types
 import type { Evaluation } from '@/types/evaluation';
 import type { Task } from '@/types/task';
 import type { Challenge } from '@/types/challenge';

 // Import mock data
 import { mockEmployees } from '@/app/employees/page';
 import { mockTasks as allAdminTasks } from '@/app/tasks/page';
 import { mockChallenges as allAdminChallenges } from '@/app/challenges/page';

 // Mock Employee ID for demonstration
 const CURRENT_EMPLOYEE_ID = '1'; // Alice Silva

 // Mock evaluations for the current employee
 const mockEvaluations: Evaluation[] = [
     { id: 'eval1-t1-today', employeeId: '1', taskId: 't1', evaluationDate: format(new Date(), 'yyyy-MM-dd'), score: 10, evaluatorId: 'admin1', isDraft: false },
     { id: 'eval1-t6-yesterday', employeeId: '1', taskId: 't6', evaluationDate: format(new Date(Date.now() - 86400000), 'yyyy-MM-dd'), score: 0, justification: "Relatório não entregue", evaluatorId: 'admin1', isDraft: false },
     { id: 'eval1-t1-prev1', employeeId: '1', taskId: 't1', evaluationDate: format(startOfMonth(new Date(Date.now() - 35 * 86400000)), 'yyyy-MM-dd'), score: 10, evaluatorId: 'admin1', isDraft: false }, // Previous month
     { id: 'eval1-t1-prev2', employeeId: '1', taskId: 't1', evaluationDate: format(startOfMonth(new Date(Date.now() - 40 * 86400000)), 'yyyy-MM-dd'), score: 0, justification: "Caixa de entrada cheia.", evaluatorId: 'admin1', isDraft: false }, // Previous month
 ];

 interface EmployeeDashboardData {
     todayStatus: 'pending' | 'evaluated';
     zerosThisMonth: number;
     projectedBonus: number;
     last30DaysPerformance: { date: string, score: number }[];
     tasksToday: Task[];
     activeChallenges: Challenge[];
     recentNotifications: { id: string; message: string; date: Date, type: 'info' | 'warning' | 'success' }[];
 }

 // Mock fetching function for employee dashboard
 const fetchEmployeeDashboardData = async (employeeId: string): Promise<EmployeeDashboardData> => {
     await new Promise(resolve => setTimeout(resolve, 800));

     const todayStr = format(new Date(), 'yyyy-MM-dd');
     const employee = mockEmployees.find(e => e.id === employeeId);
     if (!employee) throw new Error("Colaborador não encontrado.");

     const getTasksForEmployee = (emp: typeof employee, date: Date): Task[] => {
         return allAdminTasks.filter(task => {
             let applies = false;
             const dayOfWeek = date.getDay(); // 0 = Sunday
             if (task.periodicity === 'daily') applies = true;
             else if (task.periodicity === 'specific_days' && task.id === 't6' && dayOfWeek === 5) applies = true; // Example: Friday only for t6

             if (!applies) return false;
             if (!task.assignedTo) return true;
             if (task.assignedTo === 'role' && task.assignedEntityId === emp.role) return true;
             if (task.assignedTo === 'department' && task.assignedEntityId === emp.department) return true;
             if (task.assignedTo === 'individual' && task.assignedEntityId === emp.id) return true;
             return false;
         });
     };
     const tasksToday = getTasksForEmployee(employee, new Date());

     const todayEvaluationExists = mockEvaluations.some(e => e.employeeId === employeeId && e.evaluationDate === todayStr);
     const todayStatus = todayEvaluationExists ? 'evaluated' : 'pending';

     const start = startOfMonth(new Date());
     const zerosThisMonth = mockEvaluations.filter(e =>
         e.employeeId === employeeId &&
         parseISO(e.evaluationDate) >= start &&
         parseISO(e.evaluationDate) <= new Date() && // Only count up to today
         e.score === 0
     ).length;

     const ZERO_LIMIT = 3;
     const BONUS_LOW = 70;
     const BONUS_HIGH = 90;
     let projectedBonus = 0;
     if (zerosThisMonth < ZERO_LIMIT) projectedBonus = BONUS_HIGH;
     else if (zerosThisMonth === ZERO_LIMIT) projectedBonus = BONUS_LOW;

     const last30DaysPerformance: { date: string, score: number }[] = [];
     for (let i = 29; i >= 0; i--) {
         const date = new Date(Date.now() - i * 86400000);
         const dateStr = format(date, 'yyyy-MM-dd');
         const score = mockEvaluations.filter(e => e.employeeId === employeeId && e.evaluationDate === dateStr && e.score === 10).length;
         last30DaysPerformance.push({ date: dateStr, score });
     }

     const activeChallenges = allAdminChallenges.filter(ch => {
         if (ch.status !== 'active') return false;
         if (ch.eligibility.type === 'all') return true;
         if (ch.eligibility.type === 'department' && ch.eligibility.entityIds?.includes(employee.department)) return true;
         if (ch.eligibility.type === 'role' && ch.eligibility.entityIds?.includes(employee.role)) return true;
         if (ch.eligibility.type === 'individual' && ch.eligibility.entityIds?.includes(employee.id)) return true;
         return false;
     });

     const recentNotifications = [
         { id: 'n1', message: `Sua avaliação de ontem foi registrada.`, date: new Date(Date.now() - 3600000), type: 'success' as const },
         { id: 'n2', message: `Você tem ${zerosThisMonth} zero(s) este mês. Limite: ${ZERO_LIMIT}.`, date: new Date(), type: zerosThisMonth >= ZERO_LIMIT ? 'warning' as const : 'info' as const },
         ...(activeChallenges.length > 0 ? [{ id: 'n3', message: `Novo desafio disponível: "${activeChallenges[0]?.title}"`, date: new Date(Date.now() - 2 * 3600000), type: 'info' as const }] : []),
     ];

     return {
         todayStatus,
         zerosThisMonth,
         projectedBonus,
         last30DaysPerformance,
         tasksToday,
         activeChallenges,
         recentNotifications,
     };
 };


 export default function EmployeeDashboardPage() {
     const [data, setData] = React.useState<EmployeeDashboardData | null>(null);
     const [isLoading, setIsLoading] = React.useState(true);
     const { toast } = useToast();
     const ZERO_LIMIT = 3;

     React.useEffect(() => {
         const loadData = async () => {
             setIsLoading(true);
             try {
                 const dashboardData = await fetchEmployeeDashboardData(CURRENT_EMPLOYEE_ID);
                 setData(dashboardData);
             } catch (error) {
                 console.error("Erro ao carregar dashboard:", error);
                 toast({
                     title: "Erro ao Carregar",
                     description: "Não foi possível carregar os dados do dashboard.",
                     variant: "destructive",
                 });
             } finally {
                 setIsLoading(false);
             }
         };
         loadData();
     }, [toast]);

     const getNotificationIcon = (type: EmployeeDashboardData['recentNotifications'][0]['type']) => {
         switch (type) {
             case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />;
             case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
             case 'info': return <Info className="h-4 w-4 text-blue-500" />;
             default: return <Bell className="h-4 w-4 text-muted-foreground" />;
         }
     };

     if (isLoading) {
         return (
             // EmployeeLayout is applied by the group layout now
             <div className="flex justify-center items-center h-full py-20">
                 <Loader2 className="h-16 w-16 animate-spin text-primary" />
             </div>
         );
     }

     if (!data) {
         return (
             <div className="text-center text-muted-foreground py-20">
                 Não foi possível carregar os dados do dashboard. Tente novamente mais tarde.
             </div>
         );
     }

     const zeroProgress = Math.min((data.zerosThisMonth / ZERO_LIMIT) * 100, 100);

     return (
         <TooltipProvider>
             <div className="grid gap-4 md:gap-6 lg:grid-cols-1"> {/* Changed grid to single column for mobile focus */}

                 {/* Status Card */}
                 <Card>
                     <CardHeader>
                         <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                             <CardTitle>Status do Dia ({format(new Date(), 'dd/MM/yyyy', { locale: ptBR })})</CardTitle>
                             <Badge variant={data.todayStatus === 'evaluated' ? 'default' : 'secondary'} className="mt-1 sm:mt-0">
                                 {data.todayStatus === 'evaluated' ? 'Avaliado' : 'Pendente'}
                             </Badge>
                         </div>
                         <CardDescription>Resumo do seu desempenho e projeção mensal.</CardDescription>
                     </CardHeader>
                     <CardContent className="space-y-4">
                         <div>
                             <div className="flex justify-between items-center mb-1">
                                 <span className="text-sm font-medium">Zeros Acumulados (Mês)</span>
                                 <span className={`font-semibold ${data.zerosThisMonth > ZERO_LIMIT ? 'text-destructive' : ''}`}>
                                     {data.zerosThisMonth} / {ZERO_LIMIT}
                                 </span>
                             </div>
                             <Tooltip>
                                 <TooltipTrigger asChild>
                                     <Progress value={zeroProgress} aria-label={`${data.zerosThisMonth} de ${ZERO_LIMIT} zeros permitidos`} className="h-2" />
                                 </TooltipTrigger>
                                 <TooltipContent>
                                     <p>{data.zerosThisMonth > ZERO_LIMIT ? 'Limite de zeros excedido para bônus.' : `${ZERO_LIMIT - data.zerosThisMonth} zero(s) restantes.`}</p>
                                 </TooltipContent>
                             </Tooltip>
                         </div>
                         <div className="flex justify-between items-center">
                             <span className="text-sm font-medium">Projeção de Bônus</span>
                              <span className="text-lg font-bold text-green-600">
                                R$ {data.projectedBonus.toFixed(2)}
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                         <Info className="inline-block h-3 w-3 ml-1 text-muted-foreground cursor-help" />
                                    </TooltipTrigger>
                                     <TooltipContent side="top">
                                        <p>Baseado no desempenho atual. Valor final definido no fechamento do mês.</p>
                                    </TooltipContent>
                                </Tooltip>
                             </span>
                         </div>
                     </CardContent>
                     <CardFooter>
                         <Link href="/colaborador/avaliacoes" passHref>
                            <Button variant="outline" size="sm" className="w-full">Ver Histórico de Avaliações</Button>
                        </Link>
                     </CardFooter>
                 </Card>

                 {/* Tasks for Today */}
                 <Card>
                     <CardHeader>
                         <CardTitle className="flex items-center gap-2 text-base"><CalendarCheck className="h-4 w-4" /> Tarefas de Hoje</CardTitle>
                         <CardDescription className="text-xs">Suas tarefas do checklist para avaliação hoje.</CardDescription>
                     </CardHeader>
                     <CardContent>
                         {data.tasksToday.length > 0 ? (
                             <ul className="space-y-2 text-sm text-muted-foreground">
                                 {data.tasksToday.map(task => (
                                     <li key={task.id} className="flex items-center justify-between p-2 border rounded-md bg-muted/30">
                                         <span className="truncate mr-2">{task.title}</span>
                                         <Tooltip>
                                             <TooltipTrigger asChild>
                                                 <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground flex-shrink-0">
                                                     <Info className="h-4 w-4" />
                                                 </Button>
                                             </TooltipTrigger>
                                             <TooltipContent side="left" className="max-w-[200px] text-xs">
                                                 <p className="font-semibold">Critério:</p>
                                                 <p>{task.criteria}</p>
                                             </TooltipContent>
                                         </Tooltip>
                                     </li>
                                 ))}
                             </ul>
                         ) : (
                             <p className="text-sm text-muted-foreground text-center py-4">Nenhuma tarefa para hoje.</p>
                         )}
                     </CardContent>
                 </Card>

                 {/* Active Challenges */}
                 <Card>
                     <CardHeader>
                         <CardTitle className="flex items-center gap-2 text-base"><Target className="h-4 w-4" /> Desafios Ativos</CardTitle>
                         <CardDescription className="text-xs">Participe e ganhe pontos extras!</CardDescription>
                     </CardHeader>
                     <CardContent>
                         {data.activeChallenges.length > 0 ? (
                             <ul className="space-y-3">
                                 {data.activeChallenges.map(challenge => (
                                     <li key={challenge.id} className="border rounded-md p-3 hover:bg-muted/30 transition-colors">
                                         <div className="flex justify-between items-start mb-1">
                                             <h4 className="font-semibold text-sm truncate mr-2">{challenge.title}</h4>
                                             <Badge variant="outline" className="text-xs flex-shrink-0">{challenge.points} pts</Badge>
                                         </div>
                                         <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{challenge.description}</p>
                                         <div className="flex justify-between items-center text-xs text-muted-foreground">
                                             <span>Termina: {format(parseISO(challenge.periodEndDate), 'dd/MM/yy')}</span>
                                             <Link href="/colaborador/desafios" passHref>
                                                 <Button variant="link" size="sm" className="p-0 h-auto text-accent text-xs">Ver Detalhes</Button>
                                             </Link>
                                         </div>
                                     </li>
                                 ))}
                             </ul>
                         ) : (
                             <p className="text-sm text-muted-foreground text-center py-4">Nenhum desafio ativo.</p>
                         )}
                     </CardContent>
                     <CardFooter>
                         <Link href="/colaborador/desafios" passHref>
                             <Button variant="secondary" size="sm" className="w-full">Ver Todos Desafios</Button>
                         </Link>
                     </CardFooter>
                 </Card>

                 {/* Notifications Card - Now scrollable */}
                 <Card className="flex flex-col h-[300px]"> {/* Fixed height for scroll */}
                     <CardHeader>
                         <CardTitle className="flex items-center gap-2 text-base"><Bell className="h-4 w-4" /> Notificações</CardTitle>
                     </CardHeader>
                     <CardContent className="flex-grow overflow-hidden p-0">
                         {data.recentNotifications.length > 0 ? (
                             <ScrollArea className="h-full px-4 pb-4">
                                 <div className="space-y-3">
                                     {data.recentNotifications.map(notification => (
                                         <div key={notification.id} className="flex items-start gap-3 text-xs border-b pb-2 last:border-b-0">
                                             <div className="flex-shrink-0 pt-0.5">
                                                 {getNotificationIcon(notification.type)}
                                             </div>
                                             <div className="flex-grow">
                                                 <p className="leading-tight">{notification.message}</p>
                                                 <p className="text-muted-foreground/80">{format(notification.date, 'dd/MM HH:mm', { locale: ptBR })}</p>
                                             </div>
                                         </div>
                                     ))}
                                 </div>
                             </ScrollArea>
                         ) : (
                             <div className="h-full flex items-center justify-center px-4 pb-4">
                                 <p className="text-sm text-muted-foreground">Nenhuma notificação.</p>
                             </div>
                         )}
                     </CardContent>
                 </Card>

             </div>
         </TooltipProvider>
     );
 }
   