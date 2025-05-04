
'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Target, CheckCircle, Clock, Rocket, Loader2, Search } from 'lucide-react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';

// Mock Challenge Interface (adjust based on actual data model)
interface MockChallenge {
  id: string;
  title: string;
  category: string;
  points: number;
  status: 'available' | 'active' | 'completed' | 'expired';
  deadline?: string; // YYYY-MM-DD format
  descriptionSnippet: string; // Short description for list view
}

// Mock data (replace with actual API call)
const mockChallenges: MockChallenge[] = [
  { id: 'ch1', title: 'Organização Nota 10', category: 'Qualidade', points: 50, status: 'active', deadline: '2024-08-18', descriptionSnippet: 'Mantenha sua área de trabalho impecável...' },
  { id: 'ch2', title: 'Feedback Construtivo', category: 'Comunicação', points: 75, status: 'active', deadline: '2024-08-20', descriptionSnippet: 'Ofereça feedback valioso a um colega...' },
  { id: 'ch3', title: 'Superando Metas', category: 'Produtividade', points: 100, status: 'available', descriptionSnippet: 'Exceda sua meta semanal em 10%...' },
  { id: 'ch4', title: 'Inovação Operacional', category: 'Inovação', points: 150, status: 'available', descriptionSnippet: 'Sugira uma melhoria para um processo...' },
  { id: 'ch5', title: 'Atendimento Excepcional', category: 'Atendimento', points: 80, status: 'completed', descriptionSnippet: 'Receba um elogio formal de cliente...' },
  { id: 'ch6', title: 'Pontualidade Perfeita', category: 'Disciplina', points: 30, status: 'completed', descriptionSnippet: 'Registre 100% de pontualidade no mês...' },
   { id: 'ch7', title: 'Compartilhar Conhecimento', category: 'Colaboração', points: 60, status: 'expired', deadline: '2024-07-31', descriptionSnippet: 'Apresente um tópico relevante para a equipe...' },
];

