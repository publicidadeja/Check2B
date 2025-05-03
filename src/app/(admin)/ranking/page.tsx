
'use client';

import * as React from 'react';
import { format, parseISO, subMonths, addMonths, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Trophy, Cog, History, Award as AwardIcon, Crown, Medal, BarChartHorizontal, Loader2, ListFilter, PlusCircle, Edit, Trash2, MoreHorizontal, FileClock, User, Activity, AlertTriangle, Eye } from "lucide-react";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { DatePicker } from '@/components/ui/date-picker';
import { DataTable } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { ColumnDef } from "@tanstack/react-table";
import { Switch } from '@/components/ui/switch';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogClose
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { getAllAwards, saveAward, deleteAward } from '@/lib/ranking-service'; // Import Firestore service functions
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'; // Ensure Tooltip components are imported
import { getDb } from '@/lib/firebase'; // Import getDb
import { TrendingDown, TrendingUp, Minus } from 'lucide-react'; // Import trend icons

// --- Type Definitions ---
export interface Award {
    id: string;
    title: string;
    description: string;
    monetaryValue?: number;
    nonMonetaryValue?: string;
    imageUrl?: string;
    period: string; // 'recorrente' or 'YYYY-MM'
    eligibilityCriteria?: boolean; // New: Added for excelence requirement
    winnerCount: number;
    valuesPerPosition?: { [key: number]: { monetary?: number, nonMonetary?: string } }; // New: Added for position-specific values
    eligibleDepartments: string[]; // 'all' or list of department names
    status: 'active' | 'inactive' | 'draft'; // Added status
    isRecurring: boolean; // Explicit flag for recurrence
    specificMonth?: Date; // Date object for specific month
}

export interface RankingEntry {
    rank: number;
    employeeId: string;
    employeeName: string;
    employeePhotoUrl?: string;
    department: string;
    role: string;
    score: number;
    zeros: number;
    trend?: 'up' | 'down' | 'stable'; // Added trend
}

interface AwardHistoryEntry {
    id: string;
    period: string; // YYYY-MM
    awardTitle: string;
    winners: { rank: number; employeeName: string; prize: string }[];
    deliveryPhotoUrl?: string;
    notes?: string;
}

// --- Zod Schema for Award Form ---
const awardSchema = z.object({
    title: z.string().min(3, "Título deve ter pelo menos 3 caracteres."),
    description: z.string().min(5, "Descrição deve ter pelo menos 5 caracteres."),
    monetaryValue: z.coerce.number().nonnegative("Valor monetário não pode ser negativo.").optional(),
    nonMonetaryValue: z.string().optional(),
    imageUrl: z.string().url("URL inválida.").optional().or(z.literal('')),
    isRecurring: z.boolean().default(true),
    specificMonth: z.date().optional(),
    eligibilityCriteria: z.boolean().default(false),
    winnerCount: z.coerce.number().int("Número de ganhadores deve ser inteiro.").min(1, "Deve haver pelo menos 1 ganhador.").default(1),
    valuesPerPosition: z.record(z.object({ monetary: z.number().optional(), nonMonetary: z.string().optional() })).optional(), // Added validation for per-position values
    eligibleDepartments: z.array(z.string()).min(1, "Selecione pelo menos um departamento ou 'Todos'."),
    status: z.enum(['active', 'inactive', 'draft']).default('draft'),
}).refine(data => data.isRecurring || data.specificMonth, {
    message: "Se não for recorrente, um mês específico deve ser selecionado.",
    path: ["specificMonth"],
}).refine(data => data.eligibleDepartments.length > 0, {
    message: "A seleção de departamentos não pode estar vazia (escolha 'Todos' se aplicável).",
    path: ["eligibleDepartments"],
});


type AwardFormData = z.infer<typeof awardSchema>;


// --- Mock Data ---
const mockRanking: RankingEntry[] = [
    { rank: 1, employeeId: '1', employeeName: 'Alice Silva', department: 'RH', role: 'Recrutadora', score: 980, zeros: 0, trend: 'up', employeePhotoUrl: 'https://picsum.photos/id/1027/40/40' },
    { rank: 2, employeeId: '4', employeeName: 'Davi Costa', department: 'Vendas', role: 'Executivo de Contas', score: 950, zeros: 1, trend: 'stable', employeePhotoUrl: 'https://picsum.photos/id/338/40/40' },
    { rank: 3, employeeId: '5', employeeName: 'Eva Pereira', department: 'Engenharia', role: 'Desenvolvedora Frontend', score: 945, zeros: 1, trend: 'down', employeePhotoUrl: 'https://picsum.photos/id/1005/40/40' },
    { rank: 4, employeeId: '2', employeeName: 'Beto Santos', department: 'Engenharia', role: 'Desenvolvedor Backend', score: 920, zeros: 2, trend: 'up', employeePhotoUrl: 'https://picsum.photos/id/1005/40/40' },
    { rank: 5, employeeId: '6', employeeName: 'Leo Corax', department: 'Engenharia', role: 'Desenvolvedor Frontend', score: 890, zeros: 3, trend: 'stable', employeePhotoUrl: 'https://picsum.photos/seed/leo/40/40' },
];

