// src/app/(superadmin)/superadmin/organizations/[organizationId]/manage/page.tsx
'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Building, Users, PlusCircle, MoreHorizontal, Edit2, Trash2, ShieldAlert, Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import type { ColumnDef } from '@tanstack/react-table';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';
import { AddAdminForm } from '@/components/organization/add-admin-form'; // Component to be created
import type { UserProfile } from '@/types/user'; // Assuming UserProfile is defined
import { Organization } from '@/app/(superadmin)/superadmin/organizations/page'; // Import Organization type
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { getFunctions, httpsCallable } from "firebase/functions"; // For calling Cloud Functions
import { getFirebaseApp } from '@/lib/firebase'; // Your Firebase app instance

// Mock data - replace with actual data fetching
const mockOrganizationsData: Organization[] = [
  { id: 'org_default', name: 'Empresa Padrão (Dev)', plan: 'premium', status: 'active', createdAt: new Date(2023, 5, 15), adminCount: 2, userCount: 15 },
  { id: 'org_abc', name: 'Cliente ABC Ltda.', plan: 'basic', status: 'active', createdAt: new Date(2024, 0, 10), adminCount: 1, userCount: 5 },
  { id: 'org_xyz', name: 'Consultoria XYZ', plan: 'enterprise', status: 'inactive', createdAt: new Date(2023, 10, 1), adminCount: 5, userCount: 50 },
];

let mockOrgAdmins: UserProfile[] = [ // Let, so we can modify it
    { uid: 'admin1_org_default', name: 'Admin Dev 1', email: 'dev1@orgdefault.com', role: 'admin', organizationId: 'org_default', status: 'active' },
    { uid: 'admin2_org_default', name: 'Admin Dev 2', email: 'dev2@orgdefault.com', role: 'admin', organizationId: 'org_default', status: 'active' },
    { uid: 'admin1_org_abc', name: 'Admin ABC', email: 'admin@orgabc.com', role: 'admin', organizationId: 'org_abc', status: 'active' },
];


// Mock API functions
const fetchOrganizationDetails = async (orgId: string): Promise<Organization | null> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return mockOrganizationsData.find(org => org.id === orgId) || null;
};

const fetchOrganizationAdmins = async (orgId: string): Promise<UserProfile[]> => {
    await new Promise(resolve => setTimeout(resolve, 400));
    return mockOrgAdmins.filter(admin => admin.organizationId === orgId);
};

const removeAdminFromOrganization = async (adminUserId: string, organizationId: string): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    // In a real app, this would involve:
    // 1. Removing/updating custom claims (e.g., set role to 'collaborator' or remove organizationId)
    // 2. Updating the user's document in Firestore
    // For mock, just filter out:
    mockOrgAdmins = mockOrgAdmins.filter(admin => !(admin.uid === adminUserId && admin.organizationId === organizationId));
    console.log(`Mock: Admin ${adminUserId} removed from org ${organizationId}`);
    // Potentially disable the user in Firebase Auth if they have no other roles/orgs
};


export default function ManageOrganizationPage() {
  const router = useRouter();
  const params = useParams();
  const organizationId = params.organizationId as string;
  const { toast } = useToast();

  const [organization, setOrganization] = React.useState<Organization | null>(null);
  const [admins, setAdmins] = React.useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isAddAdminFormOpen, setIsAddAdminFormOpen] = React.useState(false);
  const [adminToRemove, setAdminToRemove] = React.useState<UserProfile | null>(null);
  const [isDeletingAdmin, setIsDeletingAdmin] = React.useState(false);

  const loadData = React.useCallback(async () => {
    if (!organizationId) return;
    setIsLoading(true);
    try {
      const [orgDetails, orgAdmins] = await Promise.all([
        fetchOrganizationDetails(organizationId),
        fetchOrganizationAdmins(organizationId),
      ]);
      setOrganization(orgDetails);
      setAdmins(orgAdmins);
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

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

  const handleAdminAdded = () => {
    loadData(); // Refresh admin list
  };

  const handleDeleteAdminClick = (admin: UserProfile) => {
    setAdminToRemove(admin);
    setIsDeletingAdmin(true);
  };

  const confirmDeleteAdmin = async () => {
    if (adminToRemove && organization) {
      try {
        // Here you would call a Cloud Function to properly remove admin privileges
        // For mock purposes:
        await removeAdminFromOrganization(adminToRemove.uid, organization.id);
        toast({ title: "Sucesso", description: `Admin ${adminToRemove.name} removido da organização.` });
        loadData(); // Refresh admin list
      } catch (error: any) {
        toast({ title: "Erro", description: error.message || "Falha ao remover admin.", variant: "destructive" });
      } finally {
        setIsDeletingAdmin(false);
        setAdminToRemove(null);
      }
    }
  };

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
          <Button variant="ghost" size="sm" onClick={() => handleDeleteAdminClick(adminUser)} className="text-destructive hover:text-destructive hover:bg-destructive/10">
             <Trash2 className="mr-2 h-3.5 w-3.5" /> Remover
          </Button>
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
        <p className="text-muted-foreground">Organização não encontrada.</p>
        <Button variant="outline" onClick={() => router.back()} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
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
                Adicione ou remova administradores para esta organização.
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

      <AlertDialog open={isDeletingAdmin} onOpenChange={setIsDeletingAdmin}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Remoção de Admin</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover {adminToRemove?.name} como administrador desta organização?
              Isso não removerá o usuário do sistema, apenas suas permissões de admin para esta organização.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteAdmin} className="bg-destructive hover:bg-destructive/90">
              Remover Admin
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
