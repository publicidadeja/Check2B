
'use client';

import * as React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useToast } from '@/hooks/use-toast';
import { Loader2, UserPlus, DatabaseBackup, Settings2, UserCog, FileClock, PlusCircle, AlertTriangle, Trash2, UserMinus } from 'lucide-react';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useForm } from 'react-hook-form';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal } from 'lucide-react'; // Removed Trash2 as it's imported above
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useAuth } from '@/hooks/use-auth';
import { getGeneralSettings, saveGeneralSettings, type GeneralSettingsData } from '@/lib/settings-service';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { getFunctions, httpsCallable } from 'firebase/functions'; // For calling Cloud Functions
import { getFirebaseApp } from '@/lib/firebase'; // For initializing Firebase app for functions
import { getUsersByRoleAndOrganization } from '@/lib/user-service'; // For loading admins
import type { UserProfile } from '@/types/user';

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
    const [isAddingAdmin, setIsAddingAdmin] = React.useState(false);
    const [adminToDemote, setAdminToDemote] = React.useState<UserProfile | null>(null);
    const [isDemotingAdmin, setIsDemotingAdmin] = React.useState(false);
    const [newAdminEmail, setNewAdminEmail] = React.useState("");

    const [isLoadingBackups, setIsLoadingBackups] = React.useState(true); // Kept for mock
    const [backups, setBackups] = React.useState<BackupInfo[]>([]); // Kept for mock
    const [isCreatingBackup, setIsCreatingBackup] = React.useState(false); // Kept for mock
    const [isRestoringBackup, setIsRestoringBackup] = React.useState(false); // Kept for mock
    const [backupToRestore, setBackupToRestore] = React.useState<BackupInfo | null>(null); // Kept for mock


    const form = useForm<z.infer<typeof generalSettingsSchema>>({
        resolver: zodResolver(generalSettingsSchema),
        defaultValues: {
            bonusValue: 100,
            zeroLimit: 3,
        },
    });

    React.useEffect(() => {
        const loadInitialData = async () => {
            if (!organizationId || authLoading) {
                if (!authLoading) setIsLoadingPageData(false);
                return;
            }
            setIsLoadingPageData(true);
            try {
                const settings = await getGeneralSettings(organizationId);
                if (settings) {
                    form.reset({
                        bonusValue: settings.bonusValue,
                        zeroLimit: settings.zeroLimit,
                    });
                }
                await loadAdmins(); // Now loads real admins
                loadBackups(); // Still mock
            } catch (error) {
                console.error("Erro ao carregar configurações gerais ou admins:", error);
                toast({ title: "Erro", description: "Não foi possível carregar dados da página.", variant: "destructive" });
            } finally {
                setIsLoadingPageData(false);
            }
        };
        loadInitialData();
    }, [organizationId, authLoading, form, toast]);


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
        if (!organizationId) return;
        setIsLoadingAdmins(true);
        try {
            const data = await getUsersByRoleAndOrganization('admin', organizationId);
            setAdmins(data.filter(admin => admin.uid !== adminUser?.uid)); // Exclude self from list
        } catch (error) {
            toast({ title: "Erro", description: "Falha ao carregar lista de administradores.", variant: "destructive" });
        } finally {
            setIsLoadingAdmins(false);
        }
    }, [organizationId, toast, adminUser?.uid]);

    const handleAddAdmin = async () => {
        if (!newAdminEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newAdminEmail)) {
             toast({ title: "Erro", description: "Por favor, insira um email válido.", variant: "destructive" });
             return;
        }
        if (!firebaseApp || !organizationId) {
            toast({ title: "Erro de Configuração", description: "Firebase ou ID da Organização não disponível.", variant: "destructive" });
            return;
        }
        setIsAddingAdmin(true);
        const functions = getFunctions(firebaseApp);
        const addAdminFunction = httpsCallable(functions, 'addAdminToMyOrg');
        // For addAdminToMyOrg, name and password are also needed.
        // This UI only collects email, so it's a simplified version.
        // For a full implementation, the UI should collect name and initial password.
        // For now, let's assume a simplified Cloud Function or adjust as needed.
        // This example will fail if 'addAdminToMyOrg' strictly requires name and password from client.
        // We need to adjust the UI or the Cloud Function. Let's adjust UI to be simple for now.
        // And assume the CF can handle a simpler input or defaults.
        // Actually, the `addAdminToMyOrg` CF requires name and password.
        // This part of the UI needs a proper form to collect name, email, password.
        // For this iteration, I'll mock the call and show a toast.
        // A full implementation requires a dialog form for new admin details.

        // TODO: Implement a proper dialog form to collect name, email, and password for the new admin.
        // For now, this button won't call the CF correctly.
        toast({ title: "Ação Necessária", description: "Implementar formulário para coletar nome e senha do novo admin.", variant: "default" });
        console.warn("TODO: Implement proper form for adding admin with name and password before calling addAdminToMyOrg CF.");
        // Example of what the call would look like with more data:
        /*
        try {
             await addAdminFunction({ name: "Nome do Novo Admin", email: newAdminEmail, password: "PasswordTemporario123" });
             toast({ title: "Sucesso", description: `Administrador adicionado (requer dados completos).` });
             setNewAdminEmail("");
             await loadAdmins();
        } catch (error: any) {
             toast({ title: "Erro", description: error.message || "Falha ao adicionar administrador.", variant: "destructive" });
        }
        */
        setIsAddingAdmin(false);
    };

     const handleDemoteAdminClick = (admin: UserProfile) => {
        if (admin.uid === adminUser?.uid) {
             toast({ title: "Ação Bloqueada", description: "Você não pode rebaixar a si mesmo.", variant: "destructive" });
             return;
        }
        setAdminToDemote(admin);
        setIsDemotingAdmin(true);
    };

     const confirmDemoteAdmin = async () => {
        if (adminToDemote && firebaseApp && organizationId) {
            const functions = getFunctions(firebaseApp);
            const demoteAdminFunction = httpsCallable(functions, 'demoteAdminInMyOrg');
            try {
                await demoteAdminFunction({ userIdToDemote: adminToDemote.uid });
                toast({ title: "Sucesso", description: `Administrador ${adminToDemote.name} rebaixado para colaborador.` });
                await loadAdmins();
            } catch (error: any) {
                toast({ title: "Erro", description: error.message || "Falha ao rebaixar administrador.", variant: "destructive" });
            } finally {
                setIsDemotingAdmin(false);
                setAdminToDemote(null);
            }
        }
     };

    // --- Backup & Restore (remains mock) ---
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
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><UserCog className="h-5 w-5" /> Gerenciamento de Administradores</CardTitle>
                    <CardDescription>Adicione ou remova outros usuários administrativos para esta organização.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="mb-4 space-y-2">
                        <Label htmlFor="newAdminEmail">Adicionar Novo Administrador (por Email)</Label>
                        <div className="flex gap-2">
                             <Input id="newAdminEmail" type="email" placeholder="email@check2b.com" value={newAdminEmail} onChange={(e) => setNewAdminEmail(e.target.value)} disabled={isAddingAdmin}/>
                             <Button onClick={handleAddAdmin} disabled={isAddingAdmin || !newAdminEmail || !organizationId}>
                                {isAddingAdmin ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />} Adicionar (Formulário Simplificado)
                             </Button>
                        </div>
                         <p className="text-xs text-muted-foreground">Nota: Para adicionar um admin, você precisaria de um formulário completo (nome, email, senha). Esta é uma UI simplificada para teste.</p>
                    </div>
                     <Separator className="my-4" />
                     <h4 className="text-sm font-medium mb-2">Administradores Atuais (Exceto Você)</h4>
                     <div className="rounded-md border">
                        <Table>
                             <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Email</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
                             <TableBody>
                                {isLoadingAdmins ? (<TableRow><TableCell colSpan={3} className="text-center py-4"><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></TableCell></TableRow>
                                ) : admins.length === 0 ? (<TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-4">Nenhum outro administrador encontrado.</TableCell></TableRow>
                                ) : (admins.map(admin => (
                                        <TableRow key={admin.uid}><TableCell className="font-medium">{admin.name}</TableCell><TableCell>{admin.email}</TableCell><TableCell className="text-right">
                                             <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /><span className="sr-only">Ações</span></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => handleDemoteAdminClick(admin)} className="text-orange-600 focus:text-orange-700 focus:bg-orange-50"><UserMinus className="mr-2 h-4 w-4" /> Rebaixar para Colaborador</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
                                         </TableCell></TableRow>)))}</TableBody></Table></div></CardContent>
            </Card>

             <AlertDialog open={isDemotingAdmin} onOpenChange={setIsDemotingAdmin}>
                <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Confirmar Rebaixamento</AlertDialogTitle><AlertDialogDescription>Tem certeza que deseja rebaixar o administrador "{adminToDemote?.name}" ({adminToDemote?.email}) para o papel de colaborador? Eles perderão o acesso administrativo.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel onClick={() => setAdminToDemote(null)}>Cancelar</AlertDialogCancel><AlertDialogAction onClick={confirmDemoteAdmin} className="bg-orange-500 text-white hover:bg-orange-600">Rebaixar Admin</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
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

