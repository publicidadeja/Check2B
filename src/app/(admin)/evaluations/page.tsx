
'use client';

import * as React from 'react';
import {
  Filter,
  Calendar as CalendarIcon,
  Check,
  X,
  ImageIcon,
  Loader2,
  Save,
  ListFilter,
  Info,
  Frown, // Import Frown for empty state
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

import type { Employee } from '@/types/employee';
import type { Task } from '@/types/task';
import type { Evaluation } from '@/types/evaluation';
import { LoadingSpinner } from '@/components/ui/loading-spinner'; // Import LoadingSpinner

const mockEmployees: Employee[] = [
   { id: '1', name: 'Alice Silva', email: 'alice.silva@check2b.com', phone: '11987654321', department: 'RH', role: 'Recrutadora', admissionDate: '2023-01-15', isActive: true, photoUrl: 'https://picsum.photos/id/1027/40/40' },
   { id: '2', name: 'Beto Santos', email: 'beto.santos@check2b.com', phone: '21912345678', department: 'Engenharia', role: 'Desenvolvedor Backend', admissionDate: '2022-08-20', isActive: true, photoUrl: 'https://picsum.photos/id/1005/40/40' },
   { id: '4', name: 'Davi Costa', email: 'davi.costa@check2b.com', phone: '41988887777', department: 'Vendas', role: 'Executivo de Contas', admissionDate: '2021-11-01', isActive: true, photoUrl: 'https://picsum.photos/id/338/40/40' },
   { id: '5', name: 'Eva Pereira', email: 'eva.pereira@check2b.com', phone: '51977776666', department: 'Engenharia', role: 'Desenvolvedora Frontend', admissionDate: '2023-03-22', isActive: true },
 ];

const mockTasks: Task[] = [
   { id: 't1', title: 'Verificar Emails', description: 'Responder a todos os emails pendentes.', criteria: 'Caixa de entrada zerada ou emails urgentes respondidos.', category: 'Comunicação', periodicity: 'daily', assignedTo: 'role', assignedEntityId: 'Recrutadora' },
   { id: 't2', title: 'Reunião Diária', description: 'Participar da reunião da equipe.', criteria: 'Presença e participação ativa.', category: 'Engenharia', periodicity: 'daily', assignedTo: 'department', assignedEntityId: 'Engenharia' },
   { id: 't3', title: 'Atualizar CRM', description: 'Registrar novas interações no CRM.', criteria: 'CRM atualizado com atividades do dia.', category: 'Vendas', periodicity: 'daily', assignedTo: 'role', assignedEntityId: 'Executivo de Contas' },
   { id: 't5', title: 'Revisar Código', description: 'Revisar pull requests designados.', criteria: 'PRs revisados com feedback.', category: 'Engenharia', periodicity: 'daily', assignedTo: 'individual', assignedEntityId: '2' /* Beto Santos ID */ },
   { id: 't6', title: 'Relatório Semanal', description: 'Compilar dados e criar relatório.', criteria: 'Relatório completo e enviado.', category: 'Geral', periodicity: 'specific_days' /* e.g., Sextas */ },
 ];

const getTasksForEmployee = (employeeId: string, date: Date): Task[] => {
     const employee = mockEmployees.find(e => e.id === employeeId);
     if (!employee || !employee.isActive) return [];

     return mockTasks.filter(task => {
       let applies = false;
       const dayOfWeek = date.getDay();

       if (task.periodicity === 'daily') {
           applies = true;
       } else if (task.periodicity === 'specific_days') {
           // Example: T6 (Relatório Semanal) applies only on Fridays (day 5)
           if (task.id === 't6' && dayOfWeek === 5) {
               applies = true;
           }
           // Example: T4 (Postar Redes Sociais) applies only on Tue/Thu (days 2/4)
           if (task.id === 't4' && (dayOfWeek === 2 || dayOfWeek === 4)) {
               applies = true;
           }
       }

       if (!applies) return false;

       // Check assignment only if periodicity matches
       if (!task.assignedTo) return true; // Global tasks apply
       if (task.assignedTo === 'role' && task.assignedEntityId === employee.role) return true;
       if (task.assignedTo === 'department' && task.assignedEntityId === employee.department) return true;
       if (task.assignedTo === 'individual' && task.assignedEntityId === employee.id) return true;

       return false; // Does not apply if specific assignment doesn't match
     });
 };


const saveEvaluations = async (evaluations: Evaluation[]): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 700));
    console.log("Salvando avaliações:", evaluations);
    // Here you would typically send the data to your backend API
    // For demo, we just log it.
};

