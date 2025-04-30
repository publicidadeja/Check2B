'use client';

import * as React from 'react';
import { PlusCircle, Search, MoreHorizontal, Edit, Trash2, Eye, UserX, UserCheck } from 'lucide-react';
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { EmployeeForm } from '@/components/employee/employee-form'; // Import the form
import type { Employee } from '@/types/employee'; // Import Employee type
import { useToast } from '@/hooks/use-toast'; // Import toast hook

// Mock data - replace with API calls
const mockEmployees: Employee[] = [
  { id: '1', name: 'Alice Silva', email: 'alice.silva@checkup.com', phone: '11987654321', department: 'RH', role: 'Recrutadora', admissionDate: '2023-01-15', isActive: true, photoUrl: 'https://picsum.photos/id/1027/40/40' },
  { id: '2', name: 'Bob Santos', email: 'bob.santos@checkup.com', phone: '21912345678', department: 'Engenharia', role: 'Desenvolvedor Backend', admissionDate: '2022-08-20', isActive: true, photoUrl: 'https://picsum.photos/id/1005/40/40' },
  { id: '3', name: 'Carla Mendes', email: 'carla.mendes@checkup.com', phone: '31999998888', department: 'Marketing', role: 'Analista de Marketing', admissionDate: '2023-05-10', isActive: false }, // Inactive example
  { id: '4', name: 'David Costa', email: 'david.costa@checkup.com', phone: '41988887777', department: 'Vendas', role: 'Executivo de Contas', admissionDate: '2021-11-01', isActive: true, photoUrl: 'https://picsum.photos/id/338/40/40' },
  { id: '5', name: 'Eva Pereira', email: 'eva.pereira@checkup.com', phone: '51977776666', department: 'Engenharia', role: 'Desenvolvedora Frontend', admissionDate: '2023-03-22', isActive: true },
];

// Mock API functions - replace with actual API calls
const fetchEmployees = async (): Promise<Employee[]> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  // In a real app, fetch from your backend API
  return mockEmployees;
};

const saveEmployee = async (employeeData: Omit<Employee, 'id'> | Employee): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API delay
    if ('id' in employeeData) {
        // Update existing employee
        const index = mockEmployees.findIndex(emp => emp.id === employeeData.id);
        if (index !== -1) {
            mockEmployees[index] = { ...mockEmployees[index], ...employeeData };
            console.log("Updated employee:", mockEmployees[index]);
        } else {
            throw new Error("Employee not found for update");
        }
    } else {
        // Add new employee
        const newEmployee: Employee = {
            id: String(Date.now()), // Simple ID generation for mock
            ...employeeData,
        };
        mockEmployees.push(newEmployee);
        console.log("Added new employee:", newEmployee);
    }
};

const deleteEmployee = async (employeeId: string): Promise<void> => {
     await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API delay
    const index = mockEmployees.findIndex(emp => emp.id === employeeId);
    if (index !== -1) {
        mockEmployees.splice(index, 1);
        console.log("Deleted employee with ID:", employeeId);
    } else {
         throw new Error("Employee not found for deletion");
    }
};

const toggleEmployeeStatus = async (employeeId: string): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API delay
    const index = mockEmployees.findIndex(emp => emp.id === employeeId);
    if (index !== -1) {
        mockEmployees[index].isActive = !mockEmployees[index].isActive;
        console.log("Toggled status for employee:", mockEmployees[index]);
    } else {
         throw new Error("Employee not found for status toggle");
    }
};


