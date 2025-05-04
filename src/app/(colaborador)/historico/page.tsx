
'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar"; // Assuming Calendar component exists
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Check, X, MessageSquare, Loader2 } from 'lucide-react';
import * as React from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Mock data (replace with actual data fetching)
interface MockEvaluation {
  taskId: string;
  taskTitle: string;
  score: 0 | 10;
  justification?: string;
  criteria?: string;
}

interface MockDailyData {
  date: string; // YYYY-MM-DD
  status: 'evaluated' | 'pending' | 'no_tasks';
  evaluations?: MockEvaluation[];
}

// Function to generate mock data for a month
const generateMockMonthData = (month: Date): MockDailyData[] => {
    const start = startOfMonth(month);
    const end = endOfMonth(month);
    const days = eachDayOfInterval({ start, end });

    return days.map(day => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const dayOfWeek = day.getDay(); // 0 = Sunday, 6 = Saturday
        const random = Math.random();

        // Simulate no tasks on weekends
        if (dayOfWeek === 0 || dayOfWeek === 6) {
            return { date: dateStr, status: 'no_tasks' as const };
        }

        // Simulate pending or evaluated
        if (random < 0.1 && format(day,'yyyy-MM-dd') === format(new Date(),'yyyy-MM-dd')) { // ~10% chance of pending (only for today)
             return { date: dateStr, status: 'pending' as const };
        } else {
            const numEvaluations = 3 + Math.floor(Math.random() * 3); // 3-5 tasks
            const evaluations: MockEvaluation[] = [];
            let hasZero = false;
            for (let i = 0; i < numEvaluations; i++) {
                 const score = Math.random() < 0.15 ? 0 : 10; // ~15% chance of 0
                 if (score === 0) hasZero = true;
                 evaluations.push({
                     taskId: `task-${i+1}`,
                     taskTitle: `Tarefa Exemplo ${i+1}`,
                     score: score as 0 | 10,
                     justification: score === 0 ? `Motivo exemplo para nota zero na tarefa ${i+1}.` : undefined,
                     criteria: `Critério para nota 10 da tarefa ${i+1}.`
                 });
            }
             return {
                date: dateStr,
                status: 'evaluated' as const,
                evaluations: evaluations,
             };
        }
    });
};


