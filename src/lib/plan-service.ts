// src/lib/plan-service.ts
import { getDb } from './firebase';
import type { Plan } from '@/types/plan'; // Assuming Plan type is in src/types
import {
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  addDoc,
  updateDoc,
  getDoc,
  Timestamp, // Import Timestamp
  serverTimestamp
} from 'firebase/firestore';

const PLANS_COLLECTION = 'plans';

/**
 * Fetches all plans from the 'plans' collection in Firestore.
 * @returns Promise resolving to an array of Plan objects.
 */
export const getAllPlans = async (): Promise<Plan[]> => {
  const db = getDb();
  if (!db) {
    console.error('Firestore not initialized. Cannot fetch plans.');
    return [];
  }

  const plansCollectionRef = collection(db, PLANS_COLLECTION);
  const plansSnapshot = await getDocs(plansCollectionRef);

  return plansSnapshot.docs.map(docSnapshot => {
    const data = docSnapshot.data();
    return {
      id: docSnapshot.id,
      ...data,
      // Convert Firestore Timestamps to JS Date objects
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt),
      updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : (data.updatedAt ? new Date(data.updatedAt) : undefined),
    } as Plan;
  });
};

/**
 * Fetches a single plan by its ID from Firestore.
 * @param planId The ID of the plan to fetch.
 * @returns Promise resolving to the Plan object or null if not found.
 */
export const getPlanById = async (planId: string): Promise<Plan | null> => {
  const db = getDb();
  if (!db) {
    console.error('Firestore not initialized. Cannot fetch plan by ID.');
    return null;
  }
  const planDocRef = doc(db, PLANS_COLLECTION, planId);
  const docSnap = await getDoc(planDocRef);

  if (docSnap.exists()) {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      ...data,
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt),
      updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : (data.updatedAt ? new Date(data.updatedAt) : undefined),
    } as Plan;
  } else {
    console.warn(`Plan with ID ${planId} not found.`);
    return null;
  }
};

/**
 * Saves or updates a plan in Firestore.
 * @param planData The plan data to save. Includes ID for updates.
 * @returns Promise resolving to the saved or updated Plan object ID.
 */
export const savePlan = async (planData: Omit<Plan, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<string> => {
  const db = getDb();
  if (!db) {
    throw new Error('Firestore not initialized. Cannot save plan.');
  }

  const { id, ...dataToSave } = planData;
  const enrichedData: any = {
    ...dataToSave,
    updatedAt: serverTimestamp(), // Always set/update updatedAt
  };

  if (id) {
    // Update existing plan
    const planDocRef = doc(db, PLANS_COLLECTION, id);
    await setDoc(planDocRef, enrichedData, { merge: true });
    return id;
  } else {
    // Create new plan
    enrichedData.createdAt = serverTimestamp(); // Set createdAt only on creation
    const docRef = await addDoc(collection(db, PLANS_COLLECTION), enrichedData);
    return docRef.id;
  }
};

/**
 * Deletes a plan from Firestore.
 * @param planId The ID of the plan to delete.
 * @returns Promise resolving on successful deletion.
 */
export const deletePlan = async (planId: string): Promise<void> => {
  const db = getDb();
  if (!db) {
    throw new Error('Firestore not initialized. Cannot delete plan.');
  }
  // Optional: Add check if plan is in use by organizations before deleting
  const planDocRef = doc(db, PLANS_COLLECTION, planId);
  await deleteDoc(planDocRef);
};

/**
 * Updates a plan's status in Firestore.
 * @param planId The ID of the plan.
 * @param status The new status.
 * @returns Promise resolving when the update is complete.
 */
export const updatePlanStatus = async (planId: string, status: Plan['status']): Promise<void> => {
  const db = getDb();
  if (!db) {
    throw new Error('Firestore not initialized. Cannot update plan status.');
  }
  const planDocRef = doc(db, PLANS_COLLECTION, planId);
  await updateDoc(planDocRef, { 
    status: status,
    updatedAt: serverTimestamp() 
  });
};
