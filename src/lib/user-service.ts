
// src/lib/user-service.ts
import { getDb, getFirebaseApp } from './firebase';
import type { UserProfile } from '@/types/user';
import { collection, getDocs, query, where, doc, setDoc, deleteDoc, getDoc, updateDoc, Timestamp, getCountFromServer } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import type { NotificationFormData } from '@/app/colaborador/perfil/page'; // Assuming this type is exported from profile page

/**
 * Fetches all users from the 'users' collection in Firestore.
 * @returns Promise resolving to an array of UserProfile objects.
 */
export const getAllUsers = async (): Promise<UserProfile[]> => {
  const db = getDb();
  if (!db) {
    console.error('[UserService] Firestore not initialized. Cannot fetch users.');
    return [];
  }
  console.log('[UserService] Fetching all users.');
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
    console.error('[UserService] Firestore not initialized. Cannot fetch users by role.');
    return [];
  }
  console.log(`[UserService] Fetching users by role: ${role}`);
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
    console.error('[UserService] Firestore not initialized. Cannot fetch users by role and organization.');
    return [];
  }
  console.log(`[UserService] Fetching users by role: ${role} for organizationId: ${organizationId}`);
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
      department: data.department || undefined,
      userRole: data.userRole || undefined,
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
    throw new Error('[UserService] Firestore not initialized. Cannot save user.');
  }
  if (!userData.uid) {
      throw new Error('[UserService] User UID is required to save user data.');
  }
  console.log(`[UserService] Saving user profile for UID: ${userData.uid}`);
  const userDocRef = doc(db, 'users', userData.uid);
  const dataToSave: any = { ...userData };
  if (dataToSave.createdAt && dataToSave.createdAt instanceof Date) {
    dataToSave.createdAt = Timestamp.fromDate(dataToSave.createdAt);
  } else if (!dataToSave.createdAt) {
    dataToSave.createdAt = Timestamp.now();
  }
  if (dataToSave.updatedAt && dataToSave.updatedAt instanceof Date) {
    dataToSave.updatedAt = Timestamp.fromDate(dataToSave.updatedAt);
  } else {
    dataToSave.updatedAt = Timestamp.now();
  }

  const { uid, ...profileDataToSet } = dataToSave;
  await setDoc(userDocRef, profileDataToSet, { merge: true });
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
    throw new Error('[UserService] Firestore not initialized. Cannot delete user.');
  }
  console.log(`[UserService] Deleting user profile from Firestore for UID: ${userId}`);
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
    throw new Error('[UserService] Firestore not initialized. Cannot update user status.');
  }
  console.log(`[UserService] Updating status for user UID: ${userId} to ${status}`);
  const userDocRef = doc(db, 'users', userId);
  await updateDoc(userDocRef, { status, updatedAt: Timestamp.now() });

  const updatedDoc = await getDoc(userDocRef);
  if (!updatedDoc.exists()) throw new Error('[UserService] User not found after status update.');
  const data = updatedDoc.data();
  return {
      uid: userId,
      ...data,
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : data.createdAt,
      updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : data.updatedAt,
    } as UserProfile;
};

/**
 * Uploads a profile photo for a user to Firebase Storage.
 * @param userId The ID of the user.
 * @param file The photo file to upload.
 * @returns Promise resolving to the download URL of the uploaded photo.
 */
export const uploadProfilePhoto = async (userId: string, file: File): Promise<string> => {
  const app = getFirebaseApp();
  if (!app) {
    throw new Error('[UserService] Firebase App not initialized. Cannot upload profile photo.');
  }
  const storage = getStorage(app);
  if (!storage) {
    throw new Error('[UserService] Firebase Storage not initialized. Cannot upload profile photo.');
  }
  console.log(`[UserService] Uploading profile photo for user UID: ${userId}, filename: ${file.name}`);
  const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const filePath = `profile_photos/${userId}/${Date.now()}_${sanitizedFileName}`;
  const fileRef = ref(storage, filePath);

  try {
    const snapshot = await uploadBytes(fileRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    console.log(`[UserService] Profile photo uploaded for user ${userId}: ${downloadURL}`);
    return downloadURL;
  } catch (error) {
    console.error(`[UserService] Error uploading profile photo for user ${userId}:`, error);
    throw error;
  }
};

/**
 * Fetches notification settings for a user from Firestore.
 * @param userId The ID of the user.
 * @returns Promise resolving to NotificationFormData or null if not found.
 */
export const getNotificationSettings = async (userId: string): Promise<NotificationFormData | null> => {
  const db = getDb();
  if (!db) {
    console.error('[UserService] Firestore not initialized. Cannot get notification settings.');
    return null;
  }
  // Log an NWTAS aqui
  console.log(`[UserService - getNotificationSettings] Attempting to fetch settings for userId: ${userId}`);
  const settingsDocRef = doc(db, `users/${userId}/settings`, 'notifications');
  try {
    const docSnap = await getDoc(settingsDocRef);
    if (docSnap.exists()) {
      console.log(`[UserService - getNotificationSettings] Settings found for userId: ${userId}`, docSnap.data());
      return docSnap.data() as NotificationFormData;
    }
    console.log(`[UserService - getNotificationSettings] No settings document found for userId: ${userId}`);
    return null; // No settings found, can use defaults in component
  } catch (error) {
    console.error(`[UserService - getNotificationSettings] Error fetching notification settings for user ${userId}:`, error);
    throw error; // Re-throw para que a página de perfil possa pegar o erro
  }
};

/**
 * Saves notification settings for a user in Firestore.
 * @param userId The ID of the user.
 * @param settings The notification settings data to save.
 * @returns Promise resolving on successful save.
 */
export const saveNotificationSettings = async (userId: string, settings: NotificationFormData): Promise<void> => {
  const db = getDb();
  if (!db) {
    throw new Error('[UserService] Firestore not initialized. Cannot save notification settings.');
  }
  console.log(`[UserService] Saving notification settings for userId: ${userId}`, settings);
  const settingsDocRef = doc(db, `users/${userId}/settings`, 'notifications');
  try {
    await setDoc(settingsDocRef, settings, { merge: true });
  } catch (error) {
    console.error(`[UserService] Error saving notification settings for user ${userId}:`, error);
    throw error;
  }
};


/**
 * Counts total users in an organization, optionally filtered by role.
 * @param organizationId The ID of the organization.
 * @param role Optional role to filter by.
 * @returns Promise resolving to the count of users.
 */
export const countTotalUsersByOrganization = async (organizationId: string, role?: 'collaborator' | 'admin'): Promise<number> => {
  const db = getDb();
  if (!db || !organizationId) {
    console.error('[UserService] Firestore not initialized or organizationId missing for countTotalUsersByOrganization.');
    return 0;
  }
  console.log(`[UserService] Counting total users for org ${organizationId} ${role ? `with role ${role}` : ''}`);
  const usersCollectionRef = collection(db, 'users');
  let q = query(usersCollectionRef, where('organizationId', '==', organizationId));
  if (role) {
    q = query(q, where('role', '==', role));
  }

  try {
    const snapshot = await getCountFromServer(q);
    return snapshot.data().count;
  } catch (error) {
    console.error(`[UserService] Error counting total users for org ${organizationId} ${role ? `with role ${role}` : ''}:`, error);
    throw error;
  }
};

/**
 * Counts active users in an organization, optionally filtered by role.
 * @param organizationId The ID of the organization.
 * @param role Optional role to filter by.
 * @returns Promise resolving to the count of active users.
 */
export const countActiveUsersByOrganization = async (organizationId: string, role?: 'collaborator' | 'admin'): Promise<number> => {
  const db = getDb();
  if (!db || !organizationId) {
    console.error('[UserService] Firestore not initialized or organizationId missing for countActiveUsersByOrganization.');
    return 0;
  }
  console.log(`[UserService] Counting active users for org ${organizationId} ${role ? `with role ${role}` : ''}`);
  const usersCollectionRef = collection(db, 'users');
  let q = query(usersCollectionRef, where('organizationId', '==', organizationId), where('status', '==', 'active'));
  if (role) {
    q = query(q, where('role', '==', role));
  }

  try {
    const snapshot = await getCountFromServer(q);
    return snapshot.data().count;
  } catch (error) {
    console.error(`[UserService] Error counting active users for org ${organizationId} ${role ? `with role ${role}` : ''}:`, error);
    throw error;
  }
};

    