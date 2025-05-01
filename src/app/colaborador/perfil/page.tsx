
 'use client';

 import * as React from 'react';
 import { User, Edit, Save, Loader2, ShieldCheck, Bell, EyeOff, Eye, Image as ImageIcon, Camera } from 'lucide-react'; // Added Camera
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
 // Removed EmployeeLayout import

 // Import types
 import type { Employee } from '@/types/employee';
 import { mockEmployees } from '@/app/employees/page';

 // Mock Employee ID
 const CURRENT_EMPLOYEE_ID = '1'; // Alice Silva

 // --- Zod Schemas ---
 const profileSchema = z.object({
     name: z.string().min(2, 'Nome muito curto').optional(), // Admins usually edit name
     phone: z.string().optional().or(z.literal('')),
     photoUrl: z.string().url('URL inválida').optional().or(z.literal('')),
     // photoFile: z.instanceof(File).optional(), // For file upload
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

 // Update simulation to potentially handle file upload (mock URL)
 const updateEmployeeProfile = async (employeeId: string, data: Partial<ProfileFormData & { photoFile?: File }>): Promise<Employee> => {
     await new Promise(resolve => setTimeout(resolve, 800));
     const index = mockEmployees.findIndex(e => e.id === employeeId);
     if (index === -1) throw new Error("Colaborador não encontrado.");

     if (data.phone !== undefined) mockEmployees[index].phone = data.phone;

     if (data.photoFile) {
         // Simulate upload and get URL
         mockEmployees[index].photoUrl = `https://picsum.photos/seed/${employeeId}${Date.now()}/100/100`; // New mock URL
         console.log("Simulating photo upload for file:", data.photoFile.name);
     } else if (data.photoUrl !== undefined) {
         mockEmployees[index].photoUrl = data.photoUrl;
     }

     console.log("Perfil atualizado (simulado):", mockEmployees[index]);
     return { ...mockEmployees[index] };
 }


 const changePassword = async (employeeId: string, data: PasswordFormData): Promise<void> => {
     await new Promise(resolve => setTimeout(resolve, 1000));
     console.log("Senha alterada (simulado) para colaborador:", employeeId);
     if (data.currentPassword === 'password123') {
         throw new Error("Senha atual incorreta.");
     }
 }

 const updateNotificationSettings = async (employeeId: string, data: NotificationFormData): Promise<void> => {
      await new Promise(resolve => setTimeout(resolve, 600));
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
     const [photoPreview, setPhotoPreview] = React.useState<string | undefined>(); // For file preview
     const fileInputRef = React.useRef<HTMLInputElement>(null); // Ref for file input

     const { toast } = useToast();

     // Forms
     const profileForm = useForm<ProfileFormData & { photoFile?: File }>({ resolver: zodResolver(profileSchema) });
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
                     name: data.name,
                     phone: data.phone || '',
                     photoUrl: data.photoUrl || '',
                     photoFile: undefined, // Reset file field
                 });
                 setPhotoPreview(data.photoUrl); // Set initial preview
                 notificationForm.reset({ // Simulate loading saved prefs
                     newEvaluation: true, challengeUpdates: true, rankingChanges: true, systemAnnouncements: true,
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
     const onProfileSubmit = async (data: ProfileFormData & { photoFile?: File }) => {
         setIsSavingProfile(true);
         try {
             // Pass photoFile along with other data
              const updatedProfile = await updateEmployeeProfile(CURRENT_EMPLOYEE_ID, {
                  phone: data.phone,
                  photoUrl: data.photoUrl, // Keep URL field too for direct input option
                  photoFile: data.photoFile
              });
              setEmployee(updatedProfile);
              // Reset form with updated data, clearing the file input
              profileForm.reset({
                  ...updatedProfile,
                  photoFile: undefined // Important to clear file
              });
              setPhotoPreview(updatedProfile.photoUrl); // Update preview
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
            profileForm.setValue('photoFile', file);
            // Create a temporary URL for preview
            const reader = new FileReader();
            reader.onloadend = () => {
                setPhotoPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
            profileForm.setValue('photoUrl', ''); // Clear URL field if file is selected
        } else {
            profileForm.setValue('photoFile', undefined);
            setPhotoPreview(profileForm.getValues('photoUrl') || employee?.photoUrl); // Revert to URL or original
        }
     };


     // Handle Password Change
     const onPasswordSubmit = async (data: PasswordFormData) => {
          setIsChangingPassword(true);
          try {
             await changePassword(CURRENT_EMPLOYEE_ID, data);
             toast({ title: "Sucesso!", description: "Sua senha foi alterada." });
             passwordForm.reset({ currentPassword: '', newPassword: '', confirmPassword: '' });
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
              toast({ title: "Sucesso!", description: "Preferências salvas." });
         } catch (error) {
              console.error("Erro ao salvar notificações:", error);
              toast({ title: "Erro", description: "Não foi possível salvar.", variant: "destructive" });
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
         // EmployeeLayout is applied by group layout
         <div className="space-y-4"> {/* Reduced spacing */}
             {/* Profile Info Card */}
             <Card>
                  <Form {...profileForm}>
                     <form onSubmit={profileForm.handleSubmit(onProfileSubmit)}>
                         <CardHeader className="flex flex-row items-center justify-between gap-2 p-4"> {/* Reduced padding */}
                             <CardTitle className="text-lg flex items-center gap-2"><User className="h-5 w-5" /> Informações</CardTitle>
                             {!isEditingProfile ? (
                                 <Button type="button" variant="ghost" size="sm" onClick={() => setIsEditingProfile(true)} className="text-xs">
                                     <Edit className="mr-1 h-3 w-3" /> Editar
                                 </Button>
                              ) : (
                                 <div className="flex gap-1">
                                      <Button type="button" variant="ghost" size="sm" onClick={() => { setIsEditingProfile(false); profileForm.reset({ name: employee.name, phone: employee.phone || '', photoUrl: employee.photoUrl || '', photoFile: undefined }); setPhotoPreview(employee.photoUrl); }} className="text-xs">Cancelar</Button>
                                      <Button type="submit" size="sm" disabled={isSavingProfile} className="text-xs">
                                         {isSavingProfile && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                                         Salvar
                                     </Button>
                                 </div>
                             )}
                         </CardHeader>
                         <CardContent className="space-y-3 p-4 pt-0"> {/* Reduced padding */}
                              <div className="flex flex-col items-center space-y-2">
                                 <div className="relative group">
                                     <Avatar className="h-24 w-24">
                                         <AvatarImage src={photoPreview || employee.photoUrl} alt={employee.name} />
                                         <AvatarFallback className="text-3xl">{getInitials(employee.name)}</AvatarFallback>
                                     </Avatar>
                                     {isEditingProfile && (
                                         <Button
                                            type="button"
                                            variant="outline"
                                            size="icon"
                                            className="absolute bottom-0 right-0 h-7 w-7 rounded-full bg-muted group-hover:bg-primary group-hover:text-primary-foreground"
                                            onClick={() => fileInputRef.current?.click()}
                                         >
                                             <Camera className="h-4 w-4" />
                                             <span className="sr-only">Alterar foto</span>
                                         </Button>
                                     )}
                                     <Input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handlePhotoFileChange}
                                     />
                                 </div>
                                  {/* Hidden field to register photoFile */}
                                 <FormField control={profileForm.control} name="photoFile" render={({ field }) => <FormItem className="hidden"><FormControl><Input type="file" {...field} value={undefined} /></FormControl></FormItem>} />
                                 {isEditingProfile && (
                                     <FormField
                                         control={profileForm.control}
                                         name="photoUrl"
                                         render={({ field }) => (
                                             <FormItem className="w-full text-center">
                                                 <FormLabel className="text-xs">Ou cole URL da Foto</FormLabel>
                                                 <FormControl>
                                                      <Input className="text-xs h-8 text-center" placeholder="https://..." {...field} value={field.value ?? ''} onChange={(e) => { field.onChange(e); setPhotoPreview(e.target.value); profileForm.setValue('photoFile', undefined); }} />
                                                 </FormControl>
                                                 <FormMessage className="text-xs" />
                                             </FormItem>
                                         )}
                                         />
                                 )}
                             </div>
                              {/* Read Only Fields */}
                             <div className="space-y-1 text-sm">
                                 <div className="flex justify-between"><span className="text-muted-foreground text-xs">Nome:</span> <span className="font-medium">{employee.name}</span></div>
                                 <div className="flex justify-between"><span className="text-muted-foreground text-xs">Email:</span> <span className="font-medium">{employee.email}</span></div>
                                  <FormField
                                     control={profileForm.control}
                                     name="phone"
                                     render={({ field }) => (
                                         <FormItem className="flex justify-between items-center">
                                             <FormLabel className="text-muted-foreground text-xs pt-2">Telefone:</FormLabel>
                                             <FormControl>
                                                  <Input className={`h-7 text-xs text-right border-0 focus-visible:ring-1 ${!isEditingProfile ? 'bg-transparent px-0 pointer-events-none' : 'bg-muted/50 px-2'}`} type="tel" placeholder="Não informado" {...field} readOnly={!isEditingProfile} value={field.value ?? ''} />
                                             </FormControl>
                                             <FormMessage className="text-xs"/>
                                         </FormItem>
                                     )}
                                 />
                                 <div className="flex justify-between"><span className="text-muted-foreground text-xs">Departamento:</span> <span className="font-medium">{employee.department}</span></div>
                                 <div className="flex justify-between"><span className="text-muted-foreground text-xs">Função:</span> <span className="font-medium">{employee.role}</span></div>
                                 <div className="flex justify-between"><span className="text-muted-foreground text-xs">Admissão:</span> <span className="font-medium">{format(parseISO(employee.admissionDate + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR })}</span></div>
                             </div>
                         </CardContent>
                     </form>
                  </Form>
             </Card>

             {/* Password Change Card */}
             <Card>
                  <Form {...passwordForm}>
                     <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}>
                         <CardHeader className="p-4 pb-2"> {/* Reduced padding */}
                             <CardTitle className="text-lg flex items-center gap-2"><ShieldCheck className="h-5 w-5" /> Alterar Senha</CardTitle>
                         </CardHeader>
                         <CardContent className="space-y-3 p-4 pt-0"> {/* Reduced padding */}
                             <FormField
                                 control={passwordForm.control}
                                 name="currentPassword"
                                 render={({ field }) => (
                                     <FormItem>
                                         <FormLabel className="text-xs">Senha Atual</FormLabel>
                                          <FormControl>
                                              <div className="relative">
                                                  <Input className="h-9 text-sm" type={showCurrentPassword ? 'text' : 'password'} placeholder="********" {...field} />
                                                  <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1 h-7 w-7" onClick={() => setShowCurrentPassword(!showCurrentPassword)}>
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
                                                  <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1 h-7 w-7" onClick={() => setShowNewPassword(!showNewPassword)}>
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
                                                 <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1 h-7 w-7" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
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
                         <CardFooter className="p-4 pt-0"> {/* Reduced padding */}
                              <Button type="submit" disabled={isChangingPassword} className="w-full">
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
                         <CardHeader className="p-4 pb-2"> {/* Reduced padding */}
                             <CardTitle className="text-lg flex items-center gap-2"><Bell className="h-5 w-5" /> Notificações</CardTitle>
                         </CardHeader>
                         <CardContent className="space-y-3 p-4 pt-0"> {/* Reduced padding */}
                             <FormField control={notificationForm.control} name="newEvaluation" render={({ field }) => (
                                 <FormItem className="flex flex-row items-center justify-between rounded-lg border p-2 shadow-sm">
                                     <FormLabel className="font-normal text-xs leading-tight">Receber notificação de novas avaliações</FormLabel>
                                     <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} className="scale-75" /></FormControl> {/* Scaled switch */}
                                 </FormItem>
                             )}/>
                             <FormField control={notificationForm.control} name="challengeUpdates" render={({ field }) => (
                                 <FormItem className="flex flex-row items-center justify-between rounded-lg border p-2 shadow-sm">
                                     <FormLabel className="font-normal text-xs leading-tight">Notificações sobre desafios (novos, prazos)</FormLabel>
                                     <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} className="scale-75" /></FormControl>
                                 </FormItem>
                             )}/>
                              <FormField control={notificationForm.control} name="rankingChanges" render={({ field }) => (
                                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-2 shadow-sm">
                                     <FormLabel className="font-normal text-xs leading-tight">Notificações sobre mudanças no ranking</FormLabel>
                                     <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} className="scale-75" /></FormControl>
                                 </FormItem>
                             )}/>
                             <FormField control={notificationForm.control} name="systemAnnouncements" render={({ field }) => (
                                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-2 shadow-sm">
                                     <FormLabel className="font-normal text-xs leading-tight">Anúncios importantes do sistema</FormLabel>
                                     <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} className="scale-75" /></FormControl>
                                 </FormItem>
                             )}/>
                         </CardContent>
                         <CardFooter className="p-4 pt-0"> {/* Reduced padding */}
                              <Button type="submit" disabled={isSavingNotifications} className="w-full">
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

   