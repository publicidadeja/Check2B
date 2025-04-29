'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, Edit, Trash2, ListTodo, FileText, Award } from 'lucide-react';
import type { Task } from '@/services/task'; // Assuming types are defined here
import { getTasksByDepartment } from '@/services/task'; // Assuming API functions are here

// Mock departments and categories for select dropdowns
const departments = ["Engenharia", "Vendas", "Marketing", "RH", "Geral"];
const categories = ["Relatórios", "Reuniões", "Comunicação", "Desenvolvimento", "Vendas", "Suporte"];
const priorities = ["Baixa", "Média", "Alta", "Crítica"];
const periodicities = ["Diária", "Semanal", "Mensal", "Específica"];

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [filterDepartment, setFilterDepartment] = useState<string>("Todos"); // Initial filter state

  useEffect(() => {
    async function loadTasks() {
      try {
        // Fetch tasks based on filter, fetching all if 'Todos'
        // Using a placeholder department for now, replace with actual logic
        const fetchedTasks = await getTasksByDepartment(filterDepartment === "Todos" ? "Engenharia" : filterDepartment); // Replace with actual dynamic fetching logic
        setTasks(fetchedTasks);
      } catch (error) {
        console.error("Failed to fetch tasks:", error);
        // Handle error
      }
    }
    loadTasks();
  }, [filterDepartment]); // Re-fetch when filter changes

  const handleEdit = (task: Task) => {
    setSelectedTask(task);
    setIsEditDialogOpen(true);
  };

  const handleDelete = (task: Task) => {
    setSelectedTask(task);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    // TODO: Implement task deletion logic (call API)
    console.log("Deleting task:", selectedTask?.id);
     if (selectedTask) {
      setTasks(tasks.filter(t => t.id !== selectedTask.id)); // Optimistic UI update
    }
    setIsDeleteDialogOpen(false);
    setSelectedTask(null);
  };

   const handleAddTask = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const newTask: Omit<Task, 'id'> = {
        title: formData.get('title') as string,
        description: formData.get('description') as string,
        department: formData.get('department') as string,
        // Add other fields like category, priority, criteria
    };

    // TODO: Implement API call to add task
    const addedTask: Task = { ...newTask, id: String(Date.now()) }; // Mock ID generation
    console.log("Adding task:", addedTask);
    setTasks([...tasks, addedTask]);
     // Optionally reset filter or refetch if necessary based on added task's department
    if (filterDepartment !== "Todos" && addedTask.department !== filterDepartment) {
       // Potentially update filter or notify user
    } else if (filterDepartment === "Todos" || addedTask.department === filterDepartment){
         setTasks([...tasks, addedTask]);
    }
    setIsAddDialogOpen(false); // Close the dialog
  };

   const handleUpdateTask = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
     if (!selectedTask) return;

    const formData = new FormData(event.currentTarget);
    const updatedTaskData: Partial<Task> = {
        title: formData.get('title') as string,
        description: formData.get('description') as string,
        department: formData.get('department') as string,
        // Add other fields
    };

    // TODO: Implement API call to update task
    console.log("Updating task:", selectedTask.id, updatedTaskData);
     setTasks(tasks.map(t =>
       t.id === selectedTask.id ? { ...t, ...updatedTaskData } : t
     )); // Optimistic UI update
    setIsEditDialogOpen(false); // Close the dialog
     setSelectedTask(null);
  };


  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle>Gerenciamento de Tarefas</CardTitle>
            <CardDescription>Visualize, adicione, edite ou remova tarefas diárias.</CardDescription>
          </div>
           <div className="flex items-center gap-2">
                <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filtrar por Depto." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Todos">Todos Deptos.</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                    <DialogTrigger asChild>
                        <Button size="sm" className="gap-1">
                        <PlusCircle className="h-4 w-4" />
                        Adicionar Tarefa
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[600px]">
                        <DialogHeader>
                            <DialogTitle>Adicionar Nova Tarefa</DialogTitle>
                            <DialogDescription>
                                Preencha os detalhes da nova tarefa.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleAddTask}>
                            <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="title" className="text-right flex items-center gap-1">
                                        <ListTodo className="h-4 w-4"/> Título
                                    </Label>
                                    <Input id="title" name="title" required className="col-span-3" />
                                </div>
                                <div className="grid grid-cols-4 items-start gap-4">
                                    <Label htmlFor="description" className="text-right pt-2 flex items-center gap-1">
                                       <FileText className="h-4 w-4"/> Descrição
                                    </Label>
                                    <Textarea id="description" name="description" required className="col-span-3" />
                                </div>
                                 <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="department" className="text-right">
                                       Departamento
                                    </Label>
                                    <Select name="department" required>
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder="Selecione o departamento" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {departments.map((dept) => (
                                        <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                                        ))}
                                    </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid grid-cols-4 items-start gap-4">
                                    <Label htmlFor="criteria" className="text-right pt-2 flex items-center gap-1">
                                        <Award className="h-4 w-4" /> Critérios (Nota 10)
                                    </Label>
                                    <Textarea id="criteria" name="criteria" placeholder="Descreva o que constitui cumprimento satisfatório..." className="col-span-3" />
                                </div>
                                {/* Add fields for Category, Priority, Periodicity */}

                            </div>
                            <DialogFooter>
                                <DialogClose asChild>
                                    <Button type="button" variant="outline">Cancelar</Button>
                                </DialogClose>
                                <Button type="submit">Salvar Tarefa</Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
           </div>
        </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Título</TableHead>
              <TableHead>Departamento</TableHead>
              <TableHead>Descrição</TableHead>
              {/* Add headers for Category, Priority etc. if needed */}
              <TableHead className="text-right w-[100px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.map((task) => (
              <TableRow key={task.id}>
                <TableCell className="font-medium">{task.title}</TableCell>
                <TableCell>{task.department}</TableCell>
                <TableCell className="text-sm text-muted-foreground truncate max-w-xs">{task.description}</TableCell>
                 {/* Add cells for Category, Priority etc. */}
                <TableCell className="text-right">
                    <Dialog open={isEditDialogOpen && selectedTask?.id === task.id} onOpenChange={(open) => { if (!open) setSelectedTask(null); setIsEditDialogOpen(open); }}>
                       <DialogTrigger asChild>
                         <Button variant="ghost" size="icon" onClick={() => handleEdit(task)}>
                           <Edit className="h-4 w-4" />
                         </Button>
                       </DialogTrigger>
                        <DialogContent className="sm:max-w-[600px]">
                         <DialogHeader>
                           <DialogTitle>Editar Tarefa</DialogTitle>
                           <DialogDescription>
                             Atualize os detalhes da tarefa.
                           </DialogDescription>
                         </DialogHeader>
                          <form onSubmit={handleUpdateTask}>
                             <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="edit-title" className="text-right flex items-center gap-1">
                                        <ListTodo className="h-4 w-4"/> Título
                                    </Label>
                                    <Input id="edit-title" name="title" defaultValue={selectedTask?.title} required className="col-span-3" />
                                </div>
                                <div className="grid grid-cols-4 items-start gap-4">
                                     <Label htmlFor="edit-description" className="text-right pt-2 flex items-center gap-1">
                                       <FileText className="h-4 w-4"/> Descrição
                                    </Label>
                                    <Textarea id="edit-description" name="description" defaultValue={selectedTask?.description} required className="col-span-3" />
                                </div>
                                 <div className="grid grid-cols-4 items-center gap-4">
                                     <Label htmlFor="edit-department" className="text-right">
                                       Departamento
                                    </Label>
                                     <Select name="department" defaultValue={selectedTask?.department} required>
                                        <SelectTrigger className="col-span-3">
                                            <SelectValue placeholder="Selecione o departamento" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {departments.map((dept) => (
                                            <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                                            ))}
                                        </SelectContent>
                                     </Select>
                                </div>
                                 <div className="grid grid-cols-4 items-start gap-4">
                                    <Label htmlFor="edit-criteria" className="text-right pt-2 flex items-center gap-1">
                                        <Award className="h-4 w-4" /> Critérios (Nota 10)
                                    </Label>
                                     {/* Assuming criteria is part of the Task interface */}
                                    <Textarea id="edit-criteria" name="criteria" defaultValue={(selectedTask as any)?.criteria || ''} placeholder="Descreva o que constitui cumprimento satisfatório..." className="col-span-3" />
                                </div>
                                {/* Add other fields */}
                            </div>
                            <DialogFooter>
                                <DialogClose asChild>
                                    <Button type="button" variant="outline">Cancelar</Button>
                                </DialogClose>
                                <Button type="submit">Salvar Alterações</Button>
                            </DialogFooter>
                         </form>
                       </DialogContent>
                     </Dialog>

                    <Dialog open={isDeleteDialogOpen && selectedTask?.id === task.id} onOpenChange={(open) => { if (!open) setSelectedTask(null); setIsDeleteDialogOpen(open); }}>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(task)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                       <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Confirmar Exclusão</DialogTitle>
                          <DialogDescription>
                            Tem certeza que deseja excluir a tarefa <strong>{selectedTask?.title}</strong>? Esta ação não pode ser desfeita.
                          </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                           <DialogClose asChild>
                                <Button variant="outline">Cancelar</Button>
                           </DialogClose>
                          <Button variant="destructive" onClick={handleConfirmDelete}>Confirmar Exclusão</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
         {tasks.length === 0 && (
           <div className="text-center p-4 text-muted-foreground">
             Nenhuma tarefa encontrada para o departamento selecionado.
           </div>
         )}
      </CardContent>
    </Card>
  );
}
