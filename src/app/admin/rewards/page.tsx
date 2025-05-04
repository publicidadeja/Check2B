
'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, Edit, Trash2, Award, Calendar, Users, DollarSign, Gift, Image as ImageIcon, Loader2, Building } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import type { Reward } from '@/services/reward';
import {
    getAllRewards,
    addReward,
    updateReward,
    deleteReward
} from '@/services/reward';
import type { Department } from '@/services/department';
import { getAllDepartments } from '@/services/department';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image'; // Usar next/image para otimização

export default function RewardsPage() {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  // Estado para o formulário de edição/adição
  const [currentEligibleDepartments, setCurrentEligibleDepartments] = useState<string[]>(['Todos']);
  const [isRecurring, setIsRecurring] = useState(false);

  const loadInitialData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const [fetchedRewards, fetchedDepartments] = await Promise.all([
        getAllRewards(),
        getAllDepartments()
      ]);
      setRewards(fetchedRewards);
      setDepartments(fetchedDepartments);
    } catch (error) {
      console.error("Falha ao carregar dados:", error);
      toast({ title: "Erro", description: "Falha ao carregar premiações ou departamentos.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const handleEdit = (reward: Reward) => {
    setSelectedReward({ ...reward });
    setCurrentEligibleDepartments(reward.eligibleDepartments || ['Todos']);
    setIsRecurring(reward.isRecurring || false);
    setIsEditDialogOpen(true);
  };

  const handleDelete = (reward: Reward) => {
    setSelectedReward(reward);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedReward) return;
    setIsSubmitting(true);
    try {
      await deleteReward(selectedReward.id);
      setRewards(rewards.filter(r => r.id !== selectedReward.id));
      toast({ title: "Sucesso", description: `Premiação "${selectedReward.title}" excluída.` });
      setIsDeleteDialogOpen(false);
      setSelectedReward(null);
    } catch (error: any) {
      console.error("Falha ao excluir premiação:", error);
      toast({ title: "Erro", description: error.message || "Falha ao excluir premiação.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

   // Função para lidar com a seleção de múltiplos departamentos
   const handleDepartmentSelection = (departmentName: string) => {
        setCurrentEligibleDepartments(prev => {
            if (departmentName === 'Todos') {
                return ['Todos']; // Selecionar 'Todos' desmarca os outros
            }
            // Remover 'Todos' se um depto específico for selecionado
            const filtered = prev.filter(d => d !== 'Todos');
            if (filtered.includes(departmentName)) {
                // Desmarcar se já estiver selecionado
                const next = filtered.filter(d => d !== departmentName);
                // Se vazio, voltar para 'Todos'
                return next.length === 0 ? ['Todos'] : next;
            } else {
                // Marcar se não estiver selecionado
                return [...filtered, departmentName];
            }
        });
   };

   const renderDepartmentSelection = (isEditing = false) => {
       const prefix = isEditing ? 'edit-' : '';
       const selectedDepts = currentEligibleDepartments; // Usar estado

        return (
           <div className="space-y-2">
              <Label htmlFor={`${prefix}departments`} className="flex items-center gap-1">
                  <Building className="h-4 w-4"/> Departamentos Elegíveis *
              </Label>
              <div className="flex flex-wrap gap-2 p-2 border rounded-md min-h-[40px] items-center">
                 <Button
                    type="button"
                    variant={selectedDepts.includes('Todos') ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleDepartmentSelection('Todos')}
                    className="text-xs h-7"
                    disabled={isSubmitting}
                 >
                    Todos
                 </Button>
                 {departments.map(dept => (
                     <Button
                        key={dept.id}
                        type="button"
                        variant={selectedDepts.includes(dept.name) ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleDepartmentSelection(dept.name)}
                        className="text-xs h-7"
                        disabled={isSubmitting}
                    >
                        {dept.name}
                    </Button>
                 ))}
              </div>
              <p className="text-xs text-muted-foreground">Selecione os departamentos que podem concorrer ou 'Todos'.</p>
           </div>
        );
   };


  const handleSaveReward = async (event: React.FormEvent<HTMLFormElement>, isEditing: boolean) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const prefix = isEditing ? 'edit-' : '';

    const rewardData: Partial<Omit<Reward, 'id'>> = {
        title: formData.get(`${prefix}title`) as string,
        description: formData.get(`${prefix}description`) as string,
        monetaryValue: formData.get(`${prefix}monetaryValue`) ? parseFloat(formData.get(`${prefix}monetaryValue`) as string) : undefined,
        nonMonetaryDescription: formData.get(`${prefix}nonMonetaryDescription`) as string || undefined,
        imageUrl: formData.get(`${prefix}imageUrl`) as string || undefined,
        period: isRecurring ? 'recorrente' : formData.get(`${prefix}period`) as string, // Ajuste para recorrente
        isRecurring: isRecurring,
        numberOfWinners: parseInt(formData.get(`${prefix}numberOfWinners`) as string) || 1,
        eligibleDepartments: currentEligibleDepartments,
        eligibilityCriteria: formData.get(`${prefix}eligibilityCriteria`) as string || undefined,
        isActive: formData.get(`${prefix}isActive`) === 'on',
    };

    // Validação
    if (!rewardData.title || !rewardData.description) {
        toast({ title: "Erro de Validação", description: "Título e Descrição são obrigatórios.", variant: "destructive" });
        return;
    }
     if (!rewardData.isRecurring && !rewardData.period?.match(/^\d{4}-(0[1-9]|1[0-2])$/)) { // Valida YYYY-MM se não for recorrente
         toast({ title: "Erro de Validação", description: "Período deve estar no formato AAAA-MM (ex: 2024-08) se não for recorrente.", variant: "destructive" });
         return;
     }
     if (!rewardData.numberOfWinners || rewardData.numberOfWinners <= 0) {
         toast({ title: "Erro de Validação", description: "Número de vencedores inválido.", variant: "destructive" });
         return;
     }
      if (!rewardData.eligibleDepartments || rewardData.eligibleDepartments.length === 0) {
        toast({ title: "Erro de Validação", description: "Selecione pelo menos um departamento elegível ou 'Todos'.", variant: "destructive" });
        return;
     }

    setIsSubmitting(true);
    try {
        if (isEditing && selectedReward) {
            const updatedReward = await updateReward(selectedReward.id, rewardData);
            setRewards(rewards.map(r => r.id === updatedReward.id ? updatedReward : r));
            toast({ title: "Sucesso", description: `Premiação "${updatedReward.title}" atualizada.` });
            setIsEditDialogOpen(false);
            setSelectedReward(null);
        } else {
            const addedReward = await addReward(rewardData as Omit<Reward, 'id'>); // Cast aqui pois validamos
            setRewards([...rewards, addedReward]);
            toast({ title: "Sucesso", description: `Premiação "${addedReward.title}" adicionada.` });
            setIsAddDialogOpen(false);
        }
         // Resetar estado do formulário após sucesso
         setCurrentEligibleDepartments(['Todos']);
         setIsRecurring(false);
    } catch (error: any) {
        console.error("Falha ao salvar premiação:", error);
        toast({ title: "Erro", description: error.message || "Falha ao salvar premiação.", variant: "destructive" });
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2"><Award className="h-5 w-5"/> Gerenciamento de Premiações</CardTitle>
          <CardDescription>Configure e gerencie as premiações mensais/recorrentes.</CardDescription>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
            setIsAddDialogOpen(open);
            if (!open) { // Resetar estado ao fechar
                setCurrentEligibleDepartments(['Todos']);
                setIsRecurring(false);
            }
        }}>
            <DialogTrigger asChild>
            <Button size="sm" className="gap-1" disabled={isLoading || isSubmitting}>
                <PlusCircle className="h-4 w-4" />
                Nova Premiação
            </Button>
            </DialogTrigger>
             <DialogContent className="sm:max-w-3xl"> {/* Aumentar largura do modal */}
                <DialogHeader>
                    <DialogTitle>Criar Nova Premiação</DialogTitle>
                    <DialogDescription>
                       Defina os detalhes para a nova premiação. Campos com * são obrigatórios.
                    </DialogDescription>
                </DialogHeader>
                 {/* Formulário compartilhado com edição */}
                <RewardForm
                   onSubmit={(e) => handleSaveReward(e, false)}
                   isSubmitting={isSubmitting}
                   isRecurring={isRecurring}
                   setIsRecurring={setIsRecurring}
                   currentEligibleDepartments={currentEligibleDepartments}
                   renderDepartmentSelection={() => renderDepartmentSelection(false)}
                   departments={departments}
                />
            </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
            <div className="flex justify-center items-center p-10">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
         ) : rewards.length === 0 ? (
              <p className="text-center text-muted-foreground p-4">Nenhuma premiação cadastrada.</p>
         ) : (
            <Table>
            <TableHeader>
                <TableRow>
                <TableHead className="w-[60px]">Ícone</TableHead>
                <TableHead>Título</TableHead>
                <TableHead>Período</TableHead>
                <TableHead className="hidden sm:table-cell">Valor/Prêmio</TableHead>
                <TableHead className="hidden md:table-cell">Deptos. Elegíveis</TableHead>
                 <TableHead>Vencedores</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right w-[100px]">Ações</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {rewards.map((reward) => (
                <TableRow key={reward.id}>
                    <TableCell>
                        {reward.imageUrl ? (
                            <Image src={reward.imageUrl} alt={reward.title} width={40} height={40} className="rounded-md object-cover" />
                        ) : (
                            <div className="w-10 h-10 flex items-center justify-center bg-muted rounded-md">
                                <Award className="h-5 w-5 text-muted-foreground" />
                            </div>
                        )}
                    </TableCell>
                    <TableCell className="font-medium">{reward.title}</TableCell>
                    <TableCell>
                        {reward.isRecurring ? <Badge variant="secondary">Recorrente</Badge> : reward.period}
                    </TableCell>
                     <TableCell className="hidden sm:table-cell text-xs">
                        {reward.monetaryValue ? `R$ ${reward.monetaryValue.toFixed(2)}` : ''}
                        {reward.monetaryValue && reward.nonMonetaryDescription ? ' + ' : ''}
                        {reward.nonMonetaryDescription || ''}
                        {!reward.monetaryValue && !reward.nonMonetaryDescription ? '-' : ''}
                     </TableCell>
                     <TableCell className="hidden md:table-cell text-xs">
                        {reward.eligibleDepartments.includes('Todos') ? 'Todos' : reward.eligibleDepartments.join(', ')}
                    </TableCell>
                    <TableCell>{reward.numberOfWinners}</TableCell>
                    <TableCell>
                        <Badge variant={reward.isActive ? "default" : "outline"} className={reward.isActive ? "bg-accent text-accent-foreground" : ""}>
                           {reward.isActive ? 'Ativa' : 'Inativa'}
                        </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                        <Dialog open={isEditDialogOpen && selectedReward?.id === reward.id} onOpenChange={(open) => {
                            setIsEditDialogOpen(open);
                            if (!open) {
                                setSelectedReward(null);
                                // Resetar estado ao fechar
                                setCurrentEligibleDepartments(['Todos']);
                                setIsRecurring(false);
                            }
                        }}>
                        <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(reward)} disabled={isSubmitting} title="Editar">
                            <Edit className="h-4 w-4" />
                            </Button>
                        </DialogTrigger>
                         <DialogContent className="sm:max-w-3xl">
                            <DialogHeader>
                                <DialogTitle>Editar Premiação</DialogTitle>
                                <DialogDescription>
                                    Atualize os detalhes da premiação "{selectedReward?.title}".
                                </DialogDescription>
                            </DialogHeader>
                             {/* Formulário compartilhado */}
                             <RewardForm
                                 onSubmit={(e) => handleSaveReward(e, true)}
                                 isSubmitting={isSubmitting}
                                 isRecurring={isRecurring}
                                 setIsRecurring={setIsRecurring}
                                 currentEligibleDepartments={currentEligibleDepartments}
                                 renderDepartmentSelection={() => renderDepartmentSelection(true)}
                                 departments={departments}
                                 reward={selectedReward} // Passa os dados atuais para preencher
                                 isEditing={true}
                             />
                        </DialogContent>
                        </Dialog>

                        <Dialog open={isDeleteDialogOpen && selectedReward?.id === reward.id} onOpenChange={(open) => {
                            setIsDeleteDialogOpen(open);
                            if (!open) setSelectedReward(null);
                        }}>
                        <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(reward)} disabled={isSubmitting} title="Excluir">
                            <Trash2 className="h-4 w-4" />
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                            <DialogTitle>Confirmar Exclusão</DialogTitle>
                            <DialogDescription>
                                Tem certeza que deseja excluir a premiação <strong>{selectedReward?.title}</strong>? Esta ação não pode ser desfeita.
                            </DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                            <DialogClose asChild><Button variant="outline" disabled={isSubmitting}>Cancelar</Button></DialogClose>
                            <Button variant="destructive" onClick={handleConfirmDelete} disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {isSubmitting ? 'Excluindo...' : 'Confirmar Exclusão'}
                            </Button>
                            </DialogFooter>
                        </DialogContent>
                        </Dialog>
                    </TableCell>
                </TableRow>
                ))}
            </TableBody>
            </Table>
         )}
      </CardContent>
    </Card>
  );
}


