'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale'; // Import ptBR locale
import { CalendarIcon, UserPlus, Loader2 } from 'lucide-react';

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
    DialogTrigger,
    DialogClose
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import type { Employee } from '@/types/employee';

const employeeSchema = z.object({
  name: z.string().min(2, { message: 'Nome deve ter pelo menos 2 caracteres.' }),
  email: z.string().email({ message: 'Email inválido.' }),
  phone: z.string().optional().or(z.literal('')), // Allow empty string
  department: z.string().min(1, { message: 'Departamento é obrigatório.' }),
  role: z.string().min(1, { message: 'Função é obrigatória.' }),
  admissionDate: z.date({ required_error: 'Data de admissão é obrigatória.' }),
  photoUrl: z.string().url({ message: 'URL da foto inválida.' }).optional().or(z.literal('')),
  isActive: z.boolean().default(true),
});

type EmployeeFormData = z.infer<typeof employeeSchema>;

interface EmployeeFormProps {
  employee?: Employee | null;
  onSave: (data: EmployeeFormData) => Promise<void>;
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
  const { toast } = useToast();

  const isOpen = controlledOpen ?? internalOpen;
  const setIsOpen = controlledOnOpenChange ?? setInternalOpen;


  const form = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      department: '',
      role: '',
      admissionDate: new Date(),
      photoUrl: '',
      isActive: true,
    },
  });

   React.useEffect(() => {
    if (isOpen) {
        if (employee) {
          form.reset({
            name: employee.name,
            email: employee.email,
            phone: employee.phone || '',
            department: employee.department,
            role: employee.role,
            // Ensure admissionDate is parsed correctly, handling potential string format
            admissionDate: employee.admissionDate ? new Date(employee.admissionDate + 'T00:00:00') : new Date(),
            photoUrl: employee.photoUrl || '',
            isActive: employee.isActive,
          });
           setPhotoPreview(employee.photoUrl);
        } else {
           form.reset({
             name: '',
             email: '',
             phone: '',
             department: '',
             role: '',
             admissionDate: new Date(),
             photoUrl: '',
             isActive: true,
           });
           setPhotoPreview(undefined);
        }
     }
  }, [employee, form, isOpen]);


  const onSubmit = async (data: EmployeeFormData) => {
    setIsSaving(true);
    try {
      await onSave(data);
       // Toast is handled in the parent component after successful save
      setIsOpen(false); // Close dialog on success
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
      {/* DialogTrigger is now handled in the parent component (EmployeesPage) */}
      {/* <DialogTrigger asChild>
          {children ? <Slot>{children}</Slot> : <Button {...triggerProps} />}
      </DialogTrigger> */}
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
                      {/* TODO: Substituir por Select/Combobox quando departamentos forem gerenciáveis */}
                      <Input placeholder="Ex: Engenharia" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Função</FormLabel>
                    <FormControl>
                       {/* TODO: Substituir por Select/Combobox quando funções forem gerenciáveis */}
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
                            format(field.value, 'PPP', { locale: ptBR }) // Use ptBR locale
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
                          date > new Date() || date < new Date('1950-01-01') // Adjust range if needed
                        }
                        initialFocus
                        locale={ptBR} // Use ptBR locale
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

             <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                       <FormLabel>Colaborador Ativo</FormLabel>
                     </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        aria-readonly // Useful for screen readers
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
