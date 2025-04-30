
'use client';

import * as React from 'react';
import { Target, CheckCircle, Clock, Award, History, Filter, Loader2, Info, ArrowRight, FileText, Upload } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO, differenceInDays, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogFooter
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// Import types
import type { Challenge } from '@/types/challenge';
import { mockEmployees } from '@/app/employees/page';
import { mockChallenges as allAdminChallenges } from '@/app/challenges/page'; // Reuse challenges

// Mock Employee ID
const CURRENT_EMPLOYEE_ID = '1'; // Alice Silva

// Mock participation data (Needs to be expanded for employee interaction)
interface EmployeeChallengeParticipation {
    challengeId: string;
    employeeId: string;
    status: 'pending' | 'accepted' | 'submitted' | 'approved' | 'rejected';
    acceptedAt?: Date;
    submittedAt?: Date;
    submissionText?: string;
    submissionFileUrl?: string; // URL of uploaded file
    score?: number;
    feedback?: string;
}

let mockParticipations: EmployeeChallengeParticipation[] = [
    { challengeId: 'c1', employeeId: '1', status: 'approved', acceptedAt: new Date(2024, 7, 5), submittedAt: new Date(2024, 7, 9), submissionText: 'Resumos enviados.', score: 50, feedback: 'Ótimo trabalho!' },
    { challengeId: 'c2', employeeId: '1', status: 'pending' }, // Not eligible or didn't accept
    { challengeId: 'c3', employeeId: '1', status: 'pending' }, // Not eligible
    { challengeId: 'c4', employeeId: '1', status: 'submitted', acceptedAt: new Date(2024, 7, 29), submittedAt: new Date(2024, 8, 1), submissionText: 'Feedbacks enviados via RH.' }, // Submitted, pending evaluation
    { challengeId: 'c5', employeeId: '1', status: 'accepted', acceptedAt: new Date() }, // Accepted, not submitted yet
];

// --- Mock Fetching Functions ---
const fetchEmployeeChallenges = async (employeeId: string): Promise<{ available: Challenge[], active: Challenge[], completed: Challenge[], participations: EmployeeChallengeParticipation[] }> => {
    await new Promise(resolve => setTimeout(resolve, 700));
    const employee = mockEmployees.find(e => e.id === employeeId);
    if (!employee) throw new Error("Colaborador não encontrado.");

    const employeeParticipations = mockParticipations.filter(p => p.employeeId === employeeId);
    const participationMap = new Map(employeeParticipations.map(p => [p.challengeId, p]));

    const available: Challenge[] = [];
    const active: Challenge[] = [];
    const completed: Challenge[] = [];

    allAdminChallenges.forEach(challenge => {
        // Check eligibility first
        let isEligible = false;
        if (challenge.eligibility.type === 'all') isEligible = true;
        else if (challenge.eligibility.type === 'department' && challenge.eligibility.entityIds?.includes(employee.department)) isEligible = true;
        else if (challenge.eligibility.type === 'role' && challenge.eligibility.entityIds?.includes(employee.role)) isEligible = true;
        else if (challenge.eligibility.type === 'individual' && challenge.eligibility.entityIds?.includes(employee.id)) isEligible = true;

        if (!isEligible) return; // Skip if not eligible

        const participation = participationMap.get(challenge.id);

        if (challenge.status === 'active' || challenge.status === 'scheduled') {
            if (!participation || participation.status === 'pending') {
                 // Only show active/scheduled if not already accepted/completed/rejected etc.
                 if (challenge.status === 'active') { // Only show active challenges as available
                     available.push(challenge);
                 }
            } else if (participation.status === 'accepted' || participation.status === 'submitted') {
                active.push(challenge);
            } else if (participation.status === 'approved' || participation.status === 'rejected') {
                completed.push(challenge);
            }
        } else if (challenge.status === 'completed' || challenge.status === 'evaluating' || challenge.status === 'archived') {
             // Only add to completed if there was participation
             if (participation && (participation.status === 'approved' || participation.status === 'rejected')) {
                completed.push(challenge);
             }
        }
    });

    return { available, active, completed, participations: employeeParticipations };
}

// Mock action functions
const acceptChallenge = async (employeeId: string, challengeId: string): Promise<EmployeeChallengeParticipation> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    const existing = mockParticipations.find(p => p.employeeId === employeeId && p.challengeId === challengeId);
    if (existing) {
        existing.status = 'accepted';
        existing.acceptedAt = new Date();
        console.log("Challenge accepted:", existing);
        return existing;
    } else {
        const newParticipation: EmployeeChallengeParticipation = {
            employeeId,
            challengeId,
            status: 'accepted',
            acceptedAt: new Date(),
        };
        mockParticipations.push(newParticipation);
        console.log("Challenge accepted (new participation):", newParticipation);
        return newParticipation;
    }
};

const submitChallenge = async (employeeId: string, challengeId: string, submissionText?: string, file?: File): Promise<EmployeeChallengeParticipation> => {
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate upload/save
    const participation = mockParticipations.find(p => p.employeeId === employeeId && p.challengeId === challengeId);
    if (!participation || participation.status !== 'accepted') {
        throw new Error("Não é possível submeter este desafio.");
    }

    participation.status = 'submitted';
    participation.submittedAt = new Date();
    participation.submissionText = submissionText;
    // Simulate file upload URL storage
    participation.submissionFileUrl = file ? `uploads/mock_${employeeId}_${file.name}` : undefined;

    console.log("Challenge submitted:", participation);
    return participation;
};

// --- Helper Function ---
const getStatusBadgeVariant = (status: EmployeeChallengeParticipation['status']): "default" | "secondary" | "destructive" | "outline" | "warning" => {
    switch (status) {
        case 'accepted': return 'warning'; // Yellowish/Orange for accepted
        case 'submitted': return 'default'; // Primary color (Teal) for submitted
        case 'approved': return 'default'; // Use default or a success variant if available (e.g., green)
        case 'rejected': return 'destructive'; // Red for rejected
        case 'pending': return 'outline';
        default: return 'secondary';
    }
};
// Safe variant getter if custom variants aren't defined
const getSafeStatusBadgeVariant = (status: EmployeeChallengeParticipation['status']): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
        case 'accepted': return 'outline';
        case 'submitted': return 'default';
        case 'approved': return 'default'; // Use default for approved
        case 'rejected': return 'destructive';
        case 'pending': return 'outline';
        default: return 'secondary';
    }
};


const getStatusText = (status: EmployeeChallengeParticipation['status']): string => {
    const map = {
        pending: 'Pendente',
        accepted: 'Aceito',
        submitted: 'Enviado',
        approved: 'Aprovado',
        rejected: 'Rejeitado',
    };
    return map[status] || status;
}

// --- Challenge Details Modal ---
interface ChallengeDetailsModalProps {
    challenge: Challenge | null;
    participation?: EmployeeChallengeParticipation | null;
    onAccept?: (challengeId: string) => void;
    onSubmit?: (challengeId: string, submissionText?: string, file?: File) => void;
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
}

function ChallengeDetailsModal({ challenge, participation, onAccept, onSubmit, isOpen, onOpenChange }: ChallengeDetailsModalProps) {
    const [submissionText, setSubmissionText] = React.useState('');
    const [submissionFile, setSubmissionFile] = React.useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const { toast } = useToast();

    React.useEffect(() => {
        // Reset form when modal opens or challenge changes
        if (isOpen) {
            setSubmissionText('');
            setSubmissionFile(null);
             // Pre-fill submission if already submitted (view mode)
            if (participation?.status === 'submitted' || participation?.status === 'approved' || participation?.status === 'rejected') {
                setSubmissionText(participation.submissionText || '');
                // Cannot pre-fill file input for security reasons
            }
        }
    }, [isOpen, challenge, participation]);

    if (!challenge) return null;

    const canAccept = challenge.participationType === 'Opcional' && (!participation || participation.status === 'pending') && challenge.status === 'active';
    const canSubmit = participation?.status === 'accepted' && challenge.status === 'active' && !isPast(parseISO(challenge.periodEndDate));
    const isReadOnly = !canSubmit && (participation?.status === 'submitted' || participation?.status === 'approved' || participation?.status === 'rejected');


    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            setSubmissionFile(event.target.files[0]);
        } else {
            setSubmissionFile(null);
        }
    };

     const handleSubmit = async () => {
        if (!onSubmit || !challenge || !canSubmit) return;
        setIsSubmitting(true);
        try {
            await onSubmit(challenge.id, submissionText, submissionFile || undefined);
            toast({ title: "Sucesso!", description: "Sua submissão foi enviada para avaliação." });
            onOpenChange(false); // Close modal on success
        } catch (error) {
            console.error("Erro ao submeter desafio:", error);
            toast({ title: "Erro", description: "Não foi possível enviar sua submissão.", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };


    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                         <Target className="h-5 w-5" /> {challenge.title}
                    </DialogTitle>
                     <DialogDescription>
                         {challenge.description}
                    </DialogDescription>
                     <div className="flex flex-wrap gap-2 pt-2">
                        <Badge variant="secondary">{challenge.difficulty}</Badge>
                        <Badge variant="outline">{challenge.points} Pontos</Badge>
                        <Badge variant={challenge.participationType === 'Obrigatório' ? 'destructive' : 'default'}>{challenge.participationType}</Badge>
                        {participation && <Badge variant={getSafeStatusBadgeVariant(participation.status)}>{getStatusText(participation.status)}</Badge>}
                    </div>
                </DialogHeader>
                <Separator className="my-4" />
                <ScrollArea className="max-h-[50vh] pr-4">
                     <div className="space-y-4 text-sm">
                        <div>
                            <h4 className="font-semibold mb-1">Período:</h4>
                             <p className="text-muted-foreground">
                                {format(parseISO(challenge.periodStartDate), 'dd/MM/yyyy')} até {format(parseISO(challenge.periodEndDate), 'dd/MM/yyyy')}
                                {challenge.status === 'active' && !isPast(parseISO(challenge.periodEndDate)) && (
                                    <span className="text-xs ml-2">({differenceInDays(parseISO(challenge.periodEndDate), new Date())} dias restantes)</span>
                                )}
                            </p>
                        </div>
                        <div>
                            <h4 className="font-semibold mb-1">Como Cumprir (Métricas):</h4>
                            <p className="text-muted-foreground">{challenge.evaluationMetrics}</p>
                        </div>
                        {challenge.supportMaterialUrl && (
                            <div>
                                <h4 className="font-semibold mb-1">Material de Apoio:</h4>
                                 <a href={challenge.supportMaterialUrl} target="_blank" rel="noopener noreferrer" className="text-accent underline hover:text-accent/80 text-xs break-all">
                                    {challenge.supportMaterialUrl}
                                </a>
                            </div>
                        )}

                        {/* Submission Section */}
                         {(canSubmit || isReadOnly) && (
                            <>
                                <Separator />
                                <div>
                                    <h4 className="font-semibold mb-2">Sua Submissão:</h4>
                                    <div className="space-y-3">
                                         <Textarea
                                            placeholder="Descreva como você cumpriu o desafio..."
                                            value={submissionText}
                                            onChange={(e) => setSubmissionText(e.target.value)}
                                            readOnly={isReadOnly}
                                            rows={4}
                                        />
                                         <div>
                                            <Label htmlFor="evidence-file" className={isReadOnly ? 'text-muted-foreground' : ''}>Anexar Evidência (Opcional):</Label>
                                            <Input
                                                id="evidence-file"
                                                type="file"
                                                onChange={handleFileChange}
                                                className="mt-1 text-xs file:text-xs" // Smaller text for file input
                                                disabled={isReadOnly}
                                            />
                                             {/* Display existing file URL if read-only and available */}
                                             {isReadOnly && participation?.submissionFileUrl && (
                                                <p className="text-xs text-muted-foreground mt-1">Arquivo anexado: <span className="font-medium">{participation.submissionFileUrl.split('/').pop()}</span></p>
                                            )}
                                            {/* Display selected file name if submitting */}
                                            {!isReadOnly && submissionFile && (
                                                <p className="text-xs text-muted-foreground mt-1">Arquivo selecionado: <span className="font-medium">{submissionFile.name}</span></p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </>
                         )}
                         {/* Evaluation Feedback Section */}
                         {(participation?.status === 'approved' || participation?.status === 'rejected') && participation.feedback && (
                             <>
                                <Separator />
                                 <div>
                                    <h4 className="font-semibold mb-1">Feedback do Avaliador:</h4>
                                     <p className="text-muted-foreground p-2 bg-muted/50 rounded-md">{participation.feedback}</p>
                                </div>
                             </>
                         )}

                    </div>
                 </ScrollArea>

                 <DialogFooter className="mt-6 gap-2 flex-col sm:flex-row"> {/* Adjusted for responsiveness */}
                    <DialogClose asChild>
                        <Button type="button" variant="secondary" className="w-full sm:w-auto">Fechar</Button>
                    </DialogClose>
                    {canAccept && onAccept && (
                        <Button onClick={() => { onAccept(challenge.id); onOpenChange(false); }} className="w-full sm:w-auto">
                            <CheckCircle className="mr-2 h-4 w-4"/> Aceitar Desafio
                        </Button>
                    )}
                    {canSubmit && onSubmit && (
                         <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full sm:w-auto">
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isSubmitting ? 'Enviando...' : 'Enviar Conclusão'}
                         </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}


// --- Main Page Component ---
export default function EmployeeChallengesPage() {
    const [availableChallenges, setAvailableChallenges] = React.useState<Challenge[]>([]);
    const [activeChallenges, setActiveChallenges] = React.useState<Challenge[]>([]);
    const [completedChallenges, setCompletedChallenges] = React.useState<Challenge[]>([]);
    const [participations, setParticipations] = React.useState<EmployeeChallengeParticipation[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [selectedChallenge, setSelectedChallenge] = React.useState<Challenge | null>(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = React.useState(false);
    const { toast } = useToast();

    const loadChallengesData = React.useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await fetchEmployeeChallenges(CURRENT_EMPLOYEE_ID);
            setAvailableChallenges(data.available);
            setActiveChallenges(data.active);
            setCompletedChallenges(data.completed);
            setParticipations(data.participations);
        } catch (error) {
            console.error("Erro ao carregar desafios:", error);
            toast({ title: "Erro", description: "Não foi possível carregar seus desafios.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    React.useEffect(() => {
        loadChallengesData();
    }, [loadChallengesData]);


    const handleAcceptChallenge = async (challengeId: string) => {
        try {
            await acceptChallenge(CURRENT_EMPLOYEE_ID, challengeId);
            toast({ title: "Desafio Aceito!", description: "Você começou um novo desafio.", });
            loadChallengesData(); // Refresh lists
        } catch (error) {
            console.error("Erro ao aceitar desafio:", error);
            toast({ title: "Erro", description: "Não foi possível aceitar o desafio.", variant: "destructive" });
        }
    };

    const handleSubmitChallenge = async (challengeId: string, submissionText?: string, file?: File) => {
         // The actual API call happens here, passed from the modal
         await submitChallenge(CURRENT_EMPLOYEE_ID, challengeId, submissionText, file);
         loadChallengesData(); // Refresh lists after submission
    };

    const openDetailsModal = (challenge: Challenge) => {
        setSelectedChallenge(challenge);
        setIsDetailsModalOpen(true);
    }

    const getParticipationForChallenge = (challengeId: string): EmployeeChallengeParticipation | undefined => {
        return participations.find(p => p.challengeId === challengeId);
    }

    const renderChallengeCard = (challenge: Challenge, listType: 'available' | 'active' | 'completed') => {
        const participation = getParticipationForChallenge(challenge.id);
        let statusText = challenge.status;
        let statusVariant: "default" | "secondary" | "destructive" | "outline" = 'secondary';

        if (listType !== 'available') {
            statusText = participation ? getStatusText(participation.status) : 'Erro';
            statusVariant = participation ? getSafeStatusBadgeVariant(participation.status) : 'destructive';
        } else if (challenge.status === 'scheduled') {
             statusText = `Inicia em ${format(parseISO(challenge.periodStartDate), 'dd/MM')}`;
             statusVariant = 'outline';
        }


        return (
             <Card key={challenge.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                    <div className="flex justify-between items-start gap-2">
                        <CardTitle className="text-base">{challenge.title}</CardTitle>
                         {listType !== 'available' && <Badge variant={statusVariant}>{statusText}</Badge>}
                    </div>
                    <CardDescription className="text-xs pt-1 line-clamp-2 h-8">{challenge.description}</CardDescription> {/* Fixed height */}
                </CardHeader>
                <CardContent className="text-xs space-y-1">
                    <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Pontos:</span>
                        <span className="font-semibold flex items-center gap-1"><Award className="h-3 w-3 text-yellow-500"/>{challenge.points}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Dificuldade:</span>
                        <span>{challenge.difficulty}</span>
                    </div>
                     <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Período:</span>
                        <span>{format(parseISO(challenge.periodStartDate), 'dd/MM')} - {format(parseISO(challenge.periodEndDate), 'dd/MM')}</span>
                    </div>
                </CardContent>
                 <CardFooter>
                    <Button size="sm" className="w-full" onClick={() => openDetailsModal(challenge)}>
                        Ver Detalhes <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                </CardFooter>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2"> {/* Responsive title */}
                 <Target className="h-6 w-6 sm:h-7 sm:w-7" /> Meus Desafios
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base"> {/* Responsive description */}
                Participe de desafios, ganhe pontos extras e desenvolva suas habilidades.
            </p>

            <Tabs defaultValue="available" className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-4">
                    <TabsTrigger value="available"><Target className="mr-1 sm:mr-2 h-4 w-4"/>Disponíveis ({isLoading ? '...' : availableChallenges.length})</TabsTrigger>
                    <TabsTrigger value="active"><Clock className="mr-1 sm:mr-2 h-4 w-4"/>Em Andamento ({isLoading ? '...' : activeChallenges.length})</TabsTrigger>
                    <TabsTrigger value="completed"><History className="mr-1 sm:mr-2 h-4 w-4"/>Histórico ({isLoading ? '...' : completedChallenges.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="available">
                    {isLoading ? (
                         <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div>
                    ) : availableChallenges.length === 0 ? (
                        <p className="text-center text-muted-foreground py-10">Nenhum novo desafio disponível no momento.</p>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {availableChallenges.map(ch => renderChallengeCard(ch, 'available'))}
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="active">
                    {isLoading ? (
                         <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div>
                    ) : activeChallenges.length === 0 ? (
                         <p className="text-center text-muted-foreground py-10">Você não está participando de nenhum desafio no momento.</p>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {activeChallenges.map(ch => renderChallengeCard(ch, 'active'))}
                        </div>
                    )}
                 </TabsContent>

                 <TabsContent value="completed">
                     {isLoading ? (
                         <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div>
                    ) : completedChallenges.length === 0 ? (
                         <p className="text-center text-muted-foreground py-10">Você ainda não completou nenhum desafio.</p>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                             {completedChallenges.map(ch => renderChallengeCard(ch, 'completed'))}
                        </div>
                    )}
                </TabsContent>
            </Tabs>

             {/* Details Modal */}
             <ChallengeDetailsModal
                challenge={selectedChallenge}
                participation={selectedChallenge ? getParticipationForChallenge(selectedChallenge.id) : null}
                onAccept={handleAcceptChallenge}
                onSubmit={handleSubmitChallenge}
                isOpen={isDetailsModalOpen}
                onOpenChange={setIsDetailsModalOpen}
             />
        </div>
    );
}