export default function DesafiosPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [challenges, setChallenges] = useState<MockChallenge[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('disponiveis'); // 'disponiveis', 'ativos', 'concluidos'

  // Simulate data fetching
  useEffect(() => {
    const timer = setTimeout(() => {
      setChallenges(mockChallenges);
      setIsLoading(false);
    }, 1000); // Simulate 1 second fetch
    return () => clearTimeout(timer);
  }, []);

  const filteredChallenges = challenges.filter(challenge =>
     challenge.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
     challenge.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

   const getChallengesByStatus = (status: MockChallenge['status'] | 'disponiveis') => {
       if (status === 'disponiveis') {
            return filteredChallenges.filter(c => c.status === 'available');
       }
       return filteredChallenges.filter(c => c.status === status);
   };

   const renderChallengeCard = (challenge: MockChallenge) => (
        <Card key={challenge.id} className="overflow-hidden shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="p-4 bg-muted/30 border-b">
                 <div className="flex justify-between items-start gap-2">
                    <div>
                        <CardTitle className="text-base font-medium flex items-center gap-2">
                             {challenge.status === 'completed' ? <CheckCircle className="h-4 w-4 text-green-600"/> :
                              challenge.status === 'active' ? <Rocket className="h-4 w-4 text-primary"/> :
                              challenge.status === 'expired' ? <Clock className="h-4 w-4 text-muted-foreground"/> :
                              <Target className="h-4 w-4 text-accent"/>
                             }
                           {challenge.title}
                         </CardTitle>
                        <CardDescription className="text-xs mt-1">{challenge.category}</CardDescription>
                     </div>
                     <Badge variant="secondary" className="shrink-0">+{challenge.points} pts</Badge>
                 </div>
            </CardHeader>
            <CardContent className="p-4 text-sm">
                <p className="text-muted-foreground mb-2">{challenge.descriptionSnippet}</p>
                {challenge.deadline && (challenge.status === 'active' || challenge.status === 'expired') && (
                     <p className="text-xs font-medium">Prazo: <span className={challenge.status === 'expired' ? 'text-destructive' : ''}>{challenge.deadline}</span></p>
                )}
             </CardContent>
             <CardFooter className="p-4 bg-muted/20 border-t flex justify-end">
                 <Button size="sm" asChild variant={challenge.status === 'available' ? 'default' : 'outline'} className={challenge.status === 'available' ? 'bg-accent text-accent-foreground hover:bg-accent/90' : ''}>
                     <Link href={`/colaborador/desafios/${challenge.id}`}>
                         {challenge.status === 'available' ? 'Ver e Aceitar' : 'Ver Detalhes'}
                     </Link>
                 </Button>
            </CardFooter>
        </Card>
   );

   const renderSkeleton = () => (
       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           {[1, 2, 3, 4].map(i => (
                <Card key={i} className="overflow-hidden">
                     <CardHeader className="p-4 bg-muted/30 border-b">
                         <div className="flex justify-between items-start gap-2">
                             <div>
                                 <Skeleton className="h-5 w-3/4 mb-1" />
                                 <Skeleton className="h-3 w-1/2" />
                             </div>
                            <Skeleton className="h-6 w-12 rounded-full" />
                         </div>
                     </CardHeader>
                     <CardContent className="p-4">
                         <Skeleton className="h-4 w-full mb-2" />
                         <Skeleton className="h-4 w-3/4" />
                     </CardContent>
                     <CardFooter className="p-4 bg-muted/20 border-t flex justify-end">
                         <Skeleton className="h-9 w-24 rounded-md" />
                     </CardFooter>
                 </Card>
           ))}
       </div>
   );

   const renderEmptyState = (tabLabel: string) => (
        <div className="text-center py-10 text-muted-foreground">
            Nenhum desafio {tabLabel.toLowerCase()} encontrado {searchTerm ? 'para sua busca' : ''}.
        </div>
   );


  return (
    <div className="space-y-6">
        <Card>
             <CardHeader>
                 <CardTitle>Sistema de Desafios</CardTitle>
                 <CardDescription>Participe dos desafios semanais, ganhe pontos extras e destaque-se no ranking!</CardDescription>
            </CardHeader>
             <CardContent>
                 <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Buscar desafios por título ou categoria..."
                        className="pl-8 w-full"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                 </div>
             </CardContent>
        </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="disponiveis">Disponíveis</TabsTrigger>
          <TabsTrigger value="ativos">Meus Ativos</TabsTrigger>
          <TabsTrigger value="concluidos">Concluídos/Expirados</TabsTrigger>
        </TabsList>

        <TabsContent value="disponiveis" className="mt-6">
          {isLoading ? renderSkeleton() :
           getChallengesByStatus('disponiveis').length > 0 ? (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {getChallengesByStatus('disponiveis').map(renderChallengeCard)}
             </div>
           ) : renderEmptyState('Disponíveis')}
        </TabsContent>

        <TabsContent value="ativos" className="mt-6">
           {isLoading ? renderSkeleton() :
            getChallengesByStatus('active').length > 0 ? (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {getChallengesByStatus('active').map(renderChallengeCard)}
             </div>
           ) : renderEmptyState('Ativos')}
        </TabsContent>

        <TabsContent value="concluidos" className="mt-6">
           {isLoading ? renderSkeleton() :
            (getChallengesByStatus('completed').length > 0 || getChallengesByStatus('expired').length > 0) ? (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {[...getChallengesByStatus('completed'), ...getChallengesByStatus('expired')]
                 .sort((a, b) => (b.deadline && a.deadline ? new Date(b.deadline).getTime() - new Date(a.deadline).getTime() : 0)) // Sort completed/expired roughly by date
                 .map(renderChallengeCard)}
             </div>
            ) : renderEmptyState('Concluídos ou Expirados')}
        </TabsContent>
      </Tabs>
    </div>
  );
}
