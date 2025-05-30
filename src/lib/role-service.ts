// src/lib/role-service.ts
import { getDb } from './firebase';
import type { Role } from '@/types/role';
import {
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  addDoc,
  query,
  orderBy,
  Timestamp,
  serverTimestamp,
  updateDoc,
  getDoc
} from 'firebase/firestore';

/**
 * Fetches all roles for a specific organization from Firestore.
 * @param organizationId The ID of the organization.
 * @returns Promise resolving to an array of Role objects.
 */
export const getRolesByOrganization = async (organizationId: string): Promise<Role[]> => {
  const db = getDb();
  if (!db || !organizationId) {
    console.error('Firestore not initialized or organizationId missing. Cannot fetch roles.');
    return [];
  }

  const rolesPath = `organizations/${organizationId}/roles`;
  const rolesCollectionRef = collection(db, rolesPath);
  const q = query(rolesCollectionRef, orderBy("name"));

  try {
    const rolesSnapshot = await getDocs(q);
    return rolesSnapshot.docs.map(docSnapshot => {
      const data = docSnapshot.data();
      return {
        id: docSnapshot.id,
        ...data,
        organizationId,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : (data.createdAt ? new Date(data.createdAt) : undefined),
        updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : (data.updatedAt ? new Date(data.updatedAt) : undefined),
      } as Role;
    });
  } catch (error) {
    console.error(`Error fetching roles for organization ${organizationId}:`, error);
    throw error;
  }
};

/**
 * Saves or updates a role in Firestore for a specific organization.
 * @param organizationId The ID of the organization.
 * @param roleData The role data to save. Includes ID for updates.
 * @returns Promise resolving to the saved or updated Role object ID.
 */
export const saveRole = async (
  organizationId: string,
  roleData: Omit<Role, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'> & { id?: string }
): Promise<string> => {
  const db = getDb();
  if (!db || !organizationId) {
    throw new Error('Firestore not initialized or organizationId missing. Cannot save role.');
  }

  const rolesPath = `organizations/${organizationId}/roles`;
  const { id, ...dataToSaveInDoc } = roleData;

  if (id) {
    // Update existing role
    const roleDocRef = doc(db, rolesPath, id);
    await updateDoc(roleDocRef, {
      ...dataToSaveInDoc,
      updatedAt: serverTimestamp(),
    });
    return id;
  } else {
    // Create new role
    const docRef = await addDoc(collection(db, rolesPath), {
      ...dataToSaveInDoc,
      organizationId: organizationId, 
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  }
};

/**
 * Deletes a role from Firestore for a specific organization.
 * @param organizationId The ID of the organization.
 * @param roleId The ID of the role to delete.
 * @returns Promise resolving on successful deletion.
 */
export const deleteRole = async (organizationId: string, roleId: string): Promise<void> => {
  const db = getDb();
  if (!db || !organizationId) {
    throw new Error('Firestore not initialized or organizationId missing. Cannot delete role.');
  }
  // TODO: Add check if role is in use by employees before deleting
  const roleDocRef = doc(db, `organizations/${organizationId}/roles`, roleId);
  await deleteDoc(roleDocRef);
};
