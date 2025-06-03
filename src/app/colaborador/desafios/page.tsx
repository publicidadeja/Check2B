
 'use client';

 import * as React from 'react';
 import { Target, CheckCircle, Clock, Award, History, Filter, Loader2, Info, ArrowRight, FileText, Upload, Link as LinkIcon, Calendar, Trophy, Eye, ArrowLeft, Frown, CalendarDays, ListFilter, Search, X, CheckCircle2 } from 'lucide-react';
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
 import { format, parseISO, differenceInDays, isPast, isValid, isBefore } from 'date-fns';
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
 import { cn } from '@/lib/utils';
 import { Skeleton } from "@/components/ui/skeleton";
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
 import { LoadingSpinner } from '@/components/ui/loading-spinner';
 import { useAuth } from '@/hooks/use-auth';
 import { getUserProfileData } from '@/lib/auth';
 import type { UserProfile } from '@/types/user';

 import type { Challenge, ChallengeParticipation } from '@/types/challenge';
 import {
    getAllChallenges,
    getChallengeParticipationsByEmployee,
    acceptChallengeForEmployee,
    submitChallengeForEmployee,
    uploadChallengeSubmissionFile
 } from '@/lib/challenge-service';


 interface ChallengeDetailsModalProps {
     challenge: Challenge | null;
     participation?: ChallengeParticipation | null;
     onAccept?: (challengeId: string) => void;
     onSubmit?: (challengeId: string, submissionText?: string, fileUrl?: string) => void;
     isOpen: boolean;
     onOpenChange: (open: boolean) => void;
     organizationId: string | null;
     employeeId: string | null;
 }

 const getSafeStatusBadgeVariant = (status: ChallengeParticipation['status']): "default" | "secondary" | "destructive" | "outline" => {
     switch (status) {
         case 'accepted': return 'outline';
         case 'submitted': return 'default';
         case 'approved': return 'secondary';
         case 'rejected': return 'destructive';
         case 'pending': return 'outline';
         default: return 'secondary';
     }
 };

 const getStatusText = (status: ChallengeParticipation['status']): string => {
     const map = {
         pending: 'Disponível',
         accepted: 'Aceito',
         submitted: 'Enviado',
         approved: 'Aprovado',
         rejected: 'Rejeitado',
     };
     return map[status] || status;
 }

 function ChallengeDetailsModal({ challenge, participation, onAccept, onSubmit, isOpen, onOpenChange, organizationId, employeeId }: ChallengeDetailsModalProps) {
     const [submissionText, setSubmissionText] = React.useState('');
     const [submissionFile, setSubmissionFile] = React.useState<File | null>(null);
     const [isSubmitting, setIsSubmitting] = React.useState(false);
     const fileInputRef = React.useRef<HTMLInputElement>(null);
     const { toast } = useToast();

     React.useEffect(() => {
         if (isOpen && challenge) {
             setSubmissionText(participation?.submissionText || '');
             setSubmissionFile(null);
             if (fileInputRef.current) {
                fileInputRef.current.value = '';
             }
             setIsSubmitting(false);
         } else if (!isOpen) {
            setSubmissionText('');
            setSubmissionFile(null);
            setIsSubmitting(false);
             if (fileInputRef.current) {
                fileInputRef.current.value = '';
             }
         }
     }, [isOpen, challenge, participation]);

     if (!challenge) return null;

     const startDateValid = challenge.periodStartDate && isValid(parseISO(challenge.periodStartDate));
     const endDateValid = challenge.periodEndDate && isValid(parseISO(challenge.periodEndDate));
     if (!startDateValid || !endDateValid) {
         return (
             <Dialog open={isOpen} onOpenChange={onOpenChange}>
                 <DialogContent>
                     <DialogHeader><DialogTitle>Erro no Desafio</DialogTitle><DialogDescription>Datas inválidas para este desafio.</DialogDescription></DialogHeader>
                     <DialogFooter><DialogClose asChild><Button variant="secondary">Fechar</Button></DialogClose></DialogFooter>
                 </DialogContent>
             </Dialog>
         );
     }

     const endDate = parseISO(challenge.periodEndDate + "T23:59:59.999Z");
     const startDate = parseISO(challenge.periodStartDate);
     const isChallengeOver = isPast(endDate);
     const isChallengeNotStarted = isBefore(new Date(), startDate);

     const canSubmit = participation?.status === 'accepted' &&
                       (challenge.status === 'active' || challenge.status === 'evaluating' || (challenge.status === 'scheduled' && !isChallengeNotStarted)) &&
                       (!isChallengeOver || challenge.status === 'evaluating');

     const canAccept = challenge.participationType === 'Opcional' &&
                       (!participation || participation.status === 'pending') &&
                       !isChallengeOver && !isChallengeNotStarted &&
                       (challenge.status === 'active' || (challenge.status === 'scheduled' && !isChallengeNotStarted));

     const isReadOnly = !canSubmit && (participation?.status === 'submitted' || participation?.status === 'approved' || participation?.status === 'rejected');
     const isPendingAcceptance = !participation || participation.status === 'pending';

     const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
         const file = event.target.files?.[0];
         if (file) {
             if (file.size > 10 * 1024 * 1024) { // 10MB limit
                toast({title: "Arquivo Grande", description: "O arquivo não pode exceder 10MB.", variant: "destructive"});
                if (event.target) event.target.value = '';
                setSubmissionFile(null);
             } else {
                 setSubmissionFile(file);
             }
         } else {
             setSubmissionFile(null);
         }
     };

     const handleSubmitModal = async () => {
         if (!onSubmit || !challenge || !canSubmit) return;
         if (!submissionText?.trim() && !submissionFile) {
             toast({ title: "Submissão Vazia", description: "Forneça uma descrição ou anexe um arquivo para concluir.", variant: "destructive" });
             return;
         }
         if (!organizationId || !employeeId) {
            toast({ title: "Erro", description: "ID da organização ou do colaborador não encontrado.", variant: "destructive" });
            return;
        }

         setIsSubmitting(true);
         let fileUrl: string | undefined = undefined;

         try {
             if (submissionFile) {
                 fileUrl = await uploadChallengeSubmissionFile(organizationId, challenge.id, employeeId, submissionFile);
             }
             await onSubmit(challenge.id, submissionText, fileUrl);
             toast({ title: "Sucesso!", description: "Sua conclusão foi enviada para avaliação." });
             onOpenChange(false);
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
             <DialogContent className="sm:max-w-md max-h-[90svh] flex flex-col p-0">
                  {challenge.imageUrl && (
                    <div className="relative h-32 sm:h-40 w-full flex-shrink-0">
                        <img src={challenge.imageUrl} alt={challenge.title} className="absolute inset-0 h-full w-full object-cover" data-ai-hint="challenge competition achievement"/>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent"></div>
                        <Button variant="ghost" size="icon" className="absolute top-2 left-2 h-8 w-8 rounded-full bg-black/30 text-white hover:bg-black/50" onClick={() => onOpenChange(false)}>
                             <ArrowLeft className="h-5 w-5"/><span className="sr-only">Voltar</span>
                         </Button>
                     </div>
                  )}
                  {!challenge.imageUrl && (
                     <DialogHeader className='p-4 pb-2 border-b relative'>
                          <DialogTitle className="text-lg flex items-center gap-2"><Target className="h-5 w-5 flex-shrink-0 text-primary" /><span className="flex-1">{challenge.title}</span></DialogTitle>
                           <DialogDescription className="text-xs line-clamp-3 pt-1">{challenge.description}</DialogDescription>
                         <DialogClose asChild><Button variant="ghost" size="icon" className="absolute top-3 right-3 h-7 w-7 text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /><span className="sr-only">Fechar</span></Button></DialogClose>
                     </DialogHeader>
                  )}
                 <ScrollArea className="flex-grow px-4 py-3">
                      <div className="space-y-4 text-sm">
                         <div className="flex flex-wrap gap-1">
                             <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 border-blue-300 text-blue-700 bg-blue-50 dark:bg-blue-900/30">{challenge.difficulty}</Badge>
                             <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 border-yellow-400 text-yellow-700 bg-yellow-50 dark:bg-yellow-900/30"><Award className='h-3 w-3 mr-1'/>{challenge.points} pts</Badge>
                             <Badge variant={challenge.participationType === 'Obrigatório' ? 'destructive' : 'secondary'} className="text-[10px] px-1.5 py-0.5">{challenge.participationType}</Badge>
                             {participation && participation.status !== 'pending' && <Badge variant={getSafeStatusBadgeVariant(participation.status)} className="text-[10px] px-1.5 py-0.5">{getStatusText(participation.status)}</Badge>}
                         </div>
                          <div className="bg-muted/50 p-2 rounded-md border border-muted">
                             <h4 className="font-semibold mb-0.5 text-xs text-muted-foreground flex items-center gap-1"><CalendarDays className='h-3 w-3'/>Período:</h4>
                              <p className="text-xs">
                                 {format(startDate, 'dd/MM/yy')} - {format(endDate, 'dd/MM/yy')}
                                 {!isChallengeOver && challenge.status !== 'completed' && challenge.status !== 'evaluating' && daysRemaining >= 0 && (
                                      <span className={cn("text-[10px] ml-1 font-medium", daysRemaining <= 1 ? 'text-destructive' : 'text-blue-600' )}>({daysRemaining + 1}d restantes)</span>
                                 )}
                                 {(isChallengeOver && challenge.status !== 'evaluating' && challenge.status !== 'active') && <span className="text-xs ml-1 text-destructive font-medium">(Encerrado)</span>}
                                 {isChallengeNotStarted && <span className="text-xs ml-1 text-blue-600 font-medium">(Aguardando Início)</span>}
                             </p>
                         </div>
                          <div>
                             <h4 className="font-semibold mb-0.5 text-xs text-muted-foreground flex items-center gap-1"><Trophy className='h-3 w-3'/>Como Cumprir:</h4>
                             <p className="text-xs text-foreground/90">{challenge.evaluationMetrics}</p>
                         </div>
                         {challenge.supportMaterialUrl && (
                             <div>
                                 <h4 className="font-semibold mb-0.5 text-xs text-muted-foreground flex items-center gap-1"><LinkIcon className='h-3 w-3'/>Material de Apoio:</h4>
                                  <a href={challenge.supportMaterialUrl} target="_blank" rel="noopener noreferrer" className="text-accent underline hover:text-accent/80 text-xs break-all inline-flex items-center gap-1">Abrir Link Externo <ArrowRight className="h-3 w-3" /></a>
                             </div>
                         )}
                          {(canSubmit || isReadOnly) && (
                             <>
                                 <Separator className="my-3" />
                                 <div>
                                      <h4 className="font-semibold mb-2 text-sm">{isReadOnly ? 'Sua Conclusão:' : 'Enviar Conclusão:'}</h4>
                                     <div className="space-y-3">
                                          <div>
                                              <Label htmlFor={`submission-text-${challenge.id}`} className="text-xs text-muted-foreground">Descrição {canSubmit && '(Opcional se anexar arquivo)'}</Label>
                                             <Textarea id={`submission-text-${challenge.id}`} placeholder={canSubmit ? "Descreva como cumpriu o desafio..." : ""} value={submissionText} onChange={(e) => setSubmissionText(e.target.value)} readOnly={isReadOnly} rows={3} className="mt-1 text-xs bg-background"/>
                                          </div>
                                          <div>
                                             <Label htmlFor={`evidence-file-${challenge.id}`} className={`text-xs ${isReadOnly ? 'text-muted-foreground' : 'text-muted-foreground'}`}>Anexo {canSubmit && '(Opcional se descrever)'}</Label>
                                             {!isReadOnly && (
                                                 <div className="flex items-center gap-2 mt-1">
                                                     <Input ref={fileInputRef} id={`evidence-file-${challenge.id}`} type="file" onChange={handleFileChange} className="hidden" disabled={isReadOnly}/>
                                                      <Button type="button" variant="outline" size="sm" className="text-xs h-8 bg-background" onClick={() => fileInputRef.current?.click()}><Upload className="h-3 w-3 mr-1.5" /> Selecionar Arquivo</Button>
                                                     {submissionFile && (<p className="text-xs text-muted-foreground truncate flex-1" title={submissionFile.name}><FileText className='inline h-3 w-3 mr-1'/>{submissionFile.name}</p>)}
                                                 </div>
                                             )}
                                              {isReadOnly && participation?.submissionFileUrl && (
                                                 <div className="mt-1">
                                                      <Button asChild variant="link" size="sm" className="p-0 h-auto text-xs text-accent">
                                                          <a href={participation.submissionFileUrl} target="_blank" rel="noopener noreferrer"><FileText className="inline h-3 w-3 mr-1"/> Ver Anexo</a>
                                                      </Button>
                                                 </div>
                                             )}
                                              {isReadOnly && !participation?.submissionFileUrl && !participation?.submissionText && (<p className="text-xs text-muted-foreground italic mt-1">Nenhuma descrição ou anexo fornecido.</p>)}
                                         </div>
                                     </div>
                                 </div>
                             </>
                          )}
                          {(participation?.status === 'approved' || participation?.status === 'rejected') && (
                              <>
                                 <Separator className="my-3"/>
                                  <div>
                                     <h4 className="font-semibold mb-1 text-sm">Resultado da Avaliação:</h4>
                                     <div className="flex items-center gap-2 mb-1.5">
                                          <Badge variant={getSafeStatusBadgeVariant(participation.status)} className="text-xs">{getStatusText(participation.status)}</Badge>
                                          {participation.status === 'approved' && participation.score !== undefined && <span className='text-xs font-semibold text-green-600'>+{participation.score} pts</span>}
                                      </div>
                                     {participation.feedback && (<div className="text-xs text-muted-foreground p-2 bg-muted/50 rounded-md border border-muted mt-1 space-y-1"><p className='font-medium text-foreground/80'>Feedback:</p><p>{participation.feedback}</p></div>)}
                                     {!participation.feedback && <p className="text-xs italic text-muted-foreground mt-1">Nenhum feedback fornecido.</p>}
                                 </div>
                              </>
                          )}
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
                  <DialogFooter className="mt-auto p-4 border-t bg-background gap-2 flex-col sm:flex-row">
                     {canAccept && onAccept && (<Button onClick={() => { onAccept(challenge.id); onOpenChange(false); }} className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white"><CheckCircle2 className="mr-2 h-4 w-4"/> Aceitar Desafio</Button>)}
                     {canSubmit && onSubmit && (<Button onClick={handleSubmitModal} disabled={isSubmitting || (!submissionText && !submissionFile)} className="w-full sm:w-auto">{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{isSubmitting ? 'Enviando...' : 'Enviar Conclusão'}</Button>)}
                     {isReadOnly && (<Button disabled variant="outline" className="w-full sm:w-auto">{participation?.status === 'submitted' ? 'Enviado para Avaliação' : 'Avaliação Concluída'}</Button>)}
                     {isPendingAcceptance && !canAccept && (<Button disabled variant="outline" className="w-full sm:w-auto">{isChallengeNotStarted ? 'Aguardando Início' : 'Desafio Indisponível'}</Button>)}
                 </DialogFooter>
             </DialogContent>
         </Dialog>
     );
 }

 export default function EmployeeChallengesPage() {
     const [allChallenges, setAllChallenges] = React.useState<Challenge[]>([]);
     const [participations, setParticipations] = React.useState<ChallengeParticipation[]>([]);
     const [isLoading, setIsLoading] = React.useState(true);
     const [selectedChallenge, setSelectedChallenge] = React.useState<Challenge | null>(null);
     const [isDetailsModalOpen, setIsDetailsModalOpen] = React.useState(false);
     const [searchTerm, setSearchTerm] = React.useState('');
     const [filterStatus, setFilterStatus] = React.useState<'all' | ChallengeParticipation['status']>('all');
     const [filterCategory, setFilterCategory] = React.useState<string>('all');
     const [filterDifficulty, setFilterDifficulty] = React.useState<'all' | Challenge['difficulty']>('all');
     const { toast } = useToast();
     const { user, organizationId, isLoading: authIsLoading } = useAuth();
     const CURRENT_EMPLOYEE_ID = user?.uid || null;
     const CURRENT_EMPLOYEE_NAME = user?.displayName || "Colaborador";
     const [currentUserProfile, setCurrentUserProfile] = React.useState<UserProfile | null>(null);

     const participationMap = React.useMemo(() => new Map(participations.map(p => [p.challengeId, p])), [participations]);

     const loadChallengesData = React.useCallback(async () => {
         if (!CURRENT_EMPLOYEE_ID || !organizationId || authIsLoading) {
             if (!authIsLoading && (!CURRENT_EMPLOYEE_ID || !organizationId)) setIsLoading(false);
             return;
         }
         setIsLoading(true);
         try {
             const [challengesData, participationsData, userProfileData] = await Promise.all([
                 getAllChallenges(organizationId),
                 getChallengeParticipationsByEmployee(organizationId, CURRENT_EMPLOYEE_ID),
                 getUserProfileData(CURRENT_EMPLOYEE_ID) 
             ]);
             setAllChallenges(challengesData);
             setParticipations(participationsData);
             setCurrentUserProfile(userProfileData);
         } catch (error) {
             console.error("[CollabChallengesPage] Erro ao carregar desafios e participações:", error);
             toast({ title: "Erro", description: "Não foi possível carregar seus desafios.", variant: "destructive" });
         } finally {
             setIsLoading(false);
         }
     }, [toast, CURRENT_EMPLOYEE_ID, organizationId, authIsLoading]);

     React.useEffect(() => {
         loadChallengesData();
     }, [loadChallengesData]);

     const handleAcceptChallenge = async (challengeId: string) => {
         if (!CURRENT_EMPLOYEE_ID || !organizationId) return;
         setIsLoading(true); 
         try {
             await acceptChallengeForEmployee(organizationId, challengeId, CURRENT_EMPLOYEE_ID, CURRENT_EMPLOYEE_NAME);
             toast({ title: "Desafio Aceito!", description: `Você começou o desafio: "${allChallenges.find(c => c.id === challengeId)?.title}".`, });
             await loadChallengesData(); 
         } catch (error: any) {
             console.error("[CollabChallengesPage] Erro ao aceitar desafio:", error);
             toast({ title: "Erro", description: error.message || "Não foi possível aceitar o desafio.", variant: "destructive" });
         } finally {
             setIsLoading(false);
         }
     };

      const handleSubmitChallenge = async (challengeId: string, submissionText?: string, fileUrl?: string) => {
         if (!CURRENT_EMPLOYEE_ID || !organizationId) return;
         try {
             await submitChallengeForEmployee(organizationId, challengeId, CURRENT_EMPLOYEE_ID, submissionText, fileUrl);
             await loadChallengesData();
         } catch (error: any) {
             console.error("[CollabChallengesPage] Erro ao submeter desafio (na página):", error);
             toast({ title: "Erro na Submissão", description: error.message || "Falha ao registrar submissão.", variant: "destructive" });
         }
     };

     const openDetailsModal = (challenge: Challenge) => {
         setSelectedChallenge(challenge);
         setIsDetailsModalOpen(true);
     }

     const getParticipationForChallenge = (challengeId: string): ChallengeParticipation | undefined => {
         return participationMap.get(challengeId);
     }

     const categorizedChallenges = React.useMemo(() => {
        const available: Challenge[] = [];
        const active: Challenge[] = [];
        const completed: Challenge[] = [];

        allChallenges.forEach(challenge => {
            const participation = getParticipationForChallenge(challenge.id);
            const participationStatus = participation?.status || 'pending';

            const startDateValid = challenge.periodStartDate && isValid(parseISO(challenge.periodStartDate));
            const endDateValid = challenge.periodEndDate && isValid(parseISO(challenge.periodEndDate));
            if (!startDateValid || !endDateValid) {
                console.warn(`[CollabChallengesPage] Challenge ${challenge.id} has invalid dates. Start: ${challenge.periodStartDate}, End: ${challenge.periodEndDate}`);
                return;
            }

            const endDate = parseISO(challenge.periodEndDate + "T23:59:59.999Z");
            const startDate = parseISO(challenge.periodStartDate);
            const isChallengePeriodOver = isPast(endDate);
            const isChallengeNotStartedYet = isBefore(new Date(), startDate);

            let isEligible = false;
            if (challenge.eligibility.type === 'all') {
                isEligible = true;
            } else if (currentUserProfile) { // Only check specific eligibility if profile is loaded
                if (challenge.eligibility.type === 'department' && currentUserProfile.department && challenge.eligibility.entityIds?.includes(currentUserProfile.department)) isEligible = true;
                else if (challenge.eligibility.type === 'role' && currentUserProfile.userRole && challenge.eligibility.entityIds?.includes(currentUserProfile.userRole)) isEligible = true;
                else if (challenge.eligibility.type === 'individual' && challenge.eligibility.entityIds?.includes(CURRENT_EMPLOYEE_ID!)) isEligible = true;
            } else if (challenge.eligibility.type === 'individual' && challenge.eligibility.entityIds?.includes(CURRENT_EMPLOYEE_ID!)) {
                 // Still allow individual eligibility check even if full profile isn't loaded (UID is enough)
                isEligible = true;
            }


            if (!isEligible || challenge.status === 'draft' || challenge.status === 'archived') return;

            if (challenge.status === 'active' || (challenge.status === 'scheduled' && !isChallengeNotStartedYet)) {
                if (participationStatus === 'pending' && !isChallengePeriodOver) {
                    available.push(challenge);
                } else if (participationStatus === 'accepted' || participationStatus === 'submitted') {
                    if (!isChallengePeriodOver || challenge.status === 'evaluating') { // Keep active if evaluating even if period is over
                        active.push(challenge);
                    } else {
                        completed.push(challenge); 
                    }
                } else if (participationStatus === 'approved' || participationStatus === 'rejected') {
                    completed.push(challenge);
                }
            } else if (challenge.status === 'evaluating') {
                 if (participationStatus === 'accepted' || participationStatus === 'submitted') {
                     active.push(challenge);
                 } else if (participationStatus === 'approved' || participationStatus === 'rejected') {
                     completed.push(challenge);
                 }
            } else if (challenge.status === 'completed') {
                completed.push(challenge);
            } else if (challenge.status === 'scheduled' && isChallengeNotStartedYet) {
                if (participationStatus === 'pending') { // Show future challenges as available if pending
                    available.push(challenge);
                }
            }
        });

        available.sort((a,b) => parseISO(a.periodStartDate).getTime() - parseISO(b.periodStartDate).getTime());
        active.sort((a,b) => parseISO(a.periodEndDate).getTime() - parseISO(b.periodEndDate).getTime());
        completed.sort((a,b) => {
            const pA = getParticipationForChallenge(a.id);
            const pB = getParticipationForChallenge(b.id);
            const dateA = pA?.submittedAt || pA?.evaluatedAt || parseISO(a.periodEndDate);
            const dateB = pB?.submittedAt || pB?.evaluatedAt || parseISO(b.periodEndDate);
            return (dateB instanceof Date ? dateB.getTime() : 0) - (dateA instanceof Date ? dateA.getTime() : 0);
        });

        return { available, active, completed };
    }, [allChallenges, participations, participationMap, CURRENT_EMPLOYEE_ID, currentUserProfile]);


      const filterChallenges = (challenges: Challenge[]): Challenge[] => {
         return challenges.filter(ch => {
             const participation = getParticipationForChallenge(ch.id);
             const participationStatus = participation?.status || 'pending';
             const searchTermLower = searchTerm.toLowerCase();
             const matchesSearch = searchTermLower === '' || ch.title.toLowerCase().includes(searchTermLower) || ch.description.toLowerCase().includes(searchTermLower);
             const matchesStatus = filterStatus === 'all' || participationStatus === filterStatus;
             const matchesCategory = filterCategory === 'all' || (ch.category && ch.category === filterCategory);
             const matchesDifficulty = filterDifficulty === 'all' || ch.difficulty === filterDifficulty;
             return matchesSearch && matchesStatus && matchesCategory && matchesDifficulty;
         });
     };

     const filteredAvailable = filterChallenges(categorizedChallenges.available);
     const filteredActive = filterChallenges(categorizedChallenges.active);
     const filteredCompleted = filterChallenges(categorizedChallenges.completed);

     const availableCategories = React.useMemo(() => {
         const allCats = allChallenges.map(c => c.category).filter((c): c is string => !!c);
         return ['all', ...Array.from(new Set(allCats)).sort()];
     }, [allChallenges]);

     const renderChallengeCard = (challenge: Challenge, listType: 'available' | 'active' | 'completed') => {
         const participation = getParticipationForChallenge(challenge.id);
         const participationStatus = participation?.status || 'pending';
         const statusText = getStatusText(participationStatus);
         const statusVariant = getSafeStatusBadgeVariant(participationStatus);
         const startDateValid = challenge.periodStartDate && isValid(parseISO(challenge.periodStartDate));
         const endDateValid = challenge.periodEndDate && isValid(parseISO(challenge.periodEndDate));
         if (!startDateValid || !endDateValid) {
             return <Card key={challenge.id} className="shadow-sm p-3 text-xs text-destructive border-destructive">Erro: Datas inválidas para o desafio "{challenge.title}".</Card>;
         }
         const endDate = parseISO(challenge.periodEndDate + "T23:59:59.999Z");
         const isChallengeOver = isPast(endDate);
         const daysRemaining = differenceInDays(endDate, new Date());

         return (
               <Card key={challenge.id} className="shadow-sm flex flex-col bg-card hover:shadow-lg transition-shadow duration-200 overflow-hidden border rounded-lg">
                 <div className="relative h-24 w-full bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30">
                     {challenge.imageUrl ? (<img src={challenge.imageUrl} alt="" className="h-full w-full object-cover opacity-80" data-ai-hint="abstract challenge goal achievement"/>)
                      : (<div className="flex items-center justify-center h-full"><Target className="h-10 w-10 text-purple-300 dark:text-purple-700" /></div>)}
                      <Badge variant={statusVariant} className="absolute top-2 right-2 text-[9px] px-1.5 py-0.5 leading-tight shadow">{statusText}</Badge>
                 </div>
                 <CardHeader className="p-3 pb-1"><CardTitle className="text-sm font-semibold line-clamp-1">{challenge.title}</CardTitle><CardDescription className="text-[10px] pt-0 line-clamp-2 h-7">{challenge.description}</CardDescription></CardHeader>
                 <CardContent className="text-[10px] px-3 space-y-0.5 flex-grow">
                     <div className="flex justify-between items-center"><span className="text-muted-foreground flex items-center gap-1"><Award className="h-3 w-3"/>Pontos:</span><span className="font-semibold">{challenge.points}</span></div>
                     <div className="flex justify-between items-center"><span className="text-muted-foreground flex items-center gap-1"><CalendarDays className="h-3 w-3"/>Prazo:</span><span className={cn("font-medium", isChallengeOver && listType !== 'completed' ? "text-destructive" : (daysRemaining >= 0 && daysRemaining <= 1 ? "text-orange-600" : ""))}>{format(endDate, 'dd/MM/yy')}{!isChallengeOver && daysRemaining >= 0 && ` (${daysRemaining + 1}d)`}</span></div>
                 </CardContent>
                 <CardFooter className="p-2 border-t mt-2 bg-muted/30"><Button size="xs" variant="secondary" className="w-full h-7 text-xs font-medium" onClick={() => openDetailsModal(challenge)}><Eye className="h-3 w-3 mr-1"/> Ver Detalhes</Button></CardFooter>
             </Card>
         );
     }

      const renderSkeletonCards = (count: number) => (
         Array.from({ length: count }).map((_, index) => (
             <Card key={`skeleton-${index}`} className="shadow-sm flex flex-col border rounded-lg overflow-hidden">
                 <Skeleton className="h-24 w-full bg-muted/50" /><CardHeader className="p-3 pb-1"><Skeleton className="h-4 w-3/4 mb-1 bg-muted/50" /><Skeleton className="h-3 w-full bg-muted/40" /><Skeleton className="h-3 w-1/2 bg-muted/40" /></CardHeader><CardContent className="text-[10px] px-3 space-y-1.5 flex-grow"><Skeleton className="h-3 w-3/4 bg-muted/40" /><Skeleton className="h-3 w-1/2 bg-muted/40" /></CardContent><CardFooter className="p-2 border-t mt-2 bg-muted/30"><Skeleton className="h-7 w-full bg-muted/50" /></CardFooter>
             </Card>
          ))
     );

     if (authIsLoading) {
        return <div className="flex justify-center items-center h-full py-10"><LoadingSpinner text="Autenticando..." /></div>;
    }
    if (!CURRENT_EMPLOYEE_ID && !authIsLoading) {
        return (
            <Card className="m-4 p-4 text-center">
                <CardHeader><CardTitle>Acesso Negado</CardTitle></CardHeader>
                <CardContent><p className="text-destructive">Você precisa estar logado para ver seus desafios.</p><Button asChild className="mt-4"><Link href="/login">Fazer Login</Link></Button></CardContent>
            </Card>
        );
    }
     if (!organizationId && !authIsLoading) {
        return (
            <Card className="m-4 p-4 text-center">
                <CardHeader><CardTitle>Organização Não Encontrada</CardTitle></CardHeader>
                <CardContent><p className="text-destructive">Sua conta não está vinculada a uma organização.</p></CardContent>
            </Card>
        );
    }


     return (
          <div className="space-y-4 p-4">
                <Card className="p-3 shadow-sm bg-muted/30 border">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 items-center">
                        <div className="relative"><Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input placeholder="Buscar desafios..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-8 h-8 text-xs"/></div>
                         <Select value={filterStatus} onValueChange={(value) => setFilterStatus(value as any)}><SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all" className="text-xs">Todos Status</SelectItem><SelectItem value="pending" className="text-xs">Disponível</SelectItem><SelectItem value="accepted" className="text-xs">Aceito</SelectItem><SelectItem value="submitted" className="text-xs">Enviado</SelectItem><SelectItem value="approved" className="text-xs">Aprovado</SelectItem><SelectItem value="rejected" className="text-xs">Rejeitado</SelectItem></SelectContent></Select>
                          <Select value={filterCategory} onValueChange={setFilterCategory}><SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger><SelectContent>{availableCategories.map(cat => (<SelectItem key={cat} value={cat} className="text-xs capitalize">{cat === 'all' ? 'Todas Categorias' : cat}</SelectItem>))}</SelectContent></Select>
                         <Select value={filterDifficulty} onValueChange={(value) => setFilterDifficulty(value as any)}><SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all" className="text-xs">Toda Dificuldade</SelectItem><SelectItem value="Fácil" className="text-xs">Fácil</SelectItem><SelectItem value="Médio" className="text-xs">Médio</SelectItem><SelectItem value="Difícil" className="text-xs">Difícil</SelectItem></SelectContent></Select>
                    </div>
                 </Card>
                 <Tabs defaultValue="available" className="w-full">
                     <TabsList className="grid w-full grid-cols-3 h-9 bg-muted">
                         <TabsTrigger value="available" className="text-xs px-1 flex items-center gap-1"><Target className="h-3 w-3"/> Disponíveis {isLoading ? "" : `(${filteredAvailable.length})`}</TabsTrigger>
                         <TabsTrigger value="active" className="text-xs px-1 flex items-center gap-1"><Clock className="h-3 w-3"/> Em Andamento {isLoading ? "" : `(${filteredActive.length})`}</TabsTrigger>
                         <TabsTrigger value="completed" className="text-xs px-1 flex items-center gap-1"><History className="h-3 w-3"/> Histórico {isLoading ? "" : `(${filteredCompleted.length})`}</TabsTrigger>
                     </TabsList>
                      {[
                        { value: "available", challenges: filteredAvailable, emptyText: "Nenhum desafio novo disponível com os filtros atuais." },
                        { value: "active", challenges: filteredActive, emptyText: "Nenhum desafio em andamento com os filtros atuais." },
                        { value: "completed", challenges: filteredCompleted, emptyText: "Nenhum desafio concluído ou passado com os filtros atuais." }
                      ].map(tab => (
                         <TabsContent key={tab.value} value={tab.value} className="mt-4">
                              {isLoading ? (<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">{renderSkeletonCards(tab.value === 'completed' ? 8 : 4)}</div>)
                               : tab.challenges.length === 0 ? (<div className="text-center text-muted-foreground py-16 px-4"><Frown className="h-12 w-12 mx-auto mb-3 text-gray-400"/><p className="text-sm">{tab.emptyText}</p><Button variant="outline" size="sm" className="mt-4 text-xs" onClick={() => { setSearchTerm(''); setFilterStatus('all'); setFilterCategory('all'); setFilterDifficulty('all'); }}>Limpar Filtros</Button></div>)
                               : (<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">{tab.challenges.map(ch => renderChallengeCard(ch, tab.value as 'available' | 'active' | 'completed'))}</div>)}
                         </TabsContent>
                      ))}
                 </Tabs>
                  <ChallengeDetailsModal
                     challenge={selectedChallenge}
                     participation={selectedChallenge ? getParticipationForChallenge(selectedChallenge.id) : null}
                     onAccept={handleAcceptChallenge}
                     onSubmit={handleSubmitChallenge}
                     isOpen={isDetailsModalOpen}
                     onOpenChange={setIsDetailsModalOpen}
                     organizationId={organizationId}
                     employeeId={CURRENT_EMPLOYEE_ID}
                  />
             </div>
     );
 }
