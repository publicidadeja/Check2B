
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
 } from '@/components/ui/dialog';
 import { ScrollArea } from '@/components/ui/scroll-area';
 import { Separator } from '@/components/ui/separator';
 import { Badge } from '@/components/ui/badge';
 import { useToast } from '@/hooks/use-toast';
 import { cn } from '@/lib/utils';
 import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
 // Removed EmployeeLayout import

 // Import types
 import type { Evaluation } from '@/types/evaluation';
 import type { Task } from '@/types/task';

 // Mock Employee ID
 const CURRENT_EMPLOYEE_ID = '1'; // Alice Silva

 // --- Mock Data & Fetching ---
 import { mockTasks as allAdminTasks } from '@/app/tasks/page'; // Reuse tasks

 // Enhanced mock evaluations
 const generateMockEvaluations = (employeeId: string, monthsBack: number = 2): Evaluation[] => {
    const evals: Evaluation[] = [];
    const today = new Date();
    for (let m = 0; m <= monthsBack; m++) {
        const monthToProcess = subMonths(today, m);
        const start = startOfMonth(monthToProcess);
        const end = m === 0 ? today : endOfMonth(monthToProcess); // Only go up to today for current month
        const days = eachDayOfInterval({ start, end });

        days.forEach(day => {
            // Simulate getting tasks for this employee on this day
            const tasksForDay = allAdminTasks.filter(task => {
                 // Simple daily check for demo
                 if(task.periodicity === 'daily' && (task.assignedTo === 'individual' && task.assignedEntityId === employeeId || task.assignedTo === 'role' && employeeId === '1' /* Alice is Recruiter */)) {
                     return true;
                 }
                 if (task.id === 't6' && day.getDay() === 5 && employeeId === '1') return true; // Alice gets weekly report task on Friday
                 return false;
            });

            if (tasksForDay.length > 0) {
                let dayHasZero = false;
                tasksForDay.forEach(task => {
                    const score = Math.random() > 0.15 ? 10 : 0; // 15% chance of getting 0
                    if (score === 0) dayHasZero = true;
                    evals.push({
                        id: `eval${employeeId}-${task.id}-${format(day, 'yyyy-MM-dd')}`,
                        employeeId: employeeId,
                        taskId: task.id,
                        evaluationDate: format(day, 'yyyy-MM-dd'),
                        score: score,
                        justification: score === 0 ? `Item não concluído conforme esperado (${task.title}).` : undefined,
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
     await new Promise(resolve => setTimeout(resolve, 400)); // Simulate delay

     const start = startOfMonth(month);
     const end = endOfMonth(month);
     const daysInMonth = eachDayOfInterval({ start, end });

     const summaries: DayEvaluationSummary[] = daysInMonth.map(day => {
         const dayStr = format(day, 'yyyy-MM-dd');
         const evaluationsForDay = mockEvaluations.filter(e =>
             e.employeeId === employeeId && e.evaluationDate === dayStr
         );

         if (evaluationsForDay.length === 0) {
            // Check if tasks *should* exist for this day (optional, adds complexity)
            // For simplicity, assume -1 means no data recorded for that day
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
             setSelectedDayDetails(null);
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
         if (daySummary.score !== -1) {
             setSelectedDayDetails(daySummary);
             setIsModalOpen(true);
         } else {
              toast({ title: "Sem Avaliação", description: `Nenhuma avaliação registrada para ${format(daySummary.date, 'dd/MM/yyyy', { locale: ptBR })}.`, duration: 2000 });
         }
     };

     const goToPreviousMonth = () => {
         setCurrentMonth(subMonths(currentMonth, 1));
     };

     const goToNextMonth = () => {
         if (startOfMonth(addMonths(currentMonth, 1)) <= startOfMonth(new Date())) {
             setCurrentMonth(addMonths(currentMonth, 1));
         }
     };

     const isFutureMonth = startOfMonth(addMonths(currentMonth, 1)) > startOfMonth(new Date());

     // Get month grid data including placeholder days
     const getMonthGrid = (monthSummaries: DayEvaluationSummary[]): (DayEvaluationSummary | null)[] => {
         if (!monthSummaries || monthSummaries.length === 0) return Array(35).fill(null); // Placeholder for loading/empty

         const firstDayOfMonth = startOfMonth(monthSummaries[0].date);
         const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 (Sun) to 6 (Sat)

         const grid: (DayEvaluationSummary | null)[] = [];
         // Add nulls for days before the start of the month
         for (let i = 0; i < startingDayOfWeek; i++) {
             grid.push(null);
         }
         // Add the actual days
         grid.push(...monthSummaries);
         // Add nulls to fill the remaining grid (optional, adjust as needed)
         while (grid.length < 35) { // Assuming max 5 weeks display
             grid.push(null);
         }
         return grid.slice(0, 35); // Ensure max length
     };

     const monthGrid = getMonthGrid(evaluations);


     return (
         // EmployeeLayout is applied by group layout
         <TooltipProvider>
             <div className="space-y-4"> {/* Reduced spacing */}
                 {/* Header Card for Navigation */}
                 <Card className="shadow-sm">
                     <CardHeader className="p-3">
                         <div className="flex items-center justify-between gap-2">
                             <Button variant="outline" size="icon" onClick={goToPreviousMonth} aria-label="Mês anterior" className="h-8 w-8">
                                 <ChevronLeft className="h-4 w-4" />
                             </Button>
                             <h2 className="text-base font-semibold text-center capitalize"> {/* Adjusted text size */}
                                 {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
                             </h2>
                             <Button variant="outline" size="icon" onClick={goToNextMonth} disabled={isFutureMonth} aria-label="Próximo mês" className="h-8 w-8">
                                 <ChevronRight className="h-4 w-4" />
                             </Button>
                         </div>
                     </CardHeader>
                 </Card>

                 {/* Calendar Card */}
                 <Card className="flex-grow">
                      <CardContent className="p-2"> {/* Reduced padding */}
                         {isLoading ? (
                             <div className="flex justify-center items-center h-60">
                                 <Loader2 className="h-12 w-12 animate-spin text-primary" />
                             </div>
                         ) : (
                             <div className="grid grid-cols-7 gap-1 text-center text-xs">
                                 {/* Calendar Header */}
                                 {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, index) => ( // Abbreviated days
                                     <div key={index} className="font-semibold text-muted-foreground p-1 text-[10px]">{day}</div>
                                 ))}
                                 {/* Calendar Days */}
                                 {monthGrid.map((daySummary, index) => (
                                     <div key={index} className="relative aspect-square"> {/* Maintain square aspect ratio */}
                                        {daySummary ? (
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <button
                                                        onClick={() => handleDayClick(daySummary)}
                                                        disabled={daySummary.score === -1}
                                                        className={cn(
                                                            "absolute inset-0 flex items-center justify-center rounded-md border text-xs transition-colors focus:outline-none focus:ring-1 focus:ring-ring focus:ring-offset-1",
                                                            daySummary.score === 10 && "bg-green-100 dark:bg-green-900/50 border-green-200 dark:border-green-800 hover:bg-green-200 dark:hover:bg-green-800/60",
                                                            daySummary.score === 0 && "bg-red-100 dark:bg-red-900/50 border-red-200 dark:border-red-800 hover:bg-red-200 dark:hover:bg-red-800/60",
                                                            daySummary.score === -1 && "bg-muted/30 border-dashed text-muted-foreground cursor-not-allowed opacity-70",
                                                            isSameDay(daySummary.date, new Date()) && "ring-2 ring-primary font-bold" // Highlight today
                                                        )}
                                                    >
                                                        <span>{format(daySummary.date, 'd')}</span>
                                                        {daySummary.score === 10 && <CheckCircle className="absolute top-0.5 right-0.5 h-2 w-2 text-green-600 dark:text-green-400" />}
                                                        {daySummary.score === 0 && <XCircle className="absolute top-0.5 right-0.5 h-2 w-2 text-red-600 dark:text-red-400" />}
                                                    </button>
                                                </TooltipTrigger>
                                                 <TooltipContent className="text-xs">
                                                     {daySummary.score === 10 && <p>Desempenho: OK</p>}
                                                     {daySummary.score === 0 && <p>Desempenho: Atenção</p>}
                                                     {daySummary.score === -1 && <p>Sem Avaliação</p>}
                                                     <p>{format(daySummary.date, 'PPP', { locale: ptBR })}</p>
                                                 </TooltipContent>
                                            </Tooltip>
                                        ) : (
                                             <div className="absolute inset-0"></div> // Placeholder for empty grid cells
                                        )}
                                     </div>
                                 ))}
                             </div>
                         )}
                     </CardContent>
                     {/* Optional Footer for Legend */}
                     <CardFooter className="p-2 text-xs text-muted-foreground flex justify-center gap-4">
                         <span className="flex items-center gap-1"><CheckCircle className="h-3 w-3 text-green-500"/> OK</span>
                         <span className="flex items-center gap-1"><XCircle className="h-3 w-3 text-red-500"/> Atenção</span>
                         <span className="flex items-center gap-1"><div className="h-3 w-3 rounded-full bg-muted/50 border border-dashed"></div> Sem Avaliação</span>
                     </CardFooter>
                 </Card>

                 {/* Evaluation Details Modal */}
                 <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                     <DialogContent className="sm:max-w-md"> {/* Adjusted max width */}
                         <DialogHeader>
                             <DialogTitle>Detalhes - {selectedDayDetails ? format(selectedDayDetails.date, 'PPP', { locale: ptBR }) : ''}</DialogTitle>
                             <DialogDescription>
                                 Tarefas avaliadas neste dia.
                             </DialogDescription>
                         </DialogHeader>
                         <ScrollArea className="max-h-[60vh] pr-4 -mr-4"> {/* Allow scrolling */}
                             <div className="py-4 space-y-3">
                                 {selectedDayDetails?.details?.map((evaluation) => {
                                     const task = getTaskDetails(evaluation.taskId);
                                     return (
                                         <div key={evaluation.id} className="border p-3 rounded-md bg-card">
                                             <div className="flex justify-between items-center mb-2">
                                                 <span className="font-medium text-sm">{task?.title || 'Tarefa Desconhecida'}</span>
                                                 {evaluation.score === 10 ? (
                                                     <Badge variant="default" className="bg-green-600 hover:bg-green-700 text-xs">Nota 10</Badge>
                                                 ) : (
                                                     <Badge variant="destructive" className="text-xs">Nota 0</Badge>
                                                 )}
                                             </div>
                                             {evaluation.justification && (
                                                 <div className="mt-2 p-2 bg-muted/50 rounded text-xs">
                                                     <p className="font-medium flex items-center gap-1"><MessageSquare className="h-3 w-3" /> Justificativa:</p>
                                                     <p className="text-muted-foreground ml-4">{evaluation.justification}</p>
                                                 </div>
                                             )}
                                             {task?.criteria && (
                                                 <div className="mt-2 text-[10px] text-muted-foreground border-t pt-1">
                                                     <p><strong>Critério (Nota 10):</strong> {task.criteria}</p>
                                                 </div>
                                             )}
                                             {evaluation.evidenceUrl && (
                                                 <div className="mt-1">
                                                     <Button variant="link" size="sm" className="p-0 h-auto text-accent text-xs" onClick={() => alert('Visualização de evidência não implementada.')}>
                                                         <FileText className="mr-1 h-3 w-3"/> Ver Evidência
                                                     </Button>
                                                 </div>
                                             )}
                                         </div>
                                     );
                                 })}
                                 {(!selectedDayDetails || !selectedDayDetails.details || selectedDayDetails.details.length === 0) && (
                                     <p className="text-muted-foreground text-center text-sm">Nenhum detalhe encontrado.</p>
                                 )}
                             </div>
                         </ScrollArea>
                         <DialogClose asChild>
                             <Button type="button" variant="secondary" className="mt-4 w-full">Fechar</Button>
                         </DialogClose>
                     </DialogContent>
                 </Dialog>
             </div>
         </TooltipProvider>
     );
 }
   