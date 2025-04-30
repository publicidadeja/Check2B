
'use client';

import * as React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import {
  AlertTriangle,
  Bell,
  CalendarCheck,
  CheckCircle,
  DollarSign,
  TrendingUp,
  Target, // For challenges
  Info,   // For info tooltip
  Loader2,
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Import necessary types
import type { Evaluation } from '@/types/evaluation';
import type { Task } from '@/types/task';
import type { Challenge } from '@/types/challenge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// Mock Employee ID for demonstration
const CURRENT_EMPLOYEE_ID = '1'; // Alice Silva

// --- Mock Data & Fetching ---
// Reuse existing mock data definitions if possible
import { mockEmployees } from '@/app/employees/page'; // Assuming exported
import { mockTasks as allAdminTasks } from '@/app/tasks/page'; // Assuming exported
import { mockChallenges as allAdminChallenges } from '@/app/challenges/page'; // Assuming exported

// Mock evaluations for the current employee
const mockEvaluations: Evaluation[] = [
    // Add some sample evaluations for employee '1'
    { id: 'eval1-t1-today', employeeId: '1', taskId: 't1', evaluationDate: format(new Date(), 'yyyy-MM-dd'), score: 10, evaluatorId: 'admin1', isDraft: false },
    { id: 'eval1-t6-yesterday', employeeId: '1', taskId: 't6', evaluationDate: format(new Date(Date.now() - 86400000), 'yyyy-MM-dd'), score: 0, justification: "Relatório não entregue", evaluatorId: 'admin1', isDraft: false },
];

// Interface for Dashboard Data
interface EmployeeDashboardData {
    todayStatus: 'pending' | 'evaluated';
    zerosThisMonth: number;
    projectedBonus: number;
    last30DaysPerformance: { date: string, score: number }[]; // Simplified: Average score or count of '10's
    tasksToday: Task[];
    activeChallenges: Challenge[];
    recentNotifications: { id: string; message: string; date: Date, type: 'info' | 'warning' | 'success' }[];
}

// Mock fetching function for employee dashboard
const fetchEmployeeDashboardData = async (employeeId: string): Promise<EmployeeDashboardData> => {
    await new Promise(resolve => setTimeout(resolve, 800)); // Simulate delay

    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const employee = mockEmployees.find(e => e.id === employeeId);
    if (!employee) throw new Error("Colaborador não encontrado.");

    // Simulate fetching tasks for today
    const getTasksForEmployee = (emp: typeof employee, date: Date): Task[] => {
        return allAdminTasks.filter(task => {
            let applies = false;
            const dayOfWeek = date.getDay();
            if (task.periodicity === 'daily') applies = true;
            // Add other periodicity checks if needed
            if (!applies) return false;
            if (!task.assignedTo) return true; // Global task
            if (task.assignedTo === 'role' && task.assignedEntityId === emp.role) return true;
            if (task.assignedTo === 'department' && task.assignedEntityId === emp.department) return true;
            if (task.assignedTo === 'individual' && task.assignedEntityId === emp.id) return true;
            return false;
        });
    };
    const tasksToday = getTasksForEmployee(employee, new Date());

    // Simulate checking if today's evaluation exists
    const todayEvaluation = mockEvaluations.find(e => e.employeeId === employeeId && e.evaluationDate === todayStr);
    const todayStatus = todayEvaluation ? 'evaluated' : 'pending';

    // Simulate calculating zeros this month
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const zerosThisMonth = mockEvaluations.filter(e =>
        e.employeeId === employeeId &&
        parseISO(e.evaluationDate) >= startOfMonth &&
        e.score === 0
    ).length;

    // Simulate calculating projected bonus (simplified logic)
    const ZERO_LIMIT = 3; // Get from settings in real app
    const BONUS_LOW = 70; // Get from settings
    const BONUS_HIGH = 90; // Get from settings
    let projectedBonus = 0;
    if (zerosThisMonth < ZERO_LIMIT) {
        projectedBonus = BONUS_HIGH; // Simplified - Assume full bonus if below limit
    } else if (zerosThisMonth === ZERO_LIMIT) {
        projectedBonus = BONUS_LOW; // Simplified - Assume lower bonus at limit
    }

    // Simulate performance data (e.g., number of '10' scores per day)
    const last30DaysPerformance: { date: string, score: number }[] = [];
    for (let i = 29; i >= 0; i--) {
        const date = new Date(Date.now() - i * 86400000);
        const dateStr = format(date, 'yyyy-MM-dd');
        const score = mockEvaluations.filter(e => e.employeeId === employeeId && e.evaluationDate === dateStr && e.score === 10).length;
        last30DaysPerformance.push({ date: dateStr, score });
    }

    // Filter active challenges for the employee
    const activeChallenges = allAdminChallenges.filter(ch => {
        if (ch.status !== 'active') return false;
        if (ch.eligibility.type === 'all') return true;
        if (ch.eligibility.type === 'department' && ch.eligibility.entityIds?.includes(employee.department)) return true;
        if (ch.eligibility.type === 'role' && ch.eligibility.entityIds?.includes(employee.role)) return true;
        if (ch.eligibility.type === 'individual' && ch.eligibility.entityIds?.includes(employee.id)) return true;
        return false;
    });

    // Simulate notifications
    const recentNotifications = [
        { id: 'n1', message: `Sua avaliação de ${format(new Date(Date.now() - 86400000), 'dd/MM')} foi registrada.`, date: new Date(Date.now() - 3600000), type: 'success' as const },
        { id: 'n2', message: `Você tem ${zerosThisMonth} zero(s) este mês. Limite: ${ZERO_LIMIT}.`, date: new Date(), type: zerosThisMonth >= ZERO_LIMIT ? 'warning' as const : 'info' as const },
        { id: 'n3', message: `Novo desafio opcional disponível: "${activeChallenges[0]?.title || 'Desafio Exemplo'}"`, date: new Date(Date.now() - 2 * 3600000), type: 'info' as const },
    ];


    return {
        todayStatus,
        zerosThisMonth,
        projectedBonus,
        last30DaysPerformance,
        tasksToday,
        activeChallenges,
        recentNotifications,
    };
};


export default function EmployeeDashboardPage() {
    const [data, setData] = React.useState<EmployeeDashboardData | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);
    const { toast } = useToast();
    const ZERO_LIMIT = 3; // Example limit, fetch from settings ideally

    React.useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            try {
                const dashboardData = await fetchEmployeeDashboardData(CURRENT_EMPLOYEE_ID);
                setData(dashboardData);
            } catch (error) {
                console.error("Erro ao carregar dashboard:", error);
                toast({
                    title: "Erro ao Carregar",
                    description: "Não foi possível carregar os dados do dashboard.",
                    variant: "destructive",
                });
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, [toast]);

    const getNotificationIcon = (type: EmployeeDashboardData['recentNotifications'][0]['type']) => {
        switch (type) {
            case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />;
            case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
            case 'info': return <Info className="h-4 w-4 text-blue-500" />;
            default: return <Bell className="h-4 w-4 text-muted-foreground" />;
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-full">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
            </div>
        );
    }

    if (!data) {
        return (
            <div className="text-center text-muted-foreground">
                Não foi possível carregar os dados do dashboard. Tente novamente mais tarde.
            </div>
        );
    }

    const zeroProgress = (data.zerosThisMonth / ZERO_LIMIT) * 100;

    return (
        <TooltipProvider>
            <div className="grid gap-6 lg:grid-cols-3">
                {/* Left Column */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Status Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center justify-between">
                                <span>Status do Dia ({format(new Date(), 'dd/MM/yyyy', { locale: ptBR })})</span>
                                <Badge variant={data.todayStatus === 'evaluated' ? 'default' : 'secondary'}>
                                    {data.todayStatus === 'evaluated' ? 'Avaliado' : 'Pendente'}
                                </Badge>
                            </CardTitle>
                            <CardDescription>Resumo do seu desempenho e projeção mensal.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-sm font-medium">Zeros Acumulados (Mês)</span>
                                    <span className={`font-semibold ${data.zerosThisMonth > ZERO_LIMIT ? 'text-destructive' : ''}`}>
                                        {data.zerosThisMonth} / {ZERO_LIMIT}
                                    </span>
                                </div>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Progress value={Math.min(zeroProgress, 100)} aria-label={`${data.zerosThisMonth} de ${ZERO_LIMIT} zeros permitidos`} className="h-2" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>{data.zerosThisMonth > ZERO_LIMIT ? 'Limite de zeros excedido para bônus máximo.' : `${ZERO_LIMIT - data.zerosThisMonth} zero(s) restantes para o bônus máximo.`}</p>
                                    </TooltipContent>
                                </Tooltip>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-medium">Projeção de Bônus Mensal</span>
                                <span className="text-lg font-bold text-green-600">R$ {data.projectedBonus.toFixed(2)}</span>
                            </div>
                        </CardContent>
                        <CardFooter>
                             <p className="text-xs text-muted-foreground">A projeção é baseada no desempenho atual e pode mudar. O bônus final é calculado no fechamento do mês.</p>
                        </CardFooter>
                    </Card>

                    {/* Tasks for Today */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><CalendarCheck className="h-5 w-5" /> Tarefas de Hoje</CardTitle>
                            <CardDescription>Suas tarefas do checklist para avaliação hoje.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {data.tasksToday.length > 0 ? (
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    {data.tasksToday.map(task => (
                                         <li key={task.id} className="flex items-center justify-between p-2 border rounded-md bg-muted/30">
                                             <span>{task.title}</span>
                                             <Tooltip>
                                                <TooltipTrigger asChild>
                                                     <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground">
                                                        <Info className="h-4 w-4" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent side="top" className="max-w-[250px]">
                                                    <p className="font-semibold">Critério (Nota 10):</p>
                                                    <p className="text-xs">{task.criteria}</p>
                                                </TooltipContent>
                                             </Tooltip>
                                         </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-sm text-muted-foreground text-center py-4">Nenhuma tarefa específica do checklist para você hoje.</p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Active Challenges */}
                     <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Target className="h-5 w-5" /> Desafios Ativos</CardTitle>
                            <CardDescription>Participe e ganhe pontos extras!</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {data.activeChallenges.length > 0 ? (
                                <ul className="space-y-3">
                                    {data.activeChallenges.map(challenge => (
                                        <li key={challenge.id} className="border rounded-md p-3 hover:bg-muted/30 transition-colors">
                                            <div className="flex justify-between items-start mb-1">
                                                <h4 className="font-semibold">{challenge.title}</h4>
                                                <Badge variant="outline">{challenge.points} pts</Badge>
                                            </div>
                                            <p className="text-xs text-muted-foreground mb-2">{challenge.description.substring(0, 80)}...</p>
                                            <div className="flex justify-between items-center text-xs text-muted-foreground">
                                                <span>Termina em: {format(parseISO(challenge.periodEndDate), 'dd/MM/yyyy')}</span>
                                                 <Button variant="link" size="sm" className="p-0 h-auto text-accent">Ver Detalhes</Button> {/* Link to challenge details page */}
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-sm text-muted-foreground text-center py-4">Nenhum desafio ativo para você no momento.</p>
                            )}
                        </CardContent>
                         <CardFooter>
                             <Button variant="secondary" size="sm">Ver Todos Desafios</Button> {/* Link to challenges page */}
                        </CardFooter>
                    </Card>
                </div>

                {/* Right Column */}
                <div className="lg:col-span-1 space-y-6">
                    {/* Notifications Card */}
                    <Card className="max-h-[400px] flex flex-col"> {/* Limit height */}
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5" /> Notificações Recentes</CardTitle>
                        </CardHeader>
                        <CardContent className="flex-grow overflow-hidden p-0"> {/* Allow content to grow and hide overflow */}
                            {data.recentNotifications.length > 0 ? (
                                 <ScrollArea className="h-full px-6 pb-6"> {/* Scroll area for content */}
                                    <div className="space-y-4">
                                        {data.recentNotifications.map(notification => (
                                            <div key={notification.id} className="flex items-start gap-3">
                                                 <div className="flex-shrink-0 pt-0.5">
                                                    {getNotificationIcon(notification.type)}
                                                </div>
                                                <div className="flex-grow">
                                                    <p className="text-sm">{notification.message}</p>
                                                    <p className="text-xs text-muted-foreground">{format(notification.date, 'dd/MM HH:mm', { locale: ptBR })}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                            ) : (
                                <div className="h-full flex items-center justify-center px-6 pb-6">
                                    <p className="text-sm text-muted-foreground">Nenhuma notificação recente.</p>
                                </div>
                            )}
                        </CardContent>
                         <CardFooter className="border-t pt-4">
                            <Button variant="ghost" size="sm" className="w-full">Ver Todas Notificações</Button>
                        </CardFooter>
                    </Card>

                    {/* Quick Links / Actions */}
                     <Card>
                         <CardHeader>
                            <CardTitle>Ações Rápidas</CardTitle>
                         </CardHeader>
                        <CardContent className="grid gap-2">
                            <Button variant="outline">Ver Meu Histórico Completo</Button>
                            <Button variant="outline">Consultar Ranking Atual</Button>
                            {/* Add more relevant actions */}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </TooltipProvider>
    );
}
