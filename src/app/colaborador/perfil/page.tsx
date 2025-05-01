 'use client';

 import * as React from 'react';
 import { User, Edit, Save, Loader2, ShieldCheck, Bell, EyeOff, Eye, Image as ImageIcon, Camera, LogOut, Settings } from 'lucide-react'; // Added Camera, Logout, Settings
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
 import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
 import { format, parseISO } from 'date-fns';
 import { ptBR } from 'date-fns/locale';
 import { useRouter } from 'next/navigation'; // Import useRouter for logout redirect
 import { logoutUser } from '@/lib/auth'; // Import logout function

 // Import types
 import type { Employee } from '@/types/employee';
 import { mockEmployees } from '@/app/employees/page';

 // Mock Employee ID
 const CURRENT_EMPLOYEE_ID = '1'; // Alice Silva

 // --- Zod Schemas ---
 const profileSchema = z.object({
     // name: z.string().min(2, 'Nome muito curto').optional(), // Admins usually edit name
     phone: z.string().optional().or(z.literal('')),
     photoUrl: z.string().url('URL inválida').optional().or(z.literal('')),
     // photoFile: z.instanceof(File).optional(), // For file upload (handled separately)
 });

 const passwordSchema = z.object({
     currentPassword: z.string().min(1, 'Senha atual é obrigatória'), // Changed min to 1 as validation happens on submit
     newPassword: z.string().min(8, 'Nova senha deve ter pelo menos 8 caracteres'),
     confirmPassword: z.string(),
 }).refine(data => data.newPassword === data.confirmPassword, {
     message: "As novas senhas não coincidem",
     path: ["confirmPassword"],
 });

 const notificationSchema = z.object({
     newEvaluation: z.boolean().default(true),
     challengeUpdates: z.boolean().default(true),
     rankingChanges: z.boolean().default(false), // Default off for ranking
     systemAnnouncements: z.boolean().default(true),
 });

 type ProfileFormData = z.infer<typeof profileSchema>;
 type PasswordFormData = z.infer<typeof passwordSchema>;
 type NotificationFormData = z.infer<typeof notificationSchema>;

 // --- Mock API Functions ---
 const fetchEmployeeProfile = async (employeeId: string): Promise<Employee> => {
     await new Promise(resolve => setTimeout(resolve, 400)); // Shorter delay
     const employee = mockEmployees.find(e => e.id === employeeId);
     if (!employee) throw new Error("Colaborador não encontrado.");
     return { ...employee }; // Return a copy
 }

 const updateEmployeeProfile = async (employeeId: string, data: Partial<ProfileFormData & { photoFile?: File }>): Promise<Employee> => {
     await new Promise(resolve => setTimeout(resolve, 600));
     const index = mockEmployees.findIndex(e => e.id === employeeId);
     if (index === -1) throw new Error("Colaborador não encontrado.");

     if (data.phone !== undefined) mockEmployees[index].phone = data.phone;

     if (data.photoFile) {
         mockEmployees[index].photoUrl = `https://picsum.photos/seed/${employeeId}${Date.now()}/100/100`; // New mock URL
         console.log("Simulating photo upload for file:", data.photoFile.name);
     } else if (data.photoUrl !== undefined) {
         // Only update URL if file wasn't provided and URL field has changed
         mockEmployees[index].photoUrl = data.photoUrl;
     }


     console.log("Perfil atualizado (simulado):", mockEmployees[index]);
     return { ...mockEmployees[index] };
 }


 const changePassword = async (employeeId: string, data: PasswordFormData): Promise<void> => {
     await new Promise(resolve => setTimeout(resolve, 800));
     console.log("Senha alterada (simulado) para colaborador:", employeeId);
      // Simulate incorrect password
     if (data.currentPassword === 'senhaerrada') {
         throw new Error("Senha atual incorreta.");
     }
     // Simulate success otherwise
 }

 const updateNotificationSettings = async (employeeId: string, data: NotificationFormData): Promise<void> => {
      await new Promise(resolve => setTimeout(resolve, 500));
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
     const router = useRouter();
     const [employee, setEmployee] = React.useState<Employee | null>(null);
     const [isLoading, setIsLoading] = React.useState(true);
     const [isEditingProfile, setIsEditingProfile] = React.useState(false);
     const [isSavingProfile, setIsSavingProfile] = React.useState(false);
     const [isChangingPassword, setIsChangingPassword] = React.useState(false);
     const [isSavingNotifications, setIsSavingNotifications] = React.useState(false);
     const [showCurrentPassword, setShowCurrentPassword] = React.useState(false);
     const [showNewPassword, setShowNewPassword] = React.useState(false);
     const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
     const [photoPreview, setPhotoPreview] = React.useState<string | undefined>(); // For file preview
     const [selectedFile, setSelectedFile] = React.useState<File | null>(null); // Store the selected file
     const fileInputRef = React.useRef<HTMLInputElement>(null); // Ref for file input

     const { toast } = useToast();

     // Forms
     const profileForm = useForm<ProfileFormData>({ resolver: zodResolver(profileSchema) });
     const passwordForm = useForm<PasswordFormData>({ resolver: zodResolver(passwordSchema) });
     const notificationForm = useForm<NotificationFormData>({ resolver: zodResolver(notificationSchema), defaultValues: {
             newEvaluation: true, challengeUpdates: true, rankingChanges: false, systemAnnouncements: true,
     }});

     // Fetch Profile Data
     React.useEffect(() => {
         const loadProfile = async () => {
             setIsLoading(true);
             try {
                 // Simulate guest mode or fetch based on actual auth state
                 const isGuest = false; // Replace with actual check
                 if (!isGuest) {
                     const data = await fetchEmployeeProfile(CURRENT_EMPLOYEE_ID);
                     setEmployee(data);
                     profileForm.reset({
                         // name: data.name, // Name not editable by user
                         phone: data.phone || '',
                         photoUrl: data.photoUrl || '',
                     });
                     setPhotoPreview(data.photoUrl);
                     // Load notification prefs (mocked)
                     notificationForm.reset({
                         newEvaluation: true, challengeUpdates: true, rankingChanges: false, systemAnnouncements: true,
                      });
                 } else {
                     // Handle guest view if needed (e.g., show generic profile)
                      setEmployee({ // Example guest data
                         id: 'guest', name: 'Convidado', email: '', department: '', role: 'Colaborador', admissionDate: format(new Date(), 'yyyy-MM-dd'), isActive: true
                     });
                     setPhotoPreview(undefined);
                     notificationForm.reset(); // Reset to defaults
                 }
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
              const updatedProfile = await updateEmployeeProfile(CURRENT_EMPLOYEE_ID, {
                  phone: data.phone,
                  photoUrl: data.photoUrl,
                  photoFile: selectedFile // Pass the file state here
              });
              setEmployee(updatedProfile);
              profileForm.reset({
                  phone: updatedProfile.phone || '',
                  photoUrl: updatedProfile.photoUrl || '',
              });
              setPhotoPreview(updatedProfile.photoUrl);
              setSelectedFile(null); // Clear file state after successful save
              if (fileInputRef.current) fileInputRef.current.value = ''; // Clear file input visually
              toast({ title: "Sucesso!", description: "Seu perfil foi atualizado." });
              setIsEditingProfile(false);
         } catch (error) {
              console.error("Erro ao atualizar perfil:", error);
              toast({ title: "Erro", description: "Não foi possível atualizar seu perfil.", variant: "destructive" });
         } finally {
             setIsSavingProfile(false);
         }
     };

      // Handle Photo File Change
     const handlePhotoFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            // Validate file type/size if needed
            if (file.size > 5 * 1024 * 1024) { // 5MB limit example
                toast({ title: "Arquivo Grande", description: "A foto não pode exceder 5MB.", variant: "destructive" });
                return;
            }
            setSelectedFile(file); // Store the file object
            profileForm.setValue('photoUrl', ''); // Clear URL field if file is selected
            // Create a temporary URL for preview
            const reader = new FileReader();
            reader.onloadend = () => {
                setPhotoPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        } else {
            setSelectedFile(null);
            // Revert preview to original URL if file is deselected
            setPhotoPreview(employee?.photoUrl);
        }
     };

    // Handle Cancel Edit Profile
    const cancelEditProfile = () => {
        setIsEditingProfile(false);
        profileForm.reset({
            phone: employee?.phone || '',
            photoUrl: employee?.photoUrl || '',
        });
        setPhotoPreview(employee?.photoUrl);
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };


     // Handle Password Change
     const onPasswordSubmit = async (data: PasswordFormData) => {
          setIsChangingPassword(true);
          try {
             await changePassword(CURRENT_EMPLOYEE_ID, data);
             toast({ title: "Sucesso!", description: "Sua senha foi alterada com sucesso." });
             passwordForm.reset({ currentPassword: '', newPassword: '', confirmPassword: '' });
              // Reset visibility toggles
             setShowCurrentPassword(false);
             setShowNewPassword(false);
             setShowConfirmPassword(false);
          } catch (error: any) {
             console.error("Erro ao alterar senha:", error);
              toast({ title: "Erro", description: error.message || "Não foi possível alterar sua senha.", variant: "destructive" });
              // Optionally clear only the incorrect field: passwordForm.resetField('currentPassword');
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
              notificationForm.reset(data); // Keep saved values
         } catch (error) {
              console.error("Erro ao salvar notificações:", error);
              toast({ title: "Erro", description: "Não foi possível salvar as preferências.", variant: "destructive" });
         } finally {
             setIsSavingNotifications(false);
         }
     };

       // Handle Logout
      const handleLogout = async () => {
        try {
            await logoutUser();
            toast({ title: "Logout", description: "Você saiu com sucesso." });
            router.push('/login'); // Redirect to login
        } catch (error) {
            console.error("Erro ao fazer logout:", error);
            toast({ title: "Erro", description: "Falha ao fazer logout.", variant: "destructive" });
        }
      };


     if (isLoading) {
         return <div className="flex justify-center items-center h-full py-20"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
     }

     if (!employee) {
         return <div className="text-center text-muted-foreground py-20">Erro ao carregar perfil.</div>;
     }

      // Check if guest mode (replace with actual check if implemented differently)
      const isGuest = employee.id === 'guest';

     return (
         <div className="space-y-4">
             {/* --- Profile Info Card --- */}
             <Card className="shadow-sm">
                  <Form {...profileForm}>
                     <form onSubmit={profileForm.handleSubmit(onProfileSubmit)}>
                         <CardHeader className="flex flex-row items-start justify-between gap-2 p-4">
                             <div>
                                 <CardTitle className="text-lg flex items-center gap-2"><User className="h-5 w-5" /> Suas Informações</CardTitle>
                                 {!isGuest && <CardDescription className='text-xs'>Visualize e edite seus dados.</CardDescription>}
                                 {isGuest && <CardDescription className='text-xs'>Você está no modo convidado.</CardDescription>}
                             </div>
                             {!isGuest && !isEditingProfile && (
                                 <Button type="button" variant="ghost" size="sm" onClick={() => setIsEditingProfile(true)} className="text-xs flex-shrink-0 h-7 px-2">
                                     <Edit className="mr-1 h-3 w-3" /> Editar
                                 </Button>
                              )}
                              {!isGuest && isEditingProfile && (
                                 <div className="flex gap-1 flex-shrink-0">
                                      <Button type="button" variant="ghost" size="sm" onClick={cancelEditProfile} className="text-xs h-7 px-2">Cancelar</Button>
                                      <Button type="submit" size="sm" disabled={isSavingProfile} className="text-xs h-7 px-2">
                                         {isSavingProfile ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Save className="mr-1 h-3 w-3" />}
                                         Salvar
                                     </Button>
                                 </div>
                             )}
                         </CardHeader>
                         <CardContent className="space-y-4 p-4 pt-0">
                              {/* Avatar and Photo Upload */}
                              <div className="flex flex-col sm:flex-row items-center gap-4">
                                 <div className="relative group flex-shrink-0">
                                     <Avatar className="h-24 w-24 border">
                                         <AvatarImage src={photoPreview || employee.photoUrl} alt={employee.name} />
                                         <AvatarFallback className="text-3xl">{getInitials(employee.name)}</AvatarFallback>
                                     </Avatar>
                                     {isEditingProfile && (
                                         <Button
                                            type="button"
                                            variant="outline"
                                            size="icon"
                                            className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-background border-primary text-primary hover:bg-primary/10"
                                            onClick={() => fileInputRef.current?.click()}
                                            title="Alterar Foto"
                                         >
                                             <Camera className="h-4 w-4" />
                                             <span className="sr-only">Alterar foto</span>
                                         </Button>
                                     )}
                                     <Input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/png, image/jpeg, image/webp"
                                        className="hidden"
                                        onChange={handlePhotoFileChange}
                                        disabled={!isEditingProfile}
                                     />
                                 </div>
                                  {/* Fields Section */}
                                 <div className='w-full space-y-2 text-sm'>
                                     {/* Read Only Name/Email */}
                                     <div className="space-y-1">
                                        <Label className="text-xs text-muted-foreground">Nome</Label>
                                        <p className="font-medium">{employee.name}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs text-muted-foreground">Email</Label>
                                        <p className="font-medium break-all">{employee.email}</p>
                                    </div>
                                     {/* Editable Phone */}
                                     <FormField
                                         control={profileForm.control}
                                         name="phone"
                                         render={({ field }) => (
                                             <FormItem>
                                                 <FormLabel className="text-xs">Telefone</FormLabel>
                                                 <FormControl>
                                                    <Input className={`h-8 text-sm ${!isEditingProfile ? 'border-none px-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent pointer-events-none' : ''}`} type="tel" placeholder="Não informado" {...field} readOnly={!isEditingProfile || isGuest} value={field.value ?? ''} />
                                                 </FormControl>
                                                 <FormMessage className="text-xs"/>
                                             </FormItem>
                                         )}
                                     />
                                      {/* Optional Photo URL Input (Only visible when editing) */}
                                     {isEditingProfile && (
                                         <FormField
                                             control={profileForm.control}
                                             name="photoUrl"
                                             render={({ field }) => (
                                                 <FormItem>
                                                     <FormLabel className="text-xs">URL da Foto (Alternativa)</FormLabel>
                                                     <FormControl>
                                                         <Input className="h-8 text-xs" placeholder="https://..." {...field} value={field.value ?? ''} onChange={handlePhotoUrlChange} />
                                                     </FormControl>
                                                     <FormMessage className="text-xs" />
                                                 </FormItem>
                                             )}
                                          />
                                     )}
                                 </div>
                             </div>
                              {/* Read Only Department/Role/Admission */}
                              <Separator className="my-3" />
                             <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-2 text-sm">
                                 <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">Departamento</Label>
                                    <p className="font-medium">{employee.department || '-'}</p>
                                 </div>
                                 <div className="space-y-1">
                                     <Label className="text-xs text-muted-foreground">Função</Label>
                                     <p className="font-medium">{employee.role || '-'}</p>
                                 </div>
                                  <div className="space-y-1">
                                     <Label className="text-xs text-muted-foreground">Data de Admissão</Label>
                                     <p className="font-medium">
                                         {employee.admissionDate && !isGuest ? format(parseISO(employee.admissionDate + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR }) : '-'}
                                     </p>
                                 </div>
                             </div>
                         </CardContent>
                     </form>
                  </Form>
             </Card>

             {/* --- Password Change Card --- */}
             {!isGuest && (
                 <Card className="shadow-sm">
                      <Form {...passwordForm}>
                         <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}>
                             <CardHeader className="p-4 pb-2">
                                 <CardTitle className="text-lg flex items-center gap-2"><ShieldCheck className="h-5 w-5" /> Alterar Senha</CardTitle>
                             </CardHeader>
                             <CardContent className="space-y-3 p-4 pt-0">
                                 <FormField
                                     control={passwordForm.control}
                                     name="currentPassword"
                                     render={({ field }) => (
                                         <FormItem>
                                             <FormLabel className="text-xs">Senha Atual</FormLabel>
                                              <FormControl>
                                                  <div className="relative">
                                                      <Input className="h-9 text-sm" type={showCurrentPassword ? 'text' : 'password'} placeholder="********" {...field} />
                                                      <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => setShowCurrentPassword(!showCurrentPassword)}>
                                                          {showCurrentPassword ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}
                                                          <span className="sr-only">{showCurrentPassword ? 'Ocultar' : 'Mostrar'}</span>
                                                      </Button>
                                                  </div>
                                              </FormControl>
                                             <FormMessage className="text-xs"/>
                                         </FormItem>
                                     )}
                                 />
                                  <FormField
                                     control={passwordForm.control}
                                     name="newPassword"
                                     render={({ field }) => (
                                         <FormItem>
                                             <FormLabel className="text-xs">Nova Senha</FormLabel>
                                              <FormControl>
                                                  <div className="relative">
                                                      <Input className="h-9 text-sm" type={showNewPassword ? 'text' : 'password'} placeholder="Min. 8 caracteres" {...field} />
                                                      <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => setShowNewPassword(!showNewPassword)}>
                                                          {showNewPassword ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}
                                                          <span className="sr-only">{showNewPassword ? 'Ocultar' : 'Mostrar'}</span>
                                                      </Button>
                                                  </div>
                                              </FormControl>
                                             <FormMessage className="text-xs"/>
                                         </FormItem>
                                     )}
                                 />
                                 <FormField
                                     control={passwordForm.control}
                                     name="confirmPassword"
                                     render={({ field }) => (
                                         <FormItem>
                                             <FormLabel className="text-xs">Confirmar Nova Senha</FormLabel>
                                              <FormControl>
                                                  <div className="relative">
                                                     <Input className="h-9 text-sm" type={showConfirmPassword ? 'text' : 'password'} placeholder="Repita a nova senha" {...field} />
                                                     <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                                                         {showConfirmPassword ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}
                                                         <span className="sr-only">{showConfirmPassword ? 'Ocultar' : 'Mostrar'}</span>
                                                     </Button>
                                                  </div>
                                              </FormControl>
                                             <FormMessage className="text-xs"/>
                                         </FormItem>
                                     )}
                                 />
                             </CardContent>
                             <CardFooter className="p-4 pt-0">
                                  <Button type="submit" disabled={isChangingPassword} className="w-full">
                                     {isChangingPassword ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                                     {isChangingPassword ? 'Alterando...' : 'Alterar Senha'}
                                 </Button>
                             </CardFooter>
                         </form>
                      </Form>
                 </Card>
             )}

              {/* --- Notification Settings Card --- */}
              {!isGuest && (
                  <Card className="shadow-sm">
                      <Form {...notificationForm}>
                          <form onSubmit={notificationForm.handleSubmit(onNotificationSubmit)}>
                             <CardHeader className="p-4 pb-2">
                                 <CardTitle className="text-lg flex items-center gap-2"><Bell className="h-5 w-5" /> Notificações</CardTitle>
                                 <CardDescription className='text-xs'>Gerencie como você recebe alertas.</CardDescription>
                             </CardHeader>
                             <CardContent className="space-y-3 p-4 pt-0">
                                 <FormField control={notificationForm.control} name="newEvaluation" render={({ field }) => (
                                     <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                         <FormLabel className="font-normal text-xs leading-tight pr-2">Receber notificação de novas avaliações</FormLabel>
                                         <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                     </FormItem>
                                 )}/>
                                 <FormField control={notificationForm.control} name="challengeUpdates" render={({ field }) => (
                                     <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                         <FormLabel className="font-normal text-xs leading-tight pr-2">Notificações sobre desafios (novos, prazos)</FormLabel>
                                         <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                     </FormItem>
                                 )}/>
                                  <FormField control={notificationForm.control} name="rankingChanges" render={({ field }) => (
                                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                         <FormLabel className="font-normal text-xs leading-tight pr-2">Notificações sobre mudanças no ranking</FormLabel>
                                         <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                     </FormItem>
                                 )}/>
                                 <FormField control={notificationForm.control} name="systemAnnouncements" render={({ field }) => (
                                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                         <FormLabel className="font-normal text-xs leading-tight pr-2">Anúncios importantes do sistema</FormLabel>
                                         <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                     </FormItem>
                                 )}/>
                             </CardContent>
                             <CardFooter className="p-4 pt-0">
                                  <Button type="submit" disabled={isSavingNotifications || !notificationForm.formState.isDirty} className="w-full">
                                     {isSavingNotifications ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                     {isSavingNotifications ? 'Salvando...' : 'Salvar Preferências'}
                                 </Button>
                             </CardFooter>
                         </form>
                      </Form>
                  </Card>
               )}

             {/* --- Logout Button --- */}
             {!isGuest && (
                 <div className="mt-6">
                      <Button variant="destructive" className="w-full" onClick={handleLogout}>
                         <LogOut className="mr-2 h-4 w-4" /> Sair da Conta
                     </Button>
                 </div>
             )}

             {/* --- Login Button for Guest --- */}
             {isGuest && (
                 <div className="mt-6">
                     <Button variant="default" className="w-full" onClick={() => router.push('/login')}>
                         Fazer Login
                     </Button>
                 </div>
             )}
         </div>
     );
 }
