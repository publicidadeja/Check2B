
'use client';

import * as React from 'react';
import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, Edit, Trash2, Loader2, Mail, CalendarDays, Briefcase } from 'lucide-react';
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
import type { Role } from '@/services/role'; // Import Role type
import { getAllRoles, addRole } from '@/services/role'; // Import role service functions
import { Combobox } from '@/components/ui/combobox'; // Import the Combobox

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [roles, setRoles] = useState<Role[]>([]); // State for roles
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false); // For form submissions
  const { toast } = useToast();

  // Form state for Add/Edit dialogs
  const [currentRole, setCurrentRole] = useState<string | undefined>(undefined);
  const [currentDepartment, setCurrentDepartment] = useState<string | undefined>(undefined);

  const loadInitialData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const [fetchedEmployees, fetchedDepartments, fetchedRoles] = await Promise.all([
        getAllEmployees(),
        getAllDepartments(),
        getAllRoles() // Fetch roles
      ]);
      setEmployees(fetchedEmployees);
      setDepartments(fetchedDepartments);
      setRoles(fetchedRoles); // Set roles state
    } catch (error) {
      console.error("Falha ao carregar dados iniciais:", error);
      toast({ title: "Erro", description: "Falha ao carregar colaboradores, departamentos ou funções.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const handleEdit = (employee: Employee) => {
    setSelectedEmployee({ ...employee }); // Clone for safe editing
    setCurrentRole(employee.role); // Set initial role for edit dialog
    setCurrentDepartment(employee.department); // Set initial department for edit dialog
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
      console.error("Falha ao excluir colaborador:", error);
      toast({ title: "Erro", description: error.message || "Falha ao excluir colaborador.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateRole = async (newRoleName: string) => {
      setIsSubmitting(true); // Indicate loading while creating role
      try {
          const newRole = await addRole(newRoleName);
          setRoles(prevRoles => [...prevRoles, newRole].sort((a, b) => a.name.localeCompare(b.name))); // Add new role to state and sort
          setCurrentRole(newRole.name); // Set the newly created role as selected in the current form
          toast({ title: "Sucesso", description: `Função "${newRole.name}" criada e selecionada.` });
      } catch (error: any) {
          console.error("Falha ao criar função:", error);
          toast({ title: "Erro ao Criar Função", description: error.message || "Não foi possível criar a nova função.", variant: "destructive" });
          // Optionally clear the combobox or keep the typed value? Decide based on UX preference.
          // setCurrentRole(undefined); // Clear selection if creation fails
      } finally {
          setIsSubmitting(false);
      }
  };

   const handleAddEmployee = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const newEmployeeData: Omit<Employee, 'id'> = {
        name: formData.get('name') as string,
        department: currentDepartment || '', // Use state variable
        role: currentRole || '', // Use state variable
        email: formData.get('email') as string || undefined,
        admissionDate: formData.get('admissionDate') as string || undefined,
    };

    // Basic Frontend Validation
    if (!newEmployeeData.name || !newEmployeeData.department || !newEmployeeData.role) {
       toast({ title: "Erro de Validação", description: "Nome, Departamento e Função são obrigatórios.", variant: "destructive" });
       return;
    }
    if (newEmployeeData.email && !/\S+@\S+\.\S+/.test(newEmployeeData.email)) {
        toast({ title: "Erro de Validação", description: "Formato de email inválido.", variant: "destructive" });
        return;
    }

    setIsSubmitting(true);
    try {
        const addedEmployee = await addEmployee(newEmployeeData);
        setEmployees(prev => [...prev, addedEmployee]); // Add to local state
        toast({ title: "Sucesso", description: `Colaborador "${addedEmployee.name}" adicionado.` });
        setIsAddDialogOpen(false);
        setCurrentRole(undefined); // Reset form state
        setCurrentDepartment(undefined);
        // event.currentTarget.reset(); // Standard reset might not clear controlled components well
    } catch (error: any) {
        console.error("Falha ao adicionar colaborador:", error);
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
        department: currentDepartment || '', // Use state variable
        role: currentRole || '', // Use state variable
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

    const changes: Partial<Omit<Employee, 'id'>> = {};
    (Object.keys(updatedData) as Array<keyof typeof updatedData>).forEach(key => {
        if (updatedData[key] !== selectedEmployee[key] && !(updatedData[key] === undefined && selectedEmployee[key] == null)) {
             changes[key] = updatedData[key] as any;
        }
    });

    if (Object.keys(changes).length === 0) {
        setIsEditDialogOpen(false);
        setSelectedEmployee(null);
        return;
    }

    setIsSubmitting(true);
    try {
        const updatedEmployee = await updateEmployee(selectedEmployee.id, changes);
        setEmployees(employees.map(emp =>
           emp.id === updatedEmployee.id ? updatedEmployee : emp
        ));
        toast({ title: "Sucesso", description: `Dados de "${updatedEmployee.name}" atualizados.` });
        setIsEditDialogOpen(false);
        setSelectedEmployee(null);
     } catch (error: any) {
        console.error("Falha ao atualizar colaborador:", error);
        toast({ title: "Erro", description: error.message || "Falha ao atualizar colaborador.", variant: "destructive" });
     } finally {
       setIsSubmitting(false);
     }
  };

   // Memoize options for comboboxes to prevent re-creation on every render
    const departmentOptions = useMemo(() => departments.map(dept => ({ label: dept.name, value: dept.name })), [departments]);
    const roleOptions = useMemo(() => roles.map(role => ({ label: role.name, value: role.name })), [roles]);


  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Gerenciamento de Colaboradores</CardTitle>
          <CardDescription>Visualize, adicione, edite ou remova colaboradores.</CardDescription>
        </div>
         <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
             setIsAddDialogOpen(open);
             if (!open) { // Reset form state on close
                 setCurrentRole(undefined);
                 setCurrentDepartment(undefined);
             }
          }}>
           <DialogTrigger asChild>
            <Button size="sm" className="gap-1" disabled={isLoading || isSubmitting}>
              <PlusCircle className="h-4 w-4" />
              Adicionar Colaborador
            </Button>
          </DialogTrigger>
           <DialogContent className="sm:max-w-lg">
             <DialogHeader>
               <DialogTitle>Adicionar Novo Colaborador</DialogTitle>
               <DialogDescription>
                 Preencha os dados do novo colaborador. Clique em salvar quando terminar.
               </DialogDescription>
             </DialogHeader>
              <form onSubmit={handleAddEmployee}>
                <fieldset disabled={isSubmitting || isLoading} className="grid gap-4 py-4 sm:grid-cols-2 sm:gap-x-6">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome Completo *</Label>
                    <Input id="name" name="name" required placeholder="Ex: Ana Silva"/>
                  </div>
                   <div className="space-y-2">
                    <Label htmlFor="email" className="flex items-center gap-1">
                        <Mail className="h-3 w-3 text-muted-foreground"/> Email (Opcional)
                    </Label>
                    <Input id="email" name="email" type="email" placeholder="Ex: ana.silva@empresa.com"/>
                  </div>
                   <div className="space-y-2">
                    <Label htmlFor="department">Departamento *</Label>
                     <Select
                         name="department"
                         required
                         value={currentDepartment}
                         onValueChange={setCurrentDepartment}
                         disabled={isSubmitting || isLoading}
                        >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o departamento" />
                      </SelectTrigger>
                      <SelectContent>
                        {departmentOptions.map((dept) => (
                          <SelectItem key={dept.value} value={dept.value}>{dept.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                   <div className="space-y-2">
                    <Label htmlFor="role" className="flex items-center gap-1">
                       <Briefcase className="h-3 w-3 text-muted-foreground"/> Função *
                    </Label>
                    <Combobox
                       options={roleOptions}
                       value={currentRole}
                       onChange={setCurrentRole}
                       onCreate={handleCreateRole}
                       placeholder="Selecione ou crie a função"
                       searchPlaceholder="Buscar ou digitar nova função..."
                       emptyPlaceholder="Nenhuma função encontrada."
                       createPlaceholder="Criar função"
                       disabled={isSubmitting || isLoading}
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="admissionDate" className="flex items-center gap-1">
                         <CalendarDays className="h-3 w-3 text-muted-foreground"/> Data de Admissão (Opcional)
                    </Label>
                    <Input id="admissionDate" name="admissionDate" type="date" disabled={isSubmitting || isLoading} />
                  </div>
                </fieldset>
                <DialogFooter className="mt-4">
                   <DialogClose asChild>
                        <Button type="button" variant="outline" disabled={isSubmitting}>Cancelar</Button>
                   </DialogClose>
                  <Button type="submit" disabled={isSubmitting || isLoading}>
                    {(isSubmitting || isLoading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {(isSubmitting || isLoading) ? 'Salvando...' : 'Salvar Colaborador'}
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
                        <Dialog open={isEditDialogOpen && selectedEmployee?.id === employee.id} onOpenChange={(open) => {
                            setIsEditDialogOpen(open);
                            if (!open) {
                                setSelectedEmployee(null);
                                // Reset potentially changed role/dept in state if dialog is cancelled
                                setCurrentRole(undefined);
                                setCurrentDepartment(undefined);
                            }
                        }}>
                        <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(employee)} disabled={isSubmitting || isLoading} title="Editar">
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
                                <fieldset disabled={isSubmitting || isLoading} className="grid gap-4 py-4 sm:grid-cols-2 sm:gap-x-6">
                                   <div className="space-y-2">
                                    <Label htmlFor="edit-name">Nome Completo *</Label>
                                    <Input id="edit-name" name="edit-name" defaultValue={selectedEmployee?.name} required />
                                    </div>
                                    <div className="space-y-2">
                                    <Label htmlFor="edit-email" className="flex items-center gap-1">
                                         <Mail className="h-3 w-3 text-muted-foreground"/> Email (Opcional)
                                    </Label>
                                    <Input id="edit-email" name="edit-email" type="email" defaultValue={selectedEmployee?.email || ''} />
                                    </div>
                                    <div className="space-y-2">
                                    <Label htmlFor="edit-department">Departamento *</Label>
                                    <Select
                                        name="edit-department"
                                        required
                                        value={currentDepartment} // Controlled component
                                        onValueChange={setCurrentDepartment}
                                        disabled={isSubmitting || isLoading}
                                        >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione o departamento" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {departmentOptions.map((dept) => (
                                        <SelectItem key={dept.value} value={dept.value}>{dept.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                    </Select>
                                    </div>
                                    <div className="space-y-2">
                                     <Label htmlFor="edit-role" className="flex items-center gap-1">
                                        <Briefcase className="h-3 w-3 text-muted-foreground"/> Função *
                                     </Label>
                                     <Combobox
                                        options={roleOptions}
                                        value={currentRole} // Controlled component
                                        onChange={setCurrentRole}
                                        onCreate={handleCreateRole}
                                        placeholder="Selecione ou crie a função"
                                        searchPlaceholder="Buscar ou digitar nova função..."
                                        emptyPlaceholder="Nenhuma função encontrada."
                                        createPlaceholder="Criar função"
                                        disabled={isSubmitting || isLoading}
                                     />
                                    </div>
                                    <div className="space-y-2 sm:col-span-2">
                                     <Label htmlFor="edit-admissionDate" className="flex items-center gap-1">
                                        <CalendarDays className="h-3 w-3 text-muted-foreground"/> Data de Admissão (Opcional)
                                    </Label>
                                    <Input id="edit-admissionDate" name="edit-admissionDate" type="date" defaultValue={selectedEmployee?.admissionDate || ''} disabled={isSubmitting || isLoading}/>
                                    </div>
                                </fieldset>
                                <DialogFooter className="mt-4">
                                <DialogClose asChild>
                                        <Button type="button" variant="outline" disabled={isSubmitting}>Cancelar</Button>
                                </DialogClose>
                                <Button type="submit" disabled={isSubmitting || isLoading}>
                                    {(isSubmitting || isLoading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {(isSubmitting || isLoading) ? 'Salvando...' : 'Salvar Alterações'}
                                </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                        </Dialog>

                        <Dialog open={isDeleteDialogOpen && selectedEmployee?.id === employee.id} onOpenChange={(open) => {
                            setIsDeleteDialogOpen(open);
                            if (!open) setSelectedEmployee(null);
                         }}>
                        <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(employee)} disabled={isSubmitting || isLoading} title="Excluir">
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
                            <Button variant="destructive" onClick={handleConfirmDelete} disabled={isSubmitting || isLoading}>
                                {(isSubmitting || isLoading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {(isSubmitting || isLoading) ? 'Excluindo...' : 'Confirmar Exclusão'}
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
