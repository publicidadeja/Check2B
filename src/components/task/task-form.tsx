'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ClipboardList, Loader2 } from 'lucide-react';

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
    DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import type { Task } from '@/types/task';
import { Slot } from '@radix-ui/react-slot'; // Import Slot

const taskSchema = z.object({
  title: z.string().min(3, { message: 'Título deve ter pelo menos 3 caracteres.' }),
  description: z.string().min(5, { message: 'Descrição deve ter pelo menos 5 caracteres.' }),
  criteria: z.string().min(10, { message: 'Critério deve ter pelo menos 10 caracteres.' }),
  category: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  periodicity: z.enum(['daily', 'specific_days', 'specific_dates']),
  assignedTo: z.enum(['role', 'department', 'individual']).optional(),
  assignedEntityId: z.string().optional(),
}).refine(data => {
     // If assignedTo is set, assignedEntityId must also be set
     if (data.assignedTo && !data.assignedEntityId) {
       return false;
     }
     return true;
   }, {
    message: "Se 'Atribuído a' for selecionado, o ID correspondente é obrigatório.",
    path: ["assignedEntityId"], // Attach error to assignedEntityId field
   });


type TaskFormData = z.infer<typeof taskSchema>;

interface TaskFormProps {
  task?: Task | null; // Pass task data for editing
  onSave: (data: TaskFormData) => Promise<void>; // Function to handle save
  children?: React.ReactNode; // To allow custom trigger components
  open?: boolean; // Allow controlling open state externally
  onOpenChange?: (open: boolean) => void; // Allow controlling open state externally
}

export function TaskForm({
    task,
    onSave,
    children,
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
      title: task?.title || '',
      description: task?.description || '',
      criteria: task?.criteria || '',
      category: task?.category || '',
      priority: task?.priority || undefined,
      periodicity: task?.periodicity || 'daily',
      assignedTo: task?.assignedTo || undefined,
      assignedEntityId: task?.assignedEntityId || '',
    },
  });

   React.useEffect(() => {
     if(isOpen) {
        if (task) {
          form.reset({
            title: task.title,
            description: task.description,
            criteria: task.criteria,
            category: task.category || '',
            priority: task.priority || undefined,
            periodicity: task.periodicity,
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
      await onSave(data);
      toast({
        title: 'Sucesso!',
        description: `Tarefa ${task ? 'atualizada' : 'criada'} com sucesso.`,
      });
      setIsOpen(false);
    } catch (error) {
       console.error("Failed to save task:", error);
      toast({
        title: 'Erro!',
        description: `Falha ao ${task ? 'atualizar' : 'criar'} tarefa. Tente novamente.`,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const TriggerComponent = children ? Slot : Button;
  const triggerProps = children ? {} : {
      children: task ? 'Editar Tarefa' : <><ClipboardList className="mr-2 h-4 w-4" />Adicionar Tarefa</>,
      variant: task ? 'outline' : 'default',
      size: task ? 'sm' : 'default',
   };


  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
       <DialogTrigger asChild>
          {children ? <Slot>{children}</Slot> : <Button {...triggerProps} />}
       </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{task ? 'Editar Tarefa' : 'Criar Nova Tarefa'}</DialogTitle>
          <DialogDescription>
            {task ? 'Atualize os detalhes da tarefa.' : 'Preencha os detalhes da nova tarefa.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título da Tarefa</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Verificar Emails Diariamente" {...field} />
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
                    <Textarea placeholder="Descreva a tarefa em detalhes..." {...field} />
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
                    <Textarea placeholder="Descreva o que significa cumprir a tarefa satisfatoriamente..." {...field} />
                  </FormControl>
                   <FormDescription>
                    Seja claro sobre as expectativas para a nota máxima.
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
                        {/* TODO: Replace with Select or Combobox loading categories */}
                        <Input placeholder="Ex: Vendas, Suporte" {...field} value={field.value ?? ''} />
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
                            <SelectValue placeholder="Selecione a prioridade" />
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
                            <SelectValue placeholder="Selecione a periodicidade" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="daily">Diária</SelectItem>
                          <SelectItem value="specific_days">Dias Específicos</SelectItem>
                           <SelectItem value="specific_dates">Datas Específicas</SelectItem>
                        </SelectContent>
                      </Select>
                       {/* TODO: Add conditional inputs for specific_days/dates */}
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
                       <Select onValueChange={field.onChange} value={field.value ?? ''} >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Global (Todos)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                           <SelectItem value="role">Função Específica</SelectItem>
                           <SelectItem value="department">Departamento Específico</SelectItem>
                           <SelectItem value="individual">Colaborador Específico</SelectItem>
                        </SelectContent>
                      </Select>
                       <FormDescription>
                         Se não selecionado, a tarefa é global.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 {/* Conditional Input based on assignedTo */}
                 {form.watch('assignedTo') && (
                   <FormField
                     control={form.control}
                     name="assignedEntityId"
                     render={({ field }) => (
                       <FormItem>
                         <FormLabel>ID da {
                             form.watch('assignedTo') === 'role' ? 'Função' :
                             form.watch('assignedTo') === 'department' ? 'Departamento' :
                             'Colaborador'
                          }</FormLabel>
                         <FormControl>
                           {/* TODO: Replace with Combobox/Select loading appropriate entities */}
                           <Input placeholder={`Digite o ID...`} {...field} value={field.value ?? ''}/>
                         </FormControl>
                         <FormMessage />
                       </FormItem>
                     )}
                   />
                 )}
            </div>


            <DialogFooter>
               <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancelar</Button>
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
