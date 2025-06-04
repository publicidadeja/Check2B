
// src/app/(admin)/tasks/page.tsx
'use client';

import * as React from 'react';
import { PlusCircle, MoreHorizontal, Edit, Trash2, Copy, ClipboardList, Loader2, Frown, AlertTriangle } from 'lucide-react'; // Added AlertTriangle
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'; // Keep Table specific imports
import { Button } from '@/components/ui/button';
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
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useAuth } from '@/hooks/use-auth';
import { getTasksByOrganization, saveTask as saveTaskToFirestore, deleteTask as deleteTaskFromFirestore } from '@/lib/task-service';

export default function TasksPage() {
  const { organizationId, role: adminRole } = useAuth();
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [selectedTask, setSelectedTask] = React.useState<Task | null>(null);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [taskToDelete, setTaskToDelete] = React.useState<Task | null>(null);
  const { toast } = useToast();

  const getAssignmentText = (task: Task): string => {
      if (!task.assignedTo || !task.assignedEntityId) return 'Global';
      let typeText = '';
      switch (task.assignedTo) {
          case 'role': typeText = 'Função'; break;
          case 'department': typeText = 'Depto'; break;
          case 'individual': typeText = 'Indiv.'; break;
          default: typeText = task.assignedTo;
      }
      // Displaying ID directly as fetching name requires additional service calls here
      return `${typeText}: ${task.assignedEntityId}`;
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
    { id: "title", accessorKey: "title", header: "Título", cell: ({ row }) => <span className="font-medium">{row.original.title}</span> },
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
    if (!organizationId || (adminRole !== 'admin' && adminRole !== 'super_admin')) {
      setIsLoading(false);
      setTasks([]);
        if (adminRole === 'admin' && !organizationId) {
             toast({ title: "Erro de Configuração", description: "Administrador não vinculado a uma organização.", variant: "destructive" });
        }
      return;
    }
    setIsLoading(true);
    try {
      const data = await getTasksByOrganization(organizationId);
      setTasks(data);
    } catch (error) {
      console.error("Falha ao carregar tarefas:", error);
      toast({ title: "Erro", description: "Falha ao carregar tarefas.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [organizationId, adminRole, toast]);

  React.useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const handleSaveTask = async (data: any) => { // data is TaskFormData from TaskForm
     if (!organizationId) {
         toast({ title: "Erro", description: "ID da organização não disponível.", variant: "destructive" });
         return;
     }
     const taskDataToSave: Omit<Task, 'id' | 'organizationId'> | Task = selectedTask
        ? { ...selectedTask, ...data, organizationId } 
        : { ...data, organizationId }; 

     try {
        await saveTaskToFirestore(organizationId, taskDataToSave);
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
    if (taskToDelete && organizationId) {
       try {
        await deleteTaskFromFirestore(organizationId, taskToDelete.id);
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
    if (!organizationId) return;
    const { id, title, ...taskData } = task; 
    const duplicatedTaskData = {
        ...taskData, 
        title: `${title} (Cópia)`,
    };
    try {
       await saveTaskToFirestore(organizationId, duplicatedTaskData as Omit<Task, 'id' | 'organizationId'>); 
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
     <div className="space-y-6">
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
                     <LoadingSpinner text="Carregando tarefas..." />
                 </div>
            ) : (!organizationId && (adminRole === 'admin' || adminRole === 'super_admin')) && !isLoading ? ( // Check if admin but no orgId
                 <div className="text-center py-10 text-muted-foreground">
                     <AlertTriangle className="mx-auto h-10 w-10 mb-2 text-yellow-500" />
                     <p>Administrador não vinculado a uma organização.</p>
                     <p className="text-xs">Não é possível carregar ou criar tarefas.</p>
                 </div>
            ) : tasks.length === 0 && organizationId ? ( // Check if orgId exists to allow creating first task
                <div className="text-center py-10 text-muted-foreground">
                    <Frown className="mx-auto h-10 w-10 mb-2" />
                    <p>Nenhuma tarefa encontrada para esta organização.</p>
                    <Button className="mt-4" onClick={openAddForm}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Criar Primeira Tarefa
                    </Button>
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
          { !isLoading && tasks.length > 0 && organizationId && (
              <CardFooter className="flex justify-end">
                    <Button onClick={openAddForm}>
                       <PlusCircle className="mr-2 h-4 w-4" />
                       Adicionar Tarefa
                    </Button>
              </CardFooter>
          )}
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

    