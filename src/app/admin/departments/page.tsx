
'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlusCircle, Edit, Trash2, Building, Loader2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import type { Department } from '@/services/department';
import {
    getAllDepartments,
    addDepartment,
    updateDepartment,
    deleteDepartment
} from '@/services/department'; // Import service functions

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false); // For form submissions
  const { toast } = useToast();

  const loadDepartments = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const fetchedDepartments = await getAllDepartments();
      setDepartments(fetchedDepartments);
    } catch (error) {
      console.error("Failed to fetch departments:", error);
      toast({ title: "Erro", description: "Falha ao carregar departamentos.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);


  useEffect(() => {
    loadDepartments();
  }, [loadDepartments]);

  const handleEdit = (department: Department) => {
    setSelectedDepartment({ ...department }); // Clone to edit safely
    setIsEditDialogOpen(true);
  };

  const handleDelete = (department: Department) => {
    setSelectedDepartment(department);
    setIsDeleteDialogOpen(true);
  };

   const handleConfirmDelete = async () => {
    if (!selectedDepartment) return;
    setIsSubmitting(true);
    try {
      await deleteDepartment(selectedDepartment.id);
      setDepartments(departments.filter(dept => dept.id !== selectedDepartment.id));
      toast({ title: "Sucesso", description: `Departamento "${selectedDepartment.name}" excluído.` });
      setIsDeleteDialogOpen(false);
      setSelectedDepartment(null);
    } catch (error: any) {
      console.error("Failed to delete department:", error);
      toast({ title: "Erro", description: error.message || "Falha ao excluir departamento.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

   const handleAddDepartment = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = formData.get('name') as string;

    if (!name.trim()) {
        toast({ title: "Erro de Validação", description: "Nome do departamento não pode ser vazio.", variant: "destructive" });
        return;
    }

    setIsSubmitting(true);
    try {
        const addedDepartment = await addDepartment(name);
        setDepartments([...departments, addedDepartment]);
        toast({ title: "Sucesso", description: `Departamento "${addedDepartment.name}" adicionado.` });
        setIsAddDialogOpen(false);
        event.currentTarget.reset(); // Reset form
    } catch (error: any) {
        console.error("Failed to add department:", error);
        toast({ title: "Erro", description: error.message || "Falha ao adicionar departamento.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

   const handleUpdateDepartment = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedDepartment) return;

    const formData = new FormData(event.currentTarget);
    const name = formData.get('edit-name') as string;

     if (!name.trim()) {
        toast({ title: "Erro de Validação", description: "Nome do departamento não pode ser vazio.", variant: "destructive" });
        return;
    }
     if (name.trim() === selectedDepartment.name) {
         setIsEditDialogOpen(false); // No changes, just close
         return;
     }


    setIsSubmitting(true);
    try {
        const updatedDepartment = await updateDepartment(selectedDepartment.id, name);
        setDepartments(departments.map(dept =>
            dept.id === updatedDepartment.id ? updatedDepartment : dept
        ));
         toast({ title: "Sucesso", description: `Departamento atualizado para "${updatedDepartment.name}".` });
        setIsEditDialogOpen(false);
        setSelectedDepartment(null);
     } catch (error: any) {
        console.error("Failed to update department:", error);
        toast({ title: "Erro", description: error.message || "Falha ao atualizar departamento.", variant: "destructive" });
     } finally {
       setIsSubmitting(false);
     }
  };


  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Gerenciamento de Departamentos</CardTitle>
          <CardDescription>Visualize, adicione, edite ou remova departamentos.</CardDescription>
        </div>
         <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
           <DialogTrigger asChild>
            <Button size="sm" className="gap-1" disabled={isLoading || isSubmitting}>
              <PlusCircle className="h-4 w-4" />
              Adicionar Departamento
            </Button>
          </DialogTrigger>
           <DialogContent className="sm:max-w-[425px]">
             <DialogHeader>
               <DialogTitle>Adicionar Novo Departamento</DialogTitle>
               <DialogDescription>
                 Digite o nome do novo departamento.
               </DialogDescription>
             </DialogHeader>
              <form onSubmit={handleAddDepartment}>
                <fieldset disabled={isSubmitting} className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-right flex items-center justify-end gap-1">
                      <Building className="h-4 w-4"/> Nome
                    </Label>
                    <Input id="name" name="name" required className="col-span-3" placeholder="Ex: Financeiro" />
                  </div>
                   {/* Add other department fields if necessary */}
                </fieldset>
                <DialogFooter>
                   <DialogClose asChild>
                        <Button type="button" variant="outline" disabled={isSubmitting}>Cancelar</Button>
                   </DialogClose>
                  <Button type="submit" disabled={isSubmitting}>
                     {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                     {isSubmitting ? 'Adicionando...' : 'Salvar Departamento'}
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
         ) : departments.length === 0 ? (
             <p className="text-center text-muted-foreground p-4">Nenhum departamento cadastrado.</p>
         ) : (
            <Table>
            <TableHeader>
                <TableRow>
                <TableHead>Nome do Departamento</TableHead>
                {/* Add other headers like Manager, Employee Count? */}
                <TableHead className="text-right w-[100px]">Ações</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {departments.map((department) => (
                <TableRow key={department.id}>
                    <TableCell className="font-medium">{department.name}</TableCell>
                    {/* Add other cells */}
                    <TableCell className="text-right space-x-1">
                        <Dialog open={isEditDialogOpen && selectedDepartment?.id === department.id} onOpenChange={(open) => { if (!open) { setSelectedDepartment(null); setIsEditDialogOpen(false); } else { setIsEditDialogOpen(true); } }}>
                            <DialogTrigger asChild>
                                <Button variant="ghost" size="icon" onClick={() => handleEdit(department)} disabled={isSubmitting} title="Editar">
                                <Edit className="h-4 w-4" />
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[425px]">
                                <DialogHeader>
                                    <DialogTitle>Editar Departamento</DialogTitle>
                                    <DialogDescription>
                                        Atualize o nome do departamento.
                                    </DialogDescription>
                                </DialogHeader>
                                <form onSubmit={handleUpdateDepartment}>
                                    <fieldset disabled={isSubmitting} className="grid gap-4 py-4">
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="edit-name" className="text-right flex items-center justify-end gap-1">
                                          <Building className="h-4 w-4"/> Nome
                                        </Label>
                                        <Input id="edit-name" name="edit-name" defaultValue={selectedDepartment?.name} required className="col-span-3" />
                                    </div>
                                    {/* Add other fields */}
                                    </fieldset>
                                    <DialogFooter>
                                    <DialogClose asChild>
                                            <Button type="button" variant="outline" disabled={isSubmitting}>Cancelar</Button>
                                    </DialogClose>
                                    <Button type="submit" disabled={isSubmitting}>
                                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
                                    </Button>
                                    </DialogFooter>
                                </form>
                            </DialogContent>
                        </Dialog>

                        <Dialog open={isDeleteDialogOpen && selectedDepartment?.id === department.id} onOpenChange={(open) => { if (!open) { setSelectedDepartment(null); setIsDeleteDialogOpen(false); } else { setIsDeleteDialogOpen(true); } }}>
                        <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(department)} disabled={isSubmitting} title="Excluir">
                            <Trash2 className="h-4 w-4" />
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                            <DialogTitle>Confirmar Exclusão</DialogTitle>
                            <DialogDescription>
                                Tem certeza que deseja excluir o departamento <strong>{selectedDepartment?.name}</strong>? Esta ação não pode ser desfeita e pode afetar colaboradores e tarefas associadas (verifique antes de excluir).
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
