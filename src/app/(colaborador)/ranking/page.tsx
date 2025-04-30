
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, Trophy, Medal, TrendingUp, TrendingDown, Minus, Info, Users } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { format, subMonths, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

// Mock Ranking Entry (adjust based on actual data model)
interface MockRankingEntry {
  employeeId: string;
  employeeName: string;
  department: string; // Keep department for potential future filtering view
  averagePercentage: number;
  rank: number;
  zerosCount: number; // Show zeros count
  isCurrentUser?: boolean; // Flag to highlight logged-in user
  trend?: 'up' | 'down' | 'same'; // Optional: Trend indicator
}

// Mock data generation (replace with actual API call)
const generateMockRanking = (currentUserEmployeeId: string): MockRankingEntry[] => {
    const names = ["Alice Silva", "Bruno Costa", "Carlos Souza", "Daniela Lima", "Eduardo Reis", "Fernanda Alves", "Gustavo Borges", "Helena Martins", "Igor Santos", "Juliana Pereira"];
    const departments = ["Vendas", "Engenharia", "Marketing", "Operações"];
    const ranking: Omit<MockRankingEntry, 'rank' | 'isCurrentUser' | 'trend'>[] = [];

    // Add current user specifically
    ranking.push({
         employeeId: currentUserEmployeeId,
         employeeName: 'Você (Colaborador Teste)',
         department: 'Engenharia',
         averagePercentage: 92, // Example score
         zerosCount: 1,
    });


    for (let i = 0; i < 15; i++) {
        // Ensure unique names (simplified)
        const nameIndex = Math.floor(Math.random() * names.length);
         const employeeId = `emp${100 + i}`;
        // Avoid adding current user again
        if (employeeId === currentUserEmployeeId) continue;

        ranking.push({
            employeeId: employeeId,
            employeeName: names[nameIndex] + (i > names.length-1 ? ` ${i+1}` : ''), // Add number if names repeat
            department: departments[Math.floor(Math.random() * departments.length)],
            averagePercentage: Math.floor(Math.random() * 31) + 70, // Score between 70-100
            zerosCount: Math.floor(Math.random() * 6), // 0-5 zeros
        });
    }

     // Sort by percentage desc, then zeros asc, then name asc
    ranking.sort((a, b) => {
        if (b.averagePercentage !== a.averagePercentage) {
            return b.averagePercentage - a.averagePercentage;
        }
        if (a.zerosCount !== b.zerosCount) {
            return a.zerosCount - b.zerosCount;
        }
        return a.employeeName.localeCompare(b.employeeName);
    });

    // Assign rank and highlight current user
    let currentRank = 0;
    let lastPercentage = -1;
    let lastZeros = -1;
    const trends: MockRankingEntry['trend'][] = ['up', 'down', 'same'];

     return ranking.map((entry, index) => {
        if (entry.averagePercentage !== lastPercentage || entry.zerosCount !== lastZeros) {
            currentRank = index + 1;
        }
        lastPercentage = entry.averagePercentage;
        lastZeros = entry.zerosCount;

        return {
            ...entry,
            rank: currentRank,
            isCurrentUser: entry.employeeId === currentUserEmployeeId,
            // Assign random trend for demo purposes
            trend: trends[Math.floor(Math.random() * trends.length)]
        };
    });
};

export default function RankingPage() {
    const [isLoading, setIsLoading] = useState(true);
    const [ranking, setRanking] = useState<MockRankingEntry[]>([]);
    const [selectedPeriod, setSelectedPeriod] = useState<string>(format(startOfMonth(new Date()), 'yyyy-MM'));
    const { toast } = useToast();

    // Replace with actual user ID fetching logic
    const currentUserEmployeeId = 'emp123'; // Placeholder for logged-in user

    // Generate period options (last 6 months)
    const periodOptions = useMemo(() => {
        const options = [];
        const today = startOfMonth(new Date());
        for (let i = 0; i < 6; i++) {
            const date = subMonths(today, i);
            options.push({
                value: format(date, 'yyyy-MM'),
                label: format(date, 'MMMM/yyyy', { locale: ptBR }).replace(/^\w/, c => c.toUpperCase())
            });
        }
        return options;
    }, []);

    // Simulate fetching data based on period
    useEffect(() => {
        setIsLoading(true);
        console.log("Fetching ranking for period:", selectedPeriod);
        // TODO: Replace with actual API call: await getRanking(selectedPeriod, undefined, currentUserEmployeeId);
        const timer = setTimeout(() => {
            const data = generateMockRanking(currentUserEmployeeId);
            setRanking(data);
            setIsLoading(false);
        }, 1000);
        return () => clearTimeout(timer);
    }, [selectedPeriod, currentUserEmployeeId]);


     const getMedal = (rank: number): React.ReactNode => {
        if (rank === 1) return <Medal className="h-5 w-5 text-yellow-500" title="1º Lugar" />;
        if (rank === 2) return <Medal className="h-5 w-5 text-slate-400" title="2º Lugar" />; // Silver
        if (rank === 3) return <Medal className="h-5 w-5 text-orange-600" title="3º Lugar" />; // Bronze
        return <span className="text-xs font-medium text-muted-foreground w-5 text-center">{rank}</span>;
    };

    const getTrendIcon = (trend?: MockRankingEntry['trend']) => {
         switch (trend) {
            case 'up': return <TrendingUp className="h-4 w-4 text-green-600" />;
            case 'down': return <TrendingDown className="h-4 w-4 text-red-600" />;
            default: return <Minus className="h-4 w-4 text-muted-foreground" />;
         }
    }

    const currentUserEntry = ranking.find(r => r.isCurrentUser);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Trophy className="h-5 w-5 text-primary"/> Ranking de Desempenho</CardTitle>
          <CardDescription>Sua posição e o desempenho geral no período selecionado.</CardDescription>
        </CardHeader>
         <CardContent>
             <div className="mb-4">
                 <Select value={selectedPeriod} onValueChange={setSelectedPeriod} disabled={isLoading}>
                     <SelectTrigger className="w-full sm:w-[200px]">
                         <SelectValue placeholder="Selecione o Período" />
                     </SelectTrigger>
                     <SelectContent>
                         {periodOptions.map((option) => (
                             <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                         ))}
                     </SelectContent>
                 </Select>
             </div>

             {/* Highlight Current User's Position */}
             {isLoading ? (
                 <Skeleton className="h-20 w-full rounded-lg border-2 border-primary/50" />
             ) : currentUserEntry ? (
                 <Card className="mb-6 border-2 border-primary bg-primary/5 shadow-md">
                     <CardHeader className="flex flex-row items-center justify-between pb-2">
                         <div className="flex items-center gap-3">
                             <Avatar className="h-10 w-10">
                                  <AvatarImage src={`https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(currentUserEntry.employeeName)}`} alt={currentUserEntry.employeeName} />
                                  <AvatarFallback>{currentUserEntry.employeeName.substring(0, 2)}</AvatarFallback>
                             </Avatar>
                             <div>
                                <CardTitle className="text-base font-semibold">{currentUserEntry.employeeName}</CardTitle>
                                <CardDescription className="text-xs">{currentUserEntry.department}</CardDescription>
                             </div>
                         </div>
                         <div className="flex items-center gap-2 text-lg font-bold text-primary">
                           {getMedal(currentUserEntry.rank)}º
                         </div>
                     </CardHeader>
                     <CardContent className="pt-0 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                           <div className="flex items-center gap-4">
                               <span className="text-sm font-semibold">Média: {currentUserEntry.averagePercentage}%</span>
                               <Badge variant={currentUserEntry.zerosCount > 0 ? "destructive" : "outline"} className="text-xs">
                                    {currentUserEntry.zerosCount} zero(s)
                                </Badge>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                {getTrendIcon(currentUserEntry.trend)}
                                <span>Tendência</span>
                            </div>
                     </CardContent>
                      <CardFooter className="p-4 pt-0">
                          <Progress value={currentUserEntry.averagePercentage} className="h-1.5" />
                      </CardFooter>
                 </Card>
             ) : (
                 <p className="text-center text-muted-foreground py-4">Seus dados não foram encontrados no ranking para este período.</p>
             )}

             {/* Full Ranking Table */}
             <h3 className="text-lg font-semibold mb-3 flex items-center gap-2"><Users className="h-5 w-5"/> Ranking Geral</h3>
            {isLoading ? (
                 <div className="space-y-2">
                     {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                 </div>
             ) : ranking.length === 0 ? (
                 <p className="text-center text-muted-foreground py-6">Nenhum dado de ranking disponível para este período.</p>
             ) : (
                 <Table>
                     <TableHeader>
                         <TableRow>
                             <TableHead className="w-[50px] text-center">Pos.</TableHead>
                             <TableHead>Colaborador</TableHead>
                             <TableHead className="hidden md:table-cell">Departamento</TableHead>
                             <TableHead className="text-center">%</TableHead>
                             <TableHead className="text-center">Zeros</TableHead>
                             <TableHead className="text-center hidden sm:table-cell">Tendência</TableHead>
                         </TableRow>
                     </TableHeader>
                     <TableBody>
                         {ranking.map((entry) => (
                             <TableRow key={entry.employeeId} className={cn(entry.isCurrentUser ? "bg-primary/10 hover:bg-primary/20" : "")}>
                                 <TableCell className="font-bold text-center">{getMedal(entry.rank)}</TableCell>
                                 <TableCell>
                                     <div className="flex items-center gap-3">
                                         <Avatar className="h-8 w-8 hidden sm:flex">
                                             <AvatarImage src={`https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(entry.employeeName)}`} alt={entry.employeeName} />
                                             <AvatarFallback>{entry.employeeName.substring(0, 1)}</AvatarFallback>
                                         </Avatar>
                                         <span className={cn("font-medium", entry.isCurrentUser ? "text-primary font-semibold" : "")}>{entry.employeeName}</span>
                                     </div>
                                 </TableCell>
                                 <TableCell className="hidden md:table-cell text-muted-foreground text-xs">{entry.department}</TableCell>
                                 <TableCell className="text-center font-semibold">{entry.averagePercentage}%</TableCell>
                                 <TableCell className="text-center">
                                     <Badge variant={entry.zerosCount > 0 ? "destructive" : "outline"} className="text-xs">
                                         {entry.zerosCount}
                                     </Badge>
                                 </TableCell>
                                 <TableCell className="text-center hidden sm:table-cell">
                                      {getTrendIcon(entry.trend)}
                                 </TableCell>
                             </TableRow>
                         ))}
                     </TableBody>
                 </Table>
             )}
              {!isLoading && ranking.length > 0 && (
                   <p className="text-xs text-muted-foreground mt-4 flex items-center gap-1">
                       <Info className="h-3 w-3 flex-shrink-0" />
                       O ranking considera a média de pontos do checklist e pontos de desafios. Desempate: menor nº de zeros, nome.
                   </p>
               )}
         </CardContent>
       </Card>
    </div>
  );
}
