
'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, Edit, Trash2, Loader2, Mail, CalendarDays } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import type { Employee } from '@/services/employee';
import {
    getAllEmployees,
    addEmployee,
    updateEmployee,
    deleteEmployee
} from '@/services/employee';
import type { Department } from '@/services/department';
import { getAllDepartments } from '@/services/department'; // To populate dropdown

// Mock roles - In a real app, these might come from an API or config
const roles = ["Engenheiro de Software Júnior", "Engenheiro de Software Pleno", "Engenheiro de Software Sênior", "Gerente de Vendas", "Executivo de Contas", "Especialista em Marketing", "Analista de RH", "Analista de Recrutamento", "Designer UX/UI"];

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false); // For form submissions
  const { toast } = useToast();

  const loadInitialData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const [fetchedEmployees, fetchedDepartments] = await Promise.all([
        getAllEmployees(),
        getAllDepartments()
      ]);
      setEmployees(fetchedEmployees);
      setDepartments(fetchedDepartments);
    } catch (error) {
      console.error("Failed to fetch initial data:", error);
      toast({ title: "Erro", description: "Falha ao carregar colaboradores ou departamentos.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const handleEdit = (employee: Employee) => {
    setSelectedEmployee({ ...employee }); // Clone for safe editing
    setIsEditDialogOpen(true);
  };

  const handleDelete = (employee: Employee) => {
    setSelectedEmployee(employee);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedEmployee) return;
    setIsSubmitting(true);
    try {
      await deleteEmployee(selectedEmployee.id);
      setEmployees(employees.filter(emp => emp.id !== selectedEmployee.id));
      toast({ title: "Sucesso", description: `Colaborador "${selectedEmployee.name}" excluído.` });
      setIsDeleteDialogOpen(false);
      setSelectedEmployee(null);
    } catch (error: any) {
      console.error("Failed to delete employee:", error);
      toast({ title: "Erro", description: error.message || "Falha ao excluir colaborador.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

   const handleAddEmployee = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const newEmployeeData: Omit<Employee, 'id'> = {
        name: formData.get('name') as string,
        department: formData.get('department') as string,
        role: formData.get('role') as string,
        email: formData.get('email') as string || undefined, // Handle optional field
        admissionDate: formData.get('admissionDate') as string || undefined, // Handle optional field
    };

    // Basic Frontend Validation (service has more robust validation)
    if (!newEmployeeData.name || !newEmployeeData.department || !newEmployeeData.role) {
       toast({ title: "Erro de Validação", description: "Nome, Departamento e Função são obrigatórios.", variant: "destructive" });
       return;
    }
    if (newEmployeeData.email && !/\S+@\S+\.\S+/.test(newEmployeeData.email)) {
        toast({ title: "Erro de Validação", description: "Formato de email inválido.", variant: "destructive" });
        return;
    }
     // Optional: Basic date format check if needed client-side

    setIsSubmitting(true);
    try {
        const addedEmployee = await addEmployee(newEmployeeData);
        setEmployees([...employees, addedEmployee]); // Add to local state
        toast({ title: "Sucesso", description: `Colaborador "${addedEmployee.name}" adicionado.` });
        setIsAddDialogOpen(false);
        event.currentTarget.reset(); // Reset form
    } catch (error: any) {
        console.error("Failed to add employee:", error);
        toast({ title: "Erro", description: error.message || "Falha ao adicionar colaborador.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

   const handleUpdateEmployee = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
     if (!selectedEmployee) return;

    const formData = new FormData(event.currentTarget);
    const updatedData: Partial<Omit<Employee, 'id'>> = {
        name: formData.get('edit-name') as string,
        department: formData.get('edit-department') as string,
        role: formData.get('edit-role') as string,
        email: formData.get('edit-email') as string || undefined,
        admissionDate: formData.get('edit-admissionDate') as string || undefined,
    };

     // Basic Frontend Validation
    if (!updatedData.name || !updatedData.department || !updatedData.role) {
       toast({ title: "Erro de Validação", description: "Nome, Departamento e Função são obrigatórios.", variant: "destructive" });
       return;
    }
    if (updatedData.email && !/\S+@\S+\.\S+/.test(updatedData.email)) {
        toast({ title: "Erro de Validação", description: "Formato de email inválido.", variant: "destructive" });
        return;
    }

     // Create object with only changed fields to send to API
    const changes: Partial<Omit<Employee, 'id'>> = {};
    (Object.keys(updatedData) as Array<keyof typeof updatedData>).forEach(key => {
        if (updatedData[key] !== selectedEmployee[key] && !(updatedData[key] === undefined && selectedEmployee[key] == null)) { // check for actual changes, handling undefined/null
             changes[key] = updatedData[key] as any; // Type assertion needed here
        }
    });


    if (Object.keys(changes).length === 0) {
        setIsEditDialogOpen(false); // No changes, just close
         setSelectedEmployee(null);
        return;
    }


    setIsSubmitting(true);
    try {
        const updatedEmployee = await updateEmployee(selectedEmployee.id, changes);
        setEmployees(employees.map(emp =>
           emp.id === updatedEmployee.id ? updatedEmployee : emp // Update local state
        ));
        toast({ title: "Sucesso", description: `Dados de "${updatedEmployee.name}" atualizados.` });
        setIsEditDialogOpen(false);
        setSelectedEmployee(null);
     } catch (error: any) {
        console.error("Failed to update employee:", error);
        toast({ title: "Erro", description: error.message || "Falha ao atualizar colaborador.", variant: "destructive" });
     } finally {
       setIsSubmitting(false);
     }
  };


  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Gerenciamento de Colaboradores</CardTitle>
          <CardDescription>Visualize, adicione, edite ou remova colaboradores.</CardDescription>
        </div>
         <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
           <DialogTrigger asChild>
            <Button size="sm" className="gap-1" disabled={isLoading || isSubmitting}>
              <PlusCircle className="h-4 w-4" />
              Adicionar Colaborador
            </Button>
          </DialogTrigger>
           <DialogContent className="sm:max-w-lg"> {/* Increased width */}
             <DialogHeader>
               <DialogTitle>Adicionar Novo Colaborador</DialogTitle>
               <DialogDescription>
                 Preencha os dados do novo colaborador. Clique em salvar quando terminar.
               </DialogDescription>
             </DialogHeader>
              <form onSubmit={handleAddEmployee}>
                <fieldset disabled={isSubmitting} className="grid gap-4 py-4 sm:grid-cols-2 sm:gap-x-6">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome Completo</Label>
                    <Input id="name" name="name" required placeholder="Ex: Ana Silva"/>
                  </div>
                   <div className="space-y-2">
                    <Label htmlFor="email" className="flex items-center gap-1">
                        <Mail className="h-3 w-3 text-muted-foreground"/> Email (Opcional)
                    </Label>
                    <Input id="email" name="email" type="email" placeholder="Ex: ana.silva@empresa.com"/>
                  </div>
                   <div className="space-y-2">
                    <Label htmlFor="department">Departamento</Label>
                    <Select name="department" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o departamento" />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map((dept) => (
                          <SelectItem key={dept.id} value={dept.name}>{dept.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                   <div className="space-y-2">
                    <Label htmlFor="role">Função</Label>
                    <Select name="role" required>
                       <SelectTrigger>
                         <SelectValue placeholder="Selecione a função" />
                       </SelectTrigger>
                       <SelectContent>
                         {/* Consider using datalist or allowing free text + selection */}
                         {roles.map((role) => (
                           <SelectItem key={role} value={role}>{role}</SelectItem>
                         ))}
                       </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="admissionDate" className="flex items-center gap-1">
                         <CalendarDays className="h-3 w-3 text-muted-foreground"/> Data de Admissão (Opcional)
                    </Label>
                    <Input id="admissionDate" name="admissionDate" type="date" />
                  </div>
                </fieldset>
                <DialogFooter className="mt-4">
                   <DialogClose asChild>
                        <Button type="button" variant="outline" disabled={isSubmitting}>Cancelar</Button>
                   </DialogClose>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isSubmitting ? 'Salvando...' : 'Salvar Colaborador'}
                  </Button>
                </DialogFooter>
              </form>
           </DialogContent>
         </Dialog>
      </CardHeader>
      <CardContent>
         {isLoading ? (
            <div className="flex justify-center items-center p-10">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
         ) : employees.length === 0 ? (
              <p className="text-center text-muted-foreground p-4">Nenhum colaborador cadastrado.</p>
         ) : (
            <Table>
            <TableHeader>
                <TableRow>
                <TableHead className="w-[60px]">Avatar</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead className="hidden sm:table-cell">Email</TableHead>
                <TableHead>Departamento</TableHead>
                <TableHead>Função</TableHead>
                <TableHead className="hidden lg:table-cell">Admissão</TableHead>
                <TableHead className="text-right w-[100px]">Ações</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {employees.map((employee) => (
                <TableRow key={employee.id}>
                    <TableCell>
                    <Avatar className="h-9 w-9">
                         <AvatarImage src={`https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(employee.name)}`} alt={employee.name} />
                         <AvatarFallback>{employee.name.substring(0, 1).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    </TableCell>
                    <TableCell className="font-medium">{employee.name}</TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground text-xs">{employee.email || '-'}</TableCell>
                    <TableCell>{employee.department}</TableCell>
                    <TableCell>{employee.role}</TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground text-xs">
                       {employee.admissionDate ? new Date(employee.admissionDate + 'T00:00:00').toLocaleDateString('pt-BR') : '-'}
                     </TableCell>
                    <TableCell className="text-right space-x-1">
                        <Dialog open={isEditDialogOpen && selectedEmployee?.id === employee.id} onOpenChange={(open) => { if (!open) { setSelectedEmployee(null); setIsEditDialogOpen(false); } else { setIsEditDialogOpen(true); }}}>
                        <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(employee)} disabled={isSubmitting} title="Editar">
                            <Edit className="h-4 w-4" />
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-lg">
                            <DialogHeader>
                            <DialogTitle>Editar Colaborador</DialogTitle>
                            <DialogDescription>
                                Atualize os dados do colaborador. Clique em salvar quando terminar.
                            </DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleUpdateEmployee}>
                                <fieldset disabled={isSubmitting} className="grid gap-4 py-4 sm:grid-cols-2 sm:gap-x-6">
                                   <div className="space-y-2">
                                    <Label htmlFor="edit-name">Nome Completo</Label>
                                    <Input id="edit-name" name="edit-name" defaultValue={selectedEmployee?.name} required />
                                    </div>
                                    <div className="space-y-2">
                                    <Label htmlFor="edit-email" className="flex items-center gap-1">
                                         <Mail className="h-3 w-3 text-muted-foreground"/> Email (Opcional)
                                    </Label>
                                    <Input id="edit-email" name="edit-email" type="email" defaultValue={selectedEmployee?.email || ''} />
                                    </div>
                                    <div className="space-y-2">
                                    <Label htmlFor="edit-department">Departamento</Label>
                                    <Select name="edit-department" defaultValue={selectedEmployee?.department} required>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione o departamento" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {departments.map((dept) => (
                                        <SelectItem key={dept.id} value={dept.name}>{dept.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                    </Select>
                                    </div>
                                    <div className="space-y-2">
                                    <Label htmlFor="edit-role">Função</Label>
                                    <Select name="edit-role" defaultValue={selectedEmployee?.role} required>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione a função" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {roles.map((role) => (
                                        <SelectItem key={role} value={role}>{role}</SelectItem>
                                        ))}
                                    </SelectContent>
                                    </Select>
                                    </div>
                                    <div className="space-y-2 sm:col-span-2">
                                     <Label htmlFor="edit-admissionDate" className="flex items-center gap-1">
                                        <CalendarDays className="h-3 w-3 text-muted-foreground"/> Data de Admissão (Opcional)
                                    </Label>
                                    <Input id="edit-admissionDate" name="edit-admissionDate" type="date" defaultValue={selectedEmployee?.admissionDate || ''} />
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

                        <Dialog open={isDeleteDialogOpen && selectedEmployee?.id === employee.id} onOpenChange={(open) => { if (!open) { setSelectedEmployee(null); setIsDeleteDialogOpen(false); } else { setIsDeleteDialogOpen(true); }}}>
                        <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(employee)} disabled={isSubmitting} title="Excluir">
                            <Trash2 className="h-4 w-4" />
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                            <DialogTitle>Confirmar Exclusão</DialogTitle>
                            <DialogDescription>
                                Tem certeza que deseja excluir o colaborador <strong>{selectedEmployee?.name}</strong>? Esta ação não pode ser desfeita.
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
