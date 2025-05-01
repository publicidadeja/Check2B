
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
  CheckSquare, // Icon for evaluation
  CalendarClock, // Icon for history
  Users, // Icon for participants
  Award, // Icon for points
  Save,
  Upload,
  Link as LinkIcon,
  Archive, // For archiving
  CheckCircle, // For activating
  FileClock, // For exporting history
  BarChartHorizontal, // For status bar
  AlertTriangle, // For warning
  FileText, // For details
  Eye, // Added Eye icon
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
import type { Challenge, ChallengeParticipation } from '@/types/challenge'; // Import ChallengeParticipation
import { useToast } from '@/hooks/use-toast';
import { format, parseISO, differenceInDays, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator'; // Added Separator
import { Switch } from '@/components/ui/switch'; // Added Switch
import { ScrollArea } from '@/components/ui/scroll-area';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'; // Import Tooltip components
import { DataTable } from '@/components/ui/data-table'; // Import DataTable
import type { ColumnDef } from '@tanstack/react-table'; // Import ColumnDef
import { mockChallenges, mockParticipants, mockEmployeesSimple } from '@/lib/mockData/challenges'; // Import from new file

// --- Mock Data Definitions Removed ---

// --- Utility Functions ---

const getStatusText = (status: Challenge['status']): string => {
    const map: Record<Challenge['status'], string> = {
        active: 'Ativo',
        scheduled: 'Agendado',
        evaluating: 'Em Avaliação',
        completed: 'Concluído',
        draft: 'Rascunho',
        archived: 'Arquivado'
    };
    return map[status] || status;
}

const getStatusBadgeVariant = (status: Challenge['status']): "default" | "secondary" | "destructive" | "outline" => { // Removed custom variants
    const map: Record<Challenge['status'], "default" | "secondary" | "destructive" | "outline"> = {
        active: 'default',       // Use default (Teal accent) for active
        scheduled: 'secondary',  // Grey for scheduled
        evaluating: 'outline',   // Use outline for evaluating
        completed: 'secondary',    // Use secondary for completed
        draft: 'outline',        // Outline for draft
        archived: 'destructive', // Red for archived
    };
    return map[status] || 'outline';
}


// --- Mock API Functions ---
const fetchChallenges = async (): Promise<Challenge[]> => {
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
    console.log("Fetching challenges...");
    return [...mockChallenges]; // Return a copy to prevent mutation
};


const saveChallenge = async (challengeData: Omit<Challenge, 'id' | 'status'> | Challenge): Promise<Challenge> => {
    await new Promise(resolve => setTimeout(resolve, 600));
    if ('id' in challengeData && challengeData.id) {
        // Update existing challenge
        const index = mockChallenges.findIndex(c => c.id === challengeData.id);
        if (index !== -1) {
            mockChallenges[index] = { ...mockChallenges[index], ...challengeData };
            console.log("Challenge updated:", mockChallenges[index]);
            return mockChallenges[index];
        } else {
            throw new Error("Challenge not found for update.");
        }
    } else {
        // Create new challenge
        const newChallenge: Challenge = {
            id: `c${Date.now()}`, // Simple ID generation
            status: 'draft', // New challenges start as draft
            ...(challengeData as Omit<Challenge, 'id' | 'status'>), // Type assertion needed here
        };
        mockChallenges.push(newChallenge);
        console.log("New challenge created:", newChallenge);
        return newChallenge;
    }
};

const deleteChallenge = async (challengeId: string): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    const index = mockChallenges.findIndex(c => c.id === challengeId);
    if (index !== -1) {
         // Prevent deleting active or currently evaluating challenges
        if (['active', 'evaluating'].includes(mockChallenges[index].status)) {
            throw new Error("Não é possível remover um desafio ativo ou em avaliação.");
        }
        // Also remove related participation records (mock) - Make sure mockParticipants is mutable (let)
        let mutableMockParticipants = [...mockParticipants]; // Create a mutable copy
        mutableMockParticipants = mutableMockParticipants.filter(p => p.challengeId !== challengeId);
        // Note: This won't update the original exported mockParticipants unless handled differently.
        // For a real app, this deletion would happen in the backend/database.
        console.log("Participants filtered locally, length now:", mutableMockParticipants.length);

        mockChallenges.splice(index, 1);
        console.log("Challenge deleted:", challengeId);
    } else {
        throw new Error("Challenge not found for deletion.");
    }
};

const updateChallengeStatus = async (challengeId: string, status: Challenge['status']): Promise<Challenge> => {
     await new Promise(resolve => setTimeout(resolve, 400));
     const index = mockChallenges.findIndex(c => c.id === challengeId);
      if (index !== -1) {
         mockChallenges[index].status = status;
         // If completing, mark all pending participations as rejected (or handle differently)
         // Need to ensure mockParticipants can be modified here
         if (status === 'completed') {
             let mutableMockParticipants = [...mockParticipants];
             mutableMockParticipants = mutableMockParticipants.map(p =>
                 p.challengeId === challengeId && p.status === 'pending'
                     ? { ...p, status: 'rejected', feedback: 'Desafio concluído sem submissão.' }
                     : p
             );
             // See note in deleteChallenge about modifying exported data
             console.log("Participants status updated locally for completion.");
         }
         console.log("Challenge status updated:", mockChallenges[index]);
         return mockChallenges[index];
     } else {
         throw new Error("Challenge not found for status update.");
     }
}

