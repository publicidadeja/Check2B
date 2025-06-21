// src/app/(superadmin)/superadmin/organizations/page.tsx
'use client';

import * as React from 'react';
import { Building, PlusCircle, MoreHorizontal, Edit, Trash2, ToggleRight, Settings2, CircleSlash, Users as UsersIcon, CalendarDays, ShieldCheck, UserSquare } from 'lucide-react'; // Changed UserShield to ShieldCheck
import { DataTable } from '@/components/ui/data-table';
import type { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
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
import Link from 'next/link';
import { getAllOrganizations, saveOrganization as saveOrganizationToFirestore, deleteOrganizationFromFirestore, updateOrganizationStatusInFirestore } from '@/lib/organization-service';
import { getAllPlans } from '@/lib/plan-service'; // Import plan service
import type { Plan } from '@/types/plan'; // Import Plan type

export interface Organization {
  id: string;
  name: string;
  plan: string; // Changed from enum to string
  status: 'active' | 'inactive' | 'pending';
  createdAt: Date;
  adminCount?: number;
  collaboratorCount?: number;
}

type OrganizationFormData = Pick<Organization, 'name' | 'plan' | 'status'>;


export default function OrganizationsPage() {
  const [organizations, setOrganizations] = React.useState<Organization[]>([]);
  const [plans, setPlans] = React.useState<Plan[]>([]); // State for plans
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
    {
        id: 'adminCount',
        accessorKey: "adminCount",
        header: () => <div className="text-center flex items-center gap-1"><ShieldCheck className="h-3 w-3"/>Admins</div>, // Changed UserShield to ShieldCheck
        cell: ({ row }) => <div className="text-center text-xs">{row.original.adminCount ?? '-'}</div>,
        size: 100
    },
    {
        id: 'collaboratorCount',
        accessorKey: "collaboratorCount",
        header: () => <div className="text-center flex items-center gap-1"><UsersIcon className="h-3 w-3"/>Colab.</div>,
        cell: ({ row }) => <div className="text-center text-xs">{row.original.collaboratorCount ?? '-'}</div>,
        size: 100
    },
    {
      id: 'createdAt',
      accessorKey: "createdAt",
      header: () => <div className="flex items-center gap-1"><CalendarDays className="h-3 w-3"/>Criada em</div>,
      cell: ({ row }) => {
        const createdAtDate = row.original.createdAt;
        if (createdAtDate && createdAtDate instanceof Date && !isNaN(createdAtDate.getTime())) {
          return <span className="text-xs">{format(createdAtDate, 'dd/MM/yyyy', { locale: ptBR })}</span>;
        }
        // console.warn(`OrganizationsPage: Invalid createdAt value for org ${row.original.id}:`, createdAtDate);
        return <span className="text-xs">-</span>;
      },
      size: 120
    },
    {
      id: "actions",
      header: () => <div className="text-right">Ações</div>,
      cell: ({ row }) => {
        const org = row.original;
        const totalUsers = (org.adminCount ?? 0) + (org.collaboratorCount ?? 0);
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
                <DropdownMenuItem asChild>
                  <Link href={`/superadmin/organizations/${org.id}/manage`}>
                    <Settings2 className="mr-2 h-4 w-4" /> Gerenciar Admins
                  </Link>
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
                  disabled={org.id === 'org_default' || totalUsers > 0}
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

  const loadData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const [orgData, planData] = await Promise.all([
        getAllOrganizations(),
        getAllPlans()
      ]);
      setOrganizations(orgData.sort((a,b) => a.name.localeCompare(b.name)));
      setPlans(planData.filter(p => p.status === 'active')); // Only show active plans
    } catch (error) {
      console.error("Falha ao carregar organizações ou planos:", error);
      toast({ title: "Erro", description: "Falha ao carregar dados da página.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSaveOrg = async (data: OrganizationFormData) => {
    setIsLoading(true); // Consider a more specific saving flag if needed
    try {
      const orgPayload = selectedOrganization
        ? { ...selectedOrganization, ...data } // Retain existing ID and counts if editing
        : data; // For new, counts will be set by service or backend
      await saveOrganizationToFirestore(orgPayload as any);
      setIsFormOpen(false);
      setSelectedOrganization(null);
      await loadData();
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
     if (org.id === 'org_default') {
        toast({ title: "Ação Bloqueada", description: "A organização padrão de desenvolvimento não pode ser removida.", variant: "destructive" });
        return;
    }
    const totalUsers = (org.adminCount ?? 0) + (org.collaboratorCount ?? 0);
    if (totalUsers > 0) {
        toast({ title: "Ação Bloqueada", description: "Não é possível remover organizações com usuários (admins ou colaboradores). Desative-a ou remova os usuários primeiro.", variant: "destructive" });
        return;
    }
    setOrganizationToDelete(org);
    setIsDeleting(true);
  };

  const confirmDelete = async () => {
    if (organizationToDelete) {
       setIsLoading(true); // Or a specific deleting flag
      try {
        await deleteOrganizationFromFirestore(organizationToDelete.id);
        toast({ title: "Sucesso", description: "Organização removida com sucesso." });
        await loadData();
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
      if (org.id === 'org_default') {
          toast({ title: "Ação Bloqueada", description: "Não é possível alterar o status da organização padrão.", variant: "destructive" });
          return;
      }
      setIsLoading(true); // Or a specific status toggle flag
      const newStatus = org.status === 'active' ? 'inactive' : 'active';
      try {
          await updateOrganizationStatusInFirestore(org.id, newStatus);
          toast({ title: "Sucesso", description: `Status da organização ${org.name} alterado para ${getStatusText(newStatus)}.` });
          await loadData();
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
              filterPlaceholder="Buscar por nome..."
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
          plans={plans}
          onSave={handleSaveOrg}
          open={isFormOpen}
          onOpenChange={setIsFormOpen}
      />

       <AlertDialog open={isDeleting} onOpenChange={setIsDeleting}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Confirmar Remoção</AlertDialogTitle>
                    <AlertDialogDescription>
                        Tem certeza que deseja remover a organização "{organizationToDelete?.name}"? Esta ação é irreversível e removerá todos os dados associados.
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
