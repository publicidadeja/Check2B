
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
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ChallengeForm } from '@/components/challenge/challenge-form';
import type { Challenge } from '@/types/challenge';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator'; // Added Separator
import { Switch } from '@/components/ui/switch'; // Added Switch

// --- Mock Data ---
const mockChallenges: Challenge[] = [
    { id: 'c1', title: 'Engajamento Total', description: 'Participar de todas as reuniões da semana e enviar resumo.', category: 'Comunicação', periodStartDate: '2024-08-05', periodEndDate: '2024-08-09', points: 50, difficulty: 'Médio', participationType: 'Opcional', eligibility: { type: 'all' }, evaluationMetrics: 'Presença confirmada e resumo enviado', status: 'completed' },
    { id: 'c2', title: 'Zero Bugs Críticos', description: 'Entregar a feature X sem nenhum bug crítico reportado na primeira semana.', category: 'Qualidade', periodStartDate: '2024-08-12', periodEndDate: '2024-08-16', points: 150, difficulty: 'Difícil', participationType: 'Obrigatório', eligibility: { type: 'department', entityIds: ['Engenharia'] }, evaluationMetrics: 'Relatório de QA e Jira', status: 'active' },
    { id: 'c3', title: 'Semana da Documentação', description: 'Documentar todas as APIs desenvolvidas no período.', category: 'Documentação', periodStartDate: '2024-08-19', periodEndDate: '2024-08-23', points: 75, difficulty: 'Médio', participationType: 'Obrigatório', eligibility: { type: 'role', entityIds: ['Desenvolvedor Backend', 'Desenvolvedora Frontend'] }, evaluationMetrics: 'Links para documentação no Confluence', status: 'scheduled' },
    { id: 'c4', title: 'Feedback 360 Completo', description: 'Enviar feedback para todos os colegas designados.', category: 'Colaboração', periodStartDate: '2024-07-29', periodEndDate: '2024-08-02', points: 30, difficulty: 'Fácil', participationType: 'Obrigatório', eligibility: { type: 'all' }, evaluationMetrics: 'Confirmação no sistema de RH', status: 'evaluating' },
     { id: 'c5', title: 'Ideia Inovadora (Rascunho)', description: 'Propor uma melhoria significativa em algum processo.', category: 'Inovação', periodStartDate: '2024-09-02', periodEndDate: '2024-09-06', points: 100, difficulty: 'Médio', participationType: 'Opcional', eligibility: { type: 'all' }, evaluationMetrics: 'Apresentação da ideia e avaliação do comitê', status: 'draft' },
];

// Mock participation data (replace with actual fetching/relation)
interface ChallengeParticipation {
    id: string;
    challengeId: string;
    employeeId: string;
    employeeName: string; // For display
    submission?: string; // Link or text description
    submittedAt?: Date;
    status: 'pending' | 'submitted' | 'approved' | 'rejected';
    score?: number; // Score given if approved
    feedback?: string;
}

const mockParticipants: ChallengeParticipation[] = [
    { id: 'p1', challengeId: 'c3', employeeId: '2', employeeName: 'Beto Santos', status: 'submitted', submission: 'Links dos PRs: ...', submittedAt: new Date(2024, 7, 17) },
    { id: 'p2', challengeId: 'c3', employeeId: '5', employeeName: 'Eva Pereira', status: 'submitted', submission: 'Links: ...', submittedAt: new Date(2024, 7, 18) },
    { id: 'p3', challengeId: 'c1', employeeId: '4', employeeName: 'Davi Costa', status: 'pending' },
    { id: 'p4', challengeId: 'c4', employeeId: '1', employeeName: 'Alice Silva', status: 'submitted', submission: 'Feedbacks enviados via sistema', submittedAt: new Date(2024, 8, 1) }, // Corrected month (August = 7)
];

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
            ...(challengeData as Omit<Challenge, 'id'>), // Type assertion needed here
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
         console.log("Challenge status updated:", mockChallenges[index]);
         return mockChallenges[index];
     } else {
         throw new Error("Challenge not found for status update.");
     }
}

const fetchParticipantsForChallenge = async (challengeId: string): Promise<ChallengeParticipation[]> => {
    await new Promise(resolve => setTimeout(resolve, 400));
    return mockParticipants.filter(p => p.challengeId === challengeId);
}

const evaluateSubmission = async (participationId: string, status: 'approved' | 'rejected', score?: number, feedback?: string): Promise<ChallengeParticipation> => {
    await new Promise(resolve => setTimeout(resolve, 600));
    const index = mockParticipants.findIndex(p => p.id === participationId);
    if (index !== -1) {
        mockParticipants[index].status = status;
        mockParticipants[index].score = score;
        mockParticipants[index].feedback = feedback;
        console.log("Avaliação salva:", mockParticipants[index]);
        return mockParticipants[index];
    } else {
        throw new Error("Participação não encontrada.");
    }
}


// --- Component Sections ---

// ManageChallenges Component
const ManageChallenges = () => {
    const [challenges, setChallenges] = React.useState<Challenge[]>([]);
    const [filteredChallenges, setFilteredChallenges] = React.useState<Challenge[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [searchTerm, setSearchTerm] = React.useState('');
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

    React.useEffect(() => {
        const lowerCaseSearchTerm = searchTerm.toLowerCase();
        const filtered = challenges.filter(challenge =>
        challenge.title.toLowerCase().includes(lowerCaseSearchTerm) ||
        challenge.description.toLowerCase().includes(lowerCaseSearchTerm) ||
        (challenge.category && challenge.category.toLowerCase().includes(lowerCaseSearchTerm)) ||
        challenge.status.toLowerCase().includes(lowerCaseSearchTerm)
        );
        setFilteredChallenges(filtered);
    }, [searchTerm, challenges]);

     const handleSaveChallenge = async (data: any) => {
        // The data received here already includes the 'eligibility' object structure
        // and dates as strings, as prepared in the ChallengeForm.
         const challengeDataToSave = selectedChallenge
            ? { ...selectedChallenge, ...data, id: selectedChallenge.id } // Ensure ID is kept for update
            : data;

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
        }
    };


    const handleDeleteClick = (challenge: Challenge) => {
        setChallengeToDelete(challenge);
        setIsDeleting(true);
    };

     const confirmDelete = async () => {
        if (challengeToDelete) {
            try {
                await deleteChallenge(challengeToDelete.id);
                toast({ title: "Sucesso", description: "Desafio removido com sucesso." });
                await loadChallenges();
            } catch (error: any) {
                console.error("Falha ao remover desafio:", error);
                toast({ title: "Erro", description: error.message || "Falha ao remover desafio.", variant: "destructive" });
            } finally {
                setIsDeleting(false);
                setChallengeToDelete(null);
            }
        }
    };

    const handleDuplicateChallenge = async (challenge: Challenge) => {
        const { id, title, status, ...challengeData } = challenge;
        // Ensure eligibility object is duplicated correctly
        const duplicatedChallengeData = {
            ...challengeData,
            title: `${title} (Cópia)`,
             // New challenges from duplication start as draft
             eligibility: { ...challengeData.eligibility }, // Deep copy eligibility if needed
        };
        try {
            // Save without id and status
            await saveChallenge(duplicatedChallengeData as Omit<Challenge, 'id' | 'status'>);
            toast({ title: "Sucesso", description: "Desafio duplicado com sucesso." });
            await loadChallenges();
        } catch (error) {
            console.error("Falha ao duplicar desafio:", error);
            toast({ title: "Erro", description: "Falha ao duplicar desafio.", variant: "destructive" });
        }
    };

    const handleStatusChange = async (challenge: Challenge, newStatus: Challenge['status']) => {
         try {
            await updateChallengeStatus(challenge.id, newStatus);
             toast({ title: "Sucesso", description: `Status do desafio "${challenge.title}" alterado para ${getStatusText(newStatus)}.` });
             await loadChallenges();
         } catch (error) {
             console.error("Falha ao alterar status:", error);
             toast({ title: "Erro", description: "Falha ao alterar status do desafio.", variant: "destructive" });
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

     const getStatusBadgeVariant = (status: Challenge['status']): "default" | "secondary" | "destructive" | "outline" | "warning" => {
        const map: Record<Challenge['status'], "default" | "secondary" | "destructive" | "outline" | "warning"> = {
            active: 'default',       // Blue/Primary
            scheduled: 'secondary',  // Grey
            evaluating: 'warning',   // Yellow/Orange
            completed: 'success',    // Green (custom or adjust theme)
            draft: 'outline',        // Outline
            archived: 'destructive', // Red
        };
        // Add custom styles for success/warning if needed or map to existing variants
         if (status === 'completed') return 'secondary'; // Using secondary for now
         if (status === 'evaluating') return 'outline'; // Using outline for now
         return map[status] || 'outline';
    }

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


    return (
        <Card>
            <CardHeader>
                <CardTitle>Gerenciar Desafios</CardTitle>
                <CardDescription>Crie, edite, duplique e controle o ciclo de vida dos desafios.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex items-center justify-between mb-4">
                    <div className="relative w-full max-w-sm">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="Buscar por título, categoria, status..."
                            className="pl-8"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Button onClick={openAddForm}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Criar Novo Desafio
                    </Button>
                </div>

                <div className="rounded-md border">
                    <Table>
                    <TableHeader>
                        <TableRow>
                        <TableHead>Título</TableHead>
                        <TableHead>Período</TableHead>
                        <TableHead><Award className="inline-block mr-1 h-4 w-4"/>Pontos</TableHead>
                        <TableHead>Dificuldade</TableHead>
                         <TableHead>Participação</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-10">
                                <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                                Carregando desafios...
                                </TableCell>
                            </TableRow>
                        ) : filteredChallenges.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                                    Nenhum desafio encontrado.
                                </TableCell>
                            </TableRow>
                        ) : (
                        filteredChallenges.map((challenge) => (
                            <TableRow key={challenge.id}>
                            <TableCell className="font-medium">{challenge.title}</TableCell>
                            <TableCell>{formatPeriod(challenge.periodStartDate, challenge.periodEndDate)}</TableCell>
                            <TableCell className="text-center">{challenge.points}</TableCell>
                            <TableCell>{challenge.difficulty}</TableCell>
                            <TableCell>{challenge.participationType}</TableCell>
                            <TableCell>
                                <Badge variant={getStatusBadgeVariant(challenge.status)}>
                                    {getStatusText(challenge.status)}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-right">
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
                                     {/* Status change actions */}
                                    {challenge.status === 'draft' && (
                                        <DropdownMenuItem onClick={() => handleStatusChange(challenge, 'scheduled')}>
                                             <CheckCircle className="mr-2 h-4 w-4 text-green-600" /> Agendar/Ativar
                                        </DropdownMenuItem>
                                    )}
                                     {challenge.status === 'active' && (
                                        <DropdownMenuItem onClick={() => handleStatusChange(challenge, 'completed')}>
                                             <CheckSquare className="mr-2 h-4 w-4 text-blue-600" /> Marcar como Concluído
                                        </DropdownMenuItem>
                                     )}
                                      {(challenge.status === 'completed' || challenge.status === 'active') && (
                                        <DropdownMenuItem onClick={() => handleStatusChange(challenge, 'archived')}>
                                             <Archive className="mr-2 h-4 w-4 text-muted-foreground" /> Arquivar
                                        </DropdownMenuItem>
                                      )}
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                        onClick={() => handleDeleteClick(challenge)}
                                        className="text-destructive focus:text-destructive focus:bg-destructive/10"
                                        // Allow deleting drafts and archived, maybe completed ones too?
                                        disabled={challenge.status === 'active' || challenge.status === 'evaluating'}
                                    >
                                        <Trash2 className="mr-2 h-4 w-4" /> Remover
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                            </TableRow>
                        ))
                        )}
                    </TableBody>
                    </Table>
                </div>
            </CardContent>

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
                        Tem certeza que deseja remover o desafio "{challengeToDelete?.title}"? Esta ação não pode ser desfeita. Desafios ativos ou em avaliação não podem ser removidos.
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
const ChallengeDashboard = () => (
  <Card>
    <CardHeader>
      <CardTitle>Dashboard de Desafios</CardTitle>
      <CardDescription>Visão geral do programa de desafios.</CardDescription>
    </CardHeader>
    <CardContent>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
                <CardHeader className="pb-2">
                    <CardDescription>Desafios Ativos</CardDescription>
                    <CardTitle className="text-3xl">{mockChallenges.filter(c => c.status === 'active').length}</CardTitle>
                </CardHeader>
                 <CardContent><p className="text-xs text-muted-foreground">Desafios em andamento esta semana.</p></CardContent>
            </Card>
             <Card>
                <CardHeader className="pb-2">
                    <CardDescription>Participações Pendentes</CardDescription>
                     <CardTitle className="text-3xl">{mockParticipants.filter(p => p.status === 'submitted').length}</CardTitle>
                </CardHeader>
                 <CardContent><p className="text-xs text-muted-foreground">Submissões aguardando avaliação.</p></CardContent>
            </Card>
             <Card>
                <CardHeader className="pb-2">
                    <CardDescription>Taxa de Conclusão Média</CardDescription>
                    {/* Calculation is mock */}
                    <CardTitle className="text-3xl">
                        {(() => {
                            const completed = mockParticipants.filter(p => p.status === 'approved').length;
                            const total = mockParticipants.filter(p => ['approved', 'rejected'].includes(p.status)).length;
                            return total > 0 ? `${((completed / total) * 100).toFixed(0)}%` : 'N/A';
                        })()}
                    </CardTitle>
                </CardHeader>
                 <CardContent><p className="text-xs text-muted-foreground">Média de sucesso dos últimos desafios avaliados.</p></CardContent>
            </Card>
      </div>
       {/* TODO: Add Chart placeholder here */}
       <div className="mt-6 text-center text-muted-foreground">
            (Gráficos e relatórios detalhados serão implementados aqui)
        </div>
    </CardContent>
    <CardFooter>
        <Button variant="outline" onClick={() => alert("Relatórios Detalhados não implementados.")}>Ver Relatórios Detalhados</Button>
    </CardFooter>
  </Card>
);

const ChallengeEvaluation = () => {
    const [challengesToEvaluate, setChallengesToEvaluate] = React.useState<Challenge[]>([]);
    const [selectedChallengeId, setSelectedChallengeId] = React.useState<string | null>(null);
    const [participants, setParticipants] = React.useState<ChallengeParticipation[]>([]);
    const [isLoadingChallenges, setIsLoadingChallenges] = React.useState(true);
    const [isLoadingParticipants, setIsLoadingParticipants] = React.useState(false);
    const [currentEvaluation, setCurrentEvaluation] = React.useState<{ [key: string]: { status: 'approved' | 'rejected' | 'pending', feedback: string, score?: number, isSaving: boolean } }>({}); // Added isSaving
    const { toast } = useToast();

    React.useEffect(() => {
        const fetchEvaluableChallenges = async () => {
            setIsLoadingChallenges(true);
            try {
                const allChallenges = await fetchChallenges();
                // Consider 'completed' and 'evaluating' states for evaluation
                 setChallengesToEvaluate(allChallenges.filter(c => ['evaluating', 'completed'].includes(c.status)));
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
                setCurrentEvaluation({}); // Reset evaluation state when changing challenge
                try {
                    const participantsData = await fetchParticipantsForChallenge(selectedChallengeId);
                    const submittedParticipants = participantsData.filter(p => p.status === 'submitted');
                    setParticipants(submittedParticipants);
                     // Initialize evaluation state for submitted participants
                     const initialEvalState: typeof currentEvaluation = {};
                     submittedParticipants.forEach(p => {
                         initialEvalState[p.id] = { status: 'pending', feedback: '', isSaving: false }; // Initialize isSaving
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
                ...(prev[participantId] || { status: 'pending', feedback: '', isSaving: false }), // Ensure state exists
                [field]: value,
                 // Reset score if rejected
                ...(field === 'status' && value === 'rejected' && { score: undefined }),
                // Use default challenge points if approved and score not set
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

         // Mark as saving
         setCurrentEvaluation(prev => ({ ...prev, [participantId]: { ...evaluationData, isSaving: true } }));

        try {
             const finalScore = evaluationData.status === 'approved' ? (evaluationData.score ?? challenge.points) : 0;
             await evaluateSubmission(participantId, evaluationData.status, finalScore, evaluationData.feedback);
             toast({ title: "Sucesso", description: `Avaliação para ${participant.employeeName} salva.` });

             // Remove evaluated participant from the list
             setParticipants(prev => prev.filter(p => p.id !== participantId));
             // Clean up evaluation state for the saved participant
             setCurrentEvaluation(prev => {
                 const newState = { ...prev };
                 delete newState[participantId];
                 return newState;
             });

        } catch (error) {
             console.error("Falha ao salvar avaliação:", error);
             toast({ title: "Erro", description: "Falha ao salvar avaliação.", variant: "destructive" });
             // Revert saving state on error
             setCurrentEvaluation(prev => ({ ...prev, [participantId]: { ...evaluationData, isSaving: false } }));
        }
    };


    const selectedChallenge = challengesToEvaluate.find(c => c.id === selectedChallengeId);

    return (
        <Card>
            <CardHeader>
            <CardTitle className="flex items-center gap-2"><CheckSquare className="h-5 w-5"/> Avaliação de Desafios</CardTitle>
            <CardDescription>Avalie as submissões dos desafios concluídos ou em avaliação.</CardDescription>
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
                                <SelectItem value="no-challenges" disabled>Nenhum desafio para avaliar</SelectItem>
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
                            <div className="space-y-4">
                                {participants.map(participant => (
                                    <Card key={participant.id} className="bg-muted/50">
                                        <CardHeader className="pb-2 pt-3 px-4">
                                            <CardTitle className="text-base flex justify-between items-center">
                                                {participant.employeeName}
                                                 <span className="text-xs text-muted-foreground font-normal">
                                                    Enviado em: {participant.submittedAt ? format(participant.submittedAt, 'dd/MM/yy HH:mm', { locale: ptBR }) : '-'}
                                                </span>
                                            </CardTitle>
                                            {/* Display submission details */}
                                            <CardDescription className="text-sm pt-1">
                                                <strong>Submissão:</strong>{' '}
                                                {participant.submission?.startsWith('http') ? (
                                                     <a href={participant.submission} target="_blank" rel="noopener noreferrer" className="text-accent underline hover:text-accent/80">
                                                        <LinkIcon className="inline-block h-3 w-3 mr-1" /> Abrir Link
                                                    </a>
                                                ) : (
                                                    participant.submission || <span className="italic text-muted-foreground">Nenhuma descrição fornecida.</span>
                                                )}
                                                 {/* TODO: Handle file uploads if needed */}
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="px-4 pb-3 space-y-2">
                                             <div className="flex flex-col md:flex-row gap-2 items-start md:items-center">
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
                                                            max={selectedChallenge?.points} // Set max based on challenge points
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

                                                <Button
                                                    size="sm"
                                                    className="mt-4 md:mt-5 self-end md:self-center"
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
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};


const ChallengeHistory = () => {
     const [historyChallenges, setHistoryChallenges] = React.useState<Challenge[]>([]);
     const [isLoading, setIsLoading] = React.useState(true);

     React.useEffect(() => {
        const fetchHistory = async () => {
            setIsLoading(true);
            try {
                const allChallenges = await fetchChallenges();
                // Filter only completed/archived challenges for history
                setHistoryChallenges(allChallenges.filter(c => ['completed', 'archived', 'evaluating'].includes(c.status)) // Include evaluating for potential results view
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
    }, []);

     // Helper to get status text (reuse from ManageChallenges)
    const getStatusText = (status: Challenge['status']): string => {
        const map: Record<Challenge['status'], string> = {
            active: 'Ativo', scheduled: 'Agendado', evaluating: 'Em Avaliação',
            completed: 'Concluído', draft: 'Rascunho', archived: 'Arquivado'
        };
        return map[status] || status;
    }

    // Helper to get status badge variant (reuse from ManageChallenges)
     const getStatusBadgeVariant = (status: Challenge['status']): "default" | "secondary" | "destructive" | "outline" | "warning" => {
        const map: Record<Challenge['status'], "default" | "secondary" | "destructive" | "outline" | "warning"> = {
            active: 'default', scheduled: 'secondary', evaluating: 'warning',
            completed: 'success', draft: 'outline', archived: 'destructive',
        };
         if (status === 'completed') return 'secondary'; // Use secondary for completed
         if (status === 'evaluating') return 'outline'; // Use outline for evaluating
         return map[status] || 'outline';
    }

    const getParticipantSummary = (challengeId: string) => {
        const totalParticipants = mockParticipants.filter(p => p.challengeId === challengeId).length;
        const evaluated = mockParticipants.filter(p => p.challengeId === challengeId && ['approved', 'rejected'].includes(p.status)).length;
        const approved = mockParticipants.filter(p => p.challengeId === challengeId && p.status === 'approved').length;
         if (totalParticipants === 0) return "N/A";
        return `${approved}/${evaluated} Aprovados (${totalParticipants} Total)`;
    }


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
                     <div className="rounded-md border max-h-[60vh] overflow-y-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Título</TableHead>
                                    <TableHead>Período</TableHead>
                                    <TableHead>Pontos</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-center"><Users className="inline-block mr-1 h-4 w-4"/>Resultados</TableHead>
                                     <TableHead className="text-right">Detalhes</TableHead> {/* Action column */}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {historyChallenges.map(challenge => (
                                    <TableRow key={challenge.id}>
                                        <TableCell className="font-medium">{challenge.title}</TableCell>
                                         <TableCell>{format(parseISO(challenge.periodStartDate), 'dd/MM/yy')} - {format(parseISO(challenge.periodEndDate), 'dd/MM/yy')}</TableCell>
                                         <TableCell className="text-center">{challenge.points}</TableCell>
                                         <TableCell><Badge variant={getStatusBadgeVariant(challenge.status)}>{getStatusText(challenge.status)}</Badge></TableCell>
                                        <TableCell className="text-center text-xs">
                                            {getParticipantSummary(challenge.id)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="outline" size="sm" onClick={() => alert(`Visualizar detalhes de ${challenge.title} (não implementado).`)}>
                                                 Ver Detalhes
                                             </Button>
                                         </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                     </div>
                )}
            </CardContent>
            <CardFooter>
                <Button variant="outline" onClick={() => alert("Exportar Histórico não implementado.")} disabled={isLoading || historyChallenges.length === 0}>Exportar Histórico</Button>
            </CardFooter>
        </Card>
    );
};


// Settings Component (Functional)
const ChallengeSettings = () => {
    const { toast } = useToast();
    const [isSaving, setIsSaving] = React.useState(false);
    // Default values - load from backend in real app
    const [settings, setSettings] = React.useState({
        rankingFactor: 1.0,
        enableGamification: false, // Feature flag
        maxPointsCap: '', // Empty string for no limit
        defaultParticipation: 'Opcional', // 'Opcional' or 'Obrigatório'
    });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { id, value, type } = e.target;
        setSettings(prev => ({
            ...prev,
            [id]: type === 'number' ? (value === '' ? '' : parseFloat(value)) : value
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
         // Simulate API call
         console.log("Saving challenge settings:", settings);
         await new Promise(resolve => setTimeout(resolve, 800));
         toast({ title: "Sucesso", description: "Configurações de desafios salvas." });
         setIsSaving(false);
         // In real app, might need to refetch or update state based on response
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Cog className="h-5 w-5" /> Configurações dos Desafios</CardTitle>
                <CardDescription>Ajuste as regras gerais e integração dos desafios com o sistema.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <Label htmlFor="ranking-factor">Fator de Ponderação no Ranking</Label>
                    <Input
                        id="ranking-factor"
                        type="number"
                        value={settings.rankingFactor}
                        onChange={handleInputChange}
                        step="0.1" min="0" max="2" className="w-[100px]"
                    />
                    <p className="text-xs text-muted-foreground">Multiplicador para pontos de desafios ao calcular o ranking final (Ex: 1.0 = peso igual; 0.5 = metade do peso).</p>
                </div>
                <Separator />
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
                 <div className="flex items-center space-x-2">
                    <Switch id="enable-gamification" checked={settings.enableGamification} onCheckedChange={handleSwitchChange} />
                    <Label htmlFor="enable-gamification" className="text-sm font-normal">Habilitar Emblemas e Conquistas (Gamificação)</Label>
                 </div>
                <p className="text-xs text-muted-foreground -mt-4 pl-8">Ativa recursos adicionais de gamificação relacionados a desafios (requer implementação).</p>
                 <Separator />
                <div className="space-y-2">
                    <Label htmlFor="maxPointsCap">Teto Máximo de Pontos de Desafios por Mês (Opcional)</Label>
                    <Input
                        id="maxPointsCap"
                        type="number"
                        placeholder="Sem limite"
                        value={settings.maxPointsCap}
                        onChange={handleInputChange}
                        min="0" className="w-[120px]"
                    />
                    <p className="text-xs text-muted-foreground">Limite máximo de pontos de desafios que podem contar para o ranking em um único mês.</p>
                </div>
                 {/* Add more settings as needed */}
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
    <div className="space-y-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
             <Target className="h-7 w-7" /> Desafios Semanais
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