const mockHistory: AwardHistoryEntry[] = [
    { id: 'hist1', period: '2024-07', awardTitle: 'Destaque Operacional - Julho', winners: [{ rank: 1, employeeName: 'Beto Santos', prize: 'Folga adicional' }], notes: 'Entrega realizada na reunião semanal.' },
    { id: 'hist2', period: '2024-06', awardTitle: 'Colaborador do Mês', winners: [{ rank: 1, employeeName: 'Alice Silva', prize: 'R$ 500,00' }], deliveryPhotoUrl: 'https://picsum.photos/seed/award6/200/100' },
];

const mockDepartments = ['RH', 'Engenharia', 'Marketing', 'Vendas', 'Operações']; // Used for Award form

// --- Mock API Functions ---

const fetchRankingData = async (period: Date): Promise<RankingEntry[]> => {
    await new Promise(resolve => setTimeout(resolve, 800));
    // Simulate data changes based on month for demo
    const monthFactor = period.getMonth() + 1;
    return mockRanking.map(entry => ({
        ...entry,
        score: Math.max(800, entry.score + (monthFactor * 5 - 20)), // Adjust score slightly per month
        zeros: Math.max(0, entry.zeros + (Math.random() > 0.7 ? 1 : 0) - (Math.random() > 0.8 ? 1 : 0)), // Simulate zero changes
    })).sort((a, b) => b.score - a.score || a.zeros - b.zeros) // Re-sort based on simulated scores
      .map((entry, index) => ({ ...entry, rank: index + 1 })); // Re-assign ranks
}

const fetchAwardHistory = async (): Promise<AwardHistoryEntry[]> => {
     await new Promise(resolve => setTimeout(resolve, 600));
     return [...mockHistory].sort((a, b) => parseISO(b.period + '-01').getTime() - parseISO(a.period + '-01').getTime()); // Sort history descending
}

const confirmWinners = async (period: string, awardId: string, winners: RankingEntry[]): Promise<AwardHistoryEntry> => {
     await new Promise(resolve => setTimeout(resolve, 1000));
     // TODO: Replace with actual call to fetch a single award by ID from Firestore
    const db = getDb();
     const award = await getAwardById(db, awardId);

     // Create history entry based on the winners provided and award definition
     const historyEntry: AwardHistoryEntry = {
         id: `hist${Date.now()}`,
         period: period,
         awardTitle: award.title,
         winners: winners.slice(0, award.winnerCount).map(winner => ({
             rank: winner.rank,
             employeeName: winner.employeeName,
             // Determine prize based on position or default award value
             prize: award.valuesPerPosition?.[winner.rank]?.monetary
                 ? `R$ ${award.valuesPerPosition[winner.rank]?.monetary?.toFixed(2)}`
                 : award.valuesPerPosition?.[winner.rank]?.nonMonetary
                 ? award.valuesPerPosition[winner.rank]?.nonMonetary ?? ''
                 : award.monetaryValue ? `R$ ${award.monetaryValue.toFixed(2)}` : award.nonMonetaryValue || 'Prêmio Indefinido'
         })),
     };
     mockHistory.unshift(historyEntry); // Add to the beginning of the history array
     console.log("Vencedores confirmados e histórico atualizado:", historyEntry);
     return historyEntry;
}

// --- Utility Functions ---
const exportData = (data: any[], filename: string) => {
     if (data.length === 0) {
        alert("Não há dados para exportar.");
        return;
     }
     const header = Object.keys(data[0]).join(',');
     const rows = data.map(row => Object.values(row).map(val => `"${String(val).replace(/"/g, '""')}"`).join(','));
     const csvContent = `data:text/csv;charset=utf-8,${header}\n${rows.join('\n')}`;
     const encodedUri = encodeURI(csvContent);
     const link = document.createElement("a");
     link.setAttribute("href", encodedUri);
     link.setAttribute("download", `${filename}.csv`);
     document.body.appendChild(link);
     link.click();
     document.body.removeChild(link);
}


const getInitials = (name?: string) => {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
}

