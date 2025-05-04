
'use client';

import * as React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Users, CheckSquare, AlertTriangle, TrendingUp, Activity, Loader2, Ban, CalendarCheck } from 'lucide-react'; // Added Ban, CalendarCheck
import type { RankingEntry } from '@/services/ranking';
import { getRanking } from '@/services/ranking';
// import type { Task } from '@/services/task';
// import { getAllTasks } from '@/services/task'; // Commented out as failed tasks logic needs evaluation service
import type { Department } from '@/services/department';
import { getAllDepartments } from '@/services/department';
import { useToast } from '@/hooks/use-toast';
import { format, startOfMonth } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link'; // Import Link for navigation
import { Button } from '@/components/ui/button'; // Import Button for link styling

// Interface for dashboard summary data
interface DashboardSummary {
    teamPerformance: number;
    pendingEvaluationsCount: number; // Renamed for clarity
    criticalAlertsCount: number; // Renamed for clarity
    topPerformers: RankingEntry[];
    departmentPerformance: { name: string; performance: number }[];
    // Removed recentActivity and failedTasks as they require unimplemented services/logic
    // recentActivity: { timestamp: string; description: string }[];
    // failedTasks: { name: string; count: number }[];
}

export default function AdminDashboard() {
    const [summary, setSummary] = React.useState<DashboardSummary | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);
    const { toast } = useToast();

    React.useEffect(() => {
        async function loadDashboardData() {
            setIsLoading(true);
            try {
                const currentMonth = format(startOfMonth(new Date()), 'yyyy-MM');
                // Fetch ranking for top performers and overall performance calculation
                const ranking = await getRanking(currentMonth, 'Todos'); // Fetch all for calculations

                // Fetch departments to calculate average performance per department
                const departments = await getAllDepartments();

                // --- Data Processing (Example Logic) ---

                // Calculate Team Performance (average of all in ranking)
                const totalPerformance = ranking.reduce((sum, entry) => sum + entry.averagePercentage, 0);
                const teamPerformance = ranking.length > 0 ? Math.round(totalPerformance / ranking.length) : 0;

                // Get Top 3 Performers
                const topPerformers = ranking.slice(0, 3);

                // Calculate Department Performance (Average score of employees in each dept)
                const departmentPerformance = departments.map(dept => {
                    const deptEmployees = ranking.filter(e => e.department === dept.name);
                    const deptTotalPerf = deptEmployees.reduce((sum, e) => sum + e.averagePercentage, 0);
                    const deptAvgPerf = deptEmployees.length > 0 ? Math.round(deptTotalPerf / deptEmployees.length) : 0;
                    return { name: dept.name, performance: deptAvgPerf };
                }).sort((a, b) => b.performance - a.performance); // Sort by performance desc

                // --- Placeholder Data (Needs real implementation / Refinement) ---
                // TODO: Implement logic to fetch actual pending evaluations count (e.g., count employees without evaluations for today)
                const pendingEvaluationsCount = 0; // Placeholder - Requires evaluation service logic

                // Critical alerts based on ranking data (Example: not eligible for bonus AND low score)
                const criticalAlertsCount = ranking.filter(e => e.isEligibleForBonus === false && e.averagePercentage < 70).length;


                setSummary({
                    teamPerformance,
                    pendingEvaluationsCount,
                    criticalAlertsCount,
                    topPerformers,
                    departmentPerformance,
                    // recentActivity and failedTasks removed
                });

            } catch (error) {
                console.error("Failed to load dashboard data:", error);
                toast({
                    title: "Erro ao Carregar Dashboard",
                    description: "Não foi possível buscar os dados para o painel.",
                    variant: "destructive",
                });
                // Set empty state or defaults on error
                setSummary({
                    teamPerformance: 0,
                    pendingEvaluationsCount: 0,
                    criticalAlertsCount: 0,
                    topPerformers: [],
                    departmentPerformance: [],
                });
            } finally {
                setIsLoading(false);
            }
        }

        loadDashboardData();
    }, [toast]); // Re-run if toast changes (shouldn't happen often)

    if (isLoading) {
        return (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
                <Skeleton className="h-64 lg:col-span-2" />
                <Skeleton className="h-64 lg:col-span-2" />
            </div>
        );
    }

    if (!summary) {
         return (
            <div className="flex justify-center items-center p-10 text-muted-foreground">
               Não foi possível carregar os dados do dashboard.
            </div>
         );
    }

    return (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {/* Card: Team Performance */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Desempenho da Equipe</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{summary.teamPerformance}%</div>
                    <p className="text-xs text-muted-foreground">Média geral do mês atual</p>
                    <Progress value={summary.teamPerformance} className="mt-2 h-2" />
                </CardContent>
            </Card>

            {/* Card: Pending Evaluations */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Avaliações Pendentes (Hoje)</CardTitle>
                    <CalendarCheck className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{summary.pendingEvaluationsCount}</div>
                    <p className="text-xs text-muted-foreground">Colaboradores a avaliar hoje</p>
                     <Button variant="link" size="sm" className="text-xs p-0 h-auto mt-1" asChild>
                        <Link href="/admin/evaluations">Ir para Avaliações</Link>
                    </Button>
                    {/* TODO: Replace count with actual data from evaluation service */}
                </CardContent>
            </Card>

            {/* Card: Critical Alerts */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Alertas Críticos</CardTitle>
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{summary.criticalAlertsCount}</div>
                    <p className="text-xs text-muted-foreground">Colaboradores com desempenho baixo</p>
                     <Button variant="link" size="sm" className="text-xs p-0 h-auto mt-1" asChild>
                        <Link href="/admin/ranking">Ver Ranking</Link>
                    </Button>
                    {/* Logic based on ranking data (isEligible=false & avg < 70%) */}
                </CardContent>
            </Card>

            {/* Card: Top Performers */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Melhores Desempenhos (Mês)</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    {summary.topPerformers.length > 0 ? (
                        summary.topPerformers.map((performer) => (
                            <div key={performer.employeeId} className="flex items-center justify-between text-sm mb-1">
                                <span className="truncate" title={performer.employeeName}>{performer.employeeName}</span>
                                <Badge variant="secondary">{performer.averagePercentage}%</Badge>
                            </div>
                        ))
                    ) : (
                         <p className="text-xs text-muted-foreground text-center py-4">Nenhum dado de ranking ainda.</p>
                    )}
                </CardContent>
            </Card>

            {/* Card: Department Performance */}
            <Card className="lg:col-span-2">
                <CardHeader>
                    <CardTitle>Desempenho por Departamento</CardTitle>
                    <CardDescription>Performance média mensal por departamento.</CardDescription>
                </CardHeader>
                <CardContent>
                     {summary.departmentPerformance.length > 0 ? (
                        <Table>
                        <TableHeader>
                            <TableRow>
                            <TableHead>Departamento</TableHead>
                            <TableHead className="text-right">Performance</TableHead>
                            <TableHead className="w-[120px]">Progresso</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {summary.departmentPerformance.map((dept) => (
                            <TableRow key={dept.name}>
                                <TableCell className="font-medium">{dept.name}</TableCell>
                                <TableCell className="text-right">{dept.performance}%</TableCell>
                                <TableCell>
                                    <Progress value={dept.performance} className="h-2" />
                                </TableCell>
                            </TableRow>
                            ))}
                        </TableBody>
                        </Table>
                    ) : (
                         <p className="text-xs text-muted-foreground text-center py-4">Nenhum dado de departamento disponível.</p>
                     )}
                </CardContent>
            </Card>

            {/* Card: Recent Activity (Removed - requires dedicated logging service) */}
            {/* <Card className="lg:col-span-2">
                <CardHeader>
                    <CardTitle>Atividade Recente</CardTitle>
                    <CardDescription>Últimas ações realizadas no sistema (Exemplo).</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-xs text-muted-foreground text-center py-4">Funcionalidade de log de atividades não implementada.</p>
                </CardContent>
            </Card> */}

            {/* Placeholder Card for Future/Other Info */}
             <Card className="lg:col-span-2">
                <CardHeader>
                    <CardTitle>Informações Adicionais</CardTitle>
                    <CardDescription>Espaço para futuras métricas ou informações relevantes.</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-center h-32">
                    <p className="text-sm text-muted-foreground">Nenhuma informação adicional no momento.</p>
                </CardContent>
            </Card>
        </div>
    );
}

    