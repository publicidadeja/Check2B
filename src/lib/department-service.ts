
// src/lib/department-service.ts
import { getDb } from './firebase';
import type { Department } from '@/types/department';
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

const DEPARTMENTS_COLLECTION = 'departments'; // Subcollection under organizations

/**
 * Fetches all departments for a specific organization from Firestore.
 * @param organizationId The ID of the organization.
 * @returns Promise resolving to an array of Department objects.
 */
export const getDepartmentsByOrganization = async (organizationId: string): Promise<Department[]> => {
  const db = getDb();
  if (!db || !organizationId) {
    console.error('Firestore not initialized or organizationId missing. Cannot fetch departments.');
    return [];
  }

  const departmentsPath = `organizations/${organizationId}/${DEPARTMENTS_COLLECTION}`;
  const departmentsCollectionRef = collection(db, departmentsPath);
  const q = query(departmentsCollectionRef, orderBy("name")); // Order by name

  try {
    const departmentsSnapshot = await getDocs(q);
    return departmentsSnapshot.docs.map(docSnapshot => {
      const data = docSnapshot.data();
      return {
        id: docSnapshot.id,
        ...data,
        organizationId, // Ensure organizationId is part of the returned object
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : (data.createdAt ? new Date(data.createdAt) : undefined),
        updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : (data.updatedAt ? new Date(data.updatedAt) : undefined),
      } as Department;
    });
  } catch (error) {
    console.error(`Error fetching departments for organization ${organizationId}:`, error);
    throw error; // Re-throw the error to be caught by the caller
  }
};

/**
 * Saves or updates a department in Firestore for a specific organization.
 * @param organizationId The ID of the organization.
 * @param departmentData The department data to save. Includes ID for updates.
 * @returns Promise resolving to the saved or updated Department object ID.
 */
export const saveDepartment = async (
  organizationId: string,
  departmentData: Omit<Department, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'> & { id?: string }
): Promise<string> => {
  const db = getDb();
  if (!db || !organizationId) {
    throw new Error('Firestore not initialized or organizationId missing. Cannot save department.');
  }

  const departmentsPath = `organizations/${organizationId}/${DEPARTMENTS_COLLECTION}`;
  const { id, ...dataToSaveInDoc } = departmentData;

  if (id) {
    // Update existing department
    const deptDocRef = doc(db, departmentsPath, id);
    await updateDoc(deptDocRef, {
      ...dataToSaveInDoc,
      updatedAt: serverTimestamp(),
    });
    return id;
  } else {
    // Create new department
    const docRef = await addDoc(collection(db, departmentsPath), {
      ...dataToSaveInDoc,
      organizationId: organizationId, // Explicitly set for new documents if not passed
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  }
};

/**
 * Deletes a department from Firestore for a specific organization.
 * @param organizationId The ID of the organization.
 * @param departmentId The ID of the department to delete.
 * @returns Promise resolving on successful deletion.
 */
export const deleteDepartment = async (organizationId: string, departmentId: string): Promise<void> => {
  const db = getDb();
  if (!db || !organizationId) {
    throw new Error('Firestore not initialized or organizationId missing. Cannot delete department.');
  }
  // TODO: Add check if department is in use by employees before deleting
  const deptDocRef = doc(db, `organizations/${organizationId}/${DEPARTMENTS_COLLECTION}`, departmentId);
  await deleteDoc(deptDocRef);
};
