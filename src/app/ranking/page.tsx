'use client';

import * as React from 'react';
import { format } from 'date-fns'; // Import date-fns format
import { ptBR } from 'date-fns/locale'; // Import ptBR locale
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Trophy, Cog, History, Award as AwardIcon, Crown, Medal, BarChartHorizontal, Loader2 } from "lucide-react";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { DatePicker } from '@/components/ui/date-picker'; // Assuming a DatePicker component exists
import { DataTable } from '@/components/ui/data-table'; // Assuming a DataTable component exists
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useForm, Controller } from 'react-hook-form'; // Import useForm and Controller
import { zodResolver } from '@hookform/resolvers/zod'; // Import zodResolver
import * as z from 'zod'; // Import zod
import type { ColumnDef } from "@tanstack/react-table"; // If using Tanstack Table

// Mock Data Types (replace with actual types)
interface Award {
    id: string;
    title: string;
    description: string;
    monetaryValue?: number;
    nonMonetaryValue?: string;
    imageUrl?: string;
    period: string; // e.g., "2024-08", "recorrente"
    eligibilityCriteria?: string; // Renamed from requiresExcellence for clarity
    winnerCount: number;
    valuesPerPosition?: { [key: number]: { monetary?: number, nonMonetary?: string } }; // For different values
    eligibleDepartments: string[]; // IDs or names, 'all' for everyone
    status: 'active' | 'inactive' | 'draft';
    isRecurring: boolean; // Added to distinguish recurring
    specificMonth?: Date; // Added for specific month awards
}

interface RankingEntry {
    rank: number;
    employeeId: string;
    employeeName: string;
    employeePhotoUrl?: string;
    department: string;
    role: string;
    score: number;
    zeros: number;
    trend?: 'up' | 'down' | 'stable';
}

interface AwardHistoryEntry {
    period: string; // e.g., "2024-07"
    awardTitle: string;
    winners: { rank: number; employeeName: string; prize: string }[];
    deliveryPhotoUrl?: string;
    notes?: string;
}

// Zod Schema for Award Form Validation
const awardSchema = z.object({
    title: z.string().min(3, "Título deve ter pelo menos 3 caracteres."),
    description: z.string().min(5, "Descrição deve ter pelo menos 5 caracteres."),
    monetaryValue: z.coerce.number().optional(), // Coerce to number, make optional
    nonMonetaryValue: z.string().optional(),
    imageUrl: z.string().url("URL da imagem inválida.").optional().or(z.literal('')),
    isRecurring: z.boolean(),
    specificMonth: z.date().optional(),
    eligibilityCriteria: z.boolean().default(false), // Checkbox for excellence
    winnerCount: z.coerce.number().min(1, "Deve haver pelo menos 1 ganhador.").default(1),
    // TODO: Add validation for valuesPerPosition if winnerCount > 1
    eligibleDepartments: z.array(z.string()).min(1, "Selecione pelo menos um departamento ou 'Todos'."), // Needs refinement based on selector component
    status: z.enum(['active', 'inactive', 'draft']).default('draft'),
}).refine(data => data.isRecurring || data.specificMonth, {
    message: "Se não for recorrente, um mês específico deve ser selecionado.",
    path: ["specificMonth"],
}).refine(data => !data.monetaryValue || data.monetaryValue >= 0, {
    message: "Valor monetário não pode ser negativo.",
    path: ["monetaryValue"],
});


type AwardFormData = z.infer<typeof awardSchema>;


// Mock Data (Replace with API calls)
const mockAwards: Award[] = [
    { id: 'awd1', title: 'Colaborador do Mês', description: 'Reconhecimento pelo desempenho excepcional.', monetaryValue: 500, period: 'recorrente', winnerCount: 1, eligibleDepartments: ['all'], status: 'active', isRecurring: true },
    { id: 'awd2', title: 'Destaque Operacional - Julho', description: 'Melhor performance nas tarefas operacionais.', nonMonetaryValue: 'Folga adicional', period: '2024-07', winnerCount: 1, eligibleDepartments: ['Engenharia', 'RH'], status: 'inactive', isRecurring: false, specificMonth: new Date(2024, 6, 1) }, // Month is 0-indexed
    { id: 'awd3', title: 'Top 3 Vendas', description: 'Maiores resultados em vendas.', monetaryValue: 300, period: 'recorrente', winnerCount: 3, eligibleDepartments: ['Vendas'], status: 'active', isRecurring: true, valuesPerPosition: { 1: { monetary: 300 }, 2: { monetary: 200 }, 3: { monetary: 100 } } },
];

