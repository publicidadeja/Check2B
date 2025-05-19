// src/components/organization/add-admin-form.tsx
'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { UserPlus, Loader2, Eye, EyeOff, KeyRound, Mail, User as UserIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

// Schema for Add Admin Form Validation
const addAdminSchema = z.object({
  name: z.string().min(3, { message: 'Nome deve ter pelo menos 3 caracteres.' }),
  email: z.string().email({ message: 'Email inválido.' }),
  password: z.string().min(6, { message: 'Senha deve ter pelo menos 6 caracteres.' }),
});

type AddAdminFormData = z.infer<typeof addAdminSchema>;

interface AddAdminFormProps {
  organizationId: string;
  organizationName: string;
  onAdminAdded: () => void; // Callback after admin is successfully added
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function AddAdminForm({
    organizationId,
    organizationName,
    onAdminAdded,
    open: controlledOpen,
    onOpenChange: controlledOnOpenChange,
}: AddAdminFormProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const { toast } = useToast();

  const isOpen = controlledOpen ?? internalOpen;
  const setIsOpen = controlledOnOpenChange ?? setInternalOpen;

  const form = useForm<AddAdminFormData>({
    resolver: zodResolver(addAdminSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
    },
  });

  React.useEffect(() => {
    if (isOpen) {
      form.reset(); // Reset form when opened
      setShowPassword(false);
    }
  }, [form, isOpen]);

  const onSubmit = async (data: AddAdminFormData) => {
    setIsSaving(true);
    try {
      // Here you would call the Cloud Function `createOrganizationAdmin`
      // For now, we simulate a success and call the callback.
      console.log('Simulating call to createOrganizationAdmin with:', { ...data, organizationId });
      
      // Replace with actual Cloud Function call
      // const functions = getFunctions(getFirebaseApp()); // Assuming getFirebaseApp initializes Firebase
      // const createOrgAdmin = httpsCallable(functions, 'createOrganizationAdmin');
      // const result = await createOrgAdmin({ ...data, organizationId });

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: 'Sucesso!',
        description: `Administrador ${data.name} adicionado à organização ${organizationName}.`,
      });
      onAdminAdded(); // Notify parent to refresh admin list or take other actions
      setIsOpen(false);
    } catch (error: any) {
      console.error("Falha ao adicionar administrador:", error);
      toast({
        title: 'Erro!',
        description: error.message || `Falha ao adicionar administrador. Tente novamente.`,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar Admin para {organizationName}</DialogTitle>
          <DialogDescription>
            Preencha os dados do novo administrador para esta organização.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">Nome Completo</FormLabel>
                  <FormControl>
                    <div className="relative">
                        <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Nome do Administrador" {...field} className="pl-10 h-10 text-sm"/>
                    </div>
                  </FormControl>
                  <FormMessage className="text-xs"/>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">Email</FormLabel>
                  <FormControl>
                    <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input type="email" placeholder="email@dominio.com" {...field} className="pl-10 h-10 text-sm"/>
                    </div>
                  </FormControl>
                  <FormMessage className="text-xs"/>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">Senha Inicial</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Mínimo 6 caracteres"
                        {...field}
                        className="pl-10 h-10 text-sm"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage className="text-xs"/>
                </FormItem>
              )}
            />
            <DialogFooter>
              <DialogClose asChild>
                 <Button type="button" variant="outline" disabled={isSaving}>Cancelar</Button>
              </DialogClose>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                Adicionar Admin
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
