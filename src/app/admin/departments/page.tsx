'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlusCircle, Edit, Trash2, Building } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

interface Department {
    id: string;
    name: string;
    // Add other relevant fields like manager, description etc.
}

// Mock API functions - Replace with actual API calls
async function getAllDepartments(): Promise<Department[]> {
    console.log("Fetching departments...");
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    // Return mock data
    return [
        { id: 'dept1', name: 'Engenharia' },
        { id: 'dept2', name: 'Vendas' },
        { id: 'dept3', name: 'Marketing' },
        { id: 'dept4', name: 'RH' },
    ];
}

async function addDepartment(name: string): Promise<Department> {
     console.log("Adding department:", name);
     await new Promise(resolve => setTimeout(resolve, 300));
     return { id: String(Date.now()), name }; // Mock response
}

async function updateDepartment(id: string, name: string): Promise<Department> {
    console.log("Updating department:", id, name);
    await new Promise(resolve => setTimeout(resolve, 300));
    return { id, name }; // Mock response
}

async function deleteDepartment(id: string): Promise<void> {
     console.log("Deleting department:", id);
     await new Promise(resolve => setTimeout(resolve, 300));
     // Mock success
}


export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    async function loadDepartments() {
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
    }
    loadDepartments();
  }, [toast]);

  const handleEdit = (department: Department) => {
    setSelectedDepartment(department);
    setIsEditDialogOpen(true);
  };

  const handleDelete = (department: Department) => {
    setSelectedDepartment(department);
    setIsDeleteDialogOpen(true);
  };

   const handleConfirmDelete = async () => {
    if (!selectedDepartment) return;
    setIsLoading(true);
    try {
      await deleteDepartment(selectedDepartment.id);
      setDepartments(departments.filter(dept => dept.id !== selectedDepartment.id));
      toast({ title: "Sucesso", description: `Departamento "${selectedDepartment.name}" excluído.` });
      setIsDeleteDialogOpen(false);
      setSelectedDepartment(null);
    } catch (error) {
      console.error("Failed to delete department:", error);
      toast({ title: "Erro", description: "Falha ao excluir departamento.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

   const handleAddDepartment = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = formData.get('name') as string;

    if (!name.trim()) {
        toast({ title: "Erro", description: "Nome do departamento não pode ser vazio.", variant: "destructive" });
        return;
    }

    setIsLoading(true);
    try {
        const addedDepartment = await addDepartment(name);
        setDepartments([...departments, addedDepartment]);
        toast({ title: "Sucesso", description: `Departamento "${addedDepartment.name}" adicionado.` });
        setIsAddDialogOpen(false);
    } catch (error) {
        console.error("Failed to add department:", error);
        toast({ title: "Erro", description: "Falha ao adicionar departamento.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

   const handleUpdateDepartment = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedDepartment) return;

    const formData = new FormData(event.currentTarget);
    const name = formData.get('edit-name') as string;

     if (!name.trim()) {
        toast({ title: "Erro", description: "Nome do departamento não pode ser vazio.", variant: "destructive" });
        return;
    }

    setIsLoading(true);
    try {
        const updatedDepartment = await updateDepartment(selectedDepartment.id, name);
        setDepartments(departments.map(dept =>
            dept.id === updatedDepartment.id ? updatedDepartment : dept
        ));
         toast({ title: "Sucesso", description: `Departamento "${updatedDepartment.name}" atualizado.` });
        setIsEditDialogOpen(false);
        setSelectedDepartment(null);
     } catch (error) {
        console.error("Failed to update department:", error);
        toast({ title: "Erro", description: "Falha ao atualizar departamento.", variant: "destructive" });
     } finally {
       setIsLoading(false);
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
            <Button size="sm" className="gap-1" disabled={isLoading}>
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
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-right flex items-center gap-1">
                      <Building className="h-4 w-4"/> Nome
                    </Label>
                    <Input id="name" name="name" required className="col-span-3" />
                  </div>
                   {/* Add other department fields if necessary */}
                </div>
                <DialogFooter>
                   <DialogClose asChild>
                        <Button type="button" variant="outline" disabled={isLoading}>Cancelar</Button>
                   </DialogClose>
                  <Button type="submit" disabled={isLoading}>{isLoading ? 'Adicionando...' : 'Salvar Departamento'}</Button>
                </DialogFooter>
              </form>
           </DialogContent>
         </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading && departments.length === 0 ? (
            <p className="text-center text-muted-foreground">Carregando departamentos...</p>
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
                    <TableCell className="text-right">
                        <Dialog open={isEditDialogOpen && selectedDepartment?.id === department.id} onOpenChange={(open) => { if (!open) setSelectedDepartment(null); setIsEditDialogOpen(open); }}>
                            <DialogTrigger asChild>
                                <Button variant="ghost" size="icon" onClick={() => handleEdit(department)} disabled={isLoading}>
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
                                    <div className="grid gap-4 py-4">
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="edit-name" className="text-right flex items-center gap-1">
                                          <Building className="h-4 w-4"/> Nome
                                        </Label>
                                        <Input id="edit-name" name="edit-name" defaultValue={selectedDepartment?.name} required className="col-span-3" />
                                    </div>
                                    {/* Add other fields */}
                                    </div>
                                    <DialogFooter>
                                    <DialogClose asChild>
                                            <Button type="button" variant="outline" disabled={isLoading}>Cancelar</Button>
                                    </DialogClose>
                                    <Button type="submit" disabled={isLoading}>{isLoading ? 'Salvando...' : 'Salvar Alterações'}</Button>
                                    </DialogFooter>
                                </form>
                            </DialogContent>
                        </Dialog>

                        <Dialog open={isDeleteDialogOpen && selectedDepartment?.id === department.id} onOpenChange={(open) => { if (!open) setSelectedDepartment(null); setIsDeleteDialogOpen(open); }}>
                        <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(department)} disabled={isLoading}>
                            <Trash2 className="h-4 w-4" />
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                            <DialogTitle>Confirmar Exclusão</DialogTitle>
                            <DialogDescription>
                                Tem certeza que deseja excluir o departamento <strong>{selectedDepartment?.name}</strong>? Esta ação não pode ser desfeita e pode afetar colaboradores e tarefas associadas.
                            </DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                            <DialogClose asChild>
                                    <Button variant="outline" disabled={isLoading}>Cancelar</Button>
                            </DialogClose>
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
         {!isLoading && departments.length === 0 && (
              <p className="text-center text-muted-foreground p-4">Nenhum departamento cadastrado.</p>
         )}
      </CardContent>
    </Card>
  );
}
