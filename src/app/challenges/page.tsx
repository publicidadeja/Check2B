// src/app/challenges/page.tsx
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
  Loader2
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
import { ChallengeForm } from '@/components/challenge/challenge-form'; // To be created
import type { Challenge } from '@/types/challenge';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Mock data for challenges
const mockChallenges: Challenge[] = [
  { id: 'c1', title: 'Superação de Metas Vendas', description: 'Atingir 110% da meta de vendas semanal.', category: 'Vendas', periodStartDate: '2024-08-19', periodEndDate: '2024-08-25', points: 150, difficulty: 'Médio', participationType: 'Opcional', eligibility: { type: 'role', entityIds: ['Executivo de Contas'] }, evaluationMetrics: 'Relatório de Vendas', status: 'active' },
  { id: 'c2', title: 'Inovação Operacional', description: 'Sugerir uma melhoria de processo documentada.', category: 'Processos', periodStartDate: '2024-08-19', periodEndDate: '2024-08-25', points: 100, difficulty: 'Médio', participationType: 'Obrigatório', eligibility: { type: 'department', entityIds: ['Engenharia', 'Operações'] }, evaluationMetrics: 'Documento de Proposta', status: 'active' },
  { id: 'c3', title: 'Feedback Construtivo', description: 'Realizar 3 revisões de código construtivas.', category: 'Engenharia', periodStartDate: '2024-08-12', periodEndDate: '2024-08-18', points: 80, difficulty: 'Fácil', participationType: 'Obrigatório', eligibility: { type: 'role', entityIds: ['Desenvolvedor Backend', 'Desenvolvedora Frontend'] }, evaluationMetrics: 'Links dos PRs revisados', status: 'completed' },
  { id: 'c4', title: 'Organização Impecável', description: 'Manter a área de trabalho 100% organizada por 5 dias.', category: 'Geral', periodStartDate: '2024-09-02', periodEndDate: '2024-09-08', points: 50, difficulty: 'Fácil', participationType: 'Opcional', eligibility: { type: 'all' }, evaluationMetrics: 'Verificação visual diária', status: 'scheduled' },
];

// Mock API functions (similar to tasks/employees)
const fetchChallenges = async (): Promise<Challenge[]> => {
  await new Promise(resolve => setTimeout(resolve, 500));
  return [...mockChallenges]; // Return a copy
};

const saveChallenge = async (challengeData: Omit<Challenge, 'id' | 'status'> | Challenge): Promise<Challenge> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    if ('id' in challengeData && challengeData.id) {
        const index = mockChallenges.findIndex(c => c.id === challengeData.id);
        if (index !== -1) {
            mockChallenges[index] = { ...mockChallenges[index], ...challengeData };
            console.log("Desafio atualizado:", mockChallenges[index]);
            return mockChallenges[index];
        } else {
            throw new Error("Desafio não encontrado para atualização");
        }
    } else {
        const newChallenge: Challenge = {
            id: `c${Date.now()}`, // Simple ID generation
            status: 'draft', // Default status for new challenges
            ...(challengeData as Omit<Challenge, 'id' | 'status'>), // Cast needed
            // Ensure required fields have defaults if not provided
             periodStartDate: challengeData.periodStartDate || format(new Date(), 'yyyy-MM-dd'),
             periodEndDate: challengeData.periodEndDate || format(new Date(), 'yyyy-MM-dd'),
             points: challengeData.points || 0,
             difficulty: challengeData.difficulty || 'Médio',
             participationType: challengeData.participationType || 'Opcional',
             eligibility: challengeData.eligibility || { type: 'all' },
             evaluationMetrics: challengeData.evaluationMetrics || 'Não definido',
        };
        mockChallenges.push(newChallenge);
        console.log("Novo desafio adicionado:", newChallenge);
        return newChallenge;
    }
};

const deleteChallenge = async (challengeId: string): Promise<void> => {
     await new Promise(resolve => setTimeout(resolve, 500));
    const index = mockChallenges.findIndex(c => c.id === challengeId);
    if (index !== -1) {
        mockChallenges.splice(index, 1);
        console.log("Desafio removido com ID:", challengeId);
    } else {
         throw new Error("Desafio não encontrado para remoção");
    }
};


