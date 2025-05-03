// src/lib/ranking-service.ts
import { getDb } from './firebase';
import type { Award } from '@/app/(admin)/ranking/page';
import { collection, getDocs, doc, setDoc, deleteDoc, getDoc, query, where } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import { format } from 'date-fns';


/**
 * Fetches all awards from the 'awards' collection in Firestore.
 * @param db Firestore instance.
 * @returns Promise resolving to an array of Award objects.
 */
export const getAllAwards = async (db: Firestore): Promise<Award[]> => {
  if (!db) {
    console.error('Firestore not initialized. Cannot fetch awards.');
    return [];
  }

  const awardsCollection = collection(db, 'awards');
  const awardsSnapshot = await getDocs(awardsCollection); // Using getDocs for a collection

  return awardsSnapshot.docs.map(doc => ({
    id: doc.id,
    ...(doc.data() as Omit<Award, 'id'>)
  })) as Award[];
};

/**
 * Saves or updates an award in Firestore. Award data includes ID for updates.
 * @param db Firestore instance.
 * @param awardData The award data to save. Includes ID for updates.
 * @returns Promise resolving to the saved or updated Award object.
 */
export const saveAward = async (db: Firestore, awardData: Omit<Award, 'id'> | Award): Promise<Award> => {
  if (!db) {
    throw new Error('Firestore not initialized. Cannot save award.');
  }

  const awardsCollection = collection(db, 'awards');

  let docRef;
  let id = '';

  if ('id' in awardData && awardData.id) {
    // Update existing award
    id = awardData.id;
    docRef = doc(db, 'awards', id);
  } else {
    // Create new award
    docRef = doc(awardsCollection);
    id = docRef.id;
  }

  // Prepare data for saving (excluding ID for setDoc)
  const { id: _, ...dataToSave } = awardData;

  await setDoc(docRef, { ...dataToSave, id }, { merge: true }); // Use merge to avoid overwriting other fields

  // Return the full award object with the generated or existing ID
  return { id, ...dataToSave } as Award;
};

/**
 * Fetches a single award by its ID from Firestore.
 * @param db Firestore instance.
 * @param awardId The ID of the award to fetch.
 * @returns Promise resolving to the Award object or null if not found.
 */
export const getAwardById = async (db: Firestore, awardId: string): Promise<Award | null> => {
  if (!db) {
    console.error('Firestore not initialized. Cannot fetch award by ID.');
    return null;
  }

  const awardDoc = doc(db, 'awards', awardId);
  const awardSnapshot = await getDoc(awardDoc); // Using getDoc for a single document

  if (awardSnapshot.exists()) {
    return { id: awardSnapshot.id, ...(awardSnapshot.data() as Omit<Award, 'id'>) } as Award;
  } else {
    return null;
  }
};

/**
 * Fetches the active award for a specific month from Firestore.
 * @param db Firestore instance.
 * @param monthDate The date object representing the month to check for active awards.
 * @returns Promise resolving to the active Award object or null if none is found.
 */
export const getActiveAward = async (db: Firestore, monthDate: Date): Promise<Award | null> => {
  if (!db) {
    console.error('Firestore not initialized. Cannot fetch active award.');
    return null;
  }

  const monthPeriod = format(monthDate, 'yyyy-MM');
  const q = query(collection(db, 'awards'), where('status', '==', 'active'), where('period', 'in', ['recorrente', monthPeriod]));
  const querySnapshot = await getDocs(q);

  // Assuming there should be at most one active recurring award and one active specific-month award per month
  // This simple implementation returns the first one found. More complex logic might be needed for multiple active awards.
  if (!querySnapshot.empty) {
    const doc = querySnapshot.docs[0];
    return { id: doc.id, ...(doc.data() as Omit<Award, 'id'>) } as Award;
  } else {
    return null;
  }
};

/**
 * Deletes an award from Firestore.
 * @param db Firestore instance.
 * @param awardId The ID of the award to delete.
 * @returns Promise resolving on successful deletion.
 */
export const deleteAward = async (db: Firestore, awardId: string): Promise<void> => {
  if (!db) {
    throw new Error('Firestore not initialized. Cannot delete award.');
  }
  await deleteDoc(doc(db, 'awards', awardId));
};