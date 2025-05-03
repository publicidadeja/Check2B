
 'use client';

 import * as React from 'react';
 import { Target, CheckCircle, Clock, Award, History, Filter, Loader2, Info, ArrowRight, FileText, Upload, Link as LinkIcon, Calendar, Trophy, Eye, ArrowLeft, Frown, CalendarDays, ListFilter, Search, X, CheckCircle2 } from 'lucide-react'; // Added icons, replaced Award with AwardIcon
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
 import { format, parseISO, differenceInDays, isPast, isValid } from 'date-fns'; // Added isValid
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
 import { Skeleton } from "@/components/ui/skeleton"; // Import Skeleton
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'; // Added Select imports
 import { LoadingSpinner } from '@/components/ui/loading-spinner';

 // Import types
 import type { Challenge, ChallengeParticipation } from '@/types/challenge'; // Import ChallengeParticipation
 import { mockEmployeesSimple } from '@/lib/mockData/ranking'; // Updated import path
 import { mockChallenges as allAdminChallenges, mockParticipants, mockCurrentParticipations } from '@/lib/mockData/challenges'; // Updated import

 // Mock Employee ID
 const CURRENT_EMPLOYEE_ID = '1'; // Alice Silva


 // --- Mock Fetching Functions ---
 const fetchEmployeeChallenges = async (employeeId: string): Promise<{ available: Challenge[], active: Challenge[], completed: Challenge[] }> => {
     await new Promise(resolve => setTimeout(resolve, 600)); // Slightly longer delay for demo
     const employee = mockEmployeesSimple.find(e => e.id === employeeId);
     if (!employee) throw new Error("Colaborador não encontrado.");

     const employeeParticipations = mockCurrentParticipations.filter(p => p.employeeId === employeeId);
     const participationMap = new Map(employeeParticipations.map(p => [p.challengeId, p]));

     const available: Challenge[] = [];
     const active: Challenge[] = [];
     const completed: Challenge[] = [];

     allAdminChallenges.forEach(challenge => {
          // Basic date validation
         const startDateValid = challenge.periodStartDate && isValid(parseISO(challenge.periodStartDate));
         const endDateValid = challenge.periodEndDate && isValid(parseISO(challenge.periodEndDate));
         if (!startDateValid || !endDateValid) {
            console.warn(`Skipping challenge ${challenge.id} due to invalid dates.`);
            return;
         }

         const endDate = parseISO(challenge.periodEndDate);
         const startDate = parseISO(challenge.periodStartDate);
         const isChallengePeriodOver = isPast(endDate);
         const isChallengeNotStarted = new Date() < startDate;


         let isEligible = false;
         if (challenge.status === 'draft' || challenge.status === 'archived') return; // Skip drafts/archived

         if (challenge.eligibility.type === 'all') isEligible = true;
         else if (challenge.eligibility.type === 'department' && ch.eligibility.entityIds?.includes(employee.department)) isEligible = true;
         else if (challenge.eligibility.type === 'role' && ch.eligibility.entityIds?.includes(employee.role)) isEligible = true;
         else if (challenge.eligibility.type === 'individual' && ch.eligibility.entityIds?.includes(employee.id)) isEligible = true;

         if (!isEligible) return; // Skip if not eligible

         const participation = participationMap.get(challenge.id);
         const participationStatus = participation?.status || 'pending';

          // Categorize based on challenge status and participation status
          if (challenge.status === 'scheduled' && isChallengeNotStarted) {
             // Future challenges, show as available if user hasn't interacted
             if (participationStatus === 'pending') {
                 available.push(challenge);
             } else {
                 // If somehow accepted early? Edge case, maybe show in active? Or completed?
                 // For now, let's assume this state is invalid or handled server-side
             }
          } else if (challenge.status === 'active' || (challenge.status === 'scheduled' && !isChallengeNotStarted)) {
             // Active or just started challenges
             if (participationStatus === 'pending') {
                  if (!isChallengePeriodOver) available.push(challenge); // Available to accept if period not over
             } else if (participationStatus === 'accepted' || participationStatus === 'submitted') {
                  if (!isChallengePeriodOver || challenge.status === 'evaluating') {
                      active.push(challenge); // Active if accepted/submitted and period ongoing or evaluating
                  } else {
                      completed.push(challenge); // Period ended, move to completed
                  }
             } else if (participationStatus === 'approved' || participationStatus === 'rejected') {
                 completed.push(challenge); // Already evaluated
             }
          } else if (challenge.status === 'evaluating') {
              if (participationStatus === 'accepted' || participationStatus === 'submitted') {
                  active.push(challenge); // Still active for user until result
              } else {
                  completed.push(challenge); // Evaluation started, user didn't submit/accept in time or was rejected
              }
          } else if (challenge.status === 'completed') {
             completed.push(challenge); // Show all completed challenges in history
          }
     });

     // Sort completed by end date descending
     completed.sort((a, b) => parseISO(b.periodEndDate).getTime() - parseISO(a.periodEndDate).getTime());
     // Sort available by start date ascending
     available.sort((a, b) => parseISO(a.periodStartDate).getTime() - parseISO(b.periodStartDate).getTime());
      // Sort active by end date ascending (show soonest ending first)
     active.sort((a, b) => parseISO(a.periodEndDate).getTime() - parseISO(b.periodEndDate).getTime());


     return { available, active, completed };
  }

 // Mock action functions
 const acceptChallenge = async (employeeId: string, challengeId: string): Promise<ChallengeParticipation> => {
     await new Promise(resolve => setTimeout(resolve, 400)); // Faster accept
     const existingIndex = mockCurrentParticipations.findIndex(p => p.employeeId === employeeId && p.challengeId === challengeId);
     let participation: ChallengeParticipation;
     const challenge = allAdminChallenges.find(c => c.id === challengeId);
      if (!challenge || challenge.status !== 'active' && challenge.status !== 'scheduled') {
         throw new Error("Não é possível aceitar este desafio no momento.");
     }
      if (isPast(parseISO(challenge.periodEndDate))) {
           throw new Error("O prazo para aceitar este desafio expirou.");
      }

     if (existingIndex > -1) {
         if (mockCurrentParticipations[existingIndex].status !== 'pending') {
             throw new Error("Desafio já interagido.");
         }
         mockCurrentParticipations[existingIndex].status = 'accepted';
         mockCurrentParticipations[existingIndex].acceptedAt = new Date();
         participation = mockCurrentParticipations[existingIndex];
     } else {
         participation = { id:`p${Date.now()}`, employeeId, challengeId, status: 'accepted', acceptedAt: new Date(), organizationId: 'org_default' }; // Added ID and orgId
         mockCurrentParticipations.push(participation);
     }
     console.log("Challenge accepted:", participation);
     return participation;
 };

 const submitChallenge = async (employeeId: string, challengeId: string, submissionText?: string, file?: File): Promise<ChallengeParticipation> => {
     await new Promise(resolve => setTimeout(resolve, 800)); // Submission takes longer
     const participationIndex = mockCurrentParticipations.findIndex(p => p.employeeId === employeeId && p.challengeId === challengeId);
     const challenge = allAdminChallenges.find(c => c.id === challengeId);

     if (participationIndex === -1 || !['accepted'].includes(mockCurrentParticipations[participationIndex].status)) {
         throw new Error("Aceite o desafio antes de submeter.");
     }
     if (!challenge || !['active', 'evaluating', 'scheduled'].includes(challenge.status)) { // Allow submit if scheduled but started
          throw new Error("Não é possível submeter este desafio (não está ativo/em avaliação).");
     }
      if (isPast(parseISO(challenge.periodEndDate)) && challenge.status !== 'evaluating') { // Allow submission if evaluating even if past end date
          throw new Error("O prazo para submissão deste desafio expirou.");
      }
      if (new Date() < parseISO(challenge.periodStartDate)) {
           throw new Error("O desafio ainda não começou.");
      }

     const participation = mockCurrentParticipations[participationIndex];
     participation.status = 'submitted';
     participation.submittedAt = new Date();
     participation.submissionText = submissionText;
     participation.submissionFileUrl = file ? `uploads/mock_${employeeId}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}` : undefined; // Basic name sanitization

     console.log("Challenge submitted:", participation);

      // Simulate admin evaluation after a short delay for demo purposes
     setTimeout(async () => {
         console.log(`[Simulated Eval] Evaluating challenge ${challengeId} for user ${employeeId}`);
         const evalStatus = Math.random() > 0.2 ? 'approved' : 'rejected'; // 80% approval chance
         const evalFeedback = evalStatus === 'approved' ? 'Excelente trabalho!' : 'Não atendeu aos critérios. Verifique o feedback.';
         const finalScore = evalStatus === 'approved' ? challenge.points : 0;

         const finalParticipationIndex = mockCurrentParticipations.findIndex(p => p.employeeId === employeeId && p.challengeId === challengeId && p.status === 'submitted');
         if (finalParticipationIndex > -1) {
             mockCurrentParticipations[finalParticipationIndex].status = evalStatus;
             mockCurrentParticipations[finalParticipationIndex].feedback = evalFeedback;
             mockCurrentParticipations[finalParticipationIndex].score = finalScore;
             console.log(`[Simulated Eval] Challenge ${challengeId} evaluated as ${evalStatus}`);
              // NOTE: In a real app, this would trigger a notification and update the UI via listener,
              // here we rely on manual refresh or potentially force a state update if needed.
         }
     }, 5000); // Evaluate 5 seconds after submission

     return participation;
 };

 // --- Helper Function ---
 const getSafeStatusBadgeVariant = (status: ChallengeParticipation['status']): "default" | "secondary" | "destructive" | "outline" => {
     switch (status) {
         case 'accepted': return 'outline';
         case 'submitted': return 'default'; // Use primary color for submitted
         case 'approved': return 'secondary'; // Use secondary for approved (less emphasis than submitted)
         case 'rejected': return 'destructive';
         case 'pending': return 'outline';
         default: return 'secondary';
     }
 };


 const getStatusText = (status: ChallengeParticipation['status']): string => {
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
     participation?: ChallengeParticipation | null;
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
             setIsSubmitting(false); // Ensure submitting state is reset
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

      // Basic date validation on render
     const startDateValid = challenge.periodStartDate && isValid(parseISO(challenge.periodStartDate));
     const endDateValid = challenge.periodEndDate && isValid(parseISO(challenge.periodEndDate));
     if (!startDateValid || !endDateValid) {
         return ( // Render an error state inside the modal if dates are invalid
             <Dialog open={isOpen} onOpenChange={onOpenChange}>
                 <DialogContent>
                     <DialogHeader>
                         <DialogTitle>Erro no Desafio</DialogTitle>
                         <DialogDescription>Datas inválidas para este desafio.</DialogDescription>
                     </DialogHeader>
                     <DialogFooter>
                         <DialogClose asChild>
                             <Button variant="secondary">Fechar</Button>
                         </DialogClose>
                     </DialogFooter>
                 </DialogContent>
             </Dialog>
         );
     }


     const endDate = parseISO(challenge.periodEndDate);
     const startDate = parseISO(challenge.periodStartDate);
     const isChallengeOver = isPast(endDate);
     const isChallengeNotStarted = new Date() < startDate;

     // Can submit if: accepted, challenge is active OR evaluating, AND (period not over OR challenge is evaluating)
     const canSubmit = participation?.status === 'accepted' &&
                       (['active', 'evaluating'].includes(challenge.status) || (challenge.status === 'scheduled' && !isChallengeNotStarted)) &&
                       (!isChallengeOver || challenge.status === 'evaluating');

     // Can accept if: Optional, user hasn't interacted yet, period not over, challenge not completed/evaluating/draft/archived
     const canAccept = challenge.participationType === 'Opcional' &&
                       (!participation || participation.status === 'pending') &&
                       !isChallengeOver && !isChallengeNotStarted && // Cannot accept if not started or over
                       ['active', 'scheduled'].includes(challenge.status); // Must be active or scheduled (and started)

     const isReadOnly = !canSubmit && (participation?.status === 'submitted' || participation?.status === 'approved' || participation?.status === 'rejected');
     const isPendingAcceptance = !participation || participation.status === 'pending';


     const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
         const file = event.target.files?.[0];
         if (file) {
             if (file.size > 10 * 1024 * 1024) { // 10MB limit example
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

     let daysRemaining = -1;
     try {
       daysRemaining = differenceInDays(endDate, new Date());
     } catch (e) {
         console.error("Error calculating days remaining:", e);
     }


     return (
         <Dialog open={isOpen} onOpenChange={onOpenChange}>
             <DialogContent className="sm:max-w-md max-h-[90svh] flex flex-col p-0"> {/* Use svh, remove default padding */}
                  {/* Optional Image Header */}
                 {challenge.imageUrl && (
                    <div className="relative h-32 sm:h-40 w-full flex-shrink-0">
                        <img src={challenge.imageUrl} alt={challenge.title} className="absolute inset-0 h-full w-full object-cover" data-ai-hint="challenge competition achievement"/>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent"></div>
                         {/* Back Button */}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-2 left-2 h-8 w-8 rounded-full bg-black/30 text-white hover:bg-black/50"
                            onClick={() => onOpenChange(false)}
                         >
                             <ArrowLeft className="h-5 w-5"/>
                             <span className="sr-only">Voltar</span>
                         </Button>
                     </div>
                  )}

                 {/* Header (without image) */}
                  {!challenge.imageUrl && (
                     <DialogHeader className='p-4 pb-2 border-b relative'> {/* Add padding if no image */}
                          <DialogTitle className="text-lg flex items-center gap-2">
                              <Target className="h-5 w-5 flex-shrink-0 text-primary" />
                              <span className="flex-1">{challenge.title}</span>
                          </DialogTitle>
                           <DialogDescription className="text-xs line-clamp-3 pt-1">
                              {challenge.description}
                         </DialogDescription>
                         {/* Back Button (if no image) */}
                         <DialogClose asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="absolute top-3 right-3 h-7 w-7 text-muted-foreground hover:bg-muted"
                                >
                                    <X className="h-4 w-4" />
                                    <span className="sr-only">Fechar</span>
                                </Button>
                            </DialogClose>
                     </DialogHeader>
                  )}


                 {/* Scrollable Content Area */}
                 <ScrollArea className="flex-grow px-4 py-3">
                      <div className="space-y-4 text-sm">
                         {/* Badges - moved below title */}
                         <div className="flex flex-wrap gap-1">
                             <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 border-blue-300 text-blue-700 bg-blue-50 dark:bg-blue-900/30">{challenge.difficulty}</Badge>
                             <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 border-yellow-400 text-yellow-700 bg-yellow-50 dark:bg-yellow-900/30"><Award className='h-3 w-3 mr-1'/>{challenge.points} pts</Badge>
                             <Badge variant={challenge.participationType === 'Obrigatório' ? 'destructive' : 'secondary'} className="text-[10px] px-1.5 py-0.5">{challenge.participationType}</Badge>
                             {participation && participation.status !== 'pending' && <Badge variant={getSafeStatusBadgeVariant(participation.status)} className="text-[10px] px-1.5 py-0.5">{getStatusText(participation.status)}</Badge>}
                         </div>

                         {/* Period */}
                          <div className="bg-muted/50 p-2 rounded-md border border-muted">
                             <h4 className="font-semibold mb-0.5 text-xs text-muted-foreground flex items-center gap-1"><CalendarDays className='h-3 w-3'/>Período:</h4>
                              <p className="text-xs">
                                 {format(startDate, 'dd/MM/yy')} - {format(endDate, 'dd/MM/yy')}
                                 {!isChallengeOver && challenge.status !== 'completed' && challenge.status !== 'evaluating' && daysRemaining >= 0 && (
                                      <span className={cn("text-[10px] ml-1 font-medium", daysRemaining <= 1 ? 'text-destructive' : 'text-blue-600' )}>
                                        ({daysRemaining + 1}d restantes)
                                       </span>
                                 )}
                                 {(isChallengeOver && challenge.status !== 'evaluating') && <span className="text-xs ml-1 text-destructive font-medium">(Encerrado)</span>}
                                 {isChallengeNotStarted && <span className="text-xs ml-1 text-blue-600 font-medium">(Aguardando Início)</span>}
                             </p>
                         </div>
                         {/* Evaluation Metrics */}
                          <div>
                             <h4 className="font-semibold mb-0.5 text-xs text-muted-foreground flex items-center gap-1"><Trophy className='h-3 w-3'/>Como Cumprir:</h4>
                             <p className="text-xs text-foreground/90">{challenge.evaluationMetrics}</p>
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
                                      <h4 className="font-semibold mb-2 text-sm">{isReadOnly ? 'Sua Conclusão:' : 'Enviar Conclusão:'}</h4>
                                     <div className="space-y-3">
                                          {/* Submission Text */}
                                          <div>
                                              <Label htmlFor={`submission-text-${challenge.id}`} className="text-xs text-muted-foreground">Descrição {canSubmit && '(Opcional se anexar arquivo)'}</Label>
                                             <Textarea
                                                 id={`submission-text-${challenge.id}`}
                                                 placeholder={canSubmit ? "Descreva como cumpriu o desafio..." : ""}
                                                 value={submissionText}
                                                 onChange={(e) => setSubmissionText(e.target.value)}
                                                 readOnly={isReadOnly}
                                                 rows={3}
                                                 className="mt-1 text-xs bg-background"
                                             />
                                          </div>
                                          {/* Submission File */}
                                          <div>
                                             <Label htmlFor={`evidence-file-${challenge.id}`} className={`text-xs ${isReadOnly ? 'text-muted-foreground' : 'text-muted-foreground'}`}>Anexo {canSubmit && '(Opcional se descrever)'}</Label>
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
                                                      <Button type="button" variant="outline" size="sm" className="text-xs h-8 bg-background" onClick={() => fileInputRef.current?.click()}>
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
                                              {isReadOnly && !participation?.submissionFileUrl && !participation?.submissionText && (
                                                 <p className="text-xs text-muted-foreground italic mt-1">Nenhuma descrição ou anexo fornecido.</p>
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
                                     {!participation.feedback && <p className="text-xs italic text-muted-foreground mt-1">Nenhum feedback fornecido.</p>}
                                 </div>
                              </>
                          )}

                          {/* Show when challenge is pending */}
                          {isPendingAcceptance && !canAccept && !isReadOnly && (
                                <>
                                 <Separator className="my-3"/>
                                  <div className="text-center text-muted-foreground text-xs p-3 bg-muted/50 rounded-md border">
                                      {isChallengeNotStarted ? 'Este desafio ainda não começou.' : isChallengeOver ? 'Este desafio já encerrou.' : 'Aguardando início ou status.'}
                                 </div>
                               </>
                          )}

                     </div>
                  </ScrollArea>

                  {/* Footer Actions */}
                  <DialogFooter className="mt-auto p-4 border-t bg-background gap-2 flex-col sm:flex-row">
                     {/* Close button is implicit with DialogClose now */}
                      {/* <DialogClose asChild>
                          <Button type="button" variant="secondary" className="w-full sm:w-auto">Fechar</Button>
                      </DialogClose> */}
                     {canAccept && onAccept && (
                         <Button onClick={() => { onAccept(challenge.id); onOpenChange(false); }} className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white">
                             <CheckCircle2 className="mr-2 h-4 w-4"/> Aceitar Desafio
                         </Button>
                     )}
                     {canSubmit && onSubmit && (
                          <Button onClick={handleSubmit} disabled={isSubmitting || (!submissionText && !submissionFile)} className="w-full sm:w-auto">
                             {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                             {isSubmitting ? 'Enviando...' : 'Enviar Conclusão'}
                          </Button>
                     )}
                       {/* Read Only State Button */}
                       {isReadOnly && (
                             <Button disabled variant="outline" className="w-full sm:w-auto">
                                 {participation?.status === 'submitted' ? 'Enviado para Avaliação' : 'Avaliação Concluída'}
                             </Button>
                       )}
                        {/* Pending Acceptance State Button */}
                        {isPendingAcceptance && !canAccept && (
                             <Button disabled variant="outline" className="w-full sm:w-auto">
                                 {isChallengeNotStarted ? 'Aguardando Início' : 'Desafio Indisponível'}
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
     const [searchTerm, setSearchTerm] = React.useState('');
     const [filterStatus, setFilterStatus] = React.useState<'all' | ChallengeParticipation['status']>('all');
     const [filterCategory, setFilterCategory] = React.useState<string>('all');
     const [filterDifficulty, setFilterDifficulty] = React.useState<'all' | Challenge['difficulty']>('all');

     const { toast } = useToast();

     // State for participation lookup
     const [participationMap, setParticipationMap] = React.useState<Map<string, ChallengeParticipation>>(new Map());


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
          setIsLoading(true); // Show loading indicator
         try {
             const newParticipation = await acceptChallenge(CURRENT_EMPLOYEE_ID, challengeId);
             // No need to manually update map here, loadChallengesData will refresh it
             toast({ title: "Desafio Aceito!", description: `Você começou o desafio: "${allAdminChallenges.find(c => c.id === challengeId)?.title}".`, });
             await loadChallengesData(); // Re-fetch to update lists based on new status
         } catch (error: any) {
             console.error("Erro ao aceitar desafio:", error);
             toast({ title: "Erro", description: error.message || "Não foi possível aceitar o desafio.", variant: "destructive" });
             setIsLoading(false); // Stop loading on error
         }
         // setIsLoading(false); // Loading state is handled by loadChallengesData
     };

      const handleSubmitChallenge = async (challengeId: string, submissionText?: string, file?: File) => {
         // We don't set loading here as the modal handles its own submitting state
         const updatedParticipation = await submitChallenge(CURRENT_EMPLOYEE_ID, challengeId, submissionText, file);
         // No need to manually update map here, loadChallengesData will refresh it
         await loadChallengesData(); // Re-fetch to update lists
          // Toast is shown in modal on success/error
     };


     const openDetailsModal = (challenge: Challenge) => {
         setSelectedChallenge(challenge);
         setIsDetailsModalOpen(true);
     }

     const getParticipationForChallenge = (challengeId: string): ChallengeParticipation | undefined => {
         return participationMap.get(challengeId);
     }

       // Filtering Logic
      const filterChallenges = (challenges: Challenge[]): Challenge[] => {
         return challenges.filter(ch => {
             const participation = getParticipationForChallenge(ch.id);
             const participationStatus = participation?.status || 'pending';

             // Search Term Filter (Title or Description)
             const searchTermLower = searchTerm.toLowerCase();
             const matchesSearch = searchTermLower === '' ||
                                   ch.title.toLowerCase().includes(searchTermLower) ||
                                   ch.description.toLowerCase().includes(searchTermLower);

             // Status Filter
             const matchesStatus = filterStatus === 'all' || participationStatus === filterStatus;

             // Category Filter
             const matchesCategory = filterCategory === 'all' || (ch.category && ch.category === filterCategory);

             // Difficulty Filter
             const matchesDifficulty = filterDifficulty === 'all' || ch.difficulty === filterDifficulty;

             return matchesSearch && matchesStatus && matchesCategory && matchesDifficulty;
         });
     };

     const filteredAvailable = filterChallenges(availableChallenges);
     const filteredActive = filterChallenges(activeChallenges);
     const filteredCompleted = filterChallenges(completedChallenges);

     // Get unique categories for filter dropdown
     const availableCategories = React.useMemo(() => {
         const allCats = [...availableChallenges, ...activeChallenges, ...completedChallenges]
                         .map(c => c.category)
                         .filter((c): c is string => !!c); // Filter out undefined/empty and type guard
         return ['all', ...Array.from(new Set(allCats)).sort()];
     }, [availableChallenges, activeChallenges, completedChallenges]);

     const renderChallengeCard = (challenge: Challenge, listType: 'available' | 'active' | 'completed') => {
         const participation = getParticipationForChallenge(challenge.id);
         const participationStatus = participation?.status || 'pending';
         const statusText = getStatusText(participationStatus);
         const statusVariant = getSafeStatusBadgeVariant(participationStatus);

           // Basic date validation on render
         const startDateValid = challenge.periodStartDate && isValid(parseISO(challenge.periodStartDate));
         const endDateValid = challenge.periodEndDate && isValid(parseISO(challenge.periodEndDate));
         if (!startDateValid || !endDateValid) {
             return <Card key={challenge.id} className="shadow-sm p-3 text-xs text-destructive border-destructive">Erro: Datas inválidas para o desafio "{challenge.title}".</Card>;
         }

         const endDate = parseISO(challenge.periodEndDate);
         const isChallengeOver = isPast(endDate);
         const daysRemaining = differenceInDays(endDate, new Date());

         return (
               <Card key={challenge.id} className="shadow-sm flex flex-col bg-card hover:shadow-lg transition-shadow duration-200 overflow-hidden border rounded-lg">
                 {/* Image Header */}
                 <div className="relative h-24 w-full bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30">
                     {challenge.imageUrl ? (
                         <img src={challenge.imageUrl} alt="" className="h-full w-full object-cover opacity-80" data-ai-hint="abstract challenge goal achievement"/>
                     ) : (
                         <div className="flex items-center justify-center h-full">
                             <Target className="h-10 w-10 text-purple-300 dark:text-purple-700" />
                         </div>
                     )}
                      {/* Status Badge overlay */}
                      <Badge variant={statusVariant} className="absolute top-2 right-2 text-[9px] px-1.5 py-0.5 leading-tight shadow">{statusText}</Badge>
                 </div>
                 {/* Content */}
                 <CardHeader className="p-3 pb-1">
                     <CardTitle className="text-sm font-semibold line-clamp-1">{challenge.title}</CardTitle>
                     <CardDescription className="text-[10px] pt-0 line-clamp-2 h-7"> {/* Fixed height */}
                         {challenge.description}
                     </CardDescription>
                 </CardHeader>
                 <CardContent className="text-[10px] px-3 space-y-0.5 flex-grow">
                     <div className="flex justify-between items-center">
                         <span className="text-muted-foreground flex items-center gap-1"><Award className="h-3 w-3"/>Pontos:</span>
                         <span className="font-semibold">{challenge.points}</span>
                     </div>
                     <div className="flex justify-between items-center">
                         <span className="text-muted-foreground flex items-center gap-1"><CalendarDays className="h-3 w-3"/>Prazo:</span>
                         <span className={cn("font-medium", isChallengeOver && listType !== 'completed' ? "text-destructive" : (daysRemaining >= 0 && daysRemaining <= 1 ? "text-orange-600" : ""))}>
                             {format(endDate, 'dd/MM/yy')}
                              {!isChallengeOver && daysRemaining >= 0 && ` (${daysRemaining + 1}d)`}
                         </span>
                     </div>
                 </CardContent>
                 {/* Footer Action */}
                 <CardFooter className="p-2 border-t mt-2 bg-muted/30">
                     <Button size="xs" variant="secondary" className="w-full h-7 text-xs font-medium" onClick={() => openDetailsModal(challenge)}>
                         <Eye className="h-3 w-3 mr-1"/> Ver Detalhes
                     </Button>
                 </CardFooter>
             </Card>
         );
     }

     // Render skeleton cards
      const renderSkeletonCards = (count: number) => (
         Array.from({ length: count }).map((_, index) => (
             <Card key={`skeleton-${index}`} className="shadow-sm flex flex-col border rounded-lg overflow-hidden">
                 <Skeleton className="h-24 w-full bg-muted/50" />
                 <CardHeader className="p-3 pb-1">
                     <Skeleton className="h-4 w-3/4 mb-1 bg-muted/50" />
                     <Skeleton className="h-3 w-full bg-muted/40" />
                      <Skeleton className="h-3 w-1/2 bg-muted/40" />
                 </CardHeader>
                 <CardContent className="text-[10px] px-3 space-y-1.5 flex-grow">
                      <Skeleton className="h-3 w-3/4 bg-muted/40" />
                      <Skeleton className="h-3 w-1/2 bg-muted/40" />
                 </CardContent>
                 <CardFooter className="p-2 border-t mt-2 bg-muted/30">
                      <Skeleton className="h-7 w-full bg-muted/50" />
                 </CardFooter>
             </Card>
          ))
     );


     return (
          <div className="space-y-4 p-4">
                {/* Filters Section */}
                <Card className="p-3 shadow-sm bg-muted/30 border">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 items-center">
                        <div className="relative">
                             <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="Buscar desafios..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-8 h-8 text-xs"
                            />
                        </div>
                         <Select value={filterStatus} onValueChange={(value) => setFilterStatus(value as any)}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all" className="text-xs">Todos Status</SelectItem>
                                <SelectItem value="pending" className="text-xs">Disponível</SelectItem>
                                <SelectItem value="accepted" className="text-xs">Aceito</SelectItem>
                                <SelectItem value="submitted" className="text-xs">Enviado</SelectItem>
                                <SelectItem value="approved" className="text-xs">Aprovado</SelectItem>
                                <SelectItem value="rejected" className="text-xs">Rejeitado</SelectItem>
                             </SelectContent>
                         </Select>
                          <Select value={filterCategory} onValueChange={setFilterCategory}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {availableCategories.map(cat => (
                                    <SelectItem key={cat} value={cat} className="text-xs capitalize">{cat === 'all' ? 'Todas Categorias' : cat}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                         <Select value={filterDifficulty} onValueChange={(value) => setFilterDifficulty(value as any)}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                             <SelectContent>
                                <SelectItem value="all" className="text-xs">Toda Dificuldade</SelectItem>
                                <SelectItem value="Fácil" className="text-xs">Fácil</SelectItem>
                                <SelectItem value="Médio" className="text-xs">Médio</SelectItem>
                                <SelectItem value="Difícil" className="text-xs">Difícil</SelectItem>
                             </SelectContent>
                        </Select>
                    </div>
                 </Card>

                 {/* Tabs and Content */}
                 <Tabs defaultValue="available" className="w-full">
                     <TabsList className="grid w-full grid-cols-3 h-9 bg-muted">
                         <TabsTrigger value="available" className="text-xs px-1 flex items-center gap-1">
                             <Target className="h-3 w-3"/> Disponíveis {isLoading ? "" : `(${filteredAvailable.length})`}
                         </TabsTrigger>
                         <TabsTrigger value="active" className="text-xs px-1 flex items-center gap-1">
                             <Clock className="h-3 w-3"/> Em Andamento {isLoading ? "" : `(${filteredActive.length})`}
                         </TabsTrigger>
                         <TabsTrigger value="completed" className="text-xs px-1 flex items-center gap-1">
                             <History className="h-3 w-3"/> Histórico {isLoading ? "" : `(${filteredCompleted.length})`}
                         </TabsTrigger>
                     </TabsList>

                      {/* Tab Content */}
                      {[
                         { value: "available", challenges: filteredAvailable, emptyText: "Nenhum desafio novo disponível com os filtros atuais." },
                         { value: "active", challenges: filteredActive, emptyText: "Nenhum desafio em andamento com os filtros atuais." },
                         { value: "completed", challenges: filteredCompleted, emptyText: "Nenhum desafio concluído ou passado com os filtros atuais." }
                     ].map(tab => (
                         <TabsContent key={tab.value} value={tab.value} className="mt-4">
                              {isLoading ? (
                                 // Grid of Skeleton Cards
                                 <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                     {renderSkeletonCards(tab.value === 'completed' ? 8 : 4)}
                                 </div>
                             ) : tab.challenges.length === 0 ? (
                                 <div className="text-center text-muted-foreground py-16 px-4">
                                     <Frown className="h-12 w-12 mx-auto mb-3 text-gray-400"/>
                                     <p className="text-sm">{tab.emptyText}</p>
                                      <Button variant="outline" size="sm" className="mt-4 text-xs" onClick={() => { setSearchTerm(''); setFilterStatus('all'); setFilterCategory('all'); setFilterDifficulty('all'); }}>Limpar Filtros</Button>
                                  </div>
                             ) : (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
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

    