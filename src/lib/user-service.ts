// src/lib/user-service.ts
import { getDb } from './firebase';
import type { UserProfile } from '@/types/user';
import { collection, getDocs, query, where, QuerySnapshot, DocumentData, setDoc, doc, deleteDoc, getDoc } from 'firebase/firestore';

/**
 * Fetches all users from the 'users' collection in Firestore.
 * @returns Promise resolving to an array of UserProfile objects.
 */
export const getAllUsers = async (): Promise<UserProfile[]> => {
  const db = getDb();
  if (!db) {
    console.error('Firestore not initialized. Cannot fetch users.');
    return [];
  }

  const usersCollection = collection(db, 'users');
  const usersSnapshot = await getDocs(usersCollection);

  return usersSnapshot.docs.map(doc => ({
    uid: doc.id,
    ...(doc.data() as Omit<UserProfile, 'uid'>)
  })) as UserProfile[];
};

/**
 * Saves or updates an employee's profile in Firestore.
 * @param employeeData The employee data to save. Includes UID for updates.
 * @returns Promise resolving to the saved or updated UserProfile object.
 */
export const saveEmployee = async (employeeData: Omit<UserProfile, 'uid'> | UserProfile): Promise<UserProfile> => {
  const db = getDb();
  if (!db) {
    throw new Error('Firestore not initialized. Cannot save employee.');
  }

  const usersCollection = collection(db, 'users');

  let docRef;
  let uid = '';

  if ('uid' in employeeData && employeeData.uid) {
    // Update existing user
    uid = employeeData.uid;
    docRef = doc(db, 'users', uid);
  } else {
    // Create new user
    docRef = doc(usersCollection);
    uid = docRef.id;
  }

  // Prepare data for saving (excluding UID for setDoc)
  const { uid: _, ...dataToSave } = employeeData;

  await setDoc(docRef, { ...dataToSave, uid }, { merge: true }); // Use merge to avoid overwriting other fields

  // Return the full employee object with the generated or existing UID
  return { uid, ...dataToSave } as UserProfile;
};

/**
 * Toggles the isActive status of an employee in Firestore.
 * @param employeeId The ID of the employee to update.
 * @param isActive The new isActive status.
 * @returns Promise resolving to the updated UserProfile object.
 */
export const toggleEmployeeStatus = async (employeeId: string, isActive: boolean): Promise<UserProfile> => {
  const db = getDb();
  if (!db) {
    throw new Error('Firestore not initialized. Cannot toggle employee status.');
  }

  const userDocRef = doc(db, 'users', employeeId);
  await setDoc(userDocRef, { isActive: isActive }, { merge: true });

  // Fetch the updated document to return the full profile
  const updatedDocSnap = await getDoc(userDocRef);
  if (!updatedDocSnap.exists()) {
    throw new Error(`User with ID ${employeeId} not found after update.`);
  }
  return { uid: updatedDocSnap.id, ...(updatedDocSnap.data() as Omit<UserProfile, 'uid'>) } as UserProfile;
};
export const deleteEmployee = async (employeeId: string): Promise<void> => {
  const db = getDb();
  if (!db) {
    throw new Error('Firestore not initialized. Cannot delete employee.');
  }
  await deleteDoc(doc(db, 'users', employeeId));
};

/**
 * Fetches users with a specific role from Firestore.
 * @param role The role to filter by (e.g., 'admin', 'collaborator', 'super_admin').
 * @returns Promise resolving to an array of UserProfile objects.
 */
export const getUsersByRole = async (role: string): Promise<UserProfile[]> => {
  const db = getDb();
  if (!db) {
    console.error('Firestore not initialized. Cannot fetch users.');
    return [];
  }

  const usersCollection = collection(db, 'users');
  const q = query(usersCollection, where('role', '==', role));
  const usersSnapshot = await getDocs(q);

  return usersSnapshot.docs.map(doc => ({
    uid: doc.id,
    ...(doc.data() as Omit<UserProfile, 'uid'>)
  })) as UserProfile[];
};

/**
 * Fetches users belonging to a specific organization from Firestore.
 * @param organizationId The organization ID to filter by.
 * @returns Promise resolving to an array of UserProfile objects.
 */
export const getUsersByOrganizationId = async (organizationId: string): Promise<UserProfile[]> => {
  const db = getDb();
  if (!db) {
    console.error('Firestore not initialized. Cannot fetch users.');
    return [];
  }

  const usersCollection = collection(db, 'users');
  const q = query(usersCollection, where('organizationId', '==', organizationId));
  const usersSnapshot = await getDocs(q);

  return usersSnapshot.docs.map(doc => ({
    uid: doc.id,
    ...(doc.data() as Omit<UserProfile, 'uid'>)
  })) as UserProfile[];
};

/**
 * Fetches users with a specific role and organization ID from Firestore.
 * @param role The role to filter by.
 * @param organizationId The organization ID to filter by.
 * @returns Promise resolving to an array of UserProfile objects.
 */
export const getUsersByRoleAndOrganizationId = async (role: string, organizationId: string): Promise<UserProfile[]> => {
  const db = getDb();
  if (!db) {
    console.error('Firestore not initialized. Cannot fetch users.');
    return [];
  }

  const usersCollection = collection(db, 'users');
  const q = query(usersCollection, where('role', '==', role), where('organizationId', '==', organizationId));
  const usersSnapshot = await getDocs(q);

  return usersSnapshot.docs.map(doc => ({
    uid: doc.id,
    ...(doc.data() as Omit<UserProfile, 'uid'>)
  })) as UserProfile[];
};