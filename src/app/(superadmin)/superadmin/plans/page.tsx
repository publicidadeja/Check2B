
'use client';

import * as React from 'react';
import { DollarSign, PlusCircle, MoreHorizontal, Edit, Trash2, ToggleRight, Eye, CircleSlash, CheckCircle, Archive } from 'lucide-react';
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
import { PlanForm } from '@/components/plan/plan-form';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import type { Plan } from '@/types/plan';
import { mockPlans } from '@/lib/mockData/plans'; // Import mock data
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Mock API functions (replace with actual Firestore calls)
const fetchPlans = async (): Promise<Plan[]> => {
  await new Promise(resolve => setTimeout(resolve, 600));
  return [...mockPlans].map(plan => ({
    ...plan,
    createdAt: plan.createdAt instanceof Date ? plan.createdAt : new Date(plan.createdAt),
    updatedAt: plan.updatedAt && !(plan.updatedAt instanceof Date) ? new Date(plan.updatedAt) : plan.updatedAt,
  }));
};

type PlanFormData = Omit<Plan, 'id' | 'createdAt' | 'updatedAt'>; // Form data type might be slightly different

const savePlan = async (planData: PlanFormData, existingId?: string): Promise<Plan> => {
  await new Promise(resolve => setTimeout(resolve, 700));
  if (existingId) {
    const index = mockPlans.findIndex(p => p.id === existingId);
    if (index !== -1) {
      mockPlans[index] = {
          ...mockPlans[index],
          ...planData,
          updatedAt: new Date(),
       };
      console.log("Plano atualizado:", mockPlans[index]);
      return mockPlans[index];
    } else {
      throw new Error("Plano não encontrado para atualização");
    }
  } else {
    const newPlan: Plan = {
      id: `plan_${Date.now()}`,
      ...planData,
      createdAt: new Date(),
    };
    mockPlans.push(newPlan);
    console.log("Novo plano criado:", newPlan);
    return newPlan;
  }
};

const deletePlan = async (planId: string): Promise<void> => {
  await new Promise(resolve => setTimeout(resolve, 500));
  const index = mockPlans.findIndex(p => p.id === planId);
  if (index !== -1) {
    if (mockPlans[index].status === 'active') {
        throw new Error("Não é possível remover um plano ativo. Arquive-o primeiro.");
    }
    mockPlans.splice(index, 1);
    console.log("Plano removido:", planId);
  } else {
    throw new Error("Plano não encontrado para remoção");
  }
};

const togglePlanStatus = async (planId: string, newStatus: Plan['status']): Promise<Plan> => {
   await new Promise(resolve => setTimeout(resolve, 400));
   const index = mockPlans.findIndex(p => p.id === planId);
   if (index !== -1) {
       mockPlans[index].status = newStatus;
       mockPlans[index].updatedAt = new Date();
       console.log("Status do plano alterado:", mockPlans[index]);
       return mockPlans[index];
   } else {
        throw new Error("Plano não encontrado para alterar status");
   }
}