// --- Trend Icon Helper ---
const getTrendIcon = (trend?: 'up' | 'down' | 'stable') => {
     switch (trend) {
         case 'up': return <TrendingUp className="h-4 w-4 text-green-500" />;
         case 'down': return <TrendingDown className="h-4 w-4 text-red-500" />;
         case 'stable': return <Minus className="h-4 w-4 text-muted-foreground" />;
         default: return <Activity className="h-4 w-4 text-muted-foreground opacity-50"/>; // Default icon if no trend data
     }
 };

// --- Ranking Table Columns ---
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
                    <AvatarFallback>{getInitials(row.original.employeeName)}</AvatarFallback>
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
      {
         accessorKey: "trend",
         header: "Tendência",
         cell: ({ row }) => <div className="flex justify-center">{getTrendIcon(row.original.trend)}</div>,
         size: 80, // Added size for trend column
     },
];

// --- Award Configuration Component ---
const AwardConfigContext = React.createContext<{
    openEditForm: (award: Award) => void;
    handleDeleteClick: (award: Award) => void;
}>({
    openEditForm: () => {},
    handleDeleteClick: () => {},
});

const AwardConfiguration = () => {
    const [awards, setAwards] = React.useState<Award[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [isSaving, setIsSaving] = React.useState(false);
    const [isFormOpen, setIsFormOpen] = React.useState(false);
    const [selectedAward, setSelectedAward] = React.useState<Award | null>(null);
    const [awardToDelete, setAwardToDelete] = React.useState<Award | null>(null);
    const [isDeleting, setIsDeleting] = React.useState(false);
    const { toast } = useToast();

    const loadAwards = React.useCallback(async () => {
        setIsLoading(true);
        try {
            const db = getDb();
            const data = await getAllAwards(db);
            setAwards(data);
        } catch (error) {
            console.error("Falha ao carregar premiações:", error);
            toast({ title: "Erro", description: "Não foi possível carregar as premiações.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    React.useEffect(() => {
        loadAwards();
    }, [loadAwards]);

    const form = useForm<AwardFormData>({
        resolver: zodResolver(awardSchema),
        defaultValues: {
            title: '', description: '', monetaryValue: undefined, nonMonetaryValue: '', imageUrl: '',
            isRecurring: true, specificMonth: undefined, eligibilityCriteria: false, winnerCount: 1,
            eligibleDepartments: ['all'], status: 'draft', valuesPerPosition: {}
        },
    });
    const { control, watch, setValue, handleSubmit, reset } = form;
    const isRecurring = watch('isRecurring');
    const winnerCount = watch('winnerCount');


    const openAddForm = () => {
        setSelectedAward(null);
        reset({
             title: '', description: '', monetaryValue: undefined, nonMonetaryValue: '', imageUrl: '',
             isRecurring: true, specificMonth: undefined, eligibilityCriteria: false, winnerCount: 1,
             eligibleDepartments: ['all'], status: 'draft', valuesPerPosition: {}
        });
        setIsFormOpen(true);
    };

    const openEditForm = React.useCallback((award: Award) => {
        setSelectedAward(award);
        reset({
            title: award.title,
            description: award.description,
            monetaryValue: award.monetaryValue,
            nonMonetaryValue: award.nonMonetaryValue || '',
            imageUrl: award.imageUrl || '',
            isRecurring: award.isRecurring,
            specificMonth: award.specificMonth ? new Date(award.specificMonth) : undefined,
            eligibilityCriteria: award.eligibilityCriteria || false,
            winnerCount: award.winnerCount,
            eligibleDepartments: award.eligibleDepartments || ['all'],
            status: award.status,
            valuesPerPosition: award.valuesPerPosition || {}
        });
        setIsFormOpen(true);
    }, [reset]);

    const handleSaveAward = async (data: AwardFormData) => {
        setIsSaving(true);

         if (!data.isRecurring && !data.specificMonth) {
            toast({ title: "Erro de Validação", description: "Mês específico é obrigatório para premiação não recorrente.", variant: "destructive" });
            setIsSaving(false);
            return;
         }

        const awardPayload: Omit<Award, 'id'> | Award = {
            ...(selectedAward ? { id: selectedAward.id } : {}),
            title: data.title,
            description: data.description,
            monetaryValue: data.monetaryValue,
            nonMonetaryValue: data.nonMonetaryValue,
            imageUrl: data.imageUrl,
            period: data.isRecurring ? 'recorrente' : format(data.specificMonth!, 'yyyy-MM'),
            eligibilityCriteria: data.eligibilityCriteria,
            winnerCount: data.winnerCount,
            eligibleDepartments: data.eligibleDepartments,
            status: data.status,
            isRecurring: data.isRecurring,
            specificMonth: data.isRecurring ? undefined : data.specificMonth,
            valuesPerPosition: data.winnerCount > 1 ? data.valuesPerPosition : undefined // Save per-position only if multiple winners
        };

        try {
            const db = getDb();
            await saveAward(db, awardPayload);
            toast({ title: "Sucesso!", description: `Premiação "${data.title}" ${selectedAward ? 'atualizada' : 'criada'}.` });
            setIsFormOpen(false);
            await loadAwards();
        } catch (error) {
            console.error("Erro ao salvar premiação:", error);
            toast({ title: "Erro", description: `Falha ao salvar premiação.`, variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };


     const handleDeleteClick = React.useCallback((award: Award) => {
        setAwardToDelete(award);
        setIsDeleting(true);
    }, []);

    const confirmDeleteAward = async () => {
        if (awardToDelete) {
            try {
                const db = getDb();
                await deleteAward(db, awardToDelete.id);
                toast({ title: "Sucesso", description: `Premiação "${awardToDelete.title}" removida.` });
                await loadAwards();
            } catch (error: any) {
                 console.error("Erro ao remover premiação:", error);
                toast({ title: "Erro", description: error.message || "Falha ao remover premiação.", variant: "destructive" });
            } finally {
                setIsDeleting(false);
                setAwardToDelete(null);
            }
        }
    };

     const awardColumns: ColumnDef<Award>[] = [
        {
            accessorKey: "title",
            header: "Título",
            cell: ({ row }) => <span className="font-medium">{row.original.title}</span>,
        },
        {
            accessorKey: "period",
            header: "Período",
            cell: ({ row }) => (
                <span>
                    {row.original.isRecurring ? 'Recorrente' : row.original.specificMonth ? format(row.original.specificMonth, 'MMMM yyyy', {locale: ptBR}) : 'Inválido'}
                </span>
            ),
        },
        {
            accessorKey: "winnerCount",
            header: "Ganhadores",
            cell: ({ row }) => <div className="text-center">{row.original.winnerCount}</div>,
            size: 100,
        },
        {
            accessorKey: "eligibleDepartments",
            header: "Elegíveis",
            cell: ({ row }) => (
                <Badge variant="outline">
                    {row.original.eligibleDepartments.includes('all') ? 'Todos Deptos' : `${row.original.eligibleDepartments.length} Depto(s)`}
                </Badge>
            ),
            size: 120,
        },
        {
            accessorKey: "status",
            header: "Status",
            cell: ({ row }) => {
                const variantMap: Record<Award['status'], "default" | "secondary" | "outline"> = {
                    active: 'default',
                    inactive: 'secondary',
                    draft: 'outline'
                };
                return <Badge variant={variantMap[row.original.status]} className={row.original.status === 'active' ? 'bg-green-100 text-green-800' : ''}>{row.original.status === 'active' ? 'Ativa' : row.original.status === 'inactive' ? 'Inativa' : 'Rascunho'}</Badge>;
            },
            size: 100,
        },
        {
            id: "actions",
            cell: ({ row }) => {
                const award = row.original;
                return (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Abrir menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Ações</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => openEditForm(award)}>
                                <Edit className="mr-2 h-4 w-4" /> Editar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                onClick={() => handleDeleteClick(award)}
                                className="text-destructive focus:text-destructive focus:bg-destructive/10"
                                disabled={award.status === 'active'}
                            >
                                <Trash2 className="mr-2 h-4 w-4" /> Remover
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                );
            },
            size: 50,
        },
    ];


    const contextValue = React.useMemo(() => ({ openEditForm, handleDeleteClick }), [openEditForm, handleDeleteClick]);


    return (
         <AwardConfigContext.Provider value={contextValue}>
            <div className="space-y-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2"><AwardIcon className="h-5 w-5" /> Gerenciar Premiações</CardTitle>
                            <CardDescription>Cadastre, edite e gerencie as premiações mensais ou recorrentes.</CardDescription>
                        </div>
                        <Button onClick={openAddForm}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Criar Premiação
                        </Button>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                             <div className="flex justify-center items-center py-10">
                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                             </div>
                        ) : (
                            <DataTable columns={awardColumns} data={awards} filterColumn='title' filterPlaceholder='Buscar por título...'/>
                        )}
                    </CardContent>
                </Card>

                 {/* Award Form Dialog */}
                 <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                     <DialogContent className="sm:max-w-[600px]">
                         <DialogHeader>
                             <DialogTitle>{selectedAward ? 'Editar Premiação' : 'Nova Premiação'}</DialogTitle>
                             <DialogDescription>
                                 {selectedAward ? 'Atualize os detalhes da premiação.' : 'Defina os detalhes da nova premiação.'}
                             </DialogDescription>
                         </DialogHeader>
                        <Form {...form}>
                            <form onSubmit={handleSubmit(handleSaveAward)} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto px-1">
                                <FormField control={control} name="title" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Título</FormLabel>
                                        <FormControl><Input placeholder="Ex: Colaborador do Mês" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                                <FormField control={control} name="description" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Descrição</FormLabel>
                                        <FormControl><Textarea placeholder="Detalhes da premiação..." {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                     <FormField control={control} name="monetaryValue" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Valor Monetário (R$) (Opcional)</FormLabel>
                                            <FormControl><Input type="number" placeholder="Ex: 500.00" step="0.01" {...field} value={field.value ?? ''} onChange={event => field.onChange(event.target.value === '' ? undefined : +event.target.value)} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}/>
                                    <FormField control={control} name="nonMonetaryValue" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Prêmio Não-Monetário (Opcional)</FormLabel>
                                            <FormControl><Input placeholder="Ex: Folga adicional" {...field} value={field.value ?? ''} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}/>
                                </div>
                                <FormField control={control} name="imageUrl" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>URL da Imagem (Opcional)</FormLabel>
                                        <FormControl><Input type="url" placeholder="https://" {...field} value={field.value ?? ''} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                                    <FormField control={control} name="isRecurring" render={({ field }) => (
                                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm h-[40px]">
                                            <Label htmlFor="isRecurringSwitch">É Recorrente Mensal?</Label>
                                            <FormControl><Switch id="isRecurringSwitch" checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                        </FormItem>
                                    )}/>
                                    {!isRecurring && (
                                        <FormField control={control} name="specificMonth" render={({ field }) => (
                                            <FormItem className="flex flex-col">
                                                <FormLabel>Mês Específico</FormLabel>
                                                <FormControl>
                                                    <DatePicker date={field.value} setDate={field.onChange} placeholder="Selecione o mês" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}/>
                                    )}
                                </div>
                                <FormField control={control} name="winnerCount" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Nº de Ganhadores</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                min="1"
                                                {...field}
                                                value={field.value ?? 1}
                                                onChange={event => field.onChange(+event.target.value)}
                                            />
                                         </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                                {/* Values per position - Show only if winnerCount > 1 */}
                                {winnerCount > 1 && (
                                     <div className="space-y-3 border p-3 rounded-md">
                                        <Label>Valores por Posição (Opcional)</Label>
                                        {Array.from({ length: winnerCount }).map((_, index) => {
                                            const position = index + 1;
                                            return (
                                                <div key={`pos-${position}`} className="grid grid-cols-1 md:grid-cols-2 gap-2 items-center">
                                                     <FormField
                                                        control={control}
                                                        name={`valuesPerPosition.${position}.monetary` as any} // Type assertion might be needed
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel className="text-xs">Monetário ({position}º Lugar)</FormLabel>
                                                                 <FormControl><Input type="number" placeholder="R$" step="0.01" {...field} value={field.value ?? ''} onChange={event => field.onChange(event.target.value === '' ? undefined : +event.target.value)} /></FormControl>
                                                                <FormMessage className="text-xs"/>
                                                            </FormItem>
                                                        )}
                                                    />
                                                     <FormField
                                                         control={control}
                                                        name={`valuesPerPosition.${position}.nonMonetary` as any}
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                 <FormLabel className="text-xs">Não-Monetário ({position}º Lugar)</FormLabel>
                                                                 <FormControl><Input placeholder="Prêmio" {...field} value={field.value ?? ''} /></FormControl>
                                                                <FormMessage className="text-xs"/>
                                                            </FormItem>
                                                        )}
                                                    />
                                                </div>
                                             );
                                         })}
                                        <p className="text-xs text-muted-foreground">Se não preenchido, usará o valor padrão da premiação.</p>
                                    </div>
                                )}

                                 <FormField control={control} name="eligibilityCriteria" render={({ field }) => (
                                    <FormItem className="flex flex-row items-center space-x-2 pt-2">
                                        <FormControl><Checkbox id="eligibility" checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                        <Label htmlFor="eligibility" className="text-sm font-normal"> Exigir avaliação de excelência (sem zeros no mês)?</Label>
                                    </FormItem>
                                )}/>
                                <FormField control={control} name="eligibleDepartments" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Departamentos Elegíveis</FormLabel>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <FormControl>
                                                    <Button variant="outline" className="w-full justify-start font-normal">
                                                        {field.value?.includes('all') ? 'Todos os Departamentos' :
                                                         field.value && field.value.length > 0 ? `${field.value.length} Departamento(s) selecionado(s)` :
                                                         'Selecione os departamentos...'}
                                                    </Button>
                                                </FormControl>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[--radix-popover-trigger-width] max-h-60 overflow-y-auto p-0">
                                                <div className="p-2 space-y-1">
                                                    <div className="flex items-center space-x-2 px-2 py-1 hover:bg-muted rounded-sm">
                                                        <Checkbox
                                                            id="dept-all"
                                                            checked={field.value?.includes('all')}
                                                            onCheckedChange={(checked) => field.onChange(checked ? ['all'] : [])}
                                                        />
                                                        <Label htmlFor="dept-all" className="font-normal text-sm">Todos</Label>
                                                    </div>
                                                     <Separator />
                                                    {mockDepartments.map(dept => (
                                                        <div key={dept} className="flex items-center space-x-2 px-2 py-1 hover:bg-muted rounded-sm">
                                                            <Checkbox
                                                                id={`dept-${dept}`}
                                                                checked={field.value?.includes(dept)}
                                                                onCheckedChange={(checked) => {
                                                                    const currentSelection = field.value?.filter(d => d !== 'all') || [];
                                                                    const newSelection = checked
                                                                        ? [...currentSelection, dept]
                                                                        : currentSelection.filter(d => d !== dept);
                                                                    field.onChange(newSelection);
                                                                }}
                                                                disabled={field.value?.includes('all')}
                                                            />
                                                            <Label htmlFor={`dept-${dept}`} className="font-normal text-sm">{dept}</Label>
                                                        </div>
                                                    ))}
                                                </div>
                                            </PopoverContent>
                                        </Popover>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                                <FormField control={control} name="status" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Status</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                             <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                             <SelectContent>
                                                 <SelectItem value="draft">Rascunho</SelectItem>
                                                 <SelectItem value="active">Ativa</SelectItem>
                                                 <SelectItem value="inactive">Inativa</SelectItem>
                                             </SelectContent>
                                        </Select>
                                        <FormDescription>Premiações ativas serão consideradas no ranking.</FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}/>

                                <DialogFooter>
                                    <DialogClose asChild><Button type="button" variant="outline">Cancelar</Button></DialogClose>
                                    <Button type="submit" disabled={isSaving}>
                                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        {selectedAward ? 'Salvar Alterações' : 'Criar Premiação'}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </Form>
                     </DialogContent>
                 </Dialog>

                 <AlertDialog open={isDeleting} onOpenChange={setIsDeleting}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Confirmar Remoção</AlertDialogTitle>
                            <AlertDialogDescription>
                                Tem certeza que deseja remover a premiação "{awardToDelete?.title}"? Esta ação não pode ser desfeita. Premiações ativas não podem ser removidas.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => setAwardToDelete(null)}>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={confirmDeleteAward} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                Remover
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </AwardConfigContext.Provider>
    );
};

