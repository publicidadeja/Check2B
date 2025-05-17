// src/components/organization/organization-form.tsx
'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import type { Organization } from '@/app/(superadmin)/superadmin/organizations/page'; // Assuming type is exported from page

// Schema for Organization Form Validation
const organizationSchema = z.object({
  name: z.string().min(2, { message: 'Nome da organização deve ter pelo menos 2 caracteres.' }),
  plan: z.enum(['basic', 'premium', 'enterprise'], { required_error: "Plano é obrigatório." }),
  status: z.enum(['active', 'inactive', 'pending'], { required_error: "Status é obrigatório." }),
  // Add fields for initial admin creation if doing it here
  // initialAdminEmail: z.string().email("Email do admin inválido.").optional(),
  // initialAdminName: z.string().min(2, "Nome do admin inválido.").optional(),
});
// .refine(data => (data.initialAdminEmail && data.initialAdminName) || (!data.initialAdminEmail && !data.initialAdminName), {
//     message: "Se fornecer email do admin, o nome também é obrigatório.",
//     path: ["initialAdminName"]
// });


type OrganizationFormData = z.infer<typeof organizationSchema>;

interface OrganizationFormProps {
  organization?: Organization | null;
  onSave: (data: OrganizationFormData) => Promise<void>;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function OrganizationForm({
    organization,
    onSave,
    open: controlledOpen,
    onOpenChange: controlledOnOpenChange,
}: OrganizationFormProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const { toast } = useToast();

  const isOpen = controlledOpen ?? internalOpen;
  const setIsOpen = controlledOnOpenChange ?? setInternalOpen;

  const form = useForm<OrganizationFormData>({
    resolver: zodResolver(organizationSchema),
    defaultValues: {
      name: '',
      plan: 'basic',
      status: 'pending',
      // initialAdminEmail: '',
      // initialAdminName: ''
    },
  });

  React.useEffect(() => {
    if (isOpen) {
      if (organization) {
        form.reset({
          name: organization.name || '',
          plan: organization.plan || 'basic',
          status: organization.status || 'pending',
        });
      } else {
        form.reset({
          name: '',
          plan: 'basic',
          status: 'pending',
          // initialAdminEmail: '',
          // initialAdminName: ''
        });
      }
    }
  }, [organization, form, isOpen]);

  const onSubmit = async (data: OrganizationFormData) => {
    setIsSaving(true);
    try {
      await onSave(data);
      // Toast is handled in parent component
      setIsOpen(false);
    } catch (error) {
      console.error("Falha ao salvar organização:", error);
      toast({
        title: 'Erro!',
        description: `Falha ao ${organization ? 'atualizar' : 'criar'} organização. Tente novamente.`,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{organization ? 'Editar Organização' : 'Adicionar Nova Organização'}</DialogTitle>
          <DialogDescription>
            {organization ? 'Atualize os detalhes da organização cliente.' : 'Preencha os detalhes da nova organização cliente.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome da Organização</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome da Empresa Cliente" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <div className="grid grid-cols-2 gap-4">
               <FormField
                  control={form.control}
                  name="plan"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Plano Contratado</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="basic">Básico</SelectItem>
                          <SelectItem value="premium">Premium</SelectItem>
                          <SelectItem value="enterprise">Enterprise</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="pending">Pendente</SelectItem>
                          <SelectItem value="active">Ativa</SelectItem>
                          <SelectItem value="inactive">Inativa</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </div>
             {/* TODO: Add fields for initial admin creation if needed */}
             {/* {!organization && (
                <>
                    <Separator />
                    <h4 className="text-sm font-medium">Admin Inicial (Opcional)</h4>
                     <FormField control={form.control} name="initialAdminEmail" ... />
                     <FormField control={form.control} name="initialAdminName" ... />
                </>
             )} */}


            <DialogFooter>
              <DialogClose asChild>
                 <Button type="button" variant="outline">Cancelar</Button>
              </DialogClose>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {organization ? 'Salvar Alterações' : 'Criar Organização'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
