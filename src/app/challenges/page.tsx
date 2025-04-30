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

// --- Mock Data ---
// Existing mockChallenges array

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
];

// --- Mock API Functions ---
// Existing fetchChallenges, saveChallenge, deleteChallenge

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

// ManageChallenges Component (mostly unchanged, minor adjustments possible)
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
        const challengeDataToSave = selectedChallenge ? { ...selectedChallenge, ...data } : data;
        const payload = {
            ...challengeDataToSave,
            periodStartDate: challengeDataToSave.periodStartDate instanceof Date
                ? format(challengeDataToSave.periodStartDate, 'yyyy-MM-dd')
                : challengeDataToSave.periodStartDate,
            periodEndDate: challengeDataToSave.periodEndDate instanceof Date
                ? format(challengeDataToSave.periodEndDate, 'yyyy-MM-dd')
                : challengeDataToSave.periodEndDate,
        };

        try {
            await saveChallenge(payload);
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
            } catch (error) {
                console.error("Falha ao remover desafio:", error);
                toast({ title: "Erro", description: "Falha ao remover desafio.", variant: "destructive" });
            } finally {
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
            status: 'draft',
        };
        try {
            await saveChallenge(duplicatedChallengeData as Omit<Challenge, 'id' | 'status'>);
            toast({ title: "Sucesso", description: "Desafio duplicado com sucesso." });
            await loadChallenges();
        } catch (error) {
            console.error("Falha ao duplicar desafio:", error);
            toast({ title: "Erro", description: "Falha ao duplicar desafio.", variant: "destructive" });
        }
    };


    const openEditForm = (challenge: Challenge) => {
        setSelectedChallenge(challenge);
        setIsFormOpen(true);
    };

    const openAddForm = () => {
        setSelectedChallenge(null);
        setIsFormOpen(true);
    };

    const getStatusBadgeVariant = (status: Challenge['status']): "default" | "secondary" | "destructive" | "outline" => {
        const map: Record<Challenge['status'], "default" | "secondary" | "destructive" | "outline"> = {
            active: 'default',
            scheduled: 'secondary',
            completed: 'secondary', // Completed but maybe not evaluated
            evaluating: 'outline', // Actively evaluating
            draft: 'outline',
            archived: 'destructive',
        };
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
                <CardDescription>Crie, edite, duplique e remova desafios semanais.</CardDescription>
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
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-10">
                                <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                                Carregando desafios...
                                </TableCell>
                            </TableRow>
                        ) : filteredChallenges.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
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
                                    {/* TODO: Add actions like Archive, Activate based on status */}
                                    {challenge.status === 'draft' && (
                                        <DropdownMenuItem onClick={() => alert(`Ativar ${challenge.title}`)}>
                                             <CheckSquare className="mr-2 h-4 w-4" /> Ativar
                                        </DropdownMenuItem>
                                    )}
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                        onClick={() => handleDeleteClick(challenge)}
                                        className="text-destructive focus:text-destructive focus:bg-destructive/10"
                                        disabled={challenge.status === 'active' || challenge.status === 'evaluating' || challenge.status === 'completed'}
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
                        Tem certeza que deseja remover o desafio "{challengeToDelete?.title}"? Esta ação não pode ser desfeita (a menos que seja um rascunho). Desafios ativos ou concluídos não podem ser removidos diretamente.
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


const ChallengeDashboard = () => (
  <Card>
    <CardHeader>
      <CardTitle>Dashboard de Desafios</CardTitle>
      <CardDescription>Visão geral do programa de desafios.</CardDescription>
    </CardHeader>
    <CardContent>
      {/* TODO: Implement Dashboard UI - Use Stats Cards, maybe a small chart */}
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
                    <CardTitle className="text-3xl">75%</CardTitle>
                </CardHeader>
                 <CardContent><p className="text-xs text-muted-foreground">Média de sucesso dos últimos desafios.</p></CardContent>
            </Card>
      </div>
       {/* Add Chart placeholder here */}
    </CardContent>
    <CardFooter>
        <Button variant="outline" disabled>Ver Relatórios Detalhados</Button>
    </CardFooter>
  </Card>
);

