// src/app/(admin)/roles/page.tsx
'use client';

import * as React from 'react';
import { PlusCircle, MoreHorizontal, Edit, Trash2, Briefcase, Loader2, Frown, AlertTriangle } from 'lucide-react';
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
import { RoleForm } from '@/components/role/role-form';
import type { Role } from '@/types/role'; // Use the new Role type
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useAuth } from '@/hooks/use-auth';
import { getRolesByOrganization, saveRole as saveRoleToFirestore, deleteRole as deleteRoleFromFirestore } from '@/lib/role-service'; // Import role services
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

export default function RolesPage() {
    const { organizationId, role: adminAuthRole } = useAuth(); // Renamed role to avoid conflict
    const [roles, setRoles] = React.useState<Role[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [selectedRole, setSelectedRole] = React.useState<Role | null>(null);
    const [isFormOpen, setIsFormOpen] = React.useState(false);
    const [isDeleting, setIsDeleting] = React.useState(false);
    const [roleToDelete, setRoleToDelete] = React.useState<Role | null>(null);
    const { toast } = useToast();

    const columns: ColumnDef<Role>[] = [
        { accessorKey: "name", header: "Nome da Função", cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
        { accessorKey: "description", header: "Descrição", cell: ({ row }) => row.original.description || '-' },
        {
            id: "actions",
            cell: ({ row }) => {
                const currentRole = row.original; // Renamed to avoid conflict with adminAuthRole
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
                            <DropdownMenuItem onClick={() => openEditForm(currentRole)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Editar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                onClick={() => handleDeleteClick(currentRole)}
                                className="text-destructive focus:text-destructive focus:bg-destructive/10"
                                // disabled={['Recrutadora', 'Desenvolvedor Backend'].includes(currentRole.name) && roles.length <= 2} // Example disabled logic
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

    const loadRoles = React.useCallback(async () => {
        if (!organizationId || (adminAuthRole !== 'admin' && adminAuthRole !== 'super_admin')) {
            setIsLoading(false);
            if (adminAuthRole === 'admin' && !organizationId) {
                 toast({ title: "Erro de Configuração", description: "ID da organização não encontrado para o admin.", variant: "destructive" });
            }
            return;
        }
        setIsLoading(true);
        try {
            const data = await getRolesByOrganization(organizationId);
            setRoles(data);
        } catch (error) {
            console.error("Falha ao carregar funções:", error);
            toast({ title: "Erro", description: "Falha ao carregar funções.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }, [organizationId, adminAuthRole, toast]);

    React.useEffect(() => {
        loadRoles();
    }, [loadRoles]);


    const handleSaveRole = async (data: Omit<Role, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>) => {
         if (!organizationId) {
            toast({ title: "Erro", description: "ID da organização não disponível para salvar.", variant: "destructive" });
            return;
        }
        const roleDataToSave = selectedRole 
            ? { ...data, id: selectedRole.id } 
            : data;
        
        setIsLoading(true);
        try {
            await saveRoleToFirestore(organizationId, roleDataToSave);
            setIsFormOpen(false);
            setSelectedRole(null);
            await loadRoles();
            toast({
                title: "Sucesso!",
                description: `Função ${selectedRole ? 'atualizada' : 'criada'} com sucesso.`,
            });
        } catch (error) {
            console.error("Erro ao salvar função:", error);
            toast({
                title: "Erro!",
                description: `Falha ao ${selectedRole ? 'atualizar' : 'criar'} função. Tente novamente.`,
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteClick = (role: Role) => {
        setRoleToDelete(role);
        setIsDeleting(true);
    };

    const confirmDelete = async () => {
        if (roleToDelete && organizationId) {
            setIsLoading(true);
            try {
                await deleteRoleFromFirestore(organizationId, roleToDelete.id);
                toast({ title: "Sucesso", description: "Função removida com sucesso." });
                await loadRoles();
            } catch (error: any) {
                console.error("Falha ao remover função:", error);
                toast({ title: "Erro", description: error.message || "Falha ao remover função.", variant: "destructive" });
            } finally {
                setIsLoading(false);
                setIsDeleting(false);
                setRoleToDelete(null);
            }
        }
    };

    const openEditForm = (role: Role) => {
        setSelectedRole(role);
        setIsFormOpen(true);
    };

    const openAddForm = () => {
        setSelectedRole(null);
        setIsFormOpen(true);
    };
    
    if (adminAuthRole === 'admin' && !organizationId && !isLoading) {
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
                        <Briefcase className="h-5 w-5" />
                        Gerenciamento de Funções (Cargos)
                    </CardTitle>
                    <CardDescription>Crie, edite ou remova funções (cargos) na organização.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                         <div className="flex justify-center items-center py-10">
                             <LoadingSpinner text="Carregando funções..."/>
                         </div>
                    ) : (!organizationId && adminAuthRole==='admin') ? (
                         <div className="text-center py-10 text-muted-foreground">
                             <AlertTriangle className="mx-auto h-10 w-10 mb-2 text-yellow-500" />
                             <p>O administrador não está associado a uma organização.</p>
                             <p className="text-xs">Não é possível carregar ou criar funções.</p>
                         </div>
                    ) : roles.length === 0 ? (
                        <div className="text-center py-10 text-muted-foreground">
                            <Frown className="mx-auto h-10 w-10 mb-2" />
                            <p>Nenhuma função encontrada para esta organização.</p>
                            {organizationId && (
                                <Button className="mt-4" onClick={openAddForm}>
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    Criar Primeira Função
                                </Button>
                            )}
                        </div>
                     ) : (
                        <DataTable
                            columns={columns}
                            data={roles}
                            filterColumn="name"
                            filterPlaceholder="Buscar por nome..."
                        />
                    )}
                </CardContent>
                 { !isLoading && roles.length > 0 && organizationId && (
                    <CardFooter className="flex justify-end">
                        <Button onClick={openAddForm}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Adicionar Função
                        </Button>
                    </CardFooter>
                 )}
            </Card>

            {organizationId && (
                <RoleForm
                    role={selectedRole}
                    onSave={handleSaveRole}
                    open={isFormOpen}
                    onOpenChange={setIsFormOpen}
                />
            )}

            <AlertDialog open={isDeleting} onOpenChange={setIsDeleting}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar Remoção</AlertDialogTitle>
                        <AlertDialogDescription>
                             Tem certeza que deseja remover a função "{roleToDelete?.name}"? Esta ação pode afetar colaboradores com esta função.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => { setRoleToDelete(null); setIsDeleting(false); }}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Remover
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
