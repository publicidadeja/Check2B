
'use client';

import * as React from 'react';
import {
  PlusCircle,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Copy,
  Target,
  LayoutDashboard,
  ClipboardCheck,
  History,
  Cog,
  Loader2,
  CheckSquare,
  CalendarClock,
  Users,
  Award,
  Save,
  Link as LinkIcon,
  Archive,
  CheckCircle,
  FileClock,
  Eye,
  Frown,
  AlertTriangle,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogClose
} from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ChallengeForm } from '@/components/challenge/challenge-form';
import type { Challenge, ChallengeParticipation } from '@/types/challenge';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO, differenceInDays, isPast, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { DataTable } from '@/components/ui/data-table';
import type { ColumnDef } from '@tanstack/react-table';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useAuth } from '@/hooks/use-auth';
import {
    getAllChallenges,
    saveChallenge as saveChallengeToFirestore,
    deleteChallenge as deleteChallengeFromFirestore,
    updateChallengeStatus as updateChallengeStatusInFirestore,
    getChallengeDetails as fetchChallengeDetailsFromFirestore,
    getParticipationsForChallenge as fetchParticipantsForChallengeFromFirestore,
    evaluateSubmission as evaluateSubmissionInFirestore,
} from '@/lib/challenge-service';
import { mockEmployeesSimple } from '@/lib/mockData/challenges'; // For form select population

// Utility Functions
const getStatusText = (status: Challenge['status']): string => {
    const map: Record<Challenge['status'], string> = {
        active: 'Ativo', scheduled: 'Agendado', evaluating: 'Em Avaliação',
        completed: 'Concluído', draft: 'Rascunho', archived: 'Arquivado'
    };
    return map[status] || status;
}

const getStatusBadgeVariant = (status: Challenge['status']): "default" | "secondary" | "destructive" | "outline" => {
    const map: Record<Challenge['status'], "default" | "secondary" | "destructive" | "outline"> = {
        active: 'default', scheduled: 'secondary', evaluating: 'outline',
        completed: 'secondary', draft: 'outline', archived: 'destructive',
    };
    return map[status] || 'outline';
}

