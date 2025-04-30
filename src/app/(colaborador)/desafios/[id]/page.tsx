
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Target, CheckCircle, Clock, Rocket, Upload, Paperclip, Award, FileWarning, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// Mock Challenge Interface (should match the main one + potentially more detail)
interface MockChallengeDetail {
  id: string;
  title: string;
  category: string;
  points: number;
  status: 'available' | 'active' | 'completed' | 'expired' | 'pending_evaluation';
  deadline?: string; // YYYY-MM-DD format
  description: string; // Full description
  evaluationMetrics: string;
  supportMaterial?: string; // URL or text
  participationType: 'Obrigatório' | 'Opcional';
  isAccepted?: boolean; // Only relevant for optional challenges
  submission?: {
    submittedAt: string; // ISO Date string
    files?: { name: string; url: string }[]; // Example file structure
    comments?: string;
    evaluation?: {
        score: number;
        feedback?: string;
        evaluatedAt: string; // ISO Date string
    }
  }
}

// Mock data (replace with actual API call based on ID)
const getMockChallengeDetail = (id: string): MockChallengeDetail | null => {
    if (id === 'ch1') return { id: 'ch1', title: 'Organização Nota 10', category: 'Qualidade', points: 50, status: 'active', deadline: '2024-08-18', description: 'Mantenha sua área de trabalho impecável durante toda a semana, seguindo o checklist 5S.', evaluationMetrics: 'Verificação visual diária pelo gestor e foto final na sexta-feira.', supportMaterial: 'Guia 5S disponível na Intranet.', participationType: 'Obrigatório', isAccepted: true };
    if (id === 'ch2') return { id: 'ch2', title: 'Feedback Construtivo', category: 'Comunicação', points: 75, status: 'active', deadline: '2024-08-20', description: 'Ofereça um feedback construtivo e bem estruturado para um colega de outra área, focando em colaboração.', evaluationMetrics: 'Envio do texto do feedback (anonimizado) e confirmação de recebimento pelo colega.', participationType: 'Opcional', isAccepted: true };
    if (id === 'ch3') return { id: 'ch3', title: 'Superando Metas', category: 'Produtividade', points: 100, status: 'available', description: 'Exceda sua meta semanal de produção/vendas em pelo menos 10%.', evaluationMetrics: 'Relatório de performance individual da semana.', participationType: 'Opcional', isAccepted: false };
     if (id === 'ch5') return {
        id: 'ch5', title: 'Atendimento Excepcional', category: 'Atendimento', points: 80, status: 'completed', deadline: '2024-08-10', description: 'Receba um elogio formal de cliente registrado no sistema de CRM.', evaluationMetrics: 'Verificação do registro no CRM.', participationType: 'Obrigatório', isAccepted: true, submission: {
             submittedAt: '2024-08-09T10:00:00Z', evaluation: { score: 80, feedback: 'Parabéns pelo excelente atendimento!', evaluatedAt: '2024-08-11T15:30:00Z'}
        }
     };
    if (id === 'ch7') return { id: 'ch7', title: 'Compartilhar Conhecimento', category: 'Colaboração', points: 60, status: 'expired', deadline: '2024-07-31', description: 'Apresente um tópico técnico ou de boas práticas relevante para a equipe.', evaluationMetrics: 'Apresentação realizada e feedback dos participantes.', participationType: 'Obrigatório', isAccepted: true };

    return null; // Not found
};


