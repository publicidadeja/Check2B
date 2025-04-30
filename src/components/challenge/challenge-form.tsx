// src/components/challenge/challenge-form.tsx
'use client';

import * as React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Target, Loader2, CalendarIcon, Info } from 'lucide-react'; // Using Target icon

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogClose
} from '@/components/ui/dialog';
import { DatePicker } from '@/components/ui/date-picker'; // Use the custom DatePicker
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import type { Challenge } from '@/types/challenge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// Mock data for Selects - Replace with actual data fetching later
const mockDepartments = ['RH', 'Engenharia', 'Marketing', 'Vendas', 'Operações'];
const mockRoles = ['Recrutadora', 'Desenvolvedor Backend', 'Analista de Marketing', 'Executivo de Contas', 'Desenvolvedora Frontend'];
// Mock employees for individual selection (use ID and Name)
const mockEmployeesSimple = [
    { id: '1', name: 'Alice Silva' },
    { id: '2', name: 'Beto Santos' },
    { id: '4', name: 'Davi Costa' },
    { id: '5', name: 'Eva Pereira' },
];


// Zod Schema for Challenge Form Validation
const challengeSchema = z.object({
  title: z.string().min(3, "Título deve ter pelo menos 3 caracteres."),
  description: z.string().min(10, "Descrição deve ter pelo menos 10 caracteres."),
  category: z.string().optional().or(z.literal('')),
  periodStartDate: z.date({ required_error: "Data de início é obrigatória." }),
  periodEndDate: z.date({ required_error: "Data de término é obrigatória." }),
  points: z.coerce.number().min(0, "Pontuação não pode ser negativa.").default(0),
  difficulty: z.enum(['Fácil', 'Médio', 'Difícil'], { required_error: "Dificuldade é obrigatória."}),
  participationType: z.enum(['Obrigatório', 'Opcional'], { required_error: "Tipo de participação é obrigatório."}),
  eligibilityType: z.enum(['all', 'department', 'role', 'individual']).default('all'),
  eligibleEntityIds: z.array(z.string()).optional(), // Array of IDs
  evaluationMetrics: z.string().min(5, "Métricas de avaliação são obrigatórias."),
  supportMaterialUrl: z.string().url("URL inválida.").optional().or(z.literal('')),
  imageUrl: z.string().url("URL inválida.").optional().or(z.literal('')),
}).refine(data => data.periodEndDate >= data.periodStartDate, {
    message: "Data de término não pode ser anterior à data de início.",
    path: ["periodEndDate"],
}).refine(data => {
    // If eligibility is not 'all', then eligibleEntityIds must be provided and not empty
    if (data.eligibilityType !== 'all' && (!data.eligibleEntityIds || data.eligibleEntityIds.length === 0)) {
        return false;
    }
    return true;
}, {
    message: "Selecione pelo menos uma entidade (departamento, função ou indivíduo) para elegibilidade específica.",
    path: ["eligibleEntityIds"],
});


type ChallengeFormData = z.infer<typeof challengeSchema>;

