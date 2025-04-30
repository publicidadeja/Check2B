'use client';

import * as React from 'react';
import {
  ChevronDown,
  Filter,
  Calendar as CalendarIcon,
  User,
  Check,
  X,
  FileText,
  Image as ImageIcon,
  Loader2,
  Save,
  ListFilter,
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
import { Separator } from '@/components/ui/separator';

import type { Employee } from '@/types/employee';
import type { Task } from '@/types/task';
import type { Evaluation } from '@/types/evaluation';

// Mock data - replace with API calls
const mockEmployees: Employee[] = [
   { id: '1', name: 'Alice Silva', email: 'alice.silva@checkup.com', phone: '11987654321', department: 'RH', role: 'Recrutadora', admissionDate: '2023-01-15', isActive: true, photoUrl: 'https://picsum.photos/id/1027/40/40' },
   { id: '2', name: 'Bob Santos', email: 'bob.santos@checkup.com', phone: '21912345678', department: 'Engenharia', role: 'Desenvolvedor Backend', admissionDate: '2022-08-20', isActive: true, photoUrl: 'https://picsum.photos/id/1005/40/40' },
   { id: '4', name: 'David Costa', email: 'david.costa@checkup.com', phone: '41988887777', department: 'Vendas', role: 'Executivo de Contas', admissionDate: '2021-11-01', isActive: true, photoUrl: 'https://picsum.photos/id/338/40/40' },
   { id: '5', name: 'Eva Pereira', email: 'eva.pereira@checkup.com', phone: '51977776666', department: 'Engenharia', role: 'Desenvolvedora Frontend', admissionDate: '2023-03-22', isActive: true },
 ];

const mockTasks: Task[] = [
   { id: 't1', title: 'Verificar Emails', description: 'Responder a todos os emails pendentes na caixa de entrada principal.', criteria: 'Caixa de entrada zerada ou todos os emails urgentes respondidos.', category: 'Comunicação', periodicity: 'daily', assignedTo: 'role', assignedEntityId: 'recrutador' }, // Alice
   { id: 't2', title: 'Reunião Diária de Sincronização', description: 'Participar da reunião diária da equipe de engenharia.', criteria: 'Presença e participação ativa na reunião.', category: 'Engenharia', periodicity: 'daily', assignedTo: 'department', assignedEntityId: 'engenharia' }, // Bob, Eva
   { id: 't3', title: 'Atualizar Pipeline de Vendas', description: 'Registrar todas as novas interações e atualizações de status no CRM.', criteria: 'CRM atualizado com todas as atividades do dia anterior.', category: 'Vendas', periodicity: 'daily', assignedTo: 'role', assignedEntityId: 'executivo_contas' }, // David
   { id: 't5', title: 'Revisar Código Pendente', description: 'Revisar pull requests abertos designados a você.', criteria: 'Todos os PRs na fila de revisão analisados e com feedback.', category: 'Engenharia', periodicity: 'daily', assignedTo: 'individual', assignedEntityId: '2' /* Bob Santos */ }, // Bob
   { id: 't6', title: 'Criar Relatório Semanal', description: 'Compilar dados e criar o relatório semanal de performance.', criteria: 'Relatório completo e enviado até o final do dia.', category: 'Global', periodicity: 'specific_days' /* e.g., Fridays */ }, // Assigned globally (potentially relevant to all active if not filtered)
 ];

 // Mock function to get tasks for a specific employee on a specific date
const getTasksForEmployee = (employeeId: string, date: Date): Task[] => {
     const employee = mockEmployees.find(e => e.id === employeeId);
     if (!employee || !employee.isActive) return [];

     // Filter tasks based on assignment and periodicity (simplified for mock)
     return mockTasks.filter(task => {
       if (task.periodicity === 'daily') {
         if (!task.assignedTo) return true; // Global daily task
         if (task.assignedTo === 'role' && task.assignedEntityId === employee.role) return true;
         if (task.assignedTo === 'department' && task.assignedEntityId === employee.department) return true;
         if (task.assignedTo === 'individual' && task.assignedEntityId === employee.id) return true;
       }
       // Add logic for specific_days/dates if needed
       return false;
     });
 };


// Mock function to save evaluations
const saveEvaluations = async (evaluations: Evaluation[]): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 700)); // Simulate API delay
    console.log("Saving evaluations:", evaluations);
    // In real app, send this data to your backend API
};

// Helper function to get initials
const getInitials = (name: string) => {
    return name
        ?.split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase() || '??';
};

interface TaskEvaluationState extends Task {
    score?: 0 | 10;
    justification?: string;
    evidenceFile?: File | null; // For file upload simulation
    evidenceUrl?: string; // For potential existing URL
}

