
'use client';

import * as React from 'react';
import { format, parseISO, subMonths, addMonths, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Trophy, Crown, Medal, ChevronLeft, ChevronRight, HelpCircle, Loader2, BarChartHorizontal, Info } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { DataTable } from '@/components/ui/data-table'; // Assuming DataTable exists and is adapted for client use
import type { ColumnDef } from "@tanstack/react-table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';

// Import Types
import type { RankingEntry } from '@/app/ranking/page'; // Reuse admin type if suitable
import type { Award } from '@/app/ranking/page'; // Reuse admin award type

// Mock Employee ID
const CURRENT_EMPLOYEE_ID = '1'; // Alice Silva

// --- Mock Data & Fetching ---
import { mockRanking as allAdminRanking } from '@/app/ranking/page'; // Reuse admin mock data
import { mockAwards as allAdminAwards } from '@/app/ranking/page';

// Mock function to fetch ranking data for a specific month, adapted for employee view
const fetchEmployeeRankingData = async (employeeId: string, period: Date): Promise<{ ranking: RankingEntry[], userEntry?: RankingEntry, award?: Award }> => {
    await new Promise(resolve => setTimeout(resolve, 800));

    // Simulate fetching data for the period
    const monthFactor = period.getMonth() + 1;
    const fullRanking = allAdminRanking.map(entry => ({
        ...entry,
        score: Math.max(800, entry.score + (monthFactor * 5 - 20)),
        zeros: Math.max(0, entry.zeros + (Math.random() > 0.7 ? 1 : 0) - (Math.random() > 0.8 ? 1 : 0)),
    })).sort((a, b) => b.score - a.score || a.zeros - b.zeros)
      .map((entry, index) => ({ ...entry, rank: index + 1 }));

    const userEntry = fullRanking.find(entry => entry.employeeId === employeeId);

    // Find the relevant award for the period
    const currentAward = allAdminAwards.find(a => a.status === 'active' && (a.isRecurring || (a.specificMonth && a.specificMonth.getMonth() === period.getMonth() && a.specificMonth.getFullYear() === period.getFullYear())));

    return { ranking: fullRanking, userEntry, award: currentAward };
}

// Helper: Get Initials
const getInitials = (name?: string) => {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
}

// DataTable Columns definition (simplified for employee view)
const rankingColumns: ColumnDef<RankingEntry>[] = [
    {
        accessorKey: "rank",
        header: "#",
        cell: ({ row }) => (
            <div className="font-medium text-center w-8">
                {row.original.rank <= 3 && row.original.rank === 1 && <Crown className="h-4 w-4 text-yellow-500 mx-auto" />}
                {row.original.rank <= 3 && row.original.rank === 2 && <Medal className="h-4 w-4 text-slate-400 mx-auto" />}
                {row.original.rank <= 3 && row.original.rank === 3 && <Medal className="h-4 w-4 text-yellow-700 mx-auto" />}
                {row.original.rank > 3 && row.getValue("rank")}
            </div>
        ),
        size: 40,
    },
    {
        accessorKey: "employeeName",
        header: "Colaborador",
        cell: ({ row }) => (
            <div className="flex items-center gap-2">
                <Avatar className="h-7 w-7">
                    <AvatarImage src={row.original.employeePhotoUrl} alt={row.original.employeeName} />
                    <AvatarFallback className="text-xs">{getInitials(row.original.employeeName)}</AvatarFallback>
                </Avatar>
                <span className="font-medium text-sm">{row.original.employeeName} {row.original.employeeId === CURRENT_EMPLOYEE_ID ? '(Você)' : ''}</span>
            </div>
        ),
    },
    { accessorKey: "department", header: "Departamento", cell: ({ row }) => <span className="text-xs">{row.getValue("department")}</span> },
    {
        accessorKey: "score",
        header: "Pontuação",
        cell: ({ row }) => <div className="text-right font-semibold text-sm">{row.getValue("score")}</div>,
        size: 80,
    },
     {
        accessorKey: "zeros",
        header: "Zeros",
        cell: ({ row }) => <div className={`text-right text-xs ${Number(row.getValue("zeros")) > 0 ? 'text-destructive font-medium' : ''}`}>{row.getValue("zeros")}</div>,
        size: 50,
    },
];


