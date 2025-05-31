
// src/lib/ranking-service.ts
import { getDb, getFirebaseApp } from './firebase'; // Added getFirebaseApp
import type { Award, AwardHistoryEntry, RankingEntry } from '@/app/(admin)/ranking/page';
import type { RankingSettings, RankingSettingsData } from '@/types/ranking';
import type { UserProfile } from '@/types/user';
import type { Evaluation } from '@/types/evaluation';
import type { ChallengeParticipation } from '@/types/challenge';
import {
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  getDoc,
  query,
  where,
  orderBy,
  Timestamp,
  addDoc,
  serverTimestamp,
  updateDoc, // Ensure updateDoc is imported
} from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage"; // Added Storage imports
import { format, startOfMonth, endOfMonth, parseISO, subMonths } from 'date-fns'; // Added subMonths
import { getEvaluationsForOrganizationInPeriod } from './evaluation-service';
import { getApprovedChallengeParticipationsForOrganizationInPeriod } from './challenge-service';
import { getUsersByRoleAndOrganization } from './user-service';


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
  const q = query(awardsCollectionRef, orderBy("title"));
  const awardsSnapshot = await getDocs(q);

  return awardsSnapshot.docs.map(docSnapshot => {
    const data = docSnapshot.data();
    return {
      id: docSnapshot.id,
      ...data,
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

  const dataForFirestore: any = { ...awardData };
  if (dataForFirestore.specificMonth && dataForFirestore.specificMonth instanceof Date) {
    dataForFirestore.specificMonth = Timestamp.fromDate(dataForFirestore.specificMonth);
  }
  if ('id' in dataForFirestore) {
    delete dataForFirestore.id;
  }


  if (idToSave) {
    docRef = doc(db, 'awards', idToSave);
    await setDoc(docRef, dataForFirestore, { merge: true });
  } else {
    docRef = await addDoc(awardsCollectionRef, dataForFirestore);
    idToSave = docRef.id;
  }

  const savedDoc = await getDoc(docRef);
  if (!savedDoc.exists()) {
    throw new Error('Failed to retrieve the saved award from Firestore.');
  }
  const savedData = savedDoc.data();

  return {
    id: idToSave!,
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

  const specificMonthQuery = query(
    awardsCollectionRef,
    where('status', '==', 'active'),
    where('isRecurring', '==', false),
    where('period', '==', monthPeriod)
  );
  const specificMonthSnapshot = await getDocs(specificMonthQuery);

  if (!specificMonthSnapshot.empty) {
    const doc = specificMonthSnapshot.docs[0];
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      specificMonth: data.specificMonth instanceof Timestamp ? data.specificMonth.toDate() : data.specificMonth,
    } as Award;
  }

  const recurringQuery = query(
    awardsCollectionRef,
    where('status', '==', 'active'),
    where('isRecurring', '==', true)
  );
  const recurringSnapshot = await getDocs(recurringQuery);

  if (!recurringSnapshot.empty) {
    const doc = recurringSnapshot.docs[0];
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      specificMonth: data.specificMonth instanceof Timestamp ? data.specificMonth.toDate() : data.specificMonth,
    } as Award;
  }

  return null;
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
        deliveryPhotoUrl: historyEntryData.deliveryPhotoUrl || null,
        notes: historyEntryData.notes || null,
        createdAt: Timestamp.now(),
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
    const q = query(historyCollectionRef, orderBy("period", "desc"));
    const snapshot = await getDocs(q);

    return snapshot.docs.map(docSnapshot => {
        const data = docSnapshot.data();
        return {
            id: docSnapshot.id,
            ...data,
        } as AwardHistoryEntry;
    });
};

/**
 * Uploads an award delivery photo to Firebase Storage.
 * @param organizationId The ID of the organization.
 * @param awardHistoryId The ID of the award history entry.
 * @param file The photo file to upload.
 * @returns Promise resolving to the download URL of the uploaded photo.
 */
export const uploadAwardDeliveryPhoto = async (
  organizationId: string, // Add organizationId for path structuring
  awardHistoryId: string,
  file: File
): Promise<string> => {
  const app = getFirebaseApp();
  if (!app) {
    throw new Error('[RankingService] Firebase App not initialized. Cannot upload photo.');
  }
  const storage = getStorage(app);
  if (!storage) {
    throw new Error('[RankingService] Firebase Storage not initialized. Cannot upload photo.');
  }
  if (!organizationId || !awardHistoryId) {
    throw new Error('[RankingService] Missing organizationId or awardHistoryId for photo upload.');
  }

  const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
  const filePath = `organizations/${organizationId}/award_deliveries/${awardHistoryId}/${Date.now()}_${sanitizedFileName}`;
  const fileRef = ref(storage, filePath);

  try {
    const snapshot = await uploadBytes(fileRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    console.log(`[RankingService] Award delivery photo uploaded for ${awardHistoryId}: ${downloadURL}`);
    return downloadURL;
  } catch (error) {
    console.error(`[RankingService] Error uploading award delivery photo for ${awardHistoryId}:`, error);
    throw error;
  }
};

/**
 * Updates the deliveryPhotoUrl for an award history entry in Firestore.
 * @param db Firestore instance.
 * @param awardHistoryId The ID of the award history entry to update.
 * @param photoUrl The new photo URL.
 * @returns Promise resolving on successful update.
 */
export const updateAwardHistoryPhoto = async (db: Firestore, awardHistoryId: string, photoUrl: string): Promise<void> => {
  if (!db) {
    throw new Error('Firestore not initialized. Cannot update award history photo.');
  }
  const historyDocRef = doc(db, 'awardHistory', awardHistoryId);
  try {
    await updateDoc(historyDocRef, {
      deliveryPhotoUrl: photoUrl,
      updatedAt: serverTimestamp(), // Optional: track updates
    });
    console.log(`[RankingService] Updated delivery photo for award history ${awardHistoryId}`);
  } catch (error) {
    console.error(`[RankingService] Error updating delivery photo for award history ${awardHistoryId}:`, error);
    throw error;
  }
};


// --- Ranking Settings ---
const RANKING_CONFIG_DOC_ID = 'mainConfig';

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
        id: docSnap.id,
        ...data,
        updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : undefined,
      } as RankingSettings;
    }
    return null;
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
    }, { merge: true });
  } catch (error) {
    console.error(`Error saving ranking settings for org ${organizationId}:`, error);
    throw error;
  }
};


