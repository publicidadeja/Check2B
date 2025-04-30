'use client';

import * as React from 'react';
import { PlusCircle, Search, MoreHorizontal, Edit, Trash2, Eye, UserX, UserCheck, Loader2, Users } from 'lucide-react'; // Added Users import
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
} from "@/components/ui/alert-dialog";
import { EmployeeForm } from '@/components/employee/employee-form';
import type { Employee } from '@/types/employee';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'; // Import Card components
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog'; // Import Dialog components

// Mock data (simulated API response) - Manter nomes em português para consistência
const mockEmployees: Employee[] = [
  { id: '1', name: 'Alice Silva', email: 'alice.silva@check2b.com', phone: '11987654321', department: 'RH', role: 'Recrutadora', admissionDate: '2023-01-15', isActive: true, photoUrl: 'https://picsum.photos/id/1027/40/40' },
  { id: '2', name: 'Beto Santos', email: 'beto.santos@check2b.com', phone: '21912345678', department: 'Engenharia', role: 'Desenvolvedor Backend', admissionDate: '2022-08-20', isActive: true, photoUrl: 'https://picsum.photos/id/1005/40/40' },
  { id: '3', name: 'Carla Mendes', email: 'carla.mendes@check2b.com', phone: '31999998888', department: 'Marketing', role: 'Analista de Marketing', admissionDate: '2023-05-10', isActive: false }, // Exemplo inativo
  { id: '4', name: 'Davi Costa', email: 'davi.costa@check2b.com', phone: '41988887777', department: 'Vendas', role: 'Executivo de Contas', admissionDate: '2021-11-01', isActive: true, photoUrl: 'https://picsum.photos/id/338/40/40' },
  { id: '5', name: 'Eva Pereira', email: 'eva.pereira@check2b.com', phone: '51977776666', department: 'Engenharia', role: 'Desenvolvedora Frontend', admissionDate: '2023-03-22', isActive: true },
];

// Mock API functions
const fetchEmployees = async (): Promise<Employee[]> => {
  await new Promise(resolve => setTimeout(resolve, 500));
  return [...mockEmployees]; // Return a copy to avoid direct mutation
};

const saveEmployee = async (employeeData: Omit<Employee, 'id'> | Employee): Promise<Employee> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    if ('id' in employeeData && employeeData.id) {
        const index = mockEmployees.findIndex(emp => emp.id === employeeData.id);
        if (index !== -1) {
            mockEmployees[index] = { ...mockEmployees[index], ...employeeData };
            console.log("Colaborador atualizado:", mockEmployees[index]);
            return mockEmployees[index];
        } else {
            throw new Error("Colaborador não encontrado para atualização");
        }
    } else {
        const newEmployee: Employee = {
            id: String(Date.now()),
            ...employeeData,
            isActive: employeeData.isActive !== undefined ? employeeData.isActive : true, // Default to active
        };
        mockEmployees.push(newEmployee);
        console.log("Novo colaborador adicionado:", newEmployee);
        return newEmployee;
    }
};

const deleteEmployee = async (employeeId: string): Promise<void> => {
     await new Promise(resolve => setTimeout(resolve, 500));
    const index = mockEmployees.findIndex(emp => emp.id === employeeId);
    if (index !== -1) {
        mockEmployees.splice(index, 1);
        console.log("Colaborador removido com ID:", employeeId);
    } else {
         throw new Error("Colaborador não encontrado para remoção");
    }
};

const toggleEmployeeStatus = async (employeeId: string): Promise<Employee | undefined> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    const index = mockEmployees.findIndex(emp => emp.id === employeeId);
    if (index !== -1) {
        mockEmployees[index].isActive = !mockEmployees[index].isActive;
        console.log("Status alterado para o colaborador:", mockEmployees[index]);
        return mockEmployees[index];
    } else {
         throw new Error("Colaborador não encontrado para alterar status");
    }
};


