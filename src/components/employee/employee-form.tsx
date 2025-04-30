'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
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
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import type { Employee } from '@/types/employee';
import { Slot } from '@radix-ui/react-slot'; // Import Slot

const employeeSchema = z.object({
  name: z.string().min(2, { message: 'Nome deve ter pelo menos 2 caracteres.' }),
  email: z.string().email({ message: 'Email inválido.' }),
  phone: z.string().optional(),
  department: z.string().min(1, { message: 'Departamento é obrigatório.' }),
  role: z.string().min(1, { message: 'Função é obrigatória.' }),
  admissionDate: z.date({ required_error: 'Data de admissão é obrigatória.' }),
  photoUrl: z.string().url({ message: 'URL da foto inválida.' }).optional().or(z.literal('')),
  isActive: z.boolean().default(true),
});

type EmployeeFormData = z.infer<typeof employeeSchema>;

interface EmployeeFormProps {
  employee?: Employee | null; // Pass employee data for editing
  onSave: (data: EmployeeFormData) => Promise<void>; // Function to handle save
  children?: React.ReactNode; // Add children prop
  open?: boolean; // Allow controlling open state externally
  onOpenChange?: (open: boolean) => void; // Allow controlling open state externally
}

export function EmployeeForm({
    employee,
    onSave,
    children,
    open: controlledOpen,
    onOpenChange: controlledOnOpenChange
}: EmployeeFormProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [photoPreview, setPhotoPreview] = React.useState<string | undefined>(employee?.photoUrl);
  const { toast } = useToast();

  // Use controlled state if provided, otherwise use internal state
  const isOpen = controlledOpen ?? internalOpen;
  const setIsOpen = controlledOnOpenChange ?? setInternalOpen;


  const form = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      name: employee?.name || '',
      email: employee?.email || '',
      phone: employee?.phone || '',
      department: employee?.department || '',
      role: employee?.role || '',
      admissionDate: employee?.admissionDate ? new Date(employee.admissionDate) : new Date(),
      photoUrl: employee?.photoUrl || '',
      isActive: employee?.isActive ?? true,
    },
  });

   React.useEffect(() => {
     // Only reset if the dialog is opening OR if the employee prop changes while open
    if (isOpen) {
        if (employee) {
          form.reset({
            name: employee.name,
            email: employee.email,
            phone: employee.phone || '',
            department: employee.department,
            role: employee.role,
            admissionDate: new Date(employee.admissionDate),
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
  }, [employee, form, isOpen]); // Dependency includes isOpen


  const onSubmit = async (data: EmployeeFormData) => {
    setIsSaving(true);
    try {
      await onSave(data);
      toast({
        title: 'Sucesso!',
        description: `Colaborador ${employee ? 'atualizado' : 'cadastrado'} com sucesso.`,
      });
      setIsOpen(false); // Close dialog on success
    } catch (error) {
       console.error("Failed to save employee:", error);
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
    form.setValue('photoUrl', url); // Update form value
     // Basic URL validation for preview
    if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
       setPhotoPreview(url);
     } else {
       setPhotoPreview(undefined);
     }
  };

  const getInitials = (name: string) => {
     return name
        ?.split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase() || '??';
   };

  // Determine the trigger component
  const TriggerComponent = children ? Slot : Button;
  const triggerProps = children ? {} : {
      children: employee ? 'Editar' : <><UserPlus className="mr-2 h-4 w-4" />Adicionar Colaborador</>,
      variant: employee ? 'outline' : 'default',
      size: employee ? 'sm' : 'default',
   };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
          {/* Use Slot if children are provided, otherwise Button */}
          {children ? <Slot>{children}</Slot> : <Button {...triggerProps} />}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{employee ? 'Editar Colaborador' : 'Adicionar Novo Colaborador'}</DialogTitle>
          <DialogDescription>
            {employee ? 'Atualize as informações do colaborador.' : 'Preencha os detalhes do novo colaborador.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                        <Input placeholder="https://example.com/photo.jpg" {...field} value={field.value ?? ''} onChange={handlePhotoUrlChange} />
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
                    <Input placeholder="João da Silva" {...field} />
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
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="joao.silva@empresa.com" {...field} />
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
                      <Input type="tel" placeholder="(11) 99999-9999" {...field} value={field.value ?? ''} />
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
                      {/* TODO: Replace with Select component when departments are managed */}
                      <Input placeholder="Engenharia" {...field} />
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
                       {/* TODO: Replace with Select component when roles are managed */}
                      <Input placeholder="Desenvolvedor Frontend" {...field} />
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
                            format(field.value, 'PPP') // 'PPP' -> locale specific date format like 'Sep 21, 2023'
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
                          date > new Date() || date < new Date('1900-01-01')
                        }
                        initialFocus
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
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

            <DialogFooter>
               <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancelar</Button>
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
