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
 import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, subMonths, addMonths } from 'date-fns';
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
   DialogFooter, // Added DialogFooter
 } from '@/components/ui/dialog';
 import { ScrollArea } from '@/components/ui/scroll-area';
 import { Separator } from '@/components/ui/separator';
 import { Badge } from '@/components/ui/badge'; // Ensure Badge is imported
 import { useToast } from '@/hooks/use-toast';
 import { cn } from '@/lib/utils';
 import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

 // Import types
 import type { Evaluation } from '@/types/evaluation';
 import type { Task } from '@/types/task';

 // Mock Employee ID
 const CURRENT_EMPLOYEE_ID = '1'; // Alice Silva

 // --- Mock Data & Fetching ---
 import { mockTasks as allAdminTasks } from '@/app/tasks/page'; // Reuse tasks

 // Simplified mock evaluations generation for demo
 const generateMockEvaluations = (employeeId: string, monthsBack: number = 2): Evaluation[] => {
    const evals: Evaluation[] = [];
    const today = new Date();
    for (let m = 0; m <= monthsBack; m++) {
        const monthToProcess = subMonths(today, m);
        const start = startOfMonth(monthToProcess);
        const end = m === 0 ? today : endOfMonth(monthToProcess);

        let days = [];
         if(start <= end) {
            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                // Only include weekdays for this mock example
                // if (d.getDay() !== 0 && d.getDay() !== 6) {
                     days.push(new Date(d));
                // }
            }
        }

        days.forEach(day => {
            // Simple check: Assume 2 tasks per day for mock employee '1'
            const tasksForDay = allAdminTasks.filter(t => ['t1', 't6'].includes(t.id) && employeeId === '1');

            if (tasksForDay.length > 0) {
                tasksForDay.forEach(task => {
                    // Don't evaluate future dates
                    if (day > today) return;

                    const score = Math.random() > 0.15 ? 10 : 0; // 15% chance of 0
                    evals.push({
                        id: `eval${employeeId}-${task.id}-${format(day, 'yyyy-MM-dd')}`,
                        employeeId: employeeId,
                        taskId: task.id,
                        evaluationDate: format(day, 'yyyy-MM-dd'),
                        score: score,
                        justification: score === 0 ? `Item não concluído (${task.title}). Verifique os anexos.` : `Tarefa realizada conforme esperado (${task.title}).`,
                        evaluatorId: 'admin1',
                        isDraft: false,
                    });
                });
            }
        });
    }
    return evals;
 };

 const mockEvaluations = generateMockEvaluations(CURRENT_EMPLOYEE_ID, 3);


 interface DayEvaluationSummary {
     date: Date;
     score: number; // 0 if any task got 0, 10 if all tasks got 10, -1 if no evaluations/not applicable day
     details?: Evaluation[];
 }

 // Mock fetching function for evaluations in a given month
 const fetchEvaluationsForMonth = async (employeeId: string, month: Date): Promise<DayEvaluationSummary[]> => {
     await new Promise(resolve => setTimeout(resolve, 300)); // Shorter delay

     const start = startOfMonth(month);
     const end = endOfMonth(month);
     const daysInMonth = eachDayOfInterval({ start, end });
     const today = new Date();

     const summaries: DayEvaluationSummary[] = daysInMonth.map(day => {
         // Don't show data for future dates
         if (day > today) {
             return { date: day, score: -1 };
         }

         const dayStr = format(day, 'yyyy-MM-dd');
         const evaluationsForDay = mockEvaluations.filter(e =>
             e.employeeId === employeeId && e.evaluationDate === dayStr
         );

         if (evaluationsForDay.length === 0) {
            // Simulate no evaluation recorded for past/present dates without records
            return { date: day, score: -1 };
         }

         const hasZero = evaluationsForDay.some(e => e.score === 0);
         const score = hasZero ? 0 : 10;

         return { date: day, score, details: evaluationsForDay };
     });

     return summaries;
 };

 // Helper to get task details
 const getTaskDetails = (taskId: string): Task | undefined => {
     return allAdminTasks.find(task => task.id === taskId);
 }

 export default function EmployeeEvaluationsPage() {
     const [currentMonth, setCurrentMonth] = React.useState(new Date());
     const [evaluations, setEvaluations] = React.useState<DayEvaluationSummary[]>([]);
     const [selectedDayDetails, setSelectedDayDetails] = React.useState<DayEvaluationSummary | null>(null);
     const [isModalOpen, setIsModalOpen] = React.useState(false);
     const [isLoading, setIsLoading] = React.useState(true);
     const { toast } = useToast();

     React.useEffect(() => {
         const loadEvaluations = async () => {
             setIsLoading(true);
             setSelectedDayDetails(null); // Close modal when month changes
             try {
                 const data = await fetchEvaluationsForMonth(CURRENT_EMPLOYEE_ID, currentMonth);
                 setEvaluations(data);
             } catch (error) {
                 console.error("Erro ao carregar avaliações:", error);
                 toast({
                     title: "Erro ao Carregar",
                     description: "Não foi possível carregar o histórico de avaliações.",
                     variant: "destructive",
                 });
             } finally {
                 setIsLoading(false);
             }
         };
         loadEvaluations();
     }, [currentMonth, toast]);

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
         // Prevent going into the future beyond the current month
         if (nextMonthStart <= startOfMonth(new Date())) {
             setCurrentMonth(nextMonthStart);
         }
     };

     const isFutureMonth = startOfMonth(addMonths(currentMonth, 1)) > startOfMonth(new Date());

     // Get month grid data including placeholder days
     const getMonthGrid = (monthSummaries: DayEvaluationSummary[]): (DayEvaluationSummary | null)[] => {
         if (!monthSummaries || monthSummaries.length === 0) {
             // If loading or no data for the month, still need grid structure
             const firstDayOfMonth = startOfMonth(currentMonth);
             const daysInMonthCount = endOfMonth(currentMonth).getDate();
             const startingDayOfWeek = firstDayOfMonth.getDay();
             const grid: (DayEvaluationSummary | null)[] = Array(startingDayOfWeek).fill(null);
             for(let i=1; i<=daysInMonthCount; i++){
                 grid.push(null); // Fill with null initially
             }
             while (grid.length % 7 !== 0) grid.push(null); // Ensure full weeks
             return grid;
         }

         const firstDayOfMonth = startOfMonth(monthSummaries[0].date);
         const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 (Sun) to 6 (Sat)
         const grid: (DayEvaluationSummary | null)[] = [];

         // Add nulls for days before the start of the month
         for (let i = 0; i < startingDayOfWeek; i++) {
             grid.push(null);
         }

          // Add the actual days
          // Create a map for quick lookup
         const summaryMap = new Map(monthSummaries.map(s => [format(s.date, 'yyyy-MM-dd'), s]));
         const daysInMonthCount = endOfMonth(firstDayOfMonth).getDate();
         for(let i=1; i<=daysInMonthCount; i++){
             const currentDate = new Date(firstDayOfMonth.getFullYear(), firstDayOfMonth.getMonth(), i);
             const dateStr = format(currentDate, 'yyyy-MM-dd');
             grid.push(summaryMap.get(dateStr) || { date: currentDate, score: -1 }); // Use summary or default empty state
         }

         // Add nulls to fill the remaining grid for full weeks display
         while (grid.length % 7 !== 0) {
             grid.push(null);
         }
         return grid;
     };


     const monthGrid = getMonthGrid(evaluations);


     return (
         <TooltipProvider>
             <div className="space-y-4">
                 {/* Header Card for Navigation */}
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

                 {/* Calendar Card */}
                 <Card className="flex-grow shadow-sm">
                      <CardContent className="p-2">
                         {isLoading ? (
                             <div className="flex justify-center items-center h-60">
                                 <Loader2 className="h-10 w-10 animate-spin text-primary" />
                             </div>
                         ) : (
                            <>
                                {/* Calendar Header (Days of Week) */}
                                <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground pb-1 border-b mb-1">
                                     {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
                                        <div key={day} className="p-1">{day}</div>
                                    ))}
                                </div>
                                {/* Calendar Days Grid */}
                                <div className="grid grid-cols-7 gap-1">
                                     {monthGrid.map((daySummary, index) => (
                                        <div key={index} className="relative aspect-square"> {/* Maintain square aspect ratio */}
                                            {daySummary ? (
                                                <Tooltip delayDuration={200}>
                                                    <TooltipTrigger asChild>
                                                        <button
                                                            onClick={() => handleDayClick(daySummary)}
                                                            // Disable clicking on future dates or days without evaluations
                                                            disabled={daySummary.score === -1 || daySummary.date > new Date()}
                                                            className={cn(
                                                                "absolute inset-0 flex flex-col items-center justify-center rounded-md border text-xs font-medium transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed",
                                                                // Base styles
                                                                "bg-background hover:bg-muted/50",
                                                                // Score specific styles
                                                                daySummary.score === 10 && "bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-800/50 hover:bg-green-200 dark:hover:bg-green-800/50",
                                                                daySummary.score === 0 && "bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-800/50 hover:bg-red-200 dark:hover:bg-red-800/50",
                                                                daySummary.score === -1 && "bg-muted/20 border-dashed border-muted-foreground/30 text-muted-foreground",
                                                                // Today's date highlight
                                                                isSameDay(daySummary.date, new Date()) && "ring-2 ring-primary ring-offset-background",
                                                                // Disabled state for future dates
                                                                daySummary.date > new Date() && "bg-muted/10 border-muted-foreground/10 text-muted-foreground/40"
                                                            )}
                                                        >
                                                            <span className="mb-0.5">{format(daySummary.date, 'd')}</span>
                                                             {/* Icons within the button */}
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
                                                <div className="absolute inset-0"></div> // Placeholder for empty grid cells
                                            )}
                                        </div>
                                     ))}
                                </div>
                            </>
                         )}
                     </CardContent>
                     {/* Footer Legend */}
                     <CardFooter className="p-2 text-xs text-muted-foreground flex flex-wrap justify-center gap-x-3 gap-y-1 border-t mt-1">
                         <span className="flex items-center gap-1"><CheckCircle className="h-3 w-3 text-green-500"/> OK</span>
                         <span className="flex items-center gap-1"><XCircle className="h-3 w-3 text-red-500"/> Atenção</span>
                         <span className="flex items-center gap-1"><div className="h-3 w-3 rounded-sm bg-muted/20 border border-dashed border-muted-foreground/30"></div> Sem Avaliação</span>
                     </CardFooter>
                 </Card>

                 {/* Evaluation Details Modal - Improved Styling */}
                 <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                     <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col"> {/* Limit height */}
                         <DialogHeader>
                             <DialogTitle className="text-lg">Detalhes da Avaliação</DialogTitle>
                             <DialogDescription>
                                 {selectedDayDetails ? format(selectedDayDetails.date, 'PPP', { locale: ptBR }) : ''}
                             </DialogDescription>
                         </DialogHeader>
                         {/* Scrollable content area */}
                         <ScrollArea className="flex-grow pr-4 -mr-4 my-2">
                             <div className="space-y-3">
                                 {selectedDayDetails?.details?.map((evaluation) => {
                                     const task = getTaskDetails(evaluation.taskId);
                                     return (
                                         <div key={evaluation.id} className="border p-3 rounded-lg bg-card shadow-sm">
                                             {/* Task Title and Score */}
                                             <div className="flex justify-between items-start mb-1.5">
                                                 <span className="font-semibold text-sm flex-1 mr-2">{task?.title || 'Tarefa Desconhecida'}</span>
                                                 {evaluation.score === 10 ? (
                                                     <Badge variant="default" className="bg-green-100 text-green-800 border border-green-200 text-xs whitespace-nowrap">Nota 10</Badge>
                                                 ) : (
                                                     <Badge variant="destructive" className="bg-red-100 text-red-800 border border-red-200 text-xs whitespace-nowrap">Nota 0</Badge>
                                                 )}
                                             </div>

                                             {/* Criteria */}
                                             {task?.criteria && (
                                                 <div className="mb-2 text-xs text-muted-foreground border-l-2 pl-2 border-border italic">
                                                     <p><strong>Critério (Nota 10):</strong> {task.criteria}</p>
                                                 </div>
                                             )}

                                             {/* Justification */}
                                             {evaluation.justification && (
                                                 <div className="mt-2 p-2 bg-muted/50 rounded text-xs border border-muted">
                                                     <p className="font-medium flex items-center gap-1 mb-0.5"><MessageSquare className="h-3 w-3" /> Justificativa:</p>
                                                     <p className="text-muted-foreground pl-1">{evaluation.justification}</p>
                                                 </div>
                                             )}

                                             {/* Evidence Link (Simulated) */}
                                             {evaluation.evidenceUrl && (
                                                 <div className="mt-2">
                                                     <Button variant="link" size="sm" className="p-0 h-auto text-accent text-xs" onClick={() => toast({title: "Visualizar Evidência", description: "Funcionalidade ainda não implementada."})}>
                                                         <FileText className="mr-1 h-3 w-3"/> Ver Evidência (Simulado)
                                                     </Button>
                                                 </div>
                                             )}
                                         </div>
                                     );
                                 })}
                                 {/* Handle case where day was evaluated but somehow no details are present */}
                                 {(!selectedDayDetails || !selectedDayDetails.details || selectedDayDetails.details.length === 0) && (
                                      <div className="text-center py-10 text-muted-foreground">
                                         <Frown className="h-8 w-8 mx-auto mb-2" />
                                         <p>Nenhum detalhe de tarefa encontrado para esta avaliação.</p>
                                     </div>
                                 )}
                             </div>
                         </ScrollArea>
                          {/* Modal Footer */}
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
