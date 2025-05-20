// src/lib/user-service.ts
import { getDb } from './firebase';
import type { UserProfile } from '@/types/user';
import { collection, getDocs, query, where, doc, setDoc, deleteDoc, getDoc, updateDoc } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';

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
 * Fetches users with a specific role from Firestore.
 * @param role The role to filter by (e.g., 'admin', 'collaborator').
 * @returns Promise resolving to an array of UserProfile objects.
 */
export const getUsersByRole = async (role: 'admin' | 'collaborator' | 'super_admin'): Promise<UserProfile[]> => {
  const db = getDb();
  if (!db) {
    console.error('Firestore not initialized. Cannot fetch users by role.');
    return [];
  }
  const usersCollectionRef = collection(db, 'users');
  const q = query(usersCollectionRef, where('role', '==', role));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
};

/**
 * Fetches users with a specific role and organization ID from Firestore.
 * @param role The role to filter by.
 * @param organizationId The organization ID to filter by.
 * @returns Promise resolving to an array of UserProfile objects.
 */
export const getUsersByRoleAndOrganization = async (role: 'admin' | 'collaborator', organizationId: string): Promise<UserProfile[]> => {
  const db = getDb();
  if (!db) {
    console.error('Firestore not initialized. Cannot fetch users by role and organization.');
    return [];
  }
  const usersCollectionRef = collection(db, 'users');
  const q = query(usersCollectionRef, where('role', '==', role), where('organizationId', '==', organizationId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
};


/**
 * Saves or updates a user's profile in Firestore.
 * If UID is provided, it updates. Otherwise, it creates a new document (though UID should typically come from Auth).
 * @param userData The user data to save. Includes UID for updates.
 * @returns Promise resolving to the saved or updated UserProfile object.
 */
export const saveUser = async (userData: UserProfile): Promise<UserProfile> => {
  const db = getDb();
  if (!db) {
    throw new Error('Firestore not initialized. Cannot save user.');
  }
  // Ensure UID is present, as it's the document ID
  if (!userData.uid) {
      throw new Error('User UID is required to save user data.');
  }
  const userDocRef = doc(db, 'users', userData.uid);
  // Use setDoc with merge:true to update or create if not exists, without overwriting unspecified fields
  await setDoc(userDocRef, userData, { merge: true });
  return userData;
};

/**
 * Deletes a user's profile from Firestore.
 * Note: This does NOT delete the user from Firebase Authentication.
 * @param userId The ID of the user to delete from Firestore.
 * @returns Promise resolving on successful deletion.
 */
export const deleteUserFromFirestore = async (userId: string): Promise<void> => {
  const db = getDb();
  if (!db) {
    throw new Error('Firestore not initialized. Cannot delete user.');
  }
  const userDocRef = doc(db, 'users', userId);
  await deleteDoc(userDocRef);
};

/**
 * Updates a user's status (active/inactive) in Firestore.
 * @param userId The ID of the user.
 * @param status The new status.
 * @returns Promise resolving to the updated UserProfile.
 */
export const updateUserStatusInFirestore = async (userId: string, status: 'active' | 'inactive' | 'pending'): Promise<UserProfile> => {
  const db = getDb();
  if (!db) {
    throw new Error('Firestore not initialized. Cannot update user status.');
  }
  const userDocRef = doc(db, 'users', userId);
  await updateDoc(userDocRef, { status });

  const updatedDoc = await getDoc(userDocRef);
  if (!updatedDoc.exists()) throw new Error('User not found after status update.');
  return { uid: userId, ...updatedDoc.data() } as UserProfile;
};
