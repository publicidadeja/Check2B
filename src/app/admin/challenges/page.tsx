
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
import { PlusCircle, Edit, Trash2, Target, Calendar, Users, Award, Image as ImageIcon, FileText, Filter, Building, Tag, Info, CheckCircle, XCircle, Loader2, Activity, Clock, BookOpen } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import type { Challenge } from '@/services/challenge';
import {
    getAllChallenges,
    addChallenge,
    updateChallenge,
    deleteChallenge,
    getUsedChallengeCategories
} from '@/services/challenge';
import type { Department } from '@/services/department';
import { getAllDepartments } from '@/services/department';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image'; // Usar next/image para otimização
import { format, parseISO, isBefore, isAfter } from 'date-fns';
import { ptBR } from 'date-fns/locale'; // Importar locale ptBR
import { cn } from '@/lib/utils';

// Define constants for select options
const difficulties: Challenge['difficulty'][] = ["Fácil", "Médio", "Difícil"];
const participationTypes: Challenge['participationType'][] = ["Obrigatório", "Opcional"];

export default function ChallengesPage() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [categories, setCategories] = useState<string[]>([]); // For category filter/dropdown
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("active"); // 'active', 'inactive', 'all'
  const [filterDepartment, setFilterDepartment] = useState<string>("Todos");
  const { toast } = useToast();

  // Estado para o formulário de edição/adição
  const [currentEligibleDepartments, setCurrentEligibleDepartments] = useState<string[]>(['Todos']);

  // Fetch initial data (challenges, departments, categories)
  const loadInitialData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const fetchedDepartments = await getAllDepartments();
      setDepartments(fetchedDepartments);

       // Determine isActive filter based on state
      const isActiveFilter = filterStatus === 'all' ? undefined : filterStatus === 'active';
      const departmentFilter = filterDepartment === "Todos" ? undefined : filterDepartment;

      const fetchedChallenges = await getAllChallenges({ isActive: isActiveFilter, department: departmentFilter });
      setChallenges(fetchedChallenges);

      const usedCategories = await getUsedChallengeCategories();
      setCategories(usedCategories);

    } catch (error) {
      console.error("Failed to fetch initial data:", error);
      toast({ title: "Erro", description: "Falha ao carregar desafios, departamentos ou categorias.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast, filterStatus, filterDepartment]); // Depend on filters

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);


  const handleEdit = (challenge: Challenge) => {
    setSelectedChallenge({ ...challenge });
    setCurrentEligibleDepartments(challenge.eligibleDepartments || ['Todos']);
    setIsEditDialogOpen(true);
  };

  const handleDelete = (challenge: Challenge) => {
    setSelectedChallenge(challenge);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedChallenge) return;
    setIsSubmitting(true);
    try {
      await deleteChallenge(selectedChallenge.id);
      setChallenges(challenges.filter(c => c.id !== selectedChallenge.id)); // Update local state
      toast({ title: "Sucesso", description: `Desafio "${selectedChallenge.title}" excluído.` });
      setIsDeleteDialogOpen(false);
      setSelectedChallenge(null);
    } catch (error: any) {
      console.error("Failed to delete challenge:", error);
      toast({ title: "Erro", description: error.message || "Falha ao excluir desafio.", variant: "destructive" });
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
            const filtered = prev.filter(d => d !== 'Todos'); // Remover 'Todos' se um depto específico for selecionado
            if (filtered.includes(departmentName)) {
                const next = filtered.filter(d => d !== departmentName); // Desmarcar
                return next.length === 0 ? ['Todos'] : next; // Voltar para 'Todos' se vazio
            } else {
                return [...filtered, departmentName]; // Marcar
            }
        });
   };

    // Componente reutilizável para seleção de departamentos
    const renderDepartmentSelection = (isEditing = false) => {
       const prefix = isEditing ? 'edit-' : '';
       const selectedDepts = currentEligibleDepartments;

        return (
           <div className="space-y-2">
              <Label htmlFor={`${prefix}departments`} className="flex items-center gap-1">
                  <Building className="h-4 w-4"/> Departamentos Elegíveis *
              </Label>
              <div className="flex flex-wrap gap-2 p-2 border rounded-md min-h-[40px] items-center bg-background">
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
              <p className="text-xs text-muted-foreground">Selecione os departamentos que podem participar ou 'Todos'.</p>
           </div>
        );
   };


  const handleSaveChallenge = async (event: React.FormEvent<HTMLFormElement>, isEditing: boolean) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const prefix = isEditing ? 'edit-' : '';

    const challengeData: Partial<Omit<Challenge, 'id'>> = {
        title: formData.get(`${prefix}title`) as string,
        description: formData.get(`${prefix}description`) as string,
        category: formData.get(`${prefix}category`) as string || undefined,
        startDate: formData.get(`${prefix}startDate`) as string,
        endDate: formData.get(`${prefix}endDate`) as string,
        points: parseInt(formData.get(`${prefix}points`) as string) || 0,
        difficulty: formData.get(`${prefix}difficulty`) as Challenge['difficulty'] || undefined,
        participationType: formData.get(`${prefix}participationType`) as Challenge['participationType'],
        eligibleDepartments: currentEligibleDepartments,
        evaluationMetrics: formData.get(`${prefix}evaluationMetrics`) as string || undefined,
        supportMaterial: formData.get(`${prefix}supportMaterial`) as string || undefined,
        imageUrl: formData.get(`${prefix}imageUrl`) as string || undefined,
        isActive: formData.get(`${prefix}isActive`) === 'on',
    };

    // Validação
    if (!challengeData.title || !challengeData.description || !challengeData.startDate || !challengeData.endDate || !challengeData.participationType) {
        toast({ title: "Erro de Validação", description: "Título, Descrição, Datas e Tipo de Participação são obrigatórios.", variant: "destructive" });
        return;
    }
    if (new Date(challengeData.endDate) < new Date(challengeData.startDate)) {
        toast({ title: "Erro de Validação", description: "Data final não pode ser anterior à data inicial.", variant: "destructive" });
        return;
    }
     if (!challengeData.points || challengeData.points <= 0) {
         toast({ title: "Erro de Validação", description: "Pontuação deve ser um número positivo.", variant: "destructive" });
         return;
     }
     if (!challengeData.eligibleDepartments || challengeData.eligibleDepartments.length === 0) {
        toast({ title: "Erro de Validação", description: "Selecione pelo menos um departamento elegível ou 'Todos'.", variant: "destructive" });
        return;
     }


    setIsSubmitting(true);
    try {
        if (isEditing && selectedChallenge) {
            const updatedChallenge = await updateChallenge(selectedChallenge.id, challengeData);
             // Update local state respecting filters
            const meetsFilterCriteria = (filterStatus === 'all' || updatedChallenge.isActive === (filterStatus === 'active')) &&
                                         (filterDepartment === 'Todos' || updatedChallenge.eligibleDepartments.includes('Todos') || updatedChallenge.eligibleDepartments.includes(filterDepartment));

             if (meetsFilterCriteria) {
                  setChallenges(challenges.map(c => c.id === updatedChallenge.id ? updatedChallenge : c));
             } else {
                  // Remove from view if it no longer matches filters
                  setChallenges(challenges.filter(c => c.id !== updatedChallenge.id));
             }
            toast({ title: "Sucesso", description: `Desafio "${updatedChallenge.title}" atualizado.` });
            setIsEditDialogOpen(false);
            setSelectedChallenge(null);
        } else {
            const addedChallenge = await addChallenge(challengeData as Omit<Challenge, 'id'>); // Cast here as validation passed
             // Add to local state only if it matches current filters
             const meetsFilterCriteria = (filterStatus === 'all' || addedChallenge.isActive === (filterStatus === 'active')) &&
                                         (filterDepartment === 'Todos' || addedChallenge.eligibleDepartments.includes('Todos') || addedChallenge.eligibleDepartments.includes(filterDepartment));
             if (meetsFilterCriteria) {
                 setChallenges(prev => [...prev, addedChallenge].sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())); // Add and sort
             }
            toast({ title: "Sucesso", description: `Desafio "${addedChallenge.title}" adicionado.` });
            setIsAddDialogOpen(false);
        }
         // Reset form state after success
         setCurrentEligibleDepartments(['Todos']);
    } catch (error: any) {
        console.error("Falha ao salvar desafio:", error);
        toast({ title: "Erro", description: error.message || "Falha ao salvar desafio.", variant: "destructive" });
    } finally {
        setIsSubmitting(false);
    }
  };

   // Helper function to get status badge
   const getStatusBadge = (challenge: Challenge): React.ReactNode => {
       const now = new Date();
       const start = parseISO(challenge.startDate + 'T00:00:00'); // Assume start of day
       const end = parseISO(challenge.endDate + 'T23:59:59');   // Assume end of day

       if (!challenge.isActive) {
           return <Badge variant="outline" className="flex items-center gap-1"><XCircle className="h-3 w-3"/> Inativo</Badge>;
       }
       if (isBefore(now, start)) {
           return <Badge variant="secondary" className="flex items-center gap-1"><Clock className="h-3 w-3"/> Programado</Badge>;
       }
       if (isAfter(now, end)) {
            return <Badge variant="outline" className="flex items-center gap-1"><CheckCircle className="h-3 w-3"/> Encerrado</Badge>;
       }
       return <Badge variant="default" className="bg-accent text-accent-foreground flex items-center gap-1"><Activity className="h-3 w-3"/> Ativo</Badge>;
   };


  return (
    <Card>
      <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4">
        <div className="flex-1">
          <CardTitle className="flex items-center gap-2"><Target className="h-5 w-5"/> Gerenciamento de Desafios Semanais</CardTitle>
          <CardDescription>Crie, edite e monitore desafios para engajar colaboradores e adicionar pontos ao ranking.</CardDescription>
        </div>
         <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
             {/* Filters */}
             <div className="flex items-center gap-1 w-full sm:w-auto">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select value={filterStatus} onValueChange={setFilterStatus} disabled={isLoading}>
                    <SelectTrigger className="min-w-[130px] w-full sm:w-auto">
                        <SelectValue placeholder="Filtrar Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="active">Ativos</SelectItem>
                        <SelectItem value="inactive">Inativos</SelectItem>
                        <SelectItem value="all">Todos</SelectItem>
                    </SelectContent>
                </Select>
            </div>
             <div className="flex items-center gap-1 w-full sm:w-auto">
                <Building className="h-4 w-4 text-muted-foreground" />
                <Select value={filterDepartment} onValueChange={setFilterDepartment} disabled={isLoading}>
                    <SelectTrigger className="min-w-[160px] w-full sm:w-auto">
                        <SelectValue placeholder="Filtrar Depto." />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Todos">Todos Deptos.</SelectItem>
                        {departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.name}>{dept.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
             </div>
             {/* Add Button */}
            <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
                setIsAddDialogOpen(open);
                if (!open) { // Reset form state on close
                    setCurrentEligibleDepartments(['Todos']);
                }
            }}>
                <DialogTrigger asChild>
                <Button size="sm" className="gap-1 w-full sm:w-auto" disabled={isLoading || isSubmitting}>
                    <PlusCircle className="h-4 w-4" />
                    Novo Desafio
                </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Criar Novo Desafio Semanal</DialogTitle>
                        <DialogDescription>
                        Defina os detalhes para o novo desafio. Campos com * são obrigatórios.
                        </DialogDescription>
                    </DialogHeader>
                    <ChallengeForm
                        onSubmit={(e) => handleSaveChallenge(e, false)}
                        isSubmitting={isSubmitting}
                        currentEligibleDepartments={currentEligibleDepartments}
                        renderDepartmentSelection={() => renderDepartmentSelection(false)}
                        departments={departments}
                        categories={categories}
                    />
                </DialogContent>
            </Dialog>
         </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
            <div className="flex justify-center items-center p-10">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
         ) : challenges.length === 0 ? (
              <p className="text-center text-muted-foreground p-6">Nenhum desafio encontrado para os filtros selecionados.</p>
         ) : (
            <Table>
            <TableHeader>
                <TableRow>
                <TableHead className="w-[50px]">Ícone</TableHead>
                <TableHead>Título</TableHead>
                <TableHead>Período</TableHead>
                <TableHead className="hidden md:table-cell">Deptos.</TableHead>
                <TableHead className="hidden lg:table-cell">Pontos</TableHead>
                <TableHead className="hidden sm:table-cell">Tipo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right w-[100px]">Ações</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {challenges.map((challenge) => (
                <TableRow key={challenge.id}>
                    <TableCell>
                        {challenge.imageUrl ? (
                            <Image src={challenge.imageUrl} alt={challenge.title} width={32} height={32} className="rounded-sm object-cover" />
                        ) : (
                            <div className="w-8 h-8 flex items-center justify-center bg-muted rounded-sm">
                                <Target className="h-4 w-4 text-muted-foreground" />
                            </div>
                        )}
                    </TableCell>
                    <TableCell className="font-medium">{challenge.title}</TableCell>
                    <TableCell className="text-xs">
                        {format(parseISO(challenge.startDate + 'T00:00:00'), 'dd/MM', { locale: ptBR })} - {format(parseISO(challenge.endDate + 'T23:59:59'), 'dd/MM/yy', { locale: ptBR })}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-xs">
                         {challenge.eligibleDepartments.includes('Todos') ? 'Todos' : challenge.eligibleDepartments.join(', ')}
                     </TableCell>
                     <TableCell className="hidden lg:table-cell text-center">
                         <Badge variant="secondary">{challenge.points}</Badge>
                     </TableCell>
                     <TableCell className="hidden sm:table-cell text-xs">{challenge.participationType}</TableCell>
                     <TableCell>{getStatusBadge(challenge)}</TableCell>
                    <TableCell className="text-right space-x-1">
                        <Dialog open={isEditDialogOpen && selectedChallenge?.id === challenge.id} onOpenChange={(open) => {
                            setIsEditDialogOpen(open);
                            if (!open) {
                                setSelectedChallenge(null);
                                setCurrentEligibleDepartments(['Todos']); // Reset on close
                            }
                        }}>
                        <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(challenge)} disabled={isSubmitting} title="Editar">
                            <Edit className="h-4 w-4" />
                            </Button>
                        </DialogTrigger>
                         <DialogContent className="sm:max-w-3xl">
                            <DialogHeader>
                                <DialogTitle>Editar Desafio Semanal</DialogTitle>
                                <DialogDescription>
                                    Atualize os detalhes do desafio "{selectedChallenge?.title}".
                                </DialogDescription>
                            </DialogHeader>
                             <ChallengeForm
                                 onSubmit={(e) => handleSaveChallenge(e, true)}
                                 isSubmitting={isSubmitting}
                                 currentEligibleDepartments={currentEligibleDepartments}
                                 renderDepartmentSelection={() => renderDepartmentSelection(true)}
                                 departments={departments}
                                 categories={categories}
                                 challenge={selectedChallenge}
                                 isEditing={true}
                             />
                        </DialogContent>
                        </Dialog>

                        <Dialog open={isDeleteDialogOpen && selectedChallenge?.id === challenge.id} onOpenChange={(open) => {
                            setIsDeleteDialogOpen(open);
                            if (!open) setSelectedChallenge(null);
                        }}>
                        <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(challenge)} disabled={isSubmitting} title="Excluir">
                            <Trash2 className="h-4 w-4" />
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                            <DialogTitle>Confirmar Exclusão</DialogTitle>
                            <DialogDescription>
                                Tem certeza que deseja excluir o desafio <strong>{selectedChallenge?.title}</strong>? Esta ação não pode ser desfeita.
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


