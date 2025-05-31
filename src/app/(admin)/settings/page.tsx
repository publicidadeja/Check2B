
'use client';

import * as React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useToast } from '@/hooks/use-toast';
import { Loader2, UserPlus, DatabaseBackup, Settings2, UserCog, FileClock, AlertTriangle, Trash2, UserMinus, PlusCircle } from 'lucide-react'; // Added PlusCircle
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useForm } from 'react-hook-form';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useAuth } from '@/hooks/use-auth';
import { getGeneralSettings, saveGeneralSettings, type GeneralSettingsData } from '@/lib/settings-service';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getFirebaseApp } from '@/lib/firebase';
import { getUsersByRoleAndOrganization } from '@/lib/user-service';
import type { UserProfile } from '@/types/user';
import { AddAdminToOrgForm, type AddAdminFormData } from '@/components/admin/add-admin-to-org-form';

const generalSettingsSchema = z.object({
    bonusValue: z.coerce.number().min(0, "Valor não pode ser negativo.").default(100),
    zeroLimit: z.coerce.number().int("Deve ser um número inteiro.").min(0, "Limite não pode ser negativo.").default(3),
});

interface BackupInfo {
    id: string;
    timestamp: Date;
    size: string;
    initiator: string;
}

const mockBackups: BackupInfo[] = [
    { id: 'bkp1', timestamp: new Date(Date.now() - 7 * 86400000), size: '14.8 MB', initiator: 'Admin Principal' },
    { id: 'bkp2', timestamp: new Date(Date.now() - 1 * 86400000), size: '15.2 MB', initiator: 'System' },
];

const createBackup = async (initiator: string): Promise<BackupInfo> => {
     await new Promise(resolve => setTimeout(resolve, 2000));
     const newBackup: BackupInfo = {
         id: `bkp${Date.now()}`,
         timestamp: new Date(),
         size: `${(15 + Math.random()).toFixed(1)} MB`,
         initiator: initiator,
     };
     mockBackups.push(newBackup);
     console.log("Backup criado (simulado):", newBackup);
     return newBackup;
}
const restoreBackup = async (backupId: string): Promise<void> => {
     await new Promise(resolve => setTimeout(resolve, 3000));
     console.log("Restaurando backup (simulado):", backupId);
}

