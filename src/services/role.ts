
'use server';

import { db } from '@/lib/firebase';
import {
    collection,
    getDocs,
    addDoc,
    updateDoc, // Keep for potential future update functionality
    deleteDoc,
    doc,
    query,
    where,
    orderBy,
    Timestamp,
    DocumentData,
    QueryDocumentSnapshot,
    Query,
    getCountFromServer,
    limit // Import limit
} from 'firebase/firestore';

/**
 * Represents a collaborator role/function.
 */
export interface Role {
  /**
   * Unique identifier for the role (document ID).
   */
  id: string;
  /**
   * The name of the role.
   */
  name: string;
  /** Timestamp of creation */
  createdAt?: Timestamp;
}

const rolesCollection = collection(db, 'roles');

// Helper to convert Firestore doc to Role
const docToRole = (doc: QueryDocumentSnapshot<DocumentData>): Role => {
    const data = doc.data();
    return {
        id: doc.id,
        name: data.name,
        createdAt: data.createdAt,
    };
};

// --- Firestore API Functions ---

/**
 * Asynchronously retrieves all available roles from Firestore.
 *
 * @returns A promise that resolves to an array of Role objects, sorted by name.
 */
export async function getAllRoles(): Promise<Role[]> {
    console.log("Fetching all roles from Firestore...");
    try {
        const q = query(rolesCollection, orderBy("name")); // Order alphabetically
        const snapshot = await getDocs(q);
        return snapshot.docs.map(docToRole);
    } catch (error) {
        console.error("Error fetching roles:", error);
        throw new Error("Falha ao buscar funções.");
    }
}

/**
 * Asynchronously adds a new role to Firestore.
 *
 * @param roleName The name of the new role to add.
 * @returns A promise that resolves to the newly created Role object.
 * @throws Error if validation fails (e.g., empty name, duplicate name).
 */
export async function addRole(roleName: string): Promise<Role> {
    console.log("Adding role to Firestore:", roleName);
    const trimmedName = roleName.trim();

    if (!trimmedName) {
        throw new Error("O nome da função não pode ser vazio.");
    }

    try {
        // Check for duplicates (case-insensitive using a stored lowercase field)
        const q = query(rolesCollection, where("nameLower", "==", trimmedName.toLowerCase()));
        const existing = await getDocs(q);
        if (!existing.empty) {
            throw new Error(`A função "${trimmedName}" já existe.`);
        }

        const newRoleData = {
            name: trimmedName,
            nameLower: trimmedName.toLowerCase(), // Store lowercase version for querying
            createdAt: Timestamp.now(),
        };

        const docRef = await addDoc(rolesCollection, newRoleData);
        return {
            id: docRef.id,
            ...newRoleData,
        } as Role;

    } catch (error: any) {
        console.error("Error adding role:", error);
         if (error.message.includes("já existe") || error.message.includes("vazio")) {
             throw error;
         }
        throw new Error("Falha ao adicionar função.");
    }
}

// --- Update Role (Placeholder for future) ---
// export async function updateRole(id: string, name: string): Promise<Role> {
//     console.log("Updating role in Firestore:", id, name);
//     const trimmedName = name.trim();
//     if (!trimmedName) {
//         throw new Error("Nome da função não pode ser vazio.");
//     }
//     try {
//          const docRef = doc(db, 'roles', id);
//          // Check for duplicates before updating
//          const q = query(rolesCollection, where("nameLower", "==", trimmedName.toLowerCase()));
//          const existing = await getDocs(q);
//          if (!existing.empty && existing.docs[0].id !== id) {
//              throw new Error(`A função "${trimmedName}" já existe.`);
//          }
//          await updateDoc(docRef, {
//              name: trimmedName,
//              nameLower: trimmedName.toLowerCase(),
//              updatedAt: Timestamp.now()
//          });
//          const updatedDoc = await getDoc(docRef);
//          if (!updatedDoc.exists()) throw new Error("Falha ao buscar função após atualização.");
//          return docToRole(updatedDoc as QueryDocumentSnapshot<DocumentData>);
//     } catch (error: any) {
//         console.error("Error updating role:", error);
//         throw new Error("Falha ao atualizar função.");
//     }
// }


/**
 * Asynchronously deletes a role from Firestore.
 * Checks if the role is currently in use by any employee before deleting.
 *
 * @param roleId The ID of the role to delete.
 * @returns A promise that resolves when deletion is complete.
 * @throws Error if role not found, in use, or other deletion error occurs.
 */
export async function deleteRole(roleId: string): Promise<void> {
    console.log("Deleting role from Firestore:", roleId);
    try {
        const roleDocRef = doc(db, 'roles', roleId);
        const roleDoc = await getDoc(roleDocRef);

        if (!roleDoc.exists()) {
            throw new Error("Função não encontrada para exclusão.");
        }

        const roleName = roleDoc.data().name; // Get the name for the employee check

        // **Important Check:** Verify if any employees are using this role.
        const employeesCollection = collection(db, 'employees');
        const q = query(employeesCollection, where("role", "==", roleName), limit(1)); // Check if at least one exists
        const employeeSnapshot = await getDocs(q);

        if (!employeeSnapshot.empty) {
            throw new Error(`Não é possível excluir a função "${roleName}" pois está em uso por colaboradores.`);
        }

        // Proceed with deletion if not in use
        await deleteDoc(roleDocRef);
        console.log(`Role ${roleId} (${roleName}) deleted successfully.`);

    } catch (error: any) {
        console.error("Error deleting role:", error);
         if (error.message.includes("encontrada") || error.message.includes("em uso")) {
            throw error;
         }
        throw new Error("Falha ao excluir função.");
    }
}

// Helper to get document snapshot
async function getDoc(ref: any): Promise<DocumentData> {
    const docSnap = await getDoc(ref);
    // Let the caller handle non-existence if needed
    return docSnap;
}