export default function DesafioDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [challenge, setChallenge] = useState<MockChallengeDetail | null>(null);
  const [submissionComments, setSubmissionComments] = useState('');
  const [submissionFiles, setSubmissionFiles] = useState<File[]>([]);

  useEffect(() => {
    setIsLoading(true);
    // Simulate API call
    const timer = setTimeout(() => {
      const data = getMockChallengeDetail(id);
      setChallenge(data);
      setIsLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, [id]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
        // Append new files to existing ones, maybe add validation/limits later
        setSubmissionFiles(prev => [...prev, ...Array.from(event.target.files!)]);
    }
   };

   const handleRemoveFile = (indexToRemove: number) => {
      setSubmissionFiles(prev => prev.filter((_, index) => index !== indexToRemove));
   };


  const handleAcceptChallenge = () => {
    if (!challenge || challenge.status !== 'available' || challenge.participationType !== 'Opcional') return;
    console.log("Accepting challenge:", challenge.id);
    // TODO: Implement API call to accept the challenge
    setIsLoading(true); // Simulate loading state
    setTimeout(() => {
         setChallenge(prev => prev ? { ...prev, status: 'active', isAccepted: true } : null);
         setIsLoading(false);
         // Show toast success
    }, 500);
  };

   const handleSubmitEvidence = (event: React.FormEvent<HTMLFormElement>) => {
     event.preventDefault();
     if (!challenge || challenge.status !== 'active') return;
     console.log("Submitting evidence for challenge:", challenge.id);
     console.log("Comments:", submissionComments);
     console.log("Files:", submissionFiles.map(f => f.name));
     setIsSubmitting(true);
     // TODO: Implement API call to submit evidence (upload files, save comments)
     setTimeout(() => {
         setChallenge(prev => prev ? {
            ...prev,
            status: 'pending_evaluation',
            submission: {
                 submittedAt: new Date().toISOString(),
                 files: submissionFiles.map(f => ({ name: f.name, url: '#' })), // Placeholder URL
                 comments: submissionComments
            }
         } : null);
         setIsSubmitting(false);
         setSubmissionComments('');
         setSubmissionFiles([]);
         // Show toast success
     }, 1500);
   };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-24" /> {/* Back button */}
        <Skeleton className="h-48 w-full" /> {/* Main Card Header/Content */}
        <Skeleton className="h-32 w-full" /> {/* Submission/Evaluation Area */}
      </div>
    );
  }

  if (!challenge) {
    return (
      <div>
        <Button variant="outline" size="sm" asChild className="mb-4">
          <Link href="/colaborador/desafios"><ArrowLeft className="mr-2 h-4 w-4"/> Voltar</Link>
        </Button>
        <Alert variant="destructive">
          <FileWarning className="h-4 w-4" />
          <AlertTitle>Desafio Não Encontrado</AlertTitle>
          <AlertDescription>
            O desafio que você está tentando acessar não foi encontrado ou não existe mais.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const isSubmissible = challenge.status === 'active';
  const isEvaluated = challenge.status === 'completed' && !!challenge.submission?.evaluation;
  const isPendingEvaluation = challenge.status === 'pending_evaluation';

  return (
    <div className="space-y-6">
      {/* Back Button */}
       <Button variant="outline" size="sm" asChild>
         <Link href="/colaborador/desafios"><ArrowLeft className="mr-2 h-4 w-4"/> Voltar para Desafios</Link>
       </Button>

      {/* Challenge Details */}
      <Card>
        <CardHeader>
           <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
               <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                        <Target className="h-6 w-6 text-primary" /> {challenge.title}
                    </CardTitle>
                    <CardDescription className="mt-1">
                        {challenge.category} - {challenge.participationType}
                     </CardDescription>
                </div>
                 <div className="flex flex-col items-end gap-1 shrink-0">
                     <Badge variant="secondary" className="text-base">+{challenge.points} pts</Badge>
                     {challenge.deadline && (
                        <Badge variant={challenge.status === 'expired' ? 'destructive' : 'outline'} className="text-xs">
                           <Clock className="mr-1 h-3 w-3"/> Prazo: {challenge.deadline}
                        </Badge>
                     )}
                </div>
           </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">{challenge.description}</p>
          <Separator />
          <div>
             <h4 className="font-semibold mb-1 text-sm">Como será avaliado:</h4>
             <p className="text-sm text-muted-foreground">{challenge.evaluationMetrics}</p>
          </div>
           {challenge.supportMaterial && (
               <div>
                 <h4 className="font-semibold mb-1 text-sm">Material de Apoio:</h4>
                 {/* Basic link rendering, improve if needed */}
                 <p className="text-sm text-primary underline hover:text-primary/80 break-all">
                     {challenge.supportMaterial.startsWith('http') ? (
                         <a href={challenge.supportMaterial} target="_blank" rel="noopener noreferrer">{challenge.supportMaterial}</a>
                     ) : (
                         challenge.supportMaterial
                     )}
                 </p>
               </div>
           )}

           {/* Action Button for Available Optional Challenges */}
           {challenge.status === 'available' && challenge.participationType === 'Opcional' && (
                 <Button onClick={handleAcceptChallenge} disabled={isLoading} className="w-full sm:w-auto bg-accent text-accent-foreground hover:bg-accent/90">
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Rocket className="mr-2 h-4 w-4"/>}
                    Aceitar Desafio Opcional
                 </Button>
           )}

        </CardContent>
      </Card>

      {/* Submission Area */}
       {isSubmissible && (
           <Card>
             <CardHeader>
               <CardTitle>Enviar Evidência</CardTitle>
               <CardDescription>Anexe arquivos e adicione comentários para comprovar a conclusão.</CardDescription>
             </CardHeader>
             <form onSubmit={handleSubmitEvidence}>
                 <CardContent className="space-y-4">
                     <div>
                         <Label htmlFor="comments">Comentários (Opcional)</Label>
                         <Textarea
                             id="comments"
                             placeholder="Adicione qualquer informação relevante aqui..."
                             value={submissionComments}
                             onChange={(e) => setSubmissionComments(e.target.value)}
                             rows={3}
                             disabled={isSubmitting}
                            />
                     </div>
                     <div>
                         <Label htmlFor="files">Anexar Arquivos (Fotos, Docs, etc.)</Label>
                         <Input
                             id="files"
                             type="file"
                             multiple
                             onChange={handleFileChange}
                             disabled={isSubmitting}
                             className="cursor-pointer file:cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                            />
                          {submissionFiles.length > 0 && (
                             <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                                {submissionFiles.map((file, index) => (
                                    <li key={index} className="flex justify-between items-center text-xs border rounded p-1.5">
                                        <span className="truncate pr-2">{file.name}</span>
                                         <Button type="button" variant="ghost" size="icon" className="h-5 w-5 text-destructive hover:bg-destructive/10" onClick={() => handleRemoveFile(index)} disabled={isSubmitting}>
                                             <X className="h-3 w-3"/>
                                         </Button>
                                    </li>
                                ))}
                             </ul>
                         )}
                         <p className="text-xs text-muted-foreground mt-1">Limite de X MB por arquivo. Tipos aceitos: JPG, PNG, PDF.</p> {/* TODO: Implement size/type limits */}
                     </div>
                 </CardContent>
                 <CardFooter>
                     <Button type="submit" disabled={isSubmitting || submissionFiles.length === 0}>
                         {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Upload className="mr-2 h-4 w-4"/>}
                         {isSubmitting ? 'Enviando...' : 'Enviar Conclusão'}
                     </Button>
                 </CardFooter>
            </form>
           </Card>
       )}

       {/* Evaluation Result / Pending Status */}
       {isPendingEvaluation && (
           <Alert variant="default" className="border-blue-500 bg-blue-500/10 text-blue-700 dark:text-blue-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                <AlertTitle>Avaliação Pendente</AlertTitle>
                 <AlertDescription>
                    Sua submissão foi enviada em {challenge.submission?.submittedAt ? format(parseISO(challenge.submission.submittedAt), 'dd/MM/yyyy HH:mm') : ''} e está aguardando avaliação do gestor.
                    {challenge.submission?.comments && <p className="mt-2 text-xs italic">Seu comentário: "{challenge.submission.comments}"</p>}
                    {challenge.submission?.files && challenge.submission.files.length > 0 && (
                        <div className="mt-2 text-xs">Arquivos enviados: {challenge.submission.files.map(f => f.name).join(', ')}</div>
                    )}
                 </AlertDescription>
           </Alert>
       )}

       {isEvaluated && challenge.submission?.evaluation && (
           <Card className="border-green-500 bg-green-500/5">
             <CardHeader>
               <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400"><CheckCircle className="h-5 w-5"/> Desafio Concluído e Avaliado!</CardTitle>
                <CardDescription>Avaliado em: {format(parseISO(challenge.submission.evaluation.evaluatedAt), 'dd/MM/yyyy HH:mm')}</CardDescription>
             </CardHeader>
             <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                     <span className="text-sm font-medium">Pontuação Recebida:</span>
                     <Badge variant="default" className="bg-accent text-accent-foreground text-base">+{challenge.submission.evaluation.score} pts</Badge>
                </div>
                {challenge.submission.evaluation.feedback && (
                     <div className="space-y-1">
                         <p className="text-sm font-medium">Feedback do Avaliador:</p>
                         <p className="text-sm text-muted-foreground p-3 bg-card rounded border">{challenge.submission.evaluation.feedback}</p>
                     </div>
                 )}
                  {/* Optionally display submitted files/comments again */}
             </CardContent>
           </Card>
       )}

       {challenge.status === 'expired' && !challenge.submission && (
            <Alert variant="destructive">
                 <Clock className="h-4 w-4"/>
                <AlertTitle>Desafio Expirado</AlertTitle>
                 <AlertDescription>
                   O prazo para este desafio terminou em {challenge.deadline} e nenhuma submissão foi registrada.
                 </AlertDescription>
            </Alert>
       )}

    </div>
  );
}
