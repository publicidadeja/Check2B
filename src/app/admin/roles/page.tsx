
'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlusCircle, Edit, Trash2, Loader2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import type { Role } from '@/services/role';
import {
    getAllRoles,
    addRole,
    deleteRole,
    // updateRole // Assuming updateRole might be needed later
} from '@/services/role';

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  // const [isEditDialogOpen, setIsEditDialogOpen] = useState(false); // Keep for potential future edit feature
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const loadRoles = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const fetchedRoles = await getAllRoles();
      setRoles(fetchedRoles);
    } catch (error) {
      console.error("Falha ao carregar funções:", error);
      toast({ title: "Erro", description: "Falha ao carregar funções.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  // const handleEdit = (role: Role) => {
  //   setSelectedRole({ ...role });
  //   setIsEditDialogOpen(true);
  // };

  const handleDelete = (role: Role) => {
    setSelectedRole(role);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedRole) return;
    setIsSubmitting(true);
    try {
      await deleteRole(selectedRole.id);
      setRoles(roles.filter(r => r.id !== selectedRole.id));
      toast({ title: "Sucesso", description: `Função "${selectedRole.name}" excluída.` });
      setIsDeleteDialogOpen(false);
      setSelectedRole(null);
    } catch (error: any) {
      console.error("Falha ao excluir função:", error);
      toast({ title: "Erro", description: error.message || "Falha ao excluir função.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddRole = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = formData.get('name') as string;

    if (!name.trim()) {
        toast({ title: "Erro de Validação", description: "Nome da função não pode ser vazio.", variant: "destructive" });
        return;
    }

    setIsSubmitting(true);
    try {
        const addedRole = await addRole(name);
        // Sort roles alphabetically after adding
        setRoles(prevRoles => [...prevRoles, addedRole].sort((a, b) => a.name.localeCompare(b.name)));
        toast({ title: "Sucesso", description: `Função "${addedRole.name}" adicionada.` });
        setIsAddDialogOpen(false);
        event.currentTarget.reset(); // Reset form
    } catch (error: any) {
        console.error("Falha ao adicionar função:", error);
        toast({ title: "Erro", description: error.message || "Falha ao adicionar função.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  // const handleUpdateRole = async (event: React.FormEvent<HTMLFormElement>) => {
  //   event.preventDefault();
  //   if (!selectedRole) return;
  //   const formData = new FormData(event.currentTarget);
  //   const name = formData.get('edit-name') as string;
  //   // Implement update logic here if needed...
  // };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Gerenciamento de Funções</CardTitle>
          <CardDescription>Visualize, adicione ou remova funções de colaboradores.</CardDescription>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1" disabled={isLoading || isSubmitting}>
              <PlusCircle className="h-4 w-4" />
              Adicionar Função
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Adicionar Nova Função</DialogTitle>
              <DialogDescription>
                Digite o nome da nova função de colaborador.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddRole}>
              <fieldset disabled={isSubmitting} className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">
                    Nome
                  </Label>
                  <Input id="name" name="name" required className="col-span-3" placeholder="Ex: Desenvolvedor(a) Frontend" />
                </div>
              </fieldset>
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline" disabled={isSubmitting}>Cancelar</Button>
                </DialogClose>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isSubmitting ? 'Adicionando...' : 'Salvar Função'}
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
        ) : roles.length === 0 ? (
            <p className="text-center text-muted-foreground p-4">Nenhuma função cadastrada.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome da Função</TableHead>
                {/* Add other relevant headers if needed, e.g., number of employees */}
                <TableHead className="text-right w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roles.map((role) => (
                <TableRow key={role.id}>
                  <TableCell className="font-medium">{role.name}</TableCell>
                  <TableCell className="text-right space-x-1">
                    {/* Edit Button - Disabled for now */}
                    {/*
                    <Dialog open={isEditDialogOpen && selectedRole?.id === role.id} onOpenChange={(open) => { if (!open) { setSelectedRole(null); setIsEditDialogOpen(false); } else { setIsEditDialogOpen(true); } }}>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(role)} disabled={isSubmitting} title="Editar">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[425px]">
                         Edit form here
                      </DialogContent>
                    </Dialog>
                    */}
                    <Button variant="ghost" size="icon" disabled={true} title="Editar (Indisponível)">
                        <Edit className="h-4 w-4 opacity-50" />
                    </Button>

                    {/* Delete Button */}
                    <Dialog open={isDeleteDialogOpen && selectedRole?.id === role.id} onOpenChange={(open) => { if (!open) { setSelectedRole(null); setIsDeleteDialogOpen(false); } else { setIsDeleteDialogOpen(true); } }}>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(role)} disabled={isSubmitting} title="Excluir">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Confirmar Exclusão</DialogTitle>
                          <DialogDescription>
                            Tem certeza que deseja excluir a função <strong>{selectedRole?.name}</strong>? Colaboradores com esta função precisarão ser atualizados.
                          </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                          <DialogClose asChild>
                            <Button variant="outline" disabled={isSubmitting}>Cancelar</Button>
                          </DialogClose>
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