export default function PlansPage() {
  const [plans, setPlans] = React.useState<Plan[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [selectedPlan, setSelectedPlan] = React.useState<Plan | null>(null);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [planToDelete, setPlanToDelete] = React.useState<Plan | null>(null);
  const { toast } = useToast();

   const getStatusBadgeVariant = (status: Plan['status']): "default" | "secondary" | "outline" | "destructive" => {
        switch (status) {
            case 'active': return 'default'; // Usually green or primary
            case 'inactive': return 'secondary';
            case 'archived': return 'outline'; // Destructive or outline for archived
            default: return 'secondary';
        }
    };

    const getStatusText = (status: Plan['status']): string => {
        switch (status) {
            case 'active': return 'Ativo';
            case 'inactive': return 'Inativo';
            case 'archived': return 'Arquivado';
            default: return status;
        }
    };

  const columns: ColumnDef<Plan>[] = [
    { accessorKey: "name", header: "Nome do Plano", cell: ({ row }) => <span className="font-medium">{row.original.name}{row.original.isPopular && <Badge variant="outline" className="ml-2 border-yellow-500 text-yellow-700 bg-yellow-50 text-xs">Popular</Badge>}</span>, minSize: 200 },
    { accessorKey: "priceMonthly", header: "Preço Mensal", cell: ({ row }) => `R$ ${row.original.priceMonthly.toFixed(2)}`, size: 120 },
    { accessorKey: "userLimit", header: "Limite Usuários", cell: ({ row }) => <div className="text-center">{row.original.userLimit === 'unlimited' ? 'Ilimitado' : row.original.userLimit ?? '-'}</div>, size: 100 },
    { accessorKey: "adminLimit", header: "Limite Admins", cell: ({ row }) => <div className="text-center">{row.original.adminLimit === 'unlimited' ? 'Ilimitado' : row.original.adminLimit ?? '-'}</div>, size: 100 },
    {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <Badge variant={getStatusBadgeVariant(row.original.status)} className={row.original.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200' : 'text-xs'}>{getStatusText(row.original.status)}</Badge>,
        size: 100
    },
    { accessorKey: "createdAt", header: "Criado em", cell: ({ row }) => <span className="text-xs">{format(row.original.createdAt, 'dd/MM/yyyy', { locale: ptBR })}</span>, size: 120 },
    {
      id: "actions",
      header: () => <div className="text-right">Ações</div>,
      cell: ({ row }) => {
        const plan = row.original;
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
                <DropdownMenuLabel>Ações do Plano</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => openEditForm(plan)}>
                  <Edit className="mr-2 h-4 w-4" /> Editar Plano
                </DropdownMenuItem>
                {plan.status === 'active' && (
                    <DropdownMenuItem onClick={() => handleUpdateStatus(plan, 'inactive')}>
                        <CircleSlash className="mr-2 h-4 w-4" /> Desativar
                    </DropdownMenuItem>
                )}
                {plan.status === 'inactive' && (
                    <DropdownMenuItem onClick={() => handleUpdateStatus(plan, 'active')}>
                        <CheckCircle className="mr-2 h-4 w-4" /> Ativar
                    </DropdownMenuItem>
                )}
                {plan.status !== 'archived' && (
                    <DropdownMenuItem onClick={() => handleUpdateStatus(plan, 'archived')}>
                        <Archive className="mr-2 h-4 w-4" /> Arquivar
                    </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => handleDeleteClick(plan)}
                  className="text-destructive focus:text-destructive focus:bg-destructive/10"
                  disabled={plan.status === 'active'} // Prevent deleting active plans
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

  const loadPlans = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchPlans();
      setPlans(data.sort((a,b) => a.name.localeCompare(b.name)));
    } catch (error) {
      console.error("Falha ao carregar planos:", error);
      toast({ title: "Erro", description: "Falha ao carregar planos.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  const handleSavePlan = async (data: PlanFormData) => {
    setIsLoading(true); // Consider using a different loading state for the form if needed
    try {
      await savePlan(data, selectedPlan?.id);
      setIsFormOpen(false);
      setSelectedPlan(null);
      await loadPlans();
      toast({
        title: "Sucesso!",
        description: `Plano ${selectedPlan ? 'atualizado' : 'criado'} com sucesso.`,
      });
    } catch (error) {
      console.error("Erro ao salvar plano:", error);
      toast({
        title: "Erro!",
        description: `Falha ao ${selectedPlan ? 'atualizar' : 'criar'} plano.`,
        variant: "destructive",
      });
    } finally {
        setIsLoading(false); // Reset global loading or form-specific loading
    }
  };

  const handleDeleteClick = (plan: Plan) => {
    setPlanToDelete(plan);
    setIsDeleting(true);
  };

  const confirmDelete = async () => {
    if (planToDelete) {
       setIsLoading(true);
      try {
        await deletePlan(planToDelete.id);
        toast({ title: "Sucesso", description: "Plano removido com sucesso." });
        await loadPlans();
      } catch (error: any) {
        console.error("Falha ao remover plano:", error);
        toast({ title: "Erro", description: error.message || "Falha ao remover plano.", variant: "destructive" });
      } finally {
        setIsLoading(false);
        setIsDeleting(false);
        setPlanToDelete(null);
      }
    }
  };

   const handleUpdateStatus = async (plan: Plan, newStatus: Plan['status']) => {
      setIsLoading(true);
      try {
          await togglePlanStatus(plan.id, newStatus);
          toast({ title: "Sucesso", description: `Status do plano "${plan.name}" alterado para ${getStatusText(newStatus)}.` });
          await loadPlans();
      } catch (error: any) {
          console.error("Falha ao alterar status do plano:", error);
          toast({ title: "Erro", description: error.message || "Falha ao alterar status do plano.", variant: "destructive" });
      } finally {
           setIsLoading(false);
      }
  }

  const openEditForm = (plan: Plan) => {
    setSelectedPlan(plan);
    setIsFormOpen(true);
  };

  const openAddForm = () => {
    setSelectedPlan(null);
    setIsFormOpen(true);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" /> Gerenciamento de Planos de Assinatura
          </CardTitle>
          <CardDescription>Crie, edite e gerencie os planos de serviço para as organizações clientes.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
             <div className="flex justify-center items-center py-10">
                <LoadingSpinner text="Carregando planos..."/>
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={plans}
              filterColumn="name"
              filterPlaceholder="Buscar por nome do plano..."
            />
          )}
        </CardContent>
        {!isLoading && (
            <CardFooter className="flex justify-end">
               <Button onClick={openAddForm}>
                 <PlusCircle className="mr-2 h-4 w-4" />
                 Adicionar Novo Plano
               </Button>
            </CardFooter>
        )}
      </Card>

       <PlanForm
          plan={selectedPlan}
          onSave={handleSavePlan}
          open={isFormOpen}
          onOpenChange={setIsFormOpen}
      />

       <AlertDialog open={isDeleting} onOpenChange={setIsDeleting}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Confirmar Remoção</AlertDialogTitle>
                    <AlertDialogDescription>
                        Tem certeza que deseja remover o plano "{planToDelete?.name}"? Esta ação é irreversível.
                        Planos ativos não podem ser removidos diretamente.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setPlanToDelete(null)}>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={planToDelete?.status === 'active'}>
                        Remover Definitivamente
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}
