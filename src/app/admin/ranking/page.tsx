
'use client';

import * as React from 'react';
import { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton'; // Ensure Skeleton is imported
import { Loader2, TrendingUp, TrendingDown, Minus, Filter, Trophy, Medal, AlertTriangle, Info, Users } from 'lucide-react'; // Added Users icon
import { useToast } from "@/hooks/use-toast";
import type { RankingEntry } from '@/services/ranking';
import { getRanking } from '@/services/ranking';
import type { Department } from '@/services/department';
import { getAllDepartments } from '@/services/department';
import { format, subMonths, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button'; // Import Button
import { cn } from '@/lib/utils'; // Import cn for conditional class names

export default function RankingPage() {
    const [ranking, setRanking] = useState<RankingEntry[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [selectedDepartment, setSelectedDepartment] = useState<string>("Todos");
    const [selectedPeriod, setSelectedPeriod] = useState<string>(format(startOfMonth(new Date()), 'yyyy-MM')); // Default para mês atual
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    // Gerar opções de período (últimos 6 meses)
    const periodOptions = useMemo(() => {
        const options = [];
        const today = startOfMonth(new Date());
        for (let i = 0; i < 6; i++) {
            const date = subMonths(today, i);
            options.push({
                value: format(date, 'yyyy-MM'),
                label: format(date, 'MMMM/yyyy', { locale: ptBR }).replace(/^\w/, c => c.toUpperCase()) // Capitalizar Mês
            });
        }
        return options;
    }, []);

    const loadRankingData = React.useCallback(async () => {
        setIsLoading(true);
        console.log(`Loading ranking for period ${selectedPeriod} and department ${selectedDepartment}`);
        try {
            // Fetch departments only if needed
            if (departments.length === 0) {
                const fetchedDepartments = await getAllDepartments();
                setDepartments(fetchedDepartments);
            }
            // Fetch ranking
            const fetchedRanking = await getRanking(selectedPeriod, selectedDepartment === "Todos" ? undefined : selectedDepartment);
            setRanking(fetchedRanking);
        } catch (error: any) {
            console.error("Falha ao carregar ranking:", error);
            toast({ title: "Erro ao Carregar Ranking", description: error.message || "Falha ao carregar dados do ranking.", variant: "destructive" });
            setRanking([]); // Limpar ranking em caso de erro
        } finally {
            setIsLoading(false);
        }
    }, [selectedPeriod, selectedDepartment, toast, departments.length]); // Depender dos filtros e do estado dos departamentos

    useEffect(() => {
        loadRankingData();
    }, [loadRankingData]); // Executar quando a função de carregamento mudar (devido a filtros)

    const getMedal = (rank: number): React.ReactNode => {
        if (rank === 1) return <Medal className="h-5 w-5 text-yellow-500" title="1º Lugar" />;
        if (rank === 2) return <Medal className="h-5 w-5 text-slate-400" title="2º Lugar" />; // Prata
        if (rank === 3) return <Medal className="h-5 w-5 text-orange-600" title="3º Lugar" />; // Bronze
        return <span className="text-xs font-medium text-muted-foreground w-5 text-center">{rank}</span>;
    };

     // Extract Top 3 performers after loading and filtering
     const topPerformers = ranking.slice(0, 3);

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <CardTitle className="flex items-center gap-2"><Trophy className="h-5 w-5"/> Ranking de Desempenho</CardTitle>
                        <CardDescription>Visualize o desempenho dos colaboradores no período selecionado.</CardDescription>
                    </div>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                         {/* Seletor de Período */}
                         <Select value={selectedPeriod} onValueChange={setSelectedPeriod} disabled={isLoading}>
                            <SelectTrigger className="min-w-[160px] w-full sm:w-auto">
                                <SelectValue placeholder="Selecione o Período" />
                            </SelectTrigger>
                            <SelectContent>
                                {periodOptions.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                                ))}
                            </SelectContent>
                         </Select>

                         {/* Seletor de Departamento */}
                         <Select value={selectedDepartment} onValueChange={setSelectedDepartment} disabled={isLoading}>
                            <SelectTrigger className="min-w-[160px] w-full sm:w-auto">
                                <SelectValue placeholder="Filtrar por Depto." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Todos">Todos Deptos.</SelectItem>
                                {departments.map((dept) => (
                                <SelectItem key={dept.id} value={dept.name}>{dept.name}</SelectItem>
                                ))}
                            </SelectContent>
                         </Select>
                    </div>
                </CardHeader>
                <CardContent>
                    {/* Optional: Cards for Top Performers */}
                     {isLoading ? (
                         <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                            {[1,2,3].map(i => <Skeleton key={i} className="h-24 rounded-lg" />)}
                         </div>
                     ) : (
                        topPerformers.length > 0 &&
                        selectedDepartment === "Todos" &&
                        selectedPeriod === format(startOfMonth(new Date()), 'yyyy-MM')
                      ) ? ( // Show only on current month & without dept filter
                         <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                             {topPerformers.map((performer, index) => (
                                 <Card key={performer.employeeId} className={cn(
                                        "border-2 shadow-md",
                                        index === 0 && 'border-yellow-500',
                                        index === 1 && 'border-slate-400',
                                        index === 2 && 'border-orange-600'
                                    )}>
                                     <CardHeader className="flex flex-row items-center justify-between pb-2">
                                          <div className="flex items-center gap-2 overflow-hidden"> {/* Added overflow-hidden */}
                                              <Avatar className="h-8 w-8 flex-shrink-0"> {/* Added flex-shrink-0 */}
                                                   <AvatarImage src={`https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(performer.employeeName)}`} alt={performer.employeeName} />
                                                   <AvatarFallback>{performer.employeeName.substring(0, 1)}</AvatarFallback>
                                              </Avatar>
                                              <CardTitle className="text-base font-medium truncate">{performer.employeeName}</CardTitle> {/* Added truncate */}
                                          </div>
                                          <div className="flex items-center gap-1 text-lg font-bold flex-shrink-0"> {/* Added flex-shrink-0 */}
                                              {getMedal(performer.rank)}
                                          </div>
                                     </CardHeader>
                                     <CardContent className="pt-0">
                                          <p className="text-xs text-muted-foreground truncate">{performer.department}</p> {/* Added truncate */}
                                          <div className="flex items-center justify-between mt-2">
                                              <span className="text-sm font-semibold">{performer.averagePercentage}%</span>
                                              <Badge variant={performer.zerosCount > 0 ? "destructive" : "outline"} className="text-xs">
                                                  {performer.zerosCount} zero(s)
                                              </Badge>
                                          </div>
                                         <Progress value={performer.averagePercentage} className="h-1 mt-1" />
                                     </CardContent>
                                 </Card>
                             ))}
                         </div>
                     ) : null}


                    {/* Ranking Table */}
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2"><Users className="h-5 w-5"/> Ranking Geral</h3>
                    {isLoading ? (
                        <div className="flex justify-center items-center p-10">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : ranking.length === 0 ? ( // Check if ranking array is empty AFTER loading
                        <div className="text-center p-6 border rounded-md bg-muted/50">
                             <p className="text-muted-foreground">
                                Nenhum dado de ranking encontrado para o período e departamento selecionados.
                             </p>
                             <p className="text-xs text-muted-foreground mt-1">
                                Verifique se existem colaboradores cadastrados e avaliações registradas para este período.
                             </p>
                         </div>
                    ) : (
                        <>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[50px]">Pos.</TableHead>
                                        <TableHead>Colaborador</TableHead>
                                        <TableHead className="hidden md:table-cell">Departamento</TableHead>
                                        <TableHead className="text-center">% Média</TableHead>
                                        <TableHead className="text-center">Zeros</TableHead>
                                        <TableHead className="text-center hidden sm:table-cell">Progresso</TableHead>
                                        <TableHead className="text-center">Bônus</TableHead>
                                        {/* <TableHead className="text-center hidden lg:table-cell">Tendência</TableHead> */}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {ranking.map((entry) => (
                                        <TableRow key={entry.employeeId}>
                                            <TableCell className="font-bold text-center">{getMedal(entry.rank)}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="h-9 w-9 hidden sm:flex">
                                                        <AvatarImage src={`https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(entry.employeeName)}`} alt={entry.employeeName} />
                                                        <AvatarFallback>{entry.employeeName.substring(0, 1)}</AvatarFallback>
                                                    </Avatar>
                                                    <span className="font-medium">{entry.employeeName}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="hidden md:table-cell text-muted-foreground">{entry.department}</TableCell>
                                            <TableCell className="text-center font-semibold">{entry.averagePercentage}%</TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant={entry.zerosCount > 0 ? "destructive" : "outline"} title={`${entry.zerosCount} nota(s) zero recebida(s) no período`}>
                                                    {entry.zerosCount}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-center hidden sm:table-cell">
                                                <Progress value={entry.averagePercentage} className="h-2" />
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {entry.isEligibleForBonus ? (
                                                    <Badge variant="default" className="bg-accent text-accent-foreground">Elegível</Badge>
                                                ) : (
                                                    <Badge variant="secondary" className="flex items-center gap-1" title={`Não elegível devido a ${entry.zerosCount} zero(s).`}>
                                                        <AlertTriangle className="h-3 w-3" /> Não Elegível
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            {/* <TableCell className="text-center hidden lg:table-cell">
                                                {entry.trend === undefined || entry.trend === 0 ? <Minus className="h-4 w-4 mx-auto text-muted-foreground"/> :
                                                entry.trend > 0 ? <TrendingUp className="h-4 w-4 mx-auto text-green-600"/> :
                                                <TrendingDown className="h-4 w-4 mx-auto text-red-600"/> }
                                            </TableCell> */}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            <p className="text-xs text-muted-foreground mt-4 pl-1 flex items-center gap-1">
                               <Info className="h-3 w-3" />
                               O ranking considera a média de pontos do checklist e pontos de desafios. Desempate: menor nº de zeros, nome.
                           </p>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
