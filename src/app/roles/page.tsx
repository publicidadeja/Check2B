'use client';

import * as React from 'react';
import { PlusCircle, Search, MoreHorizontal, Edit, Trash2, Briefcase, Loader2 } from 'lucide-react';
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
import { RoleForm } from '@/components/role/role-form'; // To be created

export interface Role {
    id: string;
    name: string; // e.g., 'Desenvolvedor Backend', 'Analista de RH'
    description?: string;
    permissions?: string[]; // Example of potential future feature
}

// Mock data for roles
const mockRoles: Role[] = [
    { id: 'role1', name: 'Recrutadora', description: 'Responsável pelo processo de recrutamento e seleção.' },
    { id: 'role2', name: 'Desenvolvedor Backend', description: 'Desenvolve e mantém a lógica do servidor.' },
    { id: 'role3', name: 'Analista de Marketing', description: 'Executa campanhas e análises de marketing.' },
    { id: 'role4', name: 'Executivo de Contas', description: 'Gerencia relacionamento e vendas com clientes.' },
    { id: 'role5', name: 'Desenvolvedora Frontend', description: 'Desenvolve interfaces de usuário.' },
];

// Mock API functions
const fetchRoles = async (): Promise<Role[]> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    return [...mockRoles];
};

const saveRole = async (roleData: Omit<Role, 'id'> | Role): Promise<Role> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    if ('id' in roleData && roleData.id) {
        const index = mockRoles.findIndex(r => r.id === roleData.id);
        if (index !== -1) {
            mockRoles[index] = { ...mockRoles[index], ...roleData };
            console.log("Função atualizada:", mockRoles[index]);
            return mockRoles[index];
        } else {
            throw new Error("Função não encontrada para atualização");
        }
    } else {
        const newRole: Role = {
            id: `role${Date.now()}`,
            ...(roleData as Omit<Role, 'id'>),
        };
        mockRoles.push(newRole);
        console.log("Nova função adicionada:", newRole);
        return newRole;
    }
};

const deleteRole = async (roleId: string): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    const index = mockRoles.findIndex(r => r.id === roleId);
     // Basic check: prevent deleting if role is assigned to employees (in real app)
    // For mock, we just check if it's one of the initial core roles
    const isCoreRole = ['Recrutadora', 'Desenvolvedor Backend', 'Analista de Marketing', 'Executivo de Contas', 'Desenvolvedora Frontend'].includes(mockRoles[index]?.name);
     if (isCoreRole && mockRoles.length <= 5) { // Simple safeguard for mock
        throw new Error("Não é possível remover funções essenciais (simulado).");
    }
    if (index !== -1) {
        mockRoles.splice(index, 1);
        console.log("Função removida com ID:", roleId);
    } else {
        throw new Error("Função não encontrada para remoção");
    }
};

export default function RolesPage() {
    const [roles, setRoles] = React.useState<Role[]>([]);
    const [filteredRoles, setFilteredRoles] = React.useState<Role[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [searchTerm, setSearchTerm] = React.useState('');
    const [selectedRole, setSelectedRole] = React.useState<Role | null>(null);
    const [isFormOpen, setIsFormOpen] = React.useState(false);
    const [isDeleting, setIsDeleting] = React.useState(false);
    const [roleToDelete, setRoleToDelete] = React.useState<Role | null>(null);
    const { toast } = useToast();

    const loadRoles = React.useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await fetchRoles();
            setRoles(data);
            setFilteredRoles(data);
        } catch (error) {
            console.error("Falha ao carregar funções:", error);
            toast({ title: "Erro", description: "Falha ao carregar funções.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    React.useEffect(() => {
        loadRoles();
    }, [loadRoles]);

    React.useEffect(() => {
        const lowerCaseSearchTerm = searchTerm.toLowerCase();
        const filtered = roles.filter(role =>
            role.name.toLowerCase().includes(lowerCaseSearchTerm) ||
            (role.description && role.description.toLowerCase().includes(lowerCaseSearchTerm))
        );
        setFilteredRoles(filtered);
    }, [searchTerm, roles]);

    const handleSaveRole = async (data: Omit<Role, 'id'>) => {
        const roleDataToSave = selectedRole ? { ...selectedRole, ...data } : data;
        try {
            await saveRole(roleDataToSave);
            setIsFormOpen(false);
            setSelectedRole(null);
            await loadRoles();
            toast({
                title: "Sucesso!",
                description: `Função ${selectedRole ? 'atualizada' : 'criada'} com sucesso.`,
            });
        } catch (error) {
            console.error("Erro ao salvar função:", error);
            toast({
                title: "Erro!",
                description: `Falha ao ${selectedRole ? 'atualizar' : 'criar'} função. Tente novamente.`,
                variant: "destructive",
            });
        }
    };

    const handleDeleteClick = (role: Role) => {
        setRoleToDelete(role);
        setIsDeleting(true);
    };

    const confirmDelete = async () => {
        if (roleToDelete) {
            try {
                await deleteRole(roleToDelete.id);
                toast({ title: "Sucesso", description: "Função removida com sucesso." });
                await loadRoles();
            } catch (error: any) {
                console.error("Falha ao remover função:", error);
                toast({ title: "Erro", description: error.message || "Falha ao remover função.", variant: "destructive" });
            } finally {
                setIsDeleting(false);
                setRoleToDelete(null);
            }
        }
    };

    const openEditForm = (role: Role) => {
        setSelectedRole(role);
        setIsFormOpen(true);
    };

    const openAddForm = () => {
        setSelectedRole(null);
        setIsFormOpen(true);
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Briefcase className="h-5 w-5" />
                        Gerenciamento de Funções
                    </CardTitle>
                    <CardDescription>Crie, edite ou remova funções (cargos) na organização.</CardDescription>
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
                            Adicionar Função
                        </Button>
                    </div>

                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nome da Função</TableHead>
                                    <TableHead>Descrição</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-center py-10">
                                            <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                                            Carregando funções...
                                        </TableCell>
                                    </TableRow>
                                ) : filteredRoles.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-center py-10 text-muted-foreground">
                                            Nenhuma função encontrada.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredRoles.map((role) => (
                                        <TableRow key={role.id}>
                                            <TableCell className="font-medium">{role.name}</TableCell>
                                            <TableCell>{role.description || '-'}</TableCell>
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
                                                        <DropdownMenuItem onClick={() => openEditForm(role)}>
                                                            <Edit className="mr-2 h-4 w-4" />
                                                            Editar
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem
                                                            onClick={() => handleDeleteClick(role)}
                                                            className="text-destructive focus:text-destructive focus:bg-destructive/10"
                                                            // Basic check: prevent deleting core roles for demo
                                                            disabled={['Recrutadora', 'Desenvolvedor Backend', 'Analista de Marketing', 'Executivo de Contas', 'Desenvolvedora Frontend'].includes(role.name) && roles.length <= 5}
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

            {/* Role Form Dialog */}
             <RoleForm
                role={selectedRole}
                onSave={handleSaveRole}
                open={isFormOpen}
                onOpenChange={setIsFormOpen}
            />

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={isDeleting} onOpenChange={setIsDeleting}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar Remoção</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tem certeza que deseja remover a função "{roleToDelete?.name}"? Esta ação pode afetar colaboradores com esta função.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setRoleToDelete(null)}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Remover
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
