'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PlusCircle, Edit, Trash2, KeyRound, ShieldCheck, UserPlus } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

interface AdminUser {
    id: string;
    name: string;
    email: string;
    isActive: boolean;
    // Add permission levels if needed, e.g., 'full', 'evaluator_only'
    // permissionLevel: string;
    lastLogin?: string; // Optional: Display last login time
}

// Mock API functions - Replace with actual API calls
async function getAllAdmins(): Promise<AdminUser[]> {
    console.log("Fetching admin users...");
    await new Promise(resolve => setTimeout(resolve, 500));
    return [
        { id: 'admin1', name: 'Admin Principal', email: 'admin@checkinbonus.com', isActive: true, lastLogin: '2024-07-27 10:00' },
        { id: 'admin2', name: 'Supervisor RH', email: 'rh.supervisor@checkinbonus.com', isActive: true },
        { id: 'admin3', name: 'Gerente Vendas', email: 'vendas.gerente@checkinbonus.com', isActive: false },
    ];
}

async function addAdminUser(userData: Omit<AdminUser, 'id' | 'lastLogin'>): Promise<AdminUser> {
     console.log("Adding admin user:", userData);
     await new Promise(resolve => setTimeout(resolve, 300));
     const newAdmin: AdminUser = { ...userData, id: String(Date.now()), isActive: true }; // Default to active
     return newAdmin;
}

async function updateAdminUser(id: string, userData: Partial<AdminUser>): Promise<AdminUser> {
    console.log("Updating admin user:", id, userData);
    await new Promise(resolve => setTimeout(resolve, 300));
    // In a real scenario, fetch the user and merge updates
    const existingUser = (await getAllAdmins()).find(a => a.id === id) || { id, name: '', email: '', isActive: false};
    return { ...existingUser, ...userData };
}

async function deleteAdminUser(id: string): Promise<void> {
     console.log("Deleting admin user:", id);
     await new Promise(resolve => setTimeout(resolve, 300));
}

async function resetAdminPassword(id: string): Promise<void> {
    console.log("Resetting password for admin:", id);
    await new Promise(resolve => setTimeout(resolve, 300));
    // This would trigger a password reset email flow in a real app
}


export default function AdminsPage() {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [selectedAdmin, setSelectedAdmin] = useState<AdminUser | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    async function loadAdmins() {
      setIsLoading(true);
      try {
        const fetchedAdmins = await getAllAdmins();
        setAdmins(fetchedAdmins);
      } catch (error) {
        console.error("Failed to fetch admins:", error);
         toast({ title: "Erro", description: "Falha ao carregar administradores.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    }
    loadAdmins();
  }, [toast]);

  const handleEdit = (admin: AdminUser) => {
    setSelectedAdmin(admin);
    setIsEditDialogOpen(true);
  };

  const handleDelete = (admin: AdminUser) => {
    setSelectedAdmin(admin);
    setIsDeleteDialogOpen(true);
  };

  const handleResetPassword = (admin: AdminUser) => {
    setSelectedAdmin(admin);
    setIsResetDialogOpen(true);
  }

   const handleConfirmDelete = async () => {
    if (!selectedAdmin) return;
    // Prevent deleting the main admin or self? Add logic here.
    // if (selectedAdmin.id === 'admin1' /* or currentUser.id */) { ... }
    setIsLoading(true);
    try {
      await deleteAdminUser(selectedAdmin.id);
      setAdmins(admins.filter(adm => adm.id !== selectedAdmin.id));
      toast({ title: "Sucesso", description: `Administrador "${selectedAdmin.name}" excluído.` });
      setIsDeleteDialogOpen(false);
      setSelectedAdmin(null);
    } catch (error) {
      console.error("Failed to delete admin:", error);
      toast({ title: "Erro", description: "Falha ao excluir administrador.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

    const handleConfirmResetPassword = async () => {
        if (!selectedAdmin) return;
        setIsLoading(true);
        try {
            await resetAdminPassword(selectedAdmin.id);
            toast({ title: "Sucesso", description: `Instruções para redefinição de senha enviadas para ${selectedAdmin.email}.` });
            setIsResetDialogOpen(false);
            setSelectedAdmin(null);
        } catch (error) {
            console.error("Failed to reset password:", error);
            toast({ title: "Erro", description: "Falha ao iniciar redefinição de senha.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

   const handleAddAdmin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const newAdminData: Omit<AdminUser, 'id' | 'lastLogin' | 'isActive'> = {
        name: formData.get('name') as string,
        email: formData.get('email') as string,
        // permissionLevel: formData.get('permissionLevel') as string, // If implemented
    };

    if (!newAdminData.name.trim() || !newAdminData.email.trim()) {
         toast({ title: "Erro", description: "Nome e email são obrigatórios.", variant: "destructive" });
        return;
    }
     // Basic email validation
    if (!/\S+@\S+\.\S+/.test(newAdminData.email)) {
         toast({ title: "Erro", description: "Formato de email inválido.", variant: "destructive" });
        return;
    }

    setIsLoading(true);
    try {
        const addedAdmin = await addAdminUser({ ...newAdminData, isActive: true }); // Pass isActive here if needed by API
        setAdmins([...admins, addedAdmin]);
        toast({ title: "Sucesso", description: `Administrador "${addedAdmin.name}" adicionado. Um email de boas-vindas/configuração de senha foi enviado.` });
        setIsAddDialogOpen(false);
    } catch (error) {
        console.error("Failed to add admin:", error);
        // Check for specific errors like duplicate email
        toast({ title: "Erro", description: "Falha ao adicionar administrador. Verifique se o email já existe.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

   const handleUpdateAdmin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedAdmin) return;

    const formData = new FormData(event.currentTarget);
    const name = formData.get('edit-name') as string;
    const email = formData.get('edit-email') as string;
    // isActive state is handled separately by the switch

     if (!name.trim() || !email.trim()) {
        toast({ title: "Erro", description: "Nome e email são obrigatórios.", variant: "destructive" });
        return;
    }
     if (!/\S+@\S+\.\S+/.test(email)) {
         toast({ title: "Erro", description: "Formato de email inválido.", variant: "destructive" });
        return;
    }

    const updatedData: Partial<AdminUser> = { name, email };

    setIsLoading(true);
    try {
        const updatedAdmin = await updateAdminUser(selectedAdmin.id, updatedData);
        setAdmins(admins.map(adm =>
            adm.id === updatedAdmin.id ? { ...adm, ...updatedAdmin } : adm // Update local state keeping isActive
        ));
         toast({ title: "Sucesso", description: `Administrador "${updatedAdmin.name}" atualizado.` });
        setIsEditDialogOpen(false);
        setSelectedAdmin(null);
     } catch (error) {
        console.error("Failed to update admin:", error);
        toast({ title: "Erro", description: "Falha ao atualizar administrador.", variant: "destructive" });
     } finally {
       setIsLoading(false);
     }
  };

  const handleActiveChange = async (adminId: string, checked: boolean) => {
      setIsLoading(true);
       // Optimistic UI update
      setAdmins(prevAdmins =>
          prevAdmins.map(adm =>
              adm.id === adminId ? { ...adm, isActive: checked } : adm
          )
      );
      try {
        await updateAdminUser(adminId, { isActive: checked });
         toast({ title: "Sucesso", description: `Status do administrador atualizado.` });
      } catch (error) {
         console.error("Failed to update admin status:", error);
         toast({ title: "Erro", description: "Falha ao atualizar status do administrador.", variant: "destructive" });
         // Revert optimistic update on error
          setAdmins(prevAdmins =>
            prevAdmins.map(adm =>
                adm.id === adminId ? { ...adm, isActive: !checked } : adm
            )
         );
      } finally {
         setIsLoading(false);
      }
  };


  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Gerenciamento de Administradores</CardTitle>
          <CardDescription>Adicione, edite ou remova contas de administradores.</CardDescription>
        </div>
         <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
           <DialogTrigger asChild>
            <Button size="sm" className="gap-1" disabled={isLoading}>
              <UserPlus className="h-4 w-4" />
              Adicionar Admin
            </Button>
          </DialogTrigger>
           <DialogContent className="sm:max-w-[425px]">
             <DialogHeader>
               <DialogTitle>Adicionar Novo Administrador</DialogTitle>
               <DialogDescription>
                 Preencha os dados do novo administrador.
               </DialogDescription>
             </DialogHeader>
              <form onSubmit={handleAddAdmin}>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-right">
                      Nome
                    </Label>
                    <Input id="name" name="name" required className="col-span-3" />
                  </div>
                   <div className="grid grid-cols-4 items-center gap-4">
                     <Label htmlFor="email" className="text-right">
                       Email
                     </Label>
                     <Input id="email" name="email" type="email" required className="col-span-3" />
                   </div>
                   {/* Add Permission Level Select if needed */}
                </div>
                <DialogFooter>
                   <DialogClose asChild>
                        <Button type="button" variant="outline" disabled={isLoading}>Cancelar</Button>
                   </DialogClose>
                  <Button type="submit" disabled={isLoading}>{isLoading ? 'Adicionando...' : 'Salvar Administrador'}</Button>
                </DialogFooter>
              </form>
           </DialogContent>
         </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading && admins.length === 0 ? (
            <p className="text-center text-muted-foreground">Carregando administradores...</p>
         ) : (
            <Table>
            <TableHeader>
                <TableRow>
                 <TableHead className="w-[50px]">Avatar</TableHead>
                 <TableHead>Nome</TableHead>
                 <TableHead>Email</TableHead>
                 <TableHead>Status</TableHead>
                 {/* <TableHead>Permissão</TableHead> */}
                 <TableHead>Último Login</TableHead>
                 <TableHead className="text-right w-[150px]">Ações</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {admins.map((admin) => (
                <TableRow key={admin.id}>
                     <TableCell>
                        <Avatar className="h-8 w-8">
                            <AvatarImage src={`https://picsum.photos/seed/${admin.id}/32/32`} alt={admin.name} />
                            <AvatarFallback>{admin.name.substring(0, 1)}</AvatarFallback>
                        </Avatar>
                     </TableCell>
                    <TableCell className="font-medium">{admin.name}</TableCell>
                    <TableCell>{admin.email}</TableCell>
                     <TableCell>
                        <Switch
                            checked={admin.isActive}
                            onCheckedChange={(checked) => handleActiveChange(admin.id, checked)}
                            disabled={isLoading}
                            aria-label={`Status de ${admin.name}`}
                        />
                    </TableCell>
                    {/* <TableCell>{admin.permissionLevel || 'N/A'}</TableCell> */}
                    <TableCell className="text-muted-foreground text-xs">{admin.lastLogin || 'Nunca'}</TableCell>
                    <TableCell className="text-right space-x-1">
                        {/* Edit Dialog */}
                         <Dialog open={isEditDialogOpen && selectedAdmin?.id === admin.id} onOpenChange={(open) => { if (!open) setSelectedAdmin(null); setIsEditDialogOpen(open); }}>
                            <DialogTrigger asChild>
                                <Button variant="ghost" size="icon" onClick={() => handleEdit(admin)} disabled={isLoading}>
                                <Edit className="h-4 w-4" />
                                </Button>
                            </DialogTrigger>
                             <DialogContent className="sm:max-w-[425px]">
                                 <DialogHeader>
                                     <DialogTitle>Editar Administrador</DialogTitle>
                                 </DialogHeader>
                                 <form onSubmit={handleUpdateAdmin}>
                                     <div className="grid gap-4 py-4">
                                         <div className="grid grid-cols-4 items-center gap-4">
                                             <Label htmlFor="edit-name" className="text-right">Nome</Label>
                                             <Input id="edit-name" name="edit-name" defaultValue={selectedAdmin?.name} required className="col-span-3" />
                                         </div>
                                          <div className="grid grid-cols-4 items-center gap-4">
                                              <Label htmlFor="edit-email" className="text-right">Email</Label>
                                              <Input id="edit-email" name="edit-email" type="email" defaultValue={selectedAdmin?.email} required className="col-span-3" />
                                          </div>
                                           {/* Add permission level */}
                                     </div>
                                     <DialogFooter>
                                         <DialogClose asChild><Button type="button" variant="outline" disabled={isLoading}>Cancelar</Button></DialogClose>
                                         <Button type="submit" disabled={isLoading}>{isLoading ? 'Salvando...' : 'Salvar Alterações'}</Button>
                                     </DialogFooter>
                                 </form>
                             </DialogContent>
                         </Dialog>

                         {/* Reset Password Dialog */}
                          <Dialog open={isResetDialogOpen && selectedAdmin?.id === admin.id} onOpenChange={(open) => { if (!open) setSelectedAdmin(null); setIsResetDialogOpen(open); }}>
                            <DialogTrigger asChild>
                                <Button variant="ghost" size="icon" title="Redefinir Senha" onClick={() => handleResetPassword(admin)} disabled={isLoading}>
                                     <KeyRound className="h-4 w-4 text-orange-500" />
                                </Button>
                            </DialogTrigger>
                             <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Confirmar Redefinição de Senha</DialogTitle>
                                     <DialogDescription>
                                        Tem certeza que deseja iniciar a redefinição de senha para <strong>{selectedAdmin?.name}</strong> ({selectedAdmin?.email})? Um email com instruções será enviado.
                                    </DialogDescription>
                                </DialogHeader>
                                <DialogFooter>
                                     <DialogClose asChild><Button variant="outline" disabled={isLoading}>Cancelar</Button></DialogClose>
                                    <Button variant="destructive" onClick={handleConfirmResetPassword} disabled={isLoading}>{isLoading ? 'Enviando...' : 'Confirmar Redefinição'}</Button>
                                </DialogFooter>
                             </DialogContent>
                         </Dialog>

                         {/* Delete Dialog */}
                         <Dialog open={isDeleteDialogOpen && selectedAdmin?.id === admin.id} onOpenChange={(open) => { if (!open) setSelectedAdmin(null); setIsDeleteDialogOpen(open); }}>
                            <DialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(admin)} disabled={isLoading}>
                                <Trash2 className="h-4 w-4" />
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Confirmar Exclusão</DialogTitle>
                                    <DialogDescription>
                                        Tem certeza que deseja excluir o administrador <strong>{selectedAdmin?.name}</strong>? Esta ação não pode ser desfeita.
                                    </DialogDescription>
                                </DialogHeader>
                                <DialogFooter>
                                    <DialogClose asChild><Button variant="outline" disabled={isLoading}>Cancelar</Button></DialogClose>
                                    <Button variant="destructive" onClick={handleConfirmDelete} disabled={isLoading}>{isLoading ? 'Excluindo...' : 'Confirmar Exclusão'}</Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </TableCell>
                </TableRow>
                ))}
            </TableBody>
            </Table>
         )}
         {!isLoading && admins.length === 0 && (
              <p className="text-center text-muted-foreground p-4">Nenhum administrador cadastrado.</p>
         )}
      </CardContent>
    </Card>
  );
}
