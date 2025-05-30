
// src/lib/user-service.ts
import { getDb } from './firebase';
import type { UserProfile } from '@/types/user';
import { collection, getDocs, query, where, doc, setDoc, deleteDoc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';

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

  return usersSnapshot.docs.map(docSnapshot => {
    const data = docSnapshot.data();
    return {
      uid: docSnapshot.id,
      ...data,
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : data.createdAt,
      updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : data.updatedAt,
    } as UserProfile;
  });
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
  return querySnapshot.docs.map(docSnapshot => {
    const data = docSnapshot.data();
    return {
      uid: docSnapshot.id,
      ...data,
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : data.createdAt,
      updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : data.updatedAt,
      department: data.department || undefined,
      userRole: data.userRole || undefined,
    } as UserProfile
  });
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
  return querySnapshot.docs.map(docSnapshot => {
    const data = docSnapshot.data();
    return {
      uid: docSnapshot.id,
      ...data,
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : data.createdAt,
      updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : data.updatedAt,
      department: data.department || undefined, // Garante que o campo exista mesmo que undefined
      userRole: data.userRole || undefined,   // Garante que o campo exista mesmo que undefined
      photoUrl: data.photoUrl || undefined,
      phone: data.phone || undefined,
      admissionDate: data.admissionDate || undefined,
    } as UserProfile;
  });
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
  if (!userData.uid) {
      throw new Error('User UID is required to save user data.');
  }
  const userDocRef = doc(db, 'users', userData.uid);
  // Convert Date objects back to Timestamps if they exist, or use serverTimestamp
  const dataToSave: any = { ...userData };
  if (dataToSave.createdAt && dataToSave.createdAt instanceof Date) {
    dataToSave.createdAt = Timestamp.fromDate(dataToSave.createdAt);
  } else if (!dataToSave.createdAt) {
    dataToSave.createdAt = Timestamp.now(); // Use Timestamp.now() for new docs
  }
  if (dataToSave.updatedAt && dataToSave.updatedAt instanceof Date) {
    dataToSave.updatedAt = Timestamp.fromDate(dataToSave.updatedAt);
  } else {
    dataToSave.updatedAt = Timestamp.now();
  }


  await setDoc(userDocRef, dataToSave, { merge: true });
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
  await updateDoc(userDocRef, { status, updatedAt: Timestamp.now() });

  const updatedDoc = await getDoc(userDocRef);
  if (!updatedDoc.exists()) throw new Error('User not found after status update.');
  const data = updatedDoc.data();
  return {
      uid: userId,
      ...data,
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : data.createdAt,
      updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : data.updatedAt,
    } as UserProfile;
};
