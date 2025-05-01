 'use client';

 import * as React from 'react';
 import { Target, CheckCircle, Clock, Award, History, Filter, Loader2, Info, ArrowRight, FileText, Upload, Link as LinkIcon, Calendar, Trophy, Eye } from 'lucide-react'; // Added Calendar, Trophy, Eye
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
 import { cn } from '@/lib/utils'; // Import cn utility

 // Import types
 import type { Challenge } from '@/types/challenge';
 import { mockEmployees } from '@/app/employees/page';
 import { mockChallenges as allAdminChallenges, mockParticipants } from '@/app/challenges/page';

 // Mock Employee ID
 const CURRENT_EMPLOYEE_ID = '1'; // Alice Silva

 interface EmployeeChallengeParticipation {
     challengeId: string;
     employeeId: string;
     status: 'pending' | 'accepted' | 'submitted' | 'approved' | 'rejected';
     acceptedAt?: Date;
     submittedAt?: Date;
     submissionText?: string;
     submissionFileUrl?: string;
     score?: number;
     feedback?: string;
 }

 // Ensure mockCurrentParticipations is declared with 'let' if it needs reassignment
 let mockCurrentParticipations: EmployeeChallengeParticipation[] = [
     { challengeId: 'c1', employeeId: '1', status: 'approved', acceptedAt: new Date(2024, 7, 5), submittedAt: new Date(2024, 7, 9), submissionText: 'Resumos enviados.', score: 50, feedback: 'Ótimo trabalho!' },
     { challengeId: 'c2', employeeId: '1', status: 'pending' }, // Eligible but not accepted
     { challengeId: 'c3', employeeId: '1', status: 'pending' }, // Eligible but not accepted
     { challengeId: 'c4', employeeId: '1', status: 'submitted', acceptedAt: new Date(2024, 7, 29), submittedAt: new Date(2024, 7, 31), submissionText: 'Feedbacks enviados via RH.' },
     { challengeId: 'c5', employeeId: '1', status: 'accepted', acceptedAt: new Date(Date.now() - 86400000 * 2) }, // Accepted 2 days ago
      { challengeId: 'c6', employeeId: '1', status: 'pending' }, // Not eligible for Alice
 ];

 // --- Mock Fetching Functions ---
 const fetchEmployeeChallenges = async (employeeId: string): Promise<{ available: Challenge[], active: Challenge[], completed: Challenge[] }> => {
    await new Promise(resolve => setTimeout(resolve, 400)); // Reduced delay
    const employee = mockEmployees.find(e => e.id === employeeId);
    if (!employee) throw new Error("Colaborador não encontrado.");

    const employeeParticipations = mockCurrentParticipations.filter(p => p.employeeId === employeeId);
    const participationMap = new Map(employeeParticipations.map(p => [p.challengeId, p]));

    const available: Challenge[] = [];
    const active: Challenge[] = [];
    const completed: Challenge[] = [];

    allAdminChallenges.forEach(challenge => {
        let isEligible = false;
        if (challenge.status === 'draft' || challenge.status === 'archived') return; // Skip drafts/archived

        if (challenge.eligibility.type === 'all') isEligible = true;
        else if (challenge.eligibility.type === 'department' && challenge.eligibility.entityIds?.includes(employee.department)) isEligible = true;
        else if (challenge.eligibility.type === 'role' && challenge.eligibility.entityIds?.includes(employee.role)) isEligible = true;
        else if (challenge.eligibility.type === 'individual' && challenge.eligibility.entityIds?.includes(employee.id)) isEligible = true;

        if (!isEligible) return; // Skip if not eligible

        const participation = participationMap.get(challenge.id);
        const isChallengePeriodActive = !isPast(parseISO(challenge.periodEndDate)); // Check if end date hasn't passed

         if (challenge.status === 'active' || (challenge.status === 'scheduled' && !isPast(parseISO(challenge.periodStartDate)))) {
             if (!participation || participation.status === 'pending') {
                 // Available if active/scheduled (and not started), and user hasn't interacted
                 if (isChallengePeriodActive) {
                     available.push(challenge);
                 }
             } else if (participation.status === 'accepted' || participation.status === 'submitted') {
                 // Active if user accepted/submitted and period is still active or it's evaluating
                  if (isChallengePeriodActive || challenge.status === 'evaluating') {
                    active.push(challenge);
                 } else { // If period ended but not yet evaluated/completed? Move to completed?
                    completed.push(challenge);
                 }
             } else if (participation.status === 'approved' || participation.status === 'rejected') {
                 // Already evaluated, goes to completed
                 completed.push(challenge);
             }
         } else if (challenge.status === 'completed' || challenge.status === 'evaluating') {
              // If challenge is evaluating/completed, check participation status
              if (participation && (participation.status === 'approved' || participation.status === 'rejected')) {
                 completed.push(challenge); // Already done
              } else if (participation && challenge.status === 'evaluating' && ['accepted', 'submitted'].includes(participation.status)) {
                  active.push(challenge); // Still active from user perspective until evaluated
              } else if (!participation && challenge.status === 'completed') {
                  // If completed and user didn't participate, show in history
                  completed.push(challenge);
              }
         }
    });

    // Sort completed by end date descending
    completed.sort((a, b) => parseISO(b.periodEndDate).getTime() - parseISO(a.periodEndDate).getTime());


    return { available, active, completed };
 }

 // Mock action functions
 const acceptChallenge = async (employeeId: string, challengeId: string): Promise<EmployeeChallengeParticipation> => {
     await new Promise(resolve => setTimeout(resolve, 300));
     const existingIndex = mockCurrentParticipations.findIndex(p => p.employeeId === employeeId && p.challengeId === challengeId);
     let participation: EmployeeChallengeParticipation;
     if (existingIndex > -1) {
         mockCurrentParticipations[existingIndex].status = 'accepted';
         mockCurrentParticipations[existingIndex].acceptedAt = new Date();
         participation = mockCurrentParticipations[existingIndex];
     } else {
         participation = { employeeId, challengeId, status: 'accepted', acceptedAt: new Date() };
         mockCurrentParticipations.push(participation);
     }
     console.log("Challenge accepted:", participation);
     return participation;
 };

 const submitChallenge = async (employeeId: string, challengeId: string, submissionText?: string, file?: File): Promise<EmployeeChallengeParticipation> => {
     await new Promise(resolve => setTimeout(resolve, 700));
     const participationIndex = mockCurrentParticipations.findIndex(p => p.employeeId === employeeId && p.challengeId === challengeId);
     const challenge = allAdminChallenges.find(c => c.id === challengeId);

     if (participationIndex === -1 || !['accepted'].includes(mockCurrentParticipations[participationIndex].status)) {
         throw new Error("Aceite o desafio antes de submeter.");
     }
     if (!challenge || !['active', 'evaluating'].includes(challenge.status)) {
          throw new Error("Não é possível submeter este desafio (não está ativo/em avaliação).");
     }
      if (isPast(parseISO(challenge.periodEndDate)) && challenge.status !== 'evaluating') { // Allow submission if evaluating even if past end date
          throw new Error("O prazo para submissão deste desafio expirou.");
     }

     const participation = mockCurrentParticipations[participationIndex];
     participation.status = 'submitted';
     participation.submittedAt = new Date();
     participation.submissionText = submissionText;
     participation.submissionFileUrl = file ? `uploads/mock_${employeeId}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}` : undefined; // Basic name sanitization

     console.log("Challenge submitted:", participation);
     return participation;
 };

 // --- Helper Function ---
 const getSafeStatusBadgeVariant = (status: EmployeeChallengeParticipation['status']): "default" | "secondary" | "destructive" | "outline" => {
     switch (status) {
         case 'accepted': return 'outline';
         case 'submitted': return 'default'; // Use primary color for submitted
         case 'approved': return 'secondary'; // Use secondary for approved (less emphasis than submitted)
         case 'rejected': return 'destructive';
         case 'pending': return 'outline';
         default: return 'secondary';
     }
 };


 const getStatusText = (status: EmployeeChallengeParticipation['status']): string => {
     const map = {
         pending: 'Disponível', // Changed from Pendente
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
     const fileInputRef = React.useRef<HTMLInputElement>(null); // Ref for file input
     const { toast } = useToast();

     React.useEffect(() => {
         if (isOpen && challenge) {
             // Reset form fields based on current participation state when modal opens
             setSubmissionText(participation?.submissionText || '');
             setSubmissionFile(null); // Cannot pre-fill file input
             // Clear file input visually if needed
             if (fileInputRef.current) {
                fileInputRef.current.value = '';
             }
         } else if (!isOpen) {
            // Explicitly reset state when modal closes
            setSubmissionText('');
            setSubmissionFile(null);
            setIsSubmitting(false);
             if (fileInputRef.current) {
                fileInputRef.current.value = '';
             }
         }
     }, [isOpen, challenge, participation]); // Dependencies


     if (!challenge) return null;

     const isChallengeOver = isPast(parseISO(challenge.periodEndDate));
     // Allow submission if active/evaluating and not explicitly rejected/approved
      const canSubmit = participation?.status === 'accepted' &&
                       (['active', 'evaluating'].includes(challenge.status)) &&
                       (!isChallengeOver || challenge.status === 'evaluating'); // Allow submit past end date if evaluating

     const canAccept = challenge.participationType === 'Opcional' &&
                       (!participation || participation.status === 'pending') &&
                       !isChallengeOver &&
                       challenge.status !== 'completed' && // Ensure not already completed
                       challenge.status !== 'evaluating'; // Cannot accept if already evaluating

     const isReadOnly = !canSubmit && (participation?.status === 'submitted' || participation?.status === 'approved' || participation?.status === 'rejected');


     const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
         const file = event.target.files?.[0];
         if (file) {
              // Simple size check (e.g., 10MB limit)
             if (file.size > 10 * 1024 * 1024) {
                toast({title: "Arquivo Grande", description: "O arquivo não pode exceder 10MB.", variant: "destructive"});
                if (event.target) event.target.value = ''; // Clear the input
                setSubmissionFile(null);
             } else {
                 setSubmissionFile(file);
             }
         } else {
             setSubmissionFile(null);
         }
     };

     const handleSubmit = async () => {
         if (!onSubmit || !challenge || !canSubmit) return;
         // Require at least text or file for submission
          if (!submissionText?.trim() && !submissionFile) {
              toast({ title: "Submissão Vazia", description: "Forneça uma descrição ou anexe um arquivo para concluir.", variant: "destructive" });
              return;
          }

         setIsSubmitting(true);
         try {
             await onSubmit(challenge.id, submissionText, submissionFile || undefined);
             toast({ title: "Sucesso!", description: "Sua conclusão foi enviada para avaliação." });
             onOpenChange(false); // Close modal on success
         } catch (error: any) {
             console.error("Erro ao submeter desafio:", error);
             toast({ title: "Erro", description: error.message || "Não foi possível enviar sua conclusão.", variant: "destructive" });
         } finally {
             setIsSubmitting(false);
         }
     };

     const daysRemaining = differenceInDays(parseISO(challenge.periodEndDate), new Date());


     return (
         <Dialog open={isOpen} onOpenChange={onOpenChange}>
             <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col"> {/* Limit height */}
                 <DialogHeader className='pr-6'> {/* Add padding for close button */}
                      <DialogTitle className="text-lg flex items-start gap-2">
                          <Target className="h-5 w-5 flex-shrink-0 mt-1 text-primary" />
                          <span className="flex-1">{challenge.title}</span>
                      </DialogTitle>
                      <DialogDescription className="text-xs line-clamp-3">
                          {challenge.description}
                     </DialogDescription>
                     {/* Badges - More compact */}
                      <div className="flex flex-wrap gap-1 pt-2">
                         <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 border-blue-300 text-blue-700">{challenge.difficulty}</Badge>
                         <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 border-yellow-400 text-yellow-700"><Award className='h-3 w-3 mr-1'/>{challenge.points} pts</Badge>
                         <Badge variant={challenge.participationType === 'Obrigatório' ? 'destructive' : 'secondary'} className="text-[10px] px-1.5 py-0.5">{challenge.participationType}</Badge>
                         {participation && participation.status !== 'pending' && <Badge variant={getSafeStatusBadgeVariant(participation.status)} className="text-[10px] px-1.5 py-0.5">{getStatusText(participation.status)}</Badge>}
                     </div>
                 </DialogHeader>

                 {/* Scrollable Content Area */}
                 <ScrollArea className="flex-grow pr-2 -mr-2 my-2">
                      <div className="space-y-3 text-sm px-1">
                         {/* Period */}
                          <div>
                             <h4 className="font-semibold mb-0.5 text-xs text-muted-foreground flex items-center gap-1"><Calendar className='h-3 w-3'/>Período:</h4>
                              <p className="text-xs">
                                 {format(parseISO(challenge.periodStartDate), 'dd/MM/yy')} - {format(parseISO(challenge.periodEndDate), 'dd/MM/yy')}
                                 {!isChallengeOver && challenge.status !== 'completed' && challenge.status !== 'evaluating' && (
                                      <span className={cn("text-[10px] ml-1 font-medium", daysRemaining <= 1 ? 'text-destructive' : 'text-blue-600' )}>
                                        ({daysRemaining < 0 ? 0 : daysRemaining + 1}d restantes)
                                       </span>
                                 )}
                                 {(isChallengeOver && challenge.status !== 'evaluating') && <span className="text-xs ml-1 text-destructive font-medium">(Encerrado)</span>}
                             </p>
                         </div>
                         {/* Evaluation Metrics */}
                          <div>
                             <h4 className="font-semibold mb-0.5 text-xs text-muted-foreground flex items-center gap-1"><Trophy className='h-3 w-3'/>Como Cumprir:</h4>
                             <p className="text-xs">{challenge.evaluationMetrics}</p>
                         </div>
                          {/* Support Material */}
                         {challenge.supportMaterialUrl && (
                             <div>
                                 <h4 className="font-semibold mb-0.5 text-xs text-muted-foreground flex items-center gap-1"><LinkIcon className='h-3 w-3'/>Material de Apoio:</h4>
                                  <a href={challenge.supportMaterialUrl} target="_blank" rel="noopener noreferrer" className="text-accent underline hover:text-accent/80 text-xs break-all inline-flex items-center gap-1">
                                      Abrir Link Externo <ArrowRight className="h-3 w-3" />
                                 </a>
                             </div>
                         )}

                         {/* Submission Section */}
                          {(canSubmit || isReadOnly) && (
                             <>
                                 <Separator className="my-3" />
                                 <div>
                                     <h4 className="font-semibold mb-1 text-sm">{isReadOnly ? 'Sua Conclusão:' : 'Enviar Conclusão:'}</h4>
                                     <div className="space-y-3">
                                          {/* Submission Text */}
                                          <div>
                                             <Label htmlFor={`submission-text-${challenge.id}`} className="text-xs text-muted-foreground">Descrição (Opcional se anexar arquivo)</Label>
                                             <Textarea
                                                 id={`submission-text-${challenge.id}`}
                                                 placeholder="Descreva como cumpriu o desafio..."
                                                 value={submissionText}
                                                 onChange={(e) => setSubmissionText(e.target.value)}
                                                 readOnly={isReadOnly}
                                                 rows={3}
                                                 className="mt-1 text-xs"
                                             />
                                          </div>
                                          {/* Submission File */}
                                          <div>
                                             <Label htmlFor={`evidence-file-${challenge.id}`} className={`text-xs ${isReadOnly ? 'text-muted-foreground' : 'text-muted-foreground'}`}>Anexo (Opcional se descrever)</Label>
                                             {!isReadOnly && (
                                                 <div className="flex items-center gap-2 mt-1">
                                                     <Input
                                                         ref={fileInputRef}
                                                         id={`evidence-file-${challenge.id}`}
                                                         type="file"
                                                         onChange={handleFileChange}
                                                         className="hidden" // Hide default input
                                                         disabled={isReadOnly}
                                                     />
                                                      <Button type="button" variant="outline" size="sm" className="text-xs h-8" onClick={() => fileInputRef.current?.click()}>
                                                          <Upload className="h-3 w-3 mr-1.5" /> Selecionar Arquivo
                                                      </Button>
                                                     {submissionFile && (
                                                         <p className="text-xs text-muted-foreground truncate flex-1" title={submissionFile.name}>
                                                             <FileText className='inline h-3 w-3 mr-1'/>{submissionFile.name}
                                                          </p>
                                                     )}
                                                 </div>
                                             )}
                                              {isReadOnly && participation?.submissionFileUrl && (
                                                 <div className="mt-1">
                                                      <Button asChild variant="link" size="sm" className="p-0 h-auto text-xs text-accent">
                                                          <a href={participation.submissionFileUrl} target="_blank" rel="noopener noreferrer">
                                                            <FileText className="inline h-3 w-3 mr-1"/> Ver Anexo (Simulado)
                                                          </a>
                                                      </Button>
                                                 </div>
                                             )}
                                         </div>
                                     </div>
                                 </div>
                             </>
                          )}

                          {/* Evaluation Feedback Section */}
                          {(participation?.status === 'approved' || participation?.status === 'rejected') && (
                              <>
                                 <Separator className="my-3"/>
                                  <div>
                                     <h4 className="font-semibold mb-1 text-sm">Resultado da Avaliação:</h4>
                                     <div className="flex items-center gap-2 mb-1.5">
                                          <Badge variant={getSafeStatusBadgeVariant(participation.status)} className="text-xs">{getStatusText(participation.status)}</Badge>
                                          {participation.status === 'approved' && participation.score !== undefined && <span className='text-xs font-semibold text-green-600'>+{participation.score} pts</span>}
                                      </div>
                                     {participation.feedback && (
                                         <div className="text-xs text-muted-foreground p-2 bg-muted/50 rounded-md border border-muted mt-1 space-y-1">
                                             <p className='font-medium text-foreground/80'>Feedback:</p>
                                             <p>{participation.feedback}</p>
                                         </div>
                                     )}
                                 </div>
                              </>
                          )}

                     </div>
                  </ScrollArea>

                  {/* Footer Actions */}
                  <DialogFooter className="mt-auto pt-4 border-t gap-2 flex-col sm:flex-row">
                     <DialogClose asChild>
                         <Button type="button" variant="secondary" className="w-full sm:w-auto">Fechar</Button>
                     </DialogClose>
                     {canAccept && onAccept && (
                         <Button onClick={() => { onAccept(challenge.id); onOpenChange(false); }} className="w-full sm:w-auto">
                             <CheckCircle className="mr-2 h-4 w-4"/> Aceitar Desafio
                         </Button>
                     )}
                     {canSubmit && onSubmit && (
                          <Button onClick={handleSubmit} disabled={isSubmitting || (!submissionText && !submissionFile)} className="w-full sm:w-auto">
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
     const [isLoading, setIsLoading] = React.useState(true);
     const [selectedChallenge, setSelectedChallenge] = React.useState<Challenge | null>(null);
     const [isDetailsModalOpen, setIsDetailsModalOpen] = React.useState(false);
     const { toast } = useToast();

     // State for participation lookup
     const [participationMap, setParticipationMap] = React.useState<Map<string, EmployeeChallengeParticipation>>(new Map());


     const loadChallengesData = React.useCallback(async () => {
         setIsLoading(true);
         try {
             // Fetch challenges and current participations in parallel
             const [challengeData, currentParticipationsData] = await Promise.all([
                 fetchEmployeeChallenges(CURRENT_EMPLOYEE_ID),
                 Promise.resolve(mockCurrentParticipations.filter(p => p.employeeId === CURRENT_EMPLOYEE_ID)) // Replace with actual fetch if needed
             ]);

             setAvailableChallenges(challengeData.available);
             setActiveChallenges(challengeData.active);
             setCompletedChallenges(challengeData.completed);

             // Update participation map state
             setParticipationMap(new Map(currentParticipationsData.map(p => [p.challengeId, p])));

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
             const newParticipation = await acceptChallenge(CURRENT_EMPLOYEE_ID, challengeId);
             setParticipationMap(prev => new Map(prev).set(challengeId, newParticipation)); // Optimistically update map
             toast({ title: "Desafio Aceito!", description: "Você começou um novo desafio.", });
             loadChallengesData(); // Re-fetch to update lists based on new status
         } catch (error: any) {
             console.error("Erro ao aceitar desafio:", error);
             toast({ title: "Erro", description: error.message || "Não foi possível aceitar o desafio.", variant: "destructive" });
         }
     };

     const handleSubmitChallenge = async (challengeId: string, submissionText?: string, file?: File) => {
          const updatedParticipation = await submitChallenge(CURRENT_EMPLOYEE_ID, challengeId, submissionText, file);
          setParticipationMap(prev => new Map(prev).set(challengeId, updatedParticipation)); // Optimistically update map
          loadChallengesData(); // Re-fetch to update lists
     };

     const openDetailsModal = (challenge: Challenge) => {
         setSelectedChallenge(challenge);
         setIsDetailsModalOpen(true);
     }

     const getParticipationForChallenge = (challengeId: string): EmployeeChallengeParticipation | undefined => {
         return participationMap.get(challengeId);
     }

     const renderChallengeCard = (challenge: Challenge, listType: 'available' | 'active' | 'completed') => {
         const participation = getParticipationForChallenge(challenge.id);
         const participationStatus = participation?.status || 'pending';
         const statusText = getStatusText(participationStatus);
         const statusVariant = getSafeStatusBadgeVariant(participationStatus);
         const daysRemaining = differenceInDays(parseISO(challenge.periodEndDate), new Date());
         const isChallengeOver = isPast(parseISO(challenge.periodEndDate));

         return (
              <Card key={challenge.id} className="shadow-sm flex flex-col bg-card hover:shadow-md transition-shadow duration-200 overflow-hidden">
                 {/* Optional Image Header */}
                 {/* {challenge.imageUrl && <img src={challenge.imageUrl} alt={challenge.title} className="h-24 w-full object-cover"/>} */}
                 <CardHeader className="p-3">
                     <div className="flex justify-between items-start gap-2 mb-1">
                         <CardTitle className="text-sm font-semibold line-clamp-2 flex-1">{challenge.title}</CardTitle>
                          <Badge variant={statusVariant} className="text-[10px] px-1.5 py-0.5 flex-shrink-0 whitespace-nowrap">{statusText}</Badge>
                     </div>
                      <CardDescription className="text-xs pt-0.5 line-clamp-2 h-8">{challenge.description}</CardDescription>
                 </CardHeader>
                 <CardContent className="text-[10px] px-3 space-y-0.5 flex-grow">
                     <div className="flex justify-between items-center">
                         <span className="text-muted-foreground flex items-center gap-1"><Award className="h-3 w-3"/>Pontos:</span>
                         <span className="font-semibold">{challenge.points}</span>
                     </div>
                      <div className="flex justify-between items-center">
                         <span className="text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3"/>Prazo:</span>
                         <span className={cn("font-medium", isChallengeOver && listType !== 'completed' ? "text-destructive" : (daysRemaining <= 1 ? "text-orange-600" : ""))}>
                            {format(parseISO(challenge.periodEndDate), 'dd/MM/yy')}
                            {!isChallengeOver && ` (${daysRemaining + 1}d)`}
                         </span>
                     </div>
                 </CardContent>
                  <CardFooter className="p-2 border-t mt-2">
                     <Button size="xs" variant="secondary" className="w-full h-7 text-xs" onClick={() => openDetailsModal(challenge)}>
                         <Eye className="h-3 w-3 mr-1"/> Ver Detalhes
                     </Button>
                 </CardFooter>
             </Card>
         );
     }

     return (
          <div className="space-y-4">
                 <Tabs defaultValue="available" className="w-full">
                      {/* Make TabsList scrollable horizontally on small screens */}
                     <div className="overflow-x-auto scrollbar-hide pb-1 -mb-1">
                         <TabsList className="grid w-max grid-cols-3 h-9 min-w-full">
                             <TabsTrigger value="available" className="text-xs px-2">
                                 Disponíveis {isLoading ? "" : `(${availableChallenges.length})`}
                             </TabsTrigger>
                             <TabsTrigger value="active" className="text-xs px-2">
                                 Em Andamento {isLoading ? "" : `(${activeChallenges.length})`}
                             </TabsTrigger>
                             <TabsTrigger value="completed" className="text-xs px-2">
                                 Histórico {isLoading ? "" : `(${completedChallenges.length})`}
                             </TabsTrigger>
                         </TabsList>
                     </div>

                     {/* Tab Content */}
                     {[
                         { value: "available", challenges: availableChallenges, emptyText: "Nenhum desafio novo disponível." },
                         { value: "active", challenges: activeChallenges, emptyText: "Nenhum desafio em andamento." },
                         { value: "completed", challenges: completedChallenges, emptyText: "Nenhum desafio concluído ou passado." }
                     ].map(tab => (
                         <TabsContent key={tab.value} value={tab.value} className="mt-3">
                             {isLoading ? (
                                 <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div>
                             ) : tab.challenges.length === 0 ? (
                                 <div className="text-center text-muted-foreground py-16 px-4">
                                     <Target className="h-12 w-12 mx-auto mb-3 text-gray-400"/>
                                     <p className="text-sm">{tab.emptyText}</p>
                                  </div>
                             ) : (
                                  // Responsive grid with 2 columns on mobile, 3 on sm+, 4 on lg+
                                 <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                                     {tab.challenges.map(ch => renderChallengeCard(ch, tab.value as 'available' | 'active' | 'completed'))}
                                 </div>
                             )}
                         </TabsContent>
                      ))}
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
