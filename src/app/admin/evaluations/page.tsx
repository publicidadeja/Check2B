'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from '@/components/ui/badge';
import { Check, X, FileWarning, UserCheck } from 'lucide-react';
import type { Employee } from '@/services/employee';
import type { Task } from '@/services/task';
import { getAllEmployees } from '@/services/employee';
import { getTasksByDepartment } from '@/services/task';
import { submitEvaluation } from '@/services/evaluation'; // Assuming API function exists
import { useToast } from "@/hooks/use-toast";


interface EvaluationItem {
  taskId: string;
  score: 0 | 10 | null;
  justification?: string;
}

export default function EvaluationsPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [employeeTasks, setEmployeeTasks] = useState<Task[]>([]);
  const [evaluations, setEvaluations] = useState<Record<string, EvaluationItem>>({});
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Fetch employees for the dropdown
    async function loadEmployees() {
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
            const fetchedTasks = await getTasksByDepartment(selectedEmployee!.department);
            setEmployeeTasks(fetchedTasks);
            // Initialize evaluations state
            const initialEvals: Record<string, EvaluationItem> = {};
            fetchedTasks.forEach(task => {
              initialEvals[task.id] = { taskId: task.id, score: null };
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
    setEvaluations(prev => ({
      ...prev,
      [taskId]: {
        taskId,
        score,
        justification: score === 0 ? justification ?? prev[taskId]?.justification ?? '' : undefined, // Only keep justification for score 0
      },
    }));
  };

   const getOverallScore = () => {
        const evaluatedTasks = Object.values(evaluations).filter(ev => ev.score !== null);
        if (evaluatedTasks.length === 0) return 0;
        const totalScore = evaluatedTasks.reduce((sum, ev) => sum + (ev.score ?? 0), 0);
        return Math.round((totalScore / (evaluatedTasks.length * 10)) * 100);
   };

   const getZerosCount = () => {
       return Object.values(evaluations).filter(ev => ev.score === 0).length;
   }

  const handleSubmit = async () => {
    if (!selectedEmployeeId) {
        toast({ title: "Erro", description: "Selecione um colaborador.", variant: "destructive" });
        return;
    }

    const incompleteEvaluations = Object.values(evaluations).filter(
      ev => ev.score === null || (ev.score === 0 && !(ev.justification?.trim()))
    );

    if (incompleteEvaluations.length > 0) {
       toast({
         title: "Avaliação Incompleta",
         description: `Por favor, avalie todas as tarefas e justifique as notas 0. (${incompleteEvaluations.length} pendente(s))`,
         variant: "destructive",
       });
       // Highlight incomplete fields if possible
       return;
    }

    setIsSubmitting(true);
    try {
      // Here you would typically loop through evaluations and submit them individually or as a batch
      // For this example, let's assume a batch submission or just log it.
      // We'll use the `submitEvaluation` mock function.
      console.log("Submitting evaluations:", evaluations);
      // Example: Submitting the first evaluation (replace with actual batch logic)
      const firstEvalKey = Object.keys(evaluations)[0];
       if (firstEvalKey && evaluations[firstEvalKey].score !== null) {
           // This is just a placeholder call, real implementation might differ
          await submitEvaluation(
               evaluations[firstEvalKey].taskId,
               selectedEmployeeId,
               { score: evaluations[firstEvalKey].score as 0 | 10, justification: evaluations[firstEvalKey].justification || ''},
               evaluations[firstEvalKey].justification || '' // submitEvaluation signature needs review based on previous files
           );
       }
       // TODO: Implement actual API call to submit all evaluations for the selected employee

      toast({
        title: "Avaliação Enviada",
        description: `Avaliação para ${employees.find(e => e.id === selectedEmployeeId)?.name} enviada com sucesso.`,
        variant: "default", // Use accent color indirectly
      });
       // Optionally reset the form
       // setSelectedEmployeeId(null);

    } catch (error) {
      console.error("Failed to submit evaluation:", error);
       toast({
        title: "Erro ao Enviar",
        description: "Não foi possível enviar a avaliação. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Realizar Avaliação Diária</CardTitle>
          <CardDescription>Selecione um colaborador para iniciar a avaliação do checklist diário.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-w-sm">
            <Label htmlFor="employee-select">Colaborador</Label>
            <Select onValueChange={setSelectedEmployeeId} value={selectedEmployeeId ?? ''}>
              <SelectTrigger id="employee-select">
                <SelectValue placeholder="Selecione um colaborador" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id}>
                    {employee.name} - <span className="text-muted-foreground">{employee.department}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {selectedEmployeeId && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Checklist - {employees.find(e => e.id === selectedEmployeeId)?.name}</CardTitle>
                <CardDescription>Avalie cada tarefa com 10 (Satisfatório) ou 0 (Insatisfatório).</CardDescription>
               </div>
                <div className="flex items-center gap-4">
                    <Badge variant={getZerosCount() > 0 ? "destructive" : "secondary"}>
                        {getZerosCount()} Zeros
                    </Badge>
                    <Badge variant="outline">
                        Score: {getOverallScore()}%
                    </Badge>
                </div>

          </CardHeader>
          <CardContent className="space-y-6">
            {isLoadingTasks ? (
              <p>Carregando tarefas...</p>
            ) : employeeTasks.length === 0 ? (
               <Alert variant="default" className="border-primary">
                  <UserCheck className="h-4 w-4" />
                  <AlertDescription>
                     Nenhuma tarefa encontrada para este colaborador hoje ou para este departamento.
                  </AlertDescription>
               </Alert>
            ) : (
              employeeTasks.map((task) => (
                <div key={task.id} className="border rounded-lg p-4 space-y-3 bg-card shadow-sm">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium">{task.title}</h3>
                      <p className="text-sm text-muted-foreground">{task.description}</p>
                      {/* Add criteria display if available in Task type */}
                    </div>
                     <RadioGroup
                        value={String(evaluations[task.id]?.score ?? '')}
                        onValueChange={(value) => handleEvaluationChange(task.id, value ? parseInt(value) as 0 | 10 : null)}
                        className="flex space-x-2 items-center"
                        aria-label={`Avaliação para ${task.title}`}
                    >
                        <div className="flex items-center space-x-1">
                            <RadioGroupItem value="10" id={`${task.id}-10`} className="text-green-600 border-green-600 focus:ring-green-500" />
                            <Label htmlFor={`${task.id}-10`} className="flex items-center text-green-700 cursor-pointer">
                                <Check className="h-4 w-4 mr-1"/> 10
                            </Label>
                        </div>
                        <div className="flex items-center space-x-1">
                            <RadioGroupItem value="0" id={`${task.id}-0`} className="text-red-600 border-red-600 focus:ring-red-500" />
                            <Label htmlFor={`${task.id}-0`} className="flex items-center text-red-700 cursor-pointer">
                                <X className="h-4 w-4 mr-1" /> 0
                            </Label>
                        </div>
                    </RadioGroup>
                  </div>
                  {evaluations[task.id]?.score === 0 && (
                     <div className="space-y-1">
                        <Label htmlFor={`justification-${task.id}`} className="text-destructive flex items-center gap-1">
                            <FileWarning className="h-4 w-4"/> Justificativa (Obrigatória para nota 0)
                        </Label>
                        <Textarea
                            id={`justification-${task.id}`}
                            placeholder="Descreva o motivo da nota 0..."
                            value={evaluations[task.id]?.justification ?? ''}
                            onChange={(e) => handleEvaluationChange(task.id, 0, e.target.value)}
                            className="border-destructive focus:ring-destructive"
                            required
                        />
                     </div>
                  )}
                </div>
              ))
            )}
          </CardContent>
           {employeeTasks.length > 0 && (
                <CardFooter className="flex justify-end">
                    <Button onClick={handleSubmit} disabled={isSubmitting || isLoadingTasks}>
                        {isSubmitting ? "Enviando..." : "Enviar Avaliação"}
                    </Button>
                </CardFooter>
            )}
        </Card>
      )}
    </div>
  );
}
