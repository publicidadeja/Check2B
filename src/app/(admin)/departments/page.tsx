
'use client';

import * as React from 'react';
import { PlusCircle, MoreHorizontal, Edit, Trash2, Building, Loader2, Frown, AlertTriangle } from 'lucide-react';
import { DataTable } from '@/components/ui/data-table';
import type { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { DepartmentForm } from '@/components/department/department-form';
import type { Department } from '@/types/department';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useAuth } from '@/hooks/use-auth';
import { getDepartmentsByOrganization, saveDepartment, deleteDepartment as deleteDepartmentFromFirestore } from '@/lib/department-service';
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

export default function DepartmentsPage() {
    const { organizationId, role, user } = useAuth();
    const [departments, setDepartments] = React.useState<Department[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [selectedDepartment, setSelectedDepartment] = React.useState<Department | null>(null);
    const [isFormOpen, setIsFormOpen] = React.useState(false);
    const [isDeleting, setIsDeleting] = React.useState(false);
    const [departmentToDelete, setDepartmentToDelete] = React.useState<Department | null>(null);
    const { toast } = useToast();

    const columns: ColumnDef<Department>[] = [
        { accessorKey: "name", header: "Nome", cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
        { accessorKey: "description", header: "Descrição", cell: ({ row }) => row.original.description || '-' },
        // Add headId display if needed, e.g., fetch employee name by headId
        {
            id: "actions",
            cell: ({ row }) => {
                const dept = row.original;
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
                            <DropdownMenuItem onClick={() => openEditForm(dept)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Editar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                onClick={() => handleDeleteClick(dept)}
                                className="text-destructive focus:text-destructive focus:bg-destructive/10"
                                // disabled={['Engenharia', 'RH'].includes(dept.name) && departments.length <= 2} // Example disabled logic
                            >
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

    const loadDepartments = React.useCallback(async () => {
        if (!organizationId || (role !== 'admin' && role !== 'super_admin')) {
            setIsLoading(false);
            // Optionally show a message or redirect if orgId is missing for an admin
            if (role === 'admin' && !organizationId) {
                 toast({ title: "Erro de Configuração", description: "ID da organização não encontrado para o admin.", variant: "destructive" });
            }
            return;
        }
        setIsLoading(true);
        try {
            const data = await getDepartmentsByOrganization(organizationId);
            setDepartments(data);
        } catch (error) {
            console.error("Falha ao carregar departamentos:", error);
            toast({ title: "Erro", description: "Falha ao carregar departamentos.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }, [organizationId, role, toast]);

    React.useEffect(() => {
        loadDepartments();
    }, [loadDepartments]);


    const handleSaveDepartment = async (data: Omit<Department, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>) => {
         if (!organizationId) {
            toast({ title: "Erro", description: "ID da organização não disponível para salvar.", variant: "destructive" });
            return;
        }
        const deptDataToSave = selectedDepartment 
            ? { ...data, id: selectedDepartment.id } 
            : data;
        
        setIsLoading(true); // Indicate loading during save
        try {
            await saveDepartment(organizationId, deptDataToSave);
            setIsFormOpen(false);
            setSelectedDepartment(null);
            await loadDepartments();
            toast({
                title: "Sucesso!",
                description: `Departamento ${selectedDepartment ? 'atualizado' : 'criado'} com sucesso.`,
            });
        } catch (error) {
            console.error("Erro ao salvar departamento:", error);
            toast({
                title: "Erro!",
                description: `Falha ao ${selectedDepartment ? 'atualizar' : 'criar'} departamento. Tente novamente.`,
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteClick = (department: Department) => {
        setDepartmentToDelete(department);
        setIsDeleting(true);
    };

    const confirmDelete = async () => {
        if (departmentToDelete && organizationId) {
            setIsLoading(true);
            try {
                await deleteDepartmentFromFirestore(organizationId, departmentToDelete.id);
                toast({ title: "Sucesso", description: "Departamento removido com sucesso." });
                await loadDepartments();
            } catch (error: any) {
                console.error("Falha ao remover departamento:", error);
                toast({ title: "Erro", description: error.message || "Falha ao remover departamento.", variant: "destructive" });
            } finally {
                setIsLoading(false);
                setIsDeleting(false);
                setDepartmentToDelete(null);
            }
        }
    };

    const openEditForm = (department: Department) => {
        setSelectedDepartment(department);
        setIsFormOpen(true);
    };

    const openAddForm = () => {
        setSelectedDepartment(null);
        setIsFormOpen(true);
    };
    
    if (role === 'admin' && !organizationId && !isLoading) {
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
                        <Building className="h-5 w-5" />
                        Gerenciamento de Departamentos
                    </CardTitle>
                    <CardDescription>Crie, edite ou remova departamentos na organização.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                         <div className="flex justify-center items-center py-10">
                             <LoadingSpinner text="Carregando departamentos..."/>
                         </div>
                    ) : (!organizationId && role==='admin') ? (
                         <div className="text-center py-10 text-muted-foreground">
                             <AlertTriangle className="mx-auto h-10 w-10 mb-2 text-yellow-500" />
                             <p>O administrador não está associado a uma organização.</p>
                             <p className="text-xs">Não é possível carregar ou criar departamentos.</p>
                         </div>
                    ) : departments.length === 0 ? (
                        <div className="text-center py-10 text-muted-foreground">
                            <Frown className="mx-auto h-10 w-10 mb-2" />
                            <p>Nenhum departamento encontrado para esta organização.</p>
                            {organizationId && (
                                <Button className="mt-4" onClick={openAddForm}>
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    Criar Primeiro Departamento
                                </Button>
                            )}
                        </div>
                     ) : (
                        <DataTable
                            columns={columns}
                            data={departments}
                            filterColumn="name"
                            filterPlaceholder="Buscar por nome..."
                        />
                    )}
                </CardContent>
                 { !isLoading && departments.length > 0 && organizationId && (
                    <CardFooter className="flex justify-end">
                        <Button onClick={openAddForm}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Adicionar Departamento
                        </Button>
                    </CardFooter>
                 )}
            </Card>

            {organizationId && (
                <DepartmentForm
                    department={selectedDepartment}
                    onSave={handleSaveDepartment}
                    open={isFormOpen}
                    onOpenChange={setIsFormOpen}
                />
            )}

            <AlertDialog open={isDeleting} onOpenChange={setIsDeleting}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar Remoção</AlertDialogTitle>
                        <AlertDialogDescription>
                             Tem certeza que deseja remover o departamento "{departmentToDelete?.name}"? Esta ação pode afetar colaboradores e tarefas associadas.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => { setDepartmentToDelete(null); setIsDeleting(false); }}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Remover
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