export default function EmployeesPage() {
  const [employees, setEmployees] = React.useState<Employee[]>([]);
  const [filteredEmployees, setFilteredEmployees] = React.useState<Employee[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedEmployee, setSelectedEmployee] = React.useState<Employee | null>(null);
  const [isFormOpen, setIsFormOpen] = React.useState(false); // State for EmployeeForm dialog
  const [isDeleting, setIsDeleting] = React.useState(false); // State for delete confirmation
  const [employeeToDelete, setEmployeeToDelete] = React.useState<Employee | null>(null);

  const { toast } = useToast();

  const loadEmployees = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchEmployees();
      setEmployees(data);
      setFilteredEmployees(data); // Initialize filtered list
    } catch (error) {
      console.error("Failed to fetch employees:", error);
      toast({ title: "Erro", description: "Falha ao carregar colaboradores.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

   // Filter employees based on search term
   React.useEffect(() => {
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    const filtered = employees.filter(emp =>
      emp.name.toLowerCase().includes(lowerCaseSearchTerm) ||
      emp.email.toLowerCase().includes(lowerCaseSearchTerm) ||
      emp.department.toLowerCase().includes(lowerCaseSearchTerm) ||
      emp.role.toLowerCase().includes(lowerCaseSearchTerm)
    );
    setFilteredEmployees(filtered);
  }, [searchTerm, employees]);

  const handleSaveEmployee = async (data: any) => { // Use 'any' for mock, define proper type later
     const employeeDataToSave = selectedEmployee
         ? { ...selectedEmployee, ...data } // Merge for update
         : data; // Data for new employee

     // Convert admissionDate back to string if needed by backend
     const payload = {
         ...employeeDataToSave,
         admissionDate: employeeDataToSave.admissionDate instanceof Date
             ? employeeDataToSave.admissionDate.toISOString().split('T')[0] // Format as YYYY-MM-DD string
             : employeeDataToSave.admissionDate, // Assume it's already a string if not a Date
     };


    await saveEmployee(payload);
    setIsFormOpen(false); // Close form dialog
    setSelectedEmployee(null); // Reset selected employee
    await loadEmployees(); // Refresh list
  };

  const handleDeleteClick = (employee: Employee) => {
    setEmployeeToDelete(employee);
    setIsDeleting(true);
  };

  const confirmDelete = async () => {
    if (employeeToDelete) {
       try {
        await deleteEmployee(employeeToDelete.id);
        toast({ title: "Sucesso", description: "Colaborador removido com sucesso." });
        await loadEmployees(); // Refresh list
      } catch (error) {
         console.error("Failed to delete employee:", error);
         toast({ title: "Erro", description: "Falha ao remover colaborador.", variant: "destructive" });
      } finally {
         setIsDeleting(false);
         setEmployeeToDelete(null);
      }
    }
  };

  const handleToggleStatus = async (employee: Employee) => {
      try {
        await toggleEmployeeStatus(employee.id);
        toast({ title: "Sucesso", description: `Status do colaborador ${employee.isActive ? 'desativado' : 'ativado'} com sucesso.` });
        await loadEmployees(); // Refresh list
      } catch (error) {
         console.error("Failed to toggle employee status:", error);
         toast({ title: "Erro", description: "Falha ao alterar status do colaborador.", variant: "destructive" });
      }
  };

  const openEditForm = (employee: Employee) => {
    setSelectedEmployee(employee);
    setIsFormOpen(true); // Trigger form opening manually
  };

   const openAddForm = () => {
    setSelectedEmployee(null); // Ensure no employee is selected for adding
    setIsFormOpen(true); // Trigger form opening manually
  };

   const getInitials = (name: string) => {
     return name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
   };

  return (
    <div className="flex flex-col h-full">
       {/* Header with Search and Add Button */}
      <div className="flex items-center justify-between mb-4">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar por nome, email, departamento..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
         {/* Use EmployeeForm trigger directly for adding */}
         <EmployeeForm onSave={handleSaveEmployee} />
      </div>

      {/* Employee Table */}
      <div className="flex-grow overflow-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Foto</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Departamento</TableHead>
              <TableHead>Função</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center">
                  Carregando colaboradores...
                </TableCell>
              </TableRow>
            ) : filteredEmployees.length === 0 ? (
               <TableRow>
                  <TableCell colSpan={7} className="text-center">
                    Nenhum colaborador encontrado.
                  </TableCell>
              </TableRow>
             ) : (
              filteredEmployees.map((employee) => (
                <TableRow key={employee.id}>
                  <TableCell>
                     <Avatar className="h-9 w-9">
                       <AvatarImage src={employee.photoUrl} alt={employee.name} />
                       <AvatarFallback>{getInitials(employee.name)}</AvatarFallback>
                     </Avatar>
                  </TableCell>
                  <TableCell className="font-medium">{employee.name}</TableCell>
                  <TableCell>{employee.email}</TableCell>
                  <TableCell>{employee.department}</TableCell>
                  <TableCell>{employee.role}</TableCell>
                  <TableCell>
                    <Badge variant={employee.isActive ? 'default' : 'secondary'} className={employee.isActive ? 'bg-green-100 text-green-800 hover:bg-green-200' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'}>
                      {employee.isActive ? 'Ativo' : 'Inativo'}
                    </Badge>
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
                        <DropdownMenuItem onClick={() => alert(`Visualizar ${employee.name}`)}>
                          <Eye className="mr-2 h-4 w-4" />
                          Visualizar Perfil
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openEditForm(employee)}>
                           {/* Use EmployeeForm trigger for editing */}
                           <EmployeeForm employee={employee} onSave={handleSaveEmployee}>
                               <span className="flex items-center w-full cursor-pointer">
                                  <Edit className="mr-2 h-4 w-4" />
                                  Editar
                               </span>
                          </EmployeeForm>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleToggleStatus(employee)}>
                          {employee.isActive ? <UserX className="mr-2 h-4 w-4" /> : <UserCheck className="mr-2 h-4 w-4" />}
                          {employee.isActive ? 'Desativar' : 'Ativar'}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleDeleteClick(employee)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
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
                    Tem certeza que deseja remover o colaborador "{employeeToDelete?.name}"? Esta ação não pode ser desfeita.
                </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setEmployeeToDelete(null)}>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Remover
                </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

    </div>
  );
}
