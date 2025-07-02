'use client';

import * as React from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
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
  Frown,
  Link as LinkIcon,
  ArrowLeft, // Added
} from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
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

import type { UserProfile } from '@/types/user';
import type { Task } from '@/types/task';
import type { Evaluation } from '@/types/evaluation';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useAuth } from '@/hooks/use-auth';
import { getUsersByRoleAndOrganization } from '@/lib/user-service';
import { getAllTasksForOrganization } from '@/lib/task-service';
import { getTasksForEmployeeOnDate, getEvaluationsForDay, saveEmployeeEvaluations } from '@/lib/evaluation-service';

const getInitials = (name: string = '') => {
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
    evidenceFile?: File | null;
    evidenceUrl?: string; 
    evaluationId?: string;
}

interface EmployeeEvaluationState extends UserProfile {
    tasks: TaskEvaluationState[];
    allEvaluated: boolean;
    isSaving: boolean;
}

export default function EvaluationsPage() {
  const { organizationId, user: currentUser, isLoading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();

  const employeeIdFromQuery = searchParams.get('employeeId');
  const employeeNameFromQuery = searchParams.get('employeeName');

  const [selectedDate, setSelectedDate] = React.useState<Date>(new Date());
  const [employeesToEvaluate, setEmployeesToEvaluate] = React.useState<EmployeeEvaluationState[]>([]);
  const [isLoadingData, setIsLoadingData] = React.useState(true);
  
  const [allOrganizationTasks, setAllOrganizationTasks] = React.useState<Task[]>([]);
  const [dailyEvaluations, setDailyEvaluations] = React.useState<Map<string, Evaluation>>(new Map());

  const [departments, setDepartments] = React.useState<string[]>([]);
  const [roles, setRoles] = React.useState<string[]>([]);
  const [selectedDepartments, setSelectedDepartments] = React.useState<Set<string>>(new Set());
  const [selectedRoles, setSelectedRoles] = React.useState<Set<string>>(new Set());

  const { toast } = useToast();

  const loadEvaluationData = React.useCallback(async () => {
    if (!organizationId || authLoading) {
        if(!authLoading) setIsLoadingData(false);
        return;
    }
    setIsLoadingData(true);
    console.log("[EvaluationsPage] Loading data for org:", organizationId, "Date:", selectedDate);

    try {
        const [employeesData, tasksData, evaluationsData] = await Promise.all([
            getUsersByRoleAndOrganization('collaborator', organizationId),
            getAllTasksForOrganization(organizationId),
            getEvaluationsForDay(organizationId, format(selectedDate, 'yyyy-MM-dd'))
        ]);

        setAllOrganizationTasks(tasksData);
        const evalsMap = new Map(evaluationsData.map(ev => [`${ev.employeeId}-${ev.taskId}-${ev.evaluationDate}`, ev]));
        setDailyEvaluations(evalsMap);
        
        const uniqueDepts = new Set<string>();
        const uniqueRoles = new Set<string>();

        const employeesWithTasks = employeesData
          .filter(emp => emp.status === 'active')
          .map(emp => {
            if (emp.department) uniqueDepts.add(emp.department);
            if (emp.userRole) uniqueRoles.add(emp.userRole);

            const tasksForEmp = getTasksForEmployeeOnDate(emp, selectedDate, tasksData);
            const taskStates: TaskEvaluationState[] = tasksForEmp.map(task => {
                const evalIdKey = `${emp.uid}-${task.id}-${format(selectedDate, 'yyyy-MM-dd')}`;
                const existingEval = evalsMap.get(evalIdKey);
                return {
                    ...task,
                    score: existingEval?.score,
                    justification: existingEval?.justification || '',
                    evidenceUrl: existingEval?.evidenceUrl || undefined,
                    evaluationId: existingEval?.id,
                    evidenceFile: null, // Initialize evidenceFile
                };
            });
            return {
                ...emp,
                tasks: taskStates,
                allEvaluated: tasksForEmp.length > 0 ? taskStates.every(t => t.score !== undefined) : true,
                isSaving: false,
            };
        }).sort((a,b) => a.name.localeCompare(b.name));

        setDepartments(Array.from(uniqueDepts).sort());
        setRoles(Array.from(uniqueRoles).sort());
        setEmployeesToEvaluate(employeesWithTasks);

    } catch (error) {
        console.error("Falha ao carregar dados de avaliação:", error);
        toast({ title: "Erro", description: "Falha ao carregar dados para avaliação.", variant: "destructive" });
    } finally {
        setIsLoadingData(false);
    }
  }, [organizationId, selectedDate, authLoading, toast]);

  React.useEffect(() => {
    loadEvaluationData();
  }, [loadEvaluationData]);

  const handleScoreChange = (employeeId: string, taskId: string, score: 0 | 10) => {
    setEmployeesToEvaluate(prev =>
      prev.map(emp => {
        if (emp.uid === employeeId) {
          const updatedTasks = emp.tasks.map(task => {
            if (task.id === taskId) {
               const justification = score === 10 ? '' : task.justification;
              return { ...task, score, justification };
            }
            return task;
          });
           const allEvaluated = updatedTasks.length > 0 ? updatedTasks.every(t => t.score !== undefined) : true;
          return { ...emp, tasks: updatedTasks, allEvaluated };
        }
        return emp;
      })
    );
  };

  const handleJustificationChange = (employeeId: string, taskId: string, justification: string) => {
    setEmployeesToEvaluate(prev =>
      prev.map(emp =>
        emp.uid === employeeId
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
         emp.uid === employeeId
           ? {
               ...emp,
               tasks: emp.tasks.map(task =>
                 task.id === taskId ? { 
                     ...task, 
                     evidenceFile: file, 
                     // Clear existing URL if new file is selected, otherwise keep existing URL if no new file.
                     // The actual preview/display logic in JSX will handle showing this temp URL or existing one.
                     evidenceUrl: file ? URL.createObjectURL(file) : task.evidenceUrl 
                 } : task
               ),
             }
           : emp
       )
     );
 };

 const handleSaveEmployeeEvaluations = async (employeeId: string) => {
     if (!organizationId || !currentUser?.uid) {
         toast({ title: "Erro", description: "Informações de organização ou avaliador ausentes.", variant: "destructive" });
         return;
     }
     const employeeState = employeesToEvaluate.find(emp => emp.uid === employeeId);
     if (!employeeState) return;

      if (employeeState.tasks.length > 0 && !employeeState.allEvaluated) {
         toast({ title: "Atenção", description: "Avalie todas as tarefas antes de salvar.", variant: "destructive" });
         return;
     }

     const tasksWithZeroScore = employeeState.tasks.filter(t => t.score === 0);
     const missingJustification = tasksWithZeroScore.some(t => !t.justification?.trim());

     if (missingJustification) {
         toast({ title: "Justificativa Necessária", description: "Adicione uma justificativa para todas as tarefas com nota 0.", variant: "destructive" });
         return;
     }

    setEmployeesToEvaluate(prev => prev.map(e => e.uid === employeeId ? {...e, isSaving: true} : e));

     const taskEvaluationsForSave = employeeState.tasks
       .filter(task => task.score !== undefined)
       .map(task => ({
         taskId: task.id,
         score: task.score!,
         justification: task.justification,
         evidenceFile: task.evidenceFile, // Pass the File object
         evaluationId: task.evaluationId, // Pass existing eval ID if available
       }));

     try {
       // saveEmployeeEvaluations now handles the upload internally
       await saveEmployeeEvaluations(organizationId, currentUser.uid, employeeId, format(selectedDate, 'yyyy-MM-dd'), taskEvaluationsForSave);
       toast({ title: "Sucesso!", description: `Avaliações para ${employeeState.name} salvas.` });
       await loadEvaluationData(); 
     } catch (error) {
       console.error("Falha ao salvar avaliações:", error);
       toast({ title: "Erro", description: `Falha ao salvar avaliações para ${employeeState.name}.`, variant: "destructive" });
     } finally {
        setEmployeesToEvaluate(prev => prev.map(e => e.uid === employeeId ? {...e, isSaving: false} : e));
     }
 };

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

   const filteredEmployees = React.useMemo(() => {
    return employeesToEvaluate.filter(emp => {
        if (employeeIdFromQuery) {
            return emp.uid === employeeIdFromQuery;
        }
        const matchesDept = selectedDepartments.size === 0 || (emp.department && selectedDepartments.has(emp.department));
        const matchesRole = selectedRoles.size === 0 || (emp.userRole && selectedRoles.has(emp.userRole));
        return matchesDept && matchesRole;
    });
   }, [employeesToEvaluate, selectedDepartments, selectedRoles, employeeIdFromQuery]);


  if (authLoading) {
    return <div className="flex justify-center items-center h-full py-10"><LoadingSpinner text="Autenticando..." /></div>;
  }
  if (!organizationId && !authLoading) {
    return (
        <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <Frown className="h-16 w-16 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Organização Não Encontrada</h2>
            <p className="text-muted-foreground">
                O administrador não está associado a uma organização ou a organização não foi carregada.
            </p>
        </div>
    );
  }

  return (
    <div className="space-y-6">
        <TooltipProvider>
            <div className="flex flex-col h-full">
            <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4">
                <div className="flex items-center gap-2">
                    {employeeIdFromQuery && (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="outline" size="icon" onClick={() => router.push('/employees')} className="h-9 w-9">
                                    <ArrowLeft className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Voltar para Colaboradores</p>
                            </TooltipContent>
                        </Tooltip>
                    )}
                    <h1 className="text-2xl font-semibold">
                        {employeeIdFromQuery ? `Avaliações de: ${decodeURIComponent(employeeNameFromQuery || '')}` : 'Avaliações Diárias'}
                    </h1>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                <Popover>
                    <PopoverTrigger asChild>
                    <Button
                        variant={'outline'}
                        className="w-[240px] justify-start text-left font-normal"
                        disabled={!!employeeIdFromQuery}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedDate ? format(selectedDate, 'PPP', { locale: ptBR }) : <span>Escolha uma data</span>}
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
                            <Button variant="outline" disabled={!!employeeIdFromQuery}>
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
                            <DropdownMenuLabel>Filtrar por Função (Cargo)</DropdownMenuLabel>
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

            <ScrollArea className="flex-grow">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-4">
                {isLoadingData ? (
                    <div className="col-span-full flex justify-center items-center py-10">
                         <LoadingSpinner text="Carregando avaliações..." />
                     </div>
                ) : filteredEmployees.length === 0 ? (
                     <div className="col-span-full text-center text-muted-foreground py-10">
                         <Frown className="mx-auto h-10 w-10 mb-2" />
                         <p>{employeeIdFromQuery ? 'Nenhuma avaliação encontrada para este colaborador na data selecionada.' : 'Nenhum colaborador encontrado para os filtros e data selecionados.'}</p>
                     </div>
                ) : (
                    filteredEmployees.map(employee => (
                    <Card key={employee.uid} className="flex flex-col">
                        <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-2">
                        <Avatar className="h-10 w-10">
                            <AvatarImage src={employee.photoUrl} alt={employee.name} />
                            <AvatarFallback>{getInitials(employee.name)}</AvatarFallback>
                        </Avatar>
                        <div className='flex-1'>
                            <CardTitle className="text-lg">{employee.name}</CardTitle>
                            <CardDescription>{employee.userRole} - {employee.department}</CardDescription>
                        </div>
                        </CardHeader>
                        <CardContent className="flex-grow pt-2 pb-4 px-4 space-y-3">
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
                                    <div className="flex gap-2">
                                        <Button
                                            variant={task.score === 10 ? 'default' : 'outline'}
                                            size="sm"
                                            className={`px-3 ${task.score === 10 ? 'bg-green-600 hover:bg-green-700 text-white dark:bg-green-700 dark:hover:bg-green-800' : ''}`}
                                            onClick={() => handleScoreChange(employee.uid, task.id, 10)}
                                        >
                                        <Check className="h-4 w-4 mr-1" /> 10
                                        </Button>
                                        <Button
                                            variant={task.score === 0 ? 'destructive' : 'outline'}
                                            size="sm"
                                            className="px-3"
                                            onClick={() => handleScoreChange(employee.uid, task.id, 0)}
                                        >
                                        <X className="h-4 w-4 mr-1" /> 0
                                        </Button>
                                    </div>
                                    <div className="flex-1 max-w-[120px] relative">
                                        <Label htmlFor={`evidence-${employee.uid}-${task.id}`} className="sr-only">Evidência</Label>
                                        <Input
                                            id={`evidence-${employee.uid}-${task.id}`}
                                            type="file"
                                            accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt" // Example accept types
                                            className="h-9 text-xs file:mr-2 file:text-xs file:font-medium file:border-0 file:bg-muted file:text-muted-foreground hover:file:bg-muted/80"
                                            onChange={(e) => handleEvidenceChange(employee.uid, task.id, e.target.files ? e.target.files[0] : null)}
                                            aria-label={`Anexar evidência para ${task.title}`}
                                            />
                                        {task.evidenceFile && <p className='text-[10px] truncate mt-1 text-muted-foreground' title={task.evidenceFile.name}>{task.evidenceFile.name}</p>}
                                        {!task.evidenceFile && task.evidenceUrl && typeof task.evidenceUrl === 'string' && task.evidenceUrl.startsWith('http') && (
                                            <a href={task.evidenceUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-accent hover:underline mt-1 block truncate flex items-center gap-1" title="Ver evidência anexada">
                                                <LinkIcon className="h-3 w-3" /> Ver evidência
                                            </a>
                                        )}
                                    </div>
                                </div>
                                {task.score === 0 && (
                                    <div className="mt-3">
                                    <Label htmlFor={`justification-${employee.uid}-${task.id}`} className="text-xs font-medium text-destructive">Justificativa (Obrigatório para nota 0)</Label>
                                    <Textarea
                                        id={`justification-${employee.uid}-${task.id}`}
                                        placeholder="Explique o motivo da nota 0..."
                                        value={task.justification}
                                        onChange={(e) => handleJustificationChange(employee.uid, task.id, e.target.value)}
                                        className="mt-1 text-sm min-h-[60px]"
                                        required={task.score === 0}
                                    />
                                    </div>
                                )}
                                </div>
                            ))
                        )}
                        </CardContent>
                        {employee.tasks.length > 0 && (
                            <CardFooter className="border-t px-4 py-3 mt-auto">
                            <Button
                                className="w-full"
                                onClick={() => handleSaveEmployeeEvaluations(employee.uid)}
                                disabled={!employee.allEvaluated || employee.isSaving}
                                aria-live="polite"
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
                        {employee.tasks.length === 0 && !isLoadingData && (
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
