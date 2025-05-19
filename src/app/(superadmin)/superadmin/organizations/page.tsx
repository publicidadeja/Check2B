// src/app/(superadmin)/superadmin/organizations/page.tsx
'use client';

import * as React from 'react';
import { Building, PlusCircle, MoreHorizontal, Edit, Trash2, ToggleRight, Eye, CircleSlash, Users as UsersIcon, CalendarDays } from 'lucide-react'; // Added UsersIcon, CalendarDays
import { DataTable } from '@/components/ui/data-table';
import type { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
// Removed Input import as filter is part of DataTable
import { Badge } from '@/components/ui/badge';
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
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { OrganizationForm } from '@/components/organization/organization-form';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Define Organization type specifically for this context
export interface Organization {
  id: string;
  name: string;
  plan: 'basic' | 'premium' | 'enterprise';
  status: 'active' | 'inactive' | 'pending';
  createdAt: Date;
  adminCount?: number;
  userCount?: number;
}

// Mock data for organizations
const mockOrganizations: Organization[] = [
  { id: 'org_default', name: 'Empresa Padrão (Dev)', plan: 'premium', status: 'active', createdAt: new Date(2023, 5, 15), adminCount: 2, userCount: 15 },
  { id: 'org_abc', name: 'Cliente ABC Ltda.', plan: 'basic', status: 'active', createdAt: new Date(2024, 0, 10), adminCount: 1, userCount: 5 },
  { id: 'org_xyz', name: 'Consultoria XYZ', plan: 'enterprise', status: 'inactive', createdAt: new Date(2023, 10, 1), adminCount: 5, userCount: 50 },
  { id: 'org_new', name: 'Nova Empresa S/A', plan: 'premium', status: 'pending', createdAt: new Date(2024, 4, 1), adminCount: 0, userCount: 0 },
];

// Mock API functions (replace with actual Firestore calls)
const fetchOrganizations = async (): Promise<Organization[]> => {
  await new Promise(resolve => setTimeout(resolve, 600));
  return [...mockOrganizations];
};

// Ensure OrganizationFormData matches the form's output
type OrganizationFormData = Pick<Organization, 'name' | 'plan' | 'status'>;

const saveOrganization = async (orgData: OrganizationFormData, existingId?: string): Promise<Organization> => {
  await new Promise(resolve => setTimeout(resolve, 700));
  if (existingId) {
    const index = mockOrganizations.findIndex(o => o.id === existingId);
    if (index !== -1) {
      mockOrganizations[index] = {
          ...mockOrganizations[index], // Keep existing createdAt, counts etc.
          name: orgData.name,
          plan: orgData.plan,
          status: orgData.status,
       };
      console.log("Organização atualizada:", mockOrganizations[index]);
      return mockOrganizations[index];
    } else {
      throw new Error("Organização não encontrada para atualização");
    }
  } else {
    const newOrg: Organization = {
      id: `org_${Date.now()}`,
      name: orgData.name,
      plan: orgData.plan,
      status: orgData.status,
      createdAt: new Date(),
      adminCount: 0,
      userCount: 0,
    };
    mockOrganizations.push(newOrg);
    console.log("Nova organização criada:", newOrg);
    return newOrg;
  }
};

const deleteOrganization = async (orgId: string): Promise<void> => {
  await new Promise(resolve => setTimeout(resolve, 500));
   if (orgId === 'org_default') {
      throw new Error("Não é possível remover a organização padrão de desenvolvimento.");
  }
  const index = mockOrganizations.findIndex(o => o.id === orgId);
  if (index !== -1) {
    mockOrganizations.splice(index, 1);
    console.log("Organização removida:", orgId);
  } else {
    throw new Error("Organização não encontrada para remoção");
  }
};

const toggleOrganizationStatus = async (orgId: string): Promise<Organization> => {
   await new Promise(resolve => setTimeout(resolve, 400));
    if (orgId === 'org_default') {
      throw new Error("Não é possível alterar o status da organização padrão.");
    }
   const index = mockOrganizations.findIndex(o => o.id === orgId);
   if (index !== -1) {
       mockOrganizations[index].status = mockOrganizations[index].status === 'active' ? 'inactive' : 'active';
       console.log("Status da organização alterado:", mockOrganizations[index]);
       return mockOrganizations[index];
   } else {
        throw new Error("Organização não encontrada para alterar status");
   }
}

export default function OrganizationsPage() {
  const [organizations, setOrganizations] = React.useState<Organization[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [selectedOrganization, setSelectedOrganization] = React.useState<Organization | null>(null);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [organizationToDelete, setOrganizationToDelete] = React.useState<Organization | null>(null);
  const { toast } = useToast();

   const getStatusBadgeVariant = (status: Organization['status']): "default" | "secondary" | "outline" | "destructive" => {
        switch (status) {
            case 'active': return 'default';
            case 'inactive': return 'secondary';
            case 'pending': return 'outline';
            default: return 'secondary';
        }
    };

    const getStatusText = (status: Organization['status']): string => {
        switch (status) {
            case 'active': return 'Ativa';
            case 'inactive': return 'Inativa';
            case 'pending': return 'Pendente';
            default: return status;
        }
    };


  const columns: ColumnDef<Organization>[] = [
    { accessorKey: "name", header: "Nome", cell: ({ row }) => <span className="font-medium">{row.original.name}</span>, minSize: 200 },
    { accessorKey: "plan", header: "Plano", cell: ({ row }) => <Badge variant="outline" className="capitalize text-xs">{row.original.plan}</Badge>, size:100 },
    {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <Badge variant={getStatusBadgeVariant(row.original.status)} className={row.original.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200' : 'text-xs'}>{getStatusText(row.original.status)}</Badge>,
        size: 100
    },
    { accessorKey: "userCount", header: () => <div className="text-center flex items-center gap-1"><UsersIcon className="h-3 w-3"/>Usuários</div>, cell: ({ row }) => <div className="text-center text-xs">{row.original.userCount ?? '-'}</div>, size: 100 },
    { accessorKey: "createdAt", header: () => <div className="flex items-center gap-1"><CalendarDays className="h-3 w-3"/>Criada em</div>, cell: ({ row }) => <span className="text-xs">{format(row.original.createdAt, 'dd/MM/yyyy', { locale: ptBR })}</span>, size: 120 },
    {
      id: "actions",
      header: () => <div className="text-right">Ações</div>,
      cell: ({ row }) => {
        const org = row.original;
        return (
          <div className="text-right">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Abrir menu</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Ações</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => { toast({title: "Pendente", description:"Visualizar/Gerenciar ainda não implementado."}) }}>
                  <Eye className="mr-2 h-4 w-4" /> Gerenciar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => openEditForm(org)}>
                  <Edit className="mr-2 h-4 w-4" /> Editar Detalhes
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleToggleStatus(org)}>
                   {org.status === 'active' ? <CircleSlash className="mr-2 h-4 w-4" /> : <ToggleRight className="mr-2 h-4 w-4" />}
                   {org.status === 'active' ? 'Desativar' : 'Ativar'}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => handleDeleteClick(org)}
                  className="text-destructive focus:text-destructive focus:bg-destructive/10"
                  disabled={org.id === 'org_default'}
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Remover
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
      size: 80
    },
  ];

  const loadOrganizations = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchOrganizations();
      setOrganizations(data.sort((a,b) => a.name.localeCompare(b.name)));
    } catch (error) {
      console.error("Falha ao carregar organizações:", error);
      toast({ title: "Erro", description: "Falha ao carregar organizações.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    loadOrganizations();
  }, [loadOrganizations]);

  const handleSaveOrg = async (data: OrganizationFormData) => {
    setIsLoading(true);
    try {
      await saveOrganization(data, selectedOrganization?.id);
      setIsFormOpen(false);
      setSelectedOrganization(null);
      await loadOrganizations();
      toast({
        title: "Sucesso!",
        description: `Organização ${selectedOrganization ? 'atualizada' : 'criada'} com sucesso.`,
      });
    } catch (error) {
      console.error("Erro ao salvar organização:", error);
      toast({
        title: "Erro!",
        description: `Falha ao ${selectedOrganization ? 'atualizar' : 'criar'} organização.`,
        variant: "destructive",
      });
    } finally {
        setIsLoading(false);
    }
  };

  const handleDeleteClick = (org: Organization) => {
    setOrganizationToDelete(org);
    setIsDeleting(true);
  };

  const confirmDelete = async () => {
    if (organizationToDelete) {
       setIsLoading(true);
      try {
        await deleteOrganization(organizationToDelete.id);
        toast({ title: "Sucesso", description: "Organização removida com sucesso." });
        await loadOrganizations();
      } catch (error: any) {
        console.error("Falha ao remover organização:", error);
        toast({ title: "Erro", description: error.message || "Falha ao remover organização.", variant: "destructive" });
      } finally {
        setIsLoading(false);
        setIsDeleting(false);
        setOrganizationToDelete(null);
      }
    }
  };

   const handleToggleStatus = async (org: Organization) => {
      setIsLoading(true);
      try {
          await toggleOrganizationStatus(org.id);
          toast({ title: "Sucesso", description: `Status da organização ${org.name} alterado.` });
          await loadOrganizations();
      } catch (error: any) {
          console.error("Falha ao alterar status:", error);
          toast({ title: "Erro", description: error.message || "Falha ao alterar status.", variant: "destructive" });
      } finally {
           setIsLoading(false);
      }
  }

  const openEditForm = (org: Organization) => {
    setSelectedOrganization(org);
    setIsFormOpen(true);
  };

  const openAddForm = () => {
    setSelectedOrganization(null);
    setIsFormOpen(true);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" /> Gerenciamento de Organizações
          </CardTitle>
          <CardDescription>Crie, edite e gerencie as empresas clientes do sistema Check2B.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
             <div className="flex justify-center items-center py-10">
                <LoadingSpinner text="Carregando organizações..."/>
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={organizations}
              filterColumn="name"
              filterPlaceholder="Buscar por nome ou plano..."
            />
          )}
        </CardContent>
        {!isLoading && (
            <CardFooter className="flex justify-end">
               <Button onClick={openAddForm}>
                 <PlusCircle className="mr-2 h-4 w-4" />
                 Adicionar Organização
               </Button>
            </CardFooter>
        )}
      </Card>

       <OrganizationForm
          organization={selectedOrganization}
          onSave={handleSaveOrg}
          open={isFormOpen}
          onOpenChange={setIsFormOpen}
      />

       <AlertDialog open={isDeleting} onOpenChange={setIsDeleting}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Confirmar Remoção</AlertDialogTitle>
                    <AlertDialogDescription>
                        Tem certeza que deseja remover a organização "{organizationToDelete?.name}"? Esta ação é irreversível e removerá todos os dados associados (usuários, avaliações, etc.). A organização padrão não pode ser removida.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setOrganizationToDelete(null)}>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Remover Definitivamente
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}
