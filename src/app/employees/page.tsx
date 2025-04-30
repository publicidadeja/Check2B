

'use client';

import * as React from 'react';
import { PlusCircle, Search, MoreHorizontal, Edit, Trash2, Eye, UserX, UserCheck, Loader2, Users } from 'lucide-react'; // Added Users icon
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
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
import { EmployeeForm } from '@/components/employee/employee-form';
import type { Employee } from '@/types/employee';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'; // Ensure CardFooter is imported
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { DataTable } from '@/components/ui/data-table'; // Import DataTable
import type { ColumnDef } from '@tanstack/react-table'; // Import ColumnDef


// Mock data (simulated API response) - Manter nomes em português
// IMPORTANT: This mock data is for frontend display ONLY.
// Actual user authentication happens via Firebase Authentication.
// You MUST manually create users in the Firebase Console (Authentication > Users)
// for them to be able to log in. The password '123456' needs to be set there.
export let mockEmployees: Employee[] = [ // Changed to let for potential modifications if needed by other functions
  { id: '1', name: 'Alice Silva', email: 'alice.silva@check2b.com', phone: '11987654321', department: 'RH', role: 'Recrutadora', admissionDate: '2023-01-15', isActive: true, photoUrl: 'https://picsum.photos/id/1027/40/40' },
  { id: '2', name: 'Beto Santos', email: 'beto.santos@check2b.com', phone: '21912345678', department: 'Engenharia', role: 'Desenvolvedor Backend', admissionDate: '2022-08-20', isActive: true, photoUrl: 'https://picsum.photos/id/1005/40/40' },
  { id: '3', name: 'Carla Mendes', email: 'carla.mendes@check2b.com', phone: '31999998888', department: 'Marketing', role: 'Analista de Marketing', admissionDate: '2023-05-10', isActive: false }, // Exemplo inativo
  { id: '4', name: 'Davi Costa', email: 'davi.costa@check2b.com', phone: '41988887777', department: 'Vendas', role: 'Executivo de Contas', admissionDate: '2021-11-01', isActive: true, photoUrl: 'https://picsum.photos/id/338/40/40' },
  { id: '5', name: 'Eva Pereira', email: 'eva.pereira@check2b.com', phone: '51977776666', department: 'Engenharia', role: 'Desenvolvedora Frontend', admissionDate: '2023-03-22', isActive: true },
  { id: '6', name: 'Leo Corax', email: 'leocorax@gmail.com', phone: '61988885555', department: 'Engenharia', role: 'Desenvolvedor Frontend', admissionDate: '2024-01-10', isActive: true }, // Ensure Leo exists
];

// Mock API functions
const fetchEmployees = async (): Promise<Employee[]> => {
  await new Promise(resolve => setTimeout(resolve, 500));
  return [...mockEmployees]; // Return a copy to avoid direct mutation
};

const saveEmployee = async (employeeData: Omit<Employee, 'id'> | Employee): Promise<Employee> => {
    await new Promise(resolve => setTimeout(resolve, 500));

    // --- IMPORTANT NOTE ---
    // Saving here only updates the *mock* data array.
    // It DOES NOT create a user in Firebase Authentication.
    // User creation MUST be done manually in the Firebase Console.
    // --- ---

    if ('id' in employeeData && employeeData.id) {
        const index = mockEmployees.findIndex(emp => emp.id === employeeData.id);
        if (index !== -1) {
            mockEmployees[index] = { ...mockEmployees[index], ...employeeData };
            console.log("Colaborador atualizado (mock):", mockEmployees[index]);
            return mockEmployees[index];
        } else {
            throw new Error("Colaborador não encontrado para atualização");
        }
    } else {
        const newEmployee: Employee = {
            id: String(Date.now()), // Simple ID for mock
            ...employeeData,
            isActive: employeeData.isActive !== undefined ? employeeData.isActive : true, // Default to active
        };
        // Add to mock array
        mockEmployees.push(newEmployee);
        console.log("Novo colaborador adicionado (mock):", newEmployee);
        // Remind user to add to Firebase Auth
        alert(`Mock user ${newEmployee.name} added. REMEMBER TO CREATE THE USER IN FIREBASE AUTHENTICATION MANUALLY!`);
        return newEmployee;
    }
};

