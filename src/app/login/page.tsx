
'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { LogIn, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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

const loginSchema = z.object({
  email: z.string().email({ message: 'Por favor, insira um email válido.' }),
  password: z.string().min(6, { message: 'Senha deve ter pelo menos 6 caracteres.' }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);

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
      const userCredential = await loginUser(data.email, data.password);

      if (userCredential && userCredential.user) {
        const idToken = await userCredential.user.getIdToken(true); // Get the ID token
        const idTokenResult = await userCredential.user.getIdTokenResult();
        const role = idTokenResult.claims.role || 'colaborador'; // Default to colaborador if no role claim

        // Set authentication cookie (implement this function)
        await setAuthCookie(idToken);

        toast({
          title: 'Login bem-sucedido!',
          description: `Bem-vindo(a) de volta!`,
        });

        // Redirect based on role
        if (role === 'admin') {
          router.push('/'); // Redirect admin to dashboard
        } else {
          router.push('/colaborador/dashboard'); // Redirect employee to their dashboard
        }
      } else {
          throw new Error("Credenciais inválidas ou erro desconhecido.");
      }

    } catch (error: any) {
      console.error('Erro no login:', error);
      let errorMessage = 'Falha no login. Verifique suas credenciais.';
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
          errorMessage = 'Email ou senha inválidos.';
      } else if (error.code === 'auth/too-many-requests') {
          errorMessage = 'Muitas tentativas de login. Tente novamente mais tarde.';
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

  // Handler for "Forgot Password" - Replace with actual navigation or modal
  const handleForgotPassword = () => {
      // router.push('/forgot-password'); // Example navigation
      toast({ title: "Funcionalidade Pendente", description: "Recuperação de senha ainda não implementada." });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
           <div className="flex justify-center mb-4">
                {/* Placeholder Logo */}
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-12 h-12 text-primary">
                    <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" clipRule="evenodd" />
                </svg>
           </div>
          <CardTitle className="text-2xl font-bold">Bem-vindo ao Check2B</CardTitle>
          <CardDescription>Faça login para acessar seu painel.</CardDescription>
        </CardHeader>
        <CardContent>
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
                        <Button type="button" variant="link" size="sm" className="h-auto p-0 text-xs" onClick={handleForgotPassword}>
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
               {/* Add "Remember Me" Checkbox if needed */}
               {/* <div className="flex items-center space-x-2">
                    <Checkbox id="remember-me" />
                    <Label htmlFor="remember-me" className="text-sm font-normal">Lembrar de mim</Label>
               </div> */}
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
          {/* Optional: Add SSO options (Google, Microsoft) if applicable */}
          {/* <div className="mt-4 text-center text-sm">
            Ou entre com
             <div className="flex justify-center gap-4 mt-2">
                <Button variant="outline" size="icon"><IconGoogle /></Button>
                <Button variant="outline" size="icon"><IconMicrosoft /></Button>
            </div>
          </div> */}
        </CardContent>
      </Card>
    </div>
  );
}
