// src/lib/organization-service.ts
import { getDb } from './firebase';
import type { Organization } from '@/app/(superadmin)/superadmin/organizations/page'; // Use Organization type from page
import { collection, getDocs, doc, setDoc, deleteDoc, addDoc, updateDoc, getDoc } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';

/**
 * Fetches all organizations from the 'organizations' collection in Firestore.
 * @returns Promise resolving to an array of Organization objects.
 */
export const getAllOrganizations = async (): Promise<Organization[]> => {
  const db = getDb();
  if (!db) {
    console.error('Firestore not initialized. Cannot fetch organizations.');
    return [];
  }

  const organizationsCollectionRef = collection(db, 'organizations');
  const organizationsSnapshot = await getDocs(organizationsCollectionRef);

  return organizationsSnapshot.docs.map(docSnapshot => ({ // Renamed doc to docSnapshot
    id: docSnapshot.id,
    // Ensure createdAt is converted from Firestore Timestamp to Date
    createdAt: docSnapshot.data().createdAt?.toDate ? docSnapshot.data().createdAt.toDate() : new Date(),
    ...(docSnapshot.data() as Omit<Organization, 'id' | 'createdAt'>)
  })) as Organization[];
};

/**
 * Saves or updates an organization in Firestore.
 * @param orgData The organization data to save. Includes ID for updates.
 * @returns Promise resolving to the saved or updated Organization object.
 */
export const saveOrganization = async (orgData: Omit<Organization, 'id' | 'createdAt' | 'adminCount' | 'userCount'> | Organization): Promise<Organization> => {
  const db = getDb();
  if (!db) {
    throw new Error('Firestore not initialized. Cannot save organization.');
  }

  // Prepare data for Firestore (remove id if present, as it's the doc key)
  const { id, createdAt, adminCount, userCount, ...dataToSaveInDoc } = orgData as Organization;


  if (id) {
    // Update existing organization
    const orgDocRef = doc(db, 'organizations', id);
    await setDoc(orgDocRef, dataToSaveInDoc, { merge: true });
    return { ...orgData, id, createdAt: createdAt || new Date() } as Organization; // Return with existing createdAt or new if somehow missing
  } else {
    // Create new organization
    const newOrgData = {
        ...dataToSaveInDoc,
        createdAt: new Date(), // Firestore serverTimestamp() is better in production
        adminCount: 0,
        userCount: 0,
    };
    const docRef = await addDoc(collection(db, 'organizations'), newOrgData);
    return { id: docRef.id, ...newOrgData } as Organization;
  }
};


/**
 * Deletes an organization from Firestore.
 * @param orgId The ID of the organization to delete.
 * @returns Promise resolving on successful deletion.
 */
export const deleteOrganizationFromFirestore = async (orgId: string): Promise<void> => {
  const db = getDb();
  if (!db) {
    throw new Error('Firestore not initialized. Cannot delete organization.');
  }
  const orgDocRef = doc(db, 'organizations', orgId);
  await deleteDoc(orgDocRef);
};

/**
 * Updates an organization's status in Firestore.
 * @param orgId The ID of the organization.
 * @param status The new status.
 * @returns Promise resolving to the updated Organization.
 */
export const updateOrganizationStatusInFirestore = async (orgId: string, status: Organization['status']): Promise<Organization> => {
  const db = getDb();
  if (!db) {
    throw new Error('Firestore not initialized. Cannot update organization status.');
  }
  const orgDocRef = doc(db, 'organizations', orgId);
  await updateDoc(orgDocRef, { status });

  const updatedDoc = await getDoc(orgDocRef);
  if (!updatedDoc.exists()) throw new Error('Organization not found after status update.');
  const data = updatedDoc.data();
  return {
      id: updatedDoc.id,
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
      ...(data as Omit<Organization, 'id' | 'createdAt'>)
  } as Organization;
};


/**
 * Fetches a single organization by its ID from Firestore.
 * @param orgId The ID of the organization to fetch.
 * @returns Promise resolving to the Organization object or null if not found.
 */
export const getOrganizationById = async (orgId: string): Promise<Organization | null> => {
    const db = getDb();
    if (!db) {
        console.error("Firestore not initialized. Cannot fetch organization by ID.");
        return null;
    }
    const orgDocRef = doc(db, 'organizations', orgId);
    const docSnap = await getDoc(orgDocRef);

    if (docSnap.exists()) {
        const data = docSnap.data();
        return {
            id: docSnap.id,
            name: data.name,
            plan: data.plan,
            status: data.status,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(), // Convert Timestamp to Date
            adminCount: data.adminCount || 0,
            userCount: data.userCount || 0,
        } as Organization;
    } else {
        console.warn(`Organization with ID ${orgId} not found.`);
        return null;
    }
};