// Helper function to calculate ranking for a specific period
const calculateRankingForPeriod = async (
    organizationId: string,
    period: Date,
    employees: UserProfile[],
    settings: RankingSettings | null
): Promise<RankingEntry[]> => {
    const db = getDb();
    if (!db) throw new Error('Firestore not initialized for ranking calculation.');

    const startDate = startOfMonth(period);
    const endDate = endOfMonth(period);
    const startDateString = format(startDate, 'yyyy-MM-dd');
    const endDateString = format(endDate, 'yyyy-MM-dd');

    console.log(`[RankingService] Calculating internal ranking for period: ${startDateString} to ${endDateString}`);

    try {
        const [evaluations, challengeParticipations] = await Promise.all([
            getEvaluationsForOrganizationInPeriod(organizationId, startDateString, endDateString),
            getApprovedChallengeParticipationsForOrganizationInPeriod(organizationId, startDate, endDate),
        ]);

        const rankingEntries: Omit<RankingEntry, 'rank' | 'trend'>[] = employees
            .filter(emp => {
                if (settings?.includeProbation === false && emp.admissionDate) {
                     try {
                        const admission = parseISO(emp.admissionDate + 'T00:00:00Z'); // Ensure TZ for correct parsing
                        const ninetyDaysAfterAdmission = new Date(admission);
                        ninetyDaysAfterAdmission.setDate(admission.getDate() + 90);
                        return period >= ninetyDaysAfterAdmission;
                    } catch (e) {
                        console.warn(`Invalid admissionDate format for employee ${emp.uid}: ${emp.admissionDate}. Including in ranking by default.`);
                        return true;
                    }
                }
                return true;
            })
            .map(employee => {
                let score = 0;
                let zeros = 0;

                const employeeEvaluations = evaluations.filter(ev => ev.employeeId === employee.uid);
                employeeEvaluations.forEach(ev => {
                    if (ev.score === 10) {
                        score += 10;
                    } else if (ev.score === 0) {
                        zeros += 1;
                    }
                });

                const employeeChallengeScores = challengeParticipations
                    .filter(cp => cp.employeeId === employee.uid && cp.score)
                    .reduce((sum, cp) => sum + (cp.score || 0), 0);

                score += employeeChallengeScores;

                return {
                    employeeId: employee.uid,
                    employeeName: employee.name,
                    employeePhotoUrl: employee.photoUrl,
                    department: employee.department || 'N/A',
                    role: employee.userRole || 'N/A',
                    score,
                    zeros,
                    admissionDate: employee.admissionDate
                };
            });

        rankingEntries.sort((a, b) => {
            if (b.score !== a.score) {
                return b.score - a.score;
            }
            if (settings?.tieBreaker === 'zeros') {
                if (a.zeros !== b.zeros) {
                    return a.zeros - b.zeros;
                }
            }
            if (settings?.tieBreaker === 'admissionDate' && a.admissionDate && b.admissionDate) {
                 try {
                    const dateA = parseISO(a.admissionDate + 'T00:00:00Z');
                    const dateB = parseISO(b.admissionDate + 'T00:00:00Z');
                    return dateA.getTime() - dateB.getTime(); // Older admission date ranks higher
                } catch (e) {
                    console.warn("Error parsing admission dates for tie-breaking:", a.admissionDate, b.admissionDate, e);
                }
            }
            return a.employeeName.localeCompare(b.employeeName);
        });
        
        return rankingEntries.map((entry, index) => ({
            ...entry,
            rank: index + 1,
            // trend will be calculated later
        })) as RankingEntry[];

    } catch (error) {
        console.error(`[RankingService] Error calculating internal ranking for period ${format(period, 'yyyy-MM')}:`, error);
        throw error;
    }
};


