
'use client';

import * as React from 'react';
import { useState, useEffect } from 'react'; // Added missing React imports
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, Edit, Trash2, ListTodo, FileText, Award, Loader2, Filter, Building, Tag, Repeat, AlertCircle } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import type { Task } from '@/services/task';
import {
    getAllTasks,
    addTask,
    updateTask,
    deleteTask,
    getUsedTaskCategories // Optional: for category dropdown
} from '@/services/task';
import type { Department } from '@/services/department';
import { getAllDepartments } from '@/services/department'; // To populate dropdown

// Define constants for select options
const priorities: Task['priority'][] = ["Baixa", "Média", "Alta", "Crítica"];
const periodicities: Task['periodicity'][] = ["Diária", "Semanal", "Mensal", "Específica"]; // Corrected typo

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [categories, setCategories] = useState<string[]>([]); // For category filter/dropdown
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filterDepartment, setFilterDepartment] = useState<string>("Todos");
  const { toast } = useToast();

  // Fetch initial data (tasks, departments, categories)
  const loadInitialData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch all departments for the filter/dropdowns
      const fetchedDepartments = await getAllDepartments();
      setDepartments(fetchedDepartments);

      // Fetch tasks based on the current filter
      const fetchedTasks = await getAllTasks(filterDepartment === "Todos" ? undefined : filterDepartment);
      setTasks(fetchedTasks);

      // Fetch used categories (optional, could be static list)
      const usedCategories = await getUsedTaskCategories();
      setCategories(usedCategories);

    } catch (error) {
      console.error("Falha ao carregar dados iniciais:", error);
      toast({ title: "Erro", description: "Falha ao carregar dados iniciais.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast, filterDepartment]); // Depend on filterDepartment to refetch tasks

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]); // Rerun when loadInitialData changes (due to filter change)


  const handleEdit = (task: Task) => {
    setSelectedTask({ ...task }); // Clone for safe editing
    setIsEditDialogOpen(true);
  };

  const handleDelete = (task: Task) => {
    setSelectedTask(task);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedTask) return;
    setIsSubmitting(true);
    try {
      await deleteTask(selectedTask.id);
      setTasks(tasks.filter(t => t.id !== selectedTask.id)); // Update local state
      toast({ title: "Sucesso", description: `Tarefa "${selectedTask.title}" excluída.` });
      setIsDeleteDialogOpen(false);
      setSelectedTask(null);
    } catch (error: any) {
      console.error("Falha ao excluir tarefa:", error);
      toast({ title: "Erro", description: error.message || "Falha ao excluir tarefa.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

   const handleAddTask = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const newTaskData: Omit<Task, 'id'> = {
        title: formData.get('title') as string,
        description: formData.get('description') as string,
        department: formData.get('department') as string,
        criteria: formData.get('criteria') as string || undefined,
        category: formData.get('category') as string || undefined,
        priority: formData.get('priority') as Task['priority'] || undefined,
        periodicity: formData.get('periodicity') as Task['periodicity'] || undefined,
    };

    // Basic Frontend Validation (Service has more)
    if (!newTaskData.title || !newTaskData.description || !newTaskData.department) {
       toast({ title: "Erro de Validação", description: "Título, Descrição e Departamento são obrigatórios.", variant: "destructive" });
       return;
    }

    setIsSubmitting(true);
    try {
        const addedTask = await addTask(newTaskData);
         // Add to local state only if it matches the current filter or if filter is 'Todos'
        if (filterDepartment === "Todos" || addedTask.department === filterDepartment) {
            setTasks(prevTasks => [...prevTasks, addedTask]);
        }
        toast({ title: "Sucesso", description: `Tarefa "${addedTask.title}" adicionada.` });
        setIsAddDialogOpen(false);
        event.currentTarget.reset(); // Reset form
    } catch (error: any) {
        console.error("Falha ao adicionar tarefa:", error);
        toast({ title: "Erro", description: error.message || "Falha ao adicionar tarefa.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

   const handleUpdateTask = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
     if (!selectedTask) return;

    const formData = new FormData(event.currentTarget);
    const updatedData: Partial<Omit<Task, 'id'>> = {
        title: formData.get('edit-title') as string,
        description: formData.get('edit-description') as string,
        department: formData.get('edit-department') as string,
        criteria: formData.get('edit-criteria') as string || undefined,
        category: formData.get('edit-category') as string || undefined,
        priority: formData.get('edit-priority') as Task['priority'] || undefined,
        periodicity: formData.get('edit-periodicity') as Task['periodicity'] || undefined,
    };

     // Basic Frontend Validation
    if (!updatedData.title || !updatedData.description || !updatedData.department) {
       toast({ title: "Erro de Validação", description: "Título, Descrição e Departamento são obrigatórios.", variant: "destructive" });
       return;
    }

     // Create object with only changed fields
    const changes: Partial<Omit<Task, 'id'>> = {};
    (Object.keys(updatedData) as Array<keyof typeof updatedData>).forEach(key => {
        // Check if the value actually changed, handling undefined/null cases
        if (updatedData[key] !== selectedTask[key] && !(updatedData[key] === undefined && selectedTask[key] == null)) {
             changes[key] = updatedData[key] as any;
        }
    });


    if (Object.keys(changes).length === 0) {
        setIsEditDialogOpen(false); // No changes
        setSelectedTask(null);
        return;
    }

    setIsSubmitting(true);
    try {
        const updatedTaskResult = await updateTask(selectedTask.id, changes);
        // Update local state: either update the item or remove if department changed and doesn't match filter
         if (filterDepartment === "Todos" || updatedTaskResult.department === filterDepartment) {
             setTasks(tasks.map(t => t.id === updatedTaskResult.id ? updatedTaskResult : t));
         } else {
             // Remove from view if department changed and no longer matches filter
             setTasks(tasks.filter(t => t.id !== updatedTaskResult.id));
         }

        toast({ title: "Sucesso", description: `Tarefa "${updatedTaskResult.title}" atualizada.` });
        setIsEditDialogOpen(false);
        setSelectedTask(null);
     } catch (error: any) {
        console.error("Falha ao atualizar tarefa:", error);
        toast({ title: "Erro", description: error.message || "Falha ao atualizar tarefa.", variant: "destructive" });
     } finally {
       setIsSubmitting(false);
     }
  };


  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4">
          <div className="flex-1">
            <CardTitle>Gerenciamento de Tarefas</CardTitle>
            <CardDescription>Visualize, adicione, edite ou remova tarefas do checklist diário.</CardDescription>
          </div>
           <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
                 <div className="flex items-center gap-1 w-full sm:w-auto">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <Select value={filterDepartment} onValueChange={setFilterDepartment} disabled={isLoading}>
                        <SelectTrigger className="min-w-[160px] w-full sm:w-auto">
                            <SelectValue placeholder="Filtrar por Depto." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Todos">Todos Deptos.</SelectItem>
                            <SelectItem value="Geral">Geral (Empresa)</SelectItem>
                            {departments.map((dept) => (
                            <SelectItem key={dept.id} value={dept.name}>{dept.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                 </div>

                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                    <DialogTrigger asChild>
                        <Button size="sm" className="gap-1 w-full sm:w-auto" disabled={isLoading || isSubmitting}>
                        <PlusCircle className="h-4 w-4" />
                        Adicionar Tarefa
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-2xl"> {/* Wider dialog */}
                        <DialogHeader>
                            <DialogTitle>Adicionar Nova Tarefa</DialogTitle>
                            <DialogDescription>
                                Preencha os detalhes da nova tarefa. Campos marcados com * são obrigatórios.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleAddTask}>
                             <fieldset disabled={isSubmitting} className="grid gap-4 py-4 sm:grid-cols-2 sm:gap-x-6">
                                <div className="space-y-2 sm:col-span-2">
                                    <Label htmlFor="title" className="flex items-center gap-1">
                                        <ListTodo className="h-4 w-4"/> Título *
                                    </Label>
                                    <Input id="title" name="title" required placeholder="Ex: Verificar emails e responder pendências"/>
                                </div>
                                <div className="space-y-2 sm:col-span-2">
                                    <Label htmlFor="description" className="flex items-center gap-1">
                                       <FileText className="h-4 w-4"/> Descrição *
                                    </Label>
                                    <Textarea id="description" name="description" required placeholder="Descreva a tarefa em detalhes..." rows={3}/>
                                </div>
                                 <div className="space-y-2">
                                    <Label htmlFor="department" className="flex items-center gap-1">
                                       <Building className="h-4 w-4"/> Departamento *
                                    </Label>
                                    <Select name="department" required>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione o departamento" />
                                        </SelectTrigger>
                                        <SelectContent>
                                             <SelectItem value="Geral">Geral (Para todos)</SelectItem>
                                            {departments.map((dept) => (
                                            <SelectItem key={dept.id} value={dept.name}>{dept.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <p className="text-xs text-muted-foreground">Escolha 'Geral' se a tarefa aplica-se a todos.</p>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="category" className="flex items-center gap-1">
                                        <Tag className="h-4 w-4"/> Categoria (Opcional)
                                    </Label>
                                    {/* Using datalist for suggestions + free text */}
                                     <Input id="category" name="category" list="category-suggestions" placeholder="Ex: Comunicação, Administrativo" />
                                     <datalist id="category-suggestions">
                                        {categories.map(cat => <option key={cat} value={cat} />)}
                                        {/* Add common defaults */}
                                        <option value="Comunicação" />
                                        <option value="Relatórios" />
                                        <option value="Organização" />
                                     </datalist>
                                </div>
                                <div className="space-y-2 sm:col-span-2">
                                    <Label htmlFor="criteria" className="flex items-center gap-1">
                                        <Award className="h-4 w-4" /> Critérios para Nota 10 (Opcional)
                                    </Label>
                                    <Textarea id="criteria" name="criteria" placeholder="Descreva o que define a execução perfeita desta tarefa..." rows={2}/>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="priority" className="flex items-center gap-1">
                                        <AlertCircle className="h-4 w-4"/> Prioridade (Opcional)
                                    </Label>
                                     <Select name="priority" defaultValue="Média">
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione a prioridade" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {priorities.map((p) => (
                                            <SelectItem key={p} value={p}>{p}</SelectItem>
                                            ))}
                                        </SelectContent>
                                     </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="periodicity" className="flex items-center gap-1">
                                        <Repeat className="h-4 w-4"/> Periodicidade (Opcional)
                                    </Label>
                                     <Select name="periodicity" defaultValue="Diária">
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione a periodicidade" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {periodicities.map((p) => (
                                            <SelectItem key={p} value={p}>{p}</SelectItem>
                                            ))}
                                        </SelectContent>
                                     </Select>
                                </div>

                            </fieldset>
                            <DialogFooter className="mt-4">
                                <DialogClose asChild>
                                    <Button type="button" variant="outline" disabled={isSubmitting}>Cancelar</Button>
                                </DialogClose>
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {isSubmitting ? 'Salvando...' : 'Salvar Tarefa'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
           </div>
        </CardHeader>
      <CardContent>
         {isLoading ? (
            <div className="flex justify-center items-center p-10">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : tasks.length === 0 ? (
            <div className="text-center p-6 text-muted-foreground">
                Nenhuma tarefa encontrada {filterDepartment !== "Todos" ? `para o departamento "${filterDepartment}"` : 'para os filtros selecionados'}.
            </div>
          ) : (
            <Table>
            <TableHeader>
                <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Departamento</TableHead>
                <TableHead className="hidden md:table-cell">Descrição</TableHead>
                <TableHead className="hidden lg:table-cell">Categoria</TableHead>
                <TableHead className="hidden lg:table-cell">Prioridade</TableHead>
                <TableHead className="text-right w-[100px]">Ações</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {tasks.map((task) => (
                <TableRow key={task.id}>
                    <TableCell className="font-medium">{task.title}</TableCell>
                    <TableCell>{task.department}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground truncate max-w-xs">{task.description}</TableCell>
                    <TableCell className="hidden lg:table-cell text-xs">{task.category || '-'}</TableCell>
                    <TableCell className="hidden lg:table-cell text-xs">{task.priority || '-'}</TableCell>
                    <TableCell className="text-right space-x-1">
                        <Dialog open={isEditDialogOpen && selectedTask?.id === task.id} onOpenChange={(open) => { if (!open) { setSelectedTask(null); setIsEditDialogOpen(false); } else { setIsEditDialogOpen(true); } }}>
                        <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(task)} disabled={isSubmitting} title="Editar">
                            <Edit className="h-4 w-4" />
                            </Button>
                        </DialogTrigger>
                            <DialogContent className="sm:max-w-2xl">
                            <DialogHeader>
                            <DialogTitle>Editar Tarefa</DialogTitle>
                            <DialogDescription>
                                Atualize os detalhes da tarefa.
                            </DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleUpdateTask}>
                                <fieldset disabled={isSubmitting} className="grid gap-4 py-4 sm:grid-cols-2 sm:gap-x-6">
                                    <div className="space-y-2 sm:col-span-2">
                                        <Label htmlFor="edit-title" className="flex items-center gap-1">
                                            <ListTodo className="h-4 w-4"/> Título *
                                        </Label>
                                        <Input id="edit-title" name="edit-title" defaultValue={selectedTask?.title} required />
                                    </div>
                                    <div className="space-y-2 sm:col-span-2">
                                        <Label htmlFor="edit-description" className="flex items-center gap-1">
                                        <FileText className="h-4 w-4"/> Descrição *
                                        </Label>
                                        <Textarea id="edit-description" name="edit-description" defaultValue={selectedTask?.description} required rows={3}/>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="edit-department" className="flex items-center gap-1">
                                        <Building className="h-4 w-4"/> Departamento *
                                        </Label>
                                        <Select name="edit-department" defaultValue={selectedTask?.department} required>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecione o departamento" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                 <SelectItem value="Geral">Geral (Para todos)</SelectItem>
                                                {departments.map((dept) => (
                                                <SelectItem key={dept.id} value={dept.name}>{dept.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="edit-category" className="flex items-center gap-1">
                                            <Tag className="h-4 w-4"/> Categoria (Opcional)
                                        </Label>
                                        <Input id="edit-category" name="edit-category" list="category-suggestions" defaultValue={selectedTask?.category || ''} />
                                        {/* Datalist defined in add form is reused */}
                                    </div>
                                    <div className="space-y-2 sm:col-span-2">
                                        <Label htmlFor="edit-criteria" className="flex items-center gap-1">
                                            <Award className="h-4 w-4" /> Critérios para Nota 10 (Opcional)
                                        </Label>
                                        <Textarea id="edit-criteria" name="edit-criteria" defaultValue={selectedTask?.criteria || ''} rows={2}/>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="edit-priority" className="flex items-center gap-1">
                                            <AlertCircle className="h-4 w-4"/> Prioridade (Opcional)
                                        </Label>
                                        <Select name="edit-priority" defaultValue={selectedTask?.priority || 'Média'}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {priorities.map((p) => (
                                                <SelectItem key={p} value={p}>{p}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="edit-periodicity" className="flex items-center gap-1">
                                            <Repeat className="h-4 w-4"/> Periodicidade (Opcional)
                                        </Label>
                                        <Select name="edit-periodicity" defaultValue={selectedTask?.periodicity || 'Diária'}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {periodicities.map((p) => (
                                                <SelectItem key={p} value={p}>{p}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </fieldset>
                                <DialogFooter className="mt-4">
                                    <DialogClose asChild>
                                        <Button type="button" variant="outline" disabled={isSubmitting}>Cancelar</Button>
                                    </DialogClose>
                                    <Button type="submit" disabled={isSubmitting}>
                                         {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                         {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                        </Dialog>

                        <Dialog open={isDeleteDialogOpen && selectedTask?.id === task.id} onOpenChange={(open) => { if (!open) { setSelectedTask(null); setIsDeleteDialogOpen(false); } else { setIsDeleteDialogOpen(true); } }}>
                        <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(task)} disabled={isSubmitting} title="Excluir">
                            <Trash2 className="h-4 w-4" />
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                            <DialogTitle>Confirmar Exclusão</DialogTitle>
                            <DialogDescription>
                                Tem certeza que deseja excluir a tarefa <strong>"{selectedTask?.title}"</strong>? Esta ação não pode ser desfeita.
                            </DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                            <DialogClose asChild>
                                    <Button variant="outline" disabled={isSubmitting}>Cancelar</Button>
                            </DialogClose>
                            <Button variant="destructive" onClick={handleConfirmDelete} disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {isSubmitting ? 'Excluindo...' : 'Confirmar Exclusão'}
                            </Button>
                            </DialogFooter>
                        </DialogContent>
                        </Dialog>
                    </TableCell>
                </TableRow>
                ))}
            </TableBody>
            </Table>
         )}
      </CardContent>
    </Card>
  );
}