const mockRanking: RankingEntry[] = [
    { rank: 1, employeeId: '1', employeeName: 'Alice Silva', department: 'RH', role: 'Recrutadora', score: 980, zeros: 0, trend: 'up', employeePhotoUrl: 'https://picsum.photos/id/1027/40/40' },
    { rank: 2, employeeId: '4', employeeName: 'Davi Costa', department: 'Vendas', role: 'Executivo de Contas', score: 950, zeros: 1, trend: 'stable', employeePhotoUrl: 'https://picsum.photos/id/338/40/40' },
    { rank: 3, employeeId: '5', employeeName: 'Eva Pereira', department: 'Engenharia', role: 'Desenvolvedora Frontend', score: 945, zeros: 1, trend: 'down' },
    { rank: 4, employeeId: '2', employeeName: 'Beto Santos', department: 'Engenharia', role: 'Desenvolvedor Backend', score: 920, zeros: 2, trend: 'up', employeePhotoUrl: 'https://picsum.photos/id/1005/40/40' },
    // Add more mock employees
];

const mockHistory: AwardHistoryEntry[] = [
    { period: '2024-07', awardTitle: 'Destaque Operacional - Julho', winners: [{ rank: 1, employeeName: 'Beto Santos', prize: 'Folga adicional' }], notes: 'Entrega realizada na reunião semanal.' },
    { period: '2024-06', awardTitle: 'Colaborador do Mês', winners: [{ rank: 1, employeeName: 'Alice Silva', prize: 'R$ 500,00' }], deliveryPhotoUrl: 'https://picsum.photos/seed/award6/200/100' },
];

// DataTable Columns definition (example for ranking)
const rankingColumns: ColumnDef<RankingEntry>[] = [
    {
        accessorKey: "rank",
        header: "#",
        cell: ({ row }) => (
            <div className="font-medium text-center w-8">
                {row.original.rank <= 3 && row.original.rank === 1 && <Crown className="h-5 w-5 text-yellow-500 mx-auto" />}
                {row.original.rank <= 3 && row.original.rank === 2 && <Medal className="h-5 w-5 text-slate-400 mx-auto" />}
                {row.original.rank <= 3 && row.original.rank === 3 && <Medal className="h-5 w-5 text-yellow-700 mx-auto" />}
                {row.original.rank > 3 && row.getValue("rank")}
            </div>
        ),
        size: 50,
    },
    {
        accessorKey: "employeeName",
        header: "Colaborador",
        cell: ({ row }) => (
            <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                    <AvatarImage src={row.original.employeePhotoUrl} alt={row.original.employeeName} />
                    <AvatarFallback>{row.original.employeeName?.split(' ').map(n => n[0]).slice(0, 2).join('') || '??'}</AvatarFallback>
                </Avatar>
                <span className="font-medium">{row.original.employeeName}</span>
            </div>
        ),
    },
    { accessorKey: "department", header: "Departamento" },
    { accessorKey: "role", header: "Função" },
    {
        accessorKey: "score",
        header: "Pontuação",
        cell: ({ row }) => <div className="text-right font-semibold">{row.getValue("score")}</div>,
        size: 100,
    },
     {
        accessorKey: "zeros",
        header: "Zeros",
        cell: ({ row }) => <div className={`text-right ${Number(row.getValue("zeros")) > 0 ? 'text-destructive font-semibold' : ''}`}>{row.getValue("zeros")}</div>,
        size: 80,
    },
    // Add more columns like 'trend' if needed
];

// --- Component Sections ---

