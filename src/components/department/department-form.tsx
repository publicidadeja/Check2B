
'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2 } from 'lucide-react'; // Removed Building, not used here

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
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
import { useToast } from '@/hooks/use-toast';
import type { Department } from '@/types/department'; // Updated import path

// Schema for Department Form Validation
const departmentSchema = z.object({
  name: z.string().min(2, { message: 'Nome do departamento deve ter pelo menos 2 caracteres.' }),
  description: z.string().optional().or(z.literal('')),
  headId: z.string().optional().or(z.literal('')), // Keep headId optional
});

// Use Omit to exclude fields managed by the service or parent
type DepartmentFormData = Omit<Department, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>;


interface DepartmentFormProps {
  department?: Department | null;
  onSave: (data: DepartmentFormData) => Promise<void>;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function DepartmentForm({
    department,
    onSave,
    open: controlledOpen,
    onOpenChange: controlledOnOpenChange,
}: DepartmentFormProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const { toast } = useToast(); // Keep toast for potential future use in form itself

  const isOpen = controlledOpen ?? internalOpen;
  const setIsOpen = controlledOnOpenChange ?? setInternalOpen;

  const form = useForm<DepartmentFormData>({
    resolver: zodResolver(departmentSchema),
    defaultValues: {
      name: '',
      description: '',
      headId: '',
    },
  });

  React.useEffect(() => {
    if (isOpen) {
      if (department) {
        form.reset({
          name: department.name || '',
          description: department.description || '',
          headId: department.headId || '',
        });
      } else {
        form.reset({
          name: '',
          description: '',
          headId: '',
        });
      }
    }
  }, [department, form, isOpen]);

  const onSubmit = async (data: DepartmentFormData) => {
    setIsSaving(true);
    try {
      await onSave(data); // Parent will handle adding organizationId
      // Toast is handled in parent component after successful save
      setIsOpen(false);
    } catch (error) { // Catch errors from the onSave promise if any
      console.error("Falha ao salvar departamento (no formulário):", error);
      toast({
        title: 'Erro no Formulário!',
        description: `Não foi possível processar o salvamento. Verifique os logs.`,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{department ? 'Editar Departamento' : 'Adicionar Novo Departamento'}</DialogTitle>
          <DialogDescription>
            {department ? 'Atualize os detalhes do departamento.' : 'Preencha os detalhes do novo departamento.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Departamento</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Engenharia de Software" {...field} />
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
                    <FormLabel>Descrição (Opcional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Breve descrição das responsabilidades do departamento..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
             />
             <FormField
                control={form.control}
                name="headId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ID do Responsável (Opcional)</FormLabel>
                    <FormControl>
                      {/* TODO: Replace with an Employee Select/Combobox component in future */}
                      <Input placeholder="ID do funcionário líder" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
             />
            <DialogFooter>
              <DialogClose asChild>
                 <Button type="button" variant="outline">Cancelar</Button>
              </DialogClose>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {department ? 'Salvar Alterações' : 'Criar Departamento'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
