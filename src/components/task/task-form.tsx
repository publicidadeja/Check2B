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
// DatePicker import is not used here, can be removed if not planned for specific_days/dates
// import { DatePicker } from '@/components/ui/date-picker';

const taskSchema = z.object({
  title: z.string().min(3, { message: 'Título deve ter pelo menos 3 caracteres.' }),
  description: z.string().min(5, { message: 'Descrição deve ter pelo menos 5 caracteres.' }),
  criteria: z.string().min(10, { message: 'Critério deve ter pelo menos 10 caracteres.' }),
  category: z.string().optional().or(z.literal('')),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  periodicity: z.enum(['daily', 'specific_days', 'specific_dates'], { required_error: "Periodicidade é obrigatória." }),
  assignedTo: z.enum(['role', 'department', 'individual']).optional(),
  assignedEntityId: z.string().optional().or(z.literal('')),
  // organizationId is handled by the service, not part of the form data directly
}).refine(data => {
     if (data.assignedTo && !data.assignedEntityId?.trim()) {
       return false;
     }
     return true;
   }, {
    message: "Se 'Atribuído a' for selecionado, o ID/Nome correspondente é obrigatório.",
    path: ["assignedEntityId"],
   });


type TaskFormData = z.infer<typeof taskSchema>;

interface TaskFormProps {
  task?: Task | null;
  onSave: (data: TaskFormData) => Promise<void>; // onSave expects TaskFormData
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

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
      assignedTo: undefined,
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
            assignedTo: task.assignedTo || undefined,
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
             assignedTo: undefined,
             assignedEntityId: '',
           });
        }
     }
  }, [task, form, isOpen]);

  const onSubmit = async (data: TaskFormData) => {
    setIsSaving(true);
    try {
      await onSave(data); // Pass validated form data to parent
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
                      <FormLabel>Atribuído a (Opcional)</FormLabel>
                       <Select onValueChange={(value) => {
                           field.onChange(value);
                           form.setValue('assignedEntityId', '');
                       }} value={field.value ?? ''}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Global (Todos Colaboradores)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                           <SelectItem value="role">Função Específica</SelectItem>
                           <SelectItem value="department">Departamento Específico</SelectItem>
                           <SelectItem value="individual">Colaborador Específico</SelectItem>
                        </SelectContent>
                      </Select>
                       <FormDescription>
                         Se não selecionado, a tarefa aplica-se a todos.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 {form.watch('assignedTo') && (
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