// Componente de formulário reutilizável
interface RewardFormProps {
    onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
    isSubmitting: boolean;
    isRecurring: boolean;
    setIsRecurring: (value: boolean) => void;
    currentEligibleDepartments: string[];
    renderDepartmentSelection: () => React.ReactNode;
    departments: Department[];
    reward?: Reward | null; // Dados para preencher na edição
    isEditing?: boolean;
}

function RewardForm({
    onSubmit,
    isSubmitting,
    isRecurring,
    setIsRecurring,
    currentEligibleDepartments,
    renderDepartmentSelection,
    departments,
    reward = null,
    isEditing = false,
}: RewardFormProps) {

    const prefix = isEditing ? 'edit-' : '';

    return (
       <form onSubmit={onSubmit}>
          <fieldset disabled={isSubmitting} className="grid gap-4 py-4 sm:grid-cols-2 lg:grid-cols-3 sm:gap-x-6">
              {/* Coluna 1 */}
              <div className="space-y-4 lg:col-span-1">
                  <div className="space-y-2">
                      <Label htmlFor={`${prefix}title`}>Título *</Label>
                      <Input id={`${prefix}title`} name={`${prefix}title`} required defaultValue={reward?.title} placeholder="Ex: Colaborador do Mês"/>
                  </div>
                   <div className="space-y-2">
                      <Label htmlFor={`${prefix}description`}>Descrição *</Label>
                      <Textarea id={`${prefix}description`} name={`${prefix}description`} required defaultValue={reward?.description} placeholder="Descreva a premiação..." rows={3}/>
                  </div>
                   <div className="space-y-2">
                      <Label htmlFor={`${prefix}monetaryValue`} className="flex items-center gap-1">
                         <DollarSign className="h-4 w-4"/> Valor Monetário (R$)
                      </Label>
                      <Input id={`${prefix}monetaryValue`} name={`${prefix}monetaryValue`} type="number" step="0.01" min="0" defaultValue={reward?.monetaryValue ?? ''} placeholder="Ex: 500.00"/>
                  </div>
                   <div className="space-y-2">
                      <Label htmlFor={`${prefix}nonMonetaryDescription`} className="flex items-center gap-1">
                         <Gift className="h-4 w-4"/> Prêmio Não-Monetário
                      </Label>
                      <Input id={`${prefix}nonMonetaryDescription`} name={`${prefix}nonMonetaryDescription`} defaultValue={reward?.nonMonetaryDescription ?? ''} placeholder="Ex: Vale Jantar, Folga"/>
                  </div>
              </div>

                {/* Coluna 2 */}
               <div className="space-y-4 lg:col-span-1">
                   <div className="space-y-2">
                      <Label htmlFor={`${prefix}numberOfWinners`} className="flex items-center gap-1">
                          <Users className="h-4 w-4"/> Nº de Vencedores *
                      </Label>
                      <Input id={`${prefix}numberOfWinners`} name={`${prefix}numberOfWinners`} type="number" min="1" step="1" required defaultValue={reward?.numberOfWinners ?? 1}/>
                  </div>
                   <div className="flex items-center space-x-2 pt-2">
                       <Switch
                          id={`${prefix}isRecurring`}
                          checked={isRecurring}
                          onCheckedChange={setIsRecurring}
                          disabled={isSubmitting}
                       />
                       <Label htmlFor={`${prefix}isRecurring`}>Premiação Recorrente Mensal</Label>
                    </div>
                   <div className="space-y-2">
                      <Label htmlFor={`${prefix}period`} className="flex items-center gap-1">
                         <Calendar className="h-4 w-4"/> Período (AAAA-MM) {!isRecurring && '*'}
                      </Label>
                      <Input
                         id={`${prefix}period`}
                         name={`${prefix}period`}
                         type="month" // Usar type="month" para formato AAAA-MM
                         defaultValue={!reward?.isRecurring ? reward?.period : ''}
                         pattern="\d{4}-\d{2}" // Pattern para AAAA-MM
                         placeholder="Ex: 2024-08"
                         disabled={isSubmitting || isRecurring} // Desabilitar se recorrente
                         required={!isRecurring} // Obrigatório apenas se não for recorrente
                         />
                      <p className="text-xs text-muted-foreground">
                          {isRecurring ? "Premiação será aplicada todo mês." : "Mês e ano em que a premiação é válida."}
                      </p>
                  </div>

                   <div className="space-y-2">
                      <Label htmlFor={`${prefix}imageUrl`} className="flex items-center gap-1">
                          <ImageIcon className="h-4 w-4"/> URL da Imagem/Ícone
                      </Label>
                      <Input id={`${prefix}imageUrl`} name={`${prefix}imageUrl`} defaultValue={reward?.imageUrl ?? ''} placeholder="https://..."/>
                  </div>
              </div>

              {/* Coluna 3 */}
              <div className="space-y-4 lg:col-span-1">
                    {renderDepartmentSelection()} {/* Renderiza a seleção de departamentos */}

                    <div className="space-y-2">
                      <Label htmlFor={`${prefix}eligibilityCriteria`}>Critérios Adicionais</Label>
                      <Textarea id={`${prefix}eligibilityCriteria`} name={`${prefix}eligibilityCriteria`} defaultValue={reward?.eligibilityCriteria ?? ''} placeholder="Ex: Mínimo 95% de score, sem faltas..." rows={3}/>
                    </div>

                    <div className="flex items-center space-x-2 pt-4">
                        <Switch
                            id={`${prefix}isActive`}
                            name={`${prefix}isActive`}
                            defaultChecked={reward?.isActive ?? false}
                            disabled={isSubmitting}
                         />
                        <Label htmlFor={`${prefix}isActive`}>Ativar/Publicar Premiação</Label>
                    </div>
               </div>
            </fieldset>
           <DialogFooter className="mt-6 pt-4 border-t">
                <DialogClose asChild>
                    <Button type="button" variant="outline" disabled={isSubmitting}>Cancelar</Button>
                </DialogClose>
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isSubmitting ? 'Salvando...' : (isEditing ? 'Salvar Alterações' : 'Criar Premiação')}
                </Button>
            </DialogFooter>
       </form>
    );
}
