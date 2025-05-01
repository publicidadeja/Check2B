
'use client';

import * as React from 'react';
import { PlusCircle, Search, MoreHorizontal, Edit, Trash2, Copy, ClipboardList, Loader2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { TaskForm } from '@/components/task/task-form';
import type { Task } from '@/types/task';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import type { ColumnDef } from '@tanstack/react-table';

export let mockTasks: Task[] = [
  { id: 't1', title: 'Verificar Emails', description: 'Responder a todos os emails pendentes.', criteria: 'Caixa de entrada zerada ou emails urgentes respondidos.', category: 'Comunicação', periodicity: 'daily', assignedTo: 'role', assignedEntityId: 'Recrutadora' },
  { id: 't2', title: 'Reunião Diária', description: 'Participar da reunião da equipe.', criteria: 'Presença e participação ativa.', category: 'Engenharia', periodicity: 'daily', assignedTo: 'department', assignedEntityId: 'Engenharia' },
  { id: 't3', title: 'Atualizar CRM', description: 'Registrar novas interações no CRM.', criteria: 'CRM atualizado com atividades do dia.', category: 'Vendas', periodicity: 'daily', assignedTo: 'role', assignedEntityId: 'Executivo de Contas' },
  { id: 't4', title: 'Postar em Redes Sociais', description: 'Agendar/publicar post planejado.', criteria: 'Post publicado conforme planejado.', category: 'Marketing', periodicity: 'specific_days', assignedTo: 'role', assignedEntityId: 'Analista de Marketing' },
  { id: 't5', title: 'Revisar Código', description: 'Revisar pull requests designados.', criteria: 'PRs revisados com feedback.', category: 'Engenharia', periodicity: 'daily', assignedTo: 'individual', assignedEntityId: '2' /* Beto Santos ID */ },
  { id: 't6', title: 'Relatório Semanal', description: 'Compilar dados e criar relatório.', criteria: 'Relatório completo e enviado.', category: 'Geral', periodicity: 'specific_days' /* e.g., Sextas */ },
];

const mockEmployees: Array<{ id: string; name: string }> = [
  { id: '1', name: 'Alice Silva' },
  { id: '2', name: 'Beto Santos' },
  { id: '4', name: 'Davi Costa' },
  { id: '5', name: 'Eva Pereira' },
];

const fetchTasks = async (): Promise<Task[]> => {
  await new Promise(resolve => setTimeout(resolve, 500));
  return [...mockTasks];
};

const saveTask = async (taskData: Omit<Task, 'id'> | Task): Promise<Task> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    if ('id' in taskData && taskData.id) {
        const index = mockTasks.findIndex(t => t.id === taskData.id);
        if (index !== -1) {
            mockTasks[index] = { ...mockTasks[index], ...taskData };
            console.log("Tarefa atualizada:", mockTasks[index]);
            return mockTasks[index];
        } else {
            throw new Error("Tarefa não encontrada para atualização");
        }
    } else {
        const newTask: Task = {
            id: `t${Date.now()}`,
            ...(taskData as Omit<Task, 'id'>),
             periodicity: taskData.periodicity || 'daily',
        };
        mockTasks.push(newTask);
        console.log("Nova tarefa adicionada:", newTask);
        return newTask;
    }
};

const deleteTask = async (taskId: string): Promise<void> => {
     await new Promise(resolve => setTimeout(resolve, 500));
    const index = mockTasks.findIndex(t => t.id === taskId);
    if (index !== -1) {
        mockTasks.splice(index, 1);
        console.log("Tarefa removida com ID:", taskId);
    } else {
         throw new Error("Tarefa não encontrada para remoção");
    }
};