// --- Component Sections ---

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

  const handleSaveChallenge = async (data: any) => { // Use specific type from form later
     const challengeDataToSave = selectedChallenge ? { ...selectedChallenge, ...data } : data;

     // Ensure dates are formatted correctly (string YYYY-MM-DD)
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
        await loadChallenges(); // Refresh list
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
    // Exclude ID and potentially adjust dates/title for duplication
    const { id, title, status, ...challengeData } = challenge;
    const duplicatedChallengeData = {
        ...challengeData,
        title: `${title} (Cópia)`, // Indicate it's a copy
        status: 'draft', // Start copy as draft
        // Adjust dates if needed, e.g., set to next week
        // periodStartDate: ...,
        // periodEndDate: ...,
    };
    try {
      // Assert the type correctly for saving
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
    setSelectedChallenge(null); // Ensure no challenge is selected for adding
    setIsFormOpen(true);
  };

  const getStatusBadgeVariant = (status: Challenge['status']): "default" | "secondary" | "destructive" | "outline" => {
      switch (status) {
          case 'active': return 'default';
          case 'scheduled': return 'secondary';
          case 'completed': return 'secondary';
          case 'evaluating': return 'outline';
          case 'draft': return 'outline';
          case 'archived': return 'destructive'; // Or secondary muted
          default: return 'outline';
      }
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
             return `${start} - ${end}`; // Fallback
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
                    <TableHead>Pontos</TableHead>
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
                        <TableCell>{challenge.points}</TableCell>
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
                                    <Edit className="mr-2 h-4 w-4" />
                                    Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDuplicateChallenge(challenge)}>
                                <Copy className="mr-2 h-4 w-4" />
                                Duplicar
                                </DropdownMenuItem>
                                {/* TODO: Add options like 'Archive', 'Activate' based on status */}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    onClick={() => handleDeleteClick(challenge)}
                                    className="text-destructive focus:text-destructive focus:bg-destructive/10"
                                    disabled={challenge.status === 'active' || challenge.status === 'evaluating' || challenge.status === 'completed'} // Prevent deleting active/past challenges easily
                                >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Remover
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

            {/* Challenge Form Dialog */}
             <ChallengeForm
                challenge={selectedChallenge}
                onSave={handleSaveChallenge}
                open={isFormOpen}
                onOpenChange={setIsFormOpen}
            />

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={isDeleting} onOpenChange={setIsDeleting}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>Confirmar Remoção</AlertDialogTitle>
                    <AlertDialogDescription>
                        Tem certeza que deseja remover o desafio "{challengeToDelete?.title}"? Esta ação não pode ser desfeita (a menos que seja apenas um rascunho).
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
      <p className="text-muted-foreground">Dashboard de desafios ainda não implementado.</p>
      {/* TODO: Implement Dashboard UI */}
    </CardContent>
  </Card>
);

const ChallengeEvaluation = () => (
   <Card>
    <CardHeader>
      <CardTitle>Avaliação de Desafios</CardTitle>
      <CardDescription>Avalie as submissões dos desafios concluídos.</CardDescription>
    </CardHeader>
    <CardContent>
      <p className="text-muted-foreground">Funcionalidade de avaliação de desafios ainda não implementada.</p>
       {/* TODO: Implement Evaluation UI (List challenges needing evaluation, form per challenge) */}
    </CardContent>
  </Card>
);

const ChallengeHistory = () => (
  <Card>
    <CardHeader>
      <CardTitle>Histórico de Desafios</CardTitle>
      <CardDescription>Consulte desafios passados e seus resultados.</CardDescription>
    </CardHeader>
    <CardContent>
      <p className="text-muted-foreground">Histórico de desafios ainda não implementado.</p>
       {/* TODO: Implement History UI (List past challenges, stats, winners) */}
    </CardContent>
     <CardFooter>
        <Button variant="outline" disabled>Exportar Histórico</Button>
    </CardFooter>
  </Card>
);

const ChallengeSettings = () => (
  <Card>
    <CardHeader>
      <CardTitle>Configurações dos Desafios</CardTitle>
      <CardDescription>Ajuste as regras e integração dos desafios com o ranking.</CardDescription>
    </CardHeader>
    <CardContent>
      <p className="text-muted-foreground">Configurações avançadas de desafios ainda não implementadas.</p>
       {/* TODO: Implement Settings UI (Ranking integration formula, gamification toggles etc.) */}
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
