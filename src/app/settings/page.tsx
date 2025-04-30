'use client';

import * as React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useToast } from '@/hooks/use-toast';
import { Loader2, UserPlus, DatabaseBackup, Settings2, UserCog, FileClock, PlusCircle } from 'lucide-react'; // Added PlusCircle
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useForm } from 'react-hook-form';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

// --- General Settings ---
const generalSettingsSchema = z.object({
    bonusValue: z.coerce.number().min(0, "Valor não pode ser negativo.").default(100),
    zeroLimit: z.coerce.number().int("Deve ser um número inteiro.").min(0, "Limite não pode ser negativo.").default(3),
});
type GeneralSettingsFormData = z.infer<typeof generalSettingsSchema>;

// --- Admin Management ---
interface AdminUser {
    id: string;
    name: string;
    email: string;
    lastLogin?: Date;
}
// Mock Admin Users
const mockAdmins: AdminUser[] = [
    { id: 'admin1', name: 'Admin Principal', email: 'admin@check2b.com', lastLogin: new Date(Date.now() - 86400000) }, // Yesterday
    { id: 'admin2', name: 'Joana Silva RH', email: 'joana.rh@check2b.com', lastLogin: new Date(Date.now() - 3600000) }, // 1 hour ago
];
// Mock API for Admins (Simplified)
const fetchAdmins = async (): Promise<AdminUser[]> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return [...mockAdmins];
}
const addAdminUser = async (email: string): Promise<AdminUser> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    // In a real app, this would send an invite or create the user
    const newAdmin: AdminUser = { id: `admin${Date.now()}`, name: `Novo Admin (${email.split('@')[0]})`, email: email };
    mockAdmins.push(newAdmin);
    console.log("Admin adicionado (simulado):", newAdmin);
    return newAdmin;
}
const removeAdminUser = async (adminId: string): Promise<void> => {
     await new Promise(resolve => setTimeout(resolve, 500));
     if (adminId === 'admin1') throw new Error("Não é possível remover o administrador principal."); // Safeguard
     const index = mockAdmins.findIndex(a => a.id === adminId);
     if (index !== -1) {
        mockAdmins.splice(index, 1);
        console.log("Admin removido (simulado):", adminId);
     } else {
        throw new Error("Admin não encontrado.");
     }
}


// --- Backup/Restore ---
interface BackupInfo {
    id: string;
    timestamp: Date;
    size: string; // e.g., "15.2 MB"
    initiator: string; // Admin user who initiated
}
// Mock Backup History
const mockBackups: BackupInfo[] = [
    { id: 'bkp1', timestamp: new Date(Date.now() - 7 * 86400000), size: '14.8 MB', initiator: 'Admin Principal' },
    { id: 'bkp2', timestamp: new Date(Date.now() - 1 * 86400000), size: '15.2 MB', initiator: 'System' },
];
// Mock API for Backup
const createBackup = async (initiator: string): Promise<BackupInfo> => {
     await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate longer process
     const newBackup: BackupInfo = {
         id: `bkp${Date.now()}`,
         timestamp: new Date(),
         size: `${(15 + Math.random()).toFixed(1)} MB`, // Random size
         initiator: initiator,
     };
     mockBackups.push(newBackup);
     console.log("Backup criado (simulado):", newBackup);
     return newBackup;
}
const restoreBackup = async (backupId: string): Promise<void> => {
     await new Promise(resolve => setTimeout(resolve, 3000)); // Simulate very long process
     console.log("Restaurando backup (simulado):", backupId);
     // No actual state change in mock, just log
}


export default function SettingsPage() {
    const { toast } = useToast();
    const [isLoadingGeneral, setIsLoadingGeneral] = React.useState(false);
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


    // Load initial settings values (replace with API call)
    const [initialBonusValue] = React.useState(100.00);
    const [initialZeroLimit] = React.useState(3);

    const form = useForm<GeneralSettingsFormData>({
        resolver: zodResolver(generalSettingsSchema),
        defaultValues: {
            bonusValue: initialBonusValue,
            zeroLimit: initialZeroLimit,
        },
    });

    const handleSaveGeneralSettings = async (data: GeneralSettingsFormData) => {
        setIsLoadingGeneral(true);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log("Salvando config geral:", data);
        // Update initial values on success (in a real app, re-fetch or trust saved data)
        // setInitialBonusValue(data.bonusValue);
        // setInitialZeroLimit(data.zeroLimit);
        toast({
            title: "Sucesso!",
            description: "Configurações gerais salvas.",
        });
        form.reset(data); // Reset form with saved values to clear dirty state
        setIsLoadingGeneral(false);
    };

    // Load Admins
    const loadAdmins = React.useCallback(async () => {
        setIsLoadingAdmins(true);
        try {
            const data = await fetchAdmins();
            setAdmins(data);
        } catch (error) {
            console.error("Falha ao carregar admins:", error);
            toast({ title: "Erro", description: "Falha ao carregar lista de administradores.", variant: "destructive" });
        } finally {
            setIsLoadingAdmins(false);
        }
    }, [toast]);

    React.useEffect(() => {
        loadAdmins();
    }, [loadAdmins]);

    // Handle Add Admin
    const handleAddAdmin = async () => {
        if (!newAdminEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newAdminEmail)) {
             toast({ title: "Erro", description: "Por favor, insira um email válido.", variant: "destructive" });
             return;
        }
        setIsAddingAdmin(true);
        try {
             await addAdminUser(newAdminEmail);
             toast({ title: "Sucesso", description: `Convite enviado para ${newAdminEmail} (simulado).` });
             setNewAdminEmail(""); // Clear input
             await loadAdmins(); // Refresh list
        } catch (error) {
             console.error("Falha ao adicionar admin:", error);
             toast({ title: "Erro", description: "Falha ao adicionar administrador.", variant: "destructive" });
        } finally {
             setIsAddingAdmin(false);
        }
    };

    // Handle Remove Admin
     const handleDeleteAdminClick = (admin: AdminUser) => {
        if (admin.id === 'admin1') { // Prevent deleting primary admin
             toast({ title: "Ação Bloqueada", description: "Não é possível remover o administrador principal.", variant: "destructive" });
             return;
        }
        setAdminToRemove(admin);
        setIsDeletingAdmin(true);
    };

     const confirmDeleteAdmin = async () => {
        if (adminToRemove) {
            try {
                await removeAdminUser(adminToRemove.id);
                toast({ title: "Sucesso", description: `Administrador ${adminToRemove.name} removido.` });
                await loadAdmins();
            } catch (error: any) {
                console.error("Falha ao remover admin:", error);
                toast({ title: "Erro", description: error.message || "Falha ao remover administrador.", variant: "destructive" });
            } finally {
                setIsDeletingAdmin(false);
                setAdminToRemove(null);
            }
        }
     };


    // Load Backups
    const loadBackups = React.useCallback(async () => {
        setIsLoadingBackups(true);
        try {
            // Simulate fetching - in real app, call API
            await new Promise(resolve => setTimeout(resolve, 400));
            setBackups([...mockBackups].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())); // Sort newest first
        } catch (error) {
            console.error("Falha ao carregar backups:", error);
            toast({ title: "Erro", description: "Falha ao carregar histórico de backups.", variant: "destructive" });
        } finally {
            setIsLoadingBackups(false);
        }
    }, [toast]);

    React.useEffect(() => {
        loadBackups();
    }, [loadBackups]);

    // Handle Create Backup
    const handleCreateBackup = async () => {
        setIsCreatingBackup(true);
        try {
            await createBackup("Usuário Admin"); // Pass current admin user
            toast({ title: "Sucesso", description: "Backup criado com sucesso." });
            await loadBackups(); // Refresh list
        } catch (error) {
             console.error("Falha ao criar backup:", error);
             toast({ title: "Erro", description: "Falha ao criar backup.", variant: "destructive" });
        } finally {
             setIsCreatingBackup(false);
        }
    };

    // Handle Restore Backup
     const handleRestoreClick = (backup: BackupInfo) => {
        setBackupToRestore(backup);
    };

     const confirmRestoreBackup = async () => {
        if (backupToRestore) {
             setIsRestoringBackup(true);
             try {
                 await restoreBackup(backupToRestore.id);
                 toast({ title: "Restauração Iniciada", description: `Restaurando a partir do backup de ${backupToRestore.timestamp.toLocaleString()}. O sistema pode ficar indisponível brevemente.`, duration: 5000 });
                 // Optionally, you might want to disable parts of the UI during restore
             } catch (error) {
                 console.error("Falha ao restaurar backup:", error);
                 toast({ title: "Erro", description: "Falha ao iniciar a restauração do backup.", variant: "destructive" });
             } finally {
                 setIsRestoringBackup(false);
                 setBackupToRestore(null);
                 // Might need to reload the page or app state after restore
             }
        }
     };


    return (
        <div className="space-y-6">
            <Card>
                 <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSaveGeneralSettings)}>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Settings2 className="h-5 w-5" /> Configurações Gerais</CardTitle>
                            <CardDescription>Ajuste as configurações globais do sistema Check2B.</CardDescription>
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
                            <Separator />
                            {/* Adicionar mais configurações gerais aqui se necessário */}
                        </CardContent>
                        <CardFooter>
                            <Button type="submit" disabled={isLoadingGeneral || !form.formState.isDirty}>
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
                    <CardDescription>Adicione ou remova outros usuários administrativos.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="mb-4 space-y-2">
                        <Label htmlFor="newAdminEmail">Adicionar Novo Administrador (por Email)</Label>
                        <div className="flex gap-2">
                             <Input
                                id="newAdminEmail"
                                type="email"
                                placeholder="email@check2b.com"
                                value={newAdminEmail}
                                onChange={(e) => setNewAdminEmail(e.target.value)}
                                disabled={isAddingAdmin}
                             />
                             <Button onClick={handleAddAdmin} disabled={isAddingAdmin || !newAdminEmail}>
                                {isAddingAdmin ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                                Adicionar
                             </Button>
                        </div>
                    </div>
                     <Separator className="my-4" />
                     <h4 className="text-sm font-medium mb-2">Administradores Atuais</h4>
                     <div className="rounded-md border">
                        <Table>
                             <TableHeader>
                                <TableRow>
                                    <TableHead>Nome</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Último Login</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                             <TableBody>
                                {isLoadingAdmins ? (
                                    <TableRow><TableCell colSpan={4} className="text-center py-4"><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></TableCell></TableRow>
                                ) : admins.length === 0 ? (
                                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-4">Nenhum administrador encontrado.</TableCell></TableRow>
                                ) : (
                                    admins.map(admin => (
                                        <TableRow key={admin.id}>
                                            <TableCell className="font-medium">{admin.name}</TableCell>
                                            <TableCell>{admin.email}</TableCell>
                                             <TableCell>{admin.lastLogin ? admin.lastLogin.toLocaleString('pt-BR') : 'Nunca'}</TableCell>
                                             <TableCell className="text-right">
                                                {admin.id !== 'admin1' && ( // Don't allow actions on primary admin
                                                     <DropdownMenu>
                                                         <DropdownMenuTrigger asChild>
                                                             <Button variant="ghost" size="icon" className="h-8 w-8">
                                                                 <MoreHorizontal className="h-4 w-4" />
                                                                 <span className="sr-only">Ações</span>
                                                             </Button>
                                                         </DropdownMenuTrigger>
                                                         <DropdownMenuContent align="end">
                                                             {/* Add other actions like 'Edit Permissions' later */}
                                                             <DropdownMenuItem
                                                                 onClick={() => handleDeleteAdminClick(admin)}
                                                                 className="text-destructive focus:text-destructive focus:bg-destructive/10"
                                                             >
                                                                 <Trash2 className="mr-2 h-4 w-4" /> Remover Acesso
                                                             </DropdownMenuItem>
                                                         </DropdownMenuContent>
                                                     </DropdownMenu>
                                                 )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                     </div>
                </CardContent>
            </Card>

             {/* Admin Deletion Confirmation */}
             <AlertDialog open={isDeletingAdmin} onOpenChange={setIsDeletingAdmin}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar Remoção de Acesso</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tem certeza que deseja remover o acesso administrativo para "{adminToRemove?.name}" ({adminToRemove?.email})?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setAdminToRemove(null)}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDeleteAdmin} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Remover Acesso
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><DatabaseBackup className="h-5 w-5" /> Backup e Restauração</CardTitle>
                    <CardDescription>Gerencie backups dos dados do sistema para segurança.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="mb-4">
                         <Button onClick={handleCreateBackup} disabled={isCreatingBackup || isRestoringBackup}>
                            {isCreatingBackup ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                            {isCreatingBackup ? 'Criando Backup...' : 'Criar Backup Agora'}
                         </Button>
                         <p className="text-xs text-muted-foreground mt-1">Recomendado fazer backups regularmente.</p>
                    </div>
                    <Separator className="my-4" />
                     <h4 className="text-sm font-medium mb-2">Histórico de Backups</h4>
                     <div className="rounded-md border max-h-60 overflow-y-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead><FileClock className="inline-block mr-1 h-4 w-4" /> Data/Hora</TableHead>
                                    <TableHead>Tamanho</TableHead>
                                    <TableHead>Iniciado por</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                 {isLoadingBackups ? (
                                     <TableRow><TableCell colSpan={4} className="text-center py-4"><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></TableCell></TableRow>
                                 ) : backups.length === 0 ? (
                                     <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-4">Nenhum backup encontrado.</TableCell></TableRow>
                                 ) : (
                                     backups.map(backup => (
                                        <TableRow key={backup.id}>
                                            <TableCell>{backup.timestamp.toLocaleString('pt-BR')}</TableCell>
                                            <TableCell>{backup.size}</TableCell>
                                            <TableCell>{backup.initiator}</TableCell>
                                            <TableCell className="text-right">
                                                 <Button
                                                    variant="secondary"
                                                    size="sm"
                                                    onClick={() => handleRestoreClick(backup)}
                                                    disabled={isCreatingBackup || isRestoringBackup}
                                                    title={`Restaurar a partir deste backup (${backup.timestamp.toLocaleDateString('pt-BR')})`}
                                                 >
                                                    {isRestoringBackup && backupToRestore?.id === backup.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Restaurar'}
                                                 </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

             {/* Backup Restore Confirmation */}
             <AlertDialog open={!!backupToRestore} onOpenChange={(open) => !open && setBackupToRestore(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar Restauração</AlertDialogTitle>
                        <AlertDialogDescription>
                             Tem certeza que deseja restaurar o sistema a partir do backup criado em {backupToRestore?.timestamp.toLocaleString('pt-BR')}? <strong className="text-destructive">Esta ação é irreversível e sobrescreverá todos os dados atuais.</strong> O sistema pode ficar indisponível durante o processo.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setBackupToRestore(null)} disabled={isRestoringBackup}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmRestoreBackup} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={isRestoringBackup}>
                             {isRestoringBackup && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Restaurar Backup
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

        </div>
    );
}
