'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Building, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea'; // Import Textarea
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
import type { Department } from '@/app/departments/page'; // Assuming type is exported from page

// Schema for Department Form Validation
const departmentSchema = z.object({
  name: z.string().min(2, { message: 'Nome do departamento deve ter pelo menos 2 caracteres.' }),
  description: z.string().optional().or(z.literal('')),
  // headId: z.string().optional(), // Optional: Add validation if you have employee selection
});

type DepartmentFormData = z.infer<typeof departmentSchema>;

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
  const { toast } = useToast();

  const isOpen = controlledOpen ?? internalOpen;
  const setIsOpen = controlledOnOpenChange ?? setInternalOpen;

  const form = useForm<DepartmentFormData>({
    resolver: zodResolver(departmentSchema),
    defaultValues: {
      name: '',
      description: '',
      // headId: '',
    },
  });

  React.useEffect(() => {
    if (isOpen) {
      if (department) {
        form.reset({
          name: department.name || '',
          description: department.description || '',
          // headId: department.headId || '',
        });
      } else {
        form.reset({ // Reset to default empty values for new department
          name: '',
          description: '',
          // headId: '',
        });
      }
    }
  }, [department, form, isOpen]);

  const onSubmit = async (data: DepartmentFormData) => {
    setIsSaving(true);
    try {
      await onSave(data);
      // Toast is handled in parent component
      setIsOpen(false);
    } catch (error) {
      console.error("Falha ao salvar departamento:", error);
      toast({
        title: 'Erro!',
        description: `Falha ao ${department ? 'atualizar' : 'criar'} departamento. Tente novamente.`,
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
            {/* Optional: Field for selecting Department Head */}
            {/* <FormField
              control={form.control}
              name="headId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Responsável (Opcional)</FormLabel>
                  <FormControl>
                    {/* Replace with an Employee Select/Combobox component */}
                    {/*<Input placeholder="ID ou Nome do Responsável" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            /> */}

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
