
'use server';

import type { Toast } from "@/hooks/use-toast"; // Assuming useToast is compatible server-side or refactor needed

// Define the AdminUser interface (ensure consistency with the page)
export interface AdminUser {
    id: string;
    name: string;
    email: string;
    isActive: boolean;
    lastLogin?: string; // Optional: Display last login time
    // permissionLevel?: string; // Optional permission level
}

// In-memory store for mock data (replace with actual database interactions)
let mockAdmins: AdminUser[] = [
    { id: 'admin1', name: 'Admin Principal', email: 'admin@checkinbonus.com', isActive: true, lastLogin: '2024-07-27 10:00' },
    { id: 'admin2', name: 'Supervisor RH', email: 'rh.supervisor@checkinbonus.com', isActive: true },
    { id: 'admin3', name: 'Gerente Vendas', email: 'vendas.gerente@checkinbonus.com', isActive: false },
];

// --- Mock API Functions ---

export async function getAllAdmins(): Promise<AdminUser[]> {
    console.log("Fetching admin users (mock)...");
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    return [...mockAdmins]; // Return a copy
}

export async function addAdminUser(userData: Omit<AdminUser, 'id' | 'lastLogin'>): Promise<AdminUser> {
     console.log("Adding admin user (mock):", userData);
     await new Promise(resolve => setTimeout(resolve, 300));

     // Check for duplicate email
     if (mockAdmins.some(admin => admin.email === userData.email)) {
         throw new Error("Email já cadastrado.");
     }

     const newAdmin: AdminUser = {
         ...userData,
         id: `admin_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`, // More unique mock ID
         isActive: userData.isActive ?? true, // Default to active if not provided
     };
     mockAdmins.push(newAdmin);
     // In a real app, send welcome/password setup email here
     console.log(`Mock: Welcome email sent to ${newAdmin.email}`);
     return newAdmin;
}

export async function updateAdminUser(id: string, userData: Partial<Omit<AdminUser, 'id'>>): Promise<AdminUser> {
    console.log("Updating admin user (mock):", id, userData);
    await new Promise(resolve => setTimeout(resolve, 300));

    const adminIndex = mockAdmins.findIndex(a => a.id === id);
    if (adminIndex === -1) {
        throw new Error("Administrador não encontrado.");
    }

    // Prevent changing email to an existing one (excluding self)
    if (userData.email && mockAdmins.some(admin => admin.email === userData.email && admin.id !== id)) {
         throw new Error("Email já pertence a outro administrador.");
    }

    const updatedAdmin = { ...mockAdmins[adminIndex], ...userData };
    mockAdmins[adminIndex] = updatedAdmin;
    return updatedAdmin;
}

export async function deleteAdminUser(id: string): Promise<void> {
     console.log("Deleting admin user (mock):", id);
     await new Promise(resolve => setTimeout(resolve, 300));

     // Basic check: Prevent deleting the first admin (example guard)
     if (id === 'admin1') {
         throw new Error("Não é possível excluir o administrador principal.");
     }

     const initialLength = mockAdmins.length;
     mockAdmins = mockAdmins.filter(adm => adm.id !== id);

     if (mockAdmins.length === initialLength) {
         throw new Error("Administrador não encontrado para exclusão.");
     }
     // Success (no return value for delete)
}

export async function resetAdminPassword(id: string): Promise<void> {
    console.log("Resetting password for admin (mock):", id);
    await new Promise(resolve => setTimeout(resolve, 300));
    const admin = mockAdmins.find(a => a.id === id);
    if (!admin) {
        throw new Error("Administrador não encontrado.");
    }
    // This would trigger a password reset email flow in a real app
    console.log(`Mock: Password reset instructions sent to ${admin.email}`);
}
