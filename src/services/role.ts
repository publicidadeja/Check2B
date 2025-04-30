
'use server';

import { mockRoles } from './mock-data'; // Import from centralized store

/**
 * Represents a collaborator role/function.
 */
export interface Role {
  /**
   * Unique identifier for the role (can be the name itself if unique).
   */
  id: string;
  /**
   * The name of the role.
   */
  name: string;
}


// --- Mock API Functions ---

/**
 * Asynchronously retrieves all available roles.
 *
 * @returns A promise that resolves to an array of Role objects.
 */
export async function getAllRoles(): Promise<Role[]> {
    console.log("Fetching all roles (mock)...");
    await new Promise(resolve => setTimeout(resolve, 50)); // Simulate short delay
    return [...mockRoles].sort((a, b) => a.name.localeCompare(b.name)); // Return sorted copy from shared store
}

/**
 * Asynchronously adds a new role.
 *
 * @param roleName The name of the new role to add.
 * @returns A promise that resolves to the newly created Role object.
 * @throws Error if validation fails (e.g., empty name, duplicate name).
 */
export async function addRole(roleName: string): Promise<Role> {
    console.log("Adding role (mock):", roleName);
    await new Promise(resolve => setTimeout(resolve, 100));

    const trimmedName = roleName.trim();

    if (!trimmedName) {
        throw new Error("O nome da função não pode ser vazio.");
    }

    // Check for duplicates (case-insensitive)
    if (mockRoles.some(role => role.name.toLowerCase() === trimmedName.toLowerCase())) {
        throw new Error(`A função "${trimmedName}" já existe.`);
    }

    const newRole: Role = {
        // Generate a simple ID based on the name (replace with better ID generation)
        id: trimmedName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''), // Sanitize ID
        name: trimmedName,
    };

    mockRoles.push(newRole); // Add to shared store
    console.log("Role added, current roles:", mockRoles);
    return { ...newRole }; // Return a copy
}

// --- Potentially add updateRole later if needed ---
// export async function updateRole(id: string, name: string): Promise<Role> { ... }


/**
 * Asynchronously deletes a role.
 * Note: Check for dependencies (employees using the role) before deleting in a real app.
 *
 * @param roleId The ID of the role to delete.
 * @returns A promise that resolves when deletion is complete.
 * @throws Error if role not found or cannot be deleted (e.g., in use).
 */
export async function deleteRole(roleId: string): Promise<void> {
    console.log("Deleting role (mock):", roleId);
    await new Promise(resolve => setTimeout(resolve, 150));

    // Example Guard: Prevent deleting a core role
    if (roleId === 'engenheiro-de-software-pleno') {
        throw new Error("Não é possível excluir uma função principal.");
    }

    // TODO: Check if any employee uses this roleId before deleting

    const initialLength = mockRoles.length;
    const roleIndex = mockRoles.findIndex(role => role.id === roleId);

    if (roleIndex === -1) {
         throw new Error("Função não encontrada para exclusão.");
    }

    mockRoles.splice(roleIndex, 1); // Remove from shared store
    console.log("Role deleted, current roles:", mockRoles);
}