const RankingDashboard = () => {
    // TODO: Fetch real data
    const [rankingData, setRankingData] = React.useState(mockRanking);
    const [currentMonth] = React.useState(new Date()); // Initialize currentMonth correctly

     // Calculate remaining days in the month
    const calculateRemainingDays = () => {
        const today = new Date();
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0); // Last day of current month
        const diffTime = Math.abs(endOfMonth.getTime() - today.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    const remainingDays = calculateRemainingDays();


    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Trophy className="h-5 w-5" /> Ranking Atual - {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
                    </CardTitle>
                    <CardDescription>Visualização do desempenho dos colaboradores no mês corrente.</CardDescription>
                </CardHeader>
                <CardContent>
                    {/* Top 3 Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        {rankingData.slice(0, 3).map((emp, index) => (
                            <Card key={emp.employeeId} className={`border-2 ${index === 0 ? 'border-yellow-500' : index === 1 ? 'border-slate-400' : 'border-yellow-700'}`}>
                                <CardHeader className="flex flex-row items-center gap-3 pb-2">
                                    {index === 0 && <Crown className="h-6 w-6 text-yellow-500" />}
                                    {index === 1 && <Medal className="h-6 w-6 text-slate-400" />}
                                    {index === 2 && <Medal className="h-6 w-6 text-yellow-700" />}
                                    <Avatar className="h-10 w-10">
                                        <AvatarImage src={emp.employeePhotoUrl} />
                                        <AvatarFallback>{emp.employeeName?.split(' ').map(n => n[0]).slice(0, 2).join('') || '??'}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <CardTitle className="text-base">{emp.employeeName}</CardTitle>
                                        <CardDescription>{emp.role}</CardDescription>
                                    </div>
                                </CardHeader>
                                <CardContent className="text-sm flex justify-between items-center pt-1">
                                    <span>Pontos: <strong className="font-semibold">{emp.score}</strong></span>
                                    <Badge variant={emp.zeros > 0 ? "destructive" : "default"} className="text-xs">{emp.zeros} Zero(s)</Badge>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {/* Data Table */}
                    {/* Replace with actual DataTable component instance */}
                    <DataTable columns={rankingColumns} data={rankingData} filterColumn='employeeName' filterPlaceholder="Filtrar por colaborador..."/>
                     <p className="text-xs text-muted-foreground mt-4">*Ranking baseado nas avaliações diárias. Zeros impactam negativamente.</p>
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><BarChartHorizontal className="h-5 w-5" /> Status da Premiação</CardTitle>
                </CardHeader>
                 <CardContent className="text-sm text-muted-foreground">
                    <p><strong>Período de Apuração:</strong> {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}</p>
                    {/* TODO: Dynamically fetch the active award */}
                    <p><strong>Premiação Vigente:</strong> {mockAwards.find(a => a.status === 'active' && a.isRecurring)?.title || 'Nenhuma definida'}</p>
                    <p><strong>Dias Restantes:</strong> {remainingDays}</p>
                     <div className="mt-4 flex gap-2">
                          {/* TODO: Implement export functionality */}
                         <Button size="sm" variant="outline" onClick={() => alert("Funcionalidade Exportar Ranking não implementada.")}>Exportar Ranking</Button>
                         {/* Link/Button to navigate to Award configuration can be added here */}
                     </div>
                 </CardContent>
            </Card>
        </div>
    );
};

const AwardConfiguration = () => {
    // TODO: Fetch real data
    const [awards, setAwards] = React.useState(mockAwards);
    const [isSaving, setIsSaving] = React.useState(false);
    const { toast } = useToast();

    // Initialize react-hook-form
    const form = useForm<AwardFormData>({
        resolver: zodResolver(awardSchema),
        defaultValues: {
            title: '',
            description: '',
            monetaryValue: undefined,
            nonMonetaryValue: '',
            imageUrl: '',
            isRecurring: true,
            specificMonth: undefined,
            eligibilityCriteria: false,
            winnerCount: 1,
            eligibleDepartments: ['all'], // Default to all
            status: 'draft',
        },
    });

    const { register, handleSubmit, control, watch, setValue, formState: { errors } } = form;
    const isRecurring = watch('isRecurring');


    const handleSaveAward = async (data: AwardFormData) => {
        setIsSaving(true);
        console.log("Salvando Premiação:", data);

        const period = data.isRecurring ? 'recorrente' : data.specificMonth ? format(data.specificMonth, 'yyyy-MM') : 'erro';
         if (period === 'erro') {
            toast({ title: "Erro", description: "Mês específico inválido.", variant: "destructive" });
            setIsSaving(false);
            return;
         }


        // Simulate API call to save/update award
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Construct the Award object (assuming save is successful)
        const newOrUpdatedAward: Award = {
            id: `awd${Date.now()}`, // Generate or use existing ID if editing
            title: data.title,
            description: data.description,
            monetaryValue: data.monetaryValue,
            nonMonetaryValue: data.nonMonetaryValue,
            imageUrl: data.imageUrl,
            period: period,
            eligibilityCriteria: data.eligibilityCriteria ? 'excellence_required' : undefined,
            winnerCount: data.winnerCount,
            // valuesPerPosition: data.valuesPerPosition, // Add logic if needed
            eligibleDepartments: data.eligibleDepartments,
            status: data.status, // Or determine based on action (e.g., 'active' on publish)
            isRecurring: data.isRecurring,
            specificMonth: data.specificMonth,
        };


        // TODO: Implement actual save/update logic (add to mock data or call API)
        setAwards(prev => {
            // Basic add logic for demo - replace with proper update/add
            const existingIndex = prev.findIndex(a => /* condition to check if editing */ false);
            if (existingIndex > -1) {
                const updatedAwards = [...prev];
                updatedAwards[existingIndex] = newOrUpdatedAward;
                return updatedAwards;
            } else {
                return [...prev, newOrUpdatedAward];
            }
        });


        toast({ title: "Sucesso!", description: `Premiação "${data.title}" salva.` });
        form.reset(); // Reset form after successful save
        setIsSaving(false);
    };

     const onSubmit = (data: AwardFormData) => {
        handleSaveAward(data);
    };

     // TODO: Mock list of departments for the selector
    const mockDepartments = ['RH', 'Engenharia', 'Marketing', 'Vendas', 'Operações'];


    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><AwardIcon className="h-5 w-5" /> Configurar Premiações</CardTitle>
                    <CardDescription>Cadastre, edite e gerencie as premiações mensais ou recorrentes.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* List existing awards - TODO: Make editable/deletable */}
                    <h3 className="font-medium mb-2">Premiações Ativas/Rascunhos</h3>
                    <div className="space-y-2">
                         {awards.map(award => (
                            <div key={award.id} className="flex justify-between items-center p-2 border rounded-md">
                                <div className="flex items-center gap-2">
                                     {/* Placeholder for award image/icon */}
                                    {award.imageUrl ? <Avatar className="h-8 w-8"><AvatarImage src={award.imageUrl} /></Avatar> : <AwardIcon className="h-6 w-6 text-muted-foreground" />}
                                    <div>
                                        <span className="font-medium">{award.title}</span>
                                        <span className="text-xs text-muted-foreground block">({award.period === 'recorrente' ? 'Recorrente' : `Específico: ${award.period}`})</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge variant={award.status === 'active' ? 'default' : 'secondary'}>{award.status}</Badge>
                                    {/* TODO: Add Edit/Delete/Activate buttons */}
                                     <Button variant="ghost" size="sm" onClick={() => alert(`Editar ${award.title}`)}>Editar</Button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <Separator />

                    {/* Form to add new award using react-hook-form */}
                    <h3 className="font-medium pt-4">Adicionar/Editar Premiação</h3>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
                        {/* Title */}
                         <div className="space-y-1">
                            <Label htmlFor="awardTitle">Título da Premiação</Label>
                            <Input id="awardTitle" placeholder="Ex: Colaborador do Mês" {...register("title")} />
                             {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
                         </div>
                         {/* Description */}
                         <div className="space-y-1">
                            <Label htmlFor="awardDesc">Descrição</Label>
                            <Textarea id="awardDesc" placeholder="Detalhes da premiação..." {...register("description")} />
                             {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
                         </div>
                         {/* Monetary and Non-Monetary Values */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <Label htmlFor="awardValue">Valor Monetário (R$)</Label>
                                <Input id="awardValue" type="number" placeholder="Ex: 500.00" step="0.01" {...register("monetaryValue")} />
                                {errors.monetaryValue && <p className="text-sm text-destructive">{errors.monetaryValue.message}</p>}
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="awardNonValue">Prêmio Não-Monetário</Label>
                                <Input id="awardNonValue" placeholder="Ex: Folga adicional, Troféu" {...register("nonMonetaryValue")} />
                                {errors.nonMonetaryValue && <p className="text-sm text-destructive">{errors.nonMonetaryValue.message}</p>}
                            </div>
                        </div>
                         {/* Image URL */}
                        <div className="space-y-1">
                            <Label htmlFor="imageUrl">URL da Imagem (Opcional)</Label>
                            <Input id="imageUrl" placeholder="https://..." {...register("imageUrl")} />
                            {errors.imageUrl && <p className="text-sm text-destructive">{errors.imageUrl.message}</p>}
                        </div>

                        {/* Period (Recurring / Specific Month) */}
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                             <Controller
                                name="isRecurring"
                                control={control}
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm h-[40px]">
                                        <Label htmlFor="isRecurringSwitch">É Recorrente Mensal?</Label>
                                        <Switch
                                            id="isRecurringSwitch"
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                        />
                                    </FormItem>
                                )}
                            />
                             {!isRecurring && (
                                 <Controller
                                    name="specificMonth"
                                    control={control}
                                    render={({ field }) => (
                                         <FormItem className="flex flex-col">
                                            <Label>Mês Específico</Label>
                                                <DatePicker
                                                    date={field.value}
                                                    setDate={field.onChange}
                                                    placeholder="Selecione o mês"
                                                />
                                            {errors.specificMonth && <p className="text-sm text-destructive">{errors.specificMonth.message}</p>}
                                         </FormItem>
                                    )}
                                />
                            )}
                         </div>
                          {/* Winner Count */}
                          <div className="space-y-1">
                                <Label htmlFor="awardWinners">Nº de Ganhadores</Label>
                                <Input id="awardWinners" type="number" defaultValue="1" min="1" {...register("winnerCount")} />
                                {errors.winnerCount && <p className="text-sm text-destructive">{errors.winnerCount.message}</p>}
                                {/* TODO: Add fields for different values per position if winnerCount > 1 */}
                            </div>

                         {/* Eligibility Criteria */}
                         <Controller
                            name="eligibilityCriteria"
                            control={control}
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center space-x-2 pt-2">
                                    <Checkbox
                                        id="eligibility"
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                    />
                                    <Label htmlFor="eligibility" className="text-sm font-normal">Exigir avaliação de excelência para elegibilidade?</Label>
                                </FormItem>
                            )}
                        />
                         {/* Eligible Departments */}
                          <Controller
                                name="eligibleDepartments"
                                control={control}
                                render={({ field }) => (
                                    <FormItem>
                                        <Label>Departamentos Elegíveis</Label>
                                        {/* This needs a multi-select component. Using Checkboxes for demo */}
                                        <div className="flex flex-wrap gap-4 p-2 border rounded-md">
                                            <div className="flex items-center space-x-2">
                                                <Checkbox
                                                    id="dept-all"
                                                    checked={field.value?.includes('all')}
                                                    onCheckedChange={(checked) => {
                                                        field.onChange(checked ? ['all'] : []);
                                                    }}
                                                />
                                                <Label htmlFor="dept-all" className="font-normal">Todos</Label>
                                            </div>
                                            {mockDepartments.map(dept => (
                                                <div key={dept} className="flex items-center space-x-2">
                                                    <Checkbox
                                                        id={`dept-${dept}`}
                                                        checked={field.value?.includes(dept)}
                                                        onCheckedChange={(checked) => {
                                                            const currentSelection = field.value?.filter(d => d !== 'all') || [];
                                                            const newSelection = checked
                                                                ? [...currentSelection, dept]
                                                                : currentSelection.filter(d => d !== dept);
                                                            field.onChange(newSelection.length === 0 ? [] : newSelection);
                                                        }}
                                                        disabled={field.value?.includes('all')}
                                                    />
                                                    <Label htmlFor={`dept-${dept}`} className="font-normal">{dept}</Label>
                                                </div>
                                            ))}
                                        </div>
                                         {errors.eligibleDepartments && <p className="text-sm text-destructive">{errors.eligibleDepartments.message}</p>}
                                    </FormItem>
                                )}
                            />


                         <Button type="submit" disabled={isSaving}>
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isSaving ? 'Salvando...' : 'Salvar Premiação'}
                         </Button>
                    </form>

                </CardContent>
            </Card>
             {/* TODO: Add section for Award Process Management (Confirm winners, etc.) */}
             {/* TODO: Add Advanced Settings section */}
        </div>
    );
};

const AwardHistory = () => {
    // TODO: Fetch real data
     const [history, setHistory] = React.useState(mockHistory);

    return (
         <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><History className="h-5 w-5" /> Histórico de Premiações</CardTitle>
                    <CardDescription>Consulte os resultados e vencedores de premiações anteriores.</CardDescription>
                </CardHeader>
                <CardContent>
                    {history.length === 0 ? (
                        <p className="text-muted-foreground">Nenhum histórico de premiação encontrado.</p>
                    ) : (
                        <div className="space-y-4">
                            {history.map((entry, index) => (
                                <Card key={index}> {/* Use a more stable key if possible */}
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-base">{entry.awardTitle} - {entry.period}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="text-sm space-y-1">
                                        <strong>Vencedores:</strong>
                                        <ul className="list-disc list-inside pl-2">
                                            {entry.winners.map(w => (
                                                <li key={w.employeeName}>{w.rank}º: {w.employeeName} ({w.prize})</li>
                                            ))}
                                        </ul>
                                        {entry.deliveryPhotoUrl && (
                                            <div className="mt-2">
                                                <strong>Foto da Entrega:</strong><br/>
                                                <img src={entry.deliveryPhotoUrl} alt={`Entrega ${entry.awardTitle} ${entry.period}`} className="mt-1 rounded-md max-h-32" />
                                            </div>
                                        )}
                                         {entry.notes && <p className="text-xs text-muted-foreground pt-1"><strong>Obs:</strong> {entry.notes}</p>}
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                     {/* TODO: Add Statistics and Export options */}
                </CardContent>
                 <CardFooter>
                     {/* TODO: Implement Export */}
                    <Button variant="outline" onClick={() => alert("Funcionalidade Exportar Histórico não implementada.")}>Exportar Histórico</Button>
                 </CardFooter>
            </Card>
        </div>
    );
};


const AdvancedSettings = () => {
     // TODO: Implement settings logic
     const { toast } = useToast();
     const [isSaving, setIsSaving] = React.useState(false);

     const handleSaveSettings = async () => {
         setIsSaving(true);
          // Simulate API call
         await new Promise(resolve => setTimeout(resolve, 1000));
         toast({ title: "Sucesso", description: "Configurações avançadas salvas (simulado)." });
          setIsSaving(false);
     }

    return (
        <div className="space-y-6">
            <Card>
                 <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Cog className="h-5 w-5" /> Configurações Avançadas do Ranking</CardTitle>
                    <CardDescription>Personalize as regras e a visualização do sistema de ranking.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div className="space-y-2">
                        <Label htmlFor="tieBreaker">Critério de Desempate</Label>
                        <Select defaultValue="zeros">
                            <SelectTrigger id="tieBreaker"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="zeros">Menor número de zeros</SelectItem>
                                <SelectItem value="admission">Data de admissão (mais antigo)</SelectItem>
                                <SelectItem value="manual">Requer intervenção manual</SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">Como o sistema deve desempatar colaboradores com a mesma pontuação.</p>
                    </div>
                     <Separator />
                     <div className="flex items-center space-x-2">
                        <Checkbox id="probation" />
                        <Label htmlFor="probation" className="text-sm font-normal">Incluir colaboradores em período probatório no ranking?</Label>
                     </div>
                    <Separator />
                     <div className="flex items-center space-x-2">
                        <Checkbox id="publicView" />
                        <Label htmlFor="publicView" className="text-sm font-normal">Permitir que colaboradores visualizem o ranking?</Label>
                    </div>
                     {/* Add more settings like Task Weighting, Notification Configs */}
                     <Separator />
                     <div className="space-y-2">
                        <Label htmlFor="notificationLevel">Nível de Notificação (Ranking)</Label>
                        <Select defaultValue="significant">
                            <SelectTrigger id="notificationLevel"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">Nenhuma</SelectItem>
                                <SelectItem value="top3">Entrada/Saída do Top 3</SelectItem>
                                <SelectItem value="significant">Mudanças Significativas (+/- 5 posições)</SelectItem>
                                <SelectItem value="all">Qualquer Mudança</SelectItem>
                            </SelectContent>
                        </Select>
                         <p className="text-xs text-muted-foreground">Quando os colaboradores devem ser notificados sobre sua posição.</p>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button onClick={handleSaveSettings} disabled={isSaving}>
                         {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                         {isSaving ? 'Salvando...' : 'Salvar Configurações Avançadas'}
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}


// Main Page Component
export default function RankingPage() {
  return (
    <div className="space-y-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
             <Trophy className="h-7 w-7" /> Ranking e Premiações
        </h1>
        <p className="text-muted-foreground">
            Gerencie o sistema de ranking mensal, configure premiações e acompanhe o desempenho dos colaboradores.
        </p>

      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 mb-4">
          <TabsTrigger value="dashboard"><Trophy className="mr-2 h-4 w-4"/>Ranking Atual</TabsTrigger>
          <TabsTrigger value="awards"><AwardIcon className="mr-2 h-4 w-4"/>Premiações</TabsTrigger>
          <TabsTrigger value="history"><History className="mr-2 h-4 w-4"/>Histórico</TabsTrigger>
          <TabsTrigger value="settings"><Cog className="mr-2 h-4 w-4"/>Configurações</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <RankingDashboard />
        </TabsContent>
        <TabsContent value="awards">
          <AwardConfiguration />
        </TabsContent>
        <TabsContent value="history">
          <AwardHistory />
        </TabsContent>
         <TabsContent value="settings">
          <AdvancedSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}