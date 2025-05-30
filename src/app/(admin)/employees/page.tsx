
// src/app/(admin)/employees/page.tsx
'use client';

import * as React from 'react';
import { PlusCircle, MoreHorizontal, Edit, Trash2, Eye, UserX, UserCheck, Loader2, Users, Frown, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import type { UserProfile } from '@/types/user';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { DataTable } from '@/components/ui/data-table';
import type { ColumnDef } from '@tanstack/react-table';
import { format, parseISO } from 'date-fns';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { getUsersByRoleAndOrganization, saveUser as saveUserToFirestore } from '@/lib/user-service';
import { useAuth } from '@/hooks/use-auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getFirebaseApp, getDb } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore'; // Added getDoc and doc imports

const getInitials = (name?: string) => {
    if (!name) return '??';
    return name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
};


interface EmployeeProfileViewProps {
    employee: UserProfile | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

function EmployeeProfileView({ employee, open, onOpenChange }: EmployeeProfileViewProps) {
    if (!employee) return null;

    const admissionDateStr = employee.admissionDate;


    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader className="items-center text-center">
                     <Avatar className="h-24 w-24 mb-3">
                       <AvatarImage src={employee.photoUrl} alt={employee.name} />
                       <AvatarFallback className="text-3xl">{getInitials(employee.name)}</AvatarFallback>
                     </Avatar>
                    <DialogTitle className="text-2xl">{employee.name}</DialogTitle>
                    <DialogDescription>{employee.userRole} - {employee.department}</DialogDescription>
                    <Badge variant={employee.status === 'active' ? 'default' : 'secondary'} className={`mt-1 ${employee.status === 'active' ? 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/50 dark:text-green-200' : 'bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300'}`}>
                        {employee.status === 'active' ? 'Ativo' : 'Inativo'}
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
                             {admissionDateStr ? format(parseISO(admissionDateStr + 'T00:00:00Z'), 'dd/MM/yyyy') : '-'}
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
  const { organizationId, role: adminRole, user: adminUser } = useAuth();
  const [employees, setEmployees] = React.useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [selectedEmployee, setSelectedEmployee] = React.useState<UserProfile | null>(null);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [employeeToDelete, setEmployeeToDelete] = React.useState<UserProfile | null>(null);
  const [isProfileViewOpen, setIsProfileViewOpen] = React.useState(false);
  const [employeeToView, setEmployeeToView] = React.useState<UserProfile | null>(null);
  const { toast } = useToast();
  const firebaseApp = getFirebaseApp();


  const columns: ColumnDef<UserProfile>[] = [
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
    { accessorKey: "department", header: "Departamento", cell: ({row}) => row.original.department || '-' },
    { accessorKey: "userRole", header: "Função", cell: ({row}) => row.original.userRole || '-' },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={row.original.status === 'active' ? 'default' : 'secondary'} className={row.original.status === 'active' ? 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/50 dark:text-green-200' : 'bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300'}>
          {row.original.status === 'active' ? 'Ativo' : 'Inativo'}
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
                {employee.status === 'active' ? <UserX className="mr-2 h-4 w-4" /> : <UserCheck className="mr-2 h-4 w-4" />}
                {employee.status === 'active' ? 'Desativar' : 'Ativar'}
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
    if (!organizationId || adminRole !== 'admin') {
        setIsLoading(false);
        if (adminRole === 'admin' && !organizationId) {
             toast({ title: "Erro de Configuração", description: "Administrador não vinculado a uma organização. Não é possível carregar colaboradores.", variant: "destructive" });
        }
        return;
    }
    setIsLoading(true);
    try {
      const data = await getUsersByRoleAndOrganization('collaborator', organizationId);
      setEmployees(data);
    } catch (error) {
      console.error("Falha ao carregar colaboradores:", error);
      toast({ title: "Erro", description: "Falha ao carregar colaboradores.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [organizationId, adminRole, toast]);

  React.useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

 const handleSaveEmployee = async (data: any) => {
    if (!organizationId || !firebaseApp) {
        toast({ title: "Erro", description: "ID da organização ou app Firebase não disponível.", variant: "destructive" });
        return;
    }

    setIsLoading(true);
    const functions = getFunctions(firebaseApp);
    const createEmployeeFunction = httpsCallable(functions, 'createOrganizationUser');
    const isEditing = !!selectedEmployee?.uid;
    let uidToUpdate = selectedEmployee?.uid;

    try {
        let userProfileData: UserProfile;

        if (isEditing && uidToUpdate) {
            userProfileData = {
                ...(selectedEmployee as UserProfile), // Ensure selectedEmployee is treated as UserProfile
                ...data,
                uid: uidToUpdate,
                organizationId: organizationId,
                role: 'collaborator', // Role in terms of system access type
                admissionDate: format(data.admissionDate, 'yyyy-MM-dd'),
                // userRole is the job title/cargo, comes from data.role from form
                userRole: data.role, // Make sure data.role from form becomes userRole
                status: data.status,
            };
            await saveUserToFirestore(userProfileData);
            // For existing users, claims (role: collaborator, orgId) should already be set.
            // If a system role or orgId could change here (not typical for employee edit), claims update would be needed.
        } else {
            const result = await createEmployeeFunction({
                email: data.email,
                password: data.password,
                name: data.name,
                organizationId: organizationId,
                department: data.department,
                role: data.role, // This is the 'cargo' or 'userRole' for the new user
                photoUrl: data.photoUrl,
                admissionDate: format(data.admissionDate, 'yyyy-MM-dd'),
                status: data.status,
            });
            uidToUpdate = (result.data as any).userId;
            if (!uidToUpdate) throw new Error("Cloud Function não retornou UID do usuário.");

            // Fetch the newly created user data to ensure consistency for local state
            const newUserDoc = await getDoc(doc(getDb()!, 'users', uidToUpdate));
            if (!newUserDoc.exists()) throw new Error("Documento do novo usuário não encontrado no Firestore.");
            userProfileData = { uid: uidToUpdate, ...newUserDoc.data() } as UserProfile;
        }

        setIsFormOpen(false);
        setSelectedEmployee(null);
        await loadEmployees();
         toast({
             title: "Sucesso!",
             description: `Colaborador ${isEditing ? 'atualizado' : 'cadastrado'} com sucesso.`,
         });
    } catch (error: any) {
        console.error("Erro ao salvar colaborador:", error);
        toast({
            title: "Erro!",
            description: error.message || `Falha ao ${isEditing ? 'atualizar' : 'cadastrar'} colaborador. Tente novamente.`,
            variant: "destructive",
        });
    } finally {
        setIsLoading(false);
    }
 };


  const handleDeleteClick = (employee: UserProfile) => {
    setEmployeeToDelete(employee);
    setIsDeleting(true);
  };

  const confirmDelete = async () => {
    if (employeeToDelete && organizationId && firebaseApp) {
       setIsLoading(true);
       try {
        const functions = getFunctions(firebaseApp);
        const deleteUserFunction = httpsCallable(functions, 'deleteOrganizationUser');
        await deleteUserFunction({ userId: employeeToDelete.uid, organizationId: organizationId });
        await loadEmployees();
        toast({ title: "Sucesso", description: "Colaborador removido com sucesso." });
      } catch (error: any) {
         console.error("Falha ao remover colaborador:", error);
         toast({ title: "Erro", description: error.message || "Falha ao remover colaborador.", variant: "destructive" });
      } finally {
         setIsLoading(false);
         setIsDeleting(false);
         setEmployeeToDelete(null);
      }
    }
  };

  const handleToggleStatus = async (employee: UserProfile) => {
    if (!firebaseApp) return;
    setIsLoading(true);
    const newStatus = employee.status === 'active' ? 'inactive' : 'active';
    try {
      const functions = getFunctions(firebaseApp);
      const toggleStatusFunction = httpsCallable(functions, 'toggleUserStatusFirebase');
      await toggleStatusFunction({ userId: employee.uid, status: newStatus });

      toast({ title: "Sucesso", description: `Status do colaborador ${employee.name} foi alterado.` });
      await loadEmployees();
    } catch (error: any) {
       console.error("Falha ao alterar status do colaborador:", error);
       toast({ title: "Erro", description: error.message || "Falha ao alterar status do colaborador.", variant: "destructive" });
    } finally {
        setIsLoading(false);
    }
  };


  const openEditForm = (employee: UserProfile) => {
    setSelectedEmployee(employee);
    setIsFormOpen(true);
  };

   const openAddForm = () => {
    setSelectedEmployee(null);
    setIsFormOpen(true);
  };

    const openProfileView = (employee: UserProfile) => {
        setEmployeeToView(employee);
        setIsProfileViewOpen(true);
    };

  if (adminRole === 'admin' && !organizationId && !isLoading) {
      return (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
              <AlertTriangle className="h-16 w-16 text-destructive mb-4" />
              <h2 className="text-xl font-semibold mb-2">Acesso não Configurado</h2>
              <p className="text-muted-foreground">
                  Seu perfil de administrador não está vinculado a uma organização.
                  Por favor, contate o Super Administrador do sistema.
              </p>
          </div>
      );
  }


  return (
    <div className="space-y-6">
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
                         <LoadingSpinner text="Carregando colaboradores..." />
                     </div>
                ) : employees.length === 0 && organizationId ? (
                     <div className="text-center py-10 text-muted-foreground">
                         <Frown className="mx-auto h-10 w-10 mb-2" />
                         <p>Nenhum colaborador encontrado para sua organização.</p>
                         <Button className="mt-4" onClick={openAddForm}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                             Criar Primeiro Colaborador
                         </Button>
                     </div>
                 ) : !organizationId && adminRole === 'admin' ? ( // Changed from adminRole !== 'super_admin'
                     <div className="text-center py-10 text-muted-foreground">
                        <AlertTriangle className="mx-auto h-10 w-10 mb-2 text-yellow-500" />
                        <p>O administrador não está associado a uma organização.</p>
                        <p className="text-xs">Não é possível carregar ou criar colaboradores.</p>
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
             { !isLoading && organizationId && ( // Show Add button if not loading and orgId is present
                <CardFooter className="flex justify-end">
                     <Button onClick={openAddForm}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Adicionar Colaborador
                     </Button>
                </CardFooter>
             )}
        </Card>

       <EmployeeForm
            employee={selectedEmployee}
            onSave={handleSaveEmployee}
            open={isFormOpen}
            onOpenChange={setIsFormOpen}
            // Pass organizationId to EmployeeForm if it needs it directly
            // (though current implementation of EmployeeForm doesn't use it directly)
            // organizationId={organizationId} 
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
                    Tem certeza que deseja remover o colaborador "{employeeToDelete?.name}"? Esta ação removerá o usuário do Firebase Authentication e do Firestore. Esta ação não pode ser desfeita.
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

