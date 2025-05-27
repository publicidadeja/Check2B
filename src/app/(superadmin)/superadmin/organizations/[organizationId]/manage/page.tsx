// src/app/(superadmin)/superadmin/organizations/[organizationId]/manage/page.tsx
'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Building, Users, PlusCircle, MoreHorizontal, Edit2, Trash2, ShieldAlert, Loader2, ArrowLeft, UserX, UserCheck, UserMinus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import type { ColumnDef } from '@tanstack/react-table';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';
import { AddAdminForm } from '@/components/organization/add-admin-form';
import type { UserProfile } from '@/types/user';
import type { Organization } from '@/app/(superadmin)/superadmin/organizations/page';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { getFunctions, httpsCallable } from "firebase/functions";
import { getFirebaseApp } from '@/lib/firebase';
import { getOrganizationById } from '@/lib/organization-service';
import { getUsersByRoleAndOrganization } from '@/lib/user-service';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';


export default function ManageOrganizationPage() {
  const router = useRouter();
  const params = useParams();
  const organizationId = params.organizationId as string;
  const { toast } = useToast();
  const firebaseApp = getFirebaseApp();

  const [organization, setOrganization] = React.useState<Organization | null>(null);
  const [admins, setAdmins] = React.useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isAddAdminFormOpen, setIsAddAdminFormOpen] = React.useState(false);
  
  const [adminToModify, setAdminToModify] = React.useState<UserProfile | null>(null);
  const [isConfirmToggleStatusDialogOpen, setIsConfirmToggleStatusDialogOpen] = React.useState(false);
  const [isConfirmDeleteUserDialogOpen, setIsConfirmDeleteUserDialogOpen] = React.useState(false);
  const [isConfirmRemoveAdminRoleDialogOpen, setIsConfirmRemoveAdminRoleDialogOpen] = React.useState(false);

  const [isProcessing, setIsProcessing] = React.useState(false);


  const loadData = React.useCallback(async () => {
    if (!organizationId) return;
    setIsLoading(true);
    try {
      const [orgDetails, orgAdmins] = await Promise.all([
        getOrganizationById(organizationId),
        getUsersByRoleAndOrganization('admin', organizationId), // Fetch only admins for this org
      ]);
      setOrganization(orgDetails);
      setAdmins(orgAdmins || []);
    } catch (error) {
      console.error("Falha ao carregar dados da organização:", error);
      toast({ title: "Erro", description: "Não foi possível carregar os dados.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [organizationId, toast]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const getInitials = (name?: string) => name ? name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() : 'AD';

  const handleAdminAdded = () => {
    loadData(); 
  };

  const openToggleStatusDialog = (admin: UserProfile) => {
    setAdminToModify(admin);
    setIsConfirmToggleStatusDialogOpen(true);
  };

  const openDeleteUserDialog = (admin: UserProfile) => {
    setAdminToModify(admin);
    setIsConfirmDeleteUserDialogOpen(true);
  };
  
  const openRemoveAdminRoleDialog = (admin: UserProfile) => {
    setAdminToModify(admin);
    setIsConfirmRemoveAdminRoleDialogOpen(true);
  };

  const handleToggleAdminStatus = async () => {
    if (!adminToModify || !organization || !firebaseApp) return;
    setIsProcessing(true);
    const functions = getFunctions(firebaseApp);
    const toggleStatusFunc = httpsCallable(functions, 'toggleUserStatusFirebase');
    const newStatus = adminToModify.status === 'active' ? 'inactive' : 'active';

    try {
        await toggleStatusFunc({ userId: adminToModify.uid, status: newStatus });
        toast({ title: "Sucesso", description: `Status do admin ${adminToModify.name} alterado para ${newStatus}.` });
        await loadData(); 
    } catch (error: any) {
        console.error(`Error toggling admin status:`, error);
        toast({ title: "Erro", description: error.message || `Falha ao alterar status do admin.`, variant: "destructive" });
    } finally {
        setIsProcessing(false);
        setIsConfirmToggleStatusDialogOpen(false);
        setAdminToModify(null);
    }
  };
  
  const handleConfirmPermanentDeleteUser = async () => {
    if (!adminToModify || !organization || !firebaseApp) return;
    setIsProcessing(true);
    const functions = getFunctions(firebaseApp);
    const deleteUserFunc = httpsCallable(functions, 'deleteOrganizationUser');

    try {
        await deleteUserFunc({ userId: adminToModify.uid, organizationId: organization.id });
        toast({ title: "Sucesso", description: `Usuário admin ${adminToModify.name} excluído permanentemente.` });
        await loadData(); 
    } catch (error: any) {
        console.error(`Error deleting admin user:`, error);
        toast({ title: "Erro", description: error.message || `Falha ao excluir usuário admin.`, variant: "destructive" });
    } finally {
        setIsProcessing(false);
        setIsConfirmDeleteUserDialogOpen(false);
        setAdminToModify(null);
    }
  };

  const handleConfirmRemoveAdminRole = async () => {
    if (!adminToModify || !organization || !firebaseApp) return;
    setIsProcessing(true);
    const functions = getFunctions(firebaseApp);
    const removeAdminRoleFunc = httpsCallable(functions, 'removeAdminFromOrganizationFirebase');

    try {
        await removeAdminRoleFunc({ userId: adminToModify.uid, organizationId: organization.id });
        toast({ title: "Sucesso", description: `Privilégios de admin removidos para ${adminToModify.name} na organização ${organization.name}.` });
        await loadData(); // Recarrega os dados (o usuário pode não ser mais listado como admin aqui)
    } catch (error: any) {
        console.error(`Error removing admin role:`, error);
        toast({ title: "Erro", description: error.message || `Falha ao remover privilégios de admin.`, variant: "destructive" });
    } finally {
        setIsProcessing(false);
        setIsConfirmRemoveAdminRoleDialogOpen(false);
        setAdminToModify(null);
    }
  };


  // Placeholder for edit functionality
  const handleEditAdmin = (admin: UserProfile) => {
      console.log("Edit admin clicked:", admin);
      toast({title: "Info", description: "Funcionalidade de edição de admin ainda não implementada."});
      // Example:
      // setSelectedAdminToEdit(admin);
      // setIsEditAdminFormOpen(true);
  }

  const columns: ColumnDef<UserProfile>[] = [
    {
      accessorKey: "name",
      header: "Nome",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={row.original.photoUrl} alt={row.original.name} />
            <AvatarFallback>{getInitials(row.original.name)}</AvatarFallback>
          </Avatar>
          <span className="font-medium">{row.original.name}</span>
        </div>
      ),
    },
    { accessorKey: "email", header: "Email" },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <Badge variant={row.original.status === 'active' ? 'default' : 'secondary'} className={row.original.status === 'active' ? 'bg-green-100 text-green-800' : ''}>{row.original.status === 'active' ? 'Ativo' : 'Inativo'}</Badge>,
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const adminUser = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuLabel>Ações para {adminUser.name}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleEditAdmin(adminUser)}>
                    <Edit2 className="mr-2 h-4 w-4" /> Editar Detalhes
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => openToggleStatusDialog(adminUser)}>
                    {adminUser.status === 'active' ? <UserX className="mr-2 h-4 w-4"/> : <UserCheck className="mr-2 h-4 w-4"/>}
                    {adminUser.status === 'active' ? 'Desativar' : 'Ativar'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => openRemoveAdminRoleDialog(adminUser)}>
                    <UserMinus className="mr-2 h-4 w-4" /> Remover Privilégios de Admin
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => openDeleteUserDialog(adminUser)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                    <Trash2 className="mr-2 h-4 w-4" /> Excluir Usuário (Permanente)
                </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  if (isLoading) {
    return <div className="flex justify-center items-center h-full py-10"><LoadingSpinner text="Carregando dados da organização..." size="lg"/></div>;
  }

  if (!organization) {
    return (
      <div className="text-center py-10">
        <ShieldAlert className="mx-auto h-12 w-12 text-destructive mb-4" />
        <p className="text-muted-foreground text-lg">Organização não encontrada.</p>
        <Button variant="outline" onClick={() => router.push('/superadmin/organizations')} className="mt-6">
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para Organizações
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
            <Button variant="outline" size="sm" onClick={() => router.push('/superadmin/organizations')} className="mb-2">
                <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para Organizações
            </Button>
            <h1 className="text-2xl font-semibold flex items-center gap-2">
                <Building className="h-6 w-6 text-primary" />
                Gerenciar Admins: {organization.name}
            </h1>
            <p className="text-sm text-muted-foreground">
                Adicione, remova ou gerencie administradores para esta organização.
            </p>
        </div>
      </div>
      
      <Separator />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Administradores da Organização</CardTitle>
            <CardDescription>Usuários com permissão de admin para "{organization.name}".</CardDescription>
          </div>
          <Button onClick={() => setIsAddAdminFormOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Admin
          </Button>
        </CardHeader>
        <CardContent>
          {admins.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum administrador cadastrado para esta organização.</p>
          ) : (
            <DataTable columns={columns} data={admins} filterColumn="name" filterPlaceholder="Buscar admin..." />
          )}
        </CardContent>
      </Card>

      <AddAdminForm
        organizationId={organization.id}
        organizationName={organization.name}
        onAdminAdded={handleAdminAdded}
        open={isAddAdminFormOpen}
        onOpenChange={setIsAddAdminFormOpen}
      />

      {/* Dialog para Ativar/Desativar Admin */}
      <AlertDialog open={isConfirmToggleStatusDialogOpen} onOpenChange={setIsConfirmToggleStatusDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Alteração de Status</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja {adminToModify?.status === 'active' ? 'DESATIVAR' : 'ATIVAR'} o administrador {adminToModify?.name}?
              {adminToModify?.status === 'active' ? ' O usuário não poderá mais acessar o painel de admin da organização.' : ' O usuário poderá acessar o painel de admin da organização.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing} onClick={() => setAdminToModify(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleToggleAdminStatus} disabled={isProcessing}>
              {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (adminToModify?.status === 'active' ? 'Desativar' : 'Ativar')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog para Excluir Usuário Admin Permanentemente */}
      <AlertDialog open={isConfirmDeleteUserDialogOpen} onOpenChange={setIsConfirmDeleteUserDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão Permanente</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja EXCLUIR PERMANENTEMENTE o usuário administrador {adminToModify?.name} ({adminToModify?.email})?
              Esta ação removerá o usuário do Firebase Authentication e do Firestore. **Esta ação não pode ser desfeita.**
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing} onClick={() => setAdminToModify(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmPermanentDeleteUser} className="bg-destructive hover:bg-destructive/90" disabled={isProcessing}>
              {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Excluir Permanentemente'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog para Remover Privilégios de Admin (Demote) */}
      <AlertDialog open={isConfirmRemoveAdminRoleDialogOpen} onOpenChange={setIsConfirmRemoveAdminRoleDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Remoção de Privilégios de Admin</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover os privilégios de administrador de {adminToModify?.name} para a organização "{organization?.name}"?
              O usuário será rebaixado para colaborador (ou outro papel padrão, dependendo da lógica da Cloud Function).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing} onClick={() => setAdminToModify(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmRemoveAdminRole} disabled={isProcessing}>
              {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Confirmar Remoção de Privilégios'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
