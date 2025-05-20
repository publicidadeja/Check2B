// src/app/login/page.tsx
'use client';

import * as React from 'react';
import { Suspense } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useForm } from 'react-hook-form';
import { useRouter, useSearchParams } from 'next/navigation';
import { LogIn, Loader2, User, Shield, Eye, EyeOff, AlertTriangle, Settings2, Mail, KeyRound } from 'lucide-react';
import Cookies from 'js-cookie';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { loginUser, logoutUser, sendPasswordReset } from '@/lib/auth'; // Removed setAuthCookie as it's handled by loginUser
import { Separator } from '@/components/ui/separator';
import { Logo } from '@/components/logo';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

const loginSchema = z.object({
  email: z.string().email({ message: 'Por favor, insira um email válido.' }),
  password: z.string().min(6, { message: 'Senha deve ter pelo menos 6 caracteres.' }),
});

const forgotPasswordSchema = z.object({
    resetEmail: z.string().email({ message: 'Por favor, insira um email válido para redefinição.' }),
});

type LoginFormValues = z.infer<typeof loginSchema>;
type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;
type UserRole = 'super_admin' | 'admin' | 'collaborator';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);
  const [isGuestChoiceOpen, setIsGuestChoiceOpen] = React.useState(false);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = React.useState(false);
  const [isSendingReset, setIsSendingReset] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const [loginError, setLoginError] = React.useState<string | null>(null);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const forgotPasswordForm = useForm<ForgotPasswordFormValues>({
      resolver: zodResolver(forgotPasswordSchema),
      defaultValues: {
          resetEmail: '',
      },
  });

  React.useEffect(() => {
      const reason = searchParams.get('reason');
      if (reason === 'unauthenticated' || reason === 'cl_critical_fallback_v5' || reason === 'cl_guest_unhandled_path_v5' || reason === 'cl_bypass_no_path_match_v4' || reason === 'conditional_layout_fallback' || reason === 'no_layout_applied_fallback') {
          setLoginError("Sua sessão expirou ou você não está autenticado. Por favor, faça login novamente.");
      } else if (reason === 'no_org') {
           setLoginError("Seu usuário não está vinculado a uma organização. Contate o administrador.");
      } else if (reason === 'unknown_role') {
           setLoginError("Seu perfil de usuário é desconhecido. Contate o administrador.");
      } else if (reason === 'profile_missing') {
          setLoginError("Usuário autenticado, mas perfil não encontrado no banco de dados. Contate o suporte.");
      } else if (reason === 'profile_error') {
          setLoginError("Erro ao carregar dados do perfil. Contate o suporte.");
      }
      if (reason && typeof window !== 'undefined') {
           const currentUrl = new URL(window.location.href);
           currentUrl.searchParams.delete('reason');
           currentUrl.searchParams.delete('from');
           window.history.replaceState(null, '', currentUrl.toString());
      }
   }, [searchParams]);

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    setLoginError(null);
    try {
      // loginUser now handles setting cookies internally after successful auth and profile fetch
      const { userData } = await loginUser(data.email, data.password);

       if (userData) {
        const { role } = userData;

        toast({
          title: 'Login bem-sucedido!',
          description: `Bem-vindo(a)! Redirecionando...`,
        });

        if (role === 'super_admin') {
          router.push('/superadmin');
        } else if (role === 'admin') {
          router.push('/'); // Admin dashboard is root
        } else if (role === 'collaborator') {
          router.push('/colaborador/dashboard');
        } else {
          console.warn(`[Login Page] Invalid role detected after login: ${role}`);
          setLoginError("Perfil de usuário inválido após login. Contate o suporte.");
          await logoutUser(); // Use the centralized logoutUser from lib/auth
          setIsLoading(false);
          return;
        }
      } else {
        // This case should ideally be handled by an error in loginUser if userData is not returned
        throw new Error("Credenciais inválidas ou erro desconhecido durante o login.");
      }
    } catch (error: any) {
      console.error('Erro no login:', error);
      let errorMessage = 'Falha no login. Verifique suas credenciais.';
      if (error.code) {
        switch (error.code) {
          case 'auth/invalid-credential':
          case 'auth/user-not-found':
          case 'auth/wrong-password':
            errorMessage = 'Email ou senha inválidos.';
            break;
          case 'auth/too-many-requests':
            errorMessage = 'Muitas tentativas de login. Tente novamente mais tarde.';
            break;
          case 'auth/network-request-failed':
            errorMessage = 'Erro de rede. Verifique sua conexão com a internet.';
            break;
           case 'auth/invalid-api-key':
           case 'auth/api-key-not-valid.-please-pass-a-valid-api-key.':
            errorMessage = 'Erro de configuração (Chave API Inválida). Verifique as variáveis de ambiente.';
            console.error("FIREBASE AUTH ERROR: Invalid API Key. Check .env configuration (NEXT_PUBLIC_FIREBASE_API_KEY).");
            break;
          default:
            console.warn(`Unhandled Firebase Auth error code: ${error.code}`);
            errorMessage = error.message || `Erro inesperado (${error.code}). Tente novamente.`;
        }
      } else if (error.message) {
          errorMessage = error.message;
      }
       setLoginError(errorMessage);
       Cookies.remove('auth-token');
       Cookies.remove('user-role');
       Cookies.remove('organization-id');
       Cookies.remove('guest-mode');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPasswordSubmit = async (data: ForgotPasswordFormValues) => {
      setIsSendingReset(true);
      try {
          await sendPasswordReset(data.resetEmail);
          toast({
              title: "Email Enviado",
              description: "Verifique sua caixa de entrada para o link de redefinição de senha.",
          });
          setIsForgotPasswordOpen(false);
          forgotPasswordForm.reset();
      } catch (error: any) {
          console.error("Erro ao enviar email de reset:", error);
          toast({
              title: "Erro ao Enviar Email",
              description: error.message || "Não foi possível enviar o email. Verifique o endereço e tente novamente.",
              variant: "destructive",
          });
      } finally {
          setIsSendingReset(false);
      }
  };

  const handleGuestLoginClick = () => {
    setIsGuestChoiceOpen(true);
  };

  const handleGuestChoice = (role: UserRole) => {
     setIsGuestChoiceOpen(false);
     let targetPath = '/';
     let roleName = 'Admin';

     if (role === 'collaborator') {
        targetPath = '/colaborador/dashboard';
        roleName = 'Colaborador';
     } else if (role === 'super_admin') {
        targetPath = '/superadmin';
        roleName = 'Super Admin';
     }

     toast({
          title: `Acesso Convidado (${roleName})`,
          description: `Entrando no painel...`,
          duration: 2000,
      });
      Cookies.remove('auth-token');
      Cookies.remove('user-role');
      Cookies.remove('organization-id');
      console.log(`[Login Page] Setting guest mode cookie to: ${role}`);
      Cookies.set('guest-mode', role, { path: '/' }); // Session cookie
      router.push(targetPath);
  };

  return (
     <Card className="w-full max-w-md shadow-xl border-none overflow-hidden rounded-xl bg-card">
         <div className="bg-gradient-to-br from-primary to-primary/80 dark:from-primary/90 dark:to-primary/70 p-6 text-center">
              <Logo className="w-20 h-20 text-primary-foreground mx-auto mb-3 opacity-95"/>
             <CardTitle className="text-xl font-bold text-primary-foreground">Bem-vindo ao Check2B</CardTitle>
             <CardDescription className="text-primary-foreground/80">Faça login para acessar seu painel.</CardDescription>
        </div>

        <CardContent className="p-6">
           {loginError && (
               <Alert variant="destructive" className="mb-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Erro de Acesso</AlertTitle>
                  <AlertDescription>{loginError}</AlertDescription>
               </Alert>
           )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">Email Corporativo</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input type="email" placeholder="seu.email@check2b.com" {...field} className="pl-10 h-10 text-sm"/>
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
                    <div className="flex items-center justify-between">
                        <FormLabel className="text-sm">Senha</FormLabel>
                        <Button type="button" variant="link" size="sm" className="h-auto p-0 text-xs text-primary" onClick={() => setIsForgotPasswordOpen(true)} disabled={isLoading}>
                          Esqueceu a senha?
                        </Button>
                    </div>
                    <FormControl>
                      <div className="relative">
                        <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="********"
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
                          disabled={isLoading}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage className="text-xs"/>
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full h-10 text-sm" disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <LogIn className="mr-2 h-4 w-4" />
                )}
                {isLoading ? 'Entrando...' : 'Entrar'}
              </Button>
            </form>
          </Form>
        </CardContent>

        <CardFooter className="flex-col gap-4 pt-4 pb-6">
            <div className="relative w-full">
                <div className="absolute inset-0 flex items-center">
                   <Separator />
                </div>
                 <div className="relative flex justify-center">
                     <span className="bg-card px-2 text-xs text-muted-foreground">
                         Ou
                     </span>
                </div>
            </div>
             <Button variant="outline" className="w-full h-10 text-sm" onClick={handleGuestLoginClick} disabled={isLoading}>
                <Eye className="mr-2 h-4 w-4"/>
                Explorar como Convidado
             </Button>
        </CardFooter>

         <AlertDialog open={isGuestChoiceOpen} onOpenChange={setIsGuestChoiceOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>Escolher Visualização Convidado</AlertDialogTitle>
                <AlertDialogDescription>
                    Qual painel você gostaria de visualizar como convidado? (Funcionalidade limitada)
                </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                     <Button onClick={() => handleGuestChoice('collaborator')} variant="outline">
                        <User className="mr-2 h-4 w-4" /> Colaborador
                     </Button>
                     <Button onClick={() => handleGuestChoice('admin')} variant="outline">
                        <Shield className="mr-2 h-4 w-4" /> Admin
                    </Button>
                     <Button onClick={() => handleGuestChoice('super_admin')}>
                        <Settings2 className="mr-2 h-4 w-4" /> Super Admin
                    </Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

         <Dialog open={isForgotPasswordOpen} onOpenChange={setIsForgotPasswordOpen}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                <DialogTitle className="flex items-center gap-2"> <KeyRound className="h-5 w-5"/> Redefinir Senha</DialogTitle>
                <DialogDescription>
                    Insira seu email corporativo para receber um link de redefinição de senha.
                </DialogDescription>
                </DialogHeader>
                <Form {...forgotPasswordForm}>
                    <form onSubmit={forgotPasswordForm.handleSubmit(handleForgotPasswordSubmit)} className="space-y-4 pt-2">
                        <FormField
                            control={forgotPasswordForm.control}
                            name="resetEmail"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-sm">Email</FormLabel>
                                <FormControl>
                                  <div className="relative">
                                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                      <Input type="email" placeholder="seu.email@check2b.com" {...field} className="pl-10 h-10 text-sm"/>
                                  </div>
                                </FormControl>
                                <FormMessage className="text-xs"/>
                            </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <DialogClose asChild>
                                <Button type="button" variant="outline" disabled={isSendingReset}>Cancelar</Button>
                            </DialogClose>
                            <Button type="submit" disabled={isSendingReset}>
                                {isSendingReset && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {isSendingReset ? 'Enviando...' : 'Enviar Link'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
     </Card>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-sky-50 via-white to-gray-100 dark:from-slate-900 dark:via-slate-950 dark:to-slate-800 p-4">
      <Suspense fallback={<div className="flex h-screen w-screen items-center justify-center"><LoadingSpinner size="lg" text="Carregando..."/></div>}>
        <LoginContent />
      </Suspense>
    </div>
  );
}
