'use client';

import * as React from 'react';
import { PlusCircle, Search, MoreHorizontal, Edit, Trash2, Building, Loader2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { DepartmentForm } from '@/components/department/department-form'; // To be created

export interface Department {
    id: string;
    name: string;
    description?: string;
    headId?: string; // Employee ID of the department head (optional)
}

// Mock data for departments
const mockDepartments: Department[] = [
    { id: 'dept1', name: 'RH', description: 'Recursos Humanos', headId: '1' },
    { id: 'dept2', name: 'Engenharia', description: 'Desenvolvimento e Tecnologia' },
    { id: 'dept3', name: 'Marketing', description: 'Promoção e Vendas' },
    { id: 'dept4', name: 'Vendas' },
    { id: 'dept5', name: 'Operações', description: 'Operações Gerais' },
];

// Mock API functions
const fetchDepartments = async (): Promise<Department[]> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    return [...mockDepartments];
};

const saveDepartment = async (deptData: Omit<Department, 'id'> | Department): Promise<Department> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    if ('id' in deptData && deptData.id) {
        const index = mockDepartments.findIndex(d => d.id === deptData.id);
        if (index !== -1) {
            mockDepartments[index] = { ...mockDepartments[index], ...deptData };
            console.log("Departamento atualizado:", mockDepartments[index]);
            return mockDepartments[index];
        } else {
            throw new Error("Departamento não encontrado para atualização");
        }
    } else {
        const newDepartment: Department = {
            id: `dept${Date.now()}`,
            ...(deptData as Omit<Department, 'id'>),
        };
        mockDepartments.push(newDepartment);
        console.log("Novo departamento adicionado:", newDepartment);
        return newDepartment;
    }
};

const deleteDepartment = async (deptId: string): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    const index = mockDepartments.findIndex(d => d.id === deptId);
    // Basic check: prevent deleting if department has employees (in real app)
    // For mock, we just check if it's a core dept like 'Engenharia'
    const isCoreDept = ['Engenharia', 'RH', 'Vendas', 'Marketing', 'Operações'].includes(mockDepartments[index]?.name);
    if (isCoreDept && mockDepartments.length <= 5) { // Simple safeguard for mock
        throw new Error("Não é possível remover departamentos essenciais (simulado).");
    }

    if (index !== -1) {
        mockDepartments.splice(index, 1);
        console.log("Departamento removido com ID:", deptId);
    } else {
        throw new Error("Departamento não encontrado para remoção");
    }
};

