
'use client';

import * as React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, DollarSign, Settings, Check, PlusCircle, Trash2 } from 'lucide-react';

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
    DialogClose,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import type { Plan } from '@/types/plan';
import { ScrollArea } from '../ui/scroll-area';


const planSchema = z.object({
  name: z.string().min(3, { message: 'Nome do plano deve ter pelo menos 3 caracteres.' }),
  description: z.string().min(10, { message: 'Descrição deve ter pelo menos 10 caracteres.' }),
  priceMonthly: z.coerce.number().min(0, { message: 'Preço mensal deve ser zero ou maior.' }),
  priceYearly: z.coerce.number().min(0, { message: 'Preço anual deve ser zero ou maior.' }).optional().nullable(), // Allow null for optional
  features: z.array(z.string().min(1, "Feature não pode ser vazia.")).min(1, { message: 'Adicione pelo menos uma funcionalidade.' }),
  userLimit: z.union([z.coerce.number().int().min(1, "Limite deve ser maior que zero."), z.literal('unlimited')]),
  adminLimit: z.union([z.coerce.number().int().min(1, "Limite deve ser maior que zero."), z.literal('unlimited')]),
  status: z.enum(['active', 'inactive', 'archived'], { required_error: "Status é obrigatório." }),
  isPopular: z.boolean().default(false),
});

export type PlanFormData = z.infer<typeof planSchema>; // Export the type