/**
 * Calculates the monthly ranking for an organization, including trend.
 * @param organizationId The ID of the organization.
 * @param currentPeriodDate The month/year for which to calculate the ranking.
 * @returns Promise resolving to an array of RankingEntry objects with trend.
 */
export const calculateMonthlyRanking = async (organizationId: string, currentPeriodDate: Date): Promise<RankingEntry[]> => {
    const db = getDb();
    if (!db) throw new Error('Firestore not initialized for ranking calculation.');

    console.log(`[RankingService] Calculating ranking for org ${organizationId}, current period: ${format(currentPeriodDate, 'yyyy-MM')}`);

    try {
        const employees = await getUsersByRoleAndOrganization('collaborator', organizationId);
        const settings = await getRankingSettings(organizationId);

        const currentRanking = await calculateRankingForPeriod(organizationId, currentPeriodDate, employees, settings);

        // Calculate previous month's ranking for trend
        const previousPeriodDate = subMonths(currentPeriodDate, 1);
        let previousRanking: RankingEntry[] = [];
        try {
            // Check if the previous month is not before a certain system start date if needed
            // For simplicity, we just attempt to calculate it.
            previousRanking = await calculateRankingForPeriod(organizationId, previousPeriodDate, employees, settings);
        } catch (prevError) {
            console.warn(`[RankingService] Could not calculate ranking for previous period (${format(previousPeriodDate, 'yyyy-MM')}):`, prevError);
            // Proceed without previous ranking if it fails (e.g., first month of data)
        }

        const previousRankingMap = new Map(previousRanking.map(entry => [entry.employeeId, entry]));

        const finalRankingWithTrend = currentRanking.map(currentEntry => {
            const previousEntry = previousRankingMap.get(currentEntry.employeeId);
            let trend: 'up' | 'down' | 'stable' = 'stable';

            if (previousEntry) {
                if (currentEntry.rank < previousEntry.rank) {
                    trend = 'up';
                } else if (currentEntry.rank > previousEntry.rank) {
                    trend = 'down';
                }
            } else {
                // If not in previous ranking, consider as 'up' (new entry or moved up significantly)
                // Or 'stable' if it's the first month of ranking overall
                trend = previousRanking.length > 0 ? 'up' : 'stable';
            }
            return { ...currentEntry, trend };
        });
        
        console.log(`[RankingService] Final ranking calculated with trend for ${format(currentPeriodDate, 'yyyy-MM')}. Entries: ${finalRankingWithTrend.length}`);
        return finalRankingWithTrend;

    } catch (error) {
        console.error(`[RankingService] Error calculating monthly ranking for org ${organizationId} (current: ${format(currentPeriodDate, 'yyyy-MM')}):`, error);
        throw error;
    }
};
