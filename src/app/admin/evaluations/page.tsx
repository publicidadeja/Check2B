
'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from '@/components/ui/badge';
import { Check, X, FileWarning, UserCheck, Loader2, UserSearch, Award } from 'lucide-react'; // Adicionado Award
import type { Employee } from '@/services/employee';
import type { Task } from '@/services/task';
import { getAllEmployees } from '@/services/employee';
import { getTasksForDepartmentEvaluation } from '@/services/task'; // Use the correct function
import { submitEvaluation, type EvaluationScore } from '@/services/evaluation'; // Assuming API function exists
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils"; // Adicionado cn


interface EvaluationItem extends EvaluationScore {
  taskId: string;
  // Score and justification are now part of EvaluationScore
  score: 0 | 10 | null; // Allow null for unevaluated state
  justification: string; // Keep justification, even if score is 10 (might clear later)
}

export default function EvaluationsPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [employeeTasks, setEmployeeTasks] = useState<Task[]>([]);
  const [evaluations, setEvaluations] = useState<Record<string, EvaluationItem>>({});
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(true);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Fetch employees for the dropdown
    async function loadEmployees() {
      setIsLoadingEmployees(true);
      try {
        const fetchedEmployees = await getAllEmployees();
        setEmployees(fetchedEmployees);
      } catch (error) {
        console.error("Failed to fetch employees:", error);
        toast({
          title: "Erro ao carregar colaboradores",
          description: "Não foi possível buscar a lista de colaboradores.",
          variant: "destructive",
        });
      } finally {
          setIsLoadingEmployees(false);
      }
    }
    loadEmployees();
  }, [toast]);

  useEffect(() => {
    // Fetch tasks when an employee is selected
    if (selectedEmployeeId) {
      const selectedEmployee = employees.find(emp => emp.id === selectedEmployeeId);
      if (selectedEmployee) {
        setIsLoadingTasks(true);
        setEmployeeTasks([]); // Clear previous tasks
        setEvaluations({}); // Reset evaluations
        async function loadTasks() {
          try {
            // Use the function designed for fetching evaluation tasks for a department
            const fetchedTasks = await getTasksForDepartmentEvaluation(selectedEmployee!.department);
            setEmployeeTasks(fetchedTasks);
            // Initialize evaluations state
            const initialEvals: Record<string, EvaluationItem> = {};
            fetchedTasks.forEach(task => {
              initialEvals[task.id] = { taskId: task.id, score: null, justification: '' };
            });
            setEvaluations(initialEvals);
          } catch (error) {
            console.error("Failed to fetch tasks for employee:", error);
             toast({
              title: "Erro ao carregar tarefas",
              description: `Não foi possível buscar as tarefas para ${selectedEmployee.name}.`,
              variant: "destructive",
            });
          } finally {
            setIsLoadingTasks(false);
          }
        }
        loadTasks();
      }
    } else {
      setEmployeeTasks([]);
      setEvaluations({});
    }
  }, [selectedEmployeeId, employees, toast]);

  const handleEvaluationChange = (taskId: string, score: 0 | 10 | null, justification?: string) => {
    setEvaluations(prev => {
        const currentEval = prev[taskId] || { taskId, score: null, justification: '' };
        const newScore = score;
        let newJustification = justification !== undefined ? justification : currentEval.justification;

        // Clear justification if score is 10
        if (newScore === 10) {
            newJustification = '';
        }

        return {
            ...prev,
            [taskId]: {
                ...currentEval,
                score: newScore,
                justification: newJustification,
            },
        };
    });
};

   const getOverallScore = () => {
        const evaluatedTasks = Object.values(evaluations).filter(ev => ev.score !== null);
        if (evaluatedTasks.length === 0) return 0;
        const totalScore = evaluatedTasks.reduce((sum, ev) => sum + (ev.score ?? 0), 0);
        // Calculate score based on the number of *tasks available*, not just evaluated ones,
        // to reflect incomplete evaluations accurately if needed. Or base on evaluatedTasks.length
        // if only submitted evaluations count. Let's use evaluatedTasks.length for now.
        const maxPossibleScore = evaluatedTasks.length * 10;
        return maxPossibleScore > 0 ? Math.round((totalScore / maxPossibleScore) * 100) : 0;
   };

   const getZerosCount = () => {
       return Object.values(evaluations).filter(ev => ev.score === 0).length;
   }

   const getPendingCount = () => {
        return Object.values(evaluations).filter(
             ev => ev.score === null || (ev.score === 0 && !(ev.justification?.trim()))
        ).length;
   }

  const handleSubmit = async () => {
    if (!selectedEmployeeId) {
        toast({ title: "Erro", description: "Selecione um colaborador.", variant: "destructive" });
        return;
    }
    const selectedEmployee = employees.find(e => e.id === selectedEmployeeId);
    if (!selectedEmployee) {
         toast({ title: "Erro", description: "Colaborador selecionado inválido.", variant: "destructive" });
         return;
    }

    const evaluationsToSubmit = Object.values(evaluations);
     const incompleteEvaluations = evaluationsToSubmit.filter(
      ev => ev.score === null || (ev.score === 0 && !(ev.justification?.trim()))
    );

    if (incompleteEvaluations.length > 0) {
       toast({
         title: "Avaliação Incompleta",
         description: `Por favor, avalie todas as ${evaluationsToSubmit.length} tarefas e justifique as notas 0. (${incompleteEvaluations.length} pendente(s))`,
         variant: "destructive",
       });
       // Highlight incomplete fields - find the first incomplete task and focus/scroll to it
        const firstIncomplete = document.getElementById(`task-card-${incompleteEvaluations[0].taskId}`);
        if (firstIncomplete) {
            firstIncomplete.scrollIntoView({ behavior: 'smooth', block: 'center' });
            // Maybe add a temporary highlight class
        }
       return;
    }

    setIsSubmitting(true);
    try {
      // Submit all evaluations in parallel (or sequentially if API requires)
      const submissionPromises = evaluationsToSubmit.map(ev => {
          if (ev.score === null) {
              // This case should be prevented by the check above, but as a safeguard:
              console.warn(`Skipping submission for task ${ev.taskId} with null score.`);
              return Promise.resolve(); // Or reject if needed
          }
           const scoreData: EvaluationScore = {
                score: ev.score,
                // Send empty string if score is 10, otherwise send the justification
                justification: ev.score === 0 ? ev.justification.trim() : '',
            };
            // Pass justification separately only if needed by API, otherwise it's in scoreData
           // A função submitEvaluation espera 3 args, o 4º (justification) não é necessário aqui pois já está em scoreData
           return submitEvaluation(ev.taskId, selectedEmployeeId, scoreData);
      });

      await Promise.all(submissionPromises);

      toast({
        title: "Avaliação Enviada",
        description: `Avaliação para ${selectedEmployee.name} enviada com sucesso (${evaluationsToSubmit.length} tarefas).`,
        variant: "default", // Use accent color indirectly
      });
       // Reset the form after successful submission
       setSelectedEmployeeId(null); // This will clear tasks and evaluations via useEffect

    } catch (error: any) {
      console.error("Failed to submit evaluation:", error);
       toast({
        title: "Erro ao Enviar",
        description: error.message || "Não foi possível enviar a avaliação completa. Verifique os dados e tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedEmployeeName = employees.find(e => e.id === selectedEmployeeId)?.name ?? 'Colaborador';
  const pendingCount = getPendingCount();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Realizar Avaliação Diária</CardTitle>
          <CardDescription>Selecione um colaborador para visualizar e avaliar as tarefas do checklist diário.</CardDescription>
        </CardHeader>
        <CardContent>
           <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="employee-select" className="flex items-center gap-1">
                    <UserSearch className="h-4 w-4 text-muted-foreground"/> Colaborador
                </Label>
                <Select
                    onValueChange={setSelectedEmployeeId}
                    value={selectedEmployeeId ?? ''}
                    disabled={isLoadingEmployees || isSubmitting}
                >
                <SelectTrigger id="employee-select" className="w-full">
                    <SelectValue placeholder={isLoadingEmployees ? "Carregando..." : "Selecione um colaborador"} />
                </SelectTrigger>
                <SelectContent>
                    {isLoadingEmployees ? (
                        <div className="flex items-center justify-center p-4">
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                         </div>
                    ) : employees.length > 0 ? (
                        employees.map((employee) => (
                        <SelectItem key={employee.id} value={employee.id}>
                            {employee.name} - <span className="text-muted-foreground">{employee.department}</span>
                        </SelectItem>
                        ))
                    ) : (
                        <div className="p-4 text-center text-sm text-muted-foreground">Nenhum colaborador encontrado.</div>
                    )}
                </SelectContent>
                </Select>
              </div>
              {/* Placeholder for potential date selection? */}
              {/* <div className="space-y-2">
                 <Label htmlFor="evaluation-date">Data da Avaliação</Label>
                 <Input type="date" id="evaluation-date" defaultValue={new Date().toISOString().split('T')[0]} disabled={isSubmitting}/>
              </div> */}
           </div>
        </CardContent>
      </Card>

      {selectedEmployeeId && (
        <Card>
          <CardHeader>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div>
                    <CardTitle>Checklist - {selectedEmployeeName}</CardTitle>
                    <CardDescription>Avalie cada tarefa com 10 (Satisfatório) ou 0 (Insatisfatório).</CardDescription>
                </div>
                {!isLoadingTasks && employeeTasks.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={pendingCount > 0 ? "secondary" : "default"} className={pendingCount > 0 ? "" : "bg-accent text-accent-foreground"}>
                            {pendingCount > 0 ? `${pendingCount} Pendente(s)` : 'Completo'}
                        </Badge>
                        <Badge variant={getZerosCount() > 0 ? "destructive" : "outline"}>
                            {getZerosCount()} Zero(s)
                        </Badge>
                        <Badge variant="outline">
                            Score Atual: {getOverallScore()}%
                        </Badge>
                    </div>
                )}
               </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoadingTasks ? (
               <div className="flex justify-center items-center p-10">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">Carregando tarefas...</span>
               </div>
            ) : employeeTasks.length === 0 ? (
               <Alert variant="default" className="border-primary bg-background">
                  <UserCheck className="h-4 w-4" />
                   <AlertTitle>Nenhuma Tarefa</AlertTitle>
                  <AlertDescription>
                     Nenhuma tarefa encontrada para este colaborador neste departamento ou tarefas gerais aplicáveis hoje. Verifique o cadastro de tarefas.
                  </AlertDescription>
               </Alert>
            ) : (
              employeeTasks.map((task, index) => {
                  const evaluation = evaluations[task.id] || { taskId: task.id, score: null, justification: '' };
                  const isTaskIncomplete = evaluation.score === null || (evaluation.score === 0 && !evaluation.justification?.trim());

                  return (
                    <div
                        key={task.id}
                        id={`task-card-${task.id}`} // ID for potential scrolling
                        className={cn(
                            "border rounded-lg p-4 space-y-3 bg-card shadow-sm transition-all",
                            isTaskIncomplete && pendingCount > 0 && "border-primary ring-1 ring-primary" // Highlight incomplete tasks when submit is pending
                        )}
                    >
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                        <div className="flex-1">
                        <h3 className="font-medium">{index + 1}. {task.title}</h3>
                        <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
                        {task.criteria && (
                            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 flex items-start gap-1">
                                <Award className="h-3 w-3 mt-0.5 shrink-0"/>
                                <span><strong>Critério (Nota 10):</strong> {task.criteria}</span>
                            </p>
                        )}
                        </div>
                        <RadioGroup
                            value={String(evaluation.score ?? '')}
                            onValueChange={(value) => handleEvaluationChange(task.id, value ? parseInt(value) as 0 | 10 : null)}
                            className="flex space-x-4 items-center pt-1 shrink-0"
                            aria-label={`Avaliação para ${task.title}`}
                            disabled={isSubmitting}
                        >
                            <div className="flex items-center space-x-1.5">
                                <RadioGroupItem value="10" id={`${task.id}-10`} className="text-green-600 border-green-600 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed" />
                                <Label htmlFor={`${task.id}-10`} className="flex items-center text-green-700 dark:text-green-500 cursor-pointer gap-1">
                                    <Check className="h-4 w-4"/> 10
                                </Label>
                            </div>
                            <div className="flex items-center space-x-1.5">
                                <RadioGroupItem value="0" id={`${task.id}-0`} className="text-red-600 border-red-600 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed" />
                                <Label htmlFor={`${task.id}-0`} className="flex items-center text-red-700 dark:text-red-500 cursor-pointer gap-1">
                                    <X className="h-4 w-4" /> 0
                                </Label>
                            </div>
                        </RadioGroup>
                    </div>
                    {evaluation.score === 0 && (
                        <div className="space-y-1 pt-2 border-t border-dashed">
                            <Label htmlFor={`justification-${task.id}`} className="text-sm font-medium text-destructive flex items-center gap-1">
                                <FileWarning className="h-4 w-4"/> Justificativa (Obrigatória para nota 0)
                            </Label>
                            <Textarea
                                id={`justification-${task.id}`}
                                placeholder="Descreva detalhadamente o motivo da nota 0..."
                                value={evaluation.justification ?? ''}
                                onChange={(e) => handleEvaluationChange(task.id, 0, e.target.value)}
                                className={cn(
                                    "min-h-[60px]",
                                    !evaluation.justification?.trim() ? "border-destructive focus:ring-destructive" : "border-input"
                                )}
                                required
                                disabled={isSubmitting}
                                rows={2}
                            />
                        </div>
                    )}
                    </div>
                 )
              })
            )}
          </CardContent>
           {employeeTasks.length > 0 && (
                <CardFooter className="flex justify-end border-t pt-4">
                    <Button onClick={handleSubmit} disabled={isSubmitting || isLoadingTasks || isLoadingEmployees || pendingCount > 0}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isSubmitting ? "Enviando..." : `Enviar Avaliação (${employeeTasks.length - pendingCount}/${employeeTasks.length})`}
                    </Button>
                </CardFooter>
            )}
        </Card>
      )}
    </div>
  );
}