const fetchParticipantsForChallenge = async (challengeId: string): Promise<ChallengeParticipation[]> => {
    await new Promise(resolve => setTimeout(resolve, 400));
    // Return all participants for the challenge, not just submitted ones, for history view
    return mockParticipants.filter(p => p.challengeId === challengeId);
}

const evaluateSubmission = async (participationId: string, status: 'approved' | 'rejected', score?: number, feedback?: string): Promise<ChallengeParticipation> => {
    await new Promise(resolve => setTimeout(resolve, 600));
    const index = mockParticipants.findIndex(p => p.id === participationId);
    if (index !== -1) {
        // Again, ensure mockParticipants is mutable if this should affect the global mock state
        mockParticipants[index].status = status;
        mockParticipants[index].score = score;
        mockParticipants[index].feedback = feedback;
        console.log("Avaliação salva:", mockParticipants[index]);
        return mockParticipants[index];
    } else {
        throw new Error("Participação não encontrada.");
    }
}

const fetchChallengeDetails = async (challengeId: string): Promise<{ challenge: Challenge, participants: ChallengeParticipation[] } | null> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    const challenge = mockChallenges.find(c => c.id === challengeId);
    if (!challenge) return null;
    const participants = await fetchParticipantsForChallenge(challengeId);
    return { challenge, participants };
}



// --- Component Sections ---

