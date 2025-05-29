
'use client';

import * as React from 'react';
import { DollarSign, PlusCircle, MoreHorizontal, Edit, Trash2, CheckCircle, CircleSlash, Archive } from 'lucide-react'; // Added more icons
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
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getAllPlans, savePlan as savePlanToFirestore, deletePlan as deletePlanFromFirestore, updatePlanStatus as updatePlanStatusInFirestore } from '@/lib/plan-service';

type PlanFormData = Omit<Plan, 'id' | 'createdAt' | 'updatedAt'>;

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
            case 'active': return 'default'; 
            case 'inactive': return 'secondary';
            case 'archived': return 'outline'; 
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
    { 
      accessorKey: "createdAt", 
      header: "Criado em", 
      cell: ({ row }) => {
        const createdAtDate = row.original.createdAt;
        if (createdAtDate && createdAtDate instanceof Date && !isNaN(createdAtDate.getTime())) {
          return <span className="text-xs">{format(createdAtDate, 'dd/MM/yyyy', { locale: ptBR })}</span>;
        }
        return <span className="text-xs">-</span>;
      }, 
      size: 120 
    },
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
      const data = await getAllPlans();
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
    setIsLoading(true);
    const planPayload = selectedPlan 
        ? { ...data, id: selectedPlan.id } 
        : data;
    try {
      await savePlanToFirestore(planPayload);
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
        setIsLoading(false);
    }
  };

  const handleDeleteClick = (plan: Plan) => {
    if (plan.status === 'active') {
        toast({ title: "Ação Bloqueada", description: "Planos ativos não podem ser removidos. Arquive-o primeiro.", variant: "destructive" });
        return;
    }
    setPlanToDelete(plan);
    setIsDeleting(true);
  };

  const confirmDelete = async () => {
    if (planToDelete) {
       setIsLoading(true);
      try {
        await deletePlanFromFirestore(planToDelete.id);
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
          await updatePlanStatusInFirestore(plan.id, newStatus);
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
                        Planos ativos não podem ser removidos diretamente. Arquive-o primeiro.
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
