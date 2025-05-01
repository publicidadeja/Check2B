
'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { LogIn, Loader2, User, Shield, Eye } from 'lucide-react'; // Added Shield, Eye

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label'; // Keep Label import
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
  AlertDialogTrigger, // Keep Trigger if needed, but we'll trigger manually
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
import { loginUser, setAuthCookie } from '@/lib/auth'; // Assuming auth functions exist
import type { UserCredential } from 'firebase/auth'; // Assuming Firebase
import { Separator } from '@/components/ui/separator';

const loginSchema = z.object({
  email: z.string().email({ message: 'Por favor, insira um email válido.' }),
  password: z.string().min(6, { message: 'Senha deve ter pelo menos 6 caracteres.' }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);
  const [isGuestChoiceOpen, setIsGuestChoiceOpen] = React.useState(false); // State for guest choice dialog

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    try {
      // NOTE: This uses the mock user leocorax@gmail.com / 123456 for testing
      // It does NOT use Firebase Auth directly in this simplified version.
      // Replace with actual Firebase logic when ready.
       if (data.email === 'leocorax@gmail.com' && data.password === '123456') {
         // Simulate Colaborador login
         console.log("Simulating Colaborador login...");
         // Set a mock token or skip if middleware allows guest access
         // For testing, we might just redirect
          toast({
           title: 'Login Convidado (Colaborador)',
           description: `Acessando painel do colaborador...`,
         });
         router.push('/colaborador/dashboard');

       } else if (data.email === 'admin@check2b.com' && data.password === 'admin123') {
            // Simulate Admin login
            console.log("Simulating Admin login...");
             toast({
                title: 'Login Convidado (Admin)',
                description: `Acessando painel administrativo...`,
            });
            router.push('/'); // Redirect admin to root dashboard
       }
       else {
            // Use actual Firebase login
             const userCredential = await loginUser(data.email, data.password);

            if (userCredential && userCredential.user) {
                const idToken = await userCredential.user.getIdToken(true);
                const idTokenResult = await userCredential.user.getIdTokenResult();
                const role = idTokenResult.claims.role || 'colaborador';

                await setAuthCookie(idToken);

                toast({
                title: 'Login bem-sucedido!',
                description: `Bem-vindo(a) de volta! Redirecionando...`,
                });

                if (role === 'admin') {
                router.push('/');
                } else {
                router.push('/colaborador/dashboard');
                }
            } else {
                throw new Error("Credenciais inválidas ou erro desconhecido.");
            }
       }


    } catch (error: any) {
      console.error('Erro no login:', error);
      let errorMessage = 'Falha no login. Verifique suas credenciais.';
      // Handle specific Firebase auth errors
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
           case 'auth/api-key-not-valid.-please-pass-a-valid-api-key.': // Handle the specific error string
               errorMessage = 'Erro de configuração da API. Verifique a chave Firebase no .env.';
               console.error("FIREBASE AUTH ERROR: Invalid API Key. Check .env configuration (NEXT_PUBLIC_FIREBASE_API_KEY). Value:", process.env.NEXT_PUBLIC_FIREBASE_API_KEY);
               break;
          default:
            console.warn(`Unhandled Firebase Auth error code: ${error.code}`);
        }
      } else if (error.message === "Firebase Auth is not initialized. Check configuration.") {
        errorMessage = "Erro de configuração do servidor de autenticação. Contate o suporte.";
      }

      toast({
        title: 'Erro no Login',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    toast({ title: "Funcionalidade Pendente", description: "Recuperação de senha ainda não implementada." });
  }

  // Updated handler for guest login button
  const handleGuestLoginClick = () => {
    setIsGuestChoiceOpen(true); // Open the dialog
  };

  const handleGuestChoice = (role: 'admin' | 'colaborador') => {
     setIsGuestChoiceOpen(false); // Close dialog
     const targetPath = role === 'admin' ? '/' : '/colaborador/dashboard';
     toast({
          title: `Acesso Convidado (${role === 'admin' ? 'Admin' : 'Colaborador'})`,
          description: `Entrando no painel ${role === 'admin' ? 'administrativo' : 'do colaborador'}...`,
          duration: 2000,
      });
     router.push(targetPath);
  };


  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-sky-50 via-white to-gray-100 dark:from-slate-900 dark:via-slate-950 dark:to-slate-800 p-4">
      <Card className="w-full max-w-md shadow-lg border-none overflow-hidden"> {/* Added border-none and overflow */}
         {/* Illustration Header */}
         <div className="bg-gradient-to-r from-teal-500 to-cyan-600 dark:from-teal-800 dark:to-cyan-900 p-6 text-center">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-16 h-16 text-white mx-auto mb-2 opacity-90">
                  <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" clipRule="evenodd" />
              </svg>
             <CardTitle className="text-xl font-bold text-white">Bem-vindo ao Check2B</CardTitle>
             <CardDescription className="text-teal-100 dark:text-teal-200">Faça login para acessar seu painel.</CardDescription>
        </div>

        <CardContent className="p-6 bg-background">
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
                      <Input type="password" placeholder="********" {...field} />
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
                <Eye className="mr-2 h-4 w-4"/> {/* Changed icon */}
                Entrar como Convidado
             </Button>
        </CardFooter>
      </Card>

       {/* Guest Choice Dialog */}
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
                    <Button onClick={() => handleGuestChoice('colaborador')} variant="outline">
                        <User className="mr-2 h-4 w-4" /> Painel Colaborador
                     </Button>
                     <Button onClick={() => handleGuestChoice('admin')}>
                        <Shield className="mr-2 h-4 w-4" /> Painel Admin
                    </Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}
