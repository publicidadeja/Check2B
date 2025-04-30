'use client';

import * as React from 'react';
import { PlusCircle, Search, MoreHorizontal, Edit, Trash2, Copy, CheckSquare, Square } from 'lucide-react';
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
import { TaskForm } from '@/components/task/task-form'; // Import the TaskForm component
import type { Task } from '@/types/task'; // Import Task type
import { useToast } from '@/hooks/use-toast';

// Mock data - replace with API calls
const mockTasks: Task[] = [
  { id: 't1', title: 'Verificar Emails', description: 'Responder a todos os emails pendentes na caixa de entrada principal.', criteria: 'Caixa de entrada zerada ou todos os emails urgentes respondidos.', category: 'Comunicação', periodicity: 'daily', assignedTo: 'role', assignedEntityId: 'recrutador' },
  { id: 't2', title: 'Reunião Diária de Sincronização', description: 'Participar da reunião diária da equipe de engenharia.', criteria: 'Presença e participação ativa na reunião.', category: 'Engenharia', periodicity: 'daily', assignedTo: 'department', assignedEntityId: 'engenharia' },
  { id: 't3', title: 'Atualizar Pipeline de Vendas', description: 'Registrar todas as novas interações e atualizações de status no CRM.', criteria: 'CRM atualizado com todas as atividades do dia anterior.', category: 'Vendas', periodicity: 'daily', assignedTo: 'role', assignedEntityId: 'executivo_contas' },
  { id: 't4', title: 'Publicar Conteúdo Redes Sociais', description: 'Agendar ou publicar o post planejado para o dia.', criteria: 'Post publicado na(s) plataforma(s) definida(s).', category: 'Marketing', periodicity: 'specific_days', /* Add specific days config */ assignedTo: 'role', assignedEntityId: 'analista_marketing' },
  { id: 't5', title: 'Revisar Código Pendente', description: 'Revisar pull requests abertos designados a você.', criteria: 'Todos os PRs na fila de revisão analisados e com feedback.', category: 'Engenharia', periodicity: 'daily', assignedTo: 'individual', assignedEntityId: '2' /* Bob Santos */ },
];

// Mock API functions - replace with actual API calls
const fetchTasks = async (): Promise<Task[]> => {
  await new Promise(resolve => setTimeout(resolve, 500));
  return mockTasks;
};

const saveTask = async (taskData: Omit<Task, 'id'> | Task): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    if ('id' in taskData) {
        const index = mockTasks.findIndex(t => t.id === taskData.id);
        if (index !== -1) {
            mockTasks[index] = { ...mockTasks[index], ...taskData };
            console.log("Updated task:", mockTasks[index]);
        } else {
            throw new Error("Task not found for update");
        }
    } else {
        const newTask: Task = {
            id: `t${Date.now()}`, // Simple ID generation
            ...taskData,
        };
        mockTasks.push(newTask);
        console.log("Added new task:", newTask);
    }
};

const deleteTask = async (taskId: string): Promise<void> => {
     await new Promise(resolve => setTimeout(resolve, 500));
    const index = mockTasks.findIndex(t => t.id === taskId);
    if (index !== -1) {
        mockTasks.splice(index, 1);
        console.log("Deleted task with ID:", taskId);
    } else {
         throw new Error("Task not found for deletion");
    }
};


export default function TasksPage() {
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [filteredTasks, setFilteredTasks] = React.useState<Task[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedTask, setSelectedTask] = React.useState<Task | null>(null);
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
      console.error("Failed to fetch tasks:", error);
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
      (task.assignedTo && task.assignedTo.toLowerCase().includes(lowerCaseSearchTerm))
    );
    setFilteredTasks(filtered);
  }, [searchTerm, tasks]);

  const handleSaveTask = async (data: any) => { // Use 'any' for mock
     const taskDataToSave = selectedTask ? { ...selectedTask, ...data } : data;
    await saveTask(taskDataToSave);
    setSelectedTask(null);
    await loadTasks(); // Refresh list
     // Note: TaskForm closing is handled internally by the form now
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
         console.error("Failed to delete task:", error);
         toast({ title: "Erro", description: "Falha ao remover tarefa.", variant: "destructive" });
      } finally {
         setIsDeleting(false);
         setTaskToDelete(null);
      }
    }
  };

   const handleDuplicateTask = async (task: Task) => {
    const { id, ...taskData } = task; // Exclude ID for duplication
    try {
       await saveTask({
            ...taskData,
            title: `${task.title} (Cópia)`, // Indicate it's a copy
       });
      toast({ title: "Sucesso", description: "Tarefa duplicada com sucesso." });
      await loadTasks();
    } catch (error) {
       console.error("Failed to duplicate task:", error);
       toast({ title: "Erro", description: "Falha ao duplicar tarefa.", variant: "destructive" });
    }
  };


  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar por título, categoria..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
         {/* Use TaskForm trigger for adding */}
        <TaskForm onSave={handleSaveTask} />
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
                <TableCell colSpan={5} className="text-center">
                  Carregando tarefas...
                </TableCell>
              </TableRow>
             ) : filteredTasks.length === 0 ? (
               <TableRow>
                  <TableCell colSpan={5} className="text-center">
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
                  <TableCell className="capitalize">{task.periodicity.replace('_', ' ')}</TableCell>
                  <TableCell className="capitalize">
                     {task.assignedTo ? `${task.assignedTo}${task.assignedEntityId ? `: ${task.assignedEntityId}` : ''}` : 'Global'}
                  </TableCell>
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
                         {/* Use TaskForm trigger for editing */}
                         <TaskForm task={task} onSave={handleSaveTask}>
                             <DropdownMenuItem onSelect={(e) => e.preventDefault()}> {/* Prevent closing */}
                                <Edit className="mr-2 h-4 w-4" />
                                Editar
                             </DropdownMenuItem>
                        </TaskForm>
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

       {/* Delete Confirmation Dialog */}
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