const ManageChallenges = () => {
    const { organizationId, user: currentUser, isLoading: authLoading } = useAuth();
    const [challenges, setChallenges] = React.useState<Challenge[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [selectedChallenge, setSelectedChallenge] = React.useState<Challenge | null>(null);
    const [isFormOpen, setIsFormOpen] = React.useState(false);
    const [isDeleting, setIsDeleting] = React.useState(false);
    const [challengeToDelete, setChallengeToDelete] = React.useState<Challenge | null>(null);
    const { toast } = useToast();

    const loadChallenges = React.useCallback(async () => {
        if (!organizationId || authLoading) {
            if (!authLoading && !organizationId) setIsLoading(false); // Stop loading if orgId missing and auth is done
            return;
        }
        setIsLoading(true);
        try {
            const data = await getAllChallenges(organizationId);
            setChallenges(data);
        } catch (error) {
            console.error("Falha ao carregar desafios:", error);
            toast({ title: "Erro", description: "Falha ao carregar desafios.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }, [organizationId, authLoading, toast]);

    React.useEffect(() => {
        loadChallenges();
    }, [loadChallenges]);

    const handleSaveChallenge = async (data: any) => {
        if (!organizationId) {
            toast({ title: "Erro", description: "ID da Organização não encontrado.", variant: "destructive" });
            return;
        }
        const challengeDataToSave = selectedChallenge ? { ...data, id: selectedChallenge.id } : data;
        
        setIsLoading(true);
        try {
            await saveChallengeToFirestore(organizationId, challengeDataToSave);
            setIsFormOpen(false);
            setSelectedChallenge(null);
            await loadChallenges();
            toast({
                title: "Sucesso!",
                description: `Desafio ${selectedChallenge ? 'atualizado' : 'criado'} com sucesso.`,
            });
        } catch (error) {
            console.error("Erro ao salvar desafio:", error);
            toast({ title: "Erro!", description: `Falha ao ${selectedChallenge ? 'atualizar' : 'criar'} desafio.`, variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteClick = (challenge: Challenge) => {
        setChallengeToDelete(challenge);
        setIsDeleting(true);
    };

    const confirmDelete = async () => {
        if (challengeToDelete && organizationId) {
            if (['active', 'evaluating'].includes(challengeToDelete.status)) {
                toast({ title: "Ação Bloqueada", description: "Não é possível remover um desafio ativo ou em avaliação.", variant: "destructive" });
                setIsDeleting(false);
                setChallengeToDelete(null);
                return;
            }
            setIsLoading(true);
            try {
                await deleteChallengeFromFirestore(organizationId, challengeToDelete.id);
                toast({ title: "Sucesso", description: "Desafio removido com sucesso." });
                await loadChallenges();
            } catch (error: any) {
                console.error("Falha ao remover desafio:", error);
                toast({ title: "Erro", description: error.message || "Falha ao remover desafio.", variant: "destructive" });
            } finally {
                setIsLoading(false);
                setIsDeleting(false);
                setChallengeToDelete(null);
            }
        }
    };
    
    const handleDuplicateChallenge = async (challenge: Challenge) => {
        if (!organizationId) return;
        const { id, title, status, createdAt, updatedAt, ...challengeData } = challenge;
        const duplicatedChallengeData = {
            ...challengeData,
            title: `${title} (Cópia)`,
            status: 'draft' as Challenge['status'], // Duplicates start as draft
            // periodStartDate and periodEndDate are already part of challengeData
        };
        setIsLoading(true);
        try {
            await saveChallengeToFirestore(organizationId, duplicatedChallengeData as Omit<Challenge, 'id'|'organizationId'|'createdAt'|'updatedAt'>);
            toast({ title: "Sucesso", description: "Desafio duplicado com sucesso." });
            await loadChallenges();
        } catch (error) {
            console.error("Falha ao duplicar desafio:", error);
            toast({ title: "Erro", description: "Falha ao duplicar desafio.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    const handleStatusChange = async (challenge: Challenge, newStatus: Challenge['status']) => {
        if (!organizationId) return;
        setIsLoading(true);
        try {
            await updateChallengeStatusInFirestore(organizationId, challenge.id, newStatus);
            toast({ title: "Sucesso", description: `Status do desafio "${challenge.title}" alterado.` });
            await loadChallenges();
        } catch (error) {
            console.error("Falha ao alterar status:", error);
            toast({ title: "Erro", description: "Falha ao alterar status do desafio.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }

    const openEditForm = (challenge: Challenge) => setSelectedChallenge(challenge);
    const openAddForm = () => { setSelectedChallenge(null); setIsFormOpen(true); };
    React.useEffect(() => { if (selectedChallenge) setIsFormOpen(true); }, [selectedChallenge]);


    const formatPeriod = (start?: string, end?: string) => {
        if (!start || !end) return 'N/A';
        try {
            // Assuming start and end are already YYYY-MM-DD strings
            return `${format(parseISO(start), 'dd/MM/yy', { locale: ptBR })} - ${format(parseISO(end), 'dd/MM/yy', { locale: ptBR })}`;
        } catch (error) {
            console.error("Error formatting date:", error, start, end);
            return `${start} - ${end}`;
        }
    }

     const columns: ColumnDef<Challenge>[] = [
        { accessorKey: "title", header: "Título", cell: ({ row }) => <span className="font-medium">{row.original.title}</span> },
        { accessorKey: "period", header: "Período", cell: ({ row }) => formatPeriod(row.original.periodStartDate, row.original.periodEndDate) },
        { accessorKey: "points", header: () => <div className="text-center"><Award className="inline-block mr-1 h-4 w-4"/>Pontos</div>, cell: ({ row }) => <div className="text-center">{row.original.points}</div>, size: 80, },
        { accessorKey: "difficulty", header: "Dificuldade" },
        { accessorKey: "participationType", header: "Participação" },
        { accessorKey: "status", header: "Status", cell: ({ row }) => <Badge variant={getStatusBadgeVariant(row.original.status)}>{getStatusText(row.original.status)}</Badge> },
        {
            id: "actions",
            cell: ({ row }) => {
                const challenge = row.original;
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
                            <DropdownMenuItem onClick={() => openEditForm(challenge)}>
                                <Edit className="mr-2 h-4 w-4" /> Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDuplicateChallenge(challenge)}>
                                <Copy className="mr-2 h-4 w-4" /> Duplicar
                            </DropdownMenuItem>
                            {challenge.status === 'draft' && (
                                <DropdownMenuItem onClick={() => handleStatusChange(challenge, 'scheduled')}>
                                    <CheckCircle className="mr-2 h-4 w-4 text-green-600" /> Agendar/Ativar
                                </DropdownMenuItem>
                            )}
                            {challenge.status === 'scheduled' && (
                                <DropdownMenuItem onClick={() => handleStatusChange(challenge, 'active')}>
                                    <Target className="mr-2 h-4 w-4 text-blue-600" /> Iniciar Agora
                                </DropdownMenuItem>
                            )}
                            {challenge.status === 'active' && (
                                <DropdownMenuItem onClick={() => handleStatusChange(challenge, 'evaluating')}>
                                    <ClipboardCheck className="mr-2 h-4 w-4 text-orange-600" /> Iniciar Avaliação
                                </DropdownMenuItem>
                            )}
                             {challenge.status === 'evaluating' && (
                                <DropdownMenuItem onClick={() => handleStatusChange(challenge, 'completed')}>
                                    <CheckSquare className="mr-2 h-4 w-4 text-primary" /> Marcar como Concluído
                                </DropdownMenuItem>
                            )}
                             {challenge.status === 'completed' && (
                                <DropdownMenuItem onClick={() => handleStatusChange(challenge, 'archived')}>
                                    <Archive className="mr-2 h-4 w-4 text-muted-foreground" /> Arquivar
                                </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                onClick={() => handleDeleteClick(challenge)}
                                className="text-destructive focus:text-destructive focus:bg-destructive/10"
                                disabled={challenge.status === 'active' || challenge.status === 'evaluating'}
                            >
                                <Trash2 className="mr-2 h-4 w-4" /> Remover
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                );
            },
            size: 50,
        },
    ];

    if (authLoading) {
        return <div className="flex justify-center items-center py-10"><LoadingSpinner text="Autenticando..."/></div>;
    }
    if (!organizationId && !authLoading) {
         return (
            <Card>
                <CardHeader><CardTitle>Acesso Negado</CardTitle></CardHeader>
                <CardContent><p className="text-destructive">Administrador não vinculado a uma organização.</p></CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Gerenciar Desafios</CardTitle>
                <CardDescription>Crie, edite, duplique e controle o ciclo de vida dos desafios.</CardDescription>
            </CardHeader>
            <CardContent>
                 {isLoading ? (
                     <div className="flex justify-center items-center py-10"><LoadingSpinner text="Carregando desafios..."/></div>
                 ) : challenges.length === 0 ? (
                     <div className="text-center py-10 text-muted-foreground">
                         <Frown className="mx-auto h-10 w-10 mb-2" />
                         <p>Nenhum desafio encontrado para esta organização.</p>
                         <Button className="mt-4" onClick={openAddForm}>
                             <PlusCircle className="mr-2 h-4 w-4" /> Criar Primeiro Desafio
                         </Button>
                     </div>
                  ) : (
                    <DataTable columns={columns} data={challenges} filterColumn="title" filterPlaceholder="Buscar por título..."/>
                 )}
            </CardContent>
             { !isLoading && organizationId && (
                 <CardFooter className="flex justify-end">
                     <Button onClick={openAddForm}>
                         <PlusCircle className="mr-2 h-4 w-4" /> Criar Novo Desafio
                     </Button>
                 </CardFooter>
             )}

            <ChallengeForm
                challenge={selectedChallenge}
                onSave={handleSaveChallenge}
                open={isFormOpen}
                onOpenChange={setIsFormOpen}
            />

            <AlertDialog open={isDeleting} onOpenChange={setIsDeleting}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>Confirmar Remoção</AlertDialogTitle>
                    <AlertDialogDescription>
                        Tem certeza que deseja remover o desafio "{challengeToDelete?.title}"? Esta ação não pode ser desfeita.
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setChallengeToDelete(null)}>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Remover
                    </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Card>
    );
};

const ChallengeDashboard = () => {
    // TODO: Implement actual data fetching for dashboard
    const { organizationId, isLoading: authLoading } = useAuth();
    const [isLoading, setIsLoadingData] = React.useState(true);
    const [activeChallengesCount, setActiveChallengesCount] = React.useState(0);
    const [pendingSubmissionsCount, setPendingSubmissionsCount] = React.useState(0);
    const [completionRate, setCompletionRate] = React.useState('N/A');
    const { toast } = useToast();

    React.useEffect(() => {
        if (!organizationId || authLoading) {
            if (!authLoading) setIsLoadingData(false);
            return;
        }
        const loadDashboardData = async () => {
            setIsLoadingData(true);
            try {
                const allChallenges = await getAllChallenges(organizationId);
                const activeCh = allChallenges.filter(c => c.status === 'active');
                setActiveChallengesCount(activeCh.length);
                
                let totalPending = 0;
                for (const challenge of allChallenges.filter(c => c.status === 'evaluating' || c.status === 'active')) {
                    const participations = await fetchParticipantsForChallengeFromFirestore(organizationId, challenge.id);
                    totalPending += participations.filter(p => p.status === 'submitted').length;
                }
                setPendingSubmissionsCount(totalPending);

                // Calculate completionRate (example: approved / (approved + rejected))
                let totalApproved = 0;
                let totalEvaluated = 0;
                for (const challenge of allChallenges.filter(c => ['completed', 'evaluating'].includes(c.status))) {
                     const participations = await fetchParticipantsForChallengeFromFirestore(organizationId, challenge.id);
                     totalApproved += participations.filter(p => p.status === 'approved').length;
                     totalEvaluated += participations.filter(p => ['approved', 'rejected'].includes(p.status)).length;
                }
                setCompletionRate(totalEvaluated > 0 ? `${Math.round((totalApproved / totalEvaluated) * 100)}%` : 'N/A');

            } catch (error) {
                toast({ title: "Erro Dashboard", description: "Falha ao carregar dados do dashboard.", variant: "destructive"});
            } finally {
                setIsLoadingData(false);
            }
        };
        loadDashboardData();
    }, [organizationId, authLoading, toast]);

    if (authLoading) return <LoadingSpinner text="Autenticando..."/>;
    if (!organizationId && !authLoading) return <Card><CardHeader><CardTitle>Acesso Negado</CardTitle></CardHeader><CardContent><p>Admin sem organização.</p></CardContent></Card>;


    return (
      <Card>
        <CardHeader>
          <CardTitle>Dashboard de Desafios</CardTitle>
          <CardDescription>Visão geral do programa de desafios.</CardDescription>
        </CardHeader>
         <CardContent>
            {isLoading ? (
                <div className="flex justify-center items-center py-10"><LoadingSpinner text="Carregando dashboard..." /></div>
             ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                        <CardHeader className="pb-2"><CardDescription>Desafios Ativos</CardDescription><CardTitle className="text-3xl">{activeChallengesCount}</CardTitle></CardHeader>
                        <CardContent><p className="text-xs text-muted-foreground">Desafios em andamento.</p></CardContent>
                    </Card>
                     <Card>
                        <CardHeader className="pb-2"><CardDescription>Submissões Pendentes</CardDescription><CardTitle className="text-3xl">{pendingSubmissionsCount}</CardTitle></CardHeader>
                         <CardContent><p className="text-xs text-muted-foreground">Aguardando avaliação.</p></CardContent>
                    </Card>
                     <Card>
                        <CardHeader className="pb-2"><CardDescription>Taxa de Conclusão Média</CardDescription><CardTitle className="text-3xl">{completionRate}</CardTitle></CardHeader>
                         <CardContent><p className="text-xs text-muted-foreground">Aprovações / Avaliadas.</p></CardContent>
                    </Card>
                </div>
             )}
             <div className="mt-6 text-center text-muted-foreground">(Gráficos e relatórios virão aqui)</div>
        </CardContent>
        <CardFooter><Button variant="outline" disabled>Ver Relatórios Detalhados</Button></CardFooter>
      </Card>
    );
};

const ChallengeEvaluation = () => {
    const { organizationId, user: currentUser, isLoading: authLoading } = useAuth();
    const [challengesToEvaluate, setChallengesToEvaluate] = React.useState<Challenge[]>([]);
    const [selectedChallengeId, setSelectedChallengeId] = React.useState<string | null>(null);
    const [participants, setParticipants] = React.useState<ChallengeParticipation[]>([]);
    const [isLoadingChallenges, setIsLoadingChallenges] = React.useState(true);
    const [isLoadingParticipants, setIsLoadingParticipants] = React.useState(false);
    const [currentEvaluation, setCurrentEvaluation] = React.useState<{ [key: string]: { status: 'approved' | 'rejected' | 'pending', feedback: string, score?: number, isSaving: boolean } }>({});
    const { toast } = useToast();

    React.useEffect(() => {
        if (!organizationId || authLoading) {
            if (!authLoading) setIsLoadingChallenges(false);
            return;
        }
        const fetchEvaluableChallenges = async () => {
            setIsLoadingChallenges(true);
            try {
                const allChallenges = await getAllChallenges(organizationId);
                setChallengesToEvaluate(allChallenges.filter(c => c.status === 'evaluating'));
            } catch {
                 toast({ title: "Erro", description: "Falha ao carregar desafios para avaliação.", variant: "destructive" });
            } finally {
                 setIsLoadingChallenges(false);
            }
        };
        fetchEvaluableChallenges();
    }, [organizationId, authLoading, toast]);

     React.useEffect(() => {
        if (selectedChallengeId && organizationId) {
            const fetchParticipants = async () => {
                setIsLoadingParticipants(true);
                setCurrentEvaluation({});
                try {
                    const participantsData = await fetchParticipantsForChallengeFromFirestore(organizationId, selectedChallengeId);
                    const submittedParticipants = participantsData.filter(p => p.status === 'submitted');
                    setParticipants(submittedParticipants);
                    const initialEvalState: typeof currentEvaluation = {};
                    submittedParticipants.forEach(p => {
                         initialEvalState[p.id] = { status: 'pending', feedback: '', isSaving: false };
                    });
                    setCurrentEvaluation(initialEvalState);
                } catch {
                     toast({ title: "Erro", description: "Falha ao carregar participantes.", variant: "destructive" });
                } finally {
                    setIsLoadingParticipants(false);
                }
            };
            fetchParticipants();
        } else {
            setParticipants([]);
        }
    }, [selectedChallengeId, organizationId, toast]);

    const handleEvaluationChange = (participantId: string, field: 'status' | 'feedback' | 'score', value: any) => {
        setCurrentEvaluation(prev => ({
            ...prev,
            [participantId]: {
                ...(prev[participantId] || { status: 'pending', feedback: '', isSaving: false }),
                [field]: value,
                ...(field === 'status' && value === 'rejected' && { score: 0 }),
                 ...(field === 'status' && value === 'approved' && prev[participantId]?.score === undefined && { score: challengesToEvaluate.find(c => c.id === selectedChallengeId)?.points || 0 })
            }
        }));
    };

    const handleSaveEvaluation = async (participantId: string) => {
        if (!organizationId || !currentUser?.uid) {
            toast({ title: "Erro", description: "Organização ou avaliador não identificados.", variant: "destructive" });
            return;
        }
        const evaluationData = currentEvaluation[participantId];
        const participant = participants.find(p => p.id === participantId);
        const challenge = challengesToEvaluate.find(c => c.id === selectedChallengeId);

        if (!evaluationData || !participant || !challenge) return;
        if (evaluationData.status === 'pending') {
            toast({ title: "Atenção", description: "Selecione 'Aprovado' ou 'Rejeitado'.", variant: "destructive" });
            return;
        }
        if (evaluationData.status === 'rejected' && !evaluationData.feedback?.trim()) {
            toast({ title: "Atenção", description: "Feedback é obrigatório ao rejeitar.", variant: "destructive" });
            return;
        }

        setCurrentEvaluation(prev => ({ ...prev, [participantId]: { ...evaluationData, isSaving: true } }));
        try {
            const finalScore = evaluationData.status === 'approved' ? (evaluationData.score ?? challenge.points) : 0;
            await evaluateSubmissionInFirestore(organizationId, participantId, {
                status: evaluationData.status,
                score: finalScore,
                feedback: evaluationData.feedback,
                evaluatorId: currentUser.uid,
            });
            toast({ title: "Sucesso", description: `Avaliação para ${participant.employeeName} salva.` });
            setParticipants(prev => prev.filter(p => p.id !== participantId)); // Remove from list
             // Optionally, auto-update challenge status if all evaluated
        } catch (error) {
            console.error("Falha ao salvar avaliação:", error);
            toast({ title: "Erro", description: "Falha ao salvar avaliação.", variant: "destructive" });
            setCurrentEvaluation(prev => ({ ...prev, [participantId]: { ...evaluationData, isSaving: false } }));
        }
    };

    const selectedChallenge = challengesToEvaluate.find(c => c.id === selectedChallengeId);

    if (authLoading) return <LoadingSpinner text="Autenticando..."/>;
    if (!organizationId && !authLoading) return <Card><CardHeader><CardTitle>Acesso Negado</CardTitle></CardHeader><CardContent><p>Admin sem organização.</p></CardContent></Card>;

    return (
        <Card>
            <CardHeader>
            <CardTitle className="flex items-center gap-2"><CheckSquare className="h-5 w-5"/> Avaliação de Desafios</CardTitle>
            <CardDescription>Avalie as submissões dos desafios "Em Avaliação".</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                    <Label htmlFor="challenge-select-eval">Selecione o Desafio:</Label>
                    <Select value={selectedChallengeId || ''} onValueChange={setSelectedChallengeId} disabled={isLoadingChallenges}>
                        <SelectTrigger id="challenge-select-eval" className="w-full md:w-[300px]">
                            <SelectValue placeholder={isLoadingChallenges ? "Carregando..." : "Selecione..."} />
                        </SelectTrigger>
                        <SelectContent>
                             {isLoadingChallenges ? (<SelectItem value="loading" disabled>Carregando...</SelectItem>)
                             : challengesToEvaluate.length === 0 ? (<SelectItem value="no-challenges" disabled>Nenhum desafio em avaliação</SelectItem>)
                             : (challengesToEvaluate.map(ch => (
                                <SelectItem key={ch.id} value={ch.id}>
                                    {ch.title} ({ch.periodEndDate ? format(parseISO(ch.periodEndDate), 'dd/MM/yy') : 'Data Inválida'})
                                </SelectItem>
                             )))}
                        </SelectContent>
                    </Select>
                </div>
                {selectedChallengeId && (
                    <div className="mt-4 border rounded-md p-4">
                         <h3 className="font-semibold mb-3">Avaliar: "{selectedChallenge?.title}"</h3>
                         <p className="text-sm text-muted-foreground mb-4">Critérios: {selectedChallenge?.evaluationMetrics}</p>
                         <Separator className="mb-4" />
                        {isLoadingParticipants ? (<div className="text-center py-6"><LoadingSpinner text="Carregando..."/></div>)
                         : participants.length === 0 ? (<p className="text-muted-foreground text-center py-4">Nenhuma submissão pendente.</p>)
                         : (<ScrollArea className="h-[45vh]"><div className="space-y-4 pr-4">
                            {participants.map(p => (
                                <Card key={p.id} className="bg-muted/50">
                                    <CardHeader className="pb-2 pt-3 px-4">
                                        <CardTitle className="text-base flex justify-between items-center">{p.employeeName}
                                            <span className="text-xs text-muted-foreground font-normal">
                                                Enviado: {p.submittedAt ? format(p.submittedAt, 'dd/MM/yy HH:mm') : '-'}
                                            </span>
                                        </CardTitle>
                                        <CardDescription className="text-sm pt-1"><strong>Submissão:</strong>{' '}
                                            {p.submissionText ? p.submissionText : p.submissionFileUrl ? (
                                                <a href={p.submissionFileUrl} target="_blank" rel="noopener noreferrer" className="text-accent underline hover:text-accent/80">
                                                    <LinkIcon className="inline-block h-3 w-3 mr-1" /> Ver Anexo
                                                </a>
                                            ) : <span className="italic text-muted-foreground">Nenhuma descrição/anexo.</span>}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="px-4 pb-3 space-y-2">
                                        <div className="flex flex-col md:flex-row gap-2 items-start md:items-center">
                                            <div className='flex-shrink-0'>
                                                <Label className="text-xs">Resultado:</Label>
                                                <Select value={currentEvaluation[p.id]?.status || 'pending'} onValueChange={(v: 'approved'|'rejected') => handleEvaluationChange(p.id, 'status', v)} disabled={currentEvaluation[p.id]?.isSaving}>
                                                    <SelectTrigger className="h-9 w-full md:w-[120px]"><SelectValue placeholder="Avaliar..." /></SelectTrigger>
                                                    <SelectContent><SelectItem value="approved">Aprovado</SelectItem><SelectItem value="rejected">Rejeitado</SelectItem></SelectContent>
                                                </Select>
                                            </div>
                                            {currentEvaluation[p.id]?.status === 'approved' && (
                                                <div className='flex-shrink-0'>
                                                    <Label htmlFor={`score-${p.id}`} className="text-xs">Pontos:</Label>
                                                    <Input id={`score-${p.id}`} type="number" className="h-9 w-[80px]" value={currentEvaluation[p.id]?.score ?? ''} onChange={(e) => handleEvaluationChange(p.id, 'score', e.target.value ? parseInt(e.target.value) : undefined)} placeholder={selectedChallenge?.points.toString()} min="0" max={selectedChallenge?.points} disabled={currentEvaluation[p.id]?.isSaving}/>
                                                </div>
                                            )}
                                            <div className='flex-1 min-w-0'>
                                                <Label htmlFor={`feedback-${p.id}`} className="text-xs">Feedback {currentEvaluation[p.id]?.status === 'rejected' ? '(Obrigatório)' : '(Opcional)'}:</Label>
                                                <Textarea id={`feedback-${p.id}`} placeholder="Feedback..." className="min-h-[40px] text-sm" value={currentEvaluation[p.id]?.feedback || ''} onChange={(e) => handleEvaluationChange(p.id, 'feedback', e.target.value)} required={currentEvaluation[p.id]?.status === 'rejected'} disabled={currentEvaluation[p.id]?.isSaving}/>
                                            </div>
                                            <Button size="sm" className="mt-4 md:mt-5 self-end md:self-center" onClick={() => handleSaveEvaluation(p.id)} disabled={!currentEvaluation[p.id] || currentEvaluation[p.id].status === 'pending' || currentEvaluation[p.id].isSaving}>
                                                {currentEvaluation[p.id]?.isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                                {currentEvaluation[p.id]?.isSaving ? 'Salvando...' : 'Salvar'}
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                         </div></ScrollArea>)}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

interface ChallengeDetailsDialogProps {
    challengeId: string | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}
const ChallengeDetailsDialog = ({ challengeId, open, onOpenChange }: ChallengeDetailsDialogProps) => {
    const { organizationId, isLoading: authLoading } = useAuth();
    const [details, setDetails] = React.useState<{ challenge: Challenge, participants: ChallengeParticipation[] } | null>(null);
    const [isLoading, setIsLoading] = React.useState(false);

    React.useEffect(() => {
        if (open && challengeId && organizationId) {
            const loadDetails = async () => {
                setIsLoading(true);
                try {
                    const data = await fetchChallengeDetailsFromFirestore(organizationId, challengeId);
                    setDetails(data);
                } catch (error) { console.error("Failed to load challenge details:", error); }
                finally { setIsLoading(false); }
            };
            loadDetails();
        } else if (!open) { setDetails(null); }
    }, [open, challengeId, organizationId]);

    const getParticipantStatusText = (status: ChallengeParticipation['status']): string => ({ pending: 'Pendente', submitted: 'Enviado', approved: 'Aprovado', rejected: 'Rejeitado', accepted: 'Aceito' }[status] || status);
    const getParticipantStatusVariant = (status: ChallengeParticipation['status']): "default" | "secondary" | "destructive" | "outline" => ({ pending: 'outline', accepted: 'outline', submitted: 'default', approved: 'secondary', rejected: 'destructive' }[status] || 'outline');

    return (
         <Dialog open={open} onOpenChange={onOpenChange}>
             <DialogContent className="sm:max-w-3xl">
                 <DialogHeader><DialogTitle>Detalhes: {details?.challenge.title ?? 'Carregando...'}</DialogTitle><DialogDescription>Resultados e participantes.</DialogDescription></DialogHeader>
                {isLoading || authLoading ? (<div className="flex justify-center items-center py-10"><LoadingSpinner text="Carregando..." /></div>)
                 : details ? (
                     <div className="py-4 grid grid-cols-1 md:grid-cols-3 gap-4 max-h-[60vh] overflow-y-auto">
                         <div className="md:col-span-1 space-y-3 border-r pr-4">
                            <h4 className="font-semibold text-base">Info</h4>
                             <p className="text-sm"><strong className="text-muted-foreground">Status:</strong> <Badge variant={getStatusBadgeVariant(details.challenge.status)}>{getStatusText(details.challenge.status)}</Badge></p>
                             <p className="text-sm"><strong className="text-muted-foreground">Período:</strong> {formatPeriod(details.challenge.periodStartDate, details.challenge.periodEndDate)}</p>
                             <p className="text-sm"><strong className="text-muted-foreground">Pontos:</strong> {details.challenge.points}</p>
                             <p className="text-sm"><strong className="text-muted-foreground">Elegibilidade:</strong> {details.challenge.eligibility.type === 'all' ? 'Todos' : `${details.challenge.eligibility.type}: ${details.challenge.eligibility.entityIds?.join(', ')}`}</p>
                             <p className="text-sm"><strong className="text-muted-foreground">Métricas:</strong> {details.challenge.evaluationMetrics}</p>
                         </div>
                         <div className="md:col-span-2 space-y-3">
                            <h4 className="font-semibold text-base">Participantes ({details.participants.length})</h4>
                             {details.participants.length > 0 ? (
                                <Table><TableHeader><TableRow><TableHead>Colaborador</TableHead><TableHead>Status</TableHead><TableHead>Pontos</TableHead><TableHead>Feedback</TableHead></TableRow></TableHeader>
                                    <TableBody>{details.participants.map(p => (
                                        <TableRow key={p.id}><TableCell className="font-medium">{p.employeeName}</TableCell><TableCell><Badge variant={getParticipantStatusVariant(p.status)}>{getParticipantStatusText(p.status)}</Badge></TableCell><TableCell className="text-center">{p.score ?? '-'}</TableCell><TableCell className="text-xs max-w-[200px] truncate" title={p.feedback}>{p.feedback || '-'}</TableCell></TableRow>
                                    ))}</TableBody></Table>
                             ) : (<p className="text-center text-muted-foreground py-4">Nenhum participante.</p>)}
                         </div>
                     </div>
                 ) : (<p className="text-center text-muted-foreground py-10">Não foi possível carregar.</p>)}
                 <DialogFooter><DialogClose asChild><Button type="button" variant="secondary">Fechar</Button></DialogClose></DialogFooter>
             </DialogContent>
         </Dialog>
    );
}

const ChallengeHistory = () => {
     const { organizationId, isLoading: authLoading } = useAuth();
     const [historyChallenges, setHistoryChallenges] = React.useState<Challenge[]>([]);
     const [allParticipations, setAllParticipations] = React.useState<ChallengeParticipation[]>([]); // Store all for summary
     const [isLoading, setIsLoading] = React.useState(true);
     const [selectedChallengeIdForDetails, setSelectedChallengeIdForDetails] = React.useState<string | null>(null);
     const [isDetailsOpen, setIsDetailsOpen] = React.useState(false);
     const { toast } = useToast();

     React.useEffect(() => {
        if (!organizationId || authLoading) {
            if (!authLoading) setIsLoading(false);
            return;
        }
        const fetchHistory = async () => {
            setIsLoading(true);
            try {
                const challengesData = await getAllChallenges(organizationId);
                const participationsData = await Promise.all(
                    challengesData.map(ch => fetchParticipantsForChallengeFromFirestore(organizationId, ch.id))
                ).then(res => res.flat());
                
                setHistoryChallenges(challengesData.filter(c => ['completed', 'archived', 'evaluating'].includes(c.status))
                                            .sort((a, b) => parseISO(b.periodEndDate).getTime() - parseISO(a.periodEndDate).getTime()));
                setAllParticipations(participationsData);
            } catch (error) {
                 console.error("Failed to load challenge history:", error);
                 toast({ title: "Erro", description: "Falha ao carregar histórico.", variant: "destructive" });
            } finally { setIsLoading(false); }
        };
        fetchHistory();
    }, [organizationId, authLoading, toast]);

    const getParticipantSummary = (challengeId: string) => {
        const challengeParticipants = allParticipations.filter(p => p.challengeId === challengeId);
        if (challengeParticipants.length === 0) return "N/A";
        const approved = challengeParticipants.filter(p => p.status === 'approved').length;
        const evaluated = challengeParticipants.filter(p => ['approved', 'rejected'].includes(p.status)).length;
        return `${approved}/${evaluated} Aprovados (${challengeParticipants.length} Partic.)`;
    }

    const handleExportHistory = () => { /* ... unchanged ... */ };
    const openDetails = (challengeId: string) => { setSelectedChallengeIdForDetails(challengeId); setIsDetailsOpen(true); };

    const historyColumns: ColumnDef<Challenge>[] = [
        { accessorKey: "title", header: "Título", cell: ({ row }) => <span className="font-medium">{row.original.title}</span> },
        { accessorKey: "period", header: "Período", cell: ({ row }) => formatPeriod(row.original.periodStartDate, row.original.periodEndDate) },
        { accessorKey: "points", header: () => <div className="text-center">Pontos</div>, cell: ({ row }) => <div className="text-center">{row.original.points}</div>, size: 80 },
        { accessorKey: "status", header: "Status", cell: ({ row }) => <Badge variant={getStatusBadgeVariant(row.original.status)}>{getStatusText(row.original.status)}</Badge> },
        { header: () => <div className="text-center"><Users className="inline-block mr-1 h-4 w-4"/>Resultados</div>, cell: ({ row }) => <div className="text-center text-xs">{getParticipantSummary(row.original.id)}</div> },
        { id: "details", header: () => <div className="text-right">Detalhes</div>, cell: ({ row }) => (<div className="text-right"><Button variant="outline" size="sm" onClick={() => openDetails(row.original.id)}><Eye className="mr-1 h-3 w-3" /> Ver</Button></div>), size: 120 },
    ];

    if (authLoading) return <LoadingSpinner text="Autenticando..."/>;
    if (!organizationId && !authLoading) return <Card><CardHeader><CardTitle>Acesso Negado</CardTitle></CardHeader><CardContent><p>Admin sem organização.</p></CardContent></Card>;

    return (
        <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><CalendarClock className="h-5 w-5"/> Histórico</CardTitle><CardDescription>Consulte desafios passados.</CardDescription></CardHeader>
            <CardContent>{isLoading ? (<div className="text-center py-10"><LoadingSpinner text="Carregando..."/></div>)
             : historyChallenges.length === 0 ? (<p className="text-muted-foreground text-center py-5">Nenhum desafio no histórico.</p>)
             : (<DataTable columns={historyColumns} data={historyChallenges} filterColumn='title' filterPlaceholder='Buscar...' />)}
            </CardContent>
            <CardFooter><Button variant="outline" onClick={handleExportHistory} disabled={isLoading || historyChallenges.length === 0}><FileClock className="mr-2 h-4 w-4" /> Exportar</Button></CardFooter>
            <ChallengeDetailsDialog challengeId={selectedChallengeIdForDetails} open={isDetailsOpen} onOpenChange={setIsDetailsOpen}/>
        </Card>
    );
};

const ChallengeSettings = () => { /* ... unchanged, uses mock data ... */
    const { toast } = useToast();
    const [isSaving, setIsSaving] = React.useState(false);
    const [settings, setSettings] = React.useState({
        rankingFactor: 1.0, enableGamification: false, maxPointsCap: '', defaultParticipation: 'Opcional',
    });
    React.useEffect(() => { console.log("Loading challenge settings (simulated)..."); }, []);
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => setSettings(prev => ({ ...prev, [e.target.id]: e.target.type === 'number' ? (e.target.value === '' ? '' : parseFloat(e.target.value)) : e.target.value }));
    const handleSwitchChange = (checked: boolean) => setSettings(prev => ({ ...prev, enableGamification: checked }));
    const handleSelectChange = (value: string) => setSettings(prev => ({ ...prev, defaultParticipation: value }));
    const handleSaveSettings = async () => { setIsSaving(true); await new Promise(r => setTimeout(r, 800)); toast({ title: "Sucesso", description: "Configurações salvas." }); setIsSaving(false); };
    return (
        <Card><CardHeader><CardTitle className="flex items-center gap-2"><Cog className="h-5 w-5" /> Configurações</CardTitle><CardDescription>Ajuste regras gerais.</CardDescription></CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2"><Label htmlFor="rankingFactor">Fator no Ranking</Label><Input id="rankingFactor" type="number" value={settings.rankingFactor} onChange={handleInputChange} step="0.1" min="0" max="2" className="w-[100px]"/> <p className="text-xs text-muted-foreground">Multiplicador para pontos de desafios.</p></div><Separator />
                <div className="space-y-2"><Label htmlFor="defaultParticipation">Participação Padrão</Label><Select value={settings.defaultParticipation} onValueChange={handleSelectChange}><SelectTrigger id="defaultParticipation" className="w-[180px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Opcional">Opcional</SelectItem><SelectItem value="Obrigatório">Obrigatório</SelectItem></SelectContent></Select><p className="text-xs text-muted-foreground">Padrão ao criar novo desafio.</p></div><Separator />
                <div className="flex items-center space-x-2"><Switch id="enableGamification" checked={settings.enableGamification} onCheckedChange={handleSwitchChange} /><Label htmlFor="enableGamification" className="text-sm font-normal">Habilitar Gamificação</Label></div><p className="text-xs text-muted-foreground -mt-4 pl-8">Ativa emblemas/conquistas (requer implementação).</p><Separator />
                <div className="space-y-2"><Label htmlFor="maxPointsCap">Teto Mensal de Pontos (Opcional)</Label><TooltipProvider><Tooltip><TooltipTrigger asChild><Input id="maxPointsCap" type="number" placeholder="Sem limite" value={settings.maxPointsCap} onChange={handleInputChange} min="0" className="w-[120px]"/></TooltipTrigger><TooltipContent><p>Deixe em branco para não aplicar limite.</p></TooltipContent></Tooltip></TooltipProvider><p className="text-xs text-muted-foreground">Limite de pontos de desafios no ranking mensal.</p></div>
            </CardContent>
            <CardFooter><Button onClick={handleSaveSettings} disabled={isSaving}>{isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar</Button></CardFooter>
        </Card>
    );
};

export default function ChallengesPage() {
  return (
    <div className="space-y-6">
        <h1 className="text-3xl font-bold flex items-center gap-2"><Target className="h-7 w-7" /> Sistema de Desafios</h1>
        <p className="text-muted-foreground">Gerencie desafios, acompanhe progresso e avalie conquistas.</p>
      <Tabs defaultValue="manage" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 mb-4">
          <TabsTrigger value="manage"><Target className="mr-2 h-4 w-4"/>Gerenciar</TabsTrigger>
          <TabsTrigger value="dashboard"><LayoutDashboard className="mr-2 h-4 w-4"/>Dashboard</TabsTrigger>
          <TabsTrigger value="evaluate"><ClipboardCheck className="mr-2 h-4 w-4"/>Avaliar</TabsTrigger>
          <TabsTrigger value="history"><History className="mr-2 h-4 w-4"/>Histórico</TabsTrigger>
          <TabsTrigger value="settings"><Cog className="mr-2 h-4 w-4"/>Configurações</TabsTrigger>
        </TabsList>
        <TabsContent value="manage"><ManageChallenges /></TabsContent>
        <TabsContent value="dashboard"><ChallengeDashboard /></TabsContent>
        <TabsContent value="evaluate"><ChallengeEvaluation /></TabsContent>
        <TabsContent value="history"><ChallengeHistory /></TabsContent>
        <TabsContent value="settings"><ChallengeSettings /></TabsContent>
      </Tabs>
    </div>
  );
}
