
// src/lib/ranking-service.ts
import { getDb } from './firebase';
import type { Award, AwardHistoryEntry } from '@/app/(admin)/ranking/page'; // Ajustado para usar AwardHistoryEntry
import type { RankingSettings, RankingSettingsData } from '@/types/ranking'; // Import RankingSettings
import {
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  getDoc,
  query,
  where,
  orderBy, // Adicionado orderBy
  Timestamp, // Adicionado Timestamp
  addDoc, // Adicionado addDoc
  serverTimestamp, // Import serverTimestamp
} from 'firebase/firestore';
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

  const awardsCollectionRef = collection(db, 'awards');
  // Ordenar por título para consistência, ou por data de criação/status
  const q = query(awardsCollectionRef, orderBy("title"));
  const awardsSnapshot = await getDocs(q);

  return awardsSnapshot.docs.map(docSnapshot => {
    const data = docSnapshot.data();
    return {
      id: docSnapshot.id,
      ...data,
      // Converter Timestamps para Date se necessário
      specificMonth: data.specificMonth instanceof Timestamp ? data.specificMonth.toDate() : data.specificMonth,
    } as Award;
  });
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

  const awardsCollectionRef = collection(db, 'awards');
  let docRef;
  let idToSave = 'id' in awardData ? awardData.id : undefined;

  // Prepara os dados para salvar, convertendo Date para Timestamp se necessário
  const dataForFirestore: any = { ...awardData };
  if (dataForFirestore.specificMonth && dataForFirestore.specificMonth instanceof Date) {
    dataForFirestore.specificMonth = Timestamp.fromDate(dataForFirestore.specificMonth);
  }
  // Remove o ID do objeto de dados se ele existir, pois o ID é o nome do documento
  if ('id' in dataForFirestore) {
    delete dataForFirestore.id;
  }


  if (idToSave) {
    // Update existing award
    docRef = doc(db, 'awards', idToSave);
    await setDoc(docRef, dataForFirestore, { merge: true }); // Usar setDoc com merge para criar se não existir ou atualizar
  } else {
    // Create new award
    docRef = await addDoc(awardsCollectionRef, dataForFirestore); // addDoc para novo documento com ID gerado
    idToSave = docRef.id; // Pega o ID gerado
  }

  const savedDoc = await getDoc(docRef);
  if (!savedDoc.exists()) {
    throw new Error('Failed to retrieve the saved award from Firestore.');
  }
  const savedData = savedDoc.data();

  return {
    id: idToSave!, // Garante que idToSave não é undefined aqui
    ...savedData,
    specificMonth: savedData?.specificMonth instanceof Timestamp ? savedData.specificMonth.toDate() : savedData?.specificMonth,
  } as Award;
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

  const awardDocRef = doc(db, 'awards', awardId);
  const awardSnapshot = await getDoc(awardDocRef);

  if (awardSnapshot.exists()) {
    const data = awardSnapshot.data();
    return {
      id: awardSnapshot.id,
      ...data,
      specificMonth: data.specificMonth instanceof Timestamp ? data.specificMonth.toDate() : data.specificMonth,
    } as Award;
  } else {
    return null;
  }
};

/**
 * Fetches the active award for a specific month from Firestore.
 * Looks for either a recurring award or an award specific to that month.
 * @param db Firestore instance.
 * @param monthDate The date object representing the month to check for active awards.
 * @returns Promise resolving to the active Award object or null if none is found.
 */
export const getActiveAward = async (db: Firestore, monthDate: Date): Promise<Award | null> => {
  if (!db) {
    console.error('Firestore not initialized. Cannot fetch active award.');
    return null;
  }

  const awardsCollectionRef = collection(db, 'awards');
  const monthPeriod = format(monthDate, 'yyyy-MM');

  // Query for specific month award first
  const specificMonthQuery = query(
    awardsCollectionRef,
    where('status', '==', 'active'),
    where('isRecurring', '==', false),
    where('period', '==', monthPeriod) // Assuming 'period' stores 'yyyy-MM' for specific month awards
  );
  const specificMonthSnapshot = await getDocs(specificMonthQuery);

  if (!specificMonthSnapshot.empty) {
    const doc = specificMonthSnapshot.docs[0]; // Prioritize specific month award
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      specificMonth: data.specificMonth instanceof Timestamp ? data.specificMonth.toDate() : data.specificMonth,
    } as Award;
  }

  // If no specific month award, query for recurring award
  const recurringQuery = query(
    awardsCollectionRef,
    where('status', '==', 'active'),
    where('isRecurring', '==', true)
  );
  const recurringSnapshot = await getDocs(recurringQuery);

  if (!recurringSnapshot.empty) {
    const doc = recurringSnapshot.docs[0]; // Take the first active recurring award found
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      specificMonth: data.specificMonth instanceof Timestamp ? data.specificMonth.toDate() : data.specificMonth,
    } as Award;
  }

  return null; // No active award found
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
  // Consider adding checks here: e.g., don't delete if it's linked to historical data.
  await deleteDoc(doc(db, 'awards', awardId));
};


/**
 * Saves an award history entry to Firestore.
 * @param db Firestore instance.
 * @param historyEntryData Data for the new history entry (without id).
 * @returns Promise resolving with the new history entry ID.
 */
export const saveAwardHistory = async (db: Firestore, historyEntryData: Omit<AwardHistoryEntry, 'id'>): Promise<string> => {
    if (!db) {
        throw new Error('Firestore not initialized. Cannot save award history.');
    }
    const historyCollectionRef = collection(db, 'awardHistory');
    const docRef = await addDoc(historyCollectionRef, {
        ...historyEntryData,
        // Convert deliveryPhotoUrl to null if it's undefined, Firestore doesn't like undefined
        deliveryPhotoUrl: historyEntryData.deliveryPhotoUrl || null,
        notes: historyEntryData.notes || null,
        createdAt: Timestamp.now(), // Add a creation timestamp
    });
    return docRef.id;
};

/**
 * Fetches all award history entries from Firestore, ordered by period descending.
 * @param db Firestore instance.
 * @returns Promise resolving to an array of AwardHistoryEntry objects.
 */
export const getAwardHistory = async (db: Firestore): Promise<AwardHistoryEntry[]> => {
    if (!db) {
        console.error('Firestore not initialized. Cannot fetch award history.');
        return [];
    }
    const historyCollectionRef = collection(db, 'awardHistory');
    const q = query(historyCollectionRef, orderBy("period", "desc")); // Order by period (YYYY-MM)
    const snapshot = await getDocs(q);

    return snapshot.docs.map(docSnapshot => {
        const data = docSnapshot.data();
        return {
            id: docSnapshot.id,
            ...data,
            // Ensure any Timestamps are converted to Dates if necessary for client-side use
            // Example: createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt),
        } as AwardHistoryEntry;
    });
};

// --- Ranking Settings ---
const RANKING_CONFIG_DOC_ID = 'mainConfig'; // Fixed ID for the ranking config document

/**
 * Fetches ranking settings for a specific organization.
 * @param organizationId The ID of the organization.
 * @returns Promise resolving to RankingSettings object or null if not found/error.
 */
export const getRankingSettings = async (organizationId: string): Promise<RankingSettings | null> => {
  const db = getDb();
  if (!db || !organizationId) {
    console.error('Firestore not initialized or organizationId missing. Cannot fetch ranking settings.');
    return null;
  }
  const settingsDocRef = doc(db, `organizations/${organizationId}/rankingManagement`, RANKING_CONFIG_DOC_ID);
  try {
    const docSnap = await getDoc(settingsDocRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id, // Should be RANKING_CONFIG_DOC_ID
        ...data,
        updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : undefined,
      } as RankingSettings;
    }
    return null; // No settings found, return null to use defaults in component
  } catch (error) {
    console.error(`Error fetching ranking settings for org ${organizationId}:`, error);
    throw error;
  }
};

/**
 * Saves ranking settings for a specific organization.
 * @param organizationId The ID of the organization.
 * @param settingsData The ranking settings data to save.
 * @returns Promise resolving on successful save.
 */
export const saveRankingSettings = async (organizationId: string, settingsData: RankingSettingsData): Promise<void> => {
  const db = getDb();
  if (!db || !organizationId) {
    throw new Error('Firestore not initialized or organizationId missing. Cannot save ranking settings.');
  }
  const settingsDocRef = doc(db, `organizations/${organizationId}/rankingManagement`, RANKING_CONFIG_DOC_ID);
  try {
    await setDoc(settingsDocRef, {
      ...settingsData,
      updatedAt: serverTimestamp(),
    }, { merge: true }); // Use merge:true to create if not exists or update if exists
  } catch (error) {
    console.error(`Error saving ranking settings for org ${organizationId}:`, error);
    throw error;
  }
};
