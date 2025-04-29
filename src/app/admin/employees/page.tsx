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
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import type { Employee } from '@/services/employee'; // Assuming types are defined here
import { getAllEmployees } from '@/services/employee'; // Assuming API functions are here

// Mock departments for the select dropdown
const departments = ["Engenharia", "Vendas", "Marketing", "RH"];
const roles = ["Engenheiro de Software", "Gerente de Vendas", "Especialista em Marketing", "Analista de RH", "Designer UX"];


export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  useEffect(() => {
    // Fetch employees when the component mounts
    async function loadEmployees() {
      try {
        const fetchedEmployees = await getAllEmployees(); // Replace with your actual API call
        setEmployees(fetchedEmployees);
      } catch (error) {
        console.error("Failed to fetch employees:", error);
        // Handle error appropriately, e.g., show a toast notification
      }
    }
    loadEmployees();
  }, []);

  const handleEdit = (employee: Employee) => {
    setSelectedEmployee(employee);
    setIsEditDialogOpen(true);
  };

  const handleDelete = (employee: Employee) => {
    setSelectedEmployee(employee);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    // TODO: Implement employee deletion logic (call API)
    console.log("Deleting employee:", selectedEmployee?.id);
    if (selectedEmployee) {
      setEmployees(employees.filter(emp => emp.id !== selectedEmployee.id)); // Optimistic UI update
    }
    setIsDeleteDialogOpen(false);
    setSelectedEmployee(null);
  };

   const handleAddEmployee = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const newEmployee: Omit<Employee, 'id'> = {
        name: formData.get('name') as string,
        department: formData.get('department') as string,
        role: formData.get('role') as string,
        // Add other fields as needed
    };

    // TODO: Implement API call to add employee
    const addedEmployee: Employee = { ...newEmployee, id: String(Date.now()) }; // Mock ID generation
    console.log("Adding employee:", addedEmployee);
    setEmployees([...employees, addedEmployee]);
    setIsAddDialogOpen(false); // Close the dialog
  };

   const handleUpdateEmployee = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
     if (!selectedEmployee) return;

    const formData = new FormData(event.currentTarget);
    const updatedEmployeeData: Partial<Employee> = {
        name: formData.get('name') as string,
        department: formData.get('department') as string,
        role: formData.get('role') as string,
        // Add other fields as needed
    };

    // TODO: Implement API call to update employee
    console.log("Updating employee:", selectedEmployee.id, updatedEmployeeData);
     setEmployees(employees.map(emp =>
       emp.id === selectedEmployee.id ? { ...emp, ...updatedEmployeeData } : emp
     )); // Optimistic UI update
    setIsEditDialogOpen(false); // Close the dialog
     setSelectedEmployee(null);
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
            <Button size="sm" className="gap-1">
              <PlusCircle className="h-4 w-4" />
              Adicionar Colaborador
            </Button>
          </DialogTrigger>
           <DialogContent className="sm:max-w-[425px]">
             <DialogHeader>
               <DialogTitle>Adicionar Novo Colaborador</DialogTitle>
               <DialogDescription>
                 Preencha os dados do novo colaborador. Clique em salvar quando terminar.
               </DialogDescription>
             </DialogHeader>
              <form onSubmit={handleAddEmployee}>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-right">
                      Nome
                    </Label>
                    <Input id="name" name="name" required className="col-span-3" />
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
                   <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="role" className="text-right">
                       Função
                    </Label>
                    <Select name="role" required>
                       <SelectTrigger className="col-span-3">
                         <SelectValue placeholder="Selecione a função" />
                       </SelectTrigger>
                       <SelectContent>
                         {roles.map((role) => (
                           <SelectItem key={role} value={role}>{role}</SelectItem>
                         ))}
                       </SelectContent>
                    </Select>
                  </div>
                  {/* Add other fields like email, phone, admission date, etc. */}
                </div>
                <DialogFooter>
                   <DialogClose asChild>
                        <Button type="button" variant="outline">Cancelar</Button>
                   </DialogClose>
                  <Button type="submit">Salvar Colaborador</Button>
                </DialogFooter>
              </form>
           </DialogContent>
         </Dialog>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Avatar</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Departamento</TableHead>
              <TableHead>Função</TableHead>
              <TableHead className="text-right w-[100px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.map((employee) => (
              <TableRow key={employee.id}>
                <TableCell>
                  <Avatar>
                    <AvatarImage src={`https://picsum.photos/seed/${employee.id}/40/40`} alt={employee.name} />
                    <AvatarFallback>{employee.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                </TableCell>
                <TableCell className="font-medium">{employee.name}</TableCell>
                <TableCell>{employee.department}</TableCell>
                <TableCell>{employee.role}</TableCell>
                <TableCell className="text-right">
                    <Dialog open={isEditDialogOpen && selectedEmployee?.id === employee.id} onOpenChange={(open) => { if (!open) setSelectedEmployee(null); setIsEditDialogOpen(open); }}>
                       <DialogTrigger asChild>
                         <Button variant="ghost" size="icon" onClick={() => handleEdit(employee)}>
                           <Edit className="h-4 w-4" />
                         </Button>
                       </DialogTrigger>
                       <DialogContent className="sm:max-w-[425px]">
                         <DialogHeader>
                           <DialogTitle>Editar Colaborador</DialogTitle>
                           <DialogDescription>
                             Atualize os dados do colaborador. Clique em salvar quando terminar.
                           </DialogDescription>
                         </DialogHeader>
                          <form onSubmit={handleUpdateEmployee}>
                            <div className="grid gap-4 py-4">
                              <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="edit-name" className="text-right">
                                  Nome
                                </Label>
                                <Input id="edit-name" name="name" defaultValue={selectedEmployee?.name} required className="col-span-3" />
                              </div>
                               <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="edit-department" className="text-right">
                                   Departamento
                                </Label>
                                <Select name="department" defaultValue={selectedEmployee?.department} required>
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
                               <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="edit-role" className="text-right">
                                   Função
                                </Label>
                                 <Select name="role" defaultValue={selectedEmployee?.role} required>
                                   <SelectTrigger className="col-span-3">
                                     <SelectValue placeholder="Selecione a função" />
                                   </SelectTrigger>
                                   <SelectContent>
                                     {roles.map((role) => (
                                       <SelectItem key={role} value={role}>{role}</SelectItem>
                                     ))}
                                   </SelectContent>
                                 </Select>
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

                    <Dialog open={isDeleteDialogOpen && selectedEmployee?.id === employee.id} onOpenChange={(open) => { if (!open) setSelectedEmployee(null); setIsDeleteDialogOpen(open); }}>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(employee)}>
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
      </CardContent>
    </Card>
  );
}
