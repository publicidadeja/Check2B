
// src/components/task/task-form.tsx
'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2 } from 'lucide-react';

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
import { useToast } from '@/hooks/use-toast';
import type { Task } from '@/types/task';

const taskSchema = z.object({
  title: z.string().min(3, { message: 'Título deve ter pelo menos 3 caracteres.' }),
  description: z.string().min(5, { message: 'Descrição deve ter pelo menos 5 caracteres.' }),
  criteria: z.string().min(10, { message: 'Critério deve ter pelo menos 10 caracteres.' }),
  category: z.string().optional().or(z.literal('')),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  periodicity: z.enum(['daily', 'specific_days', 'specific_dates'], { required_error: "Periodicidade é obrigatória." }),
  assignedTo: z.enum(['role', 'department', 'individual']).optional().nullable(), // Allow null to represent "Global" or unselected
  assignedEntityId: z.string().optional().or(z.literal('')),
}).refine(data => {
     // If assignedTo is set (not null/undefined), then assignedEntityId must be provided
     if (data.assignedTo && (data.assignedTo === 'role' || data.assignedTo === 'department' || data.assignedTo === 'individual') && !data.assignedEntityId?.trim()) {
       return false;
     }
     return true;
   }, {
    message: "Se 'Atribuído a' for selecionado (diferente de Global), o ID/Nome correspondente é obrigatório.",
    path: ["assignedEntityId"],
   });


type TaskFormData = z.infer<typeof taskSchema>;

interface TaskFormProps {
  task?: Task | null;
  onSave: (data: Partial<TaskFormData>) => Promise<void>; // Partial for updates
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const GLOBAL_ASSIGNMENT_VALUE = "GLOBAL_PLACEHOLDER_VALUE_FOR_UNASSIGNED"; // Special value for select

export function TaskForm({
    task,
    onSave,
    open: controlledOpen,
    onOpenChange: controlledOnOpenChange
}: TaskFormProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const { toast } = useToast();

  const isOpen = controlledOpen ?? internalOpen;
  const setIsOpen = controlledOnOpenChange ?? setInternalOpen;

  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: '',
      description: '',
      criteria: '',
      category: '',
      priority: undefined,
      periodicity: 'daily',
      assignedTo: null, // Default to null (Global)
      assignedEntityId: '',
    },
  });

   React.useEffect(() => {
     if(isOpen) {
        if (task) {
          form.reset({
            title: task.title || '',
            description: task.description || '',
            criteria: task.criteria || '',
            category: task.category || '',
            priority: task.priority || undefined,
            periodicity: task.periodicity || 'daily',
            assignedTo: task.assignedTo || null, // If task.assignedTo is undefined, set to null
            assignedEntityId: task.assignedEntityId || '',
          });
        } else {
           form.reset({
             title: '',
             description: '',
             criteria: '',
             category: '',
             priority: undefined,
             periodicity: 'daily',
             assignedTo: null, // Default to null (Global) for new tasks
             assignedEntityId: '',
           });
        }
     }
  }, [task, form, isOpen]);

  const onSubmit = async (data: TaskFormData) => {
    setIsSaving(true);
    // Prepare data for saving. If "Global" is selected, assignedTo should be null.
    const dataToSave = {
        ...data,
        assignedTo: data.assignedTo === GLOBAL_ASSIGNMENT_VALUE ? null : data.assignedTo,
    };

    // If assignedTo is cleared (is null), also clear assignedEntityId.
    if (!dataToSave.assignedTo) {
        dataToSave.assignedEntityId = '';
    }

    try {
      await onSave(dataToSave); 
      setIsOpen(false);
    } catch (error) {
       console.error("Falha ao salvar tarefa:", error);
      toast({
        title: 'Erro!',
        description: `Falha ao ${task ? 'atualizar' : 'criar'} tarefa. Tente novamente.`,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{task ? 'Editar Tarefa' : 'Criar Nova Tarefa'}</DialogTitle>
          <DialogDescription>
            {task ? 'Atualize os detalhes da tarefa existente.' : 'Preencha os detalhes para criar uma nova tarefa.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título da Tarefa</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Verificar pendências diárias" {...field} />
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
                    <Textarea placeholder="Descreva os passos ou o objetivo da tarefa..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="criteria"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Critério de Cumprimento (Nota 10)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="O que define a execução perfeita desta tarefa?" {...field} />
                  </FormControl>
                   <FormDescription>
                    Seja claro e objetivo para a avaliação.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
               <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categoria (Opcional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Vendas, TI" {...field} value={field.value ?? ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prioridade</FormLabel>
                       <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="low">Baixa</SelectItem>
                          <SelectItem value="medium">Média</SelectItem>
                          <SelectItem value="high">Alta</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="periodicity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Periodicidade</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="daily">Diária</SelectItem>
                          <SelectItem value="specific_days">Dias Específicos</SelectItem>
                          <SelectItem value="specific_dates">Datas Específicas</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <FormField
                  control={form.control}
                  name="assignedTo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Atribuído a</FormLabel>
                       <Select 
                        onValueChange={(value) => {
                           // If "Global" is selected, set field value to our placeholder, which then becomes undefined on submit
                           // Otherwise, set to the selected value
                           field.onChange(value === GLOBAL_ASSIGNMENT_VALUE ? null : value);
                           form.setValue('assignedEntityId', ''); // Reset entity ID when assignment type changes
                       }} 
                       value={field.value ?? GLOBAL_ASSIGNMENT_VALUE} // Use placeholder if null or undefined
                      >
                        <FormControl>
                          <SelectTrigger>
                            {/* Display "Global (Todos Colaboradores)" if value is null or placeholder */}
                            <SelectValue placeholder="Global (Todos Colaboradores)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                           {/* Explicit "Global" option that maps to null/undefined for assignedTo */}
                           <SelectItem value={GLOBAL_ASSIGNMENT_VALUE}>Global (Todos Colaboradores)</SelectItem>
                           <SelectItem value="role">Função Específica</SelectItem>
                           <SelectItem value="department">Departamento Específico</SelectItem>
                           <SelectItem value="individual">Colaborador Específico</SelectItem>
                        </SelectContent>
                      </Select>
                       <FormDescription>
                         "Global" aplica a tarefa a todos os colaboradores.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 {form.watch('assignedTo') && form.watch('assignedTo') !== GLOBAL_ASSIGNMENT_VALUE && ( // Show only if a specific type is selected
                   <FormField
                     control={form.control}
                     name="assignedEntityId"
                     render={({ field }) => (
                       <FormItem>
                         <FormLabel>
                            { form.watch('assignedTo') === 'role' ? 'Nome da Função' :
                             form.watch('assignedTo') === 'department' ? 'Nome do Departamento' :
                             'Nome/ID do Colaborador' }
                         </FormLabel>
                         <FormControl>
                           <Input
                                placeholder={
                                    form.watch('assignedTo') === 'role' ? 'Ex: Recrutadora' :
                                    form.watch('assignedTo') === 'department' ? 'Ex: Engenharia' :
                                    'Ex: Alice Silva (ID: 1)'
                                }
                                {...field}
                                value={field.value ?? ''}
                            />
                         </FormControl>
                         <FormMessage />
                       </FormItem>
                     )}
                   />
                 )}
            </div>

            <DialogFooter>
              <DialogClose asChild>
                 <Button type="button" variant="outline">Cancelar</Button>
              </DialogClose>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {task ? 'Salvar Alterações' : 'Criar Tarefa'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

    