
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
import { PlusCircle, Edit, Trash2, KeyRound, UserPlus, Loader2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import type { AdminUser } from '@/services/adminUser';
import {
    getAllAdmins,
    addAdminUser,
    updateAdminUser,
    deleteAdminUser,
    resetAdminPassword
} from '@/services/adminUser'; // Import service functions

export default function AdminsPage() {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [selectedAdmin, setSelectedAdmin] = useState<AdminUser | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false); // For form submissions
  const { toast } = useToast();

  const loadAdmins = React.useCallback(async () => {
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
  }, [toast]);

  useEffect(() => {
    loadAdmins();
  }, [loadAdmins]);

  const handleEdit = (admin: AdminUser) => {
    setSelectedAdmin({ ...admin }); // Clone admin to avoid modifying state directly in dialog before saving
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
    setIsSubmitting(true);
    try {
      await deleteAdminUser(selectedAdmin.id);
      setAdmins(admins.filter(adm => adm.id !== selectedAdmin.id)); // Update state on success
      toast({ title: "Sucesso", description: `Administrador "${selectedAdmin.name}" excluído.` });
      setIsDeleteDialogOpen(false);
      setSelectedAdmin(null);
    } catch (error: any) {
      console.error("Failed to delete admin:", error);
      toast({ title: "Erro", description: error.message || "Falha ao excluir administrador.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

    const handleConfirmResetPassword = async () => {
        if (!selectedAdmin) return;
        setIsSubmitting(true);
        try {
            await resetAdminPassword(selectedAdmin.id);
            toast({ title: "Sucesso", description: `Instruções para redefinição de senha enviadas para ${selectedAdmin.email}.` });
            setIsResetDialogOpen(false);
            setSelectedAdmin(null);
        } catch (error: any) {
            console.error("Failed to reset password:", error);
            toast({ title: "Erro", description: error.message || "Falha ao iniciar redefinição de senha.", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

   const handleAddAdmin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const newAdminData: Omit<AdminUser, 'id' | 'lastLogin' | 'isActive'> & { isActive?: boolean } = { // Include isActive optionally
        name: formData.get('name') as string,
        email: formData.get('email') as string,
        isActive: true, // Default to active, could be a form field
        // permissionLevel: formData.get('permissionLevel') as string, // If implemented
    };

    if (!newAdminData.name.trim() || !newAdminData.email.trim()) {
         toast({ title: "Erro de Validação", description: "Nome e email são obrigatórios.", variant: "destructive" });
        return;
    }
    if (!/\S+@\S+\.\S+/.test(newAdminData.email)) {
         toast({ title: "Erro de Validação", description: "Formato de email inválido.", variant: "destructive" });
        return;
    }

    setIsSubmitting(true);
    try {
        const addedAdmin = await addAdminUser(newAdminData);
        setAdmins([...admins, addedAdmin]); // Add to state on success
        toast({ title: "Sucesso", description: `Administrador "${addedAdmin.name}" adicionado. Um email de boas-vindas/configuração de senha foi enviado (simulado).` });
        setIsAddDialogOpen(false);
        // No need to call loadAdmins() here unless the API response is minimal
    } catch (error: any) {
        console.error("Failed to add admin:", error);
        toast({ title: "Erro", description: error.message || "Falha ao adicionar administrador.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

   const handleUpdateAdmin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedAdmin) return;

    const formData = new FormData(event.currentTarget);
    const name = formData.get('edit-name') as string;
    const email = formData.get('edit-email') as string;

     if (!name.trim() || !email.trim()) {
        toast({ title: "Erro de Validação", description: "Nome e email são obrigatórios.", variant: "destructive" });
        return;
    }
     if (!/\S+@\S+\.\S+/.test(email)) {
         toast({ title: "Erro de Validação", description: "Formato de email inválido.", variant: "destructive" });
        return;
    }

    const updatedData: Partial<AdminUser> = { name, email };

    // Only include changes
    const changes: Partial<Omit<AdminUser, 'id'>> = {};
    if (name !== selectedAdmin.name) changes.name = name;
    if (email !== selectedAdmin.email) changes.email = email;
    // isActive is handled by handleActiveChange

    if (Object.keys(changes).length === 0) {
        setIsEditDialogOpen(false); // No changes, just close
        return;
    }


    setIsSubmitting(true);
    try {
        const updatedAdmin = await updateAdminUser(selectedAdmin.id, changes);
        setAdmins(admins.map(adm =>
            adm.id === updatedAdmin.id ? { ...adm, ...updatedAdmin } : adm // Update local state
        ));
         toast({ title: "Sucesso", description: `Administrador "${updatedAdmin.name}" atualizado.` });
        setIsEditDialogOpen(false);
        setSelectedAdmin(null);
     } catch (error: any) {
        console.error("Failed to update admin:", error);
        toast({ title: "Erro", description: error.message || "Falha ao atualizar administrador.", variant: "destructive" });
     } finally {
       setIsSubmitting(false);
     }
  };

  const handleActiveChange = async (adminId: string, checked: boolean) => {
      // Find the current admin to show toast
      const admin = admins.find(a => a.id === adminId);
      if (!admin) return;

      const originalState = admin.isActive;
       // Optimistic UI update
      setAdmins(prevAdmins =>
          prevAdmins.map(adm =>
              adm.id === adminId ? { ...adm, isActive: checked } : adm
          )
      );

      try {
        await updateAdminUser(adminId, { isActive: checked });
         toast({ title: "Sucesso", description: `Status de "${admin.name}" atualizado para ${checked ? 'Ativo' : 'Inativo'}.` });
      } catch (error: any) {
         console.error("Failed to update admin status:", error);
         toast({ title: "Erro", description: error.message || "Falha ao atualizar status do administrador.", variant: "destructive" });
         // Revert optimistic update on error
          setAdmins(prevAdmins =>
            prevAdmins.map(adm =>
                adm.id === adminId ? { ...adm, isActive: originalState } : adm
            )
         );
      }
      // No separate loading state needed here, switch provides visual feedback
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
            <Button size="sm" className="gap-1" disabled={isLoading || isSubmitting}>
              <UserPlus className="h-4 w-4" />
              Adicionar Admin
            </Button>
          </DialogTrigger>
           <DialogContent className="sm:max-w-[425px]">
             <DialogHeader>
               <DialogTitle>Adicionar Novo Administrador</DialogTitle>
               <DialogDescription>
                 Preencha os dados do novo administrador. A senha será definida via email.
               </DialogDescription>
             </DialogHeader>
              <form onSubmit={handleAddAdmin}>
                <fieldset disabled={isSubmitting} className="grid gap-4 py-4">
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
                   {/* Example:
                   <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="permissionLevel" className="text-right">Permissão</Label>
                       <Select name="permissionLevel" defaultValue="full">
                          <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                          <SelectContent>
                             <SelectItem value="full">Total</SelectItem>
                             <SelectItem value="evaluator">Avaliador</SelectItem>
                          </SelectContent>
                       </Select>
                   </div>
                    */}
                </fieldset>
                <DialogFooter>
                   <DialogClose asChild>
                        <Button type="button" variant="outline" disabled={isSubmitting}>Cancelar</Button>
                   </DialogClose>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isSubmitting ? 'Adicionando...' : 'Salvar Administrador'}
                  </Button>
                </DialogFooter>
              </form>
           </DialogContent>
         </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
             <div className="flex justify-center items-center p-10">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
         ) : admins.length === 0 ? (
              <p className="text-center text-muted-foreground p-4">Nenhum administrador cadastrado.</p>
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
                <TableRow key={admin.id} data-state={!admin.isActive ? 'inactive' : undefined} className="data-[state=inactive]:opacity-60">
                     <TableCell>
                        <Avatar className="h-8 w-8">
                            {/* Use a real avatar source or a placeholder generation service */}
                            <AvatarImage src={`https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(admin.name)}`} alt={admin.name} />
                            <AvatarFallback>{admin.name.substring(0, 1).toUpperCase()}</AvatarFallback>
                        </Avatar>
                     </TableCell>
                    <TableCell className="font-medium">{admin.name}</TableCell>
                    <TableCell>{admin.email}</TableCell>
                     <TableCell>
                        <Switch
                            checked={admin.isActive}
                            onCheckedChange={(checked) => handleActiveChange(admin.id, checked)}
                            disabled={isSubmitting || admin.id === 'admin1'} // Disable switch for main admin or during submissions
                            aria-label={`Status de ${admin.name}`}
                        />
                    </TableCell>
                    {/* <TableCell>{admin.permissionLevel || 'N/A'}</TableCell> */}
                    <TableCell className="text-muted-foreground text-xs">{admin.lastLogin ? new Date(admin.lastLogin).toLocaleString('pt-BR') : 'Nunca'}</TableCell>
                    <TableCell className="text-right space-x-1">
                        {/* Edit Dialog */}
                         <Dialog open={isEditDialogOpen && selectedAdmin?.id === admin.id} onOpenChange={(open) => { if (!open) { setSelectedAdmin(null); setIsEditDialogOpen(false); } else { setIsEditDialogOpen(true); } }}>
                            <DialogTrigger asChild>
                                <Button variant="ghost" size="icon" onClick={() => handleEdit(admin)} disabled={isSubmitting} title="Editar">
                                <Edit className="h-4 w-4" />
                                </Button>
                            </DialogTrigger>
                             <DialogContent className="sm:max-w-[425px]">
                                 <DialogHeader>
                                     <DialogTitle>Editar Administrador</DialogTitle>
                                 </DialogHeader>
                                 <form onSubmit={handleUpdateAdmin}>
                                     <fieldset disabled={isSubmitting} className="grid gap-4 py-4">
                                         <div className="grid grid-cols-4 items-center gap-4">
                                             <Label htmlFor="edit-name" className="text-right">Nome</Label>
                                             <Input id="edit-name" name="edit-name" defaultValue={selectedAdmin?.name} required className="col-span-3" />
                                         </div>
                                          <div className="grid grid-cols-4 items-center gap-4">
                                              <Label htmlFor="edit-email" className="text-right">Email</Label>
                                              <Input id="edit-email" name="edit-email" type="email" defaultValue={selectedAdmin?.email} required className="col-span-3" />
                                          </div>
                                           {/* Add permission level */}
                                     </fieldset>
                                     <DialogFooter>
                                         <DialogClose asChild><Button type="button" variant="outline" disabled={isSubmitting}>Cancelar</Button></DialogClose>
                                         <Button type="submit" disabled={isSubmitting}>
                                             {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                             {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
                                         </Button>
                                     </DialogFooter>
                                 </form>
                             </DialogContent>
                         </Dialog>

                         {/* Reset Password Dialog */}
                          <Dialog open={isResetDialogOpen && selectedAdmin?.id === admin.id} onOpenChange={(open) => { if (!open) { setSelectedAdmin(null); setIsResetDialogOpen(false); } else { setIsResetDialogOpen(true); } }}>
                            <DialogTrigger asChild>
                                <Button variant="ghost" size="icon" title="Redefinir Senha" onClick={() => handleResetPassword(admin)} disabled={isSubmitting}>
                                     <KeyRound className="h-4 w-4 text-orange-500" />
                                </Button>
                            </DialogTrigger>
                             <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Confirmar Redefinição de Senha</DialogTitle>
                                     <DialogDescription>
                                        Tem certeza que deseja iniciar a redefinição de senha para <strong>{selectedAdmin?.name}</strong> ({selectedAdmin?.email})? Um email com instruções será enviado (simulado).
                                    </DialogDescription>
                                </DialogHeader>
                                <DialogFooter>
                                     <DialogClose asChild><Button variant="outline" disabled={isSubmitting}>Cancelar</Button></DialogClose>
                                    <Button variant="destructive" onClick={handleConfirmResetPassword} disabled={isSubmitting}>
                                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        {isSubmitting ? 'Enviando...' : 'Confirmar Redefinição'}
                                    </Button>
                                </DialogFooter>
                             </DialogContent>
                         </Dialog>

                         {/* Delete Dialog */}
                         <Dialog open={isDeleteDialogOpen && selectedAdmin?.id === admin.id} onOpenChange={(open) => { if (!open) { setSelectedAdmin(null); setIsDeleteDialogOpen(false); } else { setIsDeleteDialogOpen(true); } }}>
                            <DialogTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-destructive hover:text-destructive"
                                    onClick={() => handleDelete(admin)}
                                    disabled={isSubmitting || admin.id === 'admin1'} // Prevent deleting main admin
                                    title="Excluir"
                                >
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
                                    <DialogClose asChild><Button variant="outline" disabled={isSubmitting}>Cancelar</Button></DialogClose>
                                    <Button variant="destructive" onClick={handleConfirmDelete} disabled={isSubmitting}>
                                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        {isSubmitting ? 'Excluindo...' : 'Confirmar Exclusão'}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </TableCell>
                </TableRow>
                ))}
            </TableBody>
            </Table>
         )}
      </CardContent>
    </Card>
  );
}