export default function DepartmentsPage() {
    const [departments, setDepartments] = React.useState<Department[]>([]);
    const [filteredDepartments, setFilteredDepartments] = React.useState<Department[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [searchTerm, setSearchTerm] = React.useState('');
    const [selectedDepartment, setSelectedDepartment] = React.useState<Department | null>(null);
    const [isFormOpen, setIsFormOpen] = React.useState(false);
    const [isDeleting, setIsDeleting] = React.useState(false);
    const [departmentToDelete, setDepartmentToDelete] = React.useState<Department | null>(null);
    const { toast } = useToast();

    const loadDepartments = React.useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await fetchDepartments();
            setDepartments(data);
            setFilteredDepartments(data);
        } catch (error) {
            console.error("Falha ao carregar departamentos:", error);
            toast({ title: "Erro", description: "Falha ao carregar departamentos.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    React.useEffect(() => {
        loadDepartments();
    }, [loadDepartments]);

    React.useEffect(() => {
        const lowerCaseSearchTerm = searchTerm.toLowerCase();
        const filtered = departments.filter(dept =>
            dept.name.toLowerCase().includes(lowerCaseSearchTerm) ||
            (dept.description && dept.description.toLowerCase().includes(lowerCaseSearchTerm))
        );
        setFilteredDepartments(filtered);
    }, [searchTerm, departments]);

    const handleSaveDepartment = async (data: Omit<Department, 'id'>) => {
        const deptDataToSave = selectedDepartment ? { ...selectedDepartment, ...data } : data;
        try {
            await saveDepartment(deptDataToSave);
            setIsFormOpen(false);
            setSelectedDepartment(null);
            await loadDepartments();
            toast({
                title: "Sucesso!",
                description: `Departamento ${selectedDepartment ? 'atualizado' : 'criado'} com sucesso.`,
            });
        } catch (error) {
            console.error("Erro ao salvar departamento:", error);
            toast({
                title: "Erro!",
                description: `Falha ao ${selectedDepartment ? 'atualizar' : 'criar'} departamento. Tente novamente.`,
                variant: "destructive",
            });
        }
    };

    const handleDeleteClick = (department: Department) => {
        setDepartmentToDelete(department);
        setIsDeleting(true);
    };

    const confirmDelete = async () => {
        if (departmentToDelete) {
            try {
                await deleteDepartment(departmentToDelete.id);
                toast({ title: "Sucesso", description: "Departamento removido com sucesso." });
                await loadDepartments();
            } catch (error: any) {
                console.error("Falha ao remover departamento:", error);
                toast({ title: "Erro", description: error.message || "Falha ao remover departamento.", variant: "destructive" });
            } finally {
                setIsDeleting(false);
                setDepartmentToDelete(null);
            }
        }
    };

    const openEditForm = (department: Department) => {
        setSelectedDepartment(department);
        setIsFormOpen(true);
    };

    const openAddForm = () => {
        setSelectedDepartment(null);
        setIsFormOpen(true);
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Building className="h-5 w-5" />
                        Gerenciamento de Departamentos
                    </CardTitle>
                    <CardDescription>Crie, edite ou remova departamentos na organização.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between mb-4">
                        <div className="relative w-full max-w-sm">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder="Buscar por nome ou descrição..."
                                className="pl-8"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <Button onClick={openAddForm}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Adicionar Departamento
                        </Button>
                    </div>

                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nome</TableHead>
                                    <TableHead>Descrição</TableHead>
                                    {/* <TableHead>Responsável</TableHead> */}
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-center py-10">
                                            <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                                            Carregando departamentos...
                                        </TableCell>
                                    </TableRow>
                                ) : filteredDepartments.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-center py-10 text-muted-foreground">
                                            Nenhum departamento encontrado.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredDepartments.map((dept) => (
                                        <TableRow key={dept.id}>
                                            <TableCell className="font-medium">{dept.name}</TableCell>
                                            <TableCell>{dept.description || '-'}</TableCell>
                                            {/* <TableCell>{dept.headId || '-'}</TableCell> */}
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" className="h-8 w-8 p-0">
                                                            <span className="sr-only">Abrir menu</span>
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                                        <DropdownMenuItem onClick={() => openEditForm(dept)}>
                                                            <Edit className="mr-2 h-4 w-4" />
                                                            Editar
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem
                                                            onClick={() => handleDeleteClick(dept)}
                                                            className="text-destructive focus:text-destructive focus:bg-destructive/10"
                                                            // Basic check: prevent deleting core departments for demo
                                                             disabled={['Engenharia', 'RH', 'Vendas', 'Marketing', 'Operações'].includes(dept.name) && departments.length <= 5}
                                                        >
                                                            <Trash2 className="mr-2 h-4 w-4" />
                                                            Remover
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* Department Form Dialog */}
             <DepartmentForm
                department={selectedDepartment}
                onSave={handleSaveDepartment}
                open={isFormOpen}
                onOpenChange={setIsFormOpen}
            />

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={isDeleting} onOpenChange={setIsDeleting}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar Remoção</AlertDialogTitle>
                        <AlertDialogDescription>
                             Tem certeza que deseja remover o departamento "{departmentToDelete?.name}"? Esta ação pode afetar colaboradores associados.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setDepartmentToDelete(null)}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Remover
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
