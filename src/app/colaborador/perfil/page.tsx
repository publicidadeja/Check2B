
 'use client';

 import * as React from 'react';
 import { User, Edit, Save, Loader2, ShieldCheck, Bell, EyeOff, Eye, Image as ImageIcon, Camera, LogOut, Settings, CheckCircle } from 'lucide-react';
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
 import { format, parseISO, isValid } from 'date-fns';
 import { ptBR } from 'date-fns/locale';
 import { useRouter } from 'next/navigation';

 import { useAuth } from '@/hooks/use-auth';
 import { getUserProfileData, changeUserPassword, logoutUser } from '@/lib/auth';
 import { saveUser, uploadProfilePhoto, getNotificationSettings, saveNotificationSettings } from '@/lib/user-service';
 import type { UserProfile } from '@/types/user';

 const profileSchema = z.object({
     phone: z.string().optional().or(z.literal('')),
     photoUrl: z.string().url('URL inválida. Use http:// ou https://').optional().or(z.literal('')),
 });

 const passwordSchema = z.object({
     currentPassword: z.string().min(1, 'Senha atual é obrigatória'),
     newPassword: z.string().min(8, 'Nova senha deve ter pelo menos 8 caracteres'),
     confirmPassword: z.string(),
 }).refine(data => data.newPassword === data.confirmPassword, {
     message: "As novas senhas não coincidem",
     path: ["confirmPassword"],
 });

 const notificationSchema = z.object({
     newEvaluation: z.boolean().default(true),
     challengeUpdates: z.boolean().default(true),
     rankingChanges: z.boolean().default(false),
     systemAnnouncements: z.boolean().default(true),
     browserNotifications: z.boolean().default(false),
 });

 type ProfileFormData = z.infer<typeof profileSchema>;
 type PasswordFormData = z.infer<typeof passwordSchema>;
 export type NotificationFormData = z.infer<typeof notificationSchema>;

 const getInitials = (name: string | undefined) => {
     if (!name) return '??';
     return name
         .split(' ')
         .map((n) => n[0])
         .slice(0, 2)
         .join('')
         .toUpperCase();
 };

 export default function EmployeeProfilePage() {
     const router = useRouter();
     const { user: authUser, isLoading: authLoading, isGuest, logout: authLogout } = useAuth();
     const [employeeProfile, setEmployeeProfile] = React.useState<UserProfile | null>(null);
     const [isLoadingProfile, setIsLoadingProfile] = React.useState(true);
     const [isLoadingNotifications, setIsLoadingNotifications] = React.useState(true);
     const [isEditingProfile, setIsEditingProfile] = React.useState(false);
     const [isSavingProfile, setIsSavingProfile] = React.useState(false);
     const [isChangingPassword, setIsChangingPassword] = React.useState(false);
     const [isSavingNotifications, setIsSavingNotifications] = React.useState(false);
     const [showCurrentPassword, setShowCurrentPassword] = React.useState(false);
     const [showNewPassword, setShowNewPassword] = React.useState(false);
     const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
     const [photoPreview, setPhotoPreview] = React.useState<string | undefined>();
     const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
     const fileInputRef = React.useRef<HTMLInputElement>(null);
     const [browserNotificationPermission, setBrowserNotificationPermission] = React.useState<NotificationPermission | null>(null);

     const { toast } = useToast();

     const profileForm = useForm<ProfileFormData>({ resolver: zodResolver(profileSchema) });
     const passwordForm = useForm<PasswordFormData>({ resolver: zodResolver(passwordSchema) });
     const notificationForm = useForm<NotificationFormData>({ resolver: zodResolver(notificationSchema) });

     React.useEffect(() => {
         const loadInitialData = async () => {
             if (authLoading || isGuest || !authUser?.uid) {
                 if (!authLoading) {
                     setIsLoadingProfile(false);
                     setIsLoadingNotifications(false);
                 }
                 return;
             }
             setIsLoadingProfile(true);
             setIsLoadingNotifications(true);

             if (typeof window !== 'undefined' && "Notification" in window) {
                 setBrowserNotificationPermission(Notification.permission);
             }

             try {
                 console.log("[EmployeeProfilePage] loadInitialData: Starting to load profile for UID:", authUser.uid);
                 const profileData = await getUserProfileData(authUser.uid);
                 console.log("[EmployeeProfilePage] loadInitialData: Profile data fetched:", profileData);
                 setEmployeeProfile(profileData);
                 if (profileData) {
                     profileForm.reset({
                         phone: profileData.phone || '',
                         photoUrl: profileData.photoUrl || '',
                     });
                     setPhotoPreview(profileData.photoUrl || undefined);
                 } else {
                     toast({ title: "Erro", description: "Perfil do colaborador não encontrado.", variant: "destructive" });
                 }
             } catch (error) {
                 console.error("[EmployeeProfilePage] Erro ao carregar perfil:", error);
                 toast({ title: "Erro", description: "Não foi possível carregar os dados do seu perfil.", variant: "destructive" });
             } finally {
                 setIsLoadingProfile(false);
             }

             if (authUser?.uid) {
                 try {
                     console.log("[EmployeeProfilePage] loadInitialData: Attempting to load notification settings for UID:", authUser.uid);
                     const notifySettings = await getNotificationSettings(authUser.uid);
                     notificationForm.reset({
                         newEvaluation: notifySettings?.newEvaluation ?? true,
                         challengeUpdates: notifySettings?.challengeUpdates ?? true,
                         rankingChanges: notifySettings?.rankingChanges ?? false,
                         systemAnnouncements: notifySettings?.systemAnnouncements ?? true,
                         browserNotifications: notifySettings?.browserNotifications ?? (Notification.permission === 'granted'),
                     });
                 } catch (error) {
                     console.error("[EmployeeProfilePage] Erro ao carregar configurações de notificação:", error);
                 } finally {
                     setIsLoadingNotifications(false);
                 }
             } else {
                 setIsLoadingNotifications(false);
             }
         };
         loadInitialData();
     }, [authUser, authLoading, isGuest, toast, profileForm, notificationForm]);

    const onProfileSubmit = async (data: ProfileFormData) => {
        if (!authUser?.uid || !employeeProfile) return;
        setIsSavingProfile(true);

        let finalPhotoUrl: string | null = employeeProfile.photoUrl || null; 

        if (selectedFile) {
            console.log("[PerfilPage] Uploading new profile photo...");
            try {
                finalPhotoUrl = await uploadProfilePhoto(authUser.uid, selectedFile);
            } catch (uploadError) {
                console.error("Error uploading photo:", uploadError);
                toast({ title: "Erro de Upload", description: "Não foi possível carregar a nova foto.", variant: "destructive" });
                setIsSavingProfile(false);
                return; 
            }
        } else if (data.photoUrl === '' && finalPhotoUrl !== null) { 
            finalPhotoUrl = null;
        } else if (data.photoUrl && data.photoUrl.trim() !== '') {
            finalPhotoUrl = data.photoUrl.trim();
        }
        // If data.photoUrl is undefined or empty, and no selectedFile, finalPhotoUrl retains its value (existing or null)

        const profileToSave: Partial<UserProfile> = {
            uid: authUser.uid,
            phone: (data.phone === undefined || data.phone.trim() === '') ? null : data.phone.trim(),
            photoUrl: finalPhotoUrl, 
        };
        
        try {
            const savedProfile = await saveUser(profileToSave); // saveUser now only sends these fields if it's a collaborator

            // Update local state with the full profile returned from saveUser
            setEmployeeProfile(savedProfile);
            profileForm.reset({ phone: savedProfile.phone || '', photoUrl: savedProfile.photoUrl || '' });
            setPhotoPreview(savedProfile.photoUrl || undefined);
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

     const handlePhotoFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) { 
                toast({ title: "Arquivo Grande", description: "A foto não pode exceder 5MB.", variant: "destructive" });
                if (fileInputRef.current) fileInputRef.current.value = '';
                return;
            }
            setSelectedFile(file);
            profileForm.setValue('photoUrl', ''); 
            const reader = new FileReader();
            reader.onloadend = () => setPhotoPreview(reader.result as string);
            reader.readAsDataURL(file);
        } else {
            setSelectedFile(null);
            setPhotoPreview(profileForm.getValues('photoUrl') || employeeProfile?.photoUrl || undefined);
        }
     };

    const cancelEditProfile = () => {
        setIsEditingProfile(false);
        if (employeeProfile) {
            profileForm.reset({
                phone: employeeProfile.phone || '',
                photoUrl: employeeProfile.photoUrl || '',
            });
            setPhotoPreview(employeeProfile.photoUrl || undefined);
        }
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
        } else if (!url) {
            // If URL is cleared, revert to selected file preview or original profile photo
            setPhotoPreview(selectedFile ? photoPreview : (employeeProfile?.photoUrl || undefined));
        }
    };

     const onPasswordSubmit = async (data: PasswordFormData) => {
          if (!authUser?.uid) return;
          setIsChangingPassword(true);
          try {
             await changeUserPassword(data.currentPassword, data.newPassword);
             toast({ title: "Sucesso!", description: "Sua senha foi alterada com sucesso." });
             passwordForm.reset({ currentPassword: '', newPassword: '', confirmPassword: '' });
             setShowCurrentPassword(false);
             setShowNewPassword(false);
             setShowConfirmPassword(false);
          } catch (error: any) {
             console.error("Erro ao alterar senha:", error);
              toast({ title: "Erro de Senha", description: error.message || "Não foi possível alterar sua senha.", variant: "destructive" });
          } finally {
              setIsChangingPassword(false);
          }
     };

     const onNotificationSubmit = async (data: NotificationFormData) => {
         if (!authUser?.uid) return;
         setIsSavingNotifications(true);
         let finalBrowserNotifications = data.browserNotifications;

         if (typeof window !== 'undefined' && "Notification" in window) {
             const currentPermission = Notification.permission;
             if (data.browserNotifications && currentPermission === 'default') {
                 const permission = await Notification.requestPermission();
                 setBrowserNotificationPermission(permission);
                 finalBrowserNotifications = permission === 'granted';
                 if (permission === 'denied') {
                     toast({ title: "Permissão Negada", description: "Notificações do navegador foram bloqueadas.", variant: "destructive" });
                 } else if (permission === 'granted') {
                      toast({ title: "Permissão Concedida", description: "Notificações do navegador ativadas." });
                 }
             } else if (!data.browserNotifications && currentPermission === 'granted') {
                 toast({ title: "Ação Necessária", description: "Para desativar, ajuste nas configurações do seu navegador para este site.", duration: 6000 });
                 finalBrowserNotifications = true; 
             } else if (data.browserNotifications && currentPermission === 'denied') {
                 toast({ title: "Permissão Bloqueada", description: "Notificações do navegador estão bloqueadas. Altere nas configurações do navegador.", variant: "destructive" });
                 finalBrowserNotifications = false;
             }
         }

         const settingsToSave = { ...data, browserNotifications: finalBrowserNotifications };

         try {
              await saveNotificationSettings(authUser.uid, settingsToSave);
              toast({ title: "Sucesso!", description: "Preferências de notificação salvas." });
              notificationForm.reset(settingsToSave);
         } catch (error) {
              console.error("Erro ao salvar notificações:", error);
              toast({ title: "Erro", description: "Não foi possível salvar as preferências.", variant: "destructive" });
         } finally {
             setIsSavingNotifications(false);
         }
     };

      const handleLogout = async () => {
        await authLogout();
        router.push('/login');
      };

     if (authLoading || isLoadingProfile) {
         return <div className="flex justify-center items-center h-full py-20"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
     }

      if (isGuest) {
         return (
            <div className="space-y-6 p-4 text-center">
                <Card className="shadow-sm">
                    <CardHeader>
                        <CardTitle>Modo Convidado</CardTitle>
                        <CardDescription>Funcionalidades do perfil estão desabilitadas.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button onClick={() => router.push('/login')}>Fazer Login</Button>
                    </CardContent>
                </Card>
            </div>
         );
     }

     if (!employeeProfile || !authUser) {
         return <div className="text-center text-muted-foreground py-20">Erro ao carregar perfil do colaborador. Por favor, tente recarregar a página ou contate o suporte se o problema persistir.</div>;
     }

     return (
         <div className="space-y-6 p-4">
             <Card className="shadow-sm">
                  <Form {...profileForm}>
                     <form onSubmit={profileForm.handleSubmit(onProfileSubmit)}>
                         <CardHeader className="flex flex-col sm:flex-row items-start justify-between gap-2 p-4">
                             <div>
                                 <CardTitle className="text-lg flex items-center gap-2"><User className="h-5 w-5" /> Suas Informações</CardTitle>
                                 <CardDescription className='text-xs'>Visualize e edite seus dados.</CardDescription>
                             </div>
                             {!isEditingProfile && (
                                 <Button type="button" variant="ghost" size="sm" onClick={() => setIsEditingProfile(true)} className="text-xs flex-shrink-0 h-7 px-2 mt-2 sm:mt-0">
                                     <Edit className="mr-1 h-3 w-3" /> Editar
                                 </Button>
                              )}
                              {isEditingProfile && (
                                 <div className="flex gap-1 flex-shrink-0 mt-2 sm:mt-0">
                                      <Button type="button" variant="ghost" size="sm" onClick={cancelEditProfile} className="text-xs h-7 px-2">Cancelar</Button>
                                      <Button type="submit" size="sm" disabled={isSavingProfile || (!profileForm.formState.isDirty && !selectedFile)} className="text-xs h-7 px-2">
                                         {isSavingProfile ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Save className="mr-1 h-3 w-3" />}
                                         Salvar
                                     </Button>
                                 </div>
                             )}
                         </CardHeader>
                         <CardContent className="space-y-4 p-4 pt-0">
                              <div className="flex flex-col items-center gap-4">
                                 <div className="relative group flex-shrink-0">
                                     <Avatar className="h-28 w-28 border-2 border-primary/20">
                                         <AvatarImage src={photoPreview || undefined} alt={employeeProfile.name} />
                                         <AvatarFallback className="text-4xl">{getInitials(employeeProfile.name)}</AvatarFallback>
                                     </Avatar>
                                     {isEditingProfile && (
                                         <Button type="button" variant="outline" size="icon" className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-background border-primary text-primary hover:bg-primary/10 shadow-md" onClick={() => fileInputRef.current?.click()} title="Alterar Foto">
                                             <Camera className="h-4 w-4" /><span className="sr-only">Alterar foto</span>
                                         </Button>
                                     )}
                                     <Input ref={fileInputRef} type="file" accept="image/png, image/jpeg, image/webp" className="hidden" onChange={handlePhotoFileChange} disabled={!isEditingProfile} />
                                 </div>
                                 <div className='w-full space-y-3'>
                                      <div className="space-y-1"><Label className="text-xs text-muted-foreground">Nome</Label><p className="font-medium text-base">{employeeProfile.name}</p></div>
                                     <div className="space-y-1"><Label className="text-xs text-muted-foreground">Email</Label><p className="font-medium break-all text-sm text-foreground/90">{employeeProfile.email}</p></div>
                                      <FormField control={profileForm.control} name="phone" render={({ field }) => (
                                          <FormItem><FormLabel className="text-xs">Telefone</FormLabel><FormControl><Input className={`h-9 text-sm ${!isEditingProfile ? 'border-none px-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent pointer-events-none shadow-none' : 'bg-input/50 dark:bg-input/20'}`} type="tel" placeholder="Não informado" {...field} readOnly={!isEditingProfile} value={field.value ?? ''} /></FormControl><FormMessage className="text-xs"/></FormItem>
                                      )}/>
                                      {isEditingProfile && (
                                          <FormField control={profileForm.control} name="photoUrl" render={({ field }) => (
                                              <FormItem><FormLabel className="text-xs">URL da Foto (Alternativa)</FormLabel><FormControl><Input className="h-9 text-xs bg-input/50 dark:bg-input/20" placeholder="https://" {...field} value={field.value ?? ''} onChange={handlePhotoUrlChange} /></FormControl><FormMessage className="text-xs" /></FormItem>
                                          )}/>
                                      )}
                                 </div>
                             </div>
                               <Separator className="my-4" />
                              <div className="grid grid-cols-1 gap-y-3 text-sm">
                                  <div className="flex justify-between items-center"><span className="text-xs text-muted-foreground">Departamento</span><span className="font-medium text-right">{employeeProfile.department || '-'}</span></div>
                                  <div className="flex justify-between items-center"><span className="text-xs text-muted-foreground">Função</span><span className="font-medium text-right">{employeeProfile.userRole || '-'}</span></div>
                                   <div className="flex justify-between items-center"><span className="text-xs text-muted-foreground">Data de Admissão</span><span className="font-medium text-right">{employeeProfile.admissionDate && isValid(parseISO(employeeProfile.admissionDate)) ? format(parseISO(employeeProfile.admissionDate), 'PPP', { locale: ptBR }) : '-'}</span></div>
                              </div>
                         </CardContent>
                     </form>
                  </Form>
             </Card>

             <Card className="shadow-sm">
                  <Form {...passwordForm}>
                     <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}>
                         <CardHeader className="p-4 pb-2"><CardTitle className="text-base flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Alterar Senha</CardTitle></CardHeader>
                         <CardContent className="space-y-3 p-4 pt-0">
                             <FormField control={passwordForm.control} name="currentPassword" render={({ field }) => (
                                 <FormItem><FormLabel className="text-xs">Senha Atual</FormLabel><FormControl><div className="relative"><Input className="h-9 text-sm pr-8" type={showCurrentPassword ? 'text' : 'password'} placeholder="********" {...field} /><Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => setShowCurrentPassword(!showCurrentPassword)} aria-label={showCurrentPassword ? 'Ocultar senha atual' : 'Mostrar senha atual'}><EyeOff className={showCurrentPassword ? "h-4 w-4" : "hidden"}/><Eye className={!showCurrentPassword ? "h-4 w-4" : "hidden"}/></Button></div></FormControl><FormMessage className="text-xs"/></FormItem>
                             )}/>
                              <FormField control={passwordForm.control} name="newPassword" render={({ field }) => (
                                 <FormItem><FormLabel className="text-xs">Nova Senha</FormLabel><FormControl><div className="relative"><Input className="h-9 text-sm pr-8" type={showNewPassword ? 'text' : 'password'} placeholder="Min. 8 caracteres" {...field} /><Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => setShowNewPassword(!showNewPassword)} aria-label={showNewPassword ? 'Ocultar nova senha' : 'Mostrar nova senha'}><EyeOff className={showNewPassword ? "h-4 w-4" : "hidden"}/><Eye className={!showNewPassword ? "h-4 w-4" : "hidden"}/></Button></div></FormControl><FormMessage className="text-xs"/></FormItem>
                             )}/>
                             <FormField control={passwordForm.control} name="confirmPassword" render={({ field }) => (
                                 <FormItem><FormLabel className="text-xs">Confirmar Nova Senha</FormLabel><FormControl><div className="relative"><Input className="h-9 text-sm pr-8" type={showConfirmPassword ? 'text' : 'password'} placeholder="Repita a nova senha" {...field} /><Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => setShowConfirmPassword(!showConfirmPassword)} aria-label={showConfirmPassword ? 'Ocultar confirmação de senha' : 'Mostrar confirmação de senha'}><EyeOff className={showConfirmPassword ? "h-4 w-4" : "hidden"}/><Eye className={!showConfirmPassword ? "h-4 w-4" : "hidden"}/></Button></div></FormControl><FormMessage className="text-xs"/></FormItem>
                             )}/>
                         </CardContent>
                         <CardFooter className="p-4 pt-0">
                              <Button type="submit" disabled={isChangingPassword || !passwordForm.formState.isDirty} className="w-full">
                                 {isChangingPassword ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                                 {isChangingPassword ? 'Alterando...' : 'Alterar Senha'}
                             </Button>
                         </CardFooter>
                     </form>
                  </Form>
             </Card>

              <Card className="shadow-sm">
                  <Form {...notificationForm}>
                      <form onSubmit={notificationForm.handleSubmit(onNotificationSubmit)}>
                         <CardHeader className="p-4 pb-2"><CardTitle className="text-base flex items-center gap-2"><Bell className="h-4 w-4" /> Notificações</CardTitle><CardDescription className='text-xs'>Gerencie como você recebe alertas.</CardDescription></CardHeader>
                         <CardContent className="space-y-3 p-4 pt-0">
                            {isLoadingNotifications ? (
                                <div className="flex justify-center items-center py-6"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
                            ) : (
                                <>
                                    <FormField control={notificationForm.control} name="newEvaluation" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm"><FormLabel className="font-normal text-xs leading-tight pr-2">Receber notificação de novas avaliações</FormLabel><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)}/>
                                    <FormField control={notificationForm.control} name="challengeUpdates" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm"><FormLabel className="font-normal text-xs leading-tight pr-2">Notificações sobre desafios (novos, prazos)</FormLabel><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)}/>
                                    <FormField control={notificationForm.control} name="rankingChanges" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm"><FormLabel className="font-normal text-xs leading-tight pr-2">Notificações sobre mudanças no ranking</FormLabel><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)}/>
                                    <FormField control={notificationForm.control} name="systemAnnouncements" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm"><FormLabel className="font-normal text-xs leading-tight pr-2">Anúncios importantes do sistema</FormLabel><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)}/>
                                    <FormField control={notificationForm.control} name="browserNotifications" render={({ field }) => (
                                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                            <div className="space-y-0.5"><FormLabel className="font-normal text-xs leading-tight pr-2">Ativar notificações do navegador</FormLabel>
                                                {browserNotificationPermission === 'denied' && (<FormDescription className="text-xs text-destructive">Permissão bloqueada nas configurações do navegador.</FormDescription>)}
                                                {browserNotificationPermission === 'default' && (<FormDescription className="text-xs text-yellow-600">Permissão necessária. Clique em salvar para solicitar.</FormDescription>)}
                                            </div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} disabled={browserNotificationPermission === 'denied'} /></FormControl>
                                        </FormItem>
                                    )}/>
                                </>
                            )}
                         </CardContent>
                         <CardFooter className="p-4 pt-0">
                              <Button type="submit" disabled={isSavingNotifications || !notificationForm.formState.isDirty || isLoadingNotifications} className="w-full">
                                 {isSavingNotifications ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                                 {isSavingNotifications ? 'Salvando...' : 'Salvar Preferências'}
                             </Button>
                         </CardFooter>
                     </form>
                  </Form>
              </Card>

             <div className="mt-6">
                  <Button variant="destructive" className="w-full" onClick={handleLogout}>
                     <LogOut className="mr-2 h-4 w-4" /> Sair da Conta
                 </Button>
             </div>
         </div>
     );
 }
    
    
