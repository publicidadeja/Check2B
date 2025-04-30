'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Briefcase, Loader2 } from 'lucide-react';

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
import type { Role } from '@/app/roles/page'; // Assuming type is exported from page

// Schema for Role Form Validation
const roleSchema = z.object({
  name: z.string().min(3, { message: 'Nome da função deve ter pelo menos 3 caracteres.' }),
  description: z.string().optional().or(z.literal('')),
  // permissions: z.array(z.string()).optional(), // For future use
});

type RoleFormData = z.infer<typeof roleSchema>;

interface RoleFormProps {
  role?: Role | null;
  onSave: (data: RoleFormData) => Promise<void>;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function RoleForm({
    role,
    onSave,
    open: controlledOpen,
    onOpenChange: controlledOnOpenChange,
}: RoleFormProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const { toast } = useToast();

  const isOpen = controlledOpen ?? internalOpen;
  const setIsOpen = controlledOnOpenChange ?? setInternalOpen;

  const form = useForm<RoleFormData>({
    resolver: zodResolver(roleSchema),
    defaultValues: {
      name: '',
      description: '',
      // permissions: [],
    },
  });

  React.useEffect(() => {
    if (isOpen) {
      if (role) {
        form.reset({
          name: role.name || '',
          description: role.description || '',
          // permissions: role.permissions || [],
        });
      } else {
        form.reset({ // Reset to default empty values for new role
          name: '',
          description: '',
          // permissions: [],
        });
      }
    }
  }, [role, form, isOpen]);

  const onSubmit = async (data: RoleFormData) => {
    setIsSaving(true);
    try {
      await onSave(data);
      // Toast is handled in parent component
      setIsOpen(false);
    } catch (error) {
      console.error("Falha ao salvar função:", error);
      toast({
        title: 'Erro!',
        description: `Falha ao ${role ? 'atualizar' : 'criar'} função. Tente novamente.`,
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
          <DialogTitle>{role ? 'Editar Função' : 'Adicionar Nova Função'}</DialogTitle>
          <DialogDescription>
            {role ? 'Atualize os detalhes da função.' : 'Preencha os detalhes da nova função (cargo).'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome da Função</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Desenvolvedor Full Stack" {...field} />
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
                      <Textarea placeholder="Breve descrição das responsabilidades do cargo..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
             />
            {/* Optional: Field for managing permissions */}
            {/* <FormField
              control={form.control}
              name="permissions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Permissões (Avançado)</FormLabel>
                  <FormControl>
                    {/* Replace with a multi-select or checkbox group for permissions */}
                    {/*<Input placeholder="Permissões separadas por vírgula" {...field} />
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
                {role ? 'Salvar Alterações' : 'Criar Função'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