// --- Award History Component ---
const AwardHistory = () => {
     const [history, setHistory] = React.useState<AwardHistoryEntry[]>([]);
     const [isLoading, setIsLoading] = React.useState(true);
     const { toast } = useToast();

     React.useEffect(() => {
        const loadHistory = async () => {
            setIsLoading(true);
            try {
                const data = await fetchAwardHistory();
                setHistory(data);
            } catch (error) {
                 console.error("Falha ao carregar histórico:", error);
                 toast({ title: "Erro", description: "Não foi possível carregar o histórico de premiações.", variant: "destructive" });
            } finally {
                 setIsLoading(false);
            }
        };
        loadHistory();
     }, [toast]);

     const handleExportHistory = () => {
        exportData(history, 'historico_premiacoes');
        toast({ title: "Sucesso", description: "Histórico exportado como CSV." });
     };


    return (
         <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><History className="h-5 w-5" /> Histórico de Premiações</CardTitle>
                    <CardDescription>Consulte os resultados e vencedores de premiações anteriores.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center items-center py-10">
                             <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : history.length === 0 ? (
                        <p className="text-muted-foreground text-center py-5">Nenhum histórico de premiação encontrado.</p>
                    ) : (
                        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                            {history.map((entry) => (
                                <Card key={entry.id} className="shadow-sm">
                                    <CardHeader className="pb-3 pt-4 px-4">
                                         <CardTitle className="text-base">{entry.awardTitle} - {entry.period}</CardTitle>
                                         <CardDescription>Vencedor(es) e detalhes da entrega.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="text-sm space-y-2 px-4 pb-4">
                                        <div>
                                            <strong>Vencedores:</strong>
                                            <ul className="list-disc list-inside pl-4 mt-1">
                                                {entry.winners.map((w, idx) => (
                                                    <li key={`${entry.id}-winner-${idx}`}>
                                                        {w.rank}º Lugar: <strong>{w.employeeName}</strong> (Prêmio: {w.prize})
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                        {entry.deliveryPhotoUrl && (
                                            <div className="mt-2">
                                                <strong>Foto da Entrega:</strong><br/>
                                                <img src={entry.deliveryPhotoUrl} alt={`Entrega ${entry.awardTitle} ${entry.period}`} className="mt-1 rounded-md max-h-32 border" />
                                            </div>
                                        )}
                                         {entry.notes && <p className="text-xs text-muted-foreground pt-1"><strong>Observações:</strong> {entry.notes}</p>}
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </CardContent>
                 <CardFooter>
                    <Button variant="outline" onClick={handleExportHistory} disabled={isLoading || history.length === 0}>
                        <FileClock className="mr-2 h-4 w-4"/> Exportar Histórico
                    </Button>
                 </CardFooter>
            </Card>
        </div>
    );
};

// --- Advanced Settings Component ---
const AdvancedSettings = () => {
     const { toast } = useToast();
     const [isSaving, setIsSaving] = React.useState(false);
     // State for settings - load initial values from backend
     const [tieBreaker, setTieBreaker] = React.useState('zeros');
     const [includeProbation, setIncludeProbation] = React.useState(false);
     const [publicView, setPublicView] = React.useState(true);
     const [notificationLevel, setNotificationLevel] = React.useState('significant');

     React.useEffect(() => {
         // TODO: Fetch current settings from backend on component mount
         console.log("Fetching advanced settings...");
     }, []);


     const handleSaveSettings = async () => {
         setIsSaving(true);
         console.log("Salvando configs:", { tieBreaker, includeProbation, publicView, notificationLevel });
         // TODO: Send settings to backend API
         await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
         toast({ title: "Sucesso", description: "Configurações avançadas salvas." });
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
                        <Select value={tieBreaker} onValueChange={setTieBreaker}>
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
                        <Switch id="probation" checked={includeProbation} onCheckedChange={setIncludeProbation} />
                        <Label htmlFor="probation" className="text-sm font-normal">Incluir colaboradores em período probatório no ranking?</Label>
                     </div>
                    <Separator />
                     <div className="flex items-center space-x-2">
                        <Switch id="publicView" checked={publicView} onCheckedChange={setPublicView} />
                        <Label htmlFor="publicView" className="text-sm font-normal">Permitir que colaboradores visualizem o ranking?</Label>
                    </div>
                     <Separator />
                     <div className="space-y-2">
                        <Label htmlFor="notificationLevel">Nível de Notificação (Ranking)</Label>
                         <Select value={notificationLevel} onValueChange={setNotificationLevel}>
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
                         {isSaving ? 'Salvando...' : 'Salvar Configurações'}
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}

// --- Ranking Dashboard Component ---
const RankingDashboard = () => {
    const [rankingData, setRankingData] = React.useState<RankingEntry[]>([]);
    const [currentMonth, setCurrentMonth] = React.useState(new Date());
    const [isLoading, setIsLoading] = React.useState(true);
    const [isConfirmingWinners, setIsConfirmingWinners] = React.useState(false);
    const { toast } = useToast();

    React.useEffect(() => {
        const loadRanking = async () => {
             setIsLoading(true);
             try {
                 const data = await fetchRankingData(currentMonth);
                 setRankingData(data);
             } catch (error) {
                 console.error("Falha ao carregar ranking:", error);
                 toast({ title: "Erro", description: "Não foi possível carregar o ranking.", variant: "destructive" });
             } finally {
                 setIsLoading(false);
             }
        };
        loadRanking();
    }, [currentMonth, toast]);

    const calculateRemainingDays = () => {
        const today = new Date();
        if (today.getMonth() !== currentMonth.getMonth() || today.getFullYear() !== currentMonth.getFullYear()) {
            return 0; // Not the current month
        }
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        const diffTime = Math.abs(endOfMonth.getTime() - today.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    const remainingDays = calculateRemainingDays();
    // TODO: Optimize this to only fetch necessary awards or cache
    const [activeAward, setActiveAward] = React.useState<Award | null>(null);
    const isCurrentMonth = new Date().getMonth() === currentMonth.getMonth() && new Date().getFullYear() === currentMonth.getFullYear();
    const canConfirmWinners = !isCurrentMonth && activeAward && rankingData.length > 0;

    const handlePreviousMonth = () => {
        setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
         setCurrentMonth(prev => {
             const next = new Date(prev.getFullYear(), prev.getMonth() + 1, 1);
             return next <= new Date() ? next : prev; // Prevent going to future months
         });
    };

    React.useEffect(() => {
        const loadActiveAward = async () => {
            try {
                const db = getDb();
                const award = await getActiveAward(db, currentMonth);
                setActiveAward(award);
            } catch (error) {
            }
        };
        loadActiveAward();
    };

    const handleConfirmWinners = async () => {
        if (!canConfirmWinners || !activeAward) return;
        setIsConfirmingWinners(true);
        try {
            const periodStr = format(currentMonth, 'yyyy-MM');
            await confirmWinners(periodStr, activeAward.id, rankingData);
             toast({ title: "Sucesso!", description: `Vencedores para ${format(currentMonth, 'MMMM yyyy', { locale: ptBR })} confirmados.` });
             // Optionally: Refresh history or mark award as concluded for the month
        } catch (error) {
            console.error("Erro ao confirmar vencedores:", error);
            toast({ title: "Erro", description: "Falha ao confirmar vencedores.", variant: "destructive" });
        } finally {
            setIsConfirmingWinners(false);
        }
    };

    const handleExportRanking = () => {
         exportData(rankingData, `ranking_${format(currentMonth, 'yyyy-MM')}`);
    }


    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                     <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <Trophy className="h-5 w-5" /> Ranking - {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
                            </CardTitle>
                            <CardDescription>Visualização do desempenho dos colaboradores.</CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                             <Button variant="outline" size="sm" onClick={handlePreviousMonth}>Anterior</Button>
                             <Button variant="outline" size="sm" onClick={handleNextMonth} disabled={isCurrentMonth}>Próximo</Button>
                        </div>
                     </div>
                </CardHeader>
                <CardContent>
                     {isLoading ? (
                        <div className="flex justify-center items-center py-10">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            <span className="ml-2 text-muted-foreground">Carregando ranking...</span>
                        </div>
                    ) : (
                    <>
                        {/* Top 3 Highlights */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                            {rankingData.slice(0, 3).map((emp, index) => (
                                <Card key={emp.employeeId} className={`border-2 ${index === 0 ? 'border-yellow-500 shadow-md' : index === 1 ? 'border-slate-400 shadow' : 'border-yellow-700 shadow-sm'}`}>
                                    <CardHeader className="flex flex-row items-center gap-3 pb-2 pt-3 px-4">
                                        {index === 0 && <Crown className="h-6 w-6 text-yellow-500 flex-shrink-0" />}
                                        {index === 1 && <Medal className="h-6 w-6 text-slate-400 flex-shrink-0" />}
                                        {index === 2 && <Medal className="h-6 w-6 text-yellow-700 flex-shrink-0" />}
                                        <Avatar className="h-10 w-10">
                                            <AvatarImage src={emp.employeePhotoUrl} />
                                            <AvatarFallback>{getInitials(emp.employeeName)}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 min-w-0">
                                            <CardTitle className="text-base truncate">{emp.employeeName}</CardTitle>
                                            <CardDescription className="truncate">{emp.role}</CardDescription>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="text-sm flex justify-between items-center pt-1 pb-3 px-4">
                                        <span>Pontos: <strong className="font-semibold">{emp.score}</strong></span>
                                        <Badge variant={emp.zeros > 0 ? "destructive" : "default"} className="text-xs">{emp.zeros} Zero(s)</Badge>
                                    </CardContent>
                                </Card>
                            ))}
                             {/* Placeholders if less than 3 employees */}
                             {rankingData.length < 3 && Array(3 - rankingData.length).fill(0).map((_, i) => (
                                <Card key={`placeholder-${i}`} className="border-dashed border-muted flex items-center justify-center h-full min-h-[100px]">
                                     <p className="text-muted-foreground text-sm">{(rankingData.length + i + 1)}º Lugar</p>
                                </Card>
                             ))}
                        </div>

                        {/* Full Ranking Table */}
                        <DataTable columns={rankingColumns} data={rankingData} filterColumn='employeeName' filterPlaceholder="Filtrar por colaborador..."/>
                        <p className="text-xs text-muted-foreground mt-4">*Ranking baseado nas avaliações diárias e desafios. Zeros impactam negativamente.</p>
                    </>
                    )}
                </CardContent>
                <CardFooter className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div className="text-sm text-muted-foreground space-y-1">
                        <p><strong>Premiação Vigente:</strong> {activeAward?.title || (isCurrentMonth ? 'Nenhuma ativa' : 'Nenhuma definida para o período')}</p>
                         {isCurrentMonth && <p><strong>Dias Restantes:</strong> {remainingDays}</p>}
                     </div>
                    <div className="flex gap-2">
                         <Button size="sm" variant="outline" onClick={handleExportRanking} disabled={isLoading || rankingData.length === 0}>Exportar Ranking</Button>
                         {canConfirmWinners && (
                             <Button size="sm" onClick={handleConfirmWinners} disabled={isConfirmingWinners || isLoading}>
                                 {isConfirmingWinners && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                 Confirmar Vencedores
                             </Button>
                         )}
                     </div>
                 </CardFooter>
            </Card>
        </div>
    );
};


// Main Page Component
export default function RankingPage() {
  return (
    <div className="space-y-6"> {/* Main container */}
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
