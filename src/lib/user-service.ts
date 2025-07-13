// src/lib/user-service.ts
import { getDb, getFirebaseApp } from './firebase';
import type { UserProfile } from '@/types/user';
import { collection, getDocs, query, where, doc, setDoc, deleteDoc, getDoc, updateDoc, Timestamp, getCountFromServer, serverTimestamp, arrayUnion } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions'; // Adicionar import para Functions
import type { NotificationFormData } from '@/app/colaborador/perfil/page';

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
  const usersCollection = collection(db, 'users');
  const usersSnapshot = await getDocs(usersCollection);

  return usersSnapshot.docs.map(docSnapshot => {
    const data = docSnapshot.data();
    return {
      uid: docSnapshot.id,
      ...data,
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : (data.createdAt ? new Date(data.createdAt) : undefined),
      updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : (data.updatedAt ? new Date(data.updatedAt) : undefined),
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
  const usersCollectionRef = collection(db, 'users');
  const q = query(usersCollectionRef, where('role', '==', role));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(docSnapshot => {
    const data = docSnapshot.data();
    return {
      uid: docSnapshot.id,
      ...data,
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : (data.createdAt ? new Date(data.createdAt) : undefined),
      updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : (data.updatedAt ? new Date(data.updatedAt) : undefined),
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
  const usersCollectionRef = collection(db, 'users');
  const q = query(usersCollectionRef, where('role', '==', role), where('organizationId', '==', organizationId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(docSnapshot => {
    const data = docSnapshot.data();
    return {
      uid: docSnapshot.id,
      ...data,
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : (data.createdAt ? new Date(data.createdAt) : undefined),
      updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : (data.updatedAt ? new Date(data.updatedAt) : undefined),
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
export const saveUser = async (userData: Partial<UserProfile>): Promise<UserProfile> => {
  const db = getDb();
  if (!db) {
    throw new Error('[UserService] Firestore not initialized. Cannot save user.');
  }
  if (!userData.uid) {
      throw new Error('[UserService] User UID is required to save user data.');
  }
  const userDocRef = doc(db, 'users', userData.uid);

  const dataForFirestore: { [key: string]: any } = {
    updatedAt: serverTimestamp(),
  };

  if (userData.hasOwnProperty('phone')) {
    dataForFirestore.phone = userData.phone === '' ? null : userData.phone;
  }
  if (userData.hasOwnProperty('photoUrl')) {
    dataForFirestore.photoUrl = userData.photoUrl === '' ? null : userData.photoUrl;
  }

  if (userData.hasOwnProperty('name') && userData.name !== undefined) dataForFirestore.name = userData.name;
  if (userData.hasOwnProperty('email') && userData.email !== undefined) dataForFirestore.email = userData.email;
  if (userData.hasOwnProperty('role') && userData.role !== undefined) dataForFirestore.role = userData.role;
  if (userData.hasOwnProperty('organizationId') && userData.organizationId !== undefined) dataForFirestore.organizationId = userData.organizationId;
  if (userData.hasOwnProperty('status') && userData.status !== undefined) dataForFirestore.status = userData.status;
  if (userData.hasOwnProperty('department') && userData.department !== undefined) dataForFirestore.department = userData.department;
  if (userData.hasOwnProperty('userRole') && userData.userRole !== undefined) dataForFirestore.userRole = userData.userRole;
  if (userData.hasOwnProperty('admissionDate') && userData.admissionDate !== undefined) dataForFirestore.admissionDate = userData.admissionDate;

  await setDoc(userDocRef, dataForFirestore, { merge: true });
  
  const savedDoc = await getDoc(userDocRef);
  if (!savedDoc.exists()) {
    throw new Error("Failed to retrieve user after saving.");
  }
  const savedData = savedDoc.data();

  return {
    uid: userData.uid,
    ...savedData,
    createdAt: savedData.createdAt instanceof Timestamp ? savedData.createdAt.toDate() : (savedData.createdAt ? new Date(savedData.createdAt) : undefined),
    updatedAt: savedData.updatedAt instanceof Timestamp ? savedData.updatedAt.toDate() : (savedData.updatedAt ? new Date(savedData.updatedAt) : undefined),
  } as UserProfile; 
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
  const userDocRef = doc(db, 'users', userId);
  await updateDoc(userDocRef, { status, updatedAt: serverTimestamp() });

  const updatedDoc = await getDoc(userDocRef);
  if (!updatedDoc.exists()) throw new Error('[UserService] User not found after status update.');
  const data = updatedDoc.data();
  return {
      uid: userId,
      ...data,
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : (data.createdAt ? new Date(data.createdAt) : undefined),
      updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : (data.updatedAt ? new Date(data.updatedAt) : undefined),
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
  const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const filePath = `profile_photos/${userId}/${Date.now()}_${sanitizedFileName}`;
  const fileRef = ref(storage, filePath);

  try {
    const snapshot = await uploadBytes(fileRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
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
  const settingsDocRef = doc(db, `users/${userId}/settings`, 'notifications');
  try {
    const docSnap = await getDoc(settingsDocRef);
    if (docSnap.exists()) {
      return docSnap.data() as NotificationFormData;
    }
    return null; 
  } catch (error) {
    console.error(`[UserService] Error fetching notification settings for user ${userId}:`, error);
    throw error; 
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
    
/**
 * Saves a new Firebase Cloud Messaging (FCM) token for a user.
 * This function is intended to be called from the frontend (e.g., via the WebView bridge).
 * It will then make a secure call to a Cloud Function to perform the actual database write.
 * @param userId The ID of the user.
 * @param fcmToken The new FCM token from the device.
 * @returns Promise resolving on successful save.
 */
export const saveUserFcmToken = async (userId: string, fcmToken: string): Promise<void> => {
  const db = getDb();
  if (!db) {
    throw new Error('[UserService] Firestore not initialized. Cannot save FCM token.');
  }
  // This is a frontend service function. Instead of calling a Cloud Function (which would add complexity here),
  // we will directly and safely update the Firestore document from the client.
  // Firestore security rules should be in place to ensure a user can only update their own `fcmTokens` array.
  if (!userId || !fcmToken) {
    throw new Error('[UserService] User ID and FCM Token are required.');
  }

  console.log(`[UserService] Attempting to save FCM token for user UID: ${userId}`);
  const userDocRef = doc(db, 'users', userId);
  
  try {
    // Use arrayUnion to atomically add the new token to the array.
    // This prevents race conditions and ensures no duplicate tokens are added.
    await updateDoc(userDocRef, {
        fcmTokens: arrayUnion(fcmToken),
        updatedAt: serverTimestamp(),
    });
    console.log(`[UserService] Successfully updated FCM token for user ${userId}`);
  } catch (error) {
    console.error(`[UserService] Error saving FCM token for user ${userId}:`, error);
    // This could fail due to permissions. Ensure Firestore rules allow this write.
    // Example Rule: `allow update: if request.auth.uid == resource.id && request.resource.data.keys().hasOnly(['fcmTokens', 'updatedAt']);`
    throw new Error('Failed to save notification token. Check permissions and network.');
  }
};