export default function EmployeeRankingPage() {
    const [rankingData, setRankingData] = React.useState<RankingEntry[]>([]);
    const [currentUserEntry, setCurrentUserEntry] = React.useState<RankingEntry | undefined>(undefined);
    const [currentAward, setCurrentAward] = React.useState<Award | undefined>(undefined);
    const [currentMonth, setCurrentMonth] = React.useState(new Date());
    const [isLoading, setIsLoading] = React.useState(true);
    const { toast } = useToast();

    // Fetch ranking data
    React.useEffect(() => {
        const loadRanking = async () => {
            setIsLoading(true);
            try {
                const { ranking, userEntry, award } = await fetchEmployeeRankingData(CURRENT_EMPLOYEE_ID, currentMonth);
                setRankingData(ranking);
                setCurrentUserEntry(userEntry);
                setCurrentAward(award);
            } catch (error) {
                console.error("Falha ao carregar ranking:", error);
                toast({ title: "Erro", description: "Não foi possível carregar o ranking.", variant: "destructive" });
            } finally {
                setIsLoading(false);
            }
        };
        loadRanking();
    }, [currentMonth, toast]);

    const handlePreviousMonth = () => {
        setCurrentMonth(prev => subMonths(prev, 1));
    };

    const handleNextMonth = () => {
         setCurrentMonth(prev => {
             const next = addMonths(prev, 1);
             return next <= new Date() ? next : prev; // Prevent going to future months
         });
    };

    const isCurrentDisplayMonth = startOfMonth(currentMonth).getTime() === startOfMonth(new Date()).getTime();

     // Filter ranking for display (e.g., Top 10 or around the user)
     // For simplicity, we'll show the full table paginated by DataTable
     // const displayedRanking = rankingData; // Use DataTable pagination

    const getPrizeDescription = (award: Award | undefined, rank: number): string => {
         if (!award) return '-';
         const positionPrize = award.valuesPerPosition?.[rank];
         if (positionPrize) {
            return positionPrize.monetary ? `R$ ${positionPrize.monetary.toFixed(2)}` : positionPrize.nonMonetary || '-';
         }
         // Use default prize if no specific prize for position
         return award.monetaryValue ? `R$ ${award.monetaryValue.toFixed(2)}` : award.nonMonetaryValue || '-';
    }

    return (
        <TooltipProvider>
            <div className="space-y-6">
                 {/* Header and Month Navigation */}
                 <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-2">
                            <Trophy className="h-7 w-7" /> Meu Ranking
                        </h1>
                        <p className="text-muted-foreground">Acompanhe sua posição e o desempenho geral.</p>
                    </div>
                    <div className="flex items-center gap-2">
                         <Button variant="outline" size="icon" onClick={handlePreviousMonth} aria-label="Mês anterior">
                             <ChevronLeft className="h-4 w-4" />
                         </Button>
                         <span className="text-lg font-semibold w-32 text-center">
                             {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
                         </span>
                         <Button variant="outline" size="icon" onClick={handleNextMonth} disabled={isCurrentDisplayMonth} aria-label="Próximo mês">
                             <ChevronRight className="h-4 w-4" />
                         </Button>
                     </div>
                 </div>


                {/* User's Position Card */}
                <Card className="bg-gradient-to-r from-primary/10 via-background to-background border-primary/30">
                    <CardHeader>
                        <CardTitle>Sua Posição Atual</CardTitle>
                        <CardDescription>Seu desempenho neste período.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col sm:flex-row items-center gap-4">
                         <div className="flex flex-col items-center">
                            <span className="text-6xl font-bold text-primary">
                                {currentUserEntry?.rank ?? '-'}º
                             </span>
                             <span className="text-muted-foreground text-sm">Lugar</span>
                         </div>
                        <Separator orientation="vertical" className="h-16 hidden sm:block"/>
                        <Separator orientation="horizontal" className="w-full block sm:hidden"/>
                         <div className="flex-1 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                             <div className="font-medium">Pontuação Total:</div>
                            <div className="text-right font-semibold">{currentUserEntry?.score ?? '-'}</div>
                            <div className="font-medium">Zeros Acumulados:</div>
                            <div className={`text-right font-semibold ${currentUserEntry?.zeros && currentUserEntry.zeros > 0 ? 'text-destructive' : ''}`}>{currentUserEntry?.zeros ?? '-'}</div>
                             <div className="font-medium">Departamento:</div>
                            <div className="text-right">{currentUserEntry?.department ?? '-'}</div>
                             <div className="font-medium">Função:</div>
                            <div className="text-right">{currentUserEntry?.role ?? '-'}</div>
                         </div>
                    </CardContent>
                     <CardFooter className="text-xs text-muted-foreground">
                        <Info className="h-3 w-3 mr-1 flex-shrink-0"/> O ranking é atualizado diariamente com base nas avaliações e desafios concluídos.
                    </CardFooter>
                </Card>


                {/* Current Award Card */}
                {currentAward && (
                    <Card>
                        <CardHeader>
                             <CardTitle className="flex items-center gap-2"><Award className="h-5 w-5 text-yellow-500"/> Premiação Vigente</CardTitle>
                             <CardDescription>Prêmio para os melhores colocados neste período ({currentAward.period === 'recorrente' ? 'Recorrente' : format(parseISO(currentAward.period + '-01'), 'MMMM yyyy', { locale: ptBR })}).</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2">
                             <h4 className="font-semibold">{currentAward.title}</h4>
                             <p className="text-sm text-muted-foreground">{currentAward.description}</p>
                            <div className="text-sm">
                                <strong>Ganhadores:</strong> {currentAward.winnerCount}º Lugar{currentAward.winnerCount > 1 ? 'es' : ''}
                             </div>
                            {currentAward.winnerCount === 1 ? (
                                <div className="text-sm"><strong>Prêmio (1º Lugar):</strong> {getPrizeDescription(currentAward, 1)}</div>
                            ) : (
                                 <ul className="text-sm list-disc list-inside">
                                    {Array.from({ length: currentAward.winnerCount }).map((_, i) => (
                                         <li key={i}><strong>{i + 1}º Lugar:</strong> {getPrizeDescription(currentAward, i + 1)}</li>
                                     ))}
                                </ul>
                            )}
                             <div className="text-xs text-muted-foreground pt-2">
                                <strong>Elegíveis:</strong> {currentAward.eligibleDepartments.includes('all') ? 'Todos os departamentos' : currentAward.eligibleDepartments.join(', ')}
                                {currentAward.eligibilityCriteria ? ' (Requer 0 zeros no mês)' : ''}
                             </div>
                         </CardContent>
                    </Card>
                 )}


                {/* Ranking Table Card */}
                <Card>
                    <CardHeader>
                        <CardTitle>Ranking Geral - {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}</CardTitle>
                         <CardDescription>Veja a classificação completa dos colaboradores.</CardDescription>
                    </CardHeader>
                    <CardContent>
                         {isLoading ? (
                            <div className="flex justify-center items-center py-10">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                             </div>
                        ) : (
                            <DataTable columns={rankingColumns} data={rankingData} />
                         )}
                    </CardContent>
                    <CardFooter className="text-xs text-muted-foreground justify-end">
                         Atualizado em: {format(new Date(), 'dd/MM/yyyy HH:mm')}
                    </CardFooter>
                </Card>

                 {/* How Scoring Works (Optional Help Section) */}
                 <Card className="border-dashed">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                             <HelpCircle className="h-4 w-4" /> Como funciona a Pontuação?
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground space-y-1">
                         <p>Sua pontuação é calculada com base nas avaliações diárias (nota 10 = pontos positivos) e nos desafios concluídos.</p>
                         <p>Receber nota 0 em uma tarefa impacta negativamente sua pontuação final.</p>
                         <p>Consulte a seção "Minhas Avaliações" para detalhes diários.</p>
                    </CardContent>
                </Card>

            </div>
        </TooltipProvider>
    );
}