// ManageChallenges Component
const ManageChallenges = () => {
    const [challenges, setChallenges] = React.useState<Challenge[]>([]);
    const [filteredChallenges, setFilteredChallenges] = React.useState<Challenge[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [selectedChallenge, setSelectedChallenge] = React.useState<Challenge | null>(null);
    const [isFormOpen, setIsFormOpen] = React.useState(false);
    const [isDeleting, setIsDeleting] = React.useState(false);
    const [challengeToDelete, setChallengeToDelete] = React.useState<Challenge | null>(null);
    const { toast } = useToast();

    const loadChallenges = React.useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await fetchChallenges();
            setChallenges(data);
            setFilteredChallenges(data);
        } catch (error) {
            console.error("Falha ao carregar desafios:", error);
            toast({ title: "Erro", description: "Falha ao carregar desafios.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    React.useEffect(() => {
        loadChallenges();
    }, [loadChallenges]);


     const handleSaveChallenge = async (data: any) => {
         const challengeDataToSave = selectedChallenge
            ? { ...selectedChallenge, ...data, id: selectedChallenge.id }
            : data;

        setIsLoading(true);

        try {
            await saveChallenge(challengeDataToSave);
            setIsFormOpen(false);
            setSelectedChallenge(null);
            await loadChallenges();
            toast({
                title: "Sucesso!",
                description: `Desafio ${selectedChallenge ? 'atualizado' : 'criado'} com sucesso.`,
            });
        } catch (error) {
            console.error("Erro ao salvar desafio:", error);
            toast({
                title: "Erro!",
                description: `Falha ao ${selectedChallenge ? 'atualizar' : 'criar'} desafio. Tente novamente.`,
                variant: "destructive",
            });
        } finally {
             setIsLoading(false);
        }
    };


    const handleDeleteClick = (challenge: Challenge) => {
        setChallengeToDelete(challenge);
        setIsDeleting(true);
    };

     const confirmDelete = async () => {
        if (challengeToDelete) {
             setIsLoading(true);
            try {
                await deleteChallenge(challengeToDelete.id);
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
        const { id, title, status, ...challengeData } = challenge;
        const duplicatedChallengeData = {
            ...challengeData,
            title: `${title} (Cópia)`,
             eligibility: { ...challengeData.eligibility },
        };
         setIsLoading(true);
        try {
            await saveChallenge(duplicatedChallengeData as Omit<Challenge, 'id' | 'status'>);
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
          setIsLoading(true);
         try {
            await updateChallengeStatus(challenge.id, newStatus);
             toast({ title: "Sucesso", description: `Status do desafio "${challenge.title}" alterado para ${getStatusText(newStatus)}.` });
             await loadChallenges();
         } catch (error) {
             console.error("Falha ao alterar status:", error);
             toast({ title: "Erro", description: "Falha ao alterar status do desafio.", variant: "destructive" });
         } finally {
             setIsLoading(false);
         }
    }


    const openEditForm = (challenge: Challenge) => {
        setSelectedChallenge(challenge);
        setIsFormOpen(true);
    };

    const openAddForm = () => {
        setSelectedChallenge(null);
        setIsFormOpen(true);
    };


    const formatPeriod = (start: string, end: string) => {
        try {
            const startDate = parseISO(start);
            const endDate = parseISO(end);
            return `${format(startDate, 'dd/MM/yy', { locale: ptBR })} - ${format(endDate, 'dd/MM/yy', { locale: ptBR })}`;
        } catch (error) {
            console.error("Error formatting date:", error);
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
                             {/* Simplified Status Flow: Scheduled -> Active -> Evaluating -> Completed -> Archived */}
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
                             {/* Re-activate is complex, requires checking dates etc. Omitted for now. */}
                             {/* {(challenge.status === 'completed' || challenge.status === 'archived') && ( ... re-activate logic ... )} */}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                onClick={() => handleDeleteClick(challenge)}
                                className="text-destructive focus:text-destructive focus:bg-destructive/10"
                                // Allow deleting draft, scheduled, completed, archived
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


    return (
        <Card>
            <CardHeader>
                <CardTitle>Gerenciar Desafios</CardTitle>
                <CardDescription>Crie, edite, duplique e controle o ciclo de vida dos desafios.</CardDescription>
            </CardHeader>
            <CardContent>
                 {isLoading ? (
                     <div className="flex justify-center items-center py-10">
                        <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
                     </div>
                 ) : (
                    <DataTable
                        columns={columns}
                        data={challenges} // Use the state which is loaded
                        filterColumn="title"
                        filterPlaceholder="Buscar por título, categoria, status..."
                    />
                 )}
            </CardContent>
             <CardFooter className="flex justify-end">
                    <Button onClick={openAddForm}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Criar Novo Desafio
                    </Button>
             </CardFooter>


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
                        Tem certeza que deseja remover o desafio "{challengeToDelete?.title}"? Esta ação removerá também as participações associadas e não pode ser desfeita. Desafios ativos ou em avaliação não podem ser removidos.
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


// Placeholder component - Replace with actual implementation
const ChallengeDashboard = () => {
    const [challenges, setChallenges] = React.useState<Challenge[]>([]);
    const [participations, setParticipations] = React.useState<ChallengeParticipation[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const { toast } = useToast();

     React.useEffect(() => {
        const loadData = async () => {
             setIsLoading(true);
             try {
                const [challengeData, participationData] = await Promise.all([
                     fetchChallenges(),
                     Promise.resolve(mockParticipants) // Fetch all participants for calculation
                ]);
                setChallenges(challengeData);
                setParticipations(participationData);
            } catch (error) {
                 console.error("Falha ao carregar dados do dashboard:", error);
                 toast({ title: "Erro", description: "Falha ao carregar dados do dashboard.", variant: "destructive" });
            } finally {
                 setIsLoading(false);
            }
        };
        loadData();
    }, [toast]);

     const activeChallenges = challenges.filter(c => c.status === 'active');
     const pendingSubmissions = participations.filter(p => p.status === 'submitted').length;
     const evaluatedSubmissions = participations.filter(p => ['approved', 'rejected'].includes(p.status));
     const approvedSubmissions = evaluatedSubmissions.filter(p => p.status === 'approved').length;
     const completionRate = evaluatedSubmissions.length > 0
        ? `${((approvedSubmissions / evaluatedSubmissions.length) * 100).toFixed(0)}%`
        : 'N/A';


    return (
      <Card>
        <CardHeader>
          <CardTitle>Dashboard de Desafios</CardTitle>
          <CardDescription>Visão geral do programa de desafios.</CardDescription>
        </CardHeader>
         <CardContent>
            {isLoading ? (
                <div className="flex justify-center items-center py-10">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
             ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardDescription>Desafios Ativos</CardDescription>
                            <CardTitle className="text-3xl">{activeChallenges.length}</CardTitle>
                        </CardHeader>
                         <CardContent><p className="text-xs text-muted-foreground">Desafios em andamento no período atual.</p></CardContent>
                    </Card>
                     <Card>
                        <CardHeader className="pb-2">
                            <CardDescription>Submissões Pendentes</CardDescription>
                             <CardTitle className="text-3xl">{pendingSubmissions}</CardTitle>
                        </CardHeader>
                         <CardContent><p className="text-xs text-muted-foreground">Participações aguardando avaliação.</p></CardContent>
                    </Card>
                     <Card>
                        <CardHeader className="pb-2">
                            <CardDescription>Taxa de Conclusão Média</CardDescription>
                            <CardTitle className="text-3xl">{completionRate}</CardTitle>
                        </CardHeader>
                         <CardContent><p className="text-xs text-muted-foreground">Média de sucesso (aprovações / avaliadas).</p></CardContent>
                    </Card>
                </div>
             )}
             <div className="mt-6 text-center text-muted-foreground">
                  (Gráficos e relatórios detalhados serão implementados aqui)
              </div>
        </CardContent>
        <CardFooter>
            <Button variant="outline" disabled>Ver Relatórios Detalhados</Button>
        </CardFooter>
      </Card>
    );
};

const ChallengeEvaluation = () => {
    const [challengesToEvaluate, setChallengesToEvaluate] = React.useState<Challenge[]>([]);
    const [selectedChallengeId, setSelectedChallengeId] = React.useState<string | null>(null);
    const [participants, setParticipants] = React.useState<ChallengeParticipation[]>([]);
    const [isLoadingChallenges, setIsLoadingChallenges] = React.useState(true);
    const [isLoadingParticipants, setIsLoadingParticipants] = React.useState(false);
    const [currentEvaluation, setCurrentEvaluation] = React.useState<{ [key: string]: { status: 'approved' | 'rejected' | 'pending', feedback: string, score?: number, isSaving: boolean } }>({});
    const { toast } = useToast();

    React.useEffect(() => {
        const fetchEvaluableChallenges = async () => {
            setIsLoadingChallenges(true);
            try {
                const allChallenges = await fetchChallenges();
                 setChallengesToEvaluate(allChallenges.filter(c => c.status === 'evaluating'));
            } catch {
                 toast({ title: "Erro", description: "Falha ao carregar desafios para avaliação.", variant: "destructive" });
            } finally {
                 setIsLoadingChallenges(false);
            }
        };
        fetchEvaluableChallenges();
    }, [toast]);

     React.useEffect(() => {
        if (selectedChallengeId) {
            const fetchParticipants = async () => {
                setIsLoadingParticipants(true);
                setCurrentEvaluation({});
                try {
                    const participantsData = await fetchParticipantsForChallenge(selectedChallengeId);
                     // Only show submitted participants for evaluation
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
    }, [selectedChallengeId, toast]);

     const handleEvaluationChange = (participantId: string, field: 'status' | 'feedback' | 'score', value: any) => {
        setCurrentEvaluation(prev => ({
            ...prev,
            [participantId]: {
                ...(prev[participantId] || { status: 'pending', feedback: '', isSaving: false }),
                [field]: value,
                // Auto-set score to 0 if rejected, or default to challenge points if approved and score is not yet set
                ...(field === 'status' && value === 'rejected' && { score: 0 }),
                 ...(field === 'status' && value === 'approved' && prev[participantId]?.score === undefined && { score: challengesToEvaluate.find(c => c.id === selectedChallengeId)?.points || 0 })
            }
        }));
    };

    const handleSaveEvaluation = async (participantId: string) => {
        const evaluationData = currentEvaluation[participantId];
        const participant = participants.find(p => p.id === participantId);
        const challenge = challengesToEvaluate.find(c => c.id === selectedChallengeId);

        if (!evaluationData || !participant || !challenge) return;

         if (evaluationData.status === 'pending') {
            toast({ title: "Atenção", description: "Selecione 'Aprovado' ou 'Rejeitado' antes de salvar.", variant: "destructive" });
            return;
        }
         if (evaluationData.status === 'rejected' && !evaluationData.feedback?.trim()) {
            toast({ title: "Atenção", description: "Forneça um feedback ao rejeitar a submissão.", variant: "destructive" });
            return;
         }

         setCurrentEvaluation(prev => ({ ...prev, [participantId]: { ...evaluationData, isSaving: true } }));

        try {
             const finalScore = evaluationData.status === 'approved' ? (evaluationData.score ?? challenge.points) : 0;
             await evaluateSubmission(participantId, evaluationData.status, finalScore, evaluationData.feedback);
             toast({ title: "Sucesso", description: `Avaliação para ${participant.employeeName} salva.` });

             // Remove participant from the list after saving
             setParticipants(prev => prev.filter(p => p.id !== participantId));
             setCurrentEvaluation(prev => {
                 const newState = { ...prev };
                 delete newState[participantId];
                 return newState;
             });

             // Optional: Check if all participants are evaluated and update challenge status
             if (participants.length === 1) { // Check if this was the last one
                 toast({ title: "Concluído", description: `Todas as submissões para "${challenge.title}" foram avaliadas.` });
                 // Consider automatically changing challenge status to 'completed'
                 // await updateChallengeStatus(challenge.id, 'completed');
             }

        } catch (error) {
             console.error("Falha ao salvar avaliação:", error);
             toast({ title: "Erro", description: "Falha ao salvar avaliação.", variant: "destructive" });
             // Reset saving state for this participant only on error
             setCurrentEvaluation(prev => ({ ...prev, [participantId]: { ...evaluationData, isSaving: false } }));
        }
    };


    const selectedChallenge = challengesToEvaluate.find(c => c.id === selectedChallengeId);

    return (
        <Card>
            <CardHeader>
            <CardTitle className="flex items-center gap-2"><CheckSquare className="h-5 w-5"/> Avaliação de Desafios</CardTitle>
            <CardDescription>Avalie as submissões dos desafios que estão no status "Em Avaliação".</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                    <Label htmlFor="challenge-select">Selecione o Desafio:</Label>
                    <Select
                        value={selectedChallengeId || ''}
                        onValueChange={setSelectedChallengeId}
                        disabled={isLoadingChallenges}
                    >
                        <SelectTrigger id="challenge-select" className="w-full md:w-[300px]">
                            <SelectValue placeholder={isLoadingChallenges ? "Carregando..." : "Selecione um desafio"} />
                        </SelectTrigger>
                        <SelectContent>
                             {isLoadingChallenges ? (
                                 <SelectItem value="loading" disabled>Carregando...</SelectItem>
                             ) : challengesToEvaluate.length === 0 ? (
                                <SelectItem value="no-challenges" disabled>Nenhum desafio em avaliação</SelectItem>
                             ) : (
                                challengesToEvaluate.map(challenge => (
                                    <SelectItem key={challenge.id} value={challenge.id}>
                                        {challenge.title} ({format(parseISO(challenge.periodEndDate), 'dd/MM/yy')}) - {getStatusText(challenge.status)}
                                    </SelectItem>
                                ))
                             )}
                        </SelectContent>
                    </Select>
                </div>

                {selectedChallengeId && (
                    <div className="mt-4 border rounded-md p-4">
                         <h3 className="font-semibold mb-3">Avaliar Participantes de: "{selectedChallenge?.title}"</h3>
                         <p className="text-sm text-muted-foreground mb-4">Critérios: {selectedChallenge?.evaluationMetrics}</p>
                         <Separator className="mb-4" />

                        {isLoadingParticipants ? (
                            <div className="text-center py-6"><Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" /> Carregando participantes...</div>
                        ) : participants.length === 0 ? (
                            <p className="text-muted-foreground text-center py-4">Nenhuma submissão pendente para este desafio.</p>
                        ) : (
                            <ScrollArea className="h-[45vh]"> {/* Limit height and make scrollable */}
                                <div className="space-y-4 pr-4"> {/* Add padding for scrollbar */}
                                    {participants.map(participant => (
                                        <Card key={participant.id} className="bg-muted/50">
                                            <CardHeader className="pb-2 pt-3 px-4">
                                                <CardTitle className="text-base flex justify-between items-center">
                                                    {participant.employeeName}
                                                    <span className="text-xs text-muted-foreground font-normal">
                                                        Enviado em: {participant.submittedAt ? format(participant.submittedAt, 'dd/MM/yy HH:mm', { locale: ptBR }) : '-'}
                                                    </span>
                                                </CardTitle>
                                                <CardDescription className="text-sm pt-1">
                                                    <strong>Submissão:</strong>{' '}
                                                    {participant.submission?.startsWith('http') ? (
                                                        <a href={participant.submission} target="_blank" rel="noopener noreferrer" className="text-accent underline hover:text-accent/80">
                                                            <LinkIcon className="inline-block h-3 w-3 mr-1" /> Abrir Link
                                                        </a>
                                                    ) : (
                                                        participant.submission || <span className="italic text-muted-foreground">Nenhuma descrição fornecida.</span>
                                                    )}
                                                </CardDescription>
                                            </CardHeader>
                                            <CardContent className="px-4 pb-3 space-y-2">
                                                <div className="flex flex-col md:flex-row gap-2 items-start md:items-center">
                                                    {/* Evaluation Controls */}
                                                    <div className='flex-shrink-0'>
                                                        <Label className="text-xs">Resultado:</Label>
                                                        <Select
                                                            value={currentEvaluation[participant.id]?.status || 'pending'}
                                                            onValueChange={(value: 'approved' | 'rejected') => handleEvaluationChange(participant.id, 'status', value)}
                                                            disabled={currentEvaluation[participant.id]?.isSaving}
                                                        >
                                                            <SelectTrigger className="h-9 w-full md:w-[120px]">
                                                                <SelectValue placeholder="Avaliar..." />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="approved">Aprovado</SelectItem>
                                                                <SelectItem value="rejected">Rejeitado</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    {currentEvaluation[participant.id]?.status === 'approved' && (
                                                        <div className='flex-shrink-0'>
                                                            <Label htmlFor={`score-${participant.id}`} className="text-xs">Pontos:</Label>
                                                            <Input
                                                                id={`score-${participant.id}`}
                                                                type="number"
                                                                className="h-9 w-[80px]"
                                                                value={currentEvaluation[participant.id]?.score ?? ''}
                                                                onChange={(e) => handleEvaluationChange(participant.id, 'score', e.target.value ? parseInt(e.target.value) : undefined)}
                                                                placeholder={selectedChallenge?.points.toString()}
                                                                min="0"
                                                                max={selectedChallenge?.points}
                                                                disabled={currentEvaluation[participant.id]?.isSaving}
                                                            />
                                                        </div>
                                                    )}
                                                    <div className='flex-1 min-w-0'>
                                                        <Label htmlFor={`feedback-${participant.id}`} className="text-xs">Feedback {currentEvaluation[participant.id]?.status === 'rejected' ? '(Obrigatório)' : '(Opcional)'}:</Label>
                                                        <Textarea
                                                            id={`feedback-${participant.id}`}
                                                            placeholder="Feedback para o colaborador..."
                                                            className="min-h-[40px] text-sm"
                                                            value={currentEvaluation[participant.id]?.feedback || ''}
                                                            onChange={(e) => handleEvaluationChange(participant.id, 'feedback', e.target.value)}
                                                            required={currentEvaluation[participant.id]?.status === 'rejected'}
                                                            disabled={currentEvaluation[participant.id]?.isSaving}
                                                        />
                                                    </div>
                                                    {/* Save Button */}
                                                    <Button
                                                        size="sm"
                                                        className="mt-4 md:mt-5 self-end md:self-center" // Adjust margin for alignment
                                                        onClick={() => handleSaveEvaluation(participant.id)}
                                                        disabled={!currentEvaluation[participant.id] || currentEvaluation[participant.id].status === 'pending' || currentEvaluation[participant.id].isSaving}
                                                    >
                                                        {currentEvaluation[participant.id]?.isSaving ? (
                                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                        ) : (
                                                            <Save className="mr-2 h-4 w-4" />
                                                        )}
                                                        {currentEvaluation[participant.id]?.isSaving ? 'Salvando...' : 'Salvar Avaliação'}
                                                    </Button>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </ScrollArea>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};


// --- Challenge Details Dialog ---
interface ChallengeDetailsDialogProps {
    challengeId: string | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const ChallengeDetailsDialog = ({ challengeId, open, onOpenChange }: ChallengeDetailsDialogProps) => {
    const [details, setDetails] = React.useState<{ challenge: Challenge, participants: ChallengeParticipation[] } | null>(null);
    const [isLoading, setIsLoading] = React.useState(false);

    React.useEffect(() => {
        if (open && challengeId) {
            const loadDetails = async () => {
                setIsLoading(true);
                try {
                    const data = await fetchChallengeDetails(challengeId);
                    setDetails(data);
                } catch (error) {
                    console.error("Failed to load challenge details:", error);
                } finally {
                    setIsLoading(false);
                }
            };
            loadDetails();
        } else {
            setDetails(null);
        }
    }, [open, challengeId]);

    const getParticipantStatusText = (status: ChallengeParticipation['status']): string => {
        const map = { pending: 'Pendente', submitted: 'Enviado', approved: 'Aprovado', rejected: 'Rejeitado' };
        return map[status] || status;
    }

     const getSafeParticipantStatusVariant = (status: ChallengeParticipation['status']): "default" | "secondary" | "destructive" | "outline" => {
        const map = { pending: 'outline', submitted: 'outline', approved: 'default', rejected: 'destructive' };
        return map[status] || 'outline';
    }


    return (
         <Dialog open={open} onOpenChange={onOpenChange}>
             <DialogContent className="sm:max-w-3xl">
                 <DialogHeader>
                     <DialogTitle>Detalhes do Desafio: {details?.challenge.title ?? 'Carregando...'}</DialogTitle>
                     <DialogDescription>
                         Resultados e participantes do desafio selecionado.
                     </DialogDescription>
                 </DialogHeader>
                {isLoading ? (
                     <div className="flex justify-center items-center py-10">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                     </div>
                 ) : details ? (
                     <div className="py-4 grid grid-cols-1 md:grid-cols-3 gap-4 max-h-[60vh] overflow-y-auto"> {/* Limit height */}
                         {/* Challenge Info */}
                         <div className="md:col-span-1 space-y-3 border-r pr-4">
                            <h4 className="font-semibold text-base">Informações do Desafio</h4>
                             <p className="text-sm"><strong className="text-muted-foreground">Status:</strong> <Badge variant={getStatusBadgeVariant(details.challenge.status)}>{getStatusText(details.challenge.status)}</Badge></p>
                             <p className="text-sm"><strong className="text-muted-foreground">Período:</strong> {format(parseISO(details.challenge.periodStartDate), 'dd/MM/yy')} - {format(parseISO(details.challenge.periodEndDate), 'dd/MM/yy')}</p>
                             <p className="text-sm"><strong className="text-muted-foreground">Pontos:</strong> {details.challenge.points}</p>
                             <p className="text-sm"><strong className="text-muted-foreground">Dificuldade:</strong> {details.challenge.difficulty}</p>
                             <p className="text-sm"><strong className="text-muted-foreground">Participação:</strong> {details.challenge.participationType}</p>
                             <p className="text-sm"><strong className="text-muted-foreground">Elegibilidade:</strong> {details.challenge.eligibility.type === 'all' ? 'Todos' : `${details.challenge.eligibility.type}: ${details.challenge.eligibility.entityIds?.join(', ')}`}</p>
                             <p className="text-sm"><strong className="text-muted-foreground">Métricas:</strong> {details.challenge.evaluationMetrics}</p>
                         </div>
                          {/* Participants Table */}
                         <div className="md:col-span-2 space-y-3">
                            <h4 className="font-semibold text-base">Participantes ({details.participants.length})</h4>
                             {details.participants.length > 0 ? (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Colaborador</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Pontos</TableHead>
                                            <TableHead>Feedback</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                         {details.participants.map(p => (
                                                <TableRow key={p.id}>
                                                    <TableCell className="font-medium">{p.employeeName}</TableCell>
                                                    <TableCell><Badge variant={getSafeParticipantStatusVariant(p.status)}>{getParticipantStatusText(p.status)}</Badge></TableCell>
                                                    <TableCell className="text-center">{p.score ?? '-'}</TableCell>
                                                    <TableCell className="text-xs max-w-[200px] truncate" title={p.feedback}>{p.feedback || '-'}</TableCell>
                                                </TableRow>
                                             ))
                                        }
                                    </TableBody>
                                </Table>
                             ) : (
                                <p className="text-center text-muted-foreground py-4">Nenhum participante registrado para este desafio.</p>
                             )}
                         </div>
                     </div>
                 ) : (
                     <p className="text-center text-muted-foreground py-10">Não foi possível carregar os detalhes.</p>
                 )}
                 <DialogFooter>
                    <DialogClose asChild>
                        <Button type="button" variant="secondary">Fechar</Button>
                    </DialogClose>
                </DialogFooter>
             </DialogContent>
         </Dialog>
    );
}


const ChallengeHistory = () => {
     const [historyChallenges, setHistoryChallenges] = React.useState<Challenge[]>([]);
     const [isLoading, setIsLoading] = React.useState(true);
     const [selectedChallengeIdForDetails, setSelectedChallengeIdForDetails] = React.useState<string | null>(null);
     const [isDetailsOpen, setIsDetailsOpen] = React.useState(false);
     const { toast } = useToast();

     React.useEffect(() => {
        const fetchHistory = async () => {
            setIsLoading(true);
            try {
                const allChallenges = await fetchChallenges();
                // Show challenges that are completed, archived, or evaluating in history
                setHistoryChallenges(allChallenges.filter(c => ['completed', 'archived', 'evaluating'].includes(c.status))
                                            .sort((a, b) => parseISO(b.periodEndDate).getTime() - parseISO(a.periodEndDate).getTime()) // Sort by end date desc
                                            );
            } catch (error) {
                 console.error("Failed to load challenge history:", error);
                 toast({ title: "Erro", description: "Falha ao carregar histórico de desafios.", variant: "destructive" });
            } finally {
                setIsLoading(false);
            }
        };
        fetchHistory();
    }, [toast]);


    const getParticipantSummary = (challengeId: string) => {
         // Use current mockParticipants for summary (replace with fetched data if needed)
         const challengeParticipants = mockParticipants.filter(p => p.challengeId === challengeId);
        const totalParticipants = challengeParticipants.length;
         const evaluated = challengeParticipants.filter(p => ['approved', 'rejected'].includes(p.status)).length;
         const approved = challengeParticipants.filter(p => p.status === 'approved').length;
         // Estimate eligible (might need better logic if complex eligibility exists)
         const eligibleEmployees = mockEmployeesSimple.filter(emp => {
              const challenge = mockChallenges.find(c => c.id === challengeId);
              if (!challenge) return false;
              if (challenge.eligibility.type === 'all') return true;
              if (challenge.eligibility.type === 'department' && challenge.eligibility.entityIds?.includes(emp.department)) return true;
              if (challenge.eligibility.type === 'role' && challenge.eligibility.entityIds?.includes(emp.role)) return true;
              if (challenge.eligibility.type === 'individual' && challenge.eligibility.entityIds?.includes(emp.id)) return true;
              return false;
         }).length;

         if (eligibleEmployees === 0) return "N/A (Sem Elegíveis)";
         if (totalParticipants === 0 && eligibleEmployees > 0) return "0/0 (Sem Participações)";
         if (totalParticipants === 0) return "N/A"; // No eligible or participants

        return `${approved}/${evaluated} Aprovados (${totalParticipants} Partic.)`;
    }

     const handleExportHistory = () => {
        if (historyChallenges.length === 0) {
            toast({ title: "Atenção", description: "Não há histórico para exportar.", variant: "destructive"});
            return;
        }

        // Prepare CSV content
        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += "ID Desafio,Título,Data Início,Data Fim,Pontos,Status,Resumo Participantes\n"; // Header row

        historyChallenges.forEach(challenge => {
            const row = [
                challenge.id,
                `"${challenge.title.replace(/"/g, '""')}"`, // Escape quotes
                challenge.periodStartDate,
                challenge.periodEndDate,
                challenge.points,
                getStatusText(challenge.status),
                `"${getParticipantSummary(challenge.id)}"` // Wrap summary in quotes
            ].join(",");
            csvContent += row + "\n";
        });

        // Create and trigger download link
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `historico_desafios_${format(new Date(), 'yyyyMMdd')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast({ title: "Sucesso", description: "Histórico exportado como CSV." });
    }

    const openDetails = (challengeId: string) => {
        setSelectedChallengeIdForDetails(challengeId);
        setIsDetailsOpen(true);
    }

     // Columns for the History DataTable
     const historyColumns: ColumnDef<Challenge>[] = [
        { accessorKey: "title", header: "Título", cell: ({ row }) => <span className="font-medium">{row.original.title}</span> },
        { accessorKey: "period", header: "Período", cell: ({ row }) => `${format(parseISO(row.original.periodStartDate), 'dd/MM/yy')} - ${format(parseISO(row.original.periodEndDate), 'dd/MM/yy')}` },
        { accessorKey: "points", header: () => <div className="text-center">Pontos</div>, cell: ({ row }) => <div className="text-center">{row.original.points}</div>, size: 80, },
        { accessorKey: "status", header: "Status", cell: ({ row }) => <Badge variant={getStatusBadgeVariant(row.original.status)}>{getStatusText(row.original.status)}</Badge> },
        { header: () => <div className="text-center"><Users className="inline-block mr-1 h-4 w-4"/>Resultados</div>, cell: ({ row }) => <div className="text-center text-xs">{getParticipantSummary(row.original.id)}</div> },
        {
            id: "details",
            header: () => <div className="text-right">Detalhes</div>,
            cell: ({ row }) => (
                <div className="text-right">
                    <Button variant="outline" size="sm" onClick={() => openDetails(row.original.id)}>
                        <Eye className="mr-1 h-3 w-3" /> Ver Detalhes {/* Changed Icon */}
                    </Button>
                </div>
            ),
            size: 120,
        },
    ];


    return (
        <Card>
            <CardHeader>
            <CardTitle className="flex items-center gap-2"><CalendarClock className="h-5 w-5"/> Histórico de Desafios</CardTitle>
            <CardDescription>Consulte desafios passados e seus resultados.</CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="text-center py-10"><Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" /></div>
                 ) : historyChallenges.length === 0 ? (
                     <p className="text-muted-foreground text-center py-5">Nenhum desafio no histórico.</p>
                ) : (
                     <DataTable columns={historyColumns} data={historyChallenges} filterColumn='title' filterPlaceholder='Buscar histórico...' />
                )}
            </CardContent>
            <CardFooter>
                <Button variant="outline" onClick={handleExportHistory} disabled={isLoading || historyChallenges.length === 0}>
                    <FileClock className="mr-2 h-4 w-4" /> Exportar Histórico
                </Button>
            </CardFooter>
            {/* Dialog for displaying details */}
            <ChallengeDetailsDialog
                challengeId={selectedChallengeIdForDetails}
                open={isDetailsOpen}
                onOpenChange={setIsDetailsOpen}
            />
        </Card>
    );
};


// Settings Component (Functional)
const ChallengeSettings = () => {
    const { toast } = useToast();
    const [isSaving, setIsSaving] = React.useState(false);
    // Example settings state - Load initial values from API/storage
    const [settings, setSettings] = React.useState({
        rankingFactor: 1.0,
        enableGamification: false, // Example: Toggle for badges/levels
        maxPointsCap: '', // Example: Monthly cap for challenge points
        defaultParticipation: 'Opcional', // Default when creating new challenges
        // Add more settings as needed
    });

     React.useEffect(() => {
         // TODO: Fetch current settings from backend on load
         const loadSettings = async () => {
             console.log("Loading challenge settings (simulated)...");
             await new Promise(resolve => setTimeout(resolve, 500));
             // Example: setSettings(fetchedSettings);
             console.log("Settings loaded (simulated)");
         };
         loadSettings();
     }, []);


    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value, type } = e.target;
         // Handle number input specifically, allowing empty string for optional fields
         const newValue = type === 'number'
            ? (value === '' ? '' : parseFloat(value)) // Keep empty string or parse float
            : value;

        setSettings(prev => ({
            ...prev,
            [id]: newValue
        }));
    };

    const handleSwitchChange = (checked: boolean) => {
        setSettings(prev => ({ ...prev, enableGamification: checked }));
    };

     const handleSelectChange = (value: string) => {
        setSettings(prev => ({ ...prev, defaultParticipation: value }));
    };


    const handleSaveSettings = async () => {
         setIsSaving(true);
         console.log("Saving challenge settings:", settings);
         // TODO: Send settings to backend API for persistence
         await new Promise(resolve => setTimeout(resolve, 800)); // Simulate API call
         toast({ title: "Sucesso", description: "Configurações de desafios salvas." });
         setIsSaving(false);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Cog className="h-5 w-5" /> Configurações dos Desafios</CardTitle>
                <CardDescription>Ajuste as regras gerais e integração dos desafios com o sistema.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Ranking Factor Setting */}
                <div className="space-y-2">
                    <Label htmlFor="rankingFactor">Fator de Ponderação no Ranking</Label>
                    <Input
                        id="rankingFactor"
                        type="number"
                        value={settings.rankingFactor}
                        onChange={handleInputChange}
                        step="0.1" min="0" max="2" className="w-[100px]"
                    />
                    <p className="text-xs text-muted-foreground">Multiplicador para pontos de desafios ao calcular o ranking final (Ex: 1.0 = peso igual; 0.5 = metade do peso).</p>
                </div>
                <Separator />
                 {/* Default Participation Type */}
                 <div className="space-y-2">
                     <Label htmlFor="defaultParticipation">Participação Padrão (ao criar)</Label>
                     <Select value={settings.defaultParticipation} onValueChange={handleSelectChange}>
                         <SelectTrigger id="defaultParticipation" className="w-[180px]">
                             <SelectValue />
                         </SelectTrigger>
                         <SelectContent>
                             <SelectItem value="Opcional">Opcional</SelectItem>
                             <SelectItem value="Obrigatório">Obrigatório</SelectItem>
                         </SelectContent>
                     </Select>
                    <p className="text-xs text-muted-foreground">Define o tipo de participação selecionado por padrão ao criar um novo desafio.</p>
                 </div>
                 <Separator />
                 {/* Gamification Toggle */}
                 <div className="flex items-center space-x-2">
                    <Switch id="enableGamification" checked={settings.enableGamification} onCheckedChange={handleSwitchChange} />
                    <Label htmlFor="enableGamification" className="text-sm font-normal">Habilitar Emblemas e Conquistas (Gamificação)</Label>
                 </div>
                <p className="text-xs text-muted-foreground -mt-4 pl-8">Ativa recursos adicionais de gamificação relacionados a desafios (requer implementação).</p>
                 <Separator />
                 {/* Max Points Cap Setting */}
                <div className="space-y-2">
                    <Label htmlFor="maxPointsCap">Teto Máximo de Pontos de Desafios por Mês (Opcional)</Label>
                     <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Input
                                    id="maxPointsCap"
                                    type="number"
                                    placeholder="Sem limite"
                                    value={settings.maxPointsCap}
                                    onChange={handleInputChange}
                                    min="0" className="w-[120px]"
                                />
                             </TooltipTrigger>
                            <TooltipContent>
                                <p>Deixe em branco para não aplicar limite.</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                    <p className="text-xs text-muted-foreground">Limite máximo de pontos de desafios que podem contar para o ranking em um único mês.</p>
                </div>
                {/* Add more settings here as needed */}
            </CardContent>
            <CardFooter>
                <Button onClick={handleSaveSettings} disabled={isSaving}>
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isSaving ? 'Salvando...' : 'Salvar Configurações'}
                </Button>
            </CardFooter>
        </Card>
    );
};


// Main Page Component
export default function ChallengesPage() {
  return (
    <div className="space-y-6"> {/* Added container */}
        <h1 className="text-3xl font-bold flex items-center gap-2">
             <Target className="h-7 w-7" /> Sistema de Desafios
        </h1>
        <p className="text-muted-foreground">
            Gerencie o sistema de desafios, acompanhe o progresso e avalie as conquistas dos colaboradores.
        </p>

      <Tabs defaultValue="manage" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 mb-4">
          <TabsTrigger value="manage"><Target className="mr-2 h-4 w-4"/>Gerenciar</TabsTrigger>
          <TabsTrigger value="dashboard"><LayoutDashboard className="mr-2 h-4 w-4"/>Dashboard</TabsTrigger>
          <TabsTrigger value="evaluate"><ClipboardCheck className="mr-2 h-4 w-4"/>Avaliar</TabsTrigger>
          <TabsTrigger value="history"><History className="mr-2 h-4 w-4"/>Histórico</TabsTrigger>
          <TabsTrigger value="settings"><Cog className="mr-2 h-4 w-4"/>Configurações</TabsTrigger>
        </TabsList>

        <TabsContent value="manage">
          <ManageChallenges />
        </TabsContent>
        <TabsContent value="dashboard">
          <ChallengeDashboard />
        </TabsContent>
        <TabsContent value="evaluate">
           <ChallengeEvaluation />
        </TabsContent>
        <TabsContent value="history">
          <ChallengeHistory />
        </TabsContent>
         <TabsContent value="settings">
           <ChallengeSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}
