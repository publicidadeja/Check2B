'use client';

import * as React from 'react';
import { PlusCircle, Search, MoreHorizontal, Edit, Trash2, Copy } from 'lucide-react';
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

// Mock data (simulated API response) - Manter nomes em português
const mockTasks: Task[] = [
  { id: 't1', title: 'Verificar Emails', description: 'Responder a todos os emails pendentes.', criteria: 'Caixa de entrada zerada ou emails urgentes respondidos.', category: 'Comunicação', periodicity: 'daily', assignedTo: 'role', assignedEntityId: 'Recrutadora' },
  { id: 't2', title: 'Reunião Diária', description: 'Participar da reunião da equipe.', criteria: 'Presença e participação ativa.', category: 'Engenharia', periodicity: 'daily', assignedTo: 'department', assignedEntityId: 'Engenharia' },
  { id: 't3', title: 'Atualizar CRM', description: 'Registrar novas interações no CRM.', criteria: 'CRM atualizado com atividades do dia.', category: 'Vendas', periodicity: 'daily', assignedTo: 'role', assignedEntityId: 'Executivo de Contas' },
  { id: 't4', title: 'Postar em Redes Sociais', description: 'Agendar/publicar post planejado.', criteria: 'Post publicado conforme planejado.', category: 'Marketing', periodicity: 'specific_days', assignedTo: 'role', assignedEntityId: 'Analista de Marketing' },
  { id: 't5', title: 'Revisar Código', description: 'Revisar pull requests designados.', criteria: 'PRs revisados com feedback.', category: 'Engenharia', periodicity: 'daily', assignedTo: 'individual', assignedEntityId: '2' /* Beto Santos ID */ },
];

// Mock API functions
const fetchTasks = async (): Promise<Task[]> => {
  await new Promise(resolve => setTimeout(resolve, 500));
  return [...mockTasks]; // Return a copy
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
            id: `t${Date.now()}`, // Simple ID generation
            ...(taskData as Omit<Task, 'id'>), // Cast needed here
             // Ensure required fields have defaults if not provided, matching Task type
             periodicity: taskData.periodicity || 'daily', // Default if missing
             // Other required fields should be handled by the form validation
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
  const [filteredTasks, setFilteredTasks] = React.useState<Task[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedTask, setSelectedTask] = React.useState<Task | null>(null);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [taskToDelete, setTaskToDelete] = React.useState<Task | null>(null);

  const { toast } = useToast();

  const loadTasks = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchTasks();
      setTasks(data);
      setFilteredTasks(data);
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

   React.useEffect(() => {
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    const filtered = tasks.filter(task =>
      task.title.toLowerCase().includes(lowerCaseSearchTerm) ||
      task.description.toLowerCase().includes(lowerCaseSearchTerm) ||
      (task.category && task.category.toLowerCase().includes(lowerCaseSearchTerm)) ||
      (task.assignedTo && task.assignedTo.toLowerCase().includes(lowerCaseSearchTerm)) ||
      (task.assignedEntityId && task.assignedEntityId.toLowerCase().includes(lowerCaseSearchTerm))
    );
    setFilteredTasks(filtered);
  }, [searchTerm, tasks]);

  const handleSaveTask = async (data: any) => { // Type any for mock, define properly later
     const taskDataToSave = selectedTask ? { ...selectedTask, ...data } : data;
     try {
        await saveTask(taskDataToSave);
        setIsFormOpen(false);
        setSelectedTask(null);
        await loadTasks(); // Refresh list
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
    // Exclude ID and create a new title for duplication
    const { id, title, ...taskData } = task;
    const duplicatedTaskData = {
        ...taskData,
        title: `${title} (Cópia)`, // Indicate it's a copy
        // Ensure all required fields from Task type are present if needed
        description: task.description,
        criteria: task.criteria,
        periodicity: task.periodicity,
    };
    try {
       await saveTask(duplicatedTaskData as Omit<Task, 'id'>); // Cast as Omit<Task, 'id'>
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
    setSelectedTask(null); // Ensure no task is selected for adding
    setIsFormOpen(true);
  };

  const getAssignmentText = (task: Task): string => {
    if (!task.assignedTo) return 'Global';
    let typeText = '';
    switch (task.assignedTo) {
        case 'role': typeText = 'Função'; break;
        case 'department': typeText = 'Depto'; break;
        case 'individual': typeText = 'Indiv.'; break;
        default: typeText = task.assignedTo;
    }
    return `${typeText}${task.assignedEntityId ? `: ${task.assignedEntityId}` : ''}`;
  }

  const getPeriodicityText = (periodicity: Task['periodicity']): string => {
      switch (periodicity) {
          case 'daily': return 'Diária';
          case 'specific_days': return 'Dias Específicos';
          case 'specific_dates': return 'Datas Específicas';
          default: return periodicity;
      }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar por título, categoria, atribuição..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
         {/* Trigger Adicionar Tarefa */}
         <Button onClick={openAddForm}>
           <PlusCircle className="mr-2 h-4 w-4" />
           Adicionar Tarefa
         </Button>
      </div>

      <div className="flex-grow overflow-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Título</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Periodicidade</TableHead>
              <TableHead>Atribuído a</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10">
                  Carregando tarefas...
                </TableCell>
              </TableRow>
             ) : filteredTasks.length === 0 ? (
               <TableRow>
                  <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                    Nenhuma tarefa encontrada.
                  </TableCell>
              </TableRow>
             ) : (
              filteredTasks.map((task) => (
                <TableRow key={task.id}>
                  <TableCell className="font-medium">{task.title}</TableCell>
                  <TableCell>
                    {task.category ? <Badge variant="secondary">{task.category}</Badge> : '-'}
                  </TableCell>
                  <TableCell>{getPeriodicityText(task.periodicity)}</TableCell>
                  <TableCell>{getAssignmentText(task)}</TableCell>
                  <TableCell className="text-right">
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
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

       {/* Formulário de Tarefa (Dialog) */}
       <TaskForm
          task={selectedTask}
          onSave={handleSaveTask}
          open={isFormOpen}
          onOpenChange={setIsFormOpen}
        />

       {/* Confirmação de Remoção (AlertDialog) */}
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
