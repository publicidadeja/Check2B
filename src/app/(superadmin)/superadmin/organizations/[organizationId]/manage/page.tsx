// src/app/(superadmin)/superadmin/organizations/[organizationId]/manage/page.tsx
'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Building, Users, PlusCircle, MoreHorizontal, Edit2, Trash2, ShieldAlert, Loader2, ArrowLeft, UserX, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'; // CardFooter removed as not used
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'; // Added DropdownMenu imports


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
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = React.useState(false);
  const [confirmDialogAction, setConfirmDialogAction] = React.useState<'remove' | 'toggleStatus' | null>(null);
  const [isProcessing, setIsProcessing] = React.useState(false);
  // Add EditAdminForm state if you create that component
  // const [isEditAdminFormOpen, setIsEditAdminFormOpen] = React.useState(false);


  const loadData = React.useCallback(async () => {
    if (!organizationId) return;
    setIsLoading(true);
    try {
      const [orgDetails, orgAdmins] = await Promise.all([
        getOrganizationById(organizationId),
        getUsersByRoleAndOrganization('admin', organizationId),
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

  const openConfirmDialog = (admin: UserProfile, action: 'remove' | 'toggleStatus') => {
    setAdminToModify(admin);
    setConfirmDialogAction(action);
    setIsConfirmDialogOpen(true);
  };

  const handleConfirmAction = async () => {
    if (!adminToModify || !organization || !confirmDialogAction || !firebaseApp) return;
    setIsProcessing(true);
    const functions = getFunctions(firebaseApp);

    try {
        if (confirmDialogAction === 'remove') {
            const removeAdminFunc = httpsCallable(functions, 'removeAdminFromOrganizationFirebase');
            await removeAdminFunc({ userId: adminToModify.uid, organizationId: organization.id });
            toast({ title: "Sucesso", description: `Admin ${adminToModify.name} removido da organização.` });
        } else if (confirmDialogAction === 'toggleStatus') {
            const newStatus = adminToModify.status === 'active' ? 'inactive' : 'active';
            const toggleStatusFunc = httpsCallable(functions, 'toggleUserStatusFirebase'); // Changed from toggleAdminStatusFirebase
            await toggleStatusFunc({ userId: adminToModify.uid, status: newStatus });
            toast({ title: "Sucesso", description: `Status do admin ${adminToModify.name} alterado para ${newStatus}.` });
        }
        await loadData();
    } catch (error: any) {
        console.error(`Error ${confirmDialogAction} admin:`, error);
        toast({ title: "Erro", description: error.message || `Falha ao ${confirmDialogAction === 'remove' ? 'remover' : 'alterar status do'} admin.`, variant: "destructive" });
    } finally {
        setIsProcessing(false);
        setIsConfirmDialogOpen(false);
        setAdminToModify(null);
        setConfirmDialogAction(null);
    }
  };

  // Placeholder for edit functionality
  const handleEditAdmin = (admin: UserProfile) => {
      console.log("Edit admin clicked:", admin);
      toast({title: "Info", description: "Funcionalidade de edição de admin ainda não implementada."});
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
      cell: ({ row }) => <Badge variant={row.original.status === 'active' ? 'default' : 'secondary'} className={row.original.status === 'active' ? 'bg-green-100 text-green-800' : ''}>{row.original.status}</Badge>,
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const adminUser = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleEditAdmin(adminUser)}>
                    <Edit2 className="mr-2 h-4 w-4" /> Editar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => openConfirmDialog(adminUser, 'toggleStatus')}>
                    {adminUser.status === 'active' ? <UserX className="mr-2 h-4 w-4"/> : <UserCheck className="mr-2 h-4 w-4"/>}
                    {adminUser.status === 'active' ? 'Desativar' : 'Ativar'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => openConfirmDialog(adminUser, 'remove')} className="text-destructive focus:text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" /> Remover da Organização
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
                Gerenciar Organização: {organization.name}
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

      <AlertDialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Ação</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialogAction === 'remove' && `Tem certeza que deseja remover ${adminToModify?.name} como administrador desta organização? Isso revogará suas permissões de admin para esta organização.`}
              {confirmDialogAction === 'toggleStatus' && `Tem certeza que deseja ${adminToModify?.status === 'active' ? 'desativar' : 'ativar'} o administrador ${adminToModify?.name}?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmAction} className={confirmDialogAction === 'remove' ? "bg-destructive hover:bg-destructive/90" : ""} disabled={isProcessing}>
              {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (confirmDialogAction === 'remove' ? 'Remover' : 'Confirmar')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
