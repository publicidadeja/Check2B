
 'use client';

 import * as React from 'react';
 import { format, parseISO, subMonths, addMonths, startOfMonth, endOfMonth } from 'date-fns'; // Added endOfMonth
 import { ptBR } from 'date-fns/locale';
 import { Trophy, Crown, Medal, ChevronLeft, ChevronRight, HelpCircle, Loader2, BarChartHorizontal, Info, Award as AwardIcon, TrendingUp, TrendingDown, Minus, User, Activity, AlertTriangle, Eye } from 'lucide-react'; // Added more icons
 import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
 import { Button } from '@/components/ui/button';
 import { Badge } from '@/components/ui/badge';
 import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
 import { useToast } from '@/hooks/use-toast';
 import { DataTable } from '@/components/ui/data-table';
 import type { ColumnDef } from "@tanstack/react-table";
 import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
 import { Separator } from '@/components/ui/separator';
 import { ScrollArea } from '@/components/ui/scroll-area'; // Ensure ScrollArea is imported
 import { cn } from '@/lib/utils'; // Import cn utility
 import { Skeleton } from "@/components/ui/skeleton"; // Import Skeleton

 // Import Types
 import type { RankingEntry, Award as AdminAward } from '@/app/(admin)/ranking/page'; // Reuse admin types

 // Mock Employee ID
 const CURRENT_EMPLOYEE_ID = '1'; // Alice Silva

 // --- Mock Data & Fetching ---
 // Use exported mock data from admin page
 import { mockRanking as allAdminRanking, mockAwards as allAdminAwards } from '@/app/(admin)/ranking/page';


 // Function to fetch ranking data for a specific month, adapted for employee view
 const fetchEmployeeRankingData = async (employeeId: string, period: Date): Promise<{ ranking: RankingEntry[], userEntry?: RankingEntry, award?: AdminAward }> => {
     await new Promise(resolve => setTimeout(resolve, 500)); // Simulate delay

     const monthKey = format(period, 'yyyy-MM');

     // Simulate data fetching/calculation for the given period
      let fullRanking = allAdminRanking.map(entry => ({
         ...entry,
         // Simulate score variation based on month for demo
         score: entry.score + (period.getMonth() - new Date().getMonth()) * (Math.random() > 0.5 ? 15 : -10),
         zeros: Math.max(0, entry.zeros + (Math.random() > 0.8 ? (period.getMonth() % 2 === 0 ? 1 : -1) : 0)),
         // Simulate trend based on random change
         trend: (['up', 'down', 'stable'] as const)[Math.floor(Math.random() * 3)],
     })).sort((a, b) => b.score - a.score || a.zeros - b.zeros)
        .map((entry, index) => ({ ...entry, rank: index + 1 }));

     const userEntry = fullRanking.find(entry => entry.employeeId === employeeId);

      // Find award active for the specific month OR a recurring one
     const currentAward = allAdminAwards.find(a =>
         a.status === 'active' &&
         (a.isRecurring || (a.specificMonth && format(parseISO(a.specificMonth as unknown as string), 'yyyy-MM') === monthKey)) // Ensure date parsing if needed
     );

     return { ranking: fullRanking, userEntry, award: currentAward };
 }

 // Helper: Get Initials
 const getInitials = (name?: string) => {
     if (!name) return '??';
     return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
 }

 // Trend Icon Helper
 const getTrendIcon = (trend?: 'up' | 'down' | 'stable') => {
     switch (trend) {
         case 'up': return <TrendingUp className="h-4 w-4 text-green-500" />;
         case 'down': return <TrendingDown className="h-4 w-4 text-red-500" />;
         case 'stable': return <Minus className="h-4 w-4 text-muted-foreground" />;
         default: return <Activity className="h-4 w-4 text-muted-foreground opacity-50"/>; // Default icon if no trend data
     }
 };


 // DataTable Columns definition (optimized for mobile)
 const rankingColumns = (currentEmployeeId: string): ColumnDef<RankingEntry>[] => [
     {
         accessorKey: "rank",
         header: "#",
         cell: ({ row }) => (
             <div className="font-bold text-center w-6 text-sm">
                 {row.original.rank === 1 && <Crown className="h-4 w-4 text-yellow-500 mx-auto" />}
                 {row.original.rank === 2 && <Medal className="h-4 w-4 text-slate-400 mx-auto" />}
                 {row.original.rank === 3 && <Medal className="h-4 w-4 text-yellow-700 mx-auto" />}
                 {row.original.rank > 3 && <span className="text-xs text-muted-foreground">{row.getValue("rank")}</span>}
             </div>
         ),
         size: 35, // Slightly reduced size
     },
     {
         accessorKey: "employeeName",
         header: "Colaborador",
         cell: ({ row }) => (
             <div className="flex items-center gap-2">
                 <Avatar className="h-7 w-7"> {/* Smaller avatar */}
                     <AvatarImage src={row.original.employeePhotoUrl} alt={row.original.employeeName} />
                     <AvatarFallback className="text-[10px]">{getInitials(row.original.employeeName)}</AvatarFallback>
                 </Avatar>
                  <span className={cn("font-medium text-xs truncate", row.original.employeeId === currentEmployeeId && 'text-primary font-semibold')}>
                     {row.original.employeeName} {row.original.employeeId === currentEmployeeId ? '(Você)' : ''}
                 </span>
             </div>
         ),
         minSize: 120, // Allow more shrinking
     },
     {
         accessorKey: "score",
         header: () => <div className="text-right text-xs">Pts</div>, // Shorter header
         cell: ({ row }) => <div className="text-right font-semibold text-xs">{row.getValue("score")}</div>,
         size: 45, // Reduced size
     },
      {
         accessorKey: "zeros",
         header: () => <div className="text-center text-xs">Zeros</div>, // Centered header
         cell: ({ row }) => <div className={`text-center text-xs ${Number(row.getValue("zeros")) > 0 ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>{row.getValue("zeros")}</div>,
         size: 35, // Reduced size
     },
      {
         accessorKey: "trend",
         header: () => <div className="text-center text-xs">Tend.</div>, // Shorter header
         cell: ({ row }) => <div className="flex justify-center">{getTrendIcon(row.original.trend)}</div>,
         size: 35, // Reduced size
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
          const nextMonthStart = startOfMonth(addMonths(currentMonth, 1));
          if (nextMonthStart <= startOfMonth(new Date())) {
              setCurrentMonth(nextMonthStart);
          }
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

      const renderSkeleton = () => (
         <div className="space-y-4 p-4">
             <Card className="shadow-sm overflow-hidden">
                 <CardHeader className="p-3 bg-muted/30 border-b">
                     <div className="flex items-center justify-between gap-2">
                         <Skeleton className="h-8 w-8 rounded-full bg-muted" />
                         <Skeleton className="h-5 w-32 bg-muted" />
                         <Skeleton className="h-8 w-8 rounded-full bg-muted" />
                     </div>
                 </CardHeader>
                 <CardContent className="p-4">
                     <div className="flex items-center gap-4">
                         <Skeleton className="h-16 w-16 rounded-full bg-muted" />
                         <div className="flex-1 space-y-2">
                             <Skeleton className="h-4 w-3/4 bg-muted" />
                             <Skeleton className="h-3 w-1/2 bg-muted" />
                             <Skeleton className="h-3 w-1/4 bg-muted" />
                         </div>
                     </div>
                 </CardContent>
             </Card>
             <Card className="shadow-sm"><CardContent className="p-3"><Skeleton className="h-10 w-full bg-muted" /></CardContent></Card>
             <Card className="flex-grow flex flex-col shadow-sm">
                  <CardHeader className="p-3"><Skeleton className="h-5 w-24 bg-muted" /></CardHeader>
                  <CardContent className="flex-grow p-0">
                      <div className="p-4 space-y-2">
                          {Array.from({ length: 5 }).map((_, i) => (
                              <div key={i} className="flex items-center gap-2">
                                   <Skeleton className="h-7 w-7 rounded-full bg-muted" />
                                  <Skeleton className="h-4 flex-1 bg-muted" />
                                  <Skeleton className="h-4 w-10 bg-muted" />
                                  <Skeleton className="h-4 w-8 bg-muted" />
                             </div>
                         ))}
                      </div>
                  </CardContent>
                  <CardFooter className="p-2 border-t"><Skeleton className="h-4 w-20 ml-auto bg-muted" /></CardFooter>
             </Card>
         </div>
     );


     if (isLoading) {
          return renderSkeleton();
     }


     return (
          <TooltipProvider>
              <div className="space-y-4 p-4"> {/* Added padding */}
                    {/* Header Card - Navigation & User Position */}
                   <Card className="shadow-sm overflow-hidden border rounded-lg">
                     <CardHeader className="p-3 bg-muted/30 border-b">
                         {/* Month Navigation */}
                        <div className="flex items-center justify-between gap-2">
                              <Button variant="ghost" size="icon" onClick={handlePreviousMonth} aria-label="Mês anterior" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                                  <ChevronLeft className="h-5 w-5" />
                              </Button>
                              <h2 className="text-base font-semibold text-center capitalize flex-1 whitespace-nowrap">
                                  {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
                              </h2>
                              <Button variant="ghost" size="icon" onClick={handleNextMonth} disabled={isCurrentDisplayMonth} aria-label="Próximo mês" className="h-8 w-8 text-muted-foreground hover:text-foreground disabled:text-muted-foreground/50">
                                  <ChevronRight className="h-5 w-5" />
                              </Button>
                          </div>
                     </CardHeader>
                     {/* User's Position */}
                      <CardContent className="p-4">
                         {currentUserEntry ? (
                            <div className="flex items-center gap-4">
                                <div className="flex flex-col items-center justify-center w-16 h-16 rounded-full bg-primary/10 border-2 border-primary text-primary flex-shrink-0 relative">
                                     {currentUserEntry.rank === 1 && <Crown className="h-4 w-4 text-yellow-500 absolute -top-1 -right-1" />}
                                     {currentUserEntry.rank === 2 && <Medal className="h-4 w-4 text-slate-400 absolute -top-1 -right-1" />}
                                     {currentUserEntry.rank === 3 && <Medal className="h-4 w-4 text-yellow-700 absolute -top-1 -right-1" />}
                                    <span className="text-2xl font-bold leading-none">
                                        {currentUserEntry.rank}º
                                    </span>
                                </div>
                                <div className="flex-1 grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs">
                                    <div className="font-medium text-muted-foreground">Sua Posição:</div>
                                    <div className="text-right font-semibold">{currentUserEntry.rank}º Lugar</div>
                                    <div className="font-medium text-muted-foreground">Pontos:</div>
                                    <div className="text-right font-semibold">{currentUserEntry.score}</div>
                                    <div className="font-medium text-muted-foreground">Zeros:</div>
                                    <div className={cn("text-right font-semibold", currentUserEntry.zeros > 0 && "text-destructive")}>{currentUserEntry.zeros}</div>
                                     <div className="font-medium text-muted-foreground">Tendência:</div>
                                    <div className="text-right flex justify-end items-center gap-1">{getTrendIcon(currentUserEntry.trend)}</div>
                                     <div className="col-span-2 text-muted-foreground/80 text-[10px] mt-1 truncate">{currentUserEntry.role} / {currentUserEntry.department}</div>
                                </div>
                            </div>
                         ) : (
                             <div className="text-center text-muted-foreground py-4">
                                <User className="h-8 w-8 mx-auto mb-2 text-gray-400"/>
                                <p className="text-sm">Você não está no ranking para este período.</p>
                            </div>
                         )}
                      </CardContent>
                 </Card>

                  {/* Current Award Card */}
                 {currentAward && (
                     <Card className="shadow-sm border rounded-lg bg-gradient-to-r from-yellow-50 via-amber-50 to-orange-50 dark:from-yellow-900/20 dark:via-amber-900/20 dark:to-orange-900/20">
                         <CardHeader className="p-3 flex flex-row items-start justify-between space-y-0">
                              <div className='flex items-center gap-2'>
                                  <AwardIcon className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0"/>
                                  <div>
                                     <CardTitle className="text-sm font-semibold">{currentAward.title}</CardTitle>
                                     <CardDescription className="text-xs">{format(currentMonth, 'MMMM yyyy', { locale: ptBR })}</CardDescription>
                                  </div>
                              </div>
                              <Badge variant="outline" className="text-[10px] border-yellow-500 text-yellow-700 bg-white dark:bg-card dark:text-yellow-400 whitespace-nowrap">{currentAward.winnerCount} Ganhador{currentAward.winnerCount > 1 ? 'es' : ''}</Badge>
                         </CardHeader>
                         <CardContent className="space-y-1 px-3 pb-3 text-xs">
                             <p className="text-muted-foreground mb-2">{currentAward.description}</p>
                             <Separator />
                             <div className="pt-2">
                                 <strong className='text-foreground/80'>Prêmio(s):</strong>
                                 {currentAward.winnerCount === 1 ? (
                                     <p className='ml-2'>{getPrizeDescription(currentAward, 1)}</p>
                                 ) : (
                                      <ul className="list-none pl-2 mt-0.5 space-y-0.5">
                                         {Array.from({ length: currentAward.winnerCount }).map((_, i) => (
                                              <li key={i}><strong>{i + 1}º:</strong> {getPrizeDescription(currentAward, i + 1)}</li>
                                          ))}
                                     </ul>
                                 )}
                            </div>
                             {currentAward.eligibilityCriteria && (
                                 <div className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 text-[10px] pt-1">
                                     <CheckCircle className="h-3 w-3"/> Requer excelência (0 zeros no mês).
                                 </div>
                             )}
                          </CardContent>
                     </Card>
                  )}
                   {!currentAward && !isLoading && (
                         <Card className="shadow-sm border-dashed border rounded-lg">
                            <CardContent className="p-3 text-center text-muted-foreground text-xs flex items-center justify-center gap-2">
                                <AlertTriangle className="h-4 w-4"/> Nenhuma premiação configurada para este período.
                            </CardContent>
                        </Card>
                   )}

                 {/* Ranking Table Card */}
                 <Card className="flex-grow flex flex-col shadow-sm border rounded-lg overflow-hidden">
                     <CardHeader className="p-3 border-b bg-muted/30">
                         <CardTitle className="text-sm font-medium flex items-center gap-1.5"><BarChartHorizontal className="h-4 w-4"/> Classificação Geral</CardTitle>
                     </CardHeader>
                      <CardContent className="flex-grow p-0">
                          {isLoading ? (
                             <div className="p-4 space-y-2">
                                {Array.from({ length: 5 }).map((_, i) => (
                                    <div key={i} className="flex items-center gap-2">
                                        <Skeleton className="h-7 w-7 rounded-full bg-muted" />
                                        <Skeleton className="h-4 flex-1 bg-muted" />
                                        <Skeleton className="h-4 w-10 bg-muted" />
                                        <Skeleton className="h-4 w-8 bg-muted" />
                                    </div>
                                ))}
                             </div>
                         ) : (
                             // Remove ScrollArea, let page handle scroll
                             <DataTable columns={rankingColumns(CURRENT_EMPLOYEE_ID)} data={rankingData} noPagination />
                          )}
                     </CardContent>
                 </Card>

              </div>
          </TooltipProvider>
     );
 }
