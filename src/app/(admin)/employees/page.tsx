
'use client';

import * as React from 'react';
import { PlusCircle, Search, MoreHorizontal, Edit, Trash2, Eye, UserX, UserCheck, Loader2, Users } from 'lucide-react'; // Ensure Users is imported
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'; // Ensure CardFooter is imported
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { DataTable } from '@/components/ui/data-table';
import type { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';

export let mockEmployees: Employee[] = [
  { id: '1', name: 'Alice Silva', email: 'alice.silva@check2b.com', phone: '11987654321', department: 'RH', role: 'Recrutadora', admissionDate: '2023-01-15', isActive: true, photoUrl: 'https://picsum.photos/id/1027/40/40' },
  { id: '2', name: 'Beto Santos', email: 'beto.santos@check2b.com', phone: '21912345678', department: 'Engenharia', role: 'Desenvolvedor Backend', admissionDate: '2022-08-20', isActive: true, photoUrl: 'https://picsum.photos/id/1005/40/40' },
  { id: '3', name: 'Carla Mendes', email: 'carla.mendes@check2b.com', phone: '31999998888', department: 'Marketing', role: 'Analista de Marketing', admissionDate: '2023-05-10', isActive: false },
  { id: '4', name: 'Davi Costa', email: 'davi.costa@check2b.com', phone: '41988887777', department: 'Vendas', role: 'Executivo de Contas', admissionDate: '2021-11-01', isActive: true, photoUrl: 'https://picsum.photos/id/338/40/40' },
  { id: '5', name: 'Eva Pereira', email: 'eva.pereira@check2b.com', phone: '51977776666', department: 'Engenharia', role: 'Desenvolvedora Frontend', admissionDate: '2023-03-22', isActive: true },
  { id: '6', name: 'Leo Corax', email: 'leocorax@gmail.com', phone: '61988885555', department: 'Engenharia', role: 'Desenvolvedor Frontend', admissionDate: '2024-01-10', isActive: true },
];

const fetchEmployees = async (): Promise<Employee[]> => {
  await new Promise(resolve => setTimeout(resolve, 500));
  return [...mockEmployees];
};

const saveEmployee = async (employeeData: Omit<Employee, 'id'> | Employee): Promise<Employee> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    if ('id' in employeeData && employeeData.id) {
        const index = mockEmployees.findIndex(emp => emp.id === employeeData.id);
        if (index !== -1) {
            mockEmployees[index] = { ...mockEmployees[index], ...employeeData };
            console.log("Colaborador atualizado (mock):", mockEmployees[index]);
            return mockEmployees[index];
        } else {
            throw new Error("Colaborador não encontrado para atualização");
        }
    } else {
        const newEmployee: Employee = {
            id: String(Date.now()),
            ...employeeData,
            isActive: employeeData.isActive !== undefined ? employeeData.isActive : true,
        };
        mockEmployees.push(newEmployee);
        console.log("Novo colaborador adicionado (mock):", newEmployee);
        alert(`Mock user ${newEmployee.name} added. REMEMBER TO CREATE THE USER IN FIREBASE AUTHENTICATION MANUALLY!`);
        return newEmployee;
    }
};

const deleteEmployee = async (employeeId: string): Promise<void> => {
     await new Promise(resolve => setTimeout(resolve, 500));
    const index = mockEmployees.findIndex(emp => emp.id === employeeId);
    if (index !== -1) {
        mockEmployees.splice(index, 1);
        console.log("Colaborador removido com ID:", employeeId);
         alert(`Mock user removed. REMEMBER TO DELETE THE USER FROM FIREBASE AUTHENTICATION MANUALLY!`);
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
         alert(`Mock user status changed. REMEMBER TO ${mockEmployees[index].isActive ? 'ENABLE' : 'DISABLE'} THE USER IN FIREBASE AUTHENTICATION MANUALLY!`);
        return mockEmployees[index];
    } else {
         throw new Error("Colaborador não encontrado para alterar status");
    }
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


interface EmployeeProfileViewProps {
    employee: Employee | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

function EmployeeProfileView({ employee, open, onOpenChange }: EmployeeProfileViewProps) {
    if (!employee) return null;

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
                            {employee.admissionDate ? format(new Date(employee.admissionDate + 'T00:00:00Z'), 'dd/MM/yyyy') : '-'}
                        </span>
                    </div>
                     <div className="pt-4 text-center">
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


export default function EmployeesPage() {
  const [employees, setEmployees] = React.useState<Employee[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [selectedEmployee, setSelectedEmployee] = React.useState<Employee | null>(null);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [employeeToDelete, setEmployeeToDelete] = React.useState<Employee | null>(null);
  const [isProfileViewOpen, setIsProfileViewOpen] = React.useState(false);
  const [employeeToView, setEmployeeToView] = React.useState<Employee | null>(null);
  const { toast } = useToast();

  const columns: ColumnDef<Employee>[] = [
    {
      accessorKey: "photoUrl",
      header: "Foto",
      cell: ({ row }) => (
        <Avatar className="h-9 w-9">
          <AvatarImage src={row.original.photoUrl} alt={row.original.name} />
          <AvatarFallback>{getInitials(row.original.name)}</AvatarFallback>
        </Avatar>
      ),
      size: 80,
      enableSorting: false,
    },
    { accessorKey: "name", header: "Nome", cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
    { accessorKey: "email", header: "Email", cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.email}</span> },
    { accessorKey: "department", header: "Departamento" },
    { accessorKey: "role", header: "Função" },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={row.original.isActive ? 'default' : 'secondary'} className={row.original.isActive ? 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/50 dark:text-green-200' : 'bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300'}>
          {row.original.isActive ? 'Ativo' : 'Inativo'}
        </Badge>
      ),
       size: 100,
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const employee = row.original;
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
        );
      },
       size: 80,
    },
  ];

  const loadEmployees = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchEmployees();
      setEmployees(data);
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

 const handleSaveEmployee = async (data: any) => {
     const employeeDataToSave = selectedEmployee
         ? { ...selectedEmployee, ...data }
         : data;

     const payload = {
         ...employeeDataToSave,
         admissionDate: employeeDataToSave.admissionDate instanceof Date
             ? format(employeeDataToSave.admissionDate, 'yyyy-MM-dd')
             : employeeDataToSave.admissionDate,
     };

    try {
        await saveEmployee(payload);
        setIsFormOpen(false);
        setSelectedEmployee(null);
        await loadEmployees();
         toast({
             title: "Sucesso!",
             description: `Colaborador ${selectedEmployee ? 'atualizado' : 'cadastrado'} com sucesso. Lembre-se de criar/atualizar na autenticação Firebase!`,
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

  return (
    <div className="space-y-6"> {/* Main container */}
        <Card>
            <CardHeader>
                 <CardTitle className="flex items-center gap-2">
                     <Users className="h-5 w-5" /> Gestão de Colaboradores
                 </CardTitle>
                <CardDescription>Adicione, edite, visualize e gerencie os colaboradores da organização.</CardDescription>
             </CardHeader>
             <CardContent>
                {isLoading ? (
                     <div className="flex justify-center items-center py-10">
                        <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
                     </div>
                ) : (
                    <DataTable
                        columns={columns}
                        data={employees}
                        filterColumn="name"
                        filterPlaceholder="Buscar por nome..."
                    />
                 )}
             </CardContent>
            <CardFooter className="flex justify-end">
                 <Button onClick={openAddForm}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Adicionar Colaborador
                 </Button>
            </CardFooter>
        </Card>


       <EmployeeForm
            employee={selectedEmployee}
            onSave={handleSaveEmployee}
            open={isFormOpen}
            onOpenChange={setIsFormOpen}
        />

        <EmployeeProfileView
            employee={employeeToView}
            open={isProfileViewOpen}
            onOpenChange={setIsProfileViewOpen}
        />


       <AlertDialog open={isDeleting} onOpenChange={setIsDeleting}>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>Confirmar Remoção</AlertDialogTitle>
                <AlertDialogDescription>
                    Tem certeza que deseja remover o colaborador "{employeeToDelete?.name}"? Esta ação não pode ser desfeita e removerá todos os dados associados. <strong className='text-destructive'>Lembre-se de remover o usuário também da autenticação do Firebase.</strong>
                </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setEmployeeToDelete(null)}>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Remover Definitivamente (Mock)
                </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

    </div>
  );
}