interface ChallengeFormProps {
  challenge?: Challenge | null;
  onSave: (data: ChallengeFormData) => Promise<void>;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function ChallengeForm({
    challenge,
    onSave,
    open: controlledOpen,
    onOpenChange: controlledOnOpenChange
}: ChallengeFormProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const { toast } = useToast();

  const isOpen = controlledOpen ?? internalOpen;
  const setIsOpen = controlledOnOpenChange ?? setInternalOpen;

  const form = useForm<ChallengeFormData>({
    resolver: zodResolver(challengeSchema),
    defaultValues: {
      title: '',
      description: '',
      category: '',
      periodStartDate: new Date(),
      periodEndDate: new Date(),
      points: 0,
      difficulty: 'Médio',
      participationType: 'Opcional',
      eligibilityType: 'all',
      eligibleEntityIds: [],
      evaluationMetrics: '',
      supportMaterialUrl: '',
      imageUrl: '',
    },
  });

   React.useEffect(() => {
     if(isOpen) {
        if (challenge) {
          form.reset({
            title: challenge.title || '',
            description: challenge.description || '',
            category: challenge.category || '',
            periodStartDate: challenge.periodStartDate ? parseISO(challenge.periodStartDate) : new Date(),
            periodEndDate: challenge.periodEndDate ? parseISO(challenge.periodEndDate) : new Date(),
            points: challenge.points || 0,
            difficulty: challenge.difficulty || 'Médio',
            participationType: challenge.participationType || 'Opcional',
            eligibilityType: challenge.eligibility.type || 'all',
            eligibleEntityIds: challenge.eligibility.entityIds || [],
            evaluationMetrics: challenge.evaluationMetrics || '',
            supportMaterialUrl: challenge.supportMaterialUrl || '',
            imageUrl: challenge.imageUrl || '',
          });
        } else {
           form.reset({ // Reset to default empty values for new challenge
                title: '',
                description: '',
                category: '',
                periodStartDate: new Date(),
                periodEndDate: new Date(new Date().setDate(new Date().getDate() + 7)), // Default end date 1 week later
                points: 50, // Default points
                difficulty: 'Médio',
                participationType: 'Opcional',
                eligibilityType: 'all',
                eligibleEntityIds: [],
                evaluationMetrics: '',
                supportMaterialUrl: '',
                imageUrl: '',
           });
        }
     }
  }, [challenge, form, isOpen]);

  const onSubmit = async (data: ChallengeFormData) => {
    setIsSaving(true);

    // Prepare data for saving (convert dates back to string, structure eligibility)
     const dataToSave = {
        ...data,
        periodStartDate: format(data.periodStartDate, 'yyyy-MM-dd'),
        periodEndDate: format(data.periodEndDate, 'yyyy-MM-dd'),
        eligibility: {
            type: data.eligibilityType,
            entityIds: data.eligibilityType !== 'all' ? data.eligibleEntityIds : undefined,
        },
        // Remove form-specific fields before saving
        eligibilityType: undefined,
        eligibleEntityIds: undefined,
     };
    // Remove undefined keys to clean up payload
    Object.keys(dataToSave).forEach(key => dataToSave[key as keyof typeof dataToSave] === undefined && delete dataToSave[key as keyof typeof dataToSave]);


    try {
      // Pass the structured data to the onSave prop
      await onSave(dataToSave as any); // Use type assertion carefully or define a specific save type
      // Toast is handled in parent component
      setIsOpen(false);
    } catch (error) {
       console.error("Falha ao salvar desafio:", error);
      toast({
        title: 'Erro!',
        description: `Falha ao ${challenge ? 'atualizar' : 'criar'} desafio. Tente novamente.`,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const eligibilityType = form.watch('eligibilityType');

  // Helper to get placeholder text for multi-select simulation
  const getEligibilityPlaceholder = (selectedIds: string[] | undefined, type: string): string => {
      if (!selectedIds || selectedIds.length === 0) {
           return `Selecione ${type}...`;
      }
      if (selectedIds.length === 1) return selectedIds[0];
       return `${selectedIds.length} ${type} selecionados`;
  }


  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
       <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>{challenge ? 'Editar Desafio' : 'Criar Novo Desafio'}</DialogTitle>
          <DialogDescription>
            {challenge ? 'Atualize os detalhes do desafio.' : 'Preencha os detalhes para criar um novo desafio.'}
          </DialogDescription>
        </DialogHeader>
         <TooltipProvider> {/* Provider needed for tooltips inside */}
            <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto px-1">
                {/* --- Basic Info --- */}
                <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Título do Desafio</FormLabel>
                    <FormControl>
                        <Input placeholder="Ex: Semana da Qualidade Total" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                 <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Descrição Detalhada</FormLabel>
                    <FormControl>
                        <Textarea placeholder="Explique o objetivo, regras e benefícios..." {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="category"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Categoria (Opcional)</FormLabel>
                            <FormControl>
                            {/* TODO: Replace with dynamic category Select/Input */}
                            <Input placeholder="Ex: Produtividade, Inovação" {...field} value={field.value ?? ''} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="points"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Pontuação Oferecida</FormLabel>
                            <FormControl>
                            <Input type="number" placeholder="Ex: 100" {...field} />
                            </FormControl>
                             <FormDescription>Pontos adicionados ao ranking se cumprido.</FormDescription>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                </div>

                {/* --- Period and Difficulty --- */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                     <FormField
                        control={form.control}
                        name="periodStartDate"
                        render={({ field }) => (
                            <FormItem className="flex flex-col">
                                <FormLabel>Data de Início</FormLabel>
                                <DatePicker date={field.value} setDate={field.onChange} placeholder="Início" />
                                <FormMessage />
                            </FormItem>
                        )}
                        />
                    <FormField
                        control={form.control}
                        name="periodEndDate"
                        render={({ field }) => (
                            <FormItem className="flex flex-col">
                                <FormLabel>Data de Término</FormLabel>
                                <DatePicker date={field.value} setDate={field.onChange} placeholder="Fim" disabled={(date) => date < form.getValues('periodStartDate')} />
                                <FormMessage />
                             </FormItem>
                        )}
                        />
                     <FormField
                        control={form.control}
                        name="difficulty"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Dificuldade</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value="Fácil">Fácil</SelectItem>
                                <SelectItem value="Médio">Médio</SelectItem>
                                <SelectItem value="Difícil">Difícil</SelectItem>
                            </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                </div>

                {/* --- Participation and Eligibility --- */}
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                    <FormField
                        control={form.control}
                        name="participationType"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Tipo de Participação</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value="Obrigatório">Obrigatório</SelectItem>
                                <SelectItem value="Opcional">Opcional</SelectItem>
                            </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                     <div className="space-y-2">
                        <FormField
                            control={form.control}
                            name="eligibilityType"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Elegibilidade</FormLabel>
                                <Select onValueChange={(value) => {
                                    field.onChange(value);
                                    form.setValue('eligibleEntityIds', []); // Reset selection on type change
                                }} value={field.value}>
                                <FormControl>
                                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="all">Todos Colaboradores</SelectItem>
                                    <SelectItem value="department">Departamentos Específicos</SelectItem>
                                    <SelectItem value="role">Funções Específicas</SelectItem>
                                    <SelectItem value="individual">Colaboradores Específicos</SelectItem>
                                </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        {/* Conditional Multi-Select Component Placeholder */}
                        {eligibilityType !== 'all' && (
                             <FormField
                                control={form.control}
                                name="eligibleEntityIds"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="sr-only">Entidades Elegíveis</FormLabel>
                                    {/* === Multi-Select Placeholder - Requires a dedicated component === */}
                                    {/* This example uses Checkboxes inside a Popover/Dropdown for simulation */}
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <FormControl>
                                                 <Button variant="outline" className="w-full justify-start font-normal">
                                                    {getEligibilityPlaceholder(field.value, eligibilityType === 'department' ? 'Deptos' : eligibilityType === 'role' ? 'Funções' : 'Indivíduos')}
                                                </Button>
                                            </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[--radix-popover-trigger-width] max-h-60 overflow-y-auto p-0">
                                             <div className="p-2 space-y-1">
                                                {(eligibilityType === 'department' ? mockDepartments :
                                                eligibilityType === 'role' ? mockRoles :
                                                mockEmployeesSimple).map((item) => (
                                                     <div key={typeof item === 'string' ? item : item.id} className="flex items-center space-x-2 px-2 py-1 hover:bg-muted rounded-sm">
                                                        <Checkbox
                                                            id={`entity-${typeof item === 'string' ? item : item.id}`}
                                                            checked={field.value?.includes(typeof item === 'string' ? item : item.id)}
                                                            onCheckedChange={(checked) => {
                                                                const entityId = typeof item === 'string' ? item : item.id;
                                                                const currentSelection = field.value || [];
                                                                return checked
                                                                ? field.onChange([...currentSelection, entityId])
                                                                : field.onChange(currentSelection.filter((value) => value !== entityId))
                                                            }}
                                                        />
                                                         <Label htmlFor={`entity-${typeof item === 'string' ? item : item.id}`} className="font-normal text-sm">
                                                            {typeof item === 'string' ? item : item.name}
                                                        </Label>
                                                    </div>
                                                ))}
                                            </div>
                                        </PopoverContent>
                                    </Popover>
                                     {/* ================================================================= */}
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                         )}
                    </div>
                 </div>

                {/* --- Evaluation and Resources --- */}
                 <FormField
                    control={form.control}
                    name="evaluationMetrics"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Métricas de Avaliação</FormLabel>
                        <FormControl>
                        <Textarea placeholder="Como o cumprimento será medido? Ex: Relatório X, Número Y, Feedback Z..." {...field} />
                        </FormControl>
                         <FormDescription>Seja específico sobre como a avaliação será feita.</FormDescription>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="supportMaterialUrl"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>URL Material de Apoio (Opcional)</FormLabel>
                            <FormControl>
                            <Input type="url" placeholder="https://..." {...field} value={field.value ?? ''} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="imageUrl"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>URL Imagem Ilustrativa (Opcional)</FormLabel>
                            <FormControl>
                            <Input type="url" placeholder="https://..." {...field} value={field.value ?? ''} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                </div>


                <DialogFooter>
                <DialogClose asChild>
                    <Button type="button" variant="outline">Cancelar</Button>
                </DialogClose>
                <Button type="submit" disabled={isSaving}>
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {challenge ? 'Salvar Alterações' : 'Criar Desafio'}
                </Button>
                </DialogFooter>
            </form>
            </Form>
        </TooltipProvider>
      </DialogContent>
    </Dialog>
  );
}
