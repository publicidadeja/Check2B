
'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useForm } from 'react-hook-form';
import { useRouter, useSearchParams } from 'next/navigation'; // Added useSearchParams
import { LogIn, Loader2, User, Shield, Eye, EyeOff, AlertTriangle } from 'lucide-react';
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
  AlertDialogCancel, // Keep Cancel import
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { loginUser, setAuthCookie } from '@/lib/auth';
import { Separator } from '@/components/ui/separator';
import { Logo } from '@/components/logo';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'; // Import Alert components

const loginSchema = z.object({
  email: z.string().email({ message: 'Por favor, insira um email válido.' }),
  password: z.string().min(1, { message: 'Senha é obrigatória.' }), // Min 1 for presence check
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams(); // Get search params
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);
  const [isGuestChoiceOpen, setIsGuestChoiceOpen] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const [loginError, setLoginError] = React.useState<string | null>(null); // State for general login error

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  // Display messages based on redirect reason
  React.useEffect(() => {
      const reason = searchParams.get('reason');
      if (reason === 'unauthenticated') {
          setLoginError("Sua sessão expirou ou você não está autenticado. Por favor, faça login novamente.");
      } else if (reason === 'no_org') {
           setLoginError("Seu usuário não está vinculado a uma organização. Contate o administrador.");
      } else if (reason === 'unknown_role') {
           setLoginError("Seu perfil de usuário é desconhecido. Contate o administrador.");
      } else if (reason === 'guest_mode') {
            // Optional: Show a message if redirected from guest mode, or just let them log in normally.
            // setLoginError("Você saiu do modo convidado. Faça login para continuar.");
      }
      // Clear reason after showing message
      if (reason) {
          router.replace('/login', undefined); // Use replace to remove query param from URL history
      }
   }, [searchParams, router]);


  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    setLoginError(null); // Clear previous errors
    try {
      const { userCredential, userData } = await loginUser(data.email, data.password);

      if (userCredential?.user) {
        // Role and OrgID are fetched during loginUser now
        const { role, organizationId } = userData;

        toast({
          title: 'Login bem-sucedido!',
          description: `Bem-vindo(a)! Redirecionando...`,
        });

        // Redirect based on role
        if (role === 'super_admin') {
          router.push('/superadmin');
        } else if (role === 'admin') {
          router.push('/'); // Admin root
        } else {
          router.push('/colaborador/dashboard');
        }
      } else {
        throw new Error("Credenciais inválidas ou erro desconhecido.");
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
           case 'auth/invalid-api-key': // Handle specific API key error
           case 'auth/api-key-not-valid.-please-pass-a-valid-api-key.': // Handle variations
            errorMessage = 'Erro de configuração (Chave API Inválida). Contate o suporte.';
            console.error("FIREBASE AUTH ERROR: Invalid API Key. Check .env configuration.");
            break;
          default:
            console.warn(`Unhandled Firebase Auth error code: ${error.code}`);
            errorMessage = `Erro inesperado. Tente novamente.`;
        }
      } else if (error.message === "Firebase Auth or Firestore is not initialized. Check configuration.") {
          errorMessage = "Erro de configuração do servidor de autenticação. Contate o suporte.";
      } else if (error.message === "Perfil de usuário não encontrado no banco de dados.") {
           errorMessage = "Usuário autenticado, mas perfil não encontrado. Contate o suporte.";
      }

      // Use toast for immediate feedback, setLoginError for persistent message
      // toast({
      //   title: 'Erro no Login',
      //   description: errorMessage,
      //   variant: 'destructive',
      // });
       setLoginError(errorMessage); // Show error message above the form

    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    toast({ title: "Funcionalidade Pendente", description: "Recuperação de senha ainda não implementada." });
  }

  const handleGuestLoginClick = () => {
    setIsGuestChoiceOpen(true);
  };

  const handleGuestChoice = (role: 'admin' | 'collaborator' | 'super_admin') => {
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
      Cookies.set('guest-mode', role, { path: '/', expires: 0.1 });
      Cookies.remove('auth-token');
      Cookies.remove('user-role');
      Cookies.remove('organization-id');
      router.push(targetPath);
  };


  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-sky-50 via-white to-gray-100 dark:from-slate-900 dark:via-slate-950 dark:to-slate-800 p-4">
      <Card className="w-full max-w-md shadow-lg border-none overflow-hidden rounded-xl">
         <div className="bg-gradient-to-r from-teal-500 to-cyan-600 dark:from-teal-700 dark:to-cyan-800 p-6 text-center">
              <Logo className="w-16 h-16 text-white mx-auto mb-2 opacity-90"/>
             <CardTitle className="text-xl font-bold text-white">Bem-vindo ao Check2B</CardTitle>
             <CardDescription className="text-teal-100 dark:text-teal-200">Faça login para acessar seu painel.</CardDescription>
        </div>

        <CardContent className="p-6 bg-background">
          {/* Display Login Error Message */}
           {loginError && (
               <Alert variant="destructive" className="mb-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Erro</AlertTitle>
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
                    <FormLabel>Email Corporativo</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="seu.email@check2b.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                        <FormLabel>Senha</FormLabel>
                        <Button type="button" variant="link" size="sm" className="h-auto p-0 text-xs text-primary" onClick={handleForgotPassword}>
                          Esqueceu a senha?
                        </Button>
                    </div>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="********"
                          {...field}
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
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isLoading}>
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

        <CardFooter className="flex-col gap-4 pt-4 pb-6 bg-background">
            <div className="relative w-full">
                <div className="absolute inset-0 flex items-center">
                   <Separator />
                </div>
                 <div className="relative flex justify-center">
                     <span className="bg-background px-2 text-xs text-muted-foreground">
                         Ou
                     </span>
                </div>
            </div>
             <Button variant="outline" className="w-full" onClick={handleGuestLoginClick} disabled={isLoading}>
                <Eye className="mr-2 h-4 w-4"/>
                Entrar como Convidado
             </Button>
        </CardFooter>
      </Card>

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
                        <Settings className="mr-2 h-4 w-4" /> Super Admin
                    </Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}
