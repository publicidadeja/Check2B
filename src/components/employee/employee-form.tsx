// src/components/employee/employee-form.tsx
'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, UserPlus, Loader2, Eye, EyeOff } from 'lucide-react'; // Added Eye icons

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
    DialogClose
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import type { UserProfile } from '@/types/user'; // Use UserProfile

// Schema for Employee Form Validation
// Add password field for creation, make it optional for editing
const employeeSchemaBase = z.object({
  name: z.string().min(2, { message: 'Nome deve ter pelo menos 2 caracteres.' }),
  email: z.string().email({ message: 'Email inválido.' }),
  phone: z.string().optional().or(z.literal('')),
  department: z.string().min(1, { message: 'Departamento é obrigatório.' }),
  role: z.string().min(1, { message: 'Função é obrigatória.' }),
  admissionDate: z.date({ required_error: 'Data de admissão é obrigatória.' }),
  photoUrl: z.string().url({ message: 'URL da foto inválida.' }).optional().or(z.literal('')),
  status: z.enum(['active', 'inactive', 'pending']).default('active'), // Changed isActive to status
});

const employeeCreateSchema = employeeSchemaBase.extend({
    password: z.string().min(6, { message: 'Senha deve ter pelo menos 6 caracteres.' }),
});

const employeeEditSchema = employeeSchemaBase.extend({
    password: z.string().optional(), // Password optional for editing
});


// Use a generic type for form data to handle both create and edit
type EmployeeFormData = z.infer<typeof employeeCreateSchema>; // Use create schema as base, edit will ignore password if not provided

interface EmployeeFormProps {
  employee?: UserProfile | null; // Existing employee for editing
  onSave: (data: Partial<EmployeeFormData>) => Promise<void>; // Use Partial for updates
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function EmployeeForm({
    employee,
    onSave,
    open: controlledOpen,
    onOpenChange: controlledOnOpenChange
}: EmployeeFormProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [photoPreview, setPhotoPreview] = React.useState<string | undefined>(employee?.photoUrl);
  const [showPassword, setShowPassword] = React.useState(false);
  const { toast } = useToast();

  const isOpen = controlledOpen ?? internalOpen;
  const setIsOpen = controlledOnOpenChange ?? setInternalOpen;

  const currentSchema = employee ? employeeEditSchema : employeeCreateSchema;

  const form = useForm<EmployeeFormData>({
    resolver: zodResolver(currentSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '', // Add password default
      phone: '',
      department: '',
      role: '',
      admissionDate: new Date(),
      photoUrl: '',
      status: 'active',
    },
  });

   React.useEffect(() => {
    if (isOpen) {
        if (employee) {
          form.reset({
            name: employee.name,
            email: employee.email,
            password: '', // Don't prefill password for editing
            phone: (employee as any).phone || '',
            department: (employee as any).department || '',
            role: (employee as any).role, // employee.role is UserRole, form expects string
            admissionDate: (employee as any).admissionDate ? new Date((employee as any).admissionDate + 'T00:00:00') : new Date(),
            photoUrl: employee.photoUrl || '',
            status: employee.status || 'active',
          });
           setPhotoPreview(employee.photoUrl);
        } else {
           form.reset({
             name: '',
             email: '',
             password: '',
             phone: '',
             department: '',
             role: '',
             admissionDate: new Date(),
             photoUrl: '',
             status: 'active',
           });
           setPhotoPreview(undefined);
        }
        setShowPassword(false);
     }
  }, [employee, form, isOpen]);


  const onSubmit = async (data: EmployeeFormData) => {
    setIsSaving(true);
    // If editing and password field is empty, don't send it
    const dataToSave = { ...data };
    if (employee && !data.password) {
        delete (dataToSave as any).password;
    }

    try {
      await onSave(dataToSave);
      setIsOpen(false);
    } catch (error) {
       console.error("Falha ao salvar colaborador:", error);
      toast({
        title: 'Erro!',
        description: `Falha ao ${employee ? 'atualizar' : 'cadastrar'} colaborador. Tente novamente.`,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

   const handlePhotoUrlChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const url = event.target.value;
    form.setValue('photoUrl', url);
    if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
       setPhotoPreview(url);
     } else {
       setPhotoPreview(undefined);
     }
  };

  const getInitials = (name: string) => {
     if (!name) return '??';
     return name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
   };


  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{employee ? 'Editar Colaborador' : 'Adicionar Novo Colaborador'}</DialogTitle>
          <DialogDescription>
            {employee ? 'Atualize as informações do colaborador.' : 'Preencha os detalhes do novo colaborador.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <div className="flex items-center space-x-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={photoPreview} alt={form.watch('name')} />
                  <AvatarFallback>{getInitials(form.watch('name'))}</AvatarFallback>
                </Avatar>
               <FormField
                  control={form.control}
                  name="photoUrl"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>URL da Foto (Opcional)</FormLabel>
                      <FormControl>
                        <Input placeholder="https://..." {...field} value={field.value ?? ''} onChange={handlePhotoUrlChange} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </div>

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome Completo</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome Sobrenome" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Corporativo</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="nome.sobrenome@check2b.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {!employee && ( // Only show password for new employees
                 <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Senha Inicial</FormLabel>
                        <FormControl>
                        <div className="relative">
                            <Input
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Mínimo 6 caracteres"
                                {...field}
                            />
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-foreground"
                                onClick={() => setShowPassword(!showPassword)}
                                >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                        </div>
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
            )}
             <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone (Opcional)</FormLabel>
                    <FormControl>
                      <Input type="tel" placeholder="(XX) XXXXX-XXXX" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="department"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Departamento</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Engenharia" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="role" // This should match UserProfile role, but form is expecting string
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Função</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Desenvolvedor" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="admissionDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Data de Admissão</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={'outline'}
                          className={cn(
                            'w-full pl-3 text-left font-normal',
                            !field.value && 'text-muted-foreground'
                          )}
                        >
                          {field.value ? (
                            format(field.value, 'PPP', { locale: ptBR })
                          ) : (
                            <span>Escolha uma data</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) =>
                          date > new Date() || date < new Date('1950-01-01')
                        }
                        initialFocus
                        locale={ptBR}
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

             <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                       <FormLabel>Colaborador Ativo</FormLabel>
                     </div>
                    <FormControl>
                      <Switch
                        checked={field.value === 'active'} // Compare with 'active'
                        onCheckedChange={(checked) => field.onChange(checked ? 'active' : 'inactive')}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

            <DialogFooter>
              <DialogClose asChild>
                 <Button type="button" variant="outline">Cancelar</Button>
              </DialogClose>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {employee ? 'Salvar Alterações' : 'Cadastrar Colaborador'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
