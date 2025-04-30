
'use server';

import { mockDepartments } from './mock-data'; // Import from centralized store

// Define the Department interface
export interface Department {
    id: string;
    name: string;
    // Add other relevant fields like managerId, description etc. if needed
}


// --- Mock API Functions ---

export async function getAllDepartments(): Promise<Department[]> {
    console.log("Fetching departments (mock)...");
    await new Promise(resolve => setTimeout(resolve, 100)); // Simulate delay
    return [...mockDepartments]; // Return a copy from the shared store
}

export async function addDepartment(name: string): Promise<Department> {
    console.log("Adding department (mock):", name);
    await new Promise(resolve => setTimeout(resolve, 200));

    if (!name || name.trim().length === 0) {
        throw new Error("Nome do departamento não pode ser vazio.");
    }
    if (mockDepartments.some(dept => dept.name.toLowerCase() === name.trim().toLowerCase())) {
        throw new Error(`Departamento "${name.trim()}" já existe.`);
    }

    const newDepartment: Department = {
        id: `dept_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        name: name.trim(),
    };
    mockDepartments.push(newDepartment); // Modify the shared store
    return { ...newDepartment }; // Return a copy
}

export async function updateDepartment(id: string, name: string): Promise<Department> {
    console.log("Updating department (mock):", id, name);
    await new Promise(resolve => setTimeout(resolve, 200));

    if (!name || name.trim().length === 0) {
        throw new Error("Nome do departamento não pode ser vazio.");
    }

    const deptIndex = mockDepartments.findIndex(d => d.id === id);
    if (deptIndex === -1) {
        throw new Error("Departamento não encontrado.");
    }

    // Check if new name conflicts with another department
    if (mockDepartments.some(dept => dept.name.toLowerCase() === name.trim().toLowerCase() && dept.id !== id)) {
        throw new Error(`Outro departamento já possui o nome "${name.trim()}".`);
    }

    mockDepartments[deptIndex] = { ...mockDepartments[deptIndex], name: name.trim() }; // Update shared store
    return { ...mockDepartments[deptIndex] }; // Return a copy
}

export async function deleteDepartment(id: string): Promise<void> {
    console.log("Deleting department (mock):", id);
    await new Promise(resolve => setTimeout(resolve, 200));

    // Basic check: Cannot delete 'Engenharia' (example guard)
    const deptToDelete = mockDepartments.find(d => d.id === id);
    if (deptToDelete?.name === 'Engenharia') {
        throw new Error("Não é possível excluir o departamento 'Engenharia'.");
    }
    // TODO: In a real app, check if employees or tasks are associated with this department before allowing deletion.

    const initialLength = mockDepartments.length;
    const deptIndex = mockDepartments.findIndex(dept => dept.id === id);

     if (deptIndex === -1) {
        throw new Error("Departamento não encontrado para exclusão.");
    }

    mockDepartments.splice(deptIndex, 1); // Remove from shared store

    // Success
}