const getInitials = (name: string) => {
    return name
        ?.split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase() || '??';
};

// Interface to hold the state for each task being evaluated for an employee
interface TaskEvaluationState extends Task {
    score?: 0 | 10;
    justification?: string;
    evidenceFile?: File | null;
    evidenceUrl?: string; // URL if already uploaded/stored
}

// Interface to hold the evaluation state for an employee on the selected date
interface EmployeeEvaluationState extends Employee {
    tasks: TaskEvaluationState[];
    allEvaluated: boolean; // True if all applicable tasks for the day have a score
    isSaving: boolean; // To show loading state on the save button
}

export default function EvaluationsPage() {
  const [selectedDate, setSelectedDate] = React.useState<Date>(new Date());
  const [employeesToEvaluate, setEmployeesToEvaluate] = React.useState<EmployeeEvaluationState[]>([]);
  const [isLoading, setIsLoading] = React.useState(true); // Changed initial state to true
  const [departments, setDepartments] = React.useState<string[]>([]);
  const [roles, setRoles] = React.useState<string[]>([]);
  const [selectedDepartments, setSelectedDepartments] = React.useState<Set<string>>(new Set());
  const [selectedRoles, setSelectedRoles] = React.useState<Set<string>>(new Set());

  const { toast } = useToast();

  // Extract unique departments and roles for filters
  React.useEffect(() => {
    const uniqueDepartments = [...new Set(mockEmployees.map(e => e.department))].sort();
    const uniqueRoles = [...new Set(mockEmployees.map(e => e.role))].sort();
    setDepartments(uniqueDepartments);
    setRoles(uniqueRoles);
  }, []);

  // Function to load employee data based on filters and date
  const loadEvaluationData = React.useCallback(async () => { // Made async
    setIsLoading(true);
    console.log("Carregando dados para:", selectedDate, "Deptos:", selectedDepartments, "Funções:", selectedRoles);
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate loading

    // Filter employees based on selected departments and roles
     let filteredEmployees = mockEmployees.filter(emp => emp.isActive); // Start with active employees

    if (selectedDepartments.size > 0) {
      filteredEmployees = filteredEmployees.filter(emp => selectedDepartments.has(emp.department));
    }
    if (selectedRoles.size > 0) {
       filteredEmployees = filteredEmployees.filter(emp => selectedRoles.has(emp.role));
    }

    // Map filtered employees to the state structure, fetching tasks for the selected date
    const employeesWithTasks = filteredEmployees.map(emp => {
      const tasksForEmp = getTasksForEmployee(emp.id, selectedDate);
      const taskStates: TaskEvaluationState[] = tasksForEmp.map(task => ({
          ...task,
          score: undefined, // Start with no score
          justification: '',
          evidenceFile: null,
          // evidenceUrl: fetch existing evidence URL if applicable
      }));
      return {
        ...emp,
        tasks: taskStates,
        // Determine if all tasks are evaluated (initially true only if no tasks)
        allEvaluated: tasksForEmp.length === 0,
        isSaving: false,
      };
    }).sort((a,b) => a.name.localeCompare(b.name)); // Sort alphabetically

    setEmployeesToEvaluate(employeesWithTasks);
    setIsLoading(false);
  }, [selectedDate, selectedDepartments, selectedRoles]);

  // Load data when date or filters change
  React.useEffect(() => {
    loadEvaluationData();
  }, [loadEvaluationData]);


  // Handle score button clicks (10 or 0)
  const handleScoreChange = (employeeId: string, taskId: string, score: 0 | 10) => {
    setEmployeesToEvaluate(prev =>
      prev.map(emp => {
        if (emp.id === employeeId) {
          // Update the specific task's score and clear justification if score is 10
          const updatedTasks = emp.tasks.map(task => {
            if (task.id === taskId) {
               // Keep justification only if score is 0
               const justification = score === 10 ? '' : task.justification;
              return { ...task, score, justification };
            }
            return task;
          });
           // Check if all tasks for this employee now have a score
           const allEvaluated = updatedTasks.every(t => t.score !== undefined);
          return { ...emp, tasks: updatedTasks, allEvaluated };
        }
        return emp;
      })
    );
  };

  // Handle changes in the justification textarea
  const handleJustificationChange = (employeeId: string, taskId: string, justification: string) => {
    setEmployeesToEvaluate(prev =>
      prev.map(emp =>
        emp.id === employeeId
          ? {
              ...emp,
              tasks: emp.tasks.map(task =>
                task.id === taskId ? { ...task, justification } : task
              ),
            }
          : emp
      )
    );
  };

 // Handle file selection for evidence
 const handleEvidenceChange = (employeeId: string, taskId: string, file: File | null) => {
     setEmployeesToEvaluate(prev =>
       prev.map(emp =>
         emp.id === employeeId
           ? {
               ...emp,
               tasks: emp.tasks.map(task =>
                 task.id === taskId ? { ...task, evidenceFile: file } : task
               ),
             }
           : emp
       )
     );
 };


 // Handle saving evaluations for a specific employee
 const handleSaveEmployeeEvaluations = async (employeeId: string) => {
     const employeeState = employeesToEvaluate.find(emp => emp.id === employeeId);
     if (!employeeState) return;

      // Ensure all tasks are evaluated
      if (employeeState.tasks.length > 0 && !employeeState.allEvaluated) {
         toast({ title: "Atenção", description: "Avalie todas as tarefas antes de salvar.", variant: "destructive" });
         return;
     }

     // Ensure justification is provided for all tasks with score 0
     const tasksWithZeroScore = employeeState.tasks.filter(t => t.score === 0);
     const missingJustification = tasksWithZeroScore.some(t => !t.justification?.trim());

     if (missingJustification) {
         toast({ title: "Justificativa Necessária", description: "Adicione uma justificativa para todas as tarefas com nota 0.", variant: "destructive" });
         return;
     }

     // TODO: Add evidence upload logic here if required before saving

    // Set saving state
    setEmployeesToEvaluate(prev => prev.map(e => e.id === employeeId ? {...e, isSaving: true} : e));

     // Prepare data payload for the backend/API
     const evaluationsToSave: Evaluation[] = employeeState.tasks
       .filter(task => task.score !== undefined) // Only save evaluated tasks
       .map(task => ({
         id: `${employeeId}-${task.id}-${selectedDate.toISOString().split('T')[0]}`, // Example ID
         employeeId: employeeId,
         taskId: task.id,
         evaluationDate: selectedDate.toISOString().split('T')[0], // Format date as YYYY-MM-DD
         score: task.score!, // Score is guaranteed to be defined here
         justification: task.justification,
         evidenceUrl: task.evidenceFile ? `uploads/mock_${task.evidenceFile.name}` : undefined, // Simulate URL
         evaluatorId: 'admin123', // Replace with actual admin ID from context/session
         isDraft: false, // Mark as final
       }));

     try {
       await saveEvaluations(evaluationsToSave);
       toast({ title: "Sucesso!", description: `Avaliações para ${employeeState.name} salvas.` });
       // Optionally: Mark employee as 'saved' for the day, disable card, etc.
       // setEmployeesToEvaluate(prev => prev.filter(e => e.id !== employeeId)); // Or update status
     } catch (error) {
       console.error("Falha ao salvar avaliações:", error);
       toast({ title: "Erro", description: `Falha ao salvar avaliações para ${employeeState.name}.`, variant: "destructive" });
     } finally {
        // Reset saving state regardless of success/failure
        setEmployeesToEvaluate(prev => prev.map(e => e.id === employeeId ? {...e, isSaving: false} : e));
     }
 };

  // Filter handlers
  const toggleDepartmentFilter = (dept: string) => {
    setSelectedDepartments(prev => {
        const newSet = new Set(prev);
        if (newSet.has(dept)) newSet.delete(dept);
        else newSet.add(dept);
        return newSet;
    });
  };

  const toggleRoleFilter = (role: string) => {
     setSelectedRoles(prev => {
         const newSet = new Set(prev);
         if (newSet.has(role)) newSet.delete(role);
         else newSet.add(role);
         return newSet;
     });
   };


  return (
    <div className="space-y-6"> {/* Main container */}
        <TooltipProvider>
            <div className="flex flex-col h-full">
            {/* Cabeçalho: Seletor de Data e Filtros */}
            <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4">
                <h1 className="text-2xl font-semibold">Avaliações Diárias</h1>
                <div className="flex items-center gap-2 flex-wrap">
                <Popover>
                    <PopoverTrigger asChild>
                    <Button
                        variant={'outline'}
                        className="w-[240px] justify-start text-left font-normal"
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(selectedDate, 'PPP', { locale: ptBR })}
                    </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={(date) => date && setSelectedDate(date)}
                        initialFocus
                        locale={ptBR}
                    />
                    </PopoverContent>
                </Popover>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline">
                            <ListFilter className="mr-2 h-4 w-4" /> Filtros ({selectedDepartments.size + selectedRoles.size})
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-[250px]">
                            <DropdownMenuLabel>Filtrar por Departamento</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {departments.map(dept => (
                                <DropdownMenuCheckboxItem
                                    key={dept}
                                    checked={selectedDepartments.has(dept)}
                                    onCheckedChange={() => toggleDepartmentFilter(dept)}
                                >
                                    {dept}
                                </DropdownMenuCheckboxItem>
                            ))}
                            <DropdownMenuSeparator />
                            <DropdownMenuLabel>Filtrar por Função</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {roles.map(role => (
                                <DropdownMenuCheckboxItem
                                    key={role}
                                    checked={selectedRoles.has(role)}
                                    onCheckedChange={() => toggleRoleFilter(role)}
                                >
                                    {role}
                                </DropdownMenuCheckboxItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>

                </div>
            </div>

            {/* Área dos Cards de Avaliação */}
            <ScrollArea className="flex-grow"> {/* Use ScrollArea if content might exceed viewport height */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-4">
                {isLoading ? (
                    <div className="col-span-full flex justify-center items-center py-10">
                         {/* Use LoadingSpinner */}
                         <LoadingSpinner text="Carregando avaliações..." />
                     </div>
                ) : employeesToEvaluate.length === 0 ? (
                     <div className="col-span-full text-center text-muted-foreground py-10">
                         <Frown className="mx-auto h-10 w-10 mb-2" />
                         <p>Nenhum colaborador encontrado para os filtros e data selecionados.</p>
                     </div>
                ) : (
                    employeesToEvaluate.map(employee => (
                    <Card key={employee.id} className="flex flex-col"> {/* Make card a flex column */}
                        <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-2">
                        <Avatar className="h-10 w-10">
                            <AvatarImage src={employee.photoUrl} alt={employee.name} />
                            <AvatarFallback>{getInitials(employee.name)}</AvatarFallback>
                        </Avatar>
                        <div className='flex-1'>
                            <CardTitle className="text-lg">{employee.name}</CardTitle>
                            <CardDescription>{employee.role} - {employee.department}</CardDescription>
                        </div>
                        </CardHeader>
                        <CardContent className="flex-grow pt-2 pb-4 px-4 space-y-3"> {/* Content takes remaining space */}
                        {employee.tasks.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">Nenhuma tarefa agendada para este colaborador hoje.</p>
                        ) : (
                            employee.tasks.map(task => (
                                <div key={task.id} className="p-3 border rounded-md bg-card shadow-sm">
                                <div className="flex justify-between items-start mb-1">
                                    <h4 className="font-medium flex-1">{task.title}</h4>
                                    <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground">
                                            <Info className="h-4 w-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="max-w-[250px]">
                                        <p className="font-semibold">Critério (Nota 10):</p>
                                        <p className="text-sm text-muted-foreground">{task.criteria}</p>
                                    </TooltipContent>
                                    </Tooltip>
                                </div>
                                <div className="flex items-center justify-between gap-2 mt-2">
                                    {/* Score Buttons */}
                                    <div className="flex gap-2">
                                        <Button
                                            variant={task.score === 10 ? 'default' : 'outline'}
                                            size="sm"
                                            className={`px-3 ${task.score === 10 ? 'bg-green-600 hover:bg-green-700 text-white dark:bg-green-700 dark:hover:bg-green-800' : ''}`}
                                            onClick={() => handleScoreChange(employee.id, task.id, 10)}
                                        >
                                        <Check className="h-4 w-4 mr-1" /> 10
                                        </Button>
                                        <Button
                                            variant={task.score === 0 ? 'destructive' : 'outline'}
                                            size="sm"
                                            className="px-3"
                                            onClick={() => handleScoreChange(employee.id, task.id, 0)}
                                        >
                                        <X className="h-4 w-4 mr-1" /> 0
                                        </Button>
                                    </div>
                                    {/* Evidence Input */}
                                    <div className="flex-1 max-w-[120px] relative">
                                        <Label htmlFor={`evidence-${employee.id}-${task.id}`} className="sr-only">Evidência</Label>
                                        <Input
                                            id={`evidence-${employee.id}-${task.id}`}
                                            type="file"
                                            className="h-9 text-xs file:mr-2 file:text-xs file:font-medium file:border-0 file:bg-muted file:text-muted-foreground hover:file:bg-muted/80"
                                            onChange={(e) => handleEvidenceChange(employee.id, task.id, e.target.files ? e.target.files[0] : null)}
                                            aria-label={`Anexar evidência para ${task.title}`}
                                            />
                                        {/* Display filename if selected */}
                                        {task.evidenceFile && <p className='text-[10px] truncate mt-1 text-muted-foreground' title={task.evidenceFile.name}>{task.evidenceFile.name}</p>}
                                    </div>
                                </div>
                                {/* Justification Textarea (Conditional) */}
                                {task.score === 0 && (
                                    <div className="mt-3">
                                    <Label htmlFor={`justification-${employee.id}-${task.id}`} className="text-xs font-medium text-destructive">Justificativa (Obrigatório para nota 0)</Label>
                                    <Textarea
                                        id={`justification-${employee.id}-${task.id}`}
                                        placeholder="Explique o motivo da nota 0..."
                                        value={task.justification}
                                        onChange={(e) => handleJustificationChange(employee.id, task.id, e.target.value)}
                                        className="mt-1 text-sm min-h-[60px]"
                                        required={task.score === 0}
                                    />
                                    </div>
                                )}
                                </div>
                            ))
                        )}
                        </CardContent>
                        {/* Footer with Save Button (show only if tasks exist) */}
                        {employee.tasks.length > 0 && (
                            <CardFooter className="border-t px-4 py-3 mt-auto"> {/* Push footer to bottom */}
                            <Button
                                className="w-full"
                                onClick={() => handleSaveEmployeeEvaluations(employee.id)}
                                disabled={!employee.allEvaluated || employee.isSaving} // Disable if not all evaluated or saving
                                aria-live="polite" // Announce changes for accessibility
                            >
                                {employee.isSaving ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                <Save className="mr-2 h-4 w-4" />
                                )}
                                {employee.isSaving ? 'Salvando...' : 'Salvar Avaliações'}
                            </Button>
                            </CardFooter>
                        )}
                        {/* Footer placeholder if no tasks */}
                        {employee.tasks.length === 0 && !isLoading && (
                            <CardFooter className="border-t px-4 py-3 mt-auto justify-center">
                            <p className="text-sm text-muted-foreground">Sem tarefas para avaliar.</p>
                            </CardFooter>
                        )}
                    </Card>
                    ))
                )}
                </div>
            </ScrollArea>
            </div>
        </TooltipProvider>
    </div>
  );
}
