
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
   CalendarCheck,
   CheckCircle,
   TrendingUp,
   Target, 
   Info,   
   Loader2,
   TrendingDown, 
   Minus, 
   ListChecks, 
   Award, 
   Gift, 
   CalendarDays, 
   Sparkles, 
   ArrowRight,
   Frown, 
 } from 'lucide-react';
 import { Progress } from '@/components/ui/progress';
 import { Badge } from '@/components/ui/badge';
 import { Button } from '@/components/ui/button';
 import { useToast } from '@/hooks/use-toast';
 import { format, parseISO, startOfMonth, endOfMonth, isPast, isBefore, isValid } from 'date-fns';
 import { ptBR } from 'date-fns/locale';
 import Link from 'next/link';
 import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
 import { cn } from '@/lib/utils'; 
 import { Label } from '@/components/ui/label'; 
 import { LoadingSpinner } from '@/components/ui/loading-spinner'; 
 import { useAuth } from '@/hooks/use-auth';
 // import type { UserProfile } from '@/types/user'; // Was commented out

 // Import types
 import type { Task } from '@/types/task';
 import type { Challenge } from '@/types/challenge';
 import type { Notification } from '@/types/notification'; 

 // Import services
 import { getAllTasksForOrganization } from '@/lib/task-service';
 import { getTasksForEmployeeOnDate, getEvaluationsForDay, getEvaluationsForOrganizationInPeriod } from '@/lib/evaluation-service';
 import { getAllChallenges, getChallengeParticipationsByEmployee } from '@/lib/challenge-service';
 // import { getUserProfileData } from '@/lib/auth'; // Was commented out


 interface EmployeeDashboardData {
     todayStatus: 'evaluated' | 'pending' | 'no_tasks';
     zerosThisMonth: number;
     projectedBonus: number;
     tasksToday: Task[];
     activeChallenges: Challenge[];
     monthlyPerformanceTrend?: 'up' | 'down' | 'stable';
     employeeName: string; 
     // userProfile?: UserProfile | null; // This was part of my previous change, reverting
 }


 export default function EmployeeDashboardPage() {
     const { user, organizationId, isLoading: authIsLoading } = useAuth();
     const [data, setData] = React.useState<EmployeeDashboardData | null>(null);
     const [isLoading, setIsLoading] = React.useState(true);
     const { toast } = useToast();
     
     const CURRENT_EMPLOYEE_ID = user?.uid;
     const employeeDisplayName = user?.displayName || "Colaborador";

     const ZERO_LIMIT = 3; 
     const BASE_BONUS = 100; 

     React.useEffect(() => {
         const fetchEmployeeDashboardData = async () => {
             if (!CURRENT_EMPLOYEE_ID || !organizationId || authIsLoading) {
                 if (!authIsLoading) setIsLoading(false); 
                 return;
             }
             setIsLoading(true);

             try {
                //  const today = new Date();
                //  const todayStr = format(today, 'yyyy-MM-dd');
                //  const startCurrentMonthStr = format(startOfMonth(today), 'yyyy-MM-dd');
                //  const endCurrentMonthStr = format(endOfMonth(today), 'yyyy-MM-dd');

                //  // const userProfileData = await getUserProfileData(CURRENT_EMPLOYEE_ID); // Reverted
                //  // if (!userProfileData) { // Reverted
                //  //    throw new Error("Perfil do colaborador não encontrado."); // Reverted
                //  // } // Reverted

                //  const allOrgTasks = await getAllTasksForOrganization(organizationId);
                 
                //  // Reverted to use placeholder for task filtering
                //  const employeeProfileForTaskFiltering = { 
                //     uid: CURRENT_EMPLOYEE_ID, 
                //     // These were placeholders, keeping them as per the prior state before my last change
                //     department: user?.photoURL || 'N/A', 
                //     userRole: user?.email?.includes('dev') ? 'Desenvolvedor' : 'N/A', 
                //     status: 'active' 
                //  } as any; 

                //  const tasksToday = getTasksForEmployeeOnDate(employeeProfileForTaskFiltering, today, allOrgTasks);
                 
                //  const evaluationsToday = await getEvaluationsForDay(organizationId, todayStr); 
                //  const employeeEvaluationsToday = evaluationsToday.filter(ev => ev.employeeId === CURRENT_EMPLOYEE_ID);

                //  let todayStatus: EmployeeDashboardData['todayStatus'] = 'no_tasks';
                //  if (tasksToday.length > 0) {
                //      const allTasksEvaluated = tasksToday.every(task => 
                //          employeeEvaluationsToday.some(ev => ev.taskId === task.id && ev.score !== undefined)
                //      );
                //      todayStatus = allTasksEvaluated ? 'evaluated' : 'pending';
                //  }
                 
                //  const evaluationsThisMonth = await getEvaluationsForOrganizationInPeriod(organizationId, startCurrentMonthStr, endCurrentMonthStr);
                //  const employeeEvaluationsThisMonth = evaluationsThisMonth.filter(ev => ev.employeeId === CURRENT_EMPLOYEE_ID);
                 
                //  const zerosThisMonth = employeeEvaluationsThisMonth.filter(ev => ev.score === 0).length;
                //  const projectedBonus = zerosThisMonth >= ZERO_LIMIT ? 0 : BASE_BONUS;

                //  const [allOrgChallenges, employeeParticipations] = await Promise.all([
                //      getAllChallenges(organizationId),
                //      getChallengeParticipationsByEmployee(organizationId, CURRENT_EMPLOYEE_ID)
                //  ]);

                //  const participationMap = new Map(employeeParticipations.map(p => [p.challengeId, p]));

                //  const activeChallenges = allOrgChallenges.filter(ch => {
                //      if (ch.status !== 'active' && !(ch.status === 'scheduled' && !isBefore(today, parseISO(ch.periodStartDate)))) {
                //          return false; 
                //      }
                //      if (!ch.periodStartDate || !ch.periodEndDate || !isValid(parseISO(ch.periodStartDate)) || !isValid(parseISO(ch.periodEndDate))) {
                //          return false; 
                //      }
                //      const challengeEndDate = parseISO(ch.periodEndDate + "T23:59:59.999Z");
                //      if (isPast(challengeEndDate) && ch.status !== 'evaluating') return false; 

                //      let isEligible = false;
                //      if (ch.eligibility.type === 'all') isEligible = true;
                //      else if (ch.eligibility.type === 'department' && employeeProfileForTaskFiltering.department && ch.eligibility.entityIds?.includes(employeeProfileForTaskFiltering.department)) isEligible = true; // Reverted
                //      else if (ch.eligibility.type === 'role' && employeeProfileForTaskFiltering.userRole && ch.eligibility.entityIds?.includes(employeeProfileForTaskFiltering.userRole)) isEligible = true; // Reverted
                //      else if (ch.eligibility.type === 'individual' && ch.eligibility.entityIds?.includes(CURRENT_EMPLOYEE_ID)) isEligible = true;
                     
                //      if (!isEligible) return false;

                //      const participation = participationMap.get(ch.id);
                //      return !participation || participation.status === 'pending' || participation.status === 'accepted';
                //  });
                 
                 setData({
                     todayStatus: 'no_tasks', // reverted
                     zerosThisMonth: 0, // reverted
                     projectedBonus: 0, // reverted
                     tasksToday: [], // reverted
                     activeChallenges: [], // reverted
                     monthlyPerformanceTrend: 'stable', 
                     employeeName: employeeDisplayName, 
                 });

             } catch (error: any) {
                 console.error("Erro ao carregar dashboard do colaborador:", error);
                 toast({
                     title: "Erro ao Carregar",
                     description: error.message || "Não foi possível carregar os dados do dashboard.",
                     variant: "destructive",
                 });
                 // Ensure data is set to a non-null state even on error, to avoid infinite loading screen
                 setData(prev => prev || { 
                    todayStatus: 'no_tasks', zerosThisMonth: 0, projectedBonus: 0, tasksToday: [], 
                    activeChallenges: [], employeeName: employeeDisplayName 
                 });
             } finally {
                 setIsLoading(false);
             }
         };

         fetchEmployeeDashboardData();
     }, [CURRENT_EMPLOYEE_ID, organizationId, authIsLoading, employeeDisplayName, toast, user?.photoURL, user?.email]); // Added user dependencies for placeholders


     if (authIsLoading || isLoading || !data) {
         return (
             <div className="flex justify-center items-center h-full py-20">
                 <LoadingSpinner size="lg" text="Carregando dashboard..." />
             </div>
         );
     }
      if (!CURRENT_EMPLOYEE_ID || !organizationId) {
        return (
            <Card className="m-4">
                <CardHeader>
                    <CardTitle>Acesso Negado</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-destructive">Informações de usuário ou organização não encontradas. Por favor, faça login novamente.</p>
                    <Button asChild className="mt-4"><Link href="/login">Login</Link></Button>
                </CardContent>
            </Card>
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

    const IllustrationCard = ({ children, className }: { children: React.ReactNode, className?: string }) => (
         <Card className={cn("shadow-lg overflow-hidden border-none relative bg-gradient-to-br from-teal-600 to-cyan-700 dark:from-teal-700 dark:to-cyan-800 text-primary-foreground rounded-xl", className)}>
             <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }}></div>
            <div className="relative z-10">{children}</div>
         </Card>
     );

     return (
         <TooltipProvider>
              <div className="space-y-5 p-4"> 

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
                          <div className="flex flex-col items-center justify-center text-center p-3 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20">
                              <Label className="text-[10px] uppercase tracking-wider text-primary-foreground/70 mb-1 font-medium">Hoje</Label>
                              {data.todayStatus === 'evaluated' && <CheckCircle className="h-7 w-7 text-emerald-300 mb-0.5" />}
                              {data.todayStatus === 'pending' && <Loader2 className="h-7 w-7 text-yellow-300 animate-spin mb-0.5" />}
                              {data.todayStatus === 'no_tasks' && <CalendarCheck className="h-7 w-7 text-primary-foreground/60 mb-0.5" />}
                              <Badge variant={data.todayStatus === 'evaluated' ? 'default' : data.todayStatus === 'pending' ? 'secondary' : 'outline'} className={cn("text-[9px] px-1.5 py-0.5 leading-tight", data.todayStatus === 'evaluated' && 'bg-emerald-500 text-white border-emerald-400', data.todayStatus === 'pending' && 'bg-yellow-400 text-yellow-900 border-yellow-300', data.todayStatus === 'no_tasks' && 'bg-white/10 text-primary-foreground/80 border-white/20')}>
                                {data.todayStatus === 'evaluated' ? 'Avaliado' : data.todayStatus === 'pending' ? 'Pendente' : 'Sem Tarefas'}
                             </Badge>
                          </div>

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
                                R$ {data.projectedBonus.toFixed(2)}
                            </span>
                         </div>
                     </CardContent>
                      <CardFooter className="bg-black/10 px-4 py-2">
                         <Link href="/colaborador/avaliacoes" passHref className='w-full'>
                            <Button variant="link" size="sm" className="w-full text-xs text-primary-foreground/90 hover:text-primary-foreground justify-center">Ver Histórico de Avaliações</Button>
                        </Link>
                     </CardFooter>
                 </IllustrationCard>

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
                                              <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" /> Termina em: {challenge.periodEndDate && isValid(parseISO(challenge.periodEndDate)) ? format(parseISO(challenge.periodEndDate), 'dd/MM/yy') : 'N/A'}</span>
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


    