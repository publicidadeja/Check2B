
'use client';

import * as React from 'react';
import { User, Edit, Save, Loader2, ShieldCheck, Bell, EyeOff, Eye, Image as ImageIcon } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useToast } from '@/hooks/use-toast';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useForm } from 'react-hook-form';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { format, parseISO } from 'date-fns'; // Added parseISO
import { ptBR } from 'date-fns/locale'; // Added ptBR

// Import types (assuming Employee type exists)
import type { Employee } from '@/types/employee';
import { mockEmployees } from '@/app/employees/page'; // Reuse employee mock data

// Mock Employee ID
const CURRENT_EMPLOYEE_ID = '1'; // Alice Silva

// --- Zod Schemas ---
const profileSchema = z.object({
    name: z.string().min(2, 'Nome muito curto').optional(), // Admins usually edit name
    phone: z.string().optional().or(z.literal('')),
    photoUrl: z.string().url('URL inválida').optional().or(z.literal('')),
    // email: z.string().email().optional(), // Usually non-editable by employee
});

const passwordSchema = z.object({
    currentPassword: z.string().min(6, 'Senha atual muito curta'),
    newPassword: z.string().min(8, 'Nova senha deve ter pelo menos 8 caracteres'),
    confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
    message: "As novas senhas não coincidem",
    path: ["confirmPassword"],
});

const notificationSchema = z.object({
    newEvaluation: z.boolean().default(true),
    challengeUpdates: z.boolean().default(true),
    rankingChanges: z.boolean().default(true),
    systemAnnouncements: z.boolean().default(true),
});

type ProfileFormData = z.infer<typeof profileSchema>;
type PasswordFormData = z.infer<typeof passwordSchema>;
type NotificationFormData = z.infer<typeof notificationSchema>;

// --- Mock API Functions ---
const fetchEmployeeProfile = async (employeeId: string): Promise<Employee> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    const employee = mockEmployees.find(e => e.id === employeeId);
    if (!employee) throw new Error("Colaborador não encontrado.");
    return { ...employee }; // Return a copy
}

const updateEmployeeProfile = async (employeeId: string, data: Partial<ProfileFormData>): Promise<Employee> => {
    await new Promise(resolve => setTimeout(resolve, 800));
    const index = mockEmployees.findIndex(e => e.id === employeeId);
    if (index === -1) throw new Error("Colaborador não encontrado.");
    // Update only allowed fields (phone, photoUrl)
    if (data.phone !== undefined) mockEmployees[index].phone = data.phone;
    if (data.photoUrl !== undefined) mockEmployees[index].photoUrl = data.photoUrl;

    console.log("Perfil atualizado (simulado):", mockEmployees[index]);
    return { ...mockEmployees[index] };
}

const changePassword = async (employeeId: string, data: PasswordFormData): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    // Simulate password change check (in real app, verify currentPassword)
    console.log("Senha alterada (simulado) para colaborador:", employeeId);
    if (data.currentPassword === 'password123') { // Mock failure condition
        throw new Error("Senha atual incorreta.");
    }
    // Success simulation
}

const updateNotificationSettings = async (employeeId: string, data: NotificationFormData): Promise<void> => {
     await new Promise(resolve => setTimeout(resolve, 600));
     // Simulate saving settings
     console.log("Configurações de notificação salvas (simulado):", employeeId, data);
}


// --- Helper Function ---
const getInitials = (name: string) => {
    return name
        ?.split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase() || '??';
};

export default function EmployeeProfilePage() {
    const [employee, setEmployee] = React.useState<Employee | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);
    const [isEditingProfile, setIsEditingProfile] = React.useState(false);
    const [isSavingProfile, setIsSavingProfile] = React.useState(false);
    const [isChangingPassword, setIsChangingPassword] = React.useState(false);
    const [isSavingNotifications, setIsSavingNotifications] = React.useState(false);
    const [showCurrentPassword, setShowCurrentPassword] = React.useState(false);
    const [showNewPassword, setShowNewPassword] = React.useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);

    const { toast } = useToast();

    // Forms
    const profileForm = useForm<ProfileFormData>({ resolver: zodResolver(profileSchema) });
    const passwordForm = useForm<PasswordFormData>({ resolver: zodResolver(passwordSchema) });
    const notificationForm = useForm<NotificationFormData>({ resolver: zodResolver(notificationSchema) });

    // Fetch Profile Data
    React.useEffect(() => {
        const loadProfile = async () => {
            setIsLoading(true);
            try {
                const data = await fetchEmployeeProfile(CURRENT_EMPLOYEE_ID);
                setEmployee(data);
                profileForm.reset({
                    name: data.name, // Display name, but might not be editable
                    phone: data.phone || '',
                    photoUrl: data.photoUrl || '',
                });
                // TODO: Fetch and set notification preferences
                 notificationForm.reset({
                    newEvaluation: true, // Default/fetched value
                    challengeUpdates: true,
                    rankingChanges: true,
                    systemAnnouncements: true,
                 });
            } catch (error) {
                console.error("Erro ao carregar perfil:", error);
                toast({ title: "Erro", description: "Não foi possível carregar seu perfil.", variant: "destructive" });
            } finally {
                setIsLoading(false);
            }
        };
        loadProfile();
    }, [profileForm, notificationForm, toast]);


    // Handle Profile Save
    const onProfileSubmit = async (data: ProfileFormData) => {
        setIsSavingProfile(true);
        try {
             const updatedProfile = await updateEmployeeProfile(CURRENT_EMPLOYEE_ID, { phone: data.phone, photoUrl: data.photoUrl });
             setEmployee(updatedProfile); // Update local state with returned data
             profileForm.reset(updatedProfile); // Reset form with updated data
             toast({ title: "Sucesso!", description: "Seu perfil foi atualizado." });
             setIsEditingProfile(false);
        } catch (error) {
             console.error("Erro ao atualizar perfil:", error);
             toast({ title: "Erro", description: "Não foi possível atualizar seu perfil.", variant: "destructive" });
        } finally {
            setIsSavingProfile(false);
        }
    };

    // Handle Password Change
    const onPasswordSubmit = async (data: PasswordFormData) => {
         setIsChangingPassword(true);
         try {
            await changePassword(CURRENT_EMPLOYEE_ID, data);
            toast({ title: "Sucesso!", description: "Sua senha foi alterada." });
            passwordForm.reset({ currentPassword: '', newPassword: '', confirmPassword: '' }); // Clear form
         } catch (error: any) {
            console.error("Erro ao alterar senha:", error);
             toast({ title: "Erro", description: error.message || "Não foi possível alterar sua senha.", variant: "destructive" });
         } finally {
             setIsChangingPassword(false);
         }
    };

    // Handle Notification Save
    const onNotificationSubmit = async (data: NotificationFormData) => {
        setIsSavingNotifications(true);
        try {
             await updateNotificationSettings(CURRENT_EMPLOYEE_ID, data);
             toast({ title: "Sucesso!", description: "Preferências de notificação salvas." });
             // No need to reset form usually for switches unless fetching new state
        } catch (error) {
             console.error("Erro ao salvar notificações:", error);
             toast({ title: "Erro", description: "Não foi possível salvar suas preferências.", variant: "destructive" });
        } finally {
            setIsSavingNotifications(false);
        }
    };

    if (isLoading) {
        return <div className="flex justify-center items-center h-full py-20"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div>;
    }

    if (!employee) {
        return <div className="text-center text-muted-foreground py-20">Erro ao carregar perfil.</div>;
    }

    return (
        <div className="space-y-6">
             <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
                <User className="h-6 w-6 sm:h-7 sm:w-7" /> Meu Perfil
            </h1>

            {/* Profile Info Card */}
            <Card>
                 <Form {...profileForm}>
                    <form onSubmit={profileForm.handleSubmit(onProfileSubmit)}>
                        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                            <div>
                                <CardTitle className="text-xl flex items-center gap-2">Informações Pessoais</CardTitle>
                                <CardDescription>Seus dados de perfil e contato.</CardDescription>
                            </div>
                            {!isEditingProfile ? (
                                <Button type="button" variant="outline" size="sm" onClick={() => setIsEditingProfile(true)} className="self-end sm:self-auto">
                                    <Edit className="mr-2 h-4 w-4" /> Editar
                                </Button>
                             ) : (
                                <div className="flex gap-2 self-end sm:self-auto">
                                     <Button type="button" variant="ghost" size="sm" onClick={() => { setIsEditingProfile(false); profileForm.reset({ name: employee.name, phone: employee.phone || '', photoUrl: employee.photoUrl || '' }); }}>Cancelar</Button>
                                     <Button type="submit" size="sm" disabled={isSavingProfile}>
                                        {isSavingProfile && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Salvar
                                    </Button>
                                </div>
                            )}
                        </CardHeader>
                        <CardContent className="space-y-4">
                             <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4">
                                <Avatar className="h-20 w-20 sm:h-24 sm:w-24">
                                    <AvatarImage src={profileForm.watch('photoUrl') || employee.photoUrl} alt={employee.name} />
                                    <AvatarFallback className="text-3xl">{getInitials(employee.name)}</AvatarFallback>
                                </Avatar>
                                <div className="w-full sm:flex-1 space-y-2">
                                     <FormField
                                        control={profileForm.control}
                                        name="photoUrl"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>URL da Foto</FormLabel>
                                                <FormControl>
                                                     <Input placeholder="https://..." {...field} readOnly={!isEditingProfile} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                        />
                                 </div>
                            </div>
                             <Separator className="my-4" />
                             {/* Read Only Fields */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label>Nome</Label>
                                    <Input value={employee.name} readOnly disabled className="bg-muted/50"/>
                                </div>
                                <div>
                                    <Label>Email Corporativo</Label>
                                    <Input id="email" value={employee.email} readOnly disabled className="bg-muted/50"/>
                                </div>
                                <FormField
                                    control={profileForm.control}
                                    name="phone"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Telefone</FormLabel>
                                            <FormControl>
                                                 <Input type="tel" placeholder="(XX) XXXXX-XXXX" {...field} readOnly={!isEditingProfile} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <div>
                                    <Label>Departamento</Label>
                                    <Input value={employee.department} readOnly disabled className="bg-muted/50"/>
                                </div>
                                <div>
                                    <Label>Função</Label>
                                    <Input value={employee.role} readOnly disabled className="bg-muted/50"/>
                                </div>
                                <div>
                                    <Label>Data de Admissão</Label>
                                    <Input value={format(parseISO(employee.admissionDate + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR })} readOnly disabled className="bg-muted/50"/>
                                </div>
                            </div>
                        </CardContent>
                    </form>
                 </Form>
            </Card>

            {/* Password Change Card */}
            <Card>
                 <Form {...passwordForm}>
                    <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}>
                        <CardHeader>
                            <CardTitle className="text-xl flex items-center gap-2"><ShieldCheck className="h-5 w-5" /> Alterar Senha</CardTitle>
                            <CardDescription>Mantenha sua conta segura.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <FormField
                                control={passwordForm.control}
                                name="currentPassword"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Senha Atual</FormLabel>
                                         <FormControl>
                                             <div className="relative">
                                                 <Input type={showCurrentPassword ? 'text' : 'password'} placeholder="********" {...field} />
                                                 <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1 h-7 w-7" onClick={() => setShowCurrentPassword(!showCurrentPassword)}>
                                                     {showCurrentPassword ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}
                                                     <span className="sr-only">{showCurrentPassword ? 'Ocultar' : 'Mostrar'} senha</span>
                                                 </Button>
                                             </div>
                                         </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <FormField
                                control={passwordForm.control}
                                name="newPassword"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Nova Senha</FormLabel>
                                         <FormControl>
                                             <div className="relative">
                                                 <Input type={showNewPassword ? 'text' : 'password'} placeholder="Pelo menos 8 caracteres" {...field} />
                                                 <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1 h-7 w-7" onClick={() => setShowNewPassword(!showNewPassword)}>
                                                     {showNewPassword ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}
                                                      <span className="sr-only">{showNewPassword ? 'Ocultar' : 'Mostrar'} senha</span>
                                                 </Button>
                                             </div>
                                         </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={passwordForm.control}
                                name="confirmPassword"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Confirmar Nova Senha</FormLabel>
                                         <FormControl>
                                             <div className="relative">
                                                <Input type={showConfirmPassword ? 'text' : 'password'} placeholder="Repita a nova senha" {...field} />
                                                <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1 h-7 w-7" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                                                    {showConfirmPassword ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}
                                                    <span className="sr-only">{showConfirmPassword ? 'Ocultar' : 'Mostrar'} senha</span>
                                                </Button>
                                             </div>
                                         </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </CardContent>
                        <CardFooter>
                             <Button type="submit" disabled={isChangingPassword}>
                                {isChangingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Alterar Senha
                            </Button>
                        </CardFooter>
                    </form>
                 </Form>
            </Card>

             {/* Notification Settings Card */}
             <Card>
                 <Form {...notificationForm}>
                     <form onSubmit={notificationForm.handleSubmit(onNotificationSubmit)}>
                        <CardHeader>
                            <CardTitle className="text-xl flex items-center gap-2"><Bell className="h-5 w-5" /> Preferências de Notificação</CardTitle>
                            <CardDescription>Escolha quais notificações push você deseja receber.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                             <FormField
                                control={notificationForm.control}
                                name="newEvaluation"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                        <FormLabel className="font-normal">Receber notificação de novas avaliações</FormLabel>
                                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={notificationForm.control}
                                name="challengeUpdates"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                        <FormLabel className="font-normal">Receber notificações sobre desafios (novos, prazos)</FormLabel>
                                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                    </FormItem>
                                )}
                             />
                             <FormField
                                control={notificationForm.control}
                                name="rankingChanges"
                                render={({ field }) => (
                                     <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                        <FormLabel className="font-normal">Receber notificações sobre mudanças no ranking</FormLabel>
                                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={notificationForm.control}
                                name="systemAnnouncements"
                                render={({ field }) => (
                                     <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                        <FormLabel className="font-normal">Receber anúncios importantes do sistema</FormLabel>
                                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                    </FormItem>
                                )}
                            />
                        </CardContent>
                        <CardFooter>
                             <Button type="submit" disabled={isSavingNotifications}>
                                {isSavingNotifications && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Salvar Preferências
                            </Button>
                        </CardFooter>
                    </form>
                 </Form>
            </Card>
        </div>
    );
}
