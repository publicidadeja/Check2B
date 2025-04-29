
'use server';

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

// In-memory store for mock data (replace with actual database interactions)
let mockRoles: Role[] = [
    { id: "engenheiro-de-software-junior", name: "Engenheiro de Software Júnior" },
    { id: "engenheiro-de-software-pleno", name: "Engenheiro de Software Pleno" },
    { id: "engenheiro-de-software-senior", name: "Engenheiro de Software Sênior" },
    { id: "gerente-de-vendas", name: "Gerente de Vendas" },
    { id: "executivo-de-contas", name: "Executivo de Contas" },
    { id: "especialista-em-marketing", name: "Especialista em Marketing" },
    { id: "analista-de-rh", name: "Analista de RH" },
    { id: "analista-de-recrutamento", name: "Analista de Recrutamento" },
    { id: "designer-ux-ui", name: "Designer UX/UI" },
];

// --- Mock API Functions ---

/**
 * Asynchronously retrieves all available roles.
 *
 * @returns A promise that resolves to an array of Role objects.
 */
export async function getAllRoles(): Promise<Role[]> {
    console.log("Fetching all roles (mock)...");
    await new Promise(resolve => setTimeout(resolve, 100)); // Simulate short delay
    return [...mockRoles].sort((a, b) => a.name.localeCompare(b.name)); // Return sorted copy
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
    await new Promise(resolve => setTimeout(resolve, 200));

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
        id: trimmedName.toLowerCase().replace(/\s+/g, '-'),
        name: trimmedName,
    };

    mockRoles.push(newRole);
    console.log("Role added, current roles:", mockRoles);
    return { ...newRole }; // Return a copy
}

// --- Potentially add updateRole and deleteRole functions later if needed ---

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
    await new Promise(resolve => setTimeout(resolve, 200));

    // Example Guard: Prevent deleting a core role
    if (roleId === 'engenheiro-de-software-pleno') {
        throw new Error("Não é possível excluir uma função principal.");
    }

    // TODO: Check if any employee uses this roleId before deleting

    const initialLength = mockRoles.length;
    mockRoles = mockRoles.filter(role => role.id !== roleId);

    if (mockRoles.length === initialLength) {
        throw new Error("Função não encontrada para exclusão.");
    }
    console.log("Role deleted, current roles:", mockRoles);
}