// --- Employee Profile View Component ---
interface EmployeeProfileViewProps {
    employee: Employee | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

function EmployeeProfileView({ employee, open, onOpenChange }: EmployeeProfileViewProps) {
    if (!employee) return null;

    const getInitials = (name: string) => {
        if (!name) return '??';
        return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader className="items-center text-center">
                     <Avatar className="h-24 w-24 mb-3">
                       <AvatarImage src={employee.photoUrl} alt={employee.name} />
                       <AvatarFallback className="text-3xl">{getInitials(employee.name)}</AvatarFallback>
                     </Avatar>
                    <DialogTitle className="text-2xl">{employee.name}</DialogTitle>
                    <DialogDescription>{employee.role} - {employee.department}</DialogDescription>
                    <Badge variant={employee.isActive ? 'default' : 'secondary'} className={`mt-1 ${employee.isActive ? 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/50 dark:text-green-200' : 'bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300'}`}>
                        {employee.isActive ? 'Ativo' : 'Inativo'}
                    </Badge>
                </DialogHeader>
                <div className="py-4 space-y-3 px-6">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Email:</span>
                        <span className="font-medium">{employee.email}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Telefone:</span>
                        <span className="font-medium">{employee.phone || '-'}</span>
                    </div>
                     <div className="flex justify-between">
                        <span className="text-muted-foreground">Admissão:</span>
                        <span className="font-medium">
                            {employee.admissionDate ? new Date(employee.admissionDate + 'T00:00:00').toLocaleDateString('pt-BR') : '-'}
                        </span>
                    </div>
                    {/* Add more profile details here - performance, history links etc. */}
                     <div className="pt-4 text-center">
                        {/* Placeholder for actions like 'View Performance History' */}
                        <Button variant="outline" size="sm" disabled>Ver Histórico de Desempenho</Button>
                    </div>
                </div>
                 <DialogFooter className="sm:justify-center">
                     <DialogClose asChild>
                        <Button type="button" variant="secondary">Fechar</Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}


// --- Main Page Component ---
export default function EmployeesPage() {
  const [employees, setEmployees] = React.useState<Employee[]>([]);
  const [filteredEmployees, setFilteredEmployees] = React.useState<Employee[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedEmployee, setSelectedEmployee] = React.useState<Employee | null>(null);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [employeeToDelete, setEmployeeToDelete] = React.useState<Employee | null>(null);
  const [isProfileViewOpen, setIsProfileViewOpen] = React.useState(false);
  const [employeeToView, setEmployeeToView] = React.useState<Employee | null>(null);


  const { toast } = useToast();

  const loadEmployees = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchEmployees();
      setEmployees(data);
      setFilteredEmployees(data);
    } catch (error) {
      console.error("Falha ao carregar colaboradores:", error);
      toast({ title: "Erro", description: "Falha ao carregar colaboradores.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

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

 const handleSaveEmployee = async (data: any) => {
     const employeeDataToSave = selectedEmployee
         ? { ...selectedEmployee, ...data }
         : data;

     const payload = {
         ...employeeDataToSave,
         admissionDate: employeeDataToSave.admissionDate instanceof Date
             ? employeeDataToSave.admissionDate.toISOString().split('T')[0]
             : employeeDataToSave.admissionDate,
     };

    try {
        await saveEmployee(payload);
        setIsFormOpen(false);
        setSelectedEmployee(null);
        await loadEmployees();
         toast({
             title: "Sucesso!",
             description: `Colaborador ${selectedEmployee ? 'atualizado' : 'cadastrado'} com sucesso.`,
         });
    } catch (error) {
        console.error("Erro ao salvar colaborador:", error);
        toast({
            title: "Erro!",
            description: `Falha ao ${selectedEmployee ? 'atualizar' : 'cadastrar'} colaborador. Tente novamente.`,
            variant: "destructive",
        });
    }
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
        await loadEmployees();
      } catch (error) {
         console.error("Falha ao remover colaborador:", error);
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
        toast({ title: "Sucesso", description: `Status do colaborador ${employee.name} foi ${employee.isActive ? 'desativado' : 'ativado'}.` });
        await loadEmployees();
      } catch (error) {
         console.error("Falha ao alterar status do colaborador:", error);
         toast({ title: "Erro", description: "Falha ao alterar status do colaborador.", variant: "destructive" });
      }
  };

  const openEditForm = (employee: Employee) => {
    setSelectedEmployee(employee);
    setIsFormOpen(true);
  };

   const openAddForm = () => {
    setSelectedEmployee(null);
    setIsFormOpen(true);
  };

    const openProfileView = (employee: Employee) => {
        setEmployeeToView(employee);
        setIsProfileViewOpen(true);
    };

   const getInitials = (name: string) => {
     if (!name) return '??';
     return name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
   };

  return (
    <div className="flex flex-col h-full">
        <Card>
            <CardHeader>
                 <CardTitle className="flex items-center gap-2">
                     <Users className="h-5 w-5" /> Gestão de Colaboradores
                 </CardTitle>
                <CardDescription>Adicione, edite, visualize e gerencie os colaboradores da organização.</CardDescription>
             </CardHeader>
             <CardContent>
                  <div className="flex items-center justify-between mb-4">
                    <div className="relative w-full max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Buscar por nome, email, depto..."
                        className="pl-8"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    </div>
                    <Button onClick={openAddForm}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Adicionar Colaborador
                    </Button>
                </div>

                <div className="rounded-md border">
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
                            <TableCell colSpan={7} className="text-center py-10">
                                <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                                Carregando colaboradores...
                            </TableCell>
                        </TableRow>
                        ) : filteredEmployees.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
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
                                <Badge variant={employee.isActive ? 'default' : 'secondary'} className={employee.isActive ? 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/50 dark:text-green-200' : 'bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300'}>
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
                                    <DropdownMenuItem onClick={() => openProfileView(employee)}>
                                    <Eye className="mr-2 h-4 w-4" />
                                    Visualizar Perfil
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => openEditForm(employee)}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Editar
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
            </CardContent>
        </Card>


       {/* Formulário de Colaborador (Dialog) */}
       <EmployeeForm
            employee={selectedEmployee}
            onSave={handleSaveEmployee}
            open={isFormOpen}
            onOpenChange={setIsFormOpen}
        />

        {/* Visualização de Perfil (Dialog) */}
        <EmployeeProfileView
            employee={employeeToView}
            open={isProfileViewOpen}
            onOpenChange={setIsProfileViewOpen}
        />


       {/* Confirmação de Remoção (AlertDialog) */}
       <AlertDialog open={isDeleting} onOpenChange={setIsDeleting}>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>Confirmar Remoção</AlertDialogTitle>
                <AlertDialogDescription>
                    Tem certeza que deseja remover o colaborador "{employeeToDelete?.name}"? Esta ação não pode ser desfeita e removerá todos os dados associados.
                </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setEmployeeToDelete(null)}>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Remover Definitivamente
                </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

    </div>
  );
}