const deleteEmployee = async (employeeId: string): Promise<void> => {
     await new Promise(resolve => setTimeout(resolve, 500));
    const index = mockEmployees.findIndex(emp => emp.id === employeeId);
    if (index !== -1) {
        mockEmployees.splice(index, 1);
        console.log("Colaborador removido com ID:", employeeId);
         // Remind user to remove from Firebase Auth
         alert(`Mock user removed. REMEMBER TO DELETE THE USER FROM FIREBASE AUTHENTICATION MANUALLY!`);
    } else {
         throw new Error("Colaborador não encontrado para remoção");
    }
};

const toggleEmployeeStatus = async (employeeId: string): Promise<Employee | undefined> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    const index = mockEmployees.findIndex(emp => emp.id === employeeId);
    if (index !== -1) {
        mockEmployees[index].isActive = !mockEmployees[index].isActive;
        console.log("Status alterado para o colaborador:", mockEmployees[index]);
         // Remind user about Firebase Auth status
         alert(`Mock user status changed. REMEMBER TO ${mockEmployees[index].isActive ? 'ENABLE' : 'DISABLE'} THE USER IN FIREBASE AUTHENTICATION MANUALLY!`);
        return mockEmployees[index];
    } else {
         throw new Error("Colaborador não encontrado para alterar status");
    }
};


// --- Helper Function ---
const getInitials = (name: string) => {
    if (!name) return '??';
    return name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
};


