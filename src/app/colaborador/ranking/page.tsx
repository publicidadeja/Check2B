
 'use client';

 import * as React from 'react';
 import { format, parseISO, subMonths, addMonths, startOfMonth } from 'date-fns';
 import { ptBR } from 'date-fns/locale';
 import { Trophy, Crown, Medal, ChevronLeft, ChevronRight, HelpCircle, Loader2, BarChartHorizontal, Info, Award as AwardIcon } from 'lucide-react'; // Added AwardIcon
 import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
 import { Button } from '@/components/ui/button';
 import { Badge } from '@/components/ui/badge';
 import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
 import { useToast } from '@/hooks/use-toast';
 import { DataTable } from '@/components/ui/data-table';
 import type { ColumnDef } from "@tanstack/react-table";
 import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
 import { Separator } from '@/components/ui/separator';
 import { ScrollArea } from '@/components/ui/scroll-area'; // Import ScrollArea
 // Removed EmployeeLayout import

 // Import Types
 import type { RankingEntry, Award as AdminAward } from '@/app/ranking/page'; // Reuse admin types, rename Award to AdminAward

 // Mock Employee ID
 const CURRENT_EMPLOYEE_ID = '1'; // Alice Silva

 // --- Mock Data & Fetching ---
 import { mockRanking as allAdminRanking, mockAwards as allAdminAwards } from '@/app/ranking/page'; // Reuse admin mock data


 const fetchEmployeeRankingData = async (employeeId: string, period: Date): Promise<{ ranking: RankingEntry[], userEntry?: RankingEntry, award?: AdminAward }> => {
     await new Promise(resolve => setTimeout(resolve, 600));

     const monthFactor = period.getMonth() + 1;
     const fullRanking = allAdminRanking.map(entry => ({
         ...entry,
         score: Math.max(800, entry.score + (monthFactor * 5 - 20) + Math.floor(Math.random()*20 - 10)), // Add some randomness
         zeros: Math.max(0, entry.zeros + (Math.random() > 0.8 ? 1 : 0) - (Math.random() > 0.85 ? 1 : 0)),
     })).sort((a, b) => b.score - a.score || a.zeros - b.zeros)
       .map((entry, index) => ({ ...entry, rank: index + 1 }));

     const userEntry = fullRanking.find(entry => entry.employeeId === employeeId);
     const currentAward = allAdminAwards.find(a => a.status === 'active' && (a.isRecurring || (a.specificMonth && format(a.specificMonth, 'yyyy-MM') === format(period, 'yyyy-MM'))));

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
             <div className="font-medium text-center w-6"> {/* Reduced width */}
                 {row.original.rank <= 3 && row.original.rank === 1 && <Crown className="h-4 w-4 text-yellow-500 mx-auto" />}
                 {row.original.rank <= 3 && row.original.rank === 2 && <Medal className="h-4 w-4 text-slate-400 mx-auto" />}
                 {row.original.rank <= 3 && row.original.rank === 3 && <Medal className="h-4 w-4 text-yellow-700 mx-auto" />}
                 {row.original.rank > 3 && <span className="text-xs">{row.getValue("rank")}</span>}
             </div>
         ),
         size: 30, // Reduced size
     },
     {
         accessorKey: "employeeName",
         header: "Colaborador",
         cell: ({ row }) => (
             <div className="flex items-center gap-1.5"> {/* Reduced gap */}
                 <Avatar className="h-6 w-6"> {/* Reduced avatar size */}
                     <AvatarImage src={row.original.employeePhotoUrl} alt={row.original.employeeName} />
                     <AvatarFallback className="text-[10px]">{getInitials(row.original.employeeName)}</AvatarFallback>
                 </Avatar>
                  <span className={`font-medium text-xs truncate ${row.original.employeeId === CURRENT_EMPLOYEE_ID ? 'text-primary' : ''}`}>
                     {row.original.employeeName} {row.original.employeeId === CURRENT_EMPLOYEE_ID ? '(Você)' : ''}
                 </span>
             </div>
         ),
         minSize: 100, // Allow shrinking
     },
     // { accessorKey: "department", header: "Depto", cell: ({ row }) => <span className="text-[10px] hidden sm:inline">{row.getValue("department")}</span>, size: 60 }, // Shorter header, hide on smaller screens
     {
         accessorKey: "score",
         header: () => <div className="text-right text-xs">Pontos</div>, // Right align header
         cell: ({ row }) => <div className="text-right font-semibold text-xs">{row.getValue("score")}</div>,
         size: 50, // Reduced size
     },
      {
         accessorKey: "zeros",
         header: () => <div className="text-right text-xs">Zeros</div>, // Right align header
         cell: ({ row }) => <div className={`text-right text-[10px] ${Number(row.getValue("zeros")) > 0 ? 'text-destructive font-medium' : ''}`}>{row.getValue("zeros")}</div>,
         size: 30, // Reduced size
     },
 ];


 export default function EmployeeRankingPage() {
     const [rankingData, setRankingData] = React.useState<RankingEntry[]>([]);
     const [currentUserEntry, setCurrentUserEntry] = React.useState<RankingEntry | undefined>(undefined);
     const [currentAward, setCurrentAward] = React.useState<AdminAward | undefined>(undefined);
     const [currentMonth, setCurrentMonth] = React.useState(new Date());
     const [isLoading, setIsLoading] = React.useState(true);
     const { toast } = useToast();

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
              return next <= new Date() ? next : prev;
          });
     };

     const isCurrentDisplayMonth = startOfMonth(currentMonth).getTime() === startOfMonth(new Date()).getTime();


     const getPrizeDescription = (award: AdminAward | undefined, rank: number): string => {
          if (!award) return '-';
          const positionPrize = award.valuesPerPosition?.[rank];
          if (positionPrize) {
             return positionPrize.monetary ? `R$ ${positionPrize.monetary.toFixed(2)}` : positionPrize.nonMonetary || '-';
          }
          return award.monetaryValue ? `R$ ${award.monetaryValue.toFixed(2)}` : award.nonMonetaryValue || '-';
     }

     return (
          <TooltipProvider>
              <div className="space-y-4"> {/* Reduced spacing */}
                    {/* Header Card for Navigation and User Position */}
                   <Card className="shadow-sm">
                     <CardHeader className="p-3">
                         {/* Month Navigation */}
                        <div className="flex items-center justify-between gap-2 mb-2">
                              <Button variant="outline" size="icon" onClick={handlePreviousMonth} aria-label="Mês anterior" className="h-8 w-8">
                                  <ChevronLeft className="h-4 w-4" />
                              </Button>
                              <h2 className="text-base font-semibold text-center capitalize">
                                  {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
                              </h2>
                              <Button variant="outline" size="icon" onClick={handleNextMonth} disabled={isCurrentDisplayMonth} aria-label="Próximo mês" className="h-8 w-8">
                                  <ChevronRight className="h-4 w-4" />
                              </Button>
                          </div>
                          <Separator />
                         {/* User's Position */}
                         <div className="flex items-center gap-3 pt-3">
                              <div className="flex flex-col items-center">
                                 <span className="text-4xl font-bold text-primary">
                                     {currentUserEntry?.rank ?? '-'}º
                                  </span>
                                  <span className="text-muted-foreground text-[10px]">Lugar</span>
                              </div>
                              <div className="flex-1 grid grid-cols-2 gap-x-3 gap-y-1 text-[10px] sm:text-xs">
                                  <div className="font-medium">Pontuação:</div>
                                 <div className="text-right font-semibold">{currentUserEntry?.score ?? '-'}</div>
                                 <div className="font-medium">Zeros:</div>
                                 <div className={`text-right font-semibold ${currentUserEntry?.zeros && currentUserEntry.zeros > 0 ? 'text-destructive' : ''}`}>{currentUserEntry?.zeros ?? '-'}</div>
                                  <div className="font-medium col-span-2 text-muted-foreground truncate">{currentUserEntry?.role ?? '-'} / {currentUserEntry?.department ?? '-'}</div>
                              </div>
                         </div>
                     </CardHeader>
                 </Card>


                 {/* Current Award Card */}
                 {currentAward && (
                     <Card className="shadow-sm">
                         <CardHeader className="p-3">
                              <CardTitle className="flex items-center gap-1 text-sm"> {/* Reduced size */}
                                  <AwardIcon className="h-4 w-4 text-yellow-500 flex-shrink-0"/> Premiação Vigente
                             </CardTitle>
                             <CardDescription className="text-xs">{currentAward.title}</CardDescription>
                         </CardHeader>
                         <CardContent className="space-y-1 px-3 pb-3 text-xs">
                             <p className="text-muted-foreground line-clamp-2">{currentAward.description}</p>
                             <div className="text-[10px] sm:text-xs">
                                 <strong>Ganhadores:</strong> {currentAward.winnerCount}º Lugar{currentAward.winnerCount > 1 ? 'es' : ''}
                              </div>
                             {currentAward.winnerCount === 1 ? (
                                 <div className="text-[10px] sm:text-xs"><strong>Prêmio:</strong> {getPrizeDescription(currentAward, 1)}</div>
                             ) : (
                                  <ul className="text-[10px] sm:text-xs list-disc list-inside">
                                     {Array.from({ length: currentAward.winnerCount }).map((_, i) => (
                                          <li key={i}><strong>{i + 1}º:</strong> {getPrizeDescription(currentAward, i + 1)}</li>
                                      ))}
                                 </ul>
                             )}
                              {/* <div className="text-[10px] text-muted-foreground pt-1">
                                 <strong>Elegíveis:</strong> {currentAward.eligibleDepartments.includes('all') ? 'Todos' : currentAward.eligibleDepartments.join(', ')}
                                 {currentAward.eligibilityCriteria ? ' (Excelência)' : ''}
                              </div> */}
                          </CardContent>
                     </Card>
                  )}


                 {/* Ranking Table Card */}
                 <Card className="flex-grow flex flex-col">
                     <CardHeader className="p-3">
                         <CardTitle className="text-sm">Ranking Geral</CardTitle>
                          <CardDescription className="text-xs">Classificação completa dos colaboradores.</CardDescription>
                     </CardHeader>
                      <CardContent className="flex-grow p-0"> {/* Remove padding for table */}
                          {isLoading ? (
                             <div className="flex justify-center items-center py-10">
                                 <Loader2 className="h-8 w-8 animate-spin text-primary" />
                              </div>
                         ) : (
                              // Use a container that allows horizontal scrolling if needed
                             <ScrollArea className="h-[calc(100vh-450px)]"> {/* Adjust height based on other elements */}
                                <DataTable columns={rankingColumns} data={rankingData} noPagination /> {/* Remove internal pagination */}
                             </ScrollArea>
                          )}
                     </CardContent>
                     {/* <CardFooter className="p-2 text-xs text-muted-foreground justify-end border-t">
                          Atualizado em: {format(new Date(), 'dd/MM/yy HH:mm')}
                     </CardFooter> */}
                 </Card>

                  {/* How Scoring Works (Optional Help Section) */}
                  {/* <Card className="border-dashed mt-4">
                     <CardHeader className="p-2">
                         <CardTitle className="flex items-center gap-1 text-xs">
                              <HelpCircle className="h-3 w-3" /> Como funciona?
                         </CardTitle>
                     </CardHeader>
                     <CardContent className="text-[10px] text-muted-foreground space-y-0.5 p-2 pt-0">
                          <p>Pontuação baseada em avaliações (10 = pts) e desafios. Zeros impactam negativamente.</p>
                     </CardContent>
                 </Card> */}

              </div>
          </TooltipProvider>
     );
 }

    