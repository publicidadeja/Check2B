
 'use client';

 import * as React from 'react';
 import { User, Edit, Save, Loader2, ShieldCheck, Bell, EyeOff, Eye, Image as ImageIcon, Camera, LogOut, Settings, CheckCircle } from 'lucide-react'; // Added CheckCircle
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
 import { logoutUser, changePassword as changeUserPassword, updateProfile as updateUserProfile } from '@/lib/auth'; // Import auth functions
 import { updateNotificationSettings as updateNotifSettings, requestBrowserNotificationPermission } from '@/lib/notifications'; // Import notification functions

 // Import types
 import type { UserProfile } from '@/types/user'; // Use UserProfile for broader compatibility
 import { getUserProfileData } from '@/lib/user-service'; // Function to fetch profile data
 import { useAuth } from '@/hooks/use-auth'; // Use auth hook to get current user ID
 import { LoadingSpinner } from '@/components/ui/loading-spinner'; // Import LoadingSpinner

 // --- Zod Schemas ---
 const profileSchema = z.object({
     phone: z.string().optional().or(z.literal('')),
     photoUrl: z.string().url('URL inválida').optional().or(z.literal('')),
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
     browserNotifications: z.boolean().default(false), // Add setting for browser notifications
 });

 type ProfileFormData = z.infer<typeof profileSchema>;
 type PasswordFormData = z.infer<typeof passwordSchema>;
 type NotificationFormData = z.infer<typeof notificationSchema>;

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
     const { user: authUser, isGuest } = useAuth(); // Get auth state
     const currentUserId = authUser?.uid; // Get current user ID from auth context
     const [employee, setEmployee] = React.useState<UserProfile | null>(null);
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
     const [browserNotificationPermission, setBrowserNotificationPermission] = React.useState<NotificationPermission | null>(null);

     const { toast } = useToast();

     // Forms
     const profileForm = useForm<ProfileFormData>({ resolver: zodResolver(profileSchema) });
     const passwordForm = useForm<PasswordFormData>({ resolver: zodResolver(passwordSchema) });
     const notificationForm = useForm<NotificationFormData>({ resolver: zodResolver(notificationSchema), defaultValues: {
             newEvaluation: true, challengeUpdates: true, rankingChanges: false, systemAnnouncements: true, browserNotifications: false, // Default browser off
     }});

     // Fetch Profile Data & Notification Permission
     React.useEffect(() => {
         const loadProfileAndPermissions = async () => {
             setIsLoading(true);
             // Check browser notification permission
             if (typeof window !== 'undefined' && "Notification" in window) {
                 setBrowserNotificationPermission(Notification.permission);
                 notificationForm.setValue('browserNotifications', Notification.permission === 'granted');
             }

             if (isGuest) {
                 // Handle guest view (basic placeholder)
                 setEmployee({
                     uid: 'guest', name: 'Convidado', email: '', role: 'collaborator', organizationId: 'org_default', createdAt: new Date(), status: 'active', isActive: true
                 });
                 setPhotoPreview(undefined);
                 notificationForm.reset(); // Reset to defaults
                 setIsLoading(false);
                 return;
             }

             if (!currentUserId) {
                 console.error("Erro: ID do usuário não encontrado para carregar perfil.");
                 toast({ title: "Erro", description: "Não foi possível identificar o usuário.", variant: "destructive" });
                 setIsLoading(false);
                 // Optionally redirect to login
                 // router.push('/login?reason=no_user_id');
                 return;
             }

             try {
                 const data = await getUserProfileData(currentUserId); // Fetch real data
                 if (data) {
                     setEmployee(data);
                     profileForm.reset({
                         phone: data.phone || '',
                         photoUrl: data.photoUrl || '',
                     });
                     setPhotoPreview(data.photoUrl);
                     // Load saved notification prefs (replace with actual fetch if implemented)
                     notificationForm.reset({
                         newEvaluation: true, // Example default, replace with fetched
                         challengeUpdates: true, // Example default, replace with fetched
                         rankingChanges: false, // Example default, replace with fetched
                         systemAnnouncements: true, // Example default, replace with fetched
                         browserNotifications: Notification.permission === 'granted',
                      });
                 } else {
                      console.error("Perfil não encontrado para o usuário logado:", currentUserId);
                      toast({ title: "Erro", description: "Não foi possível encontrar seu perfil.", variant: "destructive" });
                      // Maybe redirect or show an error state
                 }
             } catch (error) {
                 console.error("Erro ao carregar perfil:", error);
                 toast({ title: "Erro", description: "Não foi possível carregar seu perfil.", variant: "destructive" });
             } finally {
                 setIsLoading(false);
             }
         };
         loadProfileAndPermissions();
     }, [profileForm, notificationForm, toast, isGuest, currentUserId, router]); // Add dependencies


     // Handle Profile Save
     const onProfileSubmit = async (data: ProfileFormData) => {
          if (!currentUserId || isGuest) return; // Prevent saving if guest or no ID

         setIsSavingProfile(true);
         try {
              // Use the imported updateUserProfile function from auth.ts
              const updatedProfile = await updateUserProfile(currentUserId, {
                  phone: data.phone,
                  photoUrl: selectedFile ? undefined : data.photoUrl, // Don't send URL if file is present
                  photoFile: selectedFile // Pass the file state here
              });

              setEmployee(updatedProfile); // Update local state with the result from the server
              profileForm.reset({
                  phone: updatedProfile.phone || '',
                  photoUrl: updatedProfile.photoUrl || '',
              });
              setPhotoPreview(updatedProfile.photoUrl);
              setSelectedFile(null);
              if (fileInputRef.current) fileInputRef.current.value = '';
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
            if (file.size > 5 * 1024 * 1024) { // 5MB limit example
                toast({ title: "Arquivo Grande", description: "A foto não pode exceder 5MB.", variant: "destructive" });
                return;
            }
            setSelectedFile(file);
            profileForm.setValue('photoUrl', ''); // Clear URL field
            const reader = new FileReader();
            reader.onloadend = () => {
                setPhotoPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        } else {
            setSelectedFile(null);
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

     const handlePhotoUrlChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const url = event.target.value;
        profileForm.setValue('photoUrl', url);
        if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
            setPhotoPreview(url);
            setSelectedFile(null);
             if (fileInputRef.current) fileInputRef.current.value = '';
        } else {
            setPhotoPreview(employee?.photoUrl);
        }
    };


     // Handle Password Change
     const onPasswordSubmit = async (data: PasswordFormData) => {
          if (!currentUserId || isGuest) return; // Prevent if guest or no ID
          setIsChangingPassword(true);
          try {
             // Use imported function
             await changeUserPassword(data.currentPassword, data.newPassword);
             toast({ title: "Sucesso!", description: "Sua senha foi alterada com sucesso." });
             passwordForm.reset({ currentPassword: '', newPassword: '', confirmPassword: '' });
             setShowCurrentPassword(false);
             setShowNewPassword(false);
             setShowConfirmPassword(false);
          } catch (error: any) {
             console.error("Erro ao alterar senha:", error);
              toast({ title: "Erro", description: error.message || "Não foi possível alterar sua senha.", variant: "destructive" });
          } finally {
              setIsChangingPassword(false);
          }
     };

     // Handle Notification Save
     const onNotificationSubmit = async (data: NotificationFormData) => {
         if (!currentUserId || isGuest) return; // Prevent if guest or no ID
         setIsSavingNotifications(true);

         // Handle browser notification permission change specifically
         if (typeof window !== 'undefined' && "Notification" in window) {
             const currentPermission = Notification.permission;
             if (data.browserNotifications && currentPermission === 'default') {
                 const permission = await requestBrowserNotificationPermission(); // Use imported function
                 setBrowserNotificationPermission(permission);
                 data.browserNotifications = permission === 'granted';
                 if (permission === 'denied') {
                     toast({ title: "Permissão Negada", description: "Notificações do navegador foram bloqueadas.", variant: "destructive" });
                 } else if (permission === 'granted') {
                      toast({ title: "Permissão Concedida", description: "Notificações do navegador ativadas." });
                 }
             } else if (!data.browserNotifications && currentPermission === 'granted') {
                 toast({ title: "Ação Necessária", description: "Para desativar notificações do navegador, ajuste as configurações do seu site/navegador.", duration: 5000 });
                 data.browserNotifications = true;
             }
         }

         try {
              // Use imported function
              await updateNotifSettings(currentUserId, data);
              toast({ title: "Sucesso!", description: "Preferências de notificação salvas." });
              notificationForm.reset(data);
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
         return <div className="flex justify-center items-center h-full py-20"><LoadingSpinner text="Carregando perfil..." /></div>;
     }

     if (!employee && !isGuest) { // Added !isGuest check
         return <div className="text-center text-muted-foreground py-20">Erro ao carregar perfil. Tente recarregar a página.</div>;
     }

     // Ensure employee is not null before accessing its properties
     if (!employee) {
        // This case should ideally not happen if loading/guest state is handled correctly,
        // but it's a safeguard.
        return <div className="text-center text-muted-foreground py-20">Perfil não disponível.</div>;
     }


     return (
         <div className="space-y-6 p-4"> {/* Added padding for mobile */}
             {/* --- Profile Info Card --- */}
             <Card className="shadow-sm">
                  <Form {...profileForm}>
                     <form onSubmit={profileForm.handleSubmit(onProfileSubmit)}>
                         <CardHeader className="flex flex-col sm:flex-row items-start justify-between gap-2 p-4">
                             <div>
                                 <CardTitle className="text-lg flex items-center gap-2"><User className="h-5 w-5" /> Suas Informações</CardTitle>
                                 {!isGuest && <CardDescription className='text-xs'>Visualize e edite seus dados.</CardDescription>}
                                 {isGuest && <CardDescription className='text-xs'>Você está no modo convidado.</CardDescription>}
                             </div>
                             {!isGuest && !isEditingProfile && (
                                 <Button type="button" variant="ghost" size="sm" onClick={() => setIsEditingProfile(true)} className="text-xs flex-shrink-0 h-7 px-2 mt-2 sm:mt-0">
                                     <Edit className="mr-1 h-3 w-3" /> Editar
                                 </Button>
                              )}
                              {!isGuest && isEditingProfile && (
                                 <div className="flex gap-1 flex-shrink-0 mt-2 sm:mt-0">
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
                              <div className="flex flex-col items-center gap-4">
                                 <div className="relative group flex-shrink-0">
                                     <Avatar className="h-28 w-28 border-2 border-primary/20">
                                         <AvatarImage src={photoPreview || employee?.photoUrl} alt={employee.name} />
                                         <AvatarFallback className="text-4xl">{getInitials(employee.name)}</AvatarFallback>
                                     </Avatar>
                                     {isEditingProfile && !isGuest && ( // Disable edit for guest
                                         <Button
                                            type="button"
                                            variant="outline"
                                            size="icon"
                                            className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-background border-primary text-primary hover:bg-primary/10 shadow-md"
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
                                        disabled={!isEditingProfile || isGuest} // Disable for guest
                                     />
                                 </div>
                                  {/* Fields Section */}
                                 <div className='w-full space-y-3'>
                                     {/* Read Only Name/Email */}
                                      <div className="space-y-1">
                                         <Label className="text-xs text-muted-foreground">Nome</Label>
                                         <p className="font-medium text-base">{employee.name}</p>
                                     </div>
                                     <div className="space-y-1">
                                         <Label className="text-xs text-muted-foreground">Email</Label>
                                         <p className="font-medium break-all text-sm text-foreground/90">{employee.email || 'Não informado'}</p>
                                     </div>
                                      {/* Editable Phone */}
                                      <FormField
                                          control={profileForm.control}
                                          name="phone"
                                          render={({ field }) => (
                                              <FormItem>
                                                  <FormLabel className="text-xs">Telefone</FormLabel>
                                                  <FormControl>
                                                     <Input className={`h-9 text-sm ${!isEditingProfile ? 'border-none px-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent pointer-events-none' : 'bg-input/50 dark:bg-input/20'}`} type="tel" placeholder="Não informado" {...field} readOnly={!isEditingProfile || isGuest} value={field.value ?? ''} />
                                                  </FormControl>
                                                  <FormMessage className="text-xs"/>
                                              </FormItem>
                                          )}
                                      />
                                       {/* Optional Photo URL Input (Only visible when editing) */}
                                      {isEditingProfile && !isGuest && ( // Hide for guest
                                          <FormField
                                              control={profileForm.control}
                                              name="photoUrl"
                                              render={({ field }) => (
                                                  <FormItem>
                                                      <FormLabel className="text-xs">URL da Foto (Alternativa)</FormLabel>
                                                      <FormControl>
                                                          <Input className="h-9 text-xs bg-input/50 dark:bg-input/20" placeholder="https://..." {...field} value={field.value ?? ''} onChange={handlePhotoUrlChange} />
                                                      </FormControl>
                                                      <FormMessage className="text-xs" />
                                                  </FormItem>
                                              )}
                                           />
                                      )}
                                 </div>
                             </div>
                              {/* Read Only Department/Role/Admission */}
                               <Separator className="my-4" />
                              <div className="grid grid-cols-1 gap-y-3 text-sm">
                                  <div className="flex justify-between items-center">
                                     <span className="text-xs text-muted-foreground">Departamento</span>
                                     <span className="font-medium text-right">{employee.department || '-'}</span>
                                  </div>
                                  <div className="flex justify-between items-center">
                                      <span className="text-xs text-muted-foreground">Função</span>
                                      <span className="font-medium text-right">{employee.role || '-'}</span>
                                  </div>
                                   <div className="flex justify-between items-center">
                                      <span className="text-xs text-muted-foreground">Data de Admissão</span>
                                      <span className="font-medium text-right">
                                          {employee.createdAt && !isGuest && employee.createdAt.toDate ? format(employee.createdAt.toDate(), 'dd/MM/yyyy', { locale: ptBR }) : '-'}
                                      </span>
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
                                 <CardTitle className="text-base flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Alterar Senha</CardTitle>
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
                                                      <Input className="h-9 text-sm pr-8" type={showCurrentPassword ? 'text' : 'password'} placeholder="********" {...field} />
                                                      <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => setShowCurrentPassword(!showCurrentPassword)} aria-label={showCurrentPassword ? 'Ocultar senha atual' : 'Mostrar senha atual'}>
                                                          {showCurrentPassword ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}
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
                                                      <Input className="h-9 text-sm pr-8" type={showNewPassword ? 'text' : 'password'} placeholder="Min. 8 caracteres" {...field} />
                                                      <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => setShowNewPassword(!showNewPassword)} aria-label={showNewPassword ? 'Ocultar nova senha' : 'Mostrar nova senha'}>
                                                          {showNewPassword ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}
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
                                                     <Input className="h-9 text-sm pr-8" type={showConfirmPassword ? 'text' : 'password'} placeholder="Repita a nova senha" {...field} />
                                                     <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => setShowConfirmPassword(!showConfirmPassword)} aria-label={showConfirmPassword ? 'Ocultar confirmação de senha' : 'Mostrar confirmação de senha'}>
                                                         {showConfirmPassword ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}
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
                                 <CardTitle className="text-base flex items-center gap-2"><Bell className="h-4 w-4" /> Notificações</CardTitle>
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
                                 {/* Browser Notification Toggle */}
                                 <FormField control={notificationForm.control} name="browserNotifications" render={({ field }) => (
                                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                          <div className="space-y-0.5">
                                              <FormLabel className="font-normal text-xs leading-tight pr-2">Ativar notificações do navegador</FormLabel>
                                              {browserNotificationPermission === 'denied' && (
                                                 <FormDescription className="text-xs text-destructive">
                                                     Permissão bloqueada nas configurações do navegador.
                                                 </FormDescription>
                                             )}
                                             {browserNotificationPermission === 'default' && (
                                                 <FormDescription className="text-xs text-yellow-600">
                                                     Permissão necessária. Clique em salvar para solicitar.
                                                 </FormDescription>
                                             )}
                                         </div>
                                         <FormControl>
                                              <Switch
                                                 checked={field.value}
                                                 onCheckedChange={field.onChange}
                                                 disabled={browserNotificationPermission === 'denied'}
                                              />
                                         </FormControl>
                                     </FormItem>
                                 )}/>
                             </CardContent>
                             <CardFooter className="p-4 pt-0">
                                  <Button type="submit" disabled={isSavingNotifications || !notificationForm.formState.isDirty} className="w-full">
                                     {isSavingNotifications ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />} {/* Changed Icon */}
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
