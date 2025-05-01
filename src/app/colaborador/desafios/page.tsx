
 'use client';

 import * as React from 'react';
 import { Target, CheckCircle, Clock, Award, History, Filter, Loader2, Info, ArrowRight, FileText, Upload, Link as LinkIcon } from 'lucide-react';
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
 // Removed EmployeeLayout import

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

 let mockCurrentParticipations: EmployeeChallengeParticipation[] = [
     { challengeId: 'c1', employeeId: '1', status: 'approved', acceptedAt: new Date(2024, 7, 5), submittedAt: new Date(2024, 7, 9), submissionText: 'Resumos enviados.', score: 50, feedback: 'Ótimo trabalho!' },
     { challengeId: 'c2', employeeId: '1', status: 'pending' },
     { challengeId: 'c3', employeeId: '1', status: 'pending' },
     { challengeId: 'c4', employeeId: '1', status: 'submitted', acceptedAt: new Date(2024, 7, 29), submittedAt: new Date(2024, 7, 31), submissionText: 'Feedbacks enviados via RH.' },
     { challengeId: 'c5', employeeId: '1', status: 'accepted', acceptedAt: new Date() },
 ];

 // --- Mock Fetching Functions ---
 const fetchEmployeeChallenges = async (employeeId: string): Promise<{ available: Challenge[], active: Challenge[], completed: Challenge[], participations: EmployeeChallengeParticipation[] }> => {
     await new Promise(resolve => setTimeout(resolve, 500));
     const employee = mockEmployees.find(e => e.id === employeeId);
     if (!employee) throw new Error("Colaborador não encontrado.");

     const employeeParticipations = mockCurrentParticipations.filter(p => p.employeeId === employeeId);
     const participationMap = new Map(employeeParticipations.map(p => [p.challengeId, p]));

     const available: Challenge[] = [];
     const active: Challenge[] = [];
     const completed: Challenge[] = [];

     allAdminChallenges.forEach(challenge => {
         let isEligible = false;
         if (challenge.eligibility.type === 'all') isEligible = true;
         else if (challenge.eligibility.type === 'department' && challenge.eligibility.entityIds?.includes(employee.department)) isEligible = true;
         else if (challenge.eligibility.type === 'role' && challenge.eligibility.entityIds?.includes(employee.role)) isEligible = true;
         else if (challenge.eligibility.type === 'individual' && challenge.eligibility.entityIds?.includes(employee.id)) isEligible = true;

         if (!isEligible) return;

         const participation = participationMap.get(challenge.id);

         if (challenge.status === 'active' || challenge.status === 'scheduled') {
             if (!participation || participation.status === 'pending') {
                  if (challenge.status === 'active' || (challenge.status === 'scheduled' && !isPast(parseISO(challenge.periodStartDate)))) {
                      available.push(challenge);
                  }
             } else if (participation.status === 'accepted' || participation.status === 'submitted') {
                 if (['active', 'evaluating'].includes(challenge.status) || (challenge.status === 'scheduled' && isPast(parseISO(challenge.periodStartDate)))) {
                    active.push(challenge);
                 } else if (challenge.status === 'completed' || challenge.status === 'archived') {
                    completed.push(challenge);
                 }
             } else if (participation.status === 'approved' || participation.status === 'rejected') {
                 completed.push(challenge);
             }
         } else if (challenge.status === 'completed' || challenge.status === 'evaluating' || challenge.status === 'archived') {
              if (participation && (participation.status === 'approved' || participation.status === 'rejected')) {
                 completed.push(challenge);
              } else if (participation && challenge.status === 'evaluating' && ['accepted', 'submitted'].includes(participation.status)) {
                  active.push(challenge);
              }
         }
     });

      completed.sort((a, b) => parseISO(b.periodEndDate).getTime() - parseISO(a.periodEndDate).getTime());


     return { available, active, completed, participations: employeeParticipations };
 }

 // Mock action functions
 const acceptChallenge = async (employeeId: string, challengeId: string): Promise<EmployeeChallengeParticipation> => {
     await new Promise(resolve => setTimeout(resolve, 500));
     const existingIndex = mockCurrentParticipations.findIndex(p => p.employeeId === employeeId && p.challengeId === challengeId);
     if (existingIndex > -1) {
         mockCurrentParticipations[existingIndex].status = 'accepted';
         mockCurrentParticipations[existingIndex].acceptedAt = new Date();
         console.log("Challenge accepted:", mockCurrentParticipations[existingIndex]);
         return mockCurrentParticipations[existingIndex];
     } else {
         const newParticipation: EmployeeChallengeParticipation = {
             employeeId, challengeId, status: 'accepted', acceptedAt: new Date(),
         };
         mockCurrentParticipations.push(newParticipation);
         console.log("Challenge accepted (new participation):", newParticipation);
         return newParticipation;
     }
 };

 const submitChallenge = async (employeeId: string, challengeId: string, submissionText?: string, file?: File): Promise<EmployeeChallengeParticipation> => {
     await new Promise(resolve => setTimeout(resolve, 1000));
     const participationIndex = mockCurrentParticipations.findIndex(p => p.employeeId === employeeId && p.challengeId === challengeId);
     const challenge = allAdminChallenges.find(c => c.id === challengeId);

     if (participationIndex === -1 || mockCurrentParticipations[participationIndex].status !== 'accepted') {
         throw new Error("Não é possível submeter este desafio (não aceito).");
     }
     if (!challenge || !(['active', 'evaluating'].includes(challenge.status))) { // Allow submission if evaluating
          throw new Error("Não é possível submeter este desafio (não está ativo/em avaliação).");
     }
     if (isPast(parseISO(challenge.periodEndDate))) {
          throw new Error("O prazo para submissão deste desafio expirou.");
     }

     const participation = mockCurrentParticipations[participationIndex];
     participation.status = 'submitted';
     participation.submittedAt = new Date();
     participation.submissionText = submissionText;
     participation.submissionFileUrl = file ? `uploads/mock_${employeeId}_${file.name}` : undefined;

     console.log("Challenge submitted:", participation);
     return participation;
 };

 // --- Helper Function ---
 const getSafeStatusBadgeVariant = (status: EmployeeChallengeParticipation['status']): "default" | "secondary" | "destructive" | "outline" => {
     switch (status) {
         case 'accepted': return 'outline'; // Use outline for accepted
         case 'submitted': return 'default'; // Use default (Teal) for submitted
         case 'approved': return 'secondary'; // Use secondary (grey) for approved
         case 'rejected': return 'destructive';
         case 'pending': return 'outline';
         default: return 'secondary';
     }
 };


 const getStatusText = (status: EmployeeChallengeParticipation['status']): string => {
     const map = {
         pending: 'Pendente', accepted: 'Aceito', submitted: 'Enviado', approved: 'Aprovado', rejected: 'Rejeitado',
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
         if (isOpen && challenge) {
             setSubmissionText(participation?.submissionText || '');
             setSubmissionFile(null); // Cannot pre-fill file
         } else {
            // Reset when closing or no challenge
            setSubmissionText('');
            setSubmissionFile(null);
            setIsSubmitting(false);
         }
     }, [isOpen, challenge, participation]);

     if (!challenge) return null;

     const isChallengeOver = isPast(parseISO(challenge.periodEndDate));
     const isChallengeActiveOrEvaluating = ['active', 'evaluating'].includes(challenge.status) && !isChallengeOver;

     const canAccept = challenge.participationType === 'Opcional' && (!participation || participation.status === 'pending') && !isChallengeOver && challenge.status !== 'completed' && challenge.status !== 'archived';
     const canSubmit = participation?.status === 'accepted' && isChallengeActiveOrEvaluating;
     const isReadOnly = !canSubmit && (participation?.status === 'submitted' || participation?.status === 'approved' || participation?.status === 'rejected');


     const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
         if (event.target.files && event.target.files[0]) {
             // Simple size check (e.g., 5MB limit)
             if (event.target.files[0].size > 5 * 1024 * 1024) {
                toast({title: "Arquivo Grande", description: "O arquivo não pode exceder 5MB.", variant: "destructive"});
                event.target.value = ''; // Clear the input
                setSubmissionFile(null);
             } else {
                 setSubmissionFile(event.target.files[0]);
             }
         } else {
             setSubmissionFile(null);
         }
     };

     const handleSubmit = async () => {
         if (!onSubmit || !challenge || !canSubmit) return;
         if (!submissionText && !submissionFile) {
              toast({ title: "Submissão Vazia", description: "Forneça uma descrição ou anexe um arquivo.", variant: "destructive" });
              return;
          }

         setIsSubmitting(true);
         try {
             await onSubmit(challenge.id, submissionText, submissionFile || undefined);
             toast({ title: "Sucesso!", description: "Sua submissão foi enviada." });
             onOpenChange(false);
         } catch (error: any) {
             console.error("Erro ao submeter desafio:", error);
             toast({ title: "Erro", description: error.message || "Não foi possível enviar sua submissão.", variant: "destructive" });
         } finally {
             setIsSubmitting(false);
         }
     };


     return (
         <Dialog open={isOpen} onOpenChange={onOpenChange}>
             <DialogContent className="sm:max-w-md"> {/* Adjusted max width */}
                 <DialogHeader>
                      <DialogTitle className="text-lg flex items-center gap-2"> {/* Adjusted text size */}
                          <Target className="h-5 w-5 flex-shrink-0" />
                          <span className="truncate">{challenge.title}</span>
                      </DialogTitle>
                      <DialogDescription className="text-xs line-clamp-3"> {/* Allow more lines */}
                          {challenge.description}
                     </DialogDescription>
                      <div className="flex flex-wrap gap-1 pt-1">
                         <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">{challenge.difficulty}</Badge>
                         <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">{challenge.points} pts</Badge>
                         <Badge variant={challenge.participationType === 'Obrigatório' ? 'destructive' : 'default'} className="text-[10px] px-1.5 py-0.5">{challenge.participationType}</Badge>
                         {participation && participation.status !== 'pending' && <Badge variant={getSafeStatusBadgeVariant(participation.status)} className="text-[10px] px-1.5 py-0.5">{getStatusText(participation.status)}</Badge>}
                     </div>
                 </DialogHeader>

                 <ScrollArea className="max-h-[60vh] pr-3 -mr-3 my-2"> {/* Added margin for scrollbar */}
                      <div className="space-y-3 text-sm px-1">
                         <div>
                             <h4 className="font-semibold mb-0.5 text-xs">Período:</h4>
                              <p className="text-muted-foreground text-xs">
                                 {format(parseISO(challenge.periodStartDate), 'dd/MM/yy')} - {format(parseISO(challenge.periodEndDate), 'dd/MM/yy')}
                                 {!isChallengeOver && ['active', 'scheduled', 'evaluating'].includes(challenge.status) && (
                                      <span className="text-xs ml-1 text-blue-600">({differenceInDays(parseISO(challenge.periodEndDate), new Date()) + 1}d restantes)</span>
                                 )}
                                 {isChallengeOver && <span className="text-xs ml-1 text-destructive">(Encerrado)</span>}
                             </p>
                         </div>
                         <div>
                             <h4 className="font-semibold mb-0.5 text-xs">Como Cumprir:</h4>
                             <p className="text-muted-foreground text-xs">{challenge.evaluationMetrics}</p>
                         </div>
                         {challenge.supportMaterialUrl && (
                             <div>
                                 <h4 className="font-semibold mb-0.5 text-xs">Material de Apoio:</h4>
                                  <a href={challenge.supportMaterialUrl} target="_blank" rel="noopener noreferrer" className="text-accent underline hover:text-accent/80 text-xs break-all inline-flex items-center gap-1">
                                      <LinkIcon className="h-3 w-3" /> Abrir Material
                                 </a>
                             </div>
                         )}

                         {/* Submission Section */}
                          {(canSubmit || isReadOnly) && (
                             <>
                                 <Separator className="my-2" />
                                 <div>
                                     <h4 className="font-semibold mb-1 text-xs">{isReadOnly ? 'Sua Submissão:' : 'Enviar Conclusão:'}</h4>
                                     <div className="space-y-2">
                                          <Textarea
                                             placeholder="Descreva como cumpriu..."
                                             value={submissionText}
                                             onChange={(e) => setSubmissionText(e.target.value)}
                                             readOnly={isReadOnly}
                                             rows={3}
                                             className="text-xs"
                                         />
                                          <div>
                                             <Label htmlFor="evidence-file" className={`text-xs ${isReadOnly ? 'text-muted-foreground' : ''}`}>Anexo (Opcional):</Label>
                                             <Input
                                                 id="evidence-file" type="file" onChange={handleFileChange}
                                                 className="mt-0.5 text-xs file:text-[10px] h-8"
                                                 disabled={isReadOnly}
                                             />
                                              {isReadOnly && participation?.submissionFileUrl && (
                                                  <p className="text-xs text-muted-foreground mt-0.5">Anexo:
                                                      <Button variant="link" size="sm" className="p-0 h-auto text-xs ml-1 text-accent" onClick={() => alert(`Abrir ${participation.submissionFileUrl}`)}>
                                                          {participation.submissionFileUrl.split('/').pop()} <FileText className="ml-1 h-3 w-3"/>
                                                      </Button>
                                                 </p>
                                             )}
                                             {!isReadOnly && submissionFile && (
                                                 <p className="text-xs text-muted-foreground mt-0.5">Selecionado: <span className="font-medium">{submissionFile.name}</span></p>
                                             )}
                                         </div>
                                     </div>
                                 </div>
                             </>
                          )}
                          {/* Evaluation Feedback Section */}
                          {(participation?.status === 'approved' || participation?.status === 'rejected') && (
                              <>
                                 <Separator className="my-2"/>
                                  <div>
                                     <h4 className="font-semibold mb-1 text-xs">Resultado:</h4>
                                     <div className="flex items-center gap-2 mb-0.5">
                                          <Badge variant={getSafeStatusBadgeVariant(participation.status)} className="text-[10px] px-1.5 py-0.5">{getStatusText(participation.status)}</Badge>
                                          {participation.status === 'approved' && participation.score !== undefined && <span className='text-xs font-semibold text-green-600'>+{participation.score} pts</span>}
                                      </div>
                                     {participation.feedback && <p className="text-muted-foreground p-1.5 bg-muted/50 rounded-md text-[10px] mt-1">{participation.feedback}</p>}
                                 </div>
                              </>
                          )}

                     </div>
                  </ScrollArea>

                  <DialogFooter className="mt-4 gap-2 flex-col sm:flex-row">
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
             loadChallengesData();
         } catch (error: any) {
             console.error("Erro ao aceitar desafio:", error);
             toast({ title: "Erro", description: error.message || "Não foi possível aceitar o desafio.", variant: "destructive" });
         }
     };

     const handleSubmitChallenge = async (challengeId: string, submissionText?: string, file?: File) => {
          await submitChallenge(CURRENT_EMPLOYEE_ID, challengeId, submissionText, file);
          loadChallengesData();
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
         let statusText: string | null = null;
         let statusVariant: "default" | "secondary" | "destructive" | "outline" = 'secondary';

         if (listType === 'active' || listType === 'completed') {
             if(participation) {
                  statusText = getStatusText(participation.status);
                  statusVariant = getSafeStatusBadgeVariant(participation.status);
             } else {
                 statusText = 'Status Indisponível';
                 statusVariant = 'outline';
             }
         } else if (listType === 'available' && challenge.status === 'scheduled') {
             statusText = `Inicia ${format(parseISO(challenge.periodStartDate), 'dd/MM')}`;
             statusVariant = 'outline';
         }


         return (
              <Card key={challenge.id} className="shadow-sm flex flex-col">
                 <CardHeader className="pb-2 pt-3 px-3"> {/* Reduced padding */}
                     <div className="flex justify-between items-start gap-2">
                         <CardTitle className="text-sm line-clamp-2 flex-1">{challenge.title}</CardTitle> {/* Adjusted size and clamp */}
                          {statusText && <Badge variant={statusVariant} className="text-[10px] px-1 py-0 flex-shrink-0">{statusText}</Badge>}
                     </div>
                      <CardDescription className="text-xs pt-0.5 line-clamp-2 h-8">{challenge.description}</CardDescription> {/* Fixed height */}
                 </CardHeader>
                 <CardContent className="text-[11px] px-3 space-y-0.5 flex-grow"> {/* Reduced text size and padding */}
                     <div className="flex justify-between items-center">
                         <span className="text-muted-foreground">Pontos:</span>
                         <span className="font-semibold flex items-center gap-0.5"><Award className="h-2.5 w-2.5 text-yellow-500"/>{challenge.points}</span>
                     </div>
                     <div className="flex justify-between items-center">
                         <span className="text-muted-foreground">Dificuldade:</span>
                         <span className="font-medium">{challenge.difficulty}</span>
                     </div>
                      <div className="flex justify-between items-center">
                         <span className="text-muted-foreground">Período:</span>
                         <span>{format(parseISO(challenge.periodStartDate), 'dd/MM')} - {format(parseISO(challenge.periodEndDate), 'dd/MM')}</span>
                     </div>
                 </CardContent>
                  <CardFooter className="pt-2 pb-3 px-3">
                     <Button size="sm" className="w-full h-8 text-xs" onClick={() => openDetailsModal(challenge)}>
                         Ver Detalhes
                     </Button>
                 </CardFooter>
             </Card>
         );
     }

     return (
          <div className="space-y-4"> {/* Reduced overall spacing */}
                 <Tabs defaultValue="available" className="w-full">
                     <TabsList className="grid w-full grid-cols-3 h-9">
                         <TabsTrigger value="available" className="text-xs px-1">Disponíveis ({isLoading ? '...' : availableChallenges.length})</TabsTrigger>
                         <TabsTrigger value="active" className="text-xs px-1">Em Andamento ({isLoading ? '...' : activeChallenges.length})</TabsTrigger>
                         <TabsTrigger value="completed" className="text-xs px-1">Histórico ({isLoading ? '...' : completedChallenges.length})</TabsTrigger>
                     </TabsList>

                     <TabsContent value="available" className="mt-3">
                         {isLoading ? (
                              <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div>
                         ) : availableChallenges.length === 0 ? (
                             <p className="text-center text-muted-foreground py-10 text-sm">Nenhum desafio disponível.</p>
                         ) : (
                             <div className="grid grid-cols-2 sm:grid-cols-3 gap-2"> {/* Responsive grid with smaller gap */}
                                 {availableChallenges.map(ch => renderChallengeCard(ch, 'available'))}
                             </div>
                         )}
                     </TabsContent>

                     <TabsContent value="active" className="mt-3">
                         {isLoading ? (
                              <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div>
                         ) : activeChallenges.length === 0 ? (
                              <p className="text-center text-muted-foreground py-10 text-sm">Nenhum desafio em andamento.</p>
                         ) : (
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                 {activeChallenges.map(ch => renderChallengeCard(ch, 'active'))}
                             </div>
                         )}
                      </TabsContent>

                      <TabsContent value="completed" className="mt-3">
                          {isLoading ? (
                              <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div>
                         ) : completedChallenges.length === 0 ? (
                              <p className="text-center text-muted-foreground py-10 text-sm">Nenhum desafio concluído.</p>
                         ) : (
                             <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
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

   