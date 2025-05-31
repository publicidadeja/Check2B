
 'use client';

 import * as React from 'react';
 import {
   Calendar as CalendarIcon,
   ChevronLeft,
   ChevronRight,
   CheckCircle,
   XCircle,
   FileText,
   MessageSquare,
   Loader2,
   Info,
   Frown, // Icon for no data
 } from 'lucide-react';
 import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, subMonths, addMonths, isValid } from 'date-fns';
 import { ptBR } from 'date-fns/locale';

 import { Button } from '@/components/ui/button';
 import {
   Card,
   CardContent,
   CardDescription,
   CardHeader,
   CardTitle,
   CardFooter,
 } from '@/components/ui/card';
 import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogHeader,
   DialogTitle,
   DialogClose,
   DialogFooter, 
 } from '@/components/ui/dialog';
 import { ScrollArea } from '@/components/ui/scroll-area';
 import { Badge } from '@/components/ui/badge';
 import { useToast } from '@/hooks/use-toast';
 import { cn } from '@/lib/utils';
 import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
 import { LoadingSpinner } from '@/components/ui/loading-spinner';
 import { useAuth } from '@/hooks/use-auth';
 import type { Evaluation } from '@/types/evaluation';
 import type { Task } from '@/types/task';
 import { getEvaluationsForEmployeeInPeriod } from '@/lib/evaluation-service';
 import { getAllTasksForOrganization } from '@/lib/task-service';


 interface DayEvaluationSummary {
     date: Date;
     score: number; 
     details?: Evaluation[];
 }

 export default function EmployeeEvaluationsPage() {
     const { user, organizationId, isLoading: authIsLoading } = useAuth();
     const [currentMonth, setCurrentMonth] = React.useState(new Date());
     const [evaluations, setEvaluations] = React.useState<DayEvaluationSummary[]>([]);
     const [allOrgTasks, setAllOrgTasks] = React.useState<Task[]>([]);
     const [selectedDayDetails, setSelectedDayDetails] = React.useState<DayEvaluationSummary | null>(null);
     const [isModalOpen, setIsModalOpen] = React.useState(false);
     const [isLoading, setIsLoading] = React.useState(true);
     const { toast } = useToast();

     const CURRENT_EMPLOYEE_ID = user?.uid;

     React.useEffect(() => {
         const loadData = async () => {
             if (!CURRENT_EMPLOYEE_ID || !organizationId || authIsLoading) {
                 if (!authIsLoading && (!CURRENT_EMPLOYEE_ID || !organizationId)) setIsLoading(false);
                 return;
             }
             setIsLoading(true);
             setSelectedDayDetails(null); 
             try {
                 const startDateString = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
                 const endDateString = format(endOfMonth(currentMonth), 'yyyy-MM-dd');

                 const [employeeEvaluations, orgTasks] = await Promise.all([
                     getEvaluationsForEmployeeInPeriod(organizationId, CURRENT_EMPLOYEE_ID, startDateString, endDateString),
                     getAllTasksForOrganization(organizationId)
                 ]);
                 setAllOrgTasks(orgTasks);

                 const daysInMonth = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });
                 const today = new Date();

                 const summaries: DayEvaluationSummary[] = daysInMonth.map(day => {
                     if (day > today && !isSameDay(day,today)) { // Allow today even if no evals yet
                         return { date: day, score: -1 };
                     }
                     const dayStr = format(day, 'yyyy-MM-dd');
                     const evaluationsForDay = employeeEvaluations.filter(e => e.evaluationDate === dayStr);

                     if (evaluationsForDay.length === 0) {
                         return { date: day, score: -1 };
                     }
                     const hasZero = evaluationsForDay.some(e => e.score === 0);
                     return { date: day, score: hasZero ? 0 : 10, details: evaluationsForDay };
                 });
                 setEvaluations(summaries);

             } catch (error) {
                 console.error("Erro ao carregar avaliações ou tarefas:", error);
                 toast({
                     title: "Erro ao Carregar Dados",
                     description: "Não foi possível carregar o histórico de avaliações ou tarefas.",
                     variant: "destructive",
                 });
             } finally {
                 setIsLoading(false);
             }
         };
         loadData();
     }, [currentMonth, CURRENT_EMPLOYEE_ID, organizationId, authIsLoading, toast]);

     const getTaskDetails = (taskId: string): Task | undefined => {
         return allOrgTasks.find(task => task.id === taskId);
     }

     const handleDayClick = (daySummary: DayEvaluationSummary) => {
         if (daySummary.score !== -1 && daySummary.details && daySummary.details.length > 0) {
             setSelectedDayDetails(daySummary);
             setIsModalOpen(true);
         } else {
              toast({ title: "Sem Avaliação", description: `Nenhuma avaliação registrada para ${format(daySummary.date, 'dd/MM/yyyy', { locale: ptBR })}.`, duration: 2500 });
         }
     };

     const goToPreviousMonth = () => {
         setCurrentMonth(subMonths(currentMonth, 1));
     };

     const goToNextMonth = () => {
          const nextMonthStart = startOfMonth(addMonths(currentMonth, 1));
         if (nextMonthStart <= startOfMonth(new Date())) {
             setCurrentMonth(nextMonthStart);
         }
     };

     const isFutureMonth = startOfMonth(addMonths(currentMonth, 1)) > startOfMonth(new Date());

     const getMonthGrid = (monthSummaries: DayEvaluationSummary[]): (DayEvaluationSummary | null)[] => {
         if (!monthSummaries || monthSummaries.length === 0 && !isLoading) {
             const firstDayOfMonth = startOfMonth(currentMonth);
             const daysInMonthCount = endOfMonth(currentMonth).getDate();
             const startingDayOfWeek = firstDayOfMonth.getDay();
             const grid: (DayEvaluationSummary | null)[] = Array(startingDayOfWeek).fill(null);
             for(let i=1; i<=daysInMonthCount; i++){
                 grid.push({ date: new Date(firstDayOfMonth.getFullYear(), firstDayOfMonth.getMonth(), i), score: -1 });
             }
             while (grid.length % 7 !== 0) grid.push(null);
             return grid;
         }
         if (monthSummaries.length === 0 && isLoading) { // Still loading, create empty grid
            const firstDayOfMonth = startOfMonth(currentMonth);
            const daysInMonthCount = endOfMonth(currentMonth).getDate();
            const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 (Sun) to 6 (Sat)
            const grid: (DayEvaluationSummary | null)[] = [];
            for (let i = 0; i < startingDayOfWeek; i++) grid.push(null);
            for(let i=1; i<=daysInMonthCount; i++) grid.push(null); // Fill with nulls for loading
            while (grid.length % 7 !== 0) grid.push(null);
            return grid;
        }


         const firstDayOfMonth = startOfMonth(monthSummaries[0].date);
         const startingDayOfWeek = firstDayOfMonth.getDay(); 
         const grid: (DayEvaluationSummary | null)[] = [];

         for (let i = 0; i < startingDayOfWeek; i++) {
             grid.push(null);
         }

         const summaryMap = new Map(monthSummaries.map(s => [format(s.date, 'yyyy-MM-dd'), s]));
         const daysInMonthCount = endOfMonth(firstDayOfMonth).getDate();
         for(let i=1; i<=daysInMonthCount; i++){
             const currentDate = new Date(firstDayOfMonth.getFullYear(), firstDayOfMonth.getMonth(), i);
             const dateStr = format(currentDate, 'yyyy-MM-dd');
             grid.push(summaryMap.get(dateStr) || { date: currentDate, score: -1 }); 
         }

         while (grid.length % 7 !== 0) {
             grid.push(null);
         }
         return grid;
     };


     const monthGrid = getMonthGrid(evaluations);
     
     if (authIsLoading) {
        return <div className="flex justify-center items-center h-full py-20"><LoadingSpinner text="Autenticando..." /></div>;
    }

    if (!CURRENT_EMPLOYEE_ID || !organizationId) {
        return (
            <Card className="m-4 p-4 text-center">
                <CardHeader><CardTitle>Acesso Negado</CardTitle></CardHeader>
                <CardContent>
                    <p className="text-destructive">Informações de usuário ou organização não encontradas. Por favor, faça login novamente.</p>
                    <Button asChild className="mt-4" onClick={() => router.push('/login')}><a>Fazer Login</a></Button>
                </CardContent>
            </Card>
        );
    }


     return (
         <TooltipProvider>
             <div className="space-y-4 p-4"> 
                 <Card className="shadow-sm">
                     <CardHeader className="p-3">
                         <div className="flex items-center justify-between gap-2">
                             <Button variant="ghost" size="icon" onClick={goToPreviousMonth} aria-label="Mês anterior" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                                 <ChevronLeft className="h-5 w-5" />
                             </Button>
                             <h2 className="text-lg font-semibold text-center capitalize flex-1">
                                 {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
                             </h2>
                             <Button variant="ghost" size="icon" onClick={goToNextMonth} disabled={isFutureMonth} aria-label="Próximo mês" className="h-8 w-8 text-muted-foreground hover:text-foreground disabled:text-muted-foreground/50">
                                 <ChevronRight className="h-5 w-5" />
                             </Button>
                         </div>
                     </CardHeader>
                 </Card>

                 <Card className="flex-grow shadow-sm">
                      <CardContent className="p-2">
                         {isLoading ? (
                             <div className="flex justify-center items-center h-60">
                                 <LoadingSpinner text="Carregando avaliações..." />
                             </div>
                         ) : (
                            <>
                                <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground pb-1 border-b mb-1">
                                     {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
                                        <div key={day} className="p-1">{day}</div>
                                    ))}
                                </div>
                                <div className="grid grid-cols-7 gap-1">
                                     {monthGrid.map((daySummary, index) => (
                                        <div key={index} className="relative aspect-square"> 
                                            {daySummary ? (
                                                <Tooltip delayDuration={200}>
                                                    <TooltipTrigger asChild>
                                                        <button
                                                            onClick={() => handleDayClick(daySummary)}
                                                            disabled={daySummary.score === -1 || (daySummary.date > new Date() && !isSameDay(daySummary.date, new Date()))}
                                                            className={cn(
                                                                "absolute inset-0 flex flex-col items-center justify-center rounded-md border text-xs font-medium transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed",
                                                                "bg-background hover:bg-muted/50",
                                                                daySummary.score === 10 && "bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-800/50 hover:bg-green-200 dark:hover:bg-green-800/50",
                                                                daySummary.score === 0 && "bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-800/50 hover:bg-red-200 dark:hover:bg-red-800/50",
                                                                daySummary.score === -1 && "bg-muted/20 border-dashed border-muted-foreground/30 text-muted-foreground",
                                                                isSameDay(daySummary.date, new Date()) && "ring-2 ring-primary ring-offset-background",
                                                                daySummary.date > new Date() && !isSameDay(daySummary.date, new Date()) && "bg-muted/10 border-muted-foreground/10 text-muted-foreground/40"
                                                            )}
                                                        >
                                                            <span className="mb-0.5">{format(daySummary.date, 'd')}</span>
                                                            {daySummary.score === 10 && <CheckCircle className="h-3 w-3 text-green-600 dark:text-green-400" />}
                                                            {daySummary.score === 0 && <XCircle className="h-3 w-3 text-red-600 dark:text-red-400" />}
                                                        </button>
                                                    </TooltipTrigger>
                                                    <TooltipContent className="text-xs p-1">
                                                         <p className='font-semibold'>{format(daySummary.date, 'PPP', { locale: ptBR })}</p>
                                                        {daySummary.score === 10 && <p className='text-green-600'>Desempenho: OK</p>}
                                                        {daySummary.score === 0 && <p className='text-red-600'>Desempenho: Atenção</p>}
                                                        {daySummary.score === -1 && daySummary.date <= new Date() && <p className='text-muted-foreground'>Sem Avaliação Registrada</p>}
                                                        {daySummary.date > new Date() && <p className='text-muted-foreground'>Data Futura</p>}
                                                    </TooltipContent>
                                                </Tooltip>
                                            ) : (
                                                <div className="absolute inset-0"></div> 
                                            )}
                                        </div>
                                     ))}
                                </div>
                            </>
                         )}
                     </CardContent>
                     <CardFooter className="p-2 text-xs text-muted-foreground flex flex-wrap justify-center gap-x-3 gap-y-1 border-t mt-1">
                         <span className="flex items-center gap-1"><CheckCircle className="h-3 w-3 text-green-500"/> OK</span>
                         <span className="flex items-center gap-1"><XCircle className="h-3 w-3 text-red-500"/> Atenção</span>
                         <span className="flex items-center gap-1"><div className="h-3 w-3 rounded-sm bg-muted/20 border border-dashed border-muted-foreground/30"></div> Sem Avaliação</span>
                     </CardFooter>
                 </Card>

                 <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                     <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col"> 
                         <DialogHeader>
                             <DialogTitle className="text-lg">Detalhes da Avaliação</DialogTitle>
                             <DialogDescription>
                                 {selectedDayDetails ? format(selectedDayDetails.date, 'PPP', { locale: ptBR }) : ''}
                             </DialogDescription>
                         </DialogHeader>
                         <ScrollArea className="flex-grow pr-4 -mr-4 my-2">
                             <div className="space-y-3">
                                 {selectedDayDetails?.details?.map((evaluation) => {
                                     const task = getTaskDetails(evaluation.taskId);
                                     return (
                                         <div key={evaluation.id} className="border p-3 rounded-lg bg-card shadow-sm">
                                             <div className="flex justify-between items-start mb-1.5">
                                                 <span className="font-semibold text-sm flex-1 mr-2">{task?.title || 'Tarefa Desconhecida'}</span>
                                                 {evaluation.score === 10 ? (
                                                     <Badge variant="default" className="bg-green-100 text-green-800 border border-green-200 text-xs whitespace-nowrap">Nota 10</Badge>
                                                 ) : (
                                                     <Badge variant="destructive" className="bg-red-100 text-red-800 border border-red-200 text-xs whitespace-nowrap">Nota 0</Badge>
                                                 )}
                                             </div>

                                             {task?.criteria && (
                                                 <div className="mb-2 text-xs text-muted-foreground border-l-2 pl-2 border-border italic">
                                                     <p><strong>Critério (Nota 10):</strong> {task.criteria}</p>
                                                 </div>
                                             )}

                                             {evaluation.justification && (
                                                 <div className="mt-2 p-2 bg-muted/50 rounded text-xs border border-muted">
                                                     <p className="font-medium flex items-center gap-1 mb-0.5"><MessageSquare className="h-3 w-3" /> Justificativa:</p>
                                                     <p className="text-muted-foreground pl-1">{evaluation.justification}</p>
                                                 </div>
                                             )}

                                             {evaluation.evidenceUrl && (
                                                 <div className="mt-2">
                                                     <Button asChild variant="link" size="sm" className="p-0 h-auto text-accent text-xs">
                                                         <a href={evaluation.evidenceUrl} target="_blank" rel="noopener noreferrer"><FileText className="mr-1 h-3 w-3"/> Ver Evidência</a>
                                                     </Button>
                                                 </div>
                                             )}
                                         </div>
                                     );
                                 })}
                                 {(!selectedDayDetails || !selectedDayDetails.details || selectedDayDetails.details.length === 0) && (
                                      <div className="text-center py-10 text-muted-foreground">
                                         <Frown className="h-8 w-8 mx-auto mb-2" />
                                         <p>Nenhum detalhe de tarefa encontrado para esta avaliação.</p>
                                     </div>
                                 )}
                             </div>
                         </ScrollArea>
                         <DialogFooter className="mt-auto pt-4 border-t">
                             <DialogClose asChild>
                                 <Button type="button" variant="secondary" className="w-full">Fechar</Button>
                             </DialogClose>
                         </DialogFooter>
                     </DialogContent>
                 </Dialog>
             </div>
         </TooltipProvider>
     );
 }

