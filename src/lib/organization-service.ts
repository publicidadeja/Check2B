
// src/lib/organization-service.ts
import { getDb } from './firebase';
import type { Organization as PageOrganization } from '@/app/(superadmin)/superadmin/organizations/page'; // Use Organization type from page
import { collection, getDocs, doc, setDoc, deleteDoc, addDoc, updateDoc, getDoc, Timestamp } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import { countTotalUsersByOrganization } from './user-service'; // Import user counting service

/**
 * Fetches all organizations from the 'organizations' collection in Firestore.
 * Also fetches admin and collaborator counts for each organization.
 * @returns Promise resolving to an array of Organization objects.
 */
export const getAllOrganizations = async (): Promise<PageOrganization[]> => {
  const db = getDb();
  if (!db) {
    console.error('Firestore not initialized. Cannot fetch organizations.');
    return [];
  }

  const organizationsCollectionRef = collection(db, 'organizations');
  const organizationsSnapshot = await getDocs(organizationsCollectionRef);

  const orgsWithCounts = await Promise.all(
    organizationsSnapshot.docs.map(async (docSnapshot) => {
      const orgData = docSnapshot.data();
      const orgId = docSnapshot.id;

      const adminCount = await countTotalUsersByOrganization(orgId, 'admin');
      const collaboratorCount = await countTotalUsersByOrganization(orgId, 'collaborator');

      return {
        id: orgId,
        name: orgData.name,
        plan: orgData.plan,
        status: orgData.status,
        createdAt: orgData.createdAt instanceof Timestamp ? orgData.createdAt.toDate() : new Date(orgData.createdAt || Date.now()), // Ensure Date object
        adminCount: adminCount,
        collaboratorCount: collaboratorCount,
      } as PageOrganization;
    })
  );

  return orgsWithCounts;
};

/**
 * Saves or updates an organization in Firestore.
 * @param orgData The organization data to save. Includes ID for updates.
 * @returns Promise resolving to the saved or updated Organization object.
 */
export const saveOrganization = async (orgData: Omit<PageOrganization, 'id' | 'createdAt' | 'adminCount' | 'collaboratorCount'> | PageOrganization): Promise<PageOrganization> => {
  const db = getDb();
  if (!db) {
    throw new Error('Firestore not initialized. Cannot save organization.');
  }

  const { id, createdAt, adminCount, collaboratorCount, ...dataToSaveInDoc } = orgData as PageOrganization;


  if (id) {
    const orgDocRef = doc(db, 'organizations', id);
    await setDoc(orgDocRef, dataToSaveInDoc, { merge: true });
    // Re-fetch admin/collaborator counts if they were part of orgData, or assume they are handled elsewhere if not passed
    const currentAdminCount = adminCount !== undefined ? adminCount : await countTotalUsersByOrganization(id, 'admin');
    const currentCollaboratorCount = collaboratorCount !== undefined ? collaboratorCount : await countTotalUsersByOrganization(id, 'collaborator');

    return { ...orgData, id, createdAt: createdAt || new Date(), adminCount: currentAdminCount, collaboratorCount: currentCollaboratorCount } as PageOrganization;
  } else {
    const newOrgData = {
        ...dataToSaveInDoc,
        createdAt: Timestamp.now(), // Use Timestamp for new docs
        adminCount: 0, // New orgs start with 0 admins/collaborators managed through this function
        collaboratorCount: 0,
    };
    const docRef = await addDoc(collection(db, 'organizations'), newOrgData);
    const newOrgDoc = await getDoc(docRef);
    const newOrgSavedData = newOrgDoc.data();
    return {
        id: docRef.id,
        name: newOrgSavedData?.name,
        plan: newOrgSavedData?.plan,
        status: newOrgSavedData?.status,
        createdAt: newOrgSavedData?.createdAt instanceof Timestamp ? newOrgSavedData.createdAt.toDate() : new Date(),
        adminCount: 0,
        collaboratorCount: 0,
     } as PageOrganization;
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
export const updateOrganizationStatusInFirestore = async (orgId: string, status: PageOrganization['status']): Promise<PageOrganization> => {
  const db = getDb();
  if (!db) {
    throw new Error('Firestore not initialized. Cannot update organization status.');
  }
  const orgDocRef = doc(db, 'organizations', orgId);
  await updateDoc(orgDocRef, { status });

  const updatedDoc = await getDoc(orgDocRef);
  if (!updatedDoc.exists()) throw new Error('Organization not found after status update.');
  const data = updatedDoc.data();
  const adminCount = await countTotalUsersByOrganization(orgId, 'admin');
  const collaboratorCount = await countTotalUsersByOrganization(orgId, 'collaborator');
  return {
      id: updatedDoc.id,
      name: data.name,
      plan: data.plan,
      status: data.status,
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt),
      adminCount,
      collaboratorCount,
  } as PageOrganization;
};


/**
 * Fetches a single organization by its ID from Firestore.
 * @param orgId The ID of the organization to fetch.
 * @returns Promise resolving to the Organization object or null if not found.
 */
export const getOrganizationById = async (orgId: string): Promise<PageOrganization | null> => {
    const db = getDb();
    if (!db) {
        console.error("Firestore not initialized. Cannot fetch organization by ID.");
        return null;
    }
    const orgDocRef = doc(db, 'organizations', orgId);
    const docSnap = await getDoc(orgDocRef);

    if (docSnap.exists()) {
        const data = docSnap.data();
        const adminCount = await countTotalUsersByOrganization(orgId, 'admin');
        const collaboratorCount = await countTotalUsersByOrganization(orgId, 'collaborator');
        return {
            id: docSnap.id,
            name: data.name,
            plan: data.plan,
            status: data.status,
            createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt),
            adminCount,
            collaboratorCount,
        } as PageOrganization;
    } else {
        console.warn(`Organization with ID ${orgId} not found.`);
        return null;
    }
};