// --- Employee Profile View Component ---
interface EmployeeProfileViewProps {
    employee: Employee | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

function EmployeeProfileView({ employee, open, onOpenChange }: EmployeeProfileViewProps) {
    if (!employee) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader className="items-center text-center">
                     <Avatar className="h-24 w-24 mb-3">
                       <AvatarImage src={employee.photoUrl} alt={employee.name} />
                       <AvatarFallback className="text-3xl">{getInitials(employee.name)}</AvatarFallback>
                     </Avatar>
                    <DialogTitle className="text-2xl">{employee.name}</DialogTitle>
                    <DialogDescription>{employee.role} - {employee.department}</DialogDescription>
                    <Badge variant={employee.isActive ? 'default' : 'secondary'} className={`mt-1 ${employee.isActive ? 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/50 dark:text-green-200' : 'bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300'}`}>
                        {employee.isActive ? 'Ativo' : 'Inativo'}
                    </Badge>
                </DialogHeader>
                <div className="py-4 space-y-3 px-6">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Email:</span>
                        <span className="font-medium">{employee.email}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Telefone:</span>
                        <span className="font-medium">{employee.phone || '-'}</span>
                    </div>
                     <div className="flex justify-between">
                        <span className="text-muted-foreground">Admissão:</span>
                        <span className="font-medium">
                            {employee.admissionDate ? new Date(employee.admissionDate + 'T00:00:00').toLocaleDateString('pt-BR') : '-'}
                        </span>
                    </div>
                    {/* Add more profile details here - performance, history links etc. */}
                     <div className="pt-4 text-center">
                        {/* Placeholder for actions like 'View Performance History' */}
                        <Button variant="outline" size="sm" disabled>Ver Histórico de Desempenho</Button>
                    </div>
                </div>
                 <DialogFooter className="sm:justify-center">
                     <DialogClose asChild>
                        <Button type="button" variant="secondary">Fechar</Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}


// --- Main Page Component ---
export default function EmployeesPage() {
  const [employees, setEmployees] = React.useState<Employee[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [selectedEmployee, setSelectedEmployee] = React.useState<Employee | null>(null);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [employeeToDelete, setEmployeeToDelete] = React.useState<Employee | null>(null);
  const [isProfileViewOpen, setIsProfileViewOpen] = React.useState(false);
  const [employeeToView, setEmployeeToView] = React.useState<Employee | null>(null);
  const { toast } = useToast();

  // Define columns for DataTable
  const columns: ColumnDef<Employee>[] = [
    {
      accessorKey: "photoUrl",
      header: "Foto",
      cell: ({ row }) => (
        <Avatar className="h-9 w-9">
          <AvatarImage src={row.original.photoUrl} alt={row.original.name} />
          <AvatarFallback>{getInitials(row.original.name)}</AvatarFallback>
        </Avatar>
      ),
      size: 80,
      enableSorting: false,
    },
    { accessorKey: "name", header: "Nome", cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
    { accessorKey: "email", header: "Email", cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.email}</span> }, // Added email column
    { accessorKey: "department", header: "Departamento" },
    { accessorKey: "role", header: "Função" },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={row.original.isActive ? 'default' : 'secondary'} className={row.original.isActive ? 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/50 dark:text-green-200' : 'bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300'}>
          {row.original.isActive ? 'Ativo' : 'Inativo'}
        </Badge>
      ),
       size: 100,
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const employee = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Abrir menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Ações</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => openProfileView(employee)}>
                <Eye className="mr-2 h-4 w-4" />
                Visualizar Perfil
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openEditForm(employee)}>
                <Edit className="mr-2 h-4 w-4" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleToggleStatus(employee)}>
                {employee.isActive ? <UserX className="mr-2 h-4 w-4" /> : <UserCheck className="mr-2 h-4 w-4" />}
                {employee.isActive ? 'Desativar' : 'Ativar'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleDeleteClick(employee)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                <Trash2 className="mr-2 h-4 w-4" />
                Remover
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
       size: 80,
    },
  ];

  const loadEmployees = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchEmployees();
      setEmployees(data);
    } catch (error) {
      console.error("Falha ao carregar colaboradores:", error);
      toast({ title: "Erro", description: "Falha ao carregar colaboradores.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

 const handleSaveEmployee = async (data: any) => {
     const employeeDataToSave = selectedEmployee
         ? { ...selectedEmployee, ...data }
         : data;

     const payload = {
         ...employeeDataToSave,
         admissionDate: employeeDataToSave.admissionDate instanceof Date
             ? employeeDataToSave.admissionDate.toISOString().split('T')[0]
             : employeeDataToSave.admissionDate,
     };

    try {
        await saveEmployee(payload);
        setIsFormOpen(false);
        setSelectedEmployee(null);
        await loadEmployees();
         toast({
             title: "Sucesso!",
             description: `Colaborador ${selectedEmployee ? 'atualizado' : 'cadastrado'} com sucesso. Lembre-se de criar/atualizar na autenticação Firebase!`,
         });
    } catch (error) {
        console.error("Erro ao salvar colaborador:", error);
        toast({
            title: "Erro!",
            description: `Falha ao ${selectedEmployee ? 'atualizar' : 'cadastrar'} colaborador. Tente novamente.`,
            variant: "destructive",
        });
    }
 };


  const handleDeleteClick = (employee: Employee) => {
    setEmployeeToDelete(employee);
    setIsDeleting(true);
  };

  const confirmDelete = async () => {
    if (employeeToDelete) {
       try {
        await deleteEmployee(employeeToDelete.id);
        toast({ title: "Sucesso", description: "Colaborador removido com sucesso." });
        await loadEmployees();
      } catch (error) {
         console.error("Falha ao remover colaborador:", error);
         toast({ title: "Erro", description: "Falha ao remover colaborador.", variant: "destructive" });
      } finally {
         setIsDeleting(false);
         setEmployeeToDelete(null);
      }
    }
  };

  const handleToggleStatus = async (employee: Employee) => {
      try {
        await toggleEmployeeStatus(employee.id);
        toast({ title: "Sucesso", description: `Status do colaborador ${employee.name} foi ${employee.isActive ? 'desativado' : 'ativado'}.` });
        await loadEmployees();
      } catch (error) {
         console.error("Falha ao alterar status do colaborador:", error);
         toast({ title: "Erro", description: "Falha ao alterar status do colaborador.", variant: "destructive" });
      }
  };

  const openEditForm = (employee: Employee) => {
    setSelectedEmployee(employee);
    setIsFormOpen(true);
  };

   const openAddForm = () => {
    setSelectedEmployee(null);
    setIsFormOpen(true);
  };

    const openProfileView = (employee: Employee) => {
        setEmployeeToView(employee);
        setIsProfileViewOpen(true);
    };

  return (
    <div className="space-y-6"> {/* Added space-y for better spacing */}
        <Card>
            <CardHeader>
                 <CardTitle className="flex items-center gap-2">
                     <Users className="h-5 w-5" /> Gestão de Colaboradores
                 </CardTitle>
                <CardDescription>Adicione, edite, visualize e gerencie os colaboradores da organização.</CardDescription>
             </CardHeader>
             <CardContent>
                 {/* Actions moved into DataTable component */}
                {isLoading ? (
                     <div className="flex justify-center items-center py-10">
                        <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
                     </div>
                ) : (
                    <DataTable
                        columns={columns}
                        data={employees}
                        filterColumn="name" // Specify the column to filter
                        filterPlaceholder="Buscar por nome..." // Custom placeholder
                    />
                 )}
             </CardContent>
            <CardFooter className="flex justify-end">
                 <Button onClick={openAddForm}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Adicionar Colaborador
                 </Button>
            </CardFooter>
        </Card>


       {/* Formulário de Colaborador (Dialog) */}
       <EmployeeForm
            employee={selectedEmployee}
            onSave={handleSaveEmployee}
            open={isFormOpen}
            onOpenChange={setIsFormOpen}
        />

        {/* Visualização de Perfil (Dialog) */}
        <EmployeeProfileView
            employee={employeeToView}
            open={isProfileViewOpen}
            onOpenChange={setIsProfileViewOpen}
        />


       {/* Confirmação de Remoção (AlertDialog) */}
       <AlertDialog open={isDeleting} onOpenChange={setIsDeleting}>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>Confirmar Remoção</AlertDialogTitle>
                <AlertDialogDescription>
                    Tem certeza que deseja remover o colaborador "{employeeToDelete?.name}"? Esta ação não pode ser desfeita e removerá todos os dados associados. <strong className='text-destructive'>Lembre-se de remover o usuário também da autenticação do Firebase.</strong>
                </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setEmployeeToDelete(null)}>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Remover Definitivamente (Mock)
                </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

    </div>
  );
}

```
  </change>
  <change>
    <file>README.md</file>
    <description>Add a crucial note about Firebase Authentication user creation.</description>
    <content><![CDATA[# Check2B - Sistema de Avaliação Diária

This is a Next.js application for managing daily employee evaluations using a checklist system.

## Getting Started

1.  **Install Dependencies:**
    ```bash
    npm install
    # or
    yarn install
    # or
    pnpm install
    ```

2.  **Configure Firebase & Environment Variables:**
    *   Create a `.env` file in the root directory (you can copy `.env.example`).
    *   Open the `.env` file and replace the placeholder values with your **actual Firebase project credentials**. You can find these in your Firebase project settings (Project settings > General > Your apps > Web app > SDK setup and configuration > Config).
    *   **VERY IMPORTANT:** Ensure `NEXT_PUBLIC_FIREBASE_API_KEY` is correct. An invalid key will cause login errors (`auth/api-key-not-valid`). Double-check for typos or copy/paste errors.
    *   **Important:** Also generate a strong, unique `JWT_SECRET` for token verification in the middleware. You can use an online generator or a command-line tool like `openssl rand -base64 32`.
    *   **(Optional)** If using AI features, add your `GOOGLE_GENAI_API_KEY`.

    ```env
    # Firebase Configuration - Replace with your actual project values
    # FOUND IN: Firebase Console > Project Settings > General > Your Apps > Web App > SDK setup and configuration > Config
    NEXT_PUBLIC_FIREBASE_API_KEY=YOUR_API_KEY_HERE_COPY_PASTE_CAREFULLY
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=YOUR_PROJECT_ID.firebaseapp.com
    NEXT_PUBLIC_FIREBASE_PROJECT_ID=YOUR_PROJECT_ID
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=YOUR_PROJECT_ID.appspot.com
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=YOUR_SENDER_ID
    NEXT_PUBLIC_FIREBASE_APP_ID=YOUR_APP_ID

    # JWT Secret for token verification (used in middleware) - Generate a strong secret key
    # Example command: openssl rand -base64 32
    JWT_SECRET=YOUR_STRONG_SECRET_KEY_FOR_JWT_MUST_BE_SET

    # Google Generative AI API Key (Optional - Needed for AI features)
    # GOOGLE_GENAI_API_KEY=YOUR_GOOGLE_AI_API_KEY
    ```

3.  **Create Users in Firebase Authentication:**
    *   **CRUCIAL:** For users to be able to log in, they **MUST** be created manually in the Firebase Console. Go to your Firebase project -> Authentication -> Users -> Add user.
    *   Use the email address intended for login (e.g., `admin@check2b.com`, `leocorax@gmail.com`) and set the password you want them to use.
    *   The "Add Colaborador" feature in the admin panel **only adds mock data** for display; it **does not create authentication users**.

4.  **Run the Development Server:**
    ```bash
    npm run dev
    # or
    yarn dev
    # or
    pnpm dev
    ```

    Open [http://localhost:9002](http://localhost:9002) (or your configured port) with your browser to see the result.

## Project Structure

*   `src/app/`: Contains the application routes using the Next.js App Router.
    *   `(admin)`: Route group for administrative pages (Dashboard, Employees, Tasks, Evaluations, Challenges, Ranking, Settings). Root `/` also falls under this.
    *   `(colaborador)`: Route group for employee pages (Dashboard, Avaliações, Desafios, Ranking, Perfil).
    *   `login`: Login page.
*   `src/components/`: Reusable UI components.
    *   `ui/`: Components from shadcn/ui.
    *   `layout/`: Layout components (MainLayout, EmployeeLayout).
    *   Specific components (e.g., `employee/`, `task/`, `challenge/`, `department/`, `role/`).
*   `src/lib/`: Utility functions and core logic (e.g., `auth.ts`, `utils.ts`).
*   `src/hooks/`: Custom React hooks.
*   `src/types/`: TypeScript type definitions.
*   `src/middleware.ts`: Handles authentication and routing logic based on JWT stored in cookies.
*   `src/ai/`: Genkit AI related files (flows, instance).

## Key Features

*   **Employee Management:** Add, edit, manage, and view employee information. Activate/deactivate accounts. *(Note: Creates mock data only, Firebase Auth user management is separate)*
*   **Task Management:** Create, categorize, assign (global, by role, department, or individual), and manage daily tasks. Includes criteria for evaluation.
*   **Daily Evaluations:** Admins evaluate task completion (10 or 0) with justifications and optional evidence upload.
*   **Ranking & Awards:** System to rank employees based on performance (checklist + challenges). Admins can configure and manage recurring or specific monthly awards.
*   **Challenges:** Admins create weekly challenges (optional/mandatory) with points, eligibility rules, and evaluation metrics. Employees can view, accept, and submit challenges.
*   **Department & Role Management:** Admins can define and manage departments and roles within the organization.
*   **Separate Interfaces:** Dedicated dashboards and views for Admins and Employees, enforced by middleware.
*   **Authentication:** Secure login with role-based access control, password management (reset by admin), and admin user management. Uses Firebase Auth and JWT cookies. *(Requires manual user creation in Firebase Console)*
*   **Settings:** Configure general system parameters (bonus, zero limits), manage admin users, and handle basic backup/restore operations (simulated).

```
  </change>
  <change>
    <file>docs/important_notes.md</file>
    <description>Add a new documentation file explaining the Firebase Authentication limitation.</description>
    <content><![CDATA[# Important Notes for Check2B Application

## User Authentication vs. Employee Data

It is crucial to understand the distinction between the **Employee Management** feature within the Check2B admin panel and **Firebase Authentication**.

*   **Employee Management (Admin Panel):**
    *   The features under "Colaboradores", "Funções", and "Departamentos" manage **mock data** used for display purposes within the application (e.g., listing employees in tables, assigning tasks).
    *   **Adding, editing, or removing an employee in the admin panel DOES NOT affect Firebase Authentication.**

*   **Firebase Authentication:**
    *   This is the system responsible for handling user logins (email/password verification).
    *   **Users MUST be manually created in the Firebase Console (Authentication > Users tab) to be able to log in.**
    *   When creating a user in the Firebase Console, use the email address the user will use for login and set their password.
    *   **To assign roles (admin/colaborador)** for proper redirection after login, you need to set **Custom Claims** for the user in Firebase. This typically requires using the Firebase Admin SDK (e.g., in a Cloud Function or a separate backend script). See Firebase documentation on [Custom Claims](https://firebase.google.com/docs/auth/admin/custom-claims). The middleware relies on a `role` claim.

**In summary:**

1.  Use the **Firebase Console** to create and manage actual user accounts for login (set email and password).
2.  Use a **Firebase Admin SDK method (like Cloud Functions)** to set a `role` custom claim (`admin` or `colaborador`) for each user.
3.  Use the **Check2B Admin Panel** to manage the *display data* associated with employees (department, role, admission date, etc.) which is used within the application's features but not for login itself.

Failure to create users in Firebase Authentication will result in login errors (`auth/invalid-credential`, `auth/user-not-found`). Failure to set the `role` custom claim will likely result in users being treated as 'colaborador' by default by the middleware.
