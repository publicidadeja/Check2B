
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
  Filter,
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
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose, // Added DialogClose
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
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

// Enhanced mock evaluations for employee '1' covering more dates
const mockEvaluations: Evaluation[] = [
    { id: 'eval1-t1-d1', employeeId: '1', taskId: 't1', evaluationDate: format(new Date(Date.now() - 86400000 * 2), 'yyyy-MM-dd'), score: 10, evaluatorId: 'admin1', isDraft: false },
    { id: 'eval1-t6-d1', employeeId: '1', taskId: 't6', evaluationDate: format(new Date(Date.now() - 86400000 * 2), 'yyyy-MM-dd'), score: 10, evaluatorId: 'admin1', isDraft: false }, // Assuming t6 applies
    { id: 'eval1-t1-d2', employeeId: '1', taskId: 't1', evaluationDate: format(new Date(Date.now() - 86400000), 'yyyy-MM-dd'), score: 0, justification: "Emails importantes não respondidos a tempo.", evaluatorId: 'admin1', isDraft: false },
    { id: 'eval1-t6-d2', employeeId: '1', taskId: 't6', evaluationDate: format(new Date(Date.now() - 86400000), 'yyyy-MM-dd'), score: 10, evaluatorId: 'admin1', isDraft: false }, // Assuming t6 applies
    { id: 'eval1-t1-d3', employeeId: '1', taskId: 't1', evaluationDate: format(new Date(), 'yyyy-MM-dd'), score: 10, evaluatorId: 'admin1', isDraft: false },
    // Add evaluations for previous months if needed for testing navigation
    { id: 'eval1-t1-prev1', employeeId: '1', taskId: 't1', evaluationDate: format(subMonths(new Date(), 1), 'yyyy-MM-dd'), score: 10, evaluatorId: 'admin1', isDraft: false },
    { id: 'eval1-t1-prev2', employeeId: '1', taskId: 't1', evaluationDate: format(subMonths(new Date(), 1), 'yyyy-MM-dd'), score: 0, justification: "Caixa de entrada cheia.", evaluatorId: 'admin1', isDraft: false },
];

interface DayEvaluationSummary {
    date: Date;
    score: number; // 0 if any task got 0, 10 if all tasks got 10, -1 if no evaluations
    details?: Evaluation[]; // Full evaluation details for the day
}

