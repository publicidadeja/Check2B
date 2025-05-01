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
   TrendingDown, // Added
   Minus, // Added for stable trend
   ListChecks, // For tasks list icon
   Award, // For bonus
   Gift, // New icon for bonus card
   ClipboardX, // New icon for zeros card
   CalendarDays, // New icon for status card
   Sparkles, // New icon for challenge card
 } from 'lucide-react';
 import { Progress } from '@/components/ui/progress';
 import { Badge } from '@/components/ui/badge';
 import { Button } from '@/components/ui/button';
 import { ScrollArea } from '@/components/ui/scroll-area';
 import { Separator } from '@/components/ui/separator';
 import { useToast } from '@/hooks/use-toast';
 import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns';
 import { ptBR } from 'date-fns/locale';
 import Link from 'next/link';
 import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
 import { cn } from '@/lib/utils'; // Import cn
 import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'; // Import Avatar components
 import { Label } from '@/components/ui/label'; // Import Label

 // Import types
 import type { Evaluation } from '@/types/evaluation';
 import type { Task } from '@/types/task';
 import type { Challenge } from '@/types/challenge';
 import type { Notification } from '@/types/notification'; // Import Notification type

 // Import mock data (Ensure paths are correct)
 import { mockEmployees } from '@/app/employees/page';
 import { mockTasks as allAdminTasks } from '@/app/tasks/page';
 import { mockChallenges as allAdminChallenges, mockParticipants } from '@/app/(admin)/challenges/page'; // Updated import

 // Mock Employee ID for demonstration
 const CURRENT_EMPLOYEE_ID = '1'; // Alice Silva

 interface EmployeeDashboardData {
     todayStatus: 'evaluated' | 'pending' | 'no_tasks';
     zerosThisMonth: number;
     projectedBonus: number;
     tasksToday: Task[];
     activeChallenges: Challenge[];
     recentNotifications: Notification[];
     monthlyPerformanceTrend?: 'up' | 'down' | 'stable';
 }

 const fetchEmployeeDashboardData = async (employeeId: string): Promise<EmployeeDashboardData> => {
     await new Promise(resolve => setTimeout(resolve, 700));

     const today = new Date();
     const todayStr = format(today, 'yyyy-MM-dd');
     const emp = mockEmployees.find(e => e.id === employeeId);

     if (!emp) {
         throw new Error("Colaborador não encontrado.");
     }

     const evaluationsToday = mockEvaluations.filter(e => e.employeeId === employeeId && e.evaluationDate === todayStr);
     const todayStatus = evaluationsToday.length > 0 ? 'evaluated' : getTasksForEmployee(employeeId, today).length > 0 ? 'pending' : 'no_tasks';

     // Zeros this month calculation (all months prior to current month are complete)
     let zerosThisMonth = 0;
     mockEvaluations.filter(e => e.employeeId === employeeId && format(parseISO(e.evaluationDate), 'yyyy-MM') === format(today, 'yyyy-MM')).forEach(evalItem => {
          if (evalItem.score === 0) zerosThisMonth++;
     });

     const ZERO_LIMIT = 3;
     const baseBonus = 100;
     const bonusPerZero = baseBonus / ZERO_LIMIT;
     const projectedBonus = Math.max(0, baseBonus - (zerosThisMonth * bonusPerZero)); // Prevent negative

     const getTasksForEmployee = (employeeId: string, date: Date): Task[] => {
          if (!employeeId || !emp.isActive) return [];

          return allAdminTasks.filter(task => {
              let applies = false;
              const dayOfWeek = date.getDay();

              if (task.periodicity === 'daily') {
                  applies = true;
              } else if (task.periodicity === 'specific_days') {
                  if (task.id === 't6' && dayOfWeek === 5) {
                      applies = true;
                  }
              }

              if (!applies) return false;

              if (!task.assignedTo) return true;
              if (task.assignedTo === 'role' && task.assignedEntityId === emp.role) return true;
              if (task.assignedTo === 'department' && task.assignedEntityId === emp.department) return true;
              if (task.assignedTo === 'individual' && task.assignedEntityId === emp.id) return true;

              return false;
          });
      };
     const tasksToday = getTasksForEmployee(employeeId, today);
     const activeChallenges = allAdminChallenges.filter(ch => {
         if (ch.status !== 'active') return false;
         if (ch.eligibility.type === 'all') return true;
         if (ch.eligibility.type === 'department' && ch.eligibility.entityIds?.includes(emp.department)) return true;
         if (ch.eligibility.type === 'role' && ch.eligibility.entityIds?.includes(emp.role)) return true;
         if (ch.eligibility.type === 'individual' && ch.eligibility.entityIds?.includes(emp.id)) return true;
         return false;
     });

      // --- Mock Notifications ---
     const recentNotifications: Notification[] = [
         ...(todayStatus === 'evaluated' ? [{ id: 'n1', type: 'evaluation' as const, message: `Sua avaliação de hoje (${format(new Date(), 'dd/MM')}) foi registrada.`, timestamp: new Date(Date.now() - 360000 * Math.random()), read: false, link: '/colaborador/avaliacoes' }] : []),
         { id: 'n2', type: zerosThisMonth >= ZERO_LIMIT ? 'system' as const : 'info' as const, message: `Você tem ${zerosThisMonth} zero(s) este mês. Limite para bônus: ${ZERO_LIMIT}.`, timestamp: new Date(), read: false },
         ...(activeChallenges.length > 0 ? [{ id: 'n3', type: 'challenge' as const, message: `Desafio ativo: "${activeChallenges[0]?.title}". Ganhe ${activeChallenges[0]?.points} pts!`, timestamp: new Date(Date.now() - 2 * 3600000), read: false, link: '/colaborador/desafios' }] : []),
          { id: 'n4', type: 'ranking' as const, message: `Ranking atualizado! Sua posição agora é 3º lugar.`, timestamp: new Date(Date.now() - 86400000), read: true, link: '/colaborador/ranking' },
          { id: 'n5', type: 'announcement' as const, message: 'Lembrete: Reunião geral sexta-feira às 10h.', timestamp: new Date(Date.now() - 2 * 86400000), read: true },
     ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()); // Sort newest first


     return {
         todayStatus,
         zerosThisMonth,
         projectedBonus,
         tasksToday,
         activeChallenges,
         recentNotifications,
         monthlyPerformanceTrend: 'stable', // You can calculate trend based on past data if needed
     };
 };


 export default function EmployeeDashboardPage() {
     const [data, setData] = React.useState<EmployeeDashboardData | null>(null);
     const [isLoading, setIsLoading] = React.useState(true);
     const { toast } = useToast();
     const ZERO_LIMIT = 3; // Make this potentially configurable

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


     if (isLoading) {
         return (
             <div className="flex justify-center items-center h-full py-20">
                 <Loader2 className="h-12 w-12 animate-spin text-primary" />
             </div>
         );
     }

     if (!data) {
         return (
             <div className="text-center text-muted-foreground py-20 px-4">
                 <AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" />
                 <h2 className="text-xl font-semibold mb-2">Erro ao Carregar</h2>
                 <p>Não foi possível carregar os dados do dashboard. Tente novamente mais tarde.</p>
                 <Button variant="outline" size="sm" className="mt-4" onClick={() => window.location.reload()}>Recarregar</Button>
             </div>
         );
     }

     const zeroProgress = Math.min((data.zerosThisMonth / ZERO_LIMIT) * 100, 100);
     const progressColor = zeroProgress >= (ZERO_LIMIT / ZERO_LIMIT * 100) ? 'bg-destructive' : zeroProgress >= ( (ZERO_LIMIT - 1) / ZERO_LIMIT * 100) ? 'bg-yellow-500' : 'bg-green-500'; // Color logic refined


     const getTrendIcon = (trend?: 'up' | 'down' | 'stable') => {
        switch (trend) {
            case 'up': return <TrendingUp className="h-5 w-5 text-green-500" />;
            case 'down': return <TrendingDown className="h-5 w-5 text-red-500" />;
            case 'stable': return <Minus className="h-5 w-5 text-muted-foreground" />;
            default: return null;
        }
    };

    // Style Card for illustration
    const IllustrationCard = ({ children, className }: { children: React.ReactNode, className?: string }) => (
         <Card className={cn("shadow-md overflow-hidden border-none relative bg-gradient-to-br from-teal-500 to-cyan-600 dark:from-teal-800 dark:to-cyan-900 text-primary-foreground", className)}>
            {/* Add subtle background pattern or image if desired */}
            <div className="absolute inset-0 bg-[url('/path/to/subtle-pattern.svg')] opacity-10"></div>
            <div className="relative z-10">{children}</div>
         </Card>
     );


     return (
         <TooltipProvider>
             <div className="space-y-4 p-4 md:p-0"> {/* Add padding for mobile */}

                 {/* Welcome/Status Card - Enhanced and Illustrated */}
                 <IllustrationCard>
                     <CardHeader className="p-4 pb-2">
                         <div className="flex justify-between items-center">
                             <CardTitle className="text-lg">Seu Dia</CardTitle>
                             {getTrendIcon(data.monthlyPerformanceTrend)}
                         </div>
                         <CardDescription className="text-primary-foreground/80 text-xs">
                             {format(new Date(), "eeee, d 'de' MMMM", { locale: ptBR })}
                         </CardDescription>
                     </CardHeader>
                     <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                         {/* Today's Evaluation Status */}
                         <div className="flex flex-col items-center justify-center text-center p-3 rounded-lg bg-white/20 backdrop-blur-sm">
                             <Label className="text-xs text-primary-foreground/80 mb-1">Status Diário</Label>
                              {data.todayStatus === 'evaluated' && <CheckCircle className="h-8 w-8 text-green-300 mb-1" />}
                             {data.todayStatus === 'pending' && <Loader2 className="h-8 w-8 text-yellow-300 animate-spin mb-1" />}
                             {data.todayStatus === 'no_tasks' && <CalendarDays className="h-8 w-8 text-primary-foreground/70 mb-1" />}
                            <Badge variant={data.todayStatus === 'evaluated' ? 'default' : data.todayStatus === 'pending' ? 'secondary' : 'outline'} className={cn("text-[10px] px-1.5 py-0.5", data.todayStatus === 'evaluated' && 'bg-green-500 text-white border-green-400', data.todayStatus === 'pending' && 'bg-yellow-400 text-yellow-900 border-yellow-300', data.todayStatus === 'no_tasks' && 'bg-white/10 text-primary-foreground/80 border-white/20')}>
                                {data.todayStatus === 'evaluated' ? 'Avaliado' : data.todayStatus === 'pending' ? 'Pendente' : 'Sem Tarefas'}
                             </Badge>
                         </div>

                         {/* Monthly Zeros */}
                         <div className="flex flex-col items-center justify-center text-center p-3 rounded-lg bg-white/20 backdrop-blur-sm">
                            <Label className="text-xs text-primary-foreground/80 mb-1">Zeros no Mês</Label>
                             <div className={cn("text-3xl font-bold mb-1", data.zerosThisMonth >= ZERO_LIMIT ? 'text-red-300' : 'text-primary-foreground')}>
                                 {data.zerosThisMonth}
                                 <span className="text-sm text-primary-foreground/70"> / {ZERO_LIMIT}</span>
                             </div>
                             <Tooltip>
                                <TooltipTrigger asChild>
                                     <Progress
                                        value={zeroProgress}
                                        aria-label={`${data.zerosThisMonth} de ${ZERO_LIMIT} zeros permitidos`}
                                        className="h-1.5 w-full bg-white/30"
                                        indicatorClassName={progressColor} // Pass class name here
                                     />
                                </TooltipTrigger>
                                 <TooltipContent>
                                    <p>{data.zerosThisMonth >= ZERO_LIMIT ? 'Limite de zeros atingido/excedido.' : `${ZERO_LIMIT - data.zerosThisMonth} zero(s) restante(s).`}</p>
                                 </TooltipContent>
                             </Tooltip>
                         </div>

                          {/* Projected Bonus */}
                         <div className="col-span-2 flex items-center justify-between p-3 rounded-lg border border-white/30 bg-white/10 backdrop-blur-sm">
                             <div className="flex items-center gap-2">
                                <Gift className="h-5 w-5 text-yellow-300"/>
                                <span className="text-sm font-medium text-primary-foreground">Bônus Projetado</span>
                                 <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Info className="h-3 w-3 text-primary-foreground/70 cursor-help" />
                                    </TooltipTrigger>
                                    <TooltipContent side="top">
                                         <p className="text-xs max-w-[180px]">Baseado no desempenho atual. Valor final definido no fechamento do mês.</p>
                                    </TooltipContent>
                                </Tooltip>
                             </div>
                             <span className="text-lg font-bold text-yellow-300">
                                R$ {data.projectedBonus.toFixed(2)}
                            </span>
                         </div>
                     </CardContent>
                      <CardFooter className="bg-black/10 px-4 py-2">
                         <Link href="/colaborador/avaliacoes" passHref className='w-full'>
                            <Button variant="link" size="sm" className="w-full text-xs text-primary-foreground/90 hover:text-primary-foreground justify-center">Ver Histórico Completo</Button>
                        </Link>
                     </CardFooter>
                 </IllustrationCard>

                 {/* Tasks for Today - Cleaner List */}
                 <Card className="shadow-sm border">
                     <CardHeader className="p-3 pb-1">
                         <CardTitle className="flex items-center gap-2 text-base font-semibold"><ListChecks className="h-5 w-5 text-primary" /> Tarefas de Hoje</CardTitle>
                     </CardHeader>
                     <CardContent className="p-3">
                         {data.tasksToday.length > 0 ? (
                             <ul className="space-y-2">
                                 {data.tasksToday.map(task => (
                                     <li key={task.id} className="flex items-center justify-between p-2.5 border rounded-md bg-background hover:bg-muted/50 transition-colors">
                                        <div className='min-w-0'>
                                            <p className="text-sm font-medium truncate">{task.title}</p>
                                        </div>
                                         <Tooltip>
                                             <TooltipTrigger asChild>
                                                 <span className="ml-2 text-muted-foreground flex-shrink-0 cursor-help">
                                                     <Info className="h-4 w-4" />
                                                  </span>
                                             </TooltipTrigger>
                                             <TooltipContent side="left" className="max-w-[200px] text-xs">
                                                 <p className="font-semibold">Critério (Nota 10):</p>
                                                 <p>{task.criteria}</p>
                                             </TooltipContent>
                                         </Tooltip>
                                     </li>
                                 ))}
                             </ul>
                         ) : (
                             <p className="text-sm text-muted-foreground text-center py-4">Nenhuma tarefa específica para hoje.</p>
                         )}
                     </CardContent>
                 </Card>

                 {/* Active Challenges - Illustrated Card */}
                 <Card className="shadow-sm border">
                     <CardHeader className="p-3 pb-1">
                         <CardTitle className="flex items-center gap-2 text-base font-semibold"><Sparkles className="h-5 w-5 text-purple-500" /> Desafios Ativos</CardTitle>
                         {data.activeChallenges.length > 0 && <CardDescription className="text-xs">Participe e ganhe pontos extras!</CardDescription>}
                     </CardHeader>
                     <CardContent className="p-3">
                         {data.activeChallenges.length > 0 ? (
                             <ul className="space-y-3">
                                 {data.activeChallenges.map(challenge => (
                                     <li key={challenge.id} className="border rounded-lg p-3 hover:shadow-md transition-shadow bg-gradient-to-r from-purple-50 via-fuchsia-50 to-pink-50 dark:from-purple-900/30 dark:via-fuchsia-900/30 dark:to-pink-900/30">
                                         <div className="flex justify-between items-start mb-1 gap-2">
                                             <h4 className="font-semibold text-sm text-purple-800 dark:text-purple-200">{challenge.title}</h4>
                                             <Badge variant="secondary" className="text-xs flex-shrink-0 whitespace-nowrap bg-yellow-400 text-yellow-900 border-yellow-500">{challenge.points} pts</Badge>
                                         </div>
                                         <p className="text-xs text-muted-foreground dark:text-slate-400 mb-2 line-clamp-2">{challenge.description}</p>
                                         <div className="flex justify-between items-center text-xs text-muted-foreground dark:text-slate-400">
                                             <span>Termina: {format(parseISO(challenge.periodEndDate), 'dd/MM/yy')}</span>
                                              <Link href="/colaborador/desafios" passHref>
                                                  <Button variant="link" size="sm" className="p-0 h-auto text-accent text-xs font-semibold">Ver Detalhes</Button>
                                              </Link>
                                         </div>
                                     </li>
                                 ))}
                             </ul>
                         ) : (
                             <p className="text-sm text-muted-foreground text-center py-4">Nenhum desafio ativo no momento.</p>
                         )}
                     </CardContent>
                     <CardFooter className="p-3 border-t mt-2 bg-muted/50">
                         <Link href="/colaborador/desafios" passHref className="w-full">
                             <Button variant="ghost" size="sm" className="w-full text-xs text-primary">Ver Todos Desafios</Button>
                         </Link>
                     </CardFooter>
                 </Card>

                 {/* Notifications Card - Removed as it's in header now */}
                 {/* Keep if you want a dedicated notification list here */}

             </div>
         </TooltipProvider>
     );
 }

 // Assuming Trophy and Settings are imported elsewhere or need importing if used in getNotificationIcon
 import { Settings, Trophy } from 'lucide-react';

