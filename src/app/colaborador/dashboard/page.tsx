
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
 import { Label } from "@/components/ui/label"; // Import Label component
 import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'; // Import Avatar components
 import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'; // Import DropdownMenu components

 // Import types
 import type { Evaluation } from '@/types/evaluation';
 import type { Task } from '@/types/task';
 import type { Challenge } from '@/types/challenge';
 import type { Notification } from '@/types/notification'; // Import Notification type

 // Import mock data (Ensure paths are correct)
 import { mockEmployees } from '@/app/employees/page';
 import { mockTasks as allAdminTasks } from '@/app/tasks/page';
 import { mockChallenges as allAdminChallenges, mockParticipants } from '@/app/challenges/page';

 // Mock Employee ID for demonstration
 const CURRENT_EMPLOYEE_ID = '1'; // Alice Silva

 // Enhanced mock evaluations for the current employee
 const generateMockEvaluations = (employeeId: string, monthsBack: number = 1): Evaluation[] => {
    const evals: Evaluation[] = [];
    const today = new Date();
    for (let m = 0; m <= monthsBack; m++) {
        const monthToProcess = new Date(today.getFullYear(), today.getMonth() - m, 1);
        const start = startOfMonth(monthToProcess);
        const end = m === 0 ? today : endOfMonth(monthToProcess);

        let days = [];
        if(start <= end) {
            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                 days.push(new Date(d));
            }
        }

        days.forEach(day => {
            const tasksForDay = allAdminTasks.filter(task => {
                 if (!task.assignedTo) return true; // Global
                 if (task.assignedTo === 'individual' && task.assignedEntityId === employeeId) return true;
                 // Add role/dept checks if needed, assuming employee '1' is Recruiter in RH
                 if (task.assignedTo === 'role' && task.assignedEntityId === 'Recrutadora' && employeeId === '1') return true;
                 if (task.assignedTo === 'department' && task.assignedEntityId === 'RH' && employeeId === '1') return true;
                 return false;
            });

            if (tasksForDay.length > 0) {
                tasksForDay.forEach(task => {
                    const score = Math.random() > 0.1 ? 10 : 0; // 10% chance of getting 0
                    evals.push({
                        id: `eval${employeeId}-${task.id}-${format(day, 'yyyy-MM-dd')}`,
                        employeeId: employeeId,
                        taskId: task.id,
                        evaluationDate: format(day, 'yyyy-MM-dd'),
                        score: score,
                        justification: score === 0 ? `Item não concluído (${task.title}).` : undefined,
                        evaluatorId: 'admin1',
                        isDraft: false,
                    });
                });
            }
        });
    }
    return evals;
 };

 const mockEvaluations = generateMockEvaluations(CURRENT_EMPLOYEE_ID, 2); // Generate for last 2 months


 interface EmployeeDashboardData {
     todayStatus: 'pending' | 'evaluated' | 'no_tasks'; // Added 'no_tasks' state
     zerosThisMonth: number;
     projectedBonus: number;
     // Removed last30DaysPerformance - calculate on demand if needed
     tasksToday: Task[];
     activeChallenges: Challenge[];
     recentNotifications: Notification[]; // Use imported Notification type
     monthlyPerformanceTrend?: 'up' | 'down' | 'stable'; // Optional trend
 }

 // Mock fetching function for employee dashboard
 const fetchEmployeeDashboardData = async (employeeId: string): Promise<EmployeeDashboardData> => {
     await new Promise(resolve => setTimeout(resolve, 600)); // Slightly reduced delay

     const todayStr = format(new Date(), 'yyyy-MM-dd');
     const employee = mockEmployees.find(e => e.id === employeeId);
     if (!employee) throw new Error("Colaborador não encontrado.");

     const getTasksForEmployee = (emp: typeof employee, date: Date): Task[] => {
         return allAdminTasks.filter(task => {
             let applies = false;
             const dayOfWeek = date.getDay(); // 0 = Sunday
             if (task.periodicity === 'daily') applies = true;
             else if (task.periodicity === 'specific_days') {
                  // Example: Friday only for t6
                 if (task.id === 't6' && dayOfWeek === 5) applies = true;
                 // Add more specific day logic here
             }
              // Add specific_dates logic here if needed

             if (!applies) return false;
             if (!task.assignedTo) return true;
             if (task.assignedTo === 'role' && task.assignedEntityId === emp.role) return true;
             if (task.assignedTo === 'department' && task.assignedEntityId === emp.department) return true;
             if (task.assignedTo === 'individual' && task.assignedEntityId === emp.id) return true;
             return false;
         });
     };
     const tasksToday = getTasksForEmployee(employee, new Date());

     const todayEvaluations = mockEvaluations.filter(e => e.employeeId === employeeId && e.evaluationDate === todayStr);
     let todayStatus: EmployeeDashboardData['todayStatus'];
      if (tasksToday.length === 0) {
         todayStatus = 'no_tasks';
     } else if (todayEvaluations.length >= tasksToday.length) { // Assuming all tasks for the day get an eval record
          todayStatus = 'evaluated';
     } else {
         todayStatus = 'pending';
     }


     const start = startOfMonth(new Date());
     const currentMonthEvaluations = mockEvaluations.filter(e =>
         e.employeeId === employeeId &&
         parseISO(e.evaluationDate) >= start &&
         parseISO(e.evaluationDate) <= new Date() // Only count up to today
     );
     const zerosThisMonth = currentMonthEvaluations.filter(e => e.score === 0).length;


     const ZERO_LIMIT = 3;
     const BONUS_LOW = 70;
     const BONUS_HIGH = 90;
     let projectedBonus = 0;
     if (zerosThisMonth < ZERO_LIMIT) projectedBonus = BONUS_HIGH;
     else if (zerosThisMonth === ZERO_LIMIT) projectedBonus = BONUS_LOW;

     // Calculate Trend (Simplified Example: Compare this month's average score to last month's)
      const lastMonthStart = startOfMonth(new Date(new Date().setMonth(new Date().getMonth() - 1)));
      const lastMonthEnd = endOfMonth(lastMonthStart);
      const lastMonthEvaluations = mockEvaluations.filter(e =>
         e.employeeId === employeeId &&
         parseISO(e.evaluationDate) >= lastMonthStart &&
         parseISO(e.evaluationDate) <= lastMonthEnd
      );

     const currentMonthAvg = currentMonthEvaluations.length > 0
         ? currentMonthEvaluations.reduce((sum, e) => sum + e.score, 0) / currentMonthEvaluations.length
         : 0;
     const lastMonthAvg = lastMonthEvaluations.length > 0
         ? lastMonthEvaluations.reduce((sum, e) => sum + e.score, 0) / lastMonthEvaluations.length
         : 0;

      let monthlyPerformanceTrend: EmployeeDashboardData['monthlyPerformanceTrend'];
      if (currentMonthEvaluations.length > 0 && lastMonthEvaluations.length > 0) {
          if (currentMonthAvg > lastMonthAvg + 0.5) monthlyPerformanceTrend = 'up';
          else if (currentMonthAvg < lastMonthAvg - 0.5) monthlyPerformanceTrend = 'down';
          else monthlyPerformanceTrend = 'stable';
      } else {
          monthlyPerformanceTrend = undefined; // Not enough data
      }


     const activeChallenges = allAdminChallenges.filter(ch => {
         if (ch.status !== 'active') return false;
         if (ch.eligibility.type === 'all') return true;
         if (ch.eligibility.type === 'department' && ch.eligibility.entityIds?.includes(employee.department)) return true;
         if (ch.eligibility.type === 'role' && ch.eligibility.entityIds?.includes(employee.role)) return true;
         if (ch.eligibility.type === 'individual' && ch.eligibility.entityIds?.includes(employee.id)) return true;
         return false;
     });

      // --- Mock Notifications ---
     const recentNotifications: Notification[] = [
         ...(todayStatus === 'evaluated' ? [{ id: 'n1', type: 'evaluation' as const, message: `Sua avaliação de hoje foi registrada.`, timestamp: new Date(Date.now() - 360000 * Math.random()), read: false, link: '/colaborador/avaliacoes' }] : []),
         { id: 'n2', type: zerosThisMonth >= ZERO_LIMIT ? 'system' as const : 'info' as const, message: `Você tem ${zerosThisMonth} zero(s) este mês. Limite para bônus: ${ZERO_LIMIT}.`, timestamp: new Date(), read: false },
         ...(activeChallenges.length > 0 ? [{ id: 'n3', type: 'challenge' as const, message: `Desafio ativo: "${activeChallenges[0]?.title}". Ganhe ${activeChallenges[0]?.points} pts!`, timestamp: new Date(Date.now() - 2 * 3600000), read: false, link: '/colaborador/desafios' }] : []),
          { id: 'n4', type: 'ranking' as const, message: `Sua posição no ranking é 3º lugar.`, timestamp: new Date(Date.now() - 86400000), read: true, link: '/colaborador/ranking' },
          { id: 'n5', type: 'announcement' as const, message: 'Lembrete: Reunião geral sexta-feira às 10h.', timestamp: new Date(Date.now() - 2 * 86400000), read: true },
     ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()); // Sort newest first


     return {
         todayStatus,
         zerosThisMonth,
         projectedBonus,
         tasksToday,
         activeChallenges,
         recentNotifications,
         monthlyPerformanceTrend,
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
                 // Simulate guest mode or fetch based on actual auth state
                 const isGuest = false; // Replace with actual check
                 if (!isGuest) {
                     const dashboardData = await fetchEmployeeDashboardData(CURRENT_EMPLOYEE_ID);
                     setData(dashboardData);
                 } else {
                      // Set mock data for guest view or handle appropriately
                      setData({
                          todayStatus: 'pending',
                          zerosThisMonth: 1,
                          projectedBonus: 90,
                          tasksToday: allAdminTasks.slice(0, 2), // Show a couple tasks
                          activeChallenges: allAdminChallenges.filter(c => c.status === 'active').slice(0, 1),
                          recentNotifications: [
                              { id: 'gn1', type: 'info', message: 'Bem-vindo ao modo convidado!', timestamp: new Date(), read: false },
                              { id: 'gn2', type: 'challenge', message: 'Confira os desafios disponíveis!', timestamp: new Date(Date.now() - 10000), read: false, link: '/colaborador/desafios' }
                          ],
                           monthlyPerformanceTrend: 'stable',
                      });
                 }
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

      // Function to get notification icon based on type
     const getNotificationIcon = (type: Notification['type']) => {
        switch (type) {
            case 'evaluation': return <ClipboardCheck className="h-4 w-4 text-blue-500" />;
            case 'challenge': return <Target className="h-4 w-4 text-purple-500" />;
            case 'ranking': return <Trophy className="h-4 w-4 text-yellow-500" />; // Assuming Trophy exists
            case 'announcement': return <Bell className="h-4 w-4 text-gray-500" />;
            case 'system': return <Settings className="h-4 w-4 text-red-500" />; // Assuming Settings exists
            default: return <Info className="h-4 w-4 text-muted-foreground" />; // Default to Info
        }
     };


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
     const progressColor = zeroProgress > 80 ? 'bg-destructive' : zeroProgress > 50 ? 'bg-yellow-500' : 'bg-green-500'; // Changed to green for low zeros


     const getTrendIcon = (trend?: 'up' | 'down' | 'stable') => {
        switch (trend) {
            case 'up': return <TrendingUp className="h-5 w-5 text-green-500" />;
            case 'down': return <TrendingDown className="h-5 w-5 text-red-500" />;
            case 'stable': return <Minus className="h-5 w-5 text-muted-foreground" />;
            default: return null;
        }
    };


     return (
         <TooltipProvider>
             <div className="space-y-4 p-4 md:p-0"> {/* Add padding for mobile */}

                 {/* Welcome/Status Card - Enhanced and Illustrated */}
                 <Card className="shadow-md overflow-hidden border-none bg-gradient-to-br from-primary to-teal-600 dark:from-slate-800 dark:to-teal-900 text-primary-foreground">
                     <CardHeader className="p-4 pb-2">
                         <div className="flex justify-between items-center">
                             <CardTitle className="text-lg">Seu Dia</CardTitle>
                             {getTrendIcon(data.monthlyPerformanceTrend)}
                         </div>
                         <CardDescription className="text-primary-foreground/80 text-xs">
                             {format(new Date(), "eeee, d 'de' MMMM", { locale: ptBR })}
                         </CardDescription>
                     </CardHeader>
                     <CardContent className="p-4 grid grid-cols-2 gap-4">
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
                             <div className={`text-3xl font-bold mb-1 ${data.zerosThisMonth > ZERO_LIMIT ? 'text-red-300' : ''}`}>
                                 {data.zerosThisMonth}
                                 <span className="text-sm text-primary-foreground/70"> / {ZERO_LIMIT}</span>
                             </div>
                             <Tooltip>
                                <TooltipTrigger asChild>
                                     <Progress value={zeroProgress} aria-label={`${data.zerosThisMonth} de ${ZERO_LIMIT} zeros permitidos`} className="h-1.5 w-full bg-white/30" indicatorClassName={progressColor} />
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
                 </Card>

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

    