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
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getFirebaseApp, getAuthInstance } from '@/lib/firebase'; // Import getAuthInstance
import { getIdTokenResult } from 'firebase/auth'; // Import getIdTokenResult for more detailed token info

const addAdminSchema = z.object({
  name: z.string().min(3, { message: 'Nome deve ter pelo menos 3 caracteres.' }),
  email: z.string().email({ message: 'Email inválido.' }),
  password: z.string().min(6, { message: 'Senha deve ter pelo menos 6 caracteres.' }),
});

type AddAdminFormData = z.infer<typeof addAdminSchema>;

interface AddAdminFormProps {
  organizationId: string;
  organizationName: string;
  onAdminAdded: () => void;
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
  const firebaseApp = getFirebaseApp();
  const auth = getAuthInstance();

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
      form.reset();
      setShowPassword(false);
    }
  }, [form, isOpen]);

  const onSubmit = async (data: AddAdminFormData) => {
    if (!firebaseApp) {
        toast({ title: "Erro de Configuração", description: "Firebase App não inicializado.", variant: "destructive" });
        console.error("[AddAdminForm] Firebase App not initialized.");
        return;
    }
    if (!auth) {
        toast({ title: "Erro de Configuração", description: "Firebase Auth não inicializado.", variant: "destructive" });
        console.error("[AddAdminForm] Firebase Auth not initialized.");
        return;
    }

    setIsSaving(true);

    // Log current user's token claims (frontend)
    if (auth.currentUser) {
        try {
            const tokenResult = await getIdTokenResult(auth.currentUser, true); // Force refresh
            console.log('[AddAdminForm] Current user token claims before calling CF:', tokenResult.claims);
            if (!tokenResult.claims.role || tokenResult.claims.role !== 'super_admin') {
                 console.warn('[AddAdminForm] Logged in user does NOT have super_admin claim in their token.');
            }
        } catch (tokenError) {
            console.error('[AddAdminForm] Error getting user token:', tokenError);
        }
    } else {
        console.warn('[AddAdminForm] No current user found in Firebase Auth before calling CF.');
    }


    try {
      const functions = getFunctions(firebaseApp);
      const createOrgAdmin = httpsCallable(functions, 'createOrganizationAdmin');
      
      console.log(`[AddAdminForm] Calling createOrganizationAdmin with data:`, {
        name: data.name,
        email: data.email,
        organizationId: organizationId,
        // Password is not logged for security
      });

      const result = await createOrgAdmin({
        name: data.name,
        email: data.email,
        password: data.password,
        organizationId: organizationId,
      });
      
      const resultData = result.data as { success?: boolean, userId?: string, message?: string, error?: string };
      console.log('[AddAdminForm] Cloud Function result:', resultData);

      if (resultData.success) {
        toast({
          title: 'Sucesso!',
          description: resultData.message || `Administrador ${data.name} adicionado à organização ${organizationName}.`,
        });
        onAdminAdded();
        setIsOpen(false);
      } else {
        // Prefer error message from CF if available
        throw new Error(resultData.error || 'Falha ao criar administrador na Cloud Function.');
      }
    } catch (error: any) {
      console.error("[AddAdminForm] Falha ao adicionar administrador:", error);
      // Check if it's a Firebase Functions HttpsError and use its message
      let errorMessage = `Falha ao adicionar administrador. Tente novamente.`;
      if (error.code && error.message) { // Firebase HttpsError has code and message
          errorMessage = error.message;
      } else if (error.message) {
          errorMessage = error.message;
      }
      toast({
        title: 'Erro!',
        description: errorMessage,
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