export default function HistoricoPage() {
    const [isLoading, setIsLoading] = React.useState(true);
    const [currentMonth, setCurrentMonth] = React.useState<Date>(startOfMonth(new Date()));
    const [monthData, setMonthData] = React.useState<MockDailyData[]>([]);
    const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(undefined);

    // Fetch data when month changes
     React.useEffect(() => {
         setIsLoading(true);
         // Simulate API call
         console.log("Fetching data for month:", format(currentMonth, 'yyyy-MM'));
         const timer = setTimeout(() => {
             const data = generateMockMonthData(currentMonth);
             setMonthData(data);
             setSelectedDate(undefined); // Reset selected day when month changes
             setIsLoading(false);
             console.log("Data loaded:", data);
         }, 1000); // Simulate 1 second fetch
          return () => clearTimeout(timer);
     }, [currentMonth]);


     const selectedDayData = selectedDate ? monthData.find(d => d.date === format(selectedDate, 'yyyy-MM-dd')) : undefined;

     const getDayStatusClass = (date: Date): string => {
        const dayData = monthData.find(d => d.date === format(date, 'yyyy-MM-dd'));
        if (!dayData) return '';

        switch (dayData.status) {
            case 'evaluated':
                // Check if any evaluation has score 0
                const hasZero = dayData.evaluations?.some(ev => ev.score === 0);
                return hasZero ? 'bg-destructive/20 text-destructive-foreground font-semibold' : 'bg-accent/30 text-accent-foreground font-semibold';
             case 'pending':
                return 'bg-primary/10 text-primary font-semibold border border-primary';
             case 'no_tasks':
                return 'text-muted-foreground opacity-70';
             default:
                return '';
        }
     };

  return (
    <div className="space-y-6">
       <Card>
         <CardHeader>
           <CardTitle>Histórico de Avaliações</CardTitle>
           <CardDescription>Visualize seu desempenho diário e mensal.</CardDescription>
         </CardHeader>
         <CardContent className="flex flex-col items-center gap-4">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                month={currentMonth}
                onMonthChange={setCurrentMonth}
                locale={ptBR}
                showOutsideDays={false}
                className="rounded-md border p-0" // Remove default padding
                classNames={{
                    caption_label: "text-sm font-medium",
                    nav_button: "h-7 w-7",
                    nav_button_previous: "absolute left-1",
                    nav_button_next: "absolute right-1",
                    table: "w-full border-collapse",
                    head_row: "flex",
                    head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
                    row: "flex w-full mt-2",
                    cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected])]:bg-accent/50 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                    day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100 rounded-md",
                    day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                    day_today: "bg-accent text-accent-foreground rounded-md",
                    day_disabled: "text-muted-foreground opacity-50",
                     // Apply custom status classes
                    day_range_middle: "", // Disable range highlighting if not needed
                 }}
                 modifiers={{
                    evaluatedGood: (date) => {
                      const dayData = monthData.find(d => d.date === format(date, 'yyyy-MM-dd'));
                      return dayData?.status === 'evaluated' && !dayData.evaluations?.some(ev => ev.score === 0);
                    },
                    evaluatedBad: (date) => {
                      const dayData = monthData.find(d => d.date === format(date, 'yyyy-MM-dd'));
                      return dayData?.status === 'evaluated' && dayData.evaluations?.some(ev => ev.score === 0);
                    },
                    pending: (date) => {
                      const dayData = monthData.find(d => d.date === format(date, 'yyyy-MM-dd'));
                      return dayData?.status === 'pending';
                    },
                    noTasks: (date) => {
                        const dayData = monthData.find(d => d.date === format(date, 'yyyy-MM-dd'));
                        return dayData?.status === 'no_tasks';
                    }
                  }}
                  modifiersClassNames={{
                    evaluatedGood: 'bg-accent/30 text-accent-foreground font-semibold hover:bg-accent/40',
                    evaluatedBad: 'bg-destructive/20 text-destructive-foreground font-semibold hover:bg-destructive/30',
                    pending: 'bg-primary/10 text-primary font-semibold border border-primary hover:bg-primary/20',
                    noTasks: 'text-muted-foreground opacity-60 hover:bg-muted/50',
                    selected: 'bg-primary text-primary-foreground hover:bg-primary/90 focus:bg-primary/90', // Ensure selected overrides status bg hover
                    today: 'bg-blue-500 text-white font-bold hover:bg-blue-600', // Distinct today style
                  }}

                disabled={(date) => date > new Date() || date < new Date("2023-01-01")} // Example disabled dates
              />
                <div className="flex justify-center gap-2 flex-wrap text-xs mt-2">
                    <Badge variant="outline" className="flex items-center gap-1 border-green-500 bg-green-500/10 text-green-700 dark:text-green-400"><Check className="h-3 w-3"/> Satisfatório</Badge>
                    <Badge variant="outline" className="flex items-center gap-1 border-red-500 bg-red-500/10 text-red-700 dark:text-red-400"><X className="h-3 w-3"/> Insatisfatório (Zero)</Badge>
                    <Badge variant="outline" className="flex items-center gap-1 border-primary bg-primary/10 text-primary"><CalendarClock className="h-3 w-3"/> Pendente</Badge>
                    <Badge variant="secondary">Hoje</Badge>
                     <Badge variant="outline" className="text-muted-foreground">Sem Tarefas</Badge>
                </div>
            </CardContent>
        </Card>

        {isLoading && selectedDate && (
             <Card>
                 <CardHeader>
                     <Skeleton className="h-6 w-3/4" />
                     <Skeleton className="h-4 w-1/2" />
                 </CardHeader>
                 <CardContent className="space-y-4">
                     <Skeleton className="h-16 w-full" />
                     <Skeleton className="h-16 w-full" />
                     <Skeleton className="h-16 w-full" />
                 </CardContent>
            </Card>
         )}


       {selectedDate && !isLoading && selectedDayData && (
         <Card>
           <CardHeader>
              <CardTitle>Avaliação de {format(selectedDate, "dd 'de' MMMM',' yyyy", { locale: ptBR })}</CardTitle>
              <CardDescription>
                {selectedDayData.status === 'evaluated' ? 'Detalhes da sua avaliação neste dia.' :
                 selectedDayData.status === 'pending' ? 'Sua avaliação para este dia ainda está pendente.' :
                 'Não houve tarefas atribuídas neste dia.'}
              </CardDescription>
           </CardHeader>
           <CardContent>
             {selectedDayData.status === 'evaluated' && selectedDayData.evaluations ? (
                <Accordion type="single" collapsible className="w-full space-y-2">
                    {selectedDayData.evaluations.map((ev, index) => (
                        <AccordionItem key={ev.taskId} value={`item-${index}`} className="border rounded-md px-4 bg-card">
                            <AccordionTrigger className="py-3 hover:no-underline">
                                <div className="flex items-center gap-3 flex-1 text-left">
                                    {ev.score === 10 ? (
                                        <Check className="h-5 w-5 text-green-600 flex-shrink-0" />
                                    ) : (
                                         <X className="h-5 w-5 text-destructive flex-shrink-0" />
                                    )}
                                    <span className="font-medium flex-1">{ev.taskTitle}</span>
                                     <Badge variant={ev.score === 10 ? "default" : "destructive"} className={`${ev.score === 10 ? 'bg-accent text-accent-foreground' : ''} ml-auto`}>
                                        Nota: {ev.score}
                                     </Badge>
                                </div>
                            </AccordionTrigger>
                             <AccordionContent className="pt-2 pb-3 text-sm space-y-2">
                                 {ev.criteria && <p><strong className="text-primary">Critério (Nota 10):</strong> {ev.criteria}</p>}
                                 {ev.score === 0 && ev.justification && (
                                    <div className="mt-2 p-3 bg-destructive/10 border-l-4 border-destructive rounded-r-md">
                                         <p className="font-semibold flex items-center gap-1"><MessageSquare className="h-4 w-4"/> Justificativa do Avaliador:</p>
                                         <p className="text-muted-foreground">{ev.justification}</p>
                                    </div>
                                )}
                                {!ev.criteria && ev.score === 10 && (
                                     <p className="text-muted-foreground italic">Sem critérios ou justificativas adicionais.</p>
                                )}
                             </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
             ) : selectedDayData.status === 'pending' ? (
                  <Alert variant="default" className="border-primary bg-primary/5">
                     <Loader2 className="h-4 w-4 animate-spin text-primary"/>
                     <AlertTitle>Avaliação Pendente</AlertTitle>
                     <AlertDescription>
                       Seu gestor ainda não realizou a avaliação para este dia.
                     </AlertDescription>
                  </Alert>
             ) : (
                  <p className="text-center text-muted-foreground p-4">Sem tarefas ou avaliações registradas para este dia.</p>
             )}
           </CardContent>
         </Card>
       )}
    </div>
  );
}