export default function TasksPage() {
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [selectedTask, setSelectedTask] = React.useState<Task | null>(null);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [taskToDelete, setTaskToDelete] = React.useState<Task | null>(null);
  const { toast } = useToast();

  const getAssignmentText = (task: Task): string => {
      if (!task.assignedTo) return 'Global';
      let typeText = '';
      switch (task.assignedTo) {
          case 'role': typeText = 'Função'; break;
          case 'department': typeText = 'Depto'; break;
          case 'individual': typeText = 'Indiv.'; break;
          default: typeText = task.assignedTo;
      }
      const entityName = task.assignedTo === 'individual' ? mockEmployees.find(e => e.id === task.assignedEntityId)?.name : task.assignedEntityId;
      return `${typeText}${entityName ? `: ${entityName}` : ''}`;
  }

  const getPeriodicityText = (periodicity: Task['periodicity']): string => {
      switch (periodicity) {
          case 'daily': return 'Diária';
          case 'specific_days': return 'Dias Específicos';
          case 'specific_dates': return 'Datas Específicas';
          default: return periodicity;
      }
  }


  const columns: ColumnDef<Task>[] = [
    { accessorKey: "title", header: "Título", cell: ({ row }) => <span className="font-medium">{row.original.title}</span> },
    {
      accessorKey: "category",
      header: "Categoria",
      cell: ({ row }) => row.original.category ? <Badge variant="secondary">{row.original.category}</Badge> : '-',
    },
    {
      accessorKey: "periodicity",
      header: "Periodicidade",
      cell: ({ row }) => getPeriodicityText(row.original.periodicity),
    },
    {
      accessorKey: "assignedTo",
      header: "Atribuído a",
      cell: ({ row }) => getAssignmentText(row.original),
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const task = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Abrir menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Ações</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => openEditForm(task)}>
                <Edit className="mr-2 h-4 w-4" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDuplicateTask(task)}>
                <Copy className="mr-2 h-4 w-4" />
                Duplicar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleDeleteClick(task)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                <Trash2 className="mr-2 h-4 w-4" />
                Remover
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
      size: 80,
    },
  ];

  const loadTasks = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchTasks();
      setTasks(data);
    } catch (error) {
      console.error("Falha ao carregar tarefas:", error);
      toast({ title: "Erro", description: "Falha ao carregar tarefas.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const handleSaveTask = async (data: any) => {
     const taskDataToSave = selectedTask ? { ...selectedTask, ...data } : data;
     try {
        await saveTask(taskDataToSave);
        setIsFormOpen(false);
        setSelectedTask(null);
        await loadTasks();
        toast({
          title: "Sucesso!",
          description: `Tarefa ${selectedTask ? 'atualizada' : 'criada'} com sucesso.`,
        });
     } catch (error) {
        console.error("Erro ao salvar tarefa:", error);
        toast({
          title: "Erro!",
          description: `Falha ao ${selectedTask ? 'atualizar' : 'criar'} tarefa. Tente novamente.`,
          variant: "destructive",
        });
     }
  };

 const handleDeleteClick = (task: Task) => {
    setTaskToDelete(task);
    setIsDeleting(true);
  };

 const confirmDelete = async () => {
    if (taskToDelete) {
       try {
        await deleteTask(taskToDelete.id);
        toast({ title: "Sucesso", description: "Tarefa removida com sucesso." });
        await loadTasks();
      } catch (error) {
         console.error("Falha ao remover tarefa:", error);
         toast({ title: "Erro", description: "Falha ao remover tarefa.", variant: "destructive" });
      } finally {
         setIsDeleting(false);
         setTaskToDelete(null);
      }
    }
  };

   const handleDuplicateTask = async (task: Task) => {
    const { id, title, ...taskData } = task;
    const duplicatedTaskData = {
        ...taskData,
        title: `${title} (Cópia)`,
        description: task.description,
        criteria: task.criteria,
        periodicity: task.periodicity,
    };
    try {
       await saveTask(duplicatedTaskData as Omit<Task, 'id'>);
      toast({ title: "Sucesso", description: "Tarefa duplicada com sucesso." });
      await loadTasks();
    } catch (error) {
       console.error("Falha ao duplicar tarefa:", error);
       toast({ title: "Erro", description: "Falha ao duplicar tarefa.", variant: "destructive" });
    }
  };

  const openEditForm = (task: Task) => {
    setSelectedTask(task);
    setIsFormOpen(true);
  };

   const openAddForm = () => {
    setSelectedTask(null);
    setIsFormOpen(true);
  };


  return (
     <div className="space-y-6"> {/* Main container */}
       <Card>
         <CardHeader>
             <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5" /> Gestão de Tarefas do Checklist
             </CardTitle>
            <CardDescription>Adicione, edite e atribua tarefas que serão avaliadas diariamente.</CardDescription>
         </CardHeader>
         <CardContent>
            {isLoading ? (
                 <div className="flex justify-center items-center py-10">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
                 </div>
            ) : (
                <DataTable
                    columns={columns}
                    data={tasks}
                    filterColumn="title"
                    filterPlaceholder="Buscar por título..."
                />
            )}
         </CardContent>
          <CardFooter className="flex justify-end">
                <Button onClick={openAddForm}>
                   <PlusCircle className="mr-2 h-4 w-4" />
                   Adicionar Tarefa
                </Button>
          </CardFooter>
       </Card>

       <TaskForm
          task={selectedTask}
          onSave={handleSaveTask}
          open={isFormOpen}
          onOpenChange={setIsFormOpen}
        />

       <AlertDialog open={isDeleting} onOpenChange={setIsDeleting}>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>Confirmar Remoção</AlertDialogTitle>
                <AlertDialogDescription>
                    Tem certeza que deseja remover a tarefa "{taskToDelete?.title}"? Esta ação não pode ser desfeita.
                </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setTaskToDelete(null)}>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Remover
                </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}
