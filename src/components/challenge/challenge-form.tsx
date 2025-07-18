// src/components/challenge/challenge-form.tsx
'use client';

import * as React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Target, Loader2, CalendarIcon, Info } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { DatePicker } from '@/components/ui/date-picker';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import type { Challenge } from '@/types/challenge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/use-auth';
import { getDepartmentsByOrganization, type Department } from '@/lib/department-service';
import { getRolesByOrganization, type Role } from '@/lib/role-service';
import { getUsersByRoleAndOrganization, type UserProfile } from '@/lib/user-service';

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
  eligibleEntityIds: z.array(z.string()).optional(),
  evaluationMetrics: z.string().min(5, "Métricas de avaliação são obrigatórias."),
  supportMaterialUrl: z.string().url("URL inválida.").optional().or(z.literal('')),
  imageUrl: z.string().url("URL inválida.").optional().or(z.literal('')),
}).refine(data => data.periodEndDate >= data.periodStartDate, {
    message: "Data de término não pode ser anterior à data de início.",
    path: ["periodEndDate"],
}).refine(data => {
    if (data.eligibilityType !== 'all' && (!data.eligibleEntityIds || data.eligibleEntityIds.length === 0)) {
        return false;
    }
    return true;
}, {
    message: "Selecione pelo menos uma entidade para elegibilidade específica.",
    path: ["eligibleEntityIds"],
});

type ChallengeFormData = Omit<z.infer<typeof challengeSchema>, 'status'>;

interface ChallengeFormProps {
  challenge?: Challenge | null;
  onSave: (data: Partial<ChallengeFormData & { status?: Challenge['status'] }>) => Promise<void>;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function ChallengeForm({
    challenge,
    onSave,
    open: controlledOpen,
    onOpenChange: controlledOnOpenChange
}: ChallengeFormProps) {
  const { organizationId } = useAuth();
  const [internalOpen, setInternalOpen] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const { toast } = useToast();
  const [departments, setDepartments] = React.useState<Department[]>([]);
  const [roles, setRoles] = React.useState<Role[]>([]);
  const [employees, setEmployees] = React.useState<UserProfile[]>([]);
  const [isLoadingEligibilityData, setIsLoadingEligibilityData] = React.useState(false);

  const isOpen = controlledOpen ?? internalOpen;
  const setIsOpen = controlledOnOpenChange ?? setInternalOpen;

  const form = useForm<ChallengeFormData>({
    resolver: zodResolver(challengeSchema),
    defaultValues: {
      title: '', description: '', category: '',
      periodStartDate: new Date(), periodEndDate: new Date(),
      points: 0, difficulty: 'Médio', participationType: 'Opcional',
      eligibilityType: 'all', eligibleEntityIds: [],
      evaluationMetrics: '', supportMaterialUrl: '', imageUrl: '',
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
           form.reset({
                title: '', description: '', category: '',
                periodStartDate: new Date(),
                periodEndDate: new Date(new Date().setDate(new Date().getDate() + 7)),
                points: 50, difficulty: 'Médio', participationType: 'Opcional',
                eligibilityType: 'all', eligibleEntityIds: [],
                evaluationMetrics: '', supportMaterialUrl: '', imageUrl: '',
           });
        }
     }
  }, [challenge, form, isOpen]);

  React.useEffect(() => {
    const fetchEligibilityData = async () => {
        if (!organizationId || !isOpen) return;
        setIsLoadingEligibilityData(true);
        try {
            const [depts, fetchedRoles, emps] = await Promise.all([
                getDepartmentsByOrganization(organizationId),
                getRolesByOrganization(organizationId),
                getUsersByRoleAndOrganization('collaborator', organizationId)
            ]);
            setDepartments(depts);
            setRoles(fetchedRoles);
            setEmployees(emps);
        } catch (error) {
            toast({ title: "Erro", description: "Falha ao carregar dados para elegibilidade.", variant: "destructive"});
        } finally {
            setIsLoadingEligibilityData(false);
        }
    };
    fetchEligibilityData();
  }, [organizationId, isOpen, toast]);


  const onSubmit = async (data: ChallengeFormData) => {
    setIsSaving(true);
    const dataToSave = {
        ...data,
        eligibility: {
            type: data.eligibilityType,
            entityIds: data.eligibilityType !== 'all' ? data.eligibleEntityIds : undefined,
        },
        ...(challenge && challenge.status && { status: challenge.status }),
    };
    delete (dataToSave as any).eligibilityType;
    delete (dataToSave as any).eligibleEntityIds;

    try {
      await onSave(dataToSave);
      setIsOpen(false);
    } catch (error) {
       console.error("Falha ao salvar desafio:", error);
      toast({ title: 'Erro!', description: `Falha ao ${challenge ? 'atualizar' : 'criar'} desafio.`, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const eligibilityType = form.watch('eligibilityType');

  const getEligibilityPlaceholder = (selectedIds: string[] | undefined): string => {
      if (isLoadingEligibilityData) return "Carregando opções...";
      if (!selectedIds || selectedIds.length === 0) return `Selecione...`;

      let source: (Department | Role | UserProfile)[] = [];
      if (eligibilityType === 'department') source = departments;
      else if (eligibilityType === 'role') source = roles;
      else if (eligibilityType === 'individual') source = employees;

      if (selectedIds.length === 1) {
        const item = source.find(s => s.id === selectedIds[0]);
        return item?.name || selectedIds[0];
      }
      const typeMap = {'department': 'Deptos', 'role': 'Funções', 'individual': 'Indivíduos'};
      return `${selectedIds.length} ${typeMap[eligibilityType] || ''} selecionados`;
  }

  const eligibilityOptions = React.useMemo(() => {
    if (eligibilityType === 'department') return departments;
    if (eligibilityType === 'role') return roles;
    if (eligibilityType === 'individual') return employees;
    return [];
  }, [eligibilityType, departments, roles, employees]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
       <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>{challenge ? 'Editar Desafio' : 'Criar Novo Desafio'}</DialogTitle>
          <DialogDescription>
            {challenge ? 'Atualize os detalhes.' : 'Preencha os detalhes.'}
          </DialogDescription>
        </DialogHeader>
         <TooltipProvider>
            <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <ScrollArea className="max-h-[calc(80vh-150px)] p-1 pr-3">
                    <div className="space-y-4 pr-2">
                        <FormField control={form.control} name="title" render={({ field }) => (<FormItem><FormLabel>Título</FormLabel><FormControl><Input placeholder="Ex: Semana da Qualidade" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                        <FormField control={form.control} name="description" render={({ field }) => (<FormItem><FormLabel>Descrição</FormLabel><FormControl><Textarea placeholder="Detalhes..." {...field} /></FormControl><FormMessage /></FormItem>)}/>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField control={form.control} name="category" render={({ field }) => (<FormItem><FormLabel>Categoria</FormLabel><FormControl><Input placeholder="Ex: Produtividade" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)}/>
                            <FormField control={form.control} name="points" render={({ field }) => (<FormItem><FormLabel>Pontuação</FormLabel><FormControl><Input type="number" placeholder="Ex: 100" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <FormField control={form.control} name="periodStartDate" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Início</FormLabel><DatePicker date={field.value} setDate={field.onChange} placeholder="Início" /><FormMessage /></FormItem>)}/>
                            <FormField control={form.control} name="periodEndDate" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Término</FormLabel><DatePicker date={field.value} setDate={field.onChange} placeholder="Fim" disabled={(date) => date < form.getValues('periodStartDate')} /><FormMessage /></FormItem>)}/>
                            <FormField control={form.control} name="difficulty" render={({ field }) => (<FormItem><FormLabel>Dificuldade</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Fácil">Fácil</SelectItem><SelectItem value="Médio">Médio</SelectItem><SelectItem value="Difícil">Difícil</SelectItem></SelectContent></Select><FormMessage /></FormItem>)}/>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                            <FormField control={form.control} name="participationType" render={({ field }) => (<FormItem><FormLabel>Participação</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Obrigatório">Obrigatório</SelectItem><SelectItem value="Opcional">Opcional</SelectItem></SelectContent></Select><FormMessage /></FormItem>)}/>
                            <div className="space-y-2">
                                <FormField control={form.control} name="eligibilityType" render={({ field }) => (<FormItem><FormLabel>Elegibilidade</FormLabel><Select onValueChange={(value) => { field.onChange(value); form.setValue('eligibleEntityIds', []);}} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="all">Todos</SelectItem><SelectItem value="department">Departamentos</SelectItem><SelectItem value="role">Funções</SelectItem><SelectItem value="individual">Colaboradores</SelectItem></SelectContent></Select><FormMessage /></FormItem>)}/>
                                {eligibilityType !== 'all' && (
                                    <FormField control={form.control} name="eligibleEntityIds" render={({ field }) => (
                                    <FormItem><FormLabel className="sr-only">Entidades</FormLabel>
                                        <Popover><PopoverTrigger asChild><FormControl><Button variant="outline" className="w-full justify-start font-normal" disabled={isLoadingEligibilityData}>{getEligibilityPlaceholder(field.value)}</Button></FormControl></PopoverTrigger>
                                        <PopoverContent className="w-[--radix-popover-trigger-width] max-h-60 p-0"><ScrollArea className="max-h-60"><div className="p-2 space-y-1">
                                            {isLoadingEligibilityData ? <Loader2 className="h-4 w-4 animate-spin mx-auto my-2"/> : eligibilityOptions.map((item) => {
                                                const entityId = item.id;
                                                const entityName = item.name;
                                                return (<div key={entityId} className="flex items-center space-x-2 px-2 py-1 hover:bg-muted rounded-sm">
                                                    <Checkbox id={`entity-${entityId}`} checked={field.value?.includes(entityId)}
                                                        onCheckedChange={(checked) => field.onChange(checked ? [...(field.value || []), entityId] : (field.value || []).filter((v) => v !== entityId))}
                                                    />
                                                    <Label htmlFor={`entity-${entityId}`} className="font-normal text-sm">{entityName}</Label>
                                                </div>);
                                            })}
                                            { !isLoadingEligibilityData && eligibilityOptions.length === 0 && <p className="text-xs text-muted-foreground text-center p-2">Nenhuma opção disponível.</p>}
                                        </div></ScrollArea></PopoverContent></Popover><FormMessage /></FormItem>)}/>
                                )}
                            </div>
                        </div>
                        <FormField control={form.control} name="evaluationMetrics" render={({ field }) => (<FormItem><FormLabel>Métricas de Avaliação</FormLabel><FormControl><Textarea placeholder="Como será medido?" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField control={form.control} name="supportMaterialUrl" render={({ field }) => (<FormItem><FormLabel>URL Material de Apoio</FormLabel><FormControl><Input type="url" placeholder="https://" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)}/>
                            <FormField control={form.control} name="imageUrl" render={({ field }) => (<FormItem><FormLabel>URL Imagem Ilustrativa</FormLabel><FormControl><Input type="url" placeholder="https://" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)}/>
                        </div>
                    </div>
                </ScrollArea>
                <DialogFooter className="pt-4">
                <DialogClose asChild><Button type="button" variant="outline">Cancelar</Button></DialogClose>
                <Button type="submit" disabled={isSaving}>{isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar</Button>
                </DialogFooter>
            </form>
            </Form>
        </TooltipProvider>
      </DialogContent>
    </Dialog>
  );
}