// Componente de formulário reutilizável para Adicionar/Editar Desafio
interface ChallengeFormProps {
    onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
    isSubmitting: boolean;
    currentEligibleDepartments: string[];
    renderDepartmentSelection: () => React.ReactNode;
    departments: Department[];
    categories: string[];
    challenge?: Challenge | null; // Dados para preencher na edição
    isEditing?: boolean;
}

function ChallengeForm({
    onSubmit,
    isSubmitting,
    currentEligibleDepartments,
    renderDepartmentSelection,
    departments,
    categories,
    challenge = null,
    isEditing = false,
}: ChallengeFormProps) {

    const prefix = isEditing ? 'edit-' : '';
    const today = format(new Date(), 'yyyy-MM-dd'); // Para min date

    return (
       <form onSubmit={onSubmit}>
          <fieldset disabled={isSubmitting} className="grid gap-4 py-4 sm:grid-cols-2 lg:grid-cols-3 sm:gap-x-6">
              {/* Coluna 1 */}
              <div className="space-y-4 lg:col-span-1">
                  <div className="space-y-2">
                      <Label htmlFor={`${prefix}title`}>Título *</Label>
                      <Input id={`${prefix}title`} name={`${prefix}title`} required defaultValue={challenge?.title} placeholder="Ex: Organização Nota 10"/>
                  </div>
                  <div className="space-y-2">
                      <Label htmlFor={`${prefix}description`}>Descrição *</Label>
                      <Textarea id={`${prefix}description`} name={`${prefix}description`} required defaultValue={challenge?.description} placeholder="Explique o desafio..." rows={4}/>
                  </div>
                   <div className="space-y-2">
                      <Label htmlFor={`${prefix}category`} className="flex items-center gap-1">
                           <Tag className="h-4 w-4"/> Categoria (Opcional)
                      </Label>
                       <Input id={`${prefix}category`} name={`${prefix}category`} list={`${prefix}category-suggestions`} defaultValue={challenge?.category ?? ''} placeholder="Ex: Qualidade, Produtividade"/>
                       <datalist id={`${prefix}category-suggestions`}>
                          {categories.map(cat => <option key={cat} value={cat} />)}
                          {/* Add common defaults if needed */}
                          <option value="Produtividade" />
                          <option value="Qualidade" />
                          <option value="Inovação" />
                          <option value="Atendimento" />
                          <option value="Segurança" />
                       </datalist>
                  </div>
                  <div className="space-y-2">
                      <Label htmlFor={`${prefix}difficulty`}>Nível de Dificuldade</Label>
                      <Select name={`${prefix}difficulty`} defaultValue={challenge?.difficulty ?? 'Médio'}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                              {difficulties.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                          </SelectContent>
                      </Select>
                  </div>
              </div>

                {/* Coluna 2 */}
               <div className="space-y-4 lg:col-span-1">
                   <div className="space-y-2">
                       <Label htmlFor={`${prefix}startDate`} className="flex items-center gap-1"><Calendar className="h-4 w-4"/> Data Início *</Label>
                       <Input id={`${prefix}startDate`} name={`${prefix}startDate`} type="date" required defaultValue={challenge?.startDate} min={today}/>
                   </div>
                   <div className="space-y-2">
                       <Label htmlFor={`${prefix}endDate`} className="flex items-center gap-1"><Calendar className="h-4 w-4"/> Data Fim *</Label>
                       <Input id={`${prefix}endDate`} name={`${prefix}endDate`} type="date" required defaultValue={challenge?.endDate} min={today}/>
                   </div>
                   <div className="space-y-2">
                       <Label htmlFor={`${prefix}points`} className="flex items-center gap-1"><Award className="h-4 w-4"/> Pontos Ganhos *</Label>
                       <Input id={`${prefix}points`} name={`${prefix}points`} type="number" min="1" required defaultValue={challenge?.points ?? ''} placeholder="Ex: 50"/>
                   </div>
                    <div className="space-y-2">
                      <Label htmlFor={`${prefix}participationType`}>Tipo de Participação *</Label>
                      <Select name={`${prefix}participationType`} required defaultValue={challenge?.participationType ?? 'Opcional'}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                              {participationTypes.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                          </SelectContent>
                      </Select>
                  </div>
                   <div className="space-y-2">
                      <Label htmlFor={`${prefix}imageUrl`} className="flex items-center gap-1"><ImageIcon className="h-4 w-4"/> URL Imagem/Ícone</Label>
                      <Input id={`${prefix}imageUrl`} name={`${prefix}imageUrl`} defaultValue={challenge?.imageUrl ?? ''} placeholder="https://..."/>
                  </div>
              </div>

              {/* Coluna 3 */}
              <div className="space-y-4 lg:col-span-1">
                    {renderDepartmentSelection()}
                    <div className="space-y-2">
                      <Label htmlFor={`${prefix}evaluationMetrics`} className="flex items-center gap-1"><FileText className="h-4 w-4"/> Métricas de Avaliação</Label>
                      <Textarea id={`${prefix}evaluationMetrics`} name={`${prefix}evaluationMetrics`} defaultValue={challenge?.evaluationMetrics ?? ''} placeholder="Como o cumprimento será medido? Ex: Relatório X, Feedback Y..." rows={3}/>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`${prefix}supportMaterial`} className="flex items-center gap-1"><BookOpen className="h-4 w-4"/> Material de Apoio</Label>
                      <Input id={`${prefix}supportMaterial`} name={`${prefix}supportMaterial`} defaultValue={challenge?.supportMaterial ?? ''} placeholder="Link ou descrição do material"/>
                    </div>
                    <div className="flex items-center space-x-2 pt-4">
                        <Switch
                            id={`${prefix}isActive`}
                            name={`${prefix}isActive`}
                            defaultChecked={challenge?.isActive ?? false}
                            disabled={isSubmitting}
                         />
                        <Label htmlFor={`${prefix}isActive`}>Ativar/Publicar Desafio</Label>
                    </div>
               </div>
            </fieldset>
           <DialogFooter className="mt-6 pt-4 border-t">
                <DialogClose asChild>
                    <Button type="button" variant="outline" disabled={isSubmitting}>Cancelar</Button>
                </DialogClose>
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isSubmitting ? 'Salvando...' : (isEditing ? 'Salvar Alterações' : 'Criar Desafio')}
                </Button>
            </DialogFooter>
       </form>
    );
}