export default function SettingsPage() {
    const { toast } = useToast();
    const { organizationId, user: adminUser, isLoading: authLoading, role: adminAuthRole } = useAuth();
    const firebaseApp = getFirebaseApp();
    const [isLoadingGeneral, setIsLoadingGeneral] = React.useState(false);
    const [isLoadingPageData, setIsLoadingPageData] = React.useState(true);

    const [isLoadingAdmins, setIsLoadingAdmins] = React.useState(true);
    const [admins, setAdmins] = React.useState<UserProfile[]>([]);
    const [isAddAdminDialogOpen, setIsAddAdminDialogOpen] = React.useState(false);
    const [isProcessingAdminAction, setIsProcessingAdminAction] = React.useState(false);

    const [adminToDemote, setAdminToDemote] = React.useState<UserProfile | null>(null);
    const [isDemotingAdminDialogOpen, setIsDemotingAdminDialogOpen] = React.useState(false);


    const [isLoadingBackups, setIsLoadingBackups] = React.useState(true);
    const [backups, setBackups] = React.useState<BackupInfo[]>([]);
    const [isCreatingBackup, setIsCreatingBackup] = React.useState(false);
    const [isRestoringBackup, setIsRestoringBackup] = React.useState(false);
    const [backupToRestore, setBackupToRestore] = React.useState<BackupInfo | null>(null);


    const form = useForm<z.infer<typeof generalSettingsSchema>>({
        resolver: zodResolver(generalSettingsSchema),
        defaultValues: {
            bonusValue: 100,
            zeroLimit: 3,
        },
    });

    React.useEffect(() => {
        const loadInitialData = async () => {
            if (authLoading) { // Wait for auth to resolve first
                return;
            }
            setIsLoadingPageData(true);
            try {
                if (organizationId) {
                    const settings = await getGeneralSettings(organizationId);
                    if (settings) {
                        form.reset({
                            bonusValue: settings.bonusValue,
                            zeroLimit: settings.zeroLimit,
                        });
                    }
                    await loadAdmins();
                    loadBackups(); // This is mock, so no need to await if it's just setting state
                } else if (adminAuthRole === 'admin' && !organizationId) {
                     // Admin without org ID, settings form will be disabled, but other sections might load differently
                    console.warn("[SettingsPage] Admin is not associated with an organization. Settings will be disabled.");
                    // Mock sections can still load for UI consistency if desired
                    loadBackups();
                    setIsLoadingAdmins(false); // No admins to load if no org ID
                }
            } catch (error) {
                console.error("Erro ao carregar configurações gerais ou admins:", error);
                toast({ title: "Erro", description: "Não foi possível carregar dados da página.", variant: "destructive" });
            } finally {
                setIsLoadingPageData(false);
            }
        };
        loadInitialData();
    }, [organizationId, authLoading, adminAuthRole, form, toast]);


    const handleSaveGeneralSettings = async (data: z.infer<typeof generalSettingsSchema>) => {
        if (!organizationId) {
            toast({ title: "Erro", description: "ID da Organização não encontrado.", variant: "destructive" });
            return;
        }
        setIsLoadingGeneral(true);
        try {
            await saveGeneralSettings(organizationId, data);
            toast({
                title: "Sucesso!",
                description: "Configurações gerais salvas.",
            });
            form.reset(data);
        } catch (error) {
            console.error("Erro ao salvar config geral:", error);
            toast({ title: "Erro", description: "Falha ao salvar configurações gerais.", variant: "destructive" });
        } finally {
            setIsLoadingGeneral(false);
        }
    };

    const loadAdmins = React.useCallback(async () => {
        if (!organizationId) {
            setAdmins([]);
            setIsLoadingAdmins(false);
            return;
        }
        setIsLoadingAdmins(true);
        try {
            const data = await getUsersByRoleAndOrganization('admin', organizationId);
            setAdmins(data.filter(admin => admin.uid !== adminUser?.uid)); // Exclude self
        } catch (error) {
            toast({ title: "Erro", description: "Falha ao carregar lista de administradores.", variant: "destructive" });
            setAdmins([]);
        } finally {
            setIsLoadingAdmins(false);
        }
    }, [organizationId, toast, adminUser?.uid]);

    const handleAddAdminSubmit = async (data: AddAdminFormData) => {
        if (!firebaseApp || !organizationId) {
            toast({ title: "Erro de Configuração", description: "Firebase ou ID da Organização não disponível.", variant: "destructive" });
            return;
        }
        setIsProcessingAdminAction(true);
        const functions = getFunctions(firebaseApp);
        const addAdminFunction = httpsCallable(functions, 'addAdminToMyOrg');

        try {
             await addAdminFunction({ name: data.name, email: data.email, password: data.password });
             toast({ title: "Sucesso", description: `Administrador ${data.name} adicionado com sucesso.` });
             await loadAdmins();
             setIsAddAdminDialogOpen(false); // Close dialog on success
        } catch (error: any) {
             console.error("Erro ao adicionar admin via CF:", error);
             toast({ title: "Erro ao Adicionar Admin", description: error.message || "Falha ao adicionar administrador.", variant: "destructive" });
        } finally {
            setIsProcessingAdminAction(false);
        }
    };

     const handleDemoteAdminClick = (admin: UserProfile) => {
        if (admin.uid === adminUser?.uid) {
             toast({ title: "Ação Bloqueada", description: "Você não pode rebaixar a si mesmo.", variant: "destructive" });
             return;
        }
        setAdminToDemote(admin);
        setIsDemotingAdminDialogOpen(true);
    };

     const confirmDemoteAdmin = async () => {
        if (adminToDemote && firebaseApp && organizationId) {
            setIsProcessingAdminAction(true);
            const functions = getFunctions(firebaseApp);
            const demoteAdminFunction = httpsCallable(functions, 'demoteAdminInMyOrg');
            try {
                await demoteAdminFunction({ userIdToDemote: adminToDemote.uid });
                toast({ title: "Sucesso", description: `Administrador ${adminToDemote.name} rebaixado para colaborador.` });
                await loadAdmins();
            } catch (error: any)
             {
                toast({ title: "Erro", description: error.message || "Falha ao rebaixar administrador.", variant: "destructive" });
            } finally {
                setIsProcessingAdminAction(false);
                setIsDemotingAdminDialogOpen(false);
                setAdminToDemote(null);
            }
        }
     };

    const loadBackups = React.useCallback(async () => {
        setIsLoadingBackups(true);
        try {
            await new Promise(resolve => setTimeout(resolve, 400));
            setBackups([...mockBackups].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()));
        } catch (error) {
            toast({ title: "Erro", description: "Falha ao carregar histórico de backups.", variant: "destructive" });
        } finally {
            setIsLoadingBackups(false);
        }
    }, [toast]);

    const handleCreateBackup = async () => {
        setIsCreatingBackup(true);
        try {
            await createBackup(adminUser?.displayName || "Usuário Admin");
            toast({ title: "Sucesso", description: "Backup criado com sucesso." });
            await loadBackups();
        } catch (error) {
             toast({ title: "Erro", description: "Falha ao criar backup.", variant: "destructive" });
        } finally {
             setIsCreatingBackup(false);
        }
    };
     const handleRestoreClick = (backup: BackupInfo) => {
        setBackupToRestore(backup);
    };
     const confirmRestoreBackup = async () => {
        if (backupToRestore) {
             setIsRestoringBackup(true);
             try {
                 await restoreBackup(backupToRestore.id);
                 toast({ title: "Restauração Iniciada", description: `Restaurando a partir do backup de ${backupToRestore.timestamp.toLocaleString()}. O sistema pode ficar indisponível brevemente.`, duration: 5000 });
             } catch (error) {
                 toast({ title: "Erro", description: "Falha ao iniciar a restauração do backup.", variant: "destructive" });
             } finally {
                 setIsRestoringBackup(false);
                 setBackupToRestore(null);
             }
        }
     };

     if (authLoading || isLoadingPageData) {
        return (
            <div className="flex justify-center items-center h-full py-10">
                <LoadingSpinner text="Carregando configurações..." size="lg"/>
            </div>
        );
    }

    if (adminAuthRole === 'admin' && !organizationId && !authLoading) {
        return (
            <Card className="m-4">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-destructive"/>Acesso Negado</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">O administrador não está associado a uma organização. Não é possível carregar ou salvar configurações.</p>
                </CardContent>
            </Card>
        );
    }


    return (
        <div className="space-y-6">
            <Card>
                 <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSaveGeneralSettings)}>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Settings2 className="h-5 w-5" /> Configurações Gerais</CardTitle>
                            <CardDescription>Ajuste as configurações globais do sistema Check2B para sua organização.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                           <FormField
                              control={form.control}
                              name="bonusValue"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Valor Base da Bonificação (R$)</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      placeholder="Ex: 100.00"
                                      step="0.01"
                                      min="0"
                                      {...field}
                                      disabled={!organizationId}
                                    />
                                  </FormControl>
                                   <FormDescription>
                                      Valor pago por dia sem nenhuma nota zero no mês.
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <Separator />
                            <FormField
                              control={form.control}
                              name="zeroLimit"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Limite de Zeros para Perder Bonificação</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      placeholder="Ex: 3"
                                      step="1"
                                      min="0"
                                      {...field}
                                      disabled={!organizationId}
                                     />
                                   </FormControl>
                                   <FormDescription>
                                     Número máximo de notas zero permitidas no mês para receber a bonificação.
                                   </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                        </CardContent>
                        <CardFooter>
                            <Button type="submit" disabled={isLoadingGeneral || !form.formState.isDirty || !organizationId}>
                                {isLoadingGeneral && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Salvar Configurações Gerais
                            </Button>
                        </CardFooter>
                    </form>
                </Form>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2"><UserCog className="h-5 w-5" /> Gerenciamento de Administradores</CardTitle>
                        <CardDescription>Adicione ou remova outros usuários administrativos para esta organização.</CardDescription>
                    </div>
                     <Button onClick={() => setIsAddAdminDialogOpen(true)} disabled={!organizationId || isProcessingAdminAction}>
                        <UserPlus className="mr-2 h-4 w-4" /> Adicionar Admin
                     </Button>
                </CardHeader>
                <CardContent>
                     <Separator className="my-4" />
                     <h4 className="text-sm font-medium mb-2">Administradores Atuais (Exceto Você)</h4>
                     <div className="rounded-md border">
                        <Table>
                             <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Email</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
                             <TableBody>
                                {isLoadingAdmins ? (<TableRow><TableCell colSpan={3} className="text-center py-4"><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></TableCell></TableRow>
                                ) : !organizationId ? (
                                     <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-4">Nenhuma organização selecionada.</TableCell></TableRow>
                                ) : admins.length === 0 ? (<TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-4">Nenhum outro administrador encontrado.</TableCell></TableRow>
                                ) : (admins.map(admin => (
                                        <TableRow key={admin.uid}><TableCell className="font-medium">{admin.name}</TableCell><TableCell>{admin.email}</TableCell><TableCell className="text-right">
                                             <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" disabled={isProcessingAdminAction}><MoreHorizontal className="h-4 w-4" /><span className="sr-only">Ações</span></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => handleDemoteAdminClick(admin)} className="text-orange-600 focus:text-orange-700 focus:bg-orange-50"><UserMinus className="mr-2 h-4 w-4" /> Rebaixar para Colaborador</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
                                         </TableCell></TableRow>)))}</TableBody></Table></div></CardContent>
            </Card>

            <AddAdminToOrgForm
                onSave={handleAddAdminSubmit}
                open={isAddAdminDialogOpen}
                onOpenChange={setIsAddAdminDialogOpen}
            />

             <AlertDialog open={isDemotingAdminDialogOpen} onOpenChange={setIsDemotingAdminDialogOpen}>
                <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Confirmar Rebaixamento</AlertDialogTitle><AlertDialogDescription>Tem certeza que deseja rebaixar o administrador "{adminToDemote?.name}" ({adminToDemote?.email}) para o papel de colaborador? Eles perderão o acesso administrativo.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel onClick={() => setAdminToDemote(null)} disabled={isProcessingAdminAction}>Cancelar</AlertDialogCancel><AlertDialogAction onClick={confirmDemoteAdmin} className="bg-orange-500 text-white hover:bg-orange-600" disabled={isProcessingAdminAction}>{isProcessingAdminAction && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Rebaixar Admin</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
            </AlertDialog>

            <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><DatabaseBackup className="h-5 w-5" /> Backup e Restauração (Mock)</CardTitle><CardDescription>Gerencie backups dos dados do sistema para segurança.</CardDescription></CardHeader>
                <CardContent><div className="mb-4"><Button onClick={handleCreateBackup} disabled={isCreatingBackup || isRestoringBackup || !organizationId}>{isCreatingBackup ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}{isCreatingBackup ? 'Criando Backup...' : 'Criar Backup Agora'}</Button><p className="text-xs text-muted-foreground mt-1">Recomendado fazer backups regularmente.</p></div><Separator className="my-4" /><h4 className="text-sm font-medium mb-2">Histórico de Backups</h4><div className="rounded-md border max-h-60 overflow-y-auto"><Table><TableHeader><TableRow><TableHead><FileClock className="inline-block mr-1 h-4 w-4" /> Data/Hora</TableHead><TableHead>Tamanho</TableHead><TableHead>Iniciado por</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader><TableBody>{isLoadingBackups ? (<TableRow><TableCell colSpan={4} className="text-center py-4"><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></TableCell></TableRow>) : backups.length === 0 ? (<TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-4">Nenhum backup encontrado.</TableCell></TableRow>) : (backups.map(backup => (<TableRow key={backup.id}><TableCell>{backup.timestamp.toLocaleString('pt-BR')}</TableCell><TableCell>{backup.size}</TableCell><TableCell>{backup.initiator}</TableCell><TableCell className="text-right"><Button variant="secondary" size="sm" onClick={() => handleRestoreClick(backup)} disabled={isCreatingBackup || isRestoringBackup} title={`Restaurar a partir deste backup (${backup.timestamp.toLocaleDateString('pt-BR')})`}>{isRestoringBackup && backupToRestore?.id === backup.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Restaurar'}</Button></TableCell></TableRow>)))}</TableBody></Table></div></CardContent>
            </Card>

             <AlertDialog open={!!backupToRestore} onOpenChange={(open) => !open && setBackupToRestore(null)}>
                <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Confirmar Restauração</AlertDialogTitle><AlertDialogDescription>Tem certeza que deseja restaurar o sistema a partir do backup criado em {backupToRestore?.timestamp.toLocaleString('pt-BR')}? <strong className="text-destructive">Esta ação é irreversível e sobrescreverá todos os dados atuais.</strong> O sistema pode ficar indisponível durante o processo.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel onClick={() => setBackupToRestore(null)} disabled={isRestoringBackup}>Cancelar</AlertDialogCancel><AlertDialogAction onClick={confirmRestoreBackup} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={isRestoringBackup}>{isRestoringBackup && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Restaurar Backup (Simulado)</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