interface PlanFormProps {
  plan?: Plan | null;
  onSave: (data: PlanFormData) => Promise<void>;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function PlanForm({
    plan,
    onSave,
    open: controlledOpen,
    onOpenChange: controlledOnOpenChange,
}: PlanFormProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const { toast } = useToast();

  const isOpen = controlledOpen ?? internalOpen;
  const setIsOpen = controlledOnOpenChange ?? setInternalOpen;

  const form = useForm<PlanFormData>({
    resolver: zodResolver(planSchema),
    defaultValues: {
      name: '',
      description: '',
      priceMonthly: 0,
      priceYearly: null,
      features: ['Funcionalidade básica'],
      userLimit: 10,
      adminLimit: 1,
      status: 'inactive',
      isPopular: false,
    },
  });

  // Adjust useForm to handle features array for useFieldArray-like behavior
  const { fields, append, remove } = useForm< { features: { value: string }[] }>({
    // @ts-ignore zodResolver type mismatch with useForm for array fields. It works.
    control: form.control, 
    name: "features" // This should be 'features' to match schema
  });


  React.useEffect(() => {
    if (isOpen) {
      if (plan) {
        form.reset({
          name: plan.name || '',
          description: plan.description || '',
          priceMonthly: plan.priceMonthly || 0,
          priceYearly: plan.priceYearly === undefined ? null : plan.priceYearly, // Handle undefined for optional field
          features: plan.features && plan.features.length > 0 ? plan.features : [''],
          userLimit: plan.userLimit || 10,
          adminLimit: plan.adminLimit || 1,
          status: plan.status || 'inactive',
          isPopular: plan.isPopular || false,
        });
      } else {
        form.reset({
          name: '',
          description: '',
          priceMonthly: 0,
          priceYearly: null,
          features: ['Funcionalidade básica'],
          userLimit: 10,
          adminLimit: 1,
          status: 'inactive',
          isPopular: false,
        });
      }
    }
  }, [plan, form, isOpen]);

  const onSubmit = async (data: PlanFormData) => {
    setIsSaving(true);
    try {
      // Ensure priceYearly is undefined if empty string or null, not 0
      const dataToSave = {
        ...data,
        priceYearly: data.priceYearly === null || data.priceYearly === undefined || data.priceYearly === 0 ? undefined : data.priceYearly,
      };
      await onSave(dataToSave);
      setIsOpen(false);
    } catch (error) {
      console.error("Falha ao salvar plano:", error);
      toast({
        title: 'Erro!',
        description: `Falha ao ${plan ? 'atualizar' : 'criar'} plano. Tente novamente.`,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="w-11/12 max-w-xs sm:max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            {plan ? 'Editar Plano' : 'Adicionar Novo Plano'}
          </DialogTitle>
          <DialogDescription>
            {plan ? 'Atualize os detalhes deste plano de assinatura.' : 'Preencha os detalhes do novo plano.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <ScrollArea className="max-h-[calc(80vh-150px)] p-1 pr-3"> {/* Adjust max-height as needed */}
              <div className="space-y-4 pr-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome do Plano</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Plano Premium" {...field} />
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
                      <FormLabel>Descrição</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Descreva os benefícios e público alvo do plano..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="priceMonthly"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Preço Mensal (R$)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" placeholder="Ex: 79.90" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="priceYearly"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Preço Anual (R$) (Opcional)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.01" 
                            placeholder="Ex: 799.00" 
                            {...field} 
                            value={field.value === null ? '' : String(field.value)} // Handle null for display, ensure string
                            onChange={e => field.onChange(e.target.value === '' ? null : parseFloat(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormItem>
                  <FormLabel>Funcionalidades Incluídas</FormLabel>
                  <div className="space-y-2">
                    {form.watch('features', []).map((featureItem, index) => (
                      <FormField
                        key={`feature-${index}`} // Unique key
                        control={form.control}
                        name={`features.${index}`} // Correct name for array field
                        render={({ field }) => (
                          <FormItem className="flex items-center gap-2">
                            <FormControl>
                              <Input placeholder={`Funcionalidade ${index + 1}`} {...field} />
                            </FormControl>
                            {form.watch('features', []).length > 1 && (
                              <Button type="button" variant="ghost" size="icon" onClick={() => {
                                const currentFeatures = form.getValues('features');
                                form.setValue('features', currentFeatures.filter((_, i) => i !== index), { shouldValidate: true });
                              }} className="h-8 w-8 text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                            <FormMessage/>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-2 text-xs"
                    onClick={() => form.setValue('features', [...form.getValues('features'), ''])}
                  >
                    <PlusCircle className="mr-2 h-3 w-3" /> Adicionar Funcionalidade
                  </Button>
                  {/* Display top-level error for features array if needed */}
                  {form.formState.errors.features && !form.formState.errors.features.root && (
                     <p className="text-sm font-medium text-destructive">{form.formState.errors.features.message}</p>
                  )}
                </FormItem>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="userLimit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Limite de Usuários</FormLabel>
                        <FormControl>
                          <Input type="text" placeholder="Ex: 10 ou 'unlimited'" {...field} onChange={(e) => {
                            const val = e.target.value;
                            if (val.toLowerCase() === 'unlimited') field.onChange('unlimited');
                            else if (!isNaN(Number(val)) && val.trim() !== '') field.onChange(Number(val));
                            else field.onChange(val); 
                          }} />
                        </FormControl>
                        <FormDescription className="text-xs">Nº de colaboradores. Digite 'unlimited' para ilimitado.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="adminLimit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Limite de Administradores</FormLabel>
                        <FormControl>
                           <Input type="text" placeholder="Ex: 1 ou 'unlimited'" {...field} onChange={(e) => {
                            const val = e.target.value;
                            if (val.toLowerCase() === 'unlimited') field.onChange('unlimited');
                            else if (!isNaN(Number(val)) && val.trim() !== '') field.onChange(Number(val));
                            else field.onChange(val);
                          }} />
                        </FormControl>
                        <FormDescription className="text-xs">Nº de admins. Digite 'unlimited' para ilimitado.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status do Plano</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="active">Ativo</SelectItem>
                          <SelectItem value="inactive">Inativo</SelectItem>
                          <SelectItem value="archived">Arquivado</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="isPopular"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel>Plano Popular?</FormLabel>
                        <FormDescription className="text-xs">
                          Destacar este plano na página de preços.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </ScrollArea>
            <DialogFooter className="pt-4">
              <DialogClose asChild>
                 <Button type="button" variant="outline">Cancelar</Button>
              </DialogClose>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {plan ? 'Salvar Alterações' : 'Criar Plano'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

    