
'use client';

import * as React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Users, CheckSquare, AlertTriangle, TrendingUp, Activity, Loader2 } from 'lucide-react'; // Changed AlertCircle to AlertTriangle, added Activity, Loader2
import type { RankingEntry } from '@/services/ranking';
import { getRanking } from '@/services/ranking';
import type { Task } from '@/services/task';
import { getAllTasks } from '@/services/task'; // Assuming a function to get failed tasks might use this or a dedicated one
import type { Department } from '@/services/department';
import { getAllDepartments } from '@/services/department';
import { useToast } from '@/hooks/use-toast';
import { format, startOfMonth } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton'; // Import Skeleton

// Interface for dashboard summary data
interface DashboardSummary {
    teamPerformance: number;
    pendingEvaluations: number; // Placeholder, needs evaluation service integration
    criticalAlerts: number; // Placeholder, needs logic based on ranking/zeros
    topPerformers: RankingEntry[];
    recentActivity: { timestamp: string; description: string }[]; // Keep mock for now
    departmentPerformance: { name: string; performance: number }[];
    failedTasks: { name: string; count: number }[]; // Placeholder, needs logic based on evaluations
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
                const ranking = await getRanking(currentMonth); // Fetch all for calculations

                // Fetch departments to calculate average performance per department
                const departments = await getAllDepartments();

                // Fetch tasks (example: maybe to identify most failed tasks later)
                // const tasks = await getAllTasks(); // This might be needed for 'failedTasks' logic

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

                // --- Placeholder Data (Needs real implementation) ---
                const pendingEvaluations = 5; // TODO: Fetch from evaluation service
                const criticalAlerts = ranking.filter(e => e.isEligibleForBonus === false && e.averagePercentage < 70).length; // Example logic
                const failedTasks = [ // TODO: Fetch from evaluation service based on zero scores
                    { name: "Follow-up Cliente X", count: 5 },
                    { name: "Atualizar CRM", count: 3 },
                ];
                 const recentActivity = [ // TODO: Fetch from an activity log service
                    { timestamp: "2024-07-27 10:00", description: "Avaliação de Carlos Souza concluída." },
                    { timestamp: "2024-07-27 09:30", description: "Nova tarefa 'Relatório Semanal' adicionada." },
                  ];

                setSummary({
                    teamPerformance,
                    pendingEvaluations,
                    criticalAlerts,
                    topPerformers,
                    recentActivity,
                    departmentPerformance,
                    failedTasks,
                });

            } catch (error) {
                console.error("Failed to load dashboard data:", error);
                toast({
                    title: "Erro ao Carregar Dashboard",
                    description: "Não foi possível buscar os dados para o painel.",
                    variant: "destructive",
                });
                // Set empty state or defaults on error?
                setSummary({
                    teamPerformance: 0,
                    pendingEvaluations: 0,
                    criticalAlerts: 0,
                    topPerformers: [],
                    recentActivity: [],
                    departmentPerformance: [],
                    failedTasks: [],
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
                    <CardTitle className="text-sm font-medium">Avaliações Pendentes</CardTitle>
                    <CheckSquare className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{summary.pendingEvaluations}</div>
                    <p className="text-xs text-muted-foreground">Avaliações a serem concluídas hoje</p>
                    {/* TODO: Add link to evaluations page */}
                </CardContent>
            </Card>

            {/* Card: Critical Alerts */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Alertas Críticos</CardTitle>
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{summary.criticalAlerts}</div>
                    <p className="text-xs text-muted-foreground">Colaboradores com desempenho baixo</p>
                    {/* TODO: Add link to ranking page filtered */}
                </CardContent>
            </Card>

            {/* Card: Top Performers */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Melhores Desempenhos</CardTitle>
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
                         <p className="text-xs text-muted-foreground text-center py-4">Nenhum dado ainda.</p>
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

            {/* Card: Recent Activity */}
            <Card className="lg:col-span-2">
                <CardHeader>
                    <CardTitle>Atividade Recente</CardTitle>
                    <CardDescription>Últimas ações realizadas no sistema.</CardDescription>
                </CardHeader>
                <CardContent>
                     {summary.recentActivity.length > 0 ? (
                        <div className="space-y-4">
                        {summary.recentActivity.map((activity, index) => (
                            <div key={index} className="flex items-start space-x-3">
                                <div className="flex-shrink-0 pt-1">
                                    <Activity className="h-4 w-4 text-muted-foreground" />
                                </div>
                            <div className="flex-1">
                                <p className="text-sm">{activity.description}</p>
                                <p className="text-xs text-muted-foreground">{activity.timestamp}</p>
                            </div>
                            </div>
                        ))}
                        </div>
                    ) : (
                        <p className="text-xs text-muted-foreground text-center py-4">Nenhuma atividade recente registrada.</p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