const ChallengeEvaluation = () => {
    const [challengesToEvaluate, setChallengesToEvaluate] = React.useState<Challenge[]>([]);
    const [selectedChallengeId, setSelectedChallengeId] = React.useState<string | null>(null);
    const [participants, setParticipants] = React.useState<ChallengeParticipation[]>([]);
    const [isLoadingChallenges, setIsLoadingChallenges] = React.useState(true);
    const [isLoadingParticipants, setIsLoadingParticipants] = React.useState(false);
    const [currentEvaluation, setCurrentEvaluation] = React.useState<{ [key: string]: { status: 'approved' | 'rejected' | 'pending', feedback: string, score?: number } }>({});
    const { toast } = useToast();

    React.useEffect(() => {
        const fetchEvaluableChallenges = async () => {
            setIsLoadingChallenges(true);
            try {
                const allChallenges = await fetchChallenges();
                // Filter challenges that might need evaluation (e.g., completed, evaluating)
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
                    setParticipants(participantsData.filter(p => p.status === 'submitted')); // Only show submitted
                     // Initialize evaluation state
                     const initialEvalState: typeof currentEvaluation = {};
                     participantsData.filter(p => p.status === 'submitted').forEach(p => {
                         initialEvalState[p.id] = { status: 'pending', feedback: '' };
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
                ...prev[participantId],
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
        if (!evaluationData || evaluationData.status === 'pending') {
            toast({ title: "Atenção", description: "Selecione 'Aprovado' ou 'Rejeitado' antes de salvar.", variant: "destructive" });
            return;
        }
         if (evaluationData.status === 'rejected' && !evaluationData.feedback?.trim()) {
            toast({ title: "Atenção", description: "Forneça um feedback ao rejeitar a submissão.", variant: "destructive" });
            return;
         }

         // Mark as saving (visual feedback)
         handleEvaluationChange(participantId, 'status', evaluationData.status); // Keep status but show loading maybe?


        try {
            await evaluateSubmission(participantId, evaluationData.status, evaluationData.score, evaluationData.feedback);
             toast({ title: "Sucesso", description: "Avaliação salva." });
             // Remove evaluated participant from the list or update its state visually
             setParticipants(prev => prev.filter(p => p.id !== participantId));
             delete currentEvaluation[participantId]; // Clean up state
        } catch (error) {
             console.error("Falha ao salvar avaliação:", error);
             toast({ title: "Erro", description: "Falha ao salvar avaliação.", variant: "destructive" });
             // Revert visual state if needed
        }
    };


    const selectedChallenge = challengesToEvaluate.find(c => c.id === selectedChallengeId);

    return (
        <Card>
            <CardHeader>
            <CardTitle className="flex items-center gap-2"><CheckSquare className="h-5 w-5"/> Avaliação de Desafios</CardTitle>
            <CardDescription>Avalie as submissões dos desafios concluídos.</CardDescription>
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
                                        {challenge.title} ({format(parseISO(challenge.periodEndDate), 'dd/MM/yy')})
                                    </SelectItem>
                                ))
                             )}
                        </SelectContent>
                    </Select>
                </div>

                {selectedChallengeId && (
                    <div className="mt-4 border rounded-md p-4">
                         <h3 className="font-semibold mb-2">Avaliar Participantes de: {selectedChallenge?.title}</h3>
                        {isLoadingParticipants ? (
                            <div className="text-center py-6"><Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" /></div>
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
                                                    Enviado em: {participant.submittedAt ? format(participant.submittedAt, 'dd/MM/yy HH:mm') : '-'}
                                                </span>
                                            </CardTitle>
                                            {/* Display submission details */}
                                            <CardDescription className="text-sm pt-1">
                                                <strong>Submissão:</strong> {participant.submission || <span className="italic text-muted-foreground">Nenhuma descrição fornecida.</span>}
                                                 {/* TODO: Add link if submission is a URL */}
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="px-4 pb-3 space-y-2">
                                             <div className="flex flex-col md:flex-row gap-2 items-start md:items-center">
                                                <div className='flex-shrink-0'>
                                                    <Label className="text-xs">Resultado:</Label>
                                                     <Select
                                                        value={currentEvaluation[participant.id]?.status || 'pending'}
                                                        onValueChange={(value: 'approved' | 'rejected') => handleEvaluationChange(participant.id, 'status', value)}
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
                                                    />
                                                </div>

                                                <Button
                                                    size="sm"
                                                    className="mt-4 md:mt-5 self-end md:self-center"
                                                     onClick={() => handleSaveEvaluation(participant.id)}
                                                     disabled={!currentEvaluation[participant.id] || currentEvaluation[participant.id].status === 'pending'}
                                                >
                                                    Salvar Avaliação
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
                setHistoryChallenges(allChallenges.filter(c => ['completed', 'archived'].includes(c.status)));
            } catch (error) {
                 console.error("Failed to load challenge history:", error);
                 // Add toast error if needed
            } finally {
                setIsLoading(false);
            }
        };
        fetchHistory();
    }, []);


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
                                    <TableHead className="text-center"><Users className="inline-block mr-1 h-4 w-4"/>Participantes</TableHead> {/* Mocked */}
                                    {/* Add more relevant history columns */}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {historyChallenges.map(challenge => (
                                    <TableRow key={challenge.id}>
                                        <TableCell className="font-medium">{challenge.title}</TableCell>
                                         <TableCell>{format(parseISO(challenge.periodStartDate), 'dd/MM/yy')} - {format(parseISO(challenge.periodEndDate), 'dd/MM/yy')}</TableCell>
                                         <TableCell>{challenge.points}</TableCell>
                                         <TableCell><Badge variant="secondary">{getStatusText(challenge.status)}</Badge></TableCell>
                                        <TableCell className="text-center">
                                             {/* Mock participant count */}
                                             {mockParticipants.filter(p => p.challengeId === challenge.id && p.status !== 'pending').length} / {mockParticipants.filter(p => p.challengeId === challenge.id).length}
                                        </TableCell>
                                        {/* Add actions like View Details */}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                     </div>
                )}
            </CardContent>
            <CardFooter>
                <Button variant="outline" disabled>Exportar Histórico</Button>
            </CardFooter>
        </Card>
    );
};


const ChallengeSettings = () => (
  <Card>
    <CardHeader>
      <CardTitle>Configurações dos Desafios</CardTitle>
      <CardDescription>Ajuste as regras e integração dos desafios com o ranking.</CardDescription>
    </CardHeader>
    <CardContent className="space-y-4">
        <div className="space-y-2">
            <Label htmlFor="ranking-factor">Fator de Ponderação no Ranking</Label>
            <Input id="ranking-factor" type="number" defaultValue="1.0" step="0.1" min="0" max="2" className="w-[100px]" />
            <p className="text-xs text-muted-foreground">Multiplicador para pontos de desafios ao calcular o ranking final. Ex: 1.0 = peso igual; 0.5 = metade do peso.</p>
        </div>
        <Separator />
         <div className="flex items-center space-x-2">
            <Switch id="enable-gamification" defaultChecked disabled />
            <Label htmlFor="enable-gamification" className="text-sm font-normal">Habilitar Emblemas e Conquistas (Não implementado)</Label>
         </div>
         <Separator />
        <div className="space-y-2">
            <Label htmlFor="max-points">Teto Máximo de Pontos de Desafios (Opcional)</Label>
            <Input id="max-points" type="number" placeholder="Sem limite" min="0" className="w-[120px]" />
            <p className="text-xs text-muted-foreground">Limite máximo de pontos de desafios que contam para o ranking em um período.</p>
        </div>

    </CardContent>
    <CardFooter>
        <Button disabled>Salvar Configurações</Button>
    </CardFooter>
  </Card>
);


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
