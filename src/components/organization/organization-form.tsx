// src/components/organization/organization-form.tsx
'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, Building } from 'lucide-react';

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
import type { Organization } from '@/app/(superadmin)/superadmin/organizations/page';
import type { Plan } from '@/types/plan'; // Import Plan type


const organizationSchema = z.object({
  name: z.string().min(2, { message: 'Nome da organização deve ter pelo menos 2 caracteres.' }),
  plan: z.string({ required_error: "Plano é obrigatório." }).min(1, "Plano é obrigatório."), // Changed to string
  status: z.enum(['active', 'inactive', 'pending'], { required_error: "Status é obrigatório." }),
});

type OrganizationFormData = z.infer<typeof organizationSchema>;

interface OrganizationFormProps {
  organization?: Organization | null;
  plans: Plan[]; // Receive plans as a prop
  onSave: (data: OrganizationFormData) => Promise<void>;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function OrganizationForm({
    organization,
    plans,
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
      plan: '', // Default to empty string
      status: 'pending',
    },
  });

  React.useEffect(() => {
    if (isOpen) {
      if (organization) {
        form.reset({
          name: organization.name || '',
          plan: organization.plan || '',
          status: organization.status || 'pending',
        });
      } else {
        form.reset({
          name: '',
          plan: '',
          status: 'pending',
        });
      }
    }
  }, [organization, form, isOpen]);

  const onSubmit = async (data: OrganizationFormData) => {
    setIsSaving(true);
    try {
      await onSave(data);
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
          <DialogTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            {organization ? 'Editar Organização' : 'Adicionar Nova Organização'}
          </DialogTitle>
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
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {plans.length === 0 ? (
                            <SelectItem value="loading" disabled>Carregando planos...</SelectItem>
                          ) : (
                            plans.map((plan) => (
                              <SelectItem key={plan.id} value={plan.name}>
                                {plan.name}
                              </SelectItem>
                            ))
                          )}
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
                      <Select onValueChange={field.onChange} value={field.value}>
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