// Mock fetching function for evaluations in a given month
const fetchEvaluationsForMonth = async (employeeId: string, month: Date): Promise<DayEvaluationSummary[]> => {
    await new Promise(resolve => setTimeout(resolve, 600)); // Simulate delay

    const start = startOfMonth(month);
    const end = endOfMonth(month);
    const daysInMonth = eachDayOfInterval({ start, end });

    const summaries: DayEvaluationSummary[] = daysInMonth.map(day => {
        const dayStr = format(day, 'yyyy-MM-dd');
        const evaluationsForDay = mockEvaluations.filter(e =>
            e.employeeId === employeeId && e.evaluationDate === dayStr
        );

        if (evaluationsForDay.length === 0) {
            return { date: day, score: -1 }; // -1 indicates no evaluation data
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

    // Fetch evaluations when month changes
    React.useEffect(() => {
        const loadEvaluations = async () => {
            setIsLoading(true);
            setSelectedDayDetails(null); // Reset details when month changes
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
        if (daySummary.score !== -1) { // Only open modal if there are evaluations
            setSelectedDayDetails(daySummary);
            setIsModalOpen(true);
        } else {
             toast({ title: "Sem Avaliação", description: `Nenhuma avaliação registrada para ${format(daySummary.date, 'dd/MM/yyyy')}.`, variant: 'default' });
        }
    };

    const goToPreviousMonth = () => {
        setCurrentMonth(subMonths(currentMonth, 1));
    };

    const goToNextMonth = () => {
        // Prevent navigating to future months beyond the current one
        if (startOfMonth(addMonths(currentMonth, 1)) <= startOfMonth(new Date())) {
            setCurrentMonth(addMonths(currentMonth, 1));
        }
    };

    const isFutureMonth = startOfMonth(addMonths(currentMonth, 1)) > startOfMonth(new Date());

    return (
        <TooltipProvider>
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                             <div>
                                <CardTitle className="flex items-center gap-2">
                                    <CalendarIcon className="h-5 w-5" /> Histórico de Avaliações
                                </CardTitle>
                                <CardDescription>Visualize seu desempenho diário no checklist.</CardDescription>
                             </div>
                             <div className="flex items-center gap-2">
                                <Button variant="outline" size="icon" onClick={goToPreviousMonth} aria-label="Mês anterior">
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <span className="text-lg font-semibold w-32 text-center">
                                    {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
                                </span>
                                <Button variant="outline" size="icon" onClick={goToNextMonth} disabled={isFutureMonth} aria-label="Próximo mês">
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="flex justify-center items-center h-60">
                                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                            </div>
                        ) : (
                            <div className="grid grid-cols-7 gap-1 text-center text-xs">
                                {/* Calendar Header */}
                                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                                    <div key={day} className="font-semibold text-muted-foreground p-2">{day}</div>
                                ))}
                                {/* Calendar Days */}
                                {evaluations.map((daySummary) => (
                                    <Tooltip key={daySummary.date.toISOString()}>
                                        <TooltipTrigger asChild>
                                            <button
                                                onClick={() => handleDayClick(daySummary)}
                                                disabled={daySummary.score === -1}
                                                className={cn(
                                                    "relative flex items-center justify-center h-12 w-full rounded-md border text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                                                    daySummary.score === 10 && "bg-green-100 dark:bg-green-900/50 border-green-200 dark:border-green-800 hover:bg-green-200 dark:hover:bg-green-800/60",
                                                    daySummary.score === 0 && "bg-red-100 dark:bg-red-900/50 border-red-200 dark:border-red-800 hover:bg-red-200 dark:hover:bg-red-800/60",
                                                    daySummary.score === -1 && "bg-muted/50 border-dashed text-muted-foreground cursor-not-allowed",
                                                    isSameDay(daySummary.date, new Date()) && "ring-2 ring-primary" // Highlight today
                                                )}
                                            >
                                                <span>{format(daySummary.date, 'd')}</span>
                                                {daySummary.score === 10 && <CheckCircle className="absolute top-1 right-1 h-3 w-3 text-green-600 dark:text-green-400" />}
                                                {daySummary.score === 0 && <XCircle className="absolute top-1 right-1 h-3 w-3 text-red-600 dark:text-red-400" />}
                                            </button>
                                        </TooltipTrigger>
                                         <TooltipContent>
                                            {daySummary.score === 10 && <p>Desempenho: Excelente</p>}
                                            {daySummary.score === 0 && <p>Desempenho: Requer Atenção</p>}
                                            {daySummary.score === -1 && <p>Sem Avaliação</p>}
                                            <p>{format(daySummary.date, 'PPP', { locale: ptBR })}</p>
                                        </TooltipContent>
                                    </Tooltip>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Evaluation Details Modal */}
                <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                    <DialogContent className="sm:max-w-lg">
                        <DialogHeader>
                            <DialogTitle>Detalhes da Avaliação - {selectedDayDetails ? format(selectedDayDetails.date, 'PPP', { locale: ptBR }) : ''}</DialogTitle>
                            <DialogDescription>
                                Veja o resultado de cada tarefa avaliada neste dia.
                            </DialogDescription>
                        </DialogHeader>
                        <ScrollArea className="max-h-[60vh] pr-4">
                            <div className="py-4 space-y-4">
                                {selectedDayDetails?.details?.map((evaluation) => {
                                    const task = getTaskDetails(evaluation.taskId);
                                    return (
                                        <div key={evaluation.id} className="border p-3 rounded-md bg-card">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="font-semibold">{task?.title || 'Tarefa Desconhecida'}</span>
                                                {evaluation.score === 10 ? (
                                                    <Badge variant="default" className="bg-green-600 hover:bg-green-700">Nota 10</Badge>
                                                ) : (
                                                    <Badge variant="destructive">Nota 0</Badge>
                                                )}
                                            </div>
                                            {evaluation.justification && (
                                                <div className="mt-2 p-2 bg-muted/50 rounded text-sm">
                                                    <p className="font-medium flex items-center gap-1"><MessageSquare className="h-4 w-4" /> Justificativa:</p>
                                                    <p className="text-muted-foreground ml-5">{evaluation.justification}</p>
                                                </div>
                                            )}
                                             {task?.criteria && (
                                                 <div className="mt-2 text-xs text-muted-foreground border-t pt-2">
                                                    <p><strong>Critério (Nota 10):</strong> {task.criteria}</p>
                                                </div>
                                             )}
                                            {evaluation.evidenceUrl && (
                                                 <div className="mt-2">
                                                    {/* In a real app, clicking this would open the evidence */}
                                                    <Button variant="link" size="sm" className="p-0 h-auto text-accent" onClick={() => alert('Visualização de evidência não implementada.')}>
                                                        <FileText className="mr-1 h-3 w-3"/> Ver Evidência Anexada
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                                {(!selectedDayDetails || !selectedDayDetails.details || selectedDayDetails.details.length === 0) && (
                                     <p className="text-muted-foreground text-center">Nenhum detalhe de avaliação encontrado para este dia.</p>
                                )}
                            </div>
                        </ScrollArea>
                         <DialogClose asChild>
                             <Button type="button" variant="secondary" className="mt-4">Fechar</Button>
                         </DialogClose>
                    </DialogContent>
                </Dialog>
            </div>
        </TooltipProvider>
    );
}