interface EmployeeEvaluationState extends Employee {
    tasks: TaskEvaluationState[];
    allEvaluated: boolean;
    isSaving: boolean;
}

export default function EvaluationsPage() {
  const [selectedDate, setSelectedDate] = React.useState<Date>(new Date());
  const [employeesToEvaluate, setEmployeesToEvaluate] = React.useState<EmployeeEvaluationState[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [departments, setDepartments] = React.useState<string[]>([]);
  const [roles, setRoles] = React.useState<string[]>([]);
  const [selectedDepartments, setSelectedDepartments] = React.useState<Set<string>>(new Set());
  const [selectedRoles, setSelectedRoles] = React.useState<Set<string>>(new Set());

  const { toast } = useToast();

  // Populate departments and roles from employees (run once)
  React.useEffect(() => {
    const uniqueDepartments = [...new Set(mockEmployees.map(e => e.department))];
    const uniqueRoles = [...new Set(mockEmployees.map(e => e.role))];
    setDepartments(uniqueDepartments);
    setRoles(uniqueRoles);
  }, []);


  // Load employees and their tasks for the selected date and filters
  const loadEvaluationData = React.useCallback(() => {
    setIsLoading(true);
    console.log("Loading data for date:", selectedDate, "Deps:", selectedDepartments, "Roles:", selectedRoles);

    // Filter employees based on selection
     let filteredEmployees = mockEmployees.filter(emp => emp.isActive); // Start with active employees

    if (selectedDepartments.size > 0) {
      filteredEmployees = filteredEmployees.filter(emp => selectedDepartments.has(emp.department));
    }
    if (selectedRoles.size > 0) {
       filteredEmployees = filteredEmployees.filter(emp => selectedRoles.has(emp.role));
    }


    // Map to evaluation state, fetching tasks for each
    const employeesWithTasks = filteredEmployees.map(emp => {
      const tasksForEmp = getTasksForEmployee(emp.id, selectedDate);
      const taskStates: TaskEvaluationState[] = tasksForEmp.map(task => ({
          ...task,
          score: undefined, // Initial state
          justification: '',
          evidenceFile: null,
      }));
      return {
        ...emp,
        tasks: taskStates,
        allEvaluated: false, // Initially not all evaluated
        isSaving: false, // Initially not saving
      };
    });

    setEmployeesToEvaluate(employeesWithTasks);
    setIsLoading(false);
  }, [selectedDate, selectedDepartments, selectedRoles]); // Dependencies

  React.useEffect(() => {
    loadEvaluationData();
  }, [loadEvaluationData]); // Run when dependencies change


  const handleScoreChange = (employeeId: string, taskId: string, score: 0 | 10) => {
    setEmployeesToEvaluate(prev =>
      prev.map(emp => {
        if (emp.id === employeeId) {
          const updatedTasks = emp.tasks.map(task => {
            if (task.id === taskId) {
               // If setting score to 10, clear justification
               const justification = score === 10 ? '' : task.justification;
              return { ...task, score, justification };
            }
            return task;
          });
           // Check if all tasks are now evaluated
           const allEvaluated = updatedTasks.every(t => t.score !== undefined);
          return { ...emp, tasks: updatedTasks, allEvaluated };
        }
        return emp;
      })
    );
  };

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


 const handleSaveEmployeeEvaluations = async (employeeId: string) => {
     const employeeState = employeesToEvaluate.find(emp => emp.id === employeeId);
     if (!employeeState || !employeeState.allEvaluated) {
         toast({ title: "Atenção", description: "Avalie todas as tarefas antes de salvar.", variant: "destructive" });
         return;
     }

     // Validate justifications for score 0
     const tasksWithZeroScore = employeeState.tasks.filter(t => t.score === 0);
     const missingJustification = tasksWithZeroScore.some(t => !t.justification?.trim());

     if (missingJustification) {
         toast({ title: "Justificativa Necessária", description: "Adicione uma justificativa para todas as tarefas com nota 0.", variant: "destructive" });
         return;
     }


    setEmployeesToEvaluate(prev => prev.map(e => e.id === employeeId ? {...e, isSaving: true} : e));

     const evaluationsToSave: Evaluation[] = employeeState.tasks
       .filter(task => task.score !== undefined) // Ensure score is set
       .map(task => ({
         id: `${employeeId}-${task.id}-${selectedDate.toISOString().split('T')[0]}`, // Example ID
         employeeId: employeeId,
         taskId: task.id,
         evaluationDate: selectedDate.toISOString().split('T')[0],
         score: task.score!, // Score is checked above
         justification: task.justification,
         // TODO: Handle evidence upload - for now, just log the file name if exists
         evidenceUrl: task.evidenceFile ? `mock_upload/${task.evidenceFile.name}` : undefined,
         evaluatorId: 'admin123', // Replace with actual logged-in admin ID
         isDraft: false,
       }));

     try {
       await saveEvaluations(evaluationsToSave);
       toast({ title: "Sucesso!", description: `Avaliações para ${employeeState.name} salvas.` });
       // Optionally: Mark employee as done for the day or update UI state
     } catch (error) {
       console.error("Failed to save evaluations:", error);
       toast({ title: "Erro", description: `Falha ao salvar avaliações para ${employeeState.name}.`, variant: "destructive" });
     } finally {
        setEmployeesToEvaluate(prev => prev.map(e => e.id === employeeId ? {...e, isSaving: false} : e));
     }
 };

  const toggleDepartmentFilter = (dept: string) => {
    setSelectedDepartments(prev => {
        const newSet = new Set(prev);
        if (newSet.has(dept)) {
            newSet.delete(dept);
        } else {
            newSet.add(dept);
        }
        return newSet;
    });
  };

  const toggleRoleFilter = (role: string) => {
     setSelectedRoles(prev => {
         const newSet = new Set(prev);
         if (newSet.has(role)) {
             newSet.delete(role);
         } else {
             newSet.add(role);
         }
         return newSet;
     });
   };


  return (
    <div className="flex flex-col h-full p-4 md:p-6">
      {/* Header: Date Picker and Filters */}
      <div className="flex flex-col md:flex-row items-center justify-between mb-4 gap-4">
         <h1 className="text-2xl font-semibold">Avaliações Diárias</h1>
        <div className="flex items-center gap-2">
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

           {/* Filter Dropdown */}
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

      {/* Evaluation Cards Area */}
      <ScrollArea className="flex-grow">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-4">
          {isLoading ? (
             <p className="col-span-full text-center text-muted-foreground">Carregando colaboradores...</p>
          ) : employeesToEvaluate.length === 0 ? (
             <p className="col-span-full text-center text-muted-foreground">Nenhum colaborador encontrado para os filtros selecionados.</p>
           ) : (
            employeesToEvaluate.map(employee => (
              <Card key={employee.id} className="flex flex-col">
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
                <CardContent className="flex-grow pt-2 pb-4 px-4 space-y-3">
                  {employee.tasks.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">Nenhuma tarefa encontrada para este colaborador hoje.</p>
                  ) : (
                      employee.tasks.map(task => (
                        <div key={task.id} className="p-3 border rounded-md bg-card">
                          <h4 className="font-medium mb-1">{task.title}</h4>
                          <p className="text-xs text-muted-foreground mb-2">{task.criteria}</p>
                          <div className="flex items-center justify-between gap-2">
                            {/* Score Buttons */}
                            <div className="flex gap-2">
                                <Button
                                    variant={task.score === 10 ? 'default' : 'outline'}
                                    size="sm"
                                    className={`px-3 ${task.score === 10 ? 'bg-green-600 hover:bg-green-700 text-white' : ''}`}
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
                             {/* Evidence Input (Simplified) */}
                             <div className="flex-1 max-w-[100px]">
                                 <Input
                                    id={`evidence-${employee.id}-${task.id}`}
                                    type="file"
                                    className="h-8 text-xs"
                                    onChange={(e) => handleEvidenceChange(employee.id, task.id, e.target.files ? e.target.files[0] : null)}
                                    />
                                 {/* Display filename if exists */}
                                {task.evidenceFile && <p className='text-xs truncate mt-1 text-muted-foreground'>{task.evidenceFile.name}</p>}
                             </div>
                          </div>
                            {/* Justification Textarea (appears when score is 0) */}
                           {task.score === 0 && (
                             <div className="mt-2">
                               <Label htmlFor={`justification-${employee.id}-${task.id}`} className="text-xs text-destructive">Justificativa (Obrigatório)</Label>
                               <Textarea
                                 id={`justification-${employee.id}-${task.id}`}
                                 placeholder="Explique o motivo da nota 0..."
                                 value={task.justification}
                                 onChange={(e) => handleJustificationChange(employee.id, task.id, e.target.value)}
                                 className="mt-1 text-sm min-h-[60px]"
                                 required // Add required attribute for basic validation hint
                               />
                             </div>
                           )}
                        </div>
                      ))
                  )}
                </CardContent>
                 {employee.tasks.length > 0 && (
                     <CardFooter className="border-t px-4 py-3">
                       <Button
                         className="w-full"
                         onClick={() => handleSaveEmployeeEvaluations(employee.id)}
                         disabled={!employee.allEvaluated || employee.isSaving}
                       >
                         {employee.isSaving ? (
                           <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                         ) : (
                           <Save className="mr-2 h-4 w-4" />
                         )}
                         Salvar Avaliações
                       </Button>
                     </CardFooter>
                 )}
              </Card>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
