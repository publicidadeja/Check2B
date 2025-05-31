
'use client';

import * as React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useToast } from '@/hooks/use-toast';
import { Loader2, UserPlus, DatabaseBackup, Settings2, UserCog, FileClock, PlusCircle, AlertTriangle } from 'lucide-react';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useForm } from 'react-hook-form';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useAuth } from '@/hooks/use-auth';
import { getGeneralSettings, saveGeneralSettings, type GeneralSettingsData } from '@/lib/settings-service'; // Import new service
import { LoadingSpinner } from '@/components/ui/loading-spinner';

// --- Schemas and Types ---
const generalSettingsSchema = z.object({
    bonusValue: z.coerce.number().min(0, "Valor não pode ser negativo.").default(100),
    zeroLimit: z.coerce.number().int("Deve ser um número inteiro.").min(0, "Limite não pode ser negativo.").default(3),
});
// Removed GeneralSettingsFormData type as it's directly inferred and GeneralSettingsData from service is more accurate for fetched data

interface AdminUser {
    id: string;
    name: string;
    email: string;
    lastLogin?: Date;
}

interface BackupInfo {
    id: string;
    timestamp: Date;
    size: string;
    initiator: string;
}

// --- Mock Data & API Functions (Admin & Backup parts remain mock for now) ---
const mockAdmins: AdminUser[] = [
    { id: 'admin1', name: 'Admin Principal', email: 'admin@check2b.com', lastLogin: new Date(Date.now() - 86400000) },
    { id: 'admin2', name: 'Joana Silva RH', email: 'joana.rh@check2b.com', lastLogin: new Date(Date.now() - 3600000) },
];
const fetchAdmins = async (): Promise<AdminUser[]> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return [...mockAdmins];
}
const addAdminUser = async (email: string): Promise<AdminUser> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    const newAdmin: AdminUser = { id: `admin${Date.now()}`, name: `Novo Admin (${email.split('@')[0]})`, email: email };
    mockAdmins.push(newAdmin);
    console.log("Admin adicionado (simulado):", newAdmin);
    alert(`Mock admin ${newAdmin.name} added. REMEMBER TO SET CUSTOM CLAIMS (role=admin) IN FIREBASE AUTH!`);
    return newAdmin;
}
const removeAdminUser = async (adminId: string): Promise<void> => {
     await new Promise(resolve => setTimeout(resolve, 500));
     if (adminId === 'admin1') throw new Error("Não é possível remover o administrador principal.");
     const index = mockAdmins.findIndex(a => a.id === adminId);
     if (index !== -1) {
        mockAdmins.splice(index, 1);
        console.log("Admin removido (simulado):", adminId);
        alert(`Mock admin access removed. REMEMBER TO REMOVE CUSTOM CLAIMS OR DISABLE IN FIREBASE AUTH!`);
     } else {
        throw new Error("Admin não encontrado.");
     }
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
    const { organizationId, isLoading: authLoading, role: adminAuthRole } = useAuth();
    const [isLoadingGeneral, setIsLoadingGeneral] = React.useState(false); // Kept for general settings save
    const [isLoadingPageData, setIsLoadingPageData] = React.useState(true); // For initial data load

    const [isLoadingAdmins, setIsLoadingAdmins] = React.useState(true);
    const [isLoadingBackups, setIsLoadingBackups] = React.useState(true);
    const [admins, setAdmins] = React.useState<AdminUser[]>([]);
    const [backups, setBackups] = React.useState<BackupInfo[]>([]);
    const [isAddingAdmin, setIsAddingAdmin] = React.useState(false);
    const [adminToRemove, setAdminToRemove] = React.useState<AdminUser | null>(null);
    const [isDeletingAdmin, setIsDeletingAdmin] = React.useState(false);
    const [newAdminEmail, setNewAdminEmail] = React.useState("");
    const [isCreatingBackup, setIsCreatingBackup] = React.useState(false);
    const [isRestoringBackup, setIsRestoringBackup] = React.useState(false);
    const [backupToRestore, setBackupToRestore] = React.useState<BackupInfo | null>(null);

    const form = useForm<z.infer<typeof generalSettingsSchema>>({ // Use zod infer for form type
        resolver: zodResolver(generalSettingsSchema),
        defaultValues: {
            bonusValue: 100,
            zeroLimit: 3,
        },
    });

    // Load general settings
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
                // Keep loading mock data for other sections for now
                loadAdmins();
                loadBackups();
            } catch (error) {
                console.error("Erro ao carregar configurações gerais:", error);
                toast({ title: "Erro", description: "Não foi possível carregar as configurações gerais.", variant: "destructive" });
            } finally {
                setIsLoadingPageData(false);
            }
        };
        loadInitialData();
    }, [organizationId, authLoading, form, toast]);


    // --- General Settings ---
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

    // --- Admin Management (remains mock) ---
    const loadAdmins = React.useCallback(async () => {
        setIsLoadingAdmins(true);
        try {
            const data = await fetchAdmins();
            setAdmins(data);
        } catch (error) {
            toast({ title: "Erro", description: "Falha ao carregar lista de administradores.", variant: "destructive" });
        } finally {
            setIsLoadingAdmins(false);
        }
    }, [toast]);

    const handleAddAdmin = async () => { /* ... unchanged mock ... */ 
        if (!newAdminEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newAdminEmail)) {
             toast({ title: "Erro", description: "Por favor, insira um email válido.", variant: "destructive" });
             return;
        }
        setIsAddingAdmin(true);
        try {
             await addAdminUser(newAdminEmail);
             toast({ title: "Sucesso", description: `Convite enviado para ${newAdminEmail} (simulado).` });
             setNewAdminEmail("");
             await loadAdmins();
        } catch (error) {
             toast({ title: "Erro", description: "Falha ao adicionar administrador.", variant: "destructive" });
        } finally {
             setIsAddingAdmin(false);
        }
    };
     const handleDeleteAdminClick = (admin: AdminUser) => { /* ... unchanged mock ... */ 
        if (admin.id === 'admin1') {
             toast({ title: "Ação Bloqueada", description: "Não é possível remover o administrador principal.", variant: "destructive" });
             return;
        }
        setAdminToRemove(admin);
        setIsDeletingAdmin(true);
    };
     const confirmDeleteAdmin = async () => { /* ... unchanged mock ... */ 
        if (adminToRemove) {
            try {
                await removeAdminUser(adminToRemove.id);
                toast({ title: "Sucesso", description: `Administrador ${adminToRemove.name} removido.` });
                await loadAdmins();
            } catch (error: any) {
                toast({ title: "Erro", description: error.message || "Falha ao remover administrador.", variant: "destructive" });
            } finally {
                setIsDeletingAdmin(false);
                setAdminToRemove(null);
            }
        }
     };

    // --- Backup & Restore (remains mock) ---
    const loadBackups = React.useCallback(async () => { /* ... unchanged mock ... */ 
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

    const handleCreateBackup = async () => { /* ... unchanged mock ... */ 
        setIsCreatingBackup(true);
        try {
            await createBackup("Usuário Admin");
            toast({ title: "Sucesso", description: "Backup criado com sucesso." });
            await loadBackups();
        } catch (error) {
             toast({ title: "Erro", description: "Falha ao criar backup.", variant: "destructive" });
        } finally {
             setIsCreatingBackup(false);
        }
    };
     const handleRestoreClick = (backup: BackupInfo) => { /* ... unchanged mock ... */ 
        setBackupToRestore(backup);
    };
     const confirmRestoreBackup = async () => { /* ... unchanged mock ... */ 
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

            {/* Admin Management Card (Mock) */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><UserCog className="h-5 w-5" /> Gerenciamento de Administradores (Mock)</CardTitle>
                    <CardDescription>Adicione ou remova outros usuários administrativos para esta organização.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="mb-4 space-y-2">
                        <Label htmlFor="newAdminEmail">Adicionar Novo Administrador (por Email)</Label>
                        <div className="flex gap-2">
                             <Input id="newAdminEmail" type="email" placeholder="email@check2b.com" value={newAdminEmail} onChange={(e) => setNewAdminEmail(e.target.value)} disabled={isAddingAdmin}/>
                             <Button onClick={handleAddAdmin} disabled={isAddingAdmin || !newAdminEmail || !organizationId}>
                                {isAddingAdmin ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />} Adicionar
                             </Button>
                        </div>
                         <p className="text-xs text-muted-foreground">Lembre-se de definir as permissões (claims) no Firebase para usuários adicionados.</p>
                    </div>
                     <Separator className="my-4" />
                     <h4 className="text-sm font-medium mb-2">Administradores Atuais</h4>
                     <div className="rounded-md border">
                        <Table>
                             <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Email</TableHead><TableHead>Último Login</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
                             <TableBody>
                                {isLoadingAdmins ? (<TableRow><TableCell colSpan={4} className="text-center py-4"><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></TableCell></TableRow>
                                ) : admins.length === 0 ? (<TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-4">Nenhum administrador encontrado.</TableCell></TableRow>
                                ) : (admins.map(admin => (
                                        <TableRow key={admin.id}><TableCell className="font-medium">{admin.name}</TableCell><TableCell>{admin.email}</TableCell><TableCell>{admin.lastLogin ? admin.lastLogin.toLocaleString('pt-BR') : 'Nunca'}</TableCell><TableCell className="text-right">
                                                {admin.id !== 'admin1' && (
                                                     <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /><span className="sr-only">Ações</span></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => handleDeleteAdminClick(admin)} className="text-destructive focus:text-destructive focus:bg-destructive/10"><Trash2 className="mr-2 h-4 w-4" /> Remover Acesso</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
                                                 )}</TableCell></TableRow>)))}</TableBody></Table></div></CardContent>
            </Card>

            {/* Admin Deletion Confirmation (Mock) */}
             <AlertDialog open={isDeletingAdmin} onOpenChange={setIsDeletingAdmin}>
                <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Confirmar Remoção de Acesso</AlertDialogTitle><AlertDialogDescription>Tem certeza que deseja remover o acesso administrativo para "{adminToRemove?.name}" ({adminToRemove?.email})? <strong className='text-destructive'>Lembre-se de remover as permissões (claims) ou desabilitar o usuário no Firebase.</strong></AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel onClick={() => setAdminToRemove(null)}>Cancelar</AlertDialogCancel><AlertDialogAction onClick={confirmDeleteAdmin} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Remover Acesso (Mock)</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
            </AlertDialog>

            {/* Backup and Restore Card (Mock) */}
            <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><DatabaseBackup className="h-5 w-5" /> Backup e Restauração (Mock)</CardTitle><CardDescription>Gerencie backups dos dados do sistema para segurança.</CardDescription></CardHeader>
                <CardContent><div className="mb-4"><Button onClick={handleCreateBackup} disabled={isCreatingBackup || isRestoringBackup || !organizationId}>{isCreatingBackup ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}{isCreatingBackup ? 'Criando Backup...' : 'Criar Backup Agora'}</Button><p className="text-xs text-muted-foreground mt-1">Recomendado fazer backups regularmente.</p></div><Separator className="my-4" /><h4 className="text-sm font-medium mb-2">Histórico de Backups</h4><div className="rounded-md border max-h-60 overflow-y-auto"><Table><TableHeader><TableRow><TableHead><FileClock className="inline-block mr-1 h-4 w-4" /> Data/Hora</TableHead><TableHead>Tamanho</TableHead><TableHead>Iniciado por</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader><TableBody>{isLoadingBackups ? (<TableRow><TableCell colSpan={4} className="text-center py-4"><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></TableCell></TableRow>) : backups.length === 0 ? (<TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-4">Nenhum backup encontrado.</TableCell></TableRow>) : (backups.map(backup => (<TableRow key={backup.id}><TableCell>{backup.timestamp.toLocaleString('pt-BR')}</TableCell><TableCell>{backup.size}</TableCell><TableCell>{backup.initiator}</TableCell><TableCell className="text-right"><Button variant="secondary" size="sm" onClick={() => handleRestoreClick(backup)} disabled={isCreatingBackup || isRestoringBackup} title={`Restaurar a partir deste backup (${backup.timestamp.toLocaleDateString('pt-BR')})`}>{isRestoringBackup && backupToRestore?.id === backup.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Restaurar'}</Button></TableCell></TableRow>)))}</TableBody></Table></div></CardContent>
            </Card>

            {/* Backup Restore Confirmation (Mock) */}
             <AlertDialog open={!!backupToRestore} onOpenChange={(open) => !open && setBackupToRestore(null)}>
                <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Confirmar Restauração</AlertDialogTitle><AlertDialogDescription>Tem certeza que deseja restaurar o sistema a partir do backup criado em {backupToRestore?.timestamp.toLocaleString('pt-BR')}? <strong className="text-destructive">Esta ação é irreversível e sobrescreverá todos os dados atuais.</strong> O sistema pode ficar indisponível durante o processo.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel onClick={() => setBackupToRestore(null)} disabled={isRestoringBackup}>Cancelar</AlertDialogCancel><AlertDialogAction onClick={confirmRestoreBackup} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={isRestoringBackup}>{isRestoringBackup && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Restaurar Backup (Simulado)</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
