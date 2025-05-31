
// src/components/admin/add-admin-to-org-form.tsx
'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { UserPlus, Loader2, Eye, EyeOff, Mail, User as UserIcon, KeyRound } from 'lucide-react';

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

const addAdminSchema = z.object({
  name: z.string().min(3, { message: 'Nome deve ter pelo menos 3 caracteres.' }),
  email: z.string().email({ message: 'Email inválido.' }),
  password: z.string().min(6, { message: 'Senha deve ter pelo menos 6 caracteres.' }),
});

export type AddAdminFormData = z.infer<typeof addAdminSchema>;

interface AddAdminToOrgFormProps {
  onSave: (data: AddAdminFormData) => Promise<void>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddAdminToOrgForm({
    onSave,
    open,
    onOpenChange,
}: AddAdminToOrgFormProps) {
  const [isSaving, setIsSaving] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const { toast } = useToast();

  const form = useForm<AddAdminFormData>({
    resolver: zodResolver(addAdminSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
    },
  });

  React.useEffect(() => {
    if (open) {
      form.reset();
      setShowPassword(false);
    }
  }, [form, open]);

  const onSubmit = async (data: AddAdminFormData) => {
    setIsSaving(true);
    try {
      await onSave(data);
      // Toast for success is handled by the parent component which calls the CF
      onOpenChange(false); // Close dialog on successful save via parent
    } catch (error: any) {
      // This catch might not be hit if onSave itself handles errors and toasts.
      // But it's here as a fallback for errors during the onSave call itself.
      console.error("[AddAdminToOrgForm] Error during onSave:", error);
      toast({
        title: 'Erro Inesperado no Formulário',
        description: error.message || `Falha ao processar o formulário.`,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" /> Adicionar Novo Administrador
            </DialogTitle>
          <DialogDescription>
            Preencha os dados do novo administrador para sua organização.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">Nome Completo</FormLabel>
                  <FormControl>
                    <div className="relative">
                        <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Nome do Administrador" {...field} className="pl-10 h-9 text-sm"/>
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
                        <Input type="email" placeholder="email@dominio.com" {...field} className="pl-10 h-9 text-sm"/>
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
                        className="pl-10 h-9 text-sm pr-10"
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
            <DialogFooter className="pt-2">
              <DialogClose asChild>
                 <Button type="button" variant="outline" disabled={isSaving} className="h-9 text-sm">Cancelar</Button>
              </DialogClose>
              <Button type="submit" disabled={isSaving} className="h-9 text-sm">
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
