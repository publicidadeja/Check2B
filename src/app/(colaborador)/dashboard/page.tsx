
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
   Eye, // Added Eye icon
   ArrowRight,
   Frown, // Icon for empty state
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
 import { LoadingSpinner } from '@/components/ui/loading-spinner'; // Import LoadingSpinner

 // Import types
 import type { Evaluation } from '@/types/evaluation';
 import type { Task } from '@/types/task';
 import type { Challenge } from '@/types/challenge';
 import type { Notification } from '@/types/notification'; // Import Notification type

 // Import mock data (Ensure paths are correct)
 import { mockEmployeesSimple } from '@/lib/mockData/ranking'; // Updated import path
 import { mockTasks as allAdminTasks } from '@/lib/mockData/tasks'; // Use new task data file
 import { mockChallenges as allAdminChallenges, mockParticipants, mockCurrentParticipations } from '@/lib/mockData/challenges'; // Updated import path

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
     employeeName: string; // Add employee name
 }

 // Mock evaluations for the current employee (Generate dynamically for demo)
 const mockEvaluations: Evaluation[] = Array.from({ length: 30 }).flatMap((_, dayIndex) => {
    const date = new Date();
    date.setDate(date.getDate() - dayIndex); // Go back in days
    const dateStr = format(date, 'yyyy-MM-dd');

    // Simulate Alice having task 't1' daily
    const taskId = 't1';
    const score = Math.random() > 0.1 ? 10 : 0; // 10% chance of 0
    return [{
        id: `eval${CURRENT_EMPLOYEE_ID}-${taskId}-${dateStr}`,
        employeeId: CURRENT_EMPLOYEE_ID,
        taskId: taskId,
        evaluationDate: dateStr,
        score: score,
        justification: score === 0 ? 'Não verificado.' : undefined,
        evaluatorId: 'admin1',
        isDraft: false,
        organizationId: 'org_default', // Assuming default org
    }];
 }).filter(Boolean); // Filter out any potential nulls if logic changes

 const fetchEmployeeDashboardData = async (employeeId: string): Promise<EmployeeDashboardData> => {
     await new Promise(resolve => setTimeout(resolve, 700));

     const today = new Date();
     const todayStr = format(today, 'yyyy-MM-dd');
     const emp = mockEmployeesSimple.find(e => e.id === employeeId);

     if (!emp) {
         throw new Error("Colaborador não encontrado.");
     }

     // --- Helper: Get Tasks for Employee ---
     const getTasksForEmployee = (employeeId: string, date: Date): Task[] => {
        const employee = mockEmployeesSimple.find(e => e.id === employeeId);
        if (!employee) return [];

        return allAdminTasks.filter(task => {
            let applies = false;
            const dayOfWeek = date.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat

            // Check Periodicity
            if (task.periodicity === 'daily') {
                applies = true;
            } else if (task.periodicity === 'specific_days') {
                // Example: Check if task t6 applies on Friday (day 5)
                if (task.id === 't6' && dayOfWeek === 5) applies = true;
                 // Example: Check if task t4 applies on Tue/Thu (days 2/4) - Assuming t4 exists
                 // if (task.id === 't4' && (dayOfWeek === 2 || dayOfWeek === 4)) applies = true;
            } else if (task.periodicity === 'specific_dates') {
                 // Example: Check if task tX applies on a specific date
                 // if (task.id === 'tX' && format(date, 'yyyy-MM-dd') === '2024-12-25') applies = true;
            }

            if (!applies) return false; // Stop if periodicity doesn't match

            // Check Assignment
            if (!task.assignedTo) return true; // Global task applies to everyone
            if (task.assignedTo === 'role' && task.assignedEntityId === employee.role) return true;
            if (task.assignedTo === 'department' && task.assignedEntityId === employee.department) return true;
            if (task.assignedTo === 'individual' && task.assignedEntityId === employee.id) return true;

            return false; // Does not apply if specific assignment doesn't match
        });
    };
     // -----------------------------------

     const evaluationsToday = mockEvaluations.filter(e => e.employeeId === employeeId && e.evaluationDate === todayStr);
     const tasksToday = getTasksForEmployee(employeeId, today);
     const todayStatus = evaluationsToday.length >= tasksToday.length && tasksToday.length > 0 ? 'evaluated' : tasksToday.length === 0 ? 'no_tasks' : 'pending';

     // Zeros this month calculation
     let zerosThisMonth = 0;
     const startCurrentMonth = startOfMonth(today);
     const endCurrentMonth = endOfMonth(today); // Use endOfMonth
     mockEvaluations.filter(e => {
        const evalDate = parseISO(e.evaluationDate);
        return e.employeeId === employeeId && evalDate >= startCurrentMonth && evalDate <= endCurrentMonth;
     }).forEach(evalItem => {
          if (evalItem.score === 0) zerosThisMonth++;
     });


     const ZERO_LIMIT = 3; // Could be fetched from settings
     const BASE_BONUS = 100; // Could be fetched from settings
     const projectedBonus = zerosThisMonth >= ZERO_LIMIT ? 0 : BASE_BONUS; // Simplified bonus logic

     const activeChallenges = allAdminChallenges.filter(ch => {
         if (ch.status !== 'active') return false;
          if (!ch.periodStartDate || !ch.periodEndDate) return false; // Guard against missing dates
          try {
             // Check if today is within the challenge period
             const startDate = parseISO(ch.periodStartDate);
             const endDate = parseISO(ch.periodEndDate);
             if (today < startDate || today > endDate) return false;
         } catch (e) {
             console.error("Error parsing challenge dates:", ch.id, e);
             return false; // Skip if dates are invalid
         }

         // Check eligibility
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
         employeeName: emp.name, // Add employee name
     };
 };


 export default function EmployeeDashboardPage() {
     const [data, setData] = React.useState<EmployeeDashboardData | null>(null);
     const [isLoading, setIsLoading] = React.useState(true);
     const { toast } = useToast();
     const ZERO_LIMIT = 3; // Make this potentially configurable
     const BASE_BONUS = 100; // Make configurable

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


     if (isLoading || !data) { // Show loading spinner while loading OR if data is null initially
         return (
             <div className="flex justify-center items-center h-full py-20">
                 {/* Use LoadingSpinner component */}
                 <LoadingSpinner size="lg" text="Carregando dashboard..." />
             </div>
         );
     }

     const zeroProgress = Math.min((data.zerosThisMonth / ZERO_LIMIT) * 100, 100);
      const progressColor = zeroProgress >= 100 ? 'bg-destructive' : zeroProgress >= ( (ZERO_LIMIT - 1) / ZERO_LIMIT * 100) ? 'bg-yellow-500' : 'bg-green-500';


     const getTrendIcon = (trend?: 'up' | 'down' | 'stable') => {
        switch (trend) {
            case 'up': return <TrendingUp className="h-5 w-5 text-emerald-300" />;
            case 'down': return <TrendingDown className="h-5 w-5 text-red-300" />;
            case 'stable': return <Minus className="h-5 w-5 text-primary-foreground/70" />;
            default: return null;
        }
    };

    // Style Card for illustration
    const IllustrationCard = ({ children, className }: { children: React.ReactNode, className?: string }) => (
         <Card className={cn("shadow-lg overflow-hidden border-none relative bg-gradient-to-br from-teal-600 to-cyan-700 dark:from-teal-700 dark:to-cyan-800 text-primary-foreground rounded-xl", className)}>
            {/* Subtle background pattern */}
             <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }}></div>
            <div className="relative z-10">{children}</div>
         </Card>
     );

     return (
         <TooltipProvider>
              <div className="space-y-5 p-4"> {/* Adjusted spacing and padding */}

                 {/* Welcome/Status Card - Enhanced and Illustrated */}
                 <IllustrationCard>
                     <CardHeader className="p-4 pb-2">
                         <div className="flex justify-between items-center">
                              <CardTitle className="text-lg font-semibold tracking-tight">Olá, {data.employeeName.split(' ')[0]}!</CardTitle>
                             {getTrendIcon(data.monthlyPerformanceTrend)}
                         </div>
                         <CardDescription className="text-primary-foreground/80 text-xs">
                             {format(new Date(), "eeee, d 'de' MMMM", { locale: ptBR })}
                         </CardDescription>
                     </CardHeader>
                     <CardContent className="p-4 grid grid-cols-2 gap-3">
                         {/* Today's Evaluation Status */}
                          <div className="flex flex-col items-center justify-center text-center p-3 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20">
                              <Label className="text-[10px] uppercase tracking-wider text-primary-foreground/70 mb-1 font-medium">Hoje</Label>
                              {data.todayStatus === 'evaluated' && <CheckCircle className="h-7 w-7 text-emerald-300 mb-0.5" />}
                              {data.todayStatus === 'pending' && <Loader2 className="h-7 w-7 text-yellow-300 animate-spin mb-0.5" />}
                              {data.todayStatus === 'no_tasks' && <CalendarCheck className="h-7 w-7 text-primary-foreground/60 mb-0.5" />}
                              <Badge variant={data.todayStatus === 'evaluated' ? 'default' : data.todayStatus === 'pending' ? 'secondary' : 'outline'} className={cn("text-[9px] px-1.5 py-0.5 leading-tight", data.todayStatus === 'evaluated' && 'bg-emerald-500 text-white border-emerald-400', data.todayStatus === 'pending' && 'bg-yellow-400 text-yellow-900 border-yellow-300', data.todayStatus === 'no_tasks' && 'bg-white/10 text-primary-foreground/80 border-white/20')}>
                                {data.todayStatus === 'evaluated' ? 'Avaliado' : data.todayStatus === 'pending' ? 'Pendente' : 'Sem Tarefas'}
                             </Badge>
                          </div>

                         {/* Monthly Zeros */}
                          <div className="flex flex-col items-center justify-center text-center p-3 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20">
                            <Label className="text-[10px] uppercase tracking-wider text-primary-foreground/70 mb-1 font-medium">Zeros no Mês</Label>
                              <div className={cn("text-3xl font-bold mb-0.5 leading-none", data.zerosThisMonth >= ZERO_LIMIT ? 'text-red-300' : 'text-primary-foreground')}>
                                 {data.zerosThisMonth}
                                 <span className="text-xs text-primary-foreground/70">/{ZERO_LIMIT}</span>
                             </div>
                             <Tooltip>
                                <TooltipTrigger asChild>
                                     <Progress
                                        value={zeroProgress}
                                        aria-label={`${data.zerosThisMonth} de ${ZERO_LIMIT} zeros permitidos`}
                                        className="h-1 w-full bg-white/30 rounded-full"
                                        indicatorClassName={progressColor}
                                     />
                                </TooltipTrigger>
                                 <TooltipContent side="bottom">
                                    <p className="text-xs">{data.zerosThisMonth >= ZERO_LIMIT ? 'Limite de zeros atingido/excedido.' : `${ZERO_LIMIT - data.zerosThisMonth} zero(s) restante(s) para bônus.`}</p>
                                 </TooltipContent>
                             </Tooltip>
                          </div>

                          {/* Projected Bonus */}
                         <div className="col-span-2 flex items-center justify-between p-3 rounded-lg border border-white/20 bg-white/10 backdrop-blur-sm">
                             <div className="flex items-center gap-2">
                                <Gift className="h-5 w-5 text-yellow-300"/>
                                <span className="text-sm font-medium text-primary-foreground">Bônus Projetado</span>
                                 <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Info className="h-3 w-3 text-primary-foreground/70 cursor-help" />
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="max-w-[180px]">
                                         <p className="text-xs">Estimativa baseada no desempenho atual. Valor final definido no fechamento do mês (Min. R$ {BASE_BONUS.toFixed(2)} se &lt;= {ZERO_LIMIT} zeros).</p>
                                    </TooltipContent>
                                </Tooltip>
                             </div>
                             <span className={cn("text-lg font-bold", data.zerosThisMonth >= ZERO_LIMIT ? "text-red-300 line-through" : "text-yellow-300")}>
                                {/* Show 0 if limit reached, otherwise show potential bonus */}
                                R$ {data.zerosThisMonth >= ZERO_LIMIT ? '0.00' : BASE_BONUS.toFixed(2)}
                            </span>
                         </div>
                     </CardContent>
                      <CardFooter className="bg-black/10 px-4 py-2">
                         <Link href="/colaborador/avaliacoes" passHref className='w-full'>
                            <Button variant="link" size="sm" className="w-full text-xs text-primary-foreground/90 hover:text-primary-foreground justify-center">Ver Histórico de Avaliações</Button>
                        </Link>
                     </CardFooter>
                 </IllustrationCard>

                 {/* Tasks for Today */}
                 <Card className="shadow-sm border bg-card">
                     <CardHeader className="p-3 pb-1">
                          <CardTitle className="flex items-center gap-2 text-base font-semibold"><ListChecks className="h-5 w-5 text-primary" /> Tarefas de Hoje</CardTitle>
                           {data.todayStatus === 'pending' && <CardDescription className="text-xs">Complete estas tarefas para garantir sua pontuação!</CardDescription>}
                           {data.todayStatus === 'evaluated' && <CardDescription className="text-xs">Tarefas avaliadas para hoje.</CardDescription>}
                           {data.todayStatus === 'no_tasks' && <CardDescription className="text-xs">Sem tarefas específicas no checklist hoje.</CardDescription>}
                     </CardHeader>
                     <CardContent className="p-3">
                         {data.tasksToday.length > 0 ? (
                             <ul className="space-y-2">
                                 {data.tasksToday.map(task => (
                                     <li key={task.id} className="flex items-center justify-between p-2.5 border rounded-md bg-background hover:bg-muted/50 transition-colors">
                                        <div className='min-w-0 mr-2'>
                                            <p className="text-sm font-medium truncate">{task.title}</p>
                                             {/* Optionally show description */}
                                             {/* <p className="text-xs text-muted-foreground truncate">{task.description}</p> */}
                                        </div>
                                         <Tooltip>
                                             <TooltipTrigger asChild>
                                                  <span className="ml-auto text-muted-foreground flex-shrink-0 cursor-help">
                                                      <Info className="h-4 w-4" />
                                                   </span>
                                             </TooltipTrigger>
                                             <TooltipContent side="left" className="max-w-[200px] text-xs z-50">
                                                 <p className="font-semibold mb-1">Critério (Nota 10):</p>
                                                 <p>{task.criteria}</p>
                                             </TooltipContent>
                                         </Tooltip>
                                     </li>
                                 ))}
                             </ul>
                         ) : (
                              <p className="text-sm text-muted-foreground text-center py-4 italic">
                                 {data.todayStatus === 'evaluated' ? 'Avaliação concluída.' : 'Nenhuma tarefa no checklist hoje.'}
                             </p>
                         )}
                     </CardContent>
                 </Card>

                 {/* Active Challenges - More engaging design */}
                 <Card className="shadow-sm border bg-gradient-to-r from-purple-50 via-fuchsia-50 to-pink-50 dark:from-purple-900/20 dark:via-fuchsia-900/20 dark:to-pink-900/20">
                     <CardHeader className="p-3 pb-1">
                          <CardTitle className="flex items-center gap-2 text-base font-semibold"><Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400" /> Desafios Ativos</CardTitle>
                          {data.activeChallenges.length > 0 && <CardDescription className="text-xs">Participe e ganhe pontos extras!</CardDescription>}
                     </CardHeader>
                     <CardContent className="p-3">
                         {data.activeChallenges.length > 0 ? (
                             <ul className="space-y-3">
                                 {data.activeChallenges.map(challenge => (
                                     <li key={challenge.id} className="border border-purple-200 dark:border-purple-800 rounded-lg p-3 hover:shadow-md transition-shadow bg-white dark:bg-card">
                                         <div className="flex justify-between items-start mb-1 gap-2">
                                              <h4 className="font-semibold text-sm text-purple-800 dark:text-purple-200 flex-1">{challenge.title}</h4>
                                              <Badge variant="secondary" className="text-xs flex-shrink-0 whitespace-nowrap bg-yellow-400 text-yellow-900 border-yellow-500"><Award className='h-3 w-3 mr-1'/>{challenge.points} pts</Badge>
                                         </div>
                                         <p className="text-xs text-muted-foreground dark:text-slate-400 mb-2 line-clamp-2">{challenge.description}</p>
                                         <div className="flex justify-between items-center text-[10px] text-muted-foreground dark:text-slate-400">
                                              <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" /> Termina em: {format(parseISO(challenge.periodEndDate), 'dd/MM/yy')}</span>
                                               <Link href="/colaborador/desafios" passHref>
                                                   <Button variant="link" size="sm" className="p-0 h-auto text-accent text-[10px] font-semibold">Ver Detalhes <ArrowRight className="h-3 w-3 ml-1"/></Button>
                                               </Link>
                                         </div>
                                     </li>
                                 ))}
                             </ul>
                         ) : (
                              <div className="text-center py-6 text-muted-foreground">
                                  <Target className="h-10 w-10 mx-auto mb-2 text-gray-400"/>
                                  <p className="text-sm">Nenhum desafio ativo no momento.</p>
                                  <Link href="/colaborador/desafios" passHref>
                                     <Button variant="link" size="sm" className="text-xs mt-2">Ver histórico de desafios</Button>
                                  </Link>
                              </div>
                         )}
                     </CardContent>
                 </Card>

             </div>
         </TooltipProvider>
     );
 }
