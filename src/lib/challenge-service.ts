
// src/lib/challenge-service.ts
import { getDb, getFirebaseApp } from './firebase'; // Added getFirebaseApp
import type { Challenge, ChallengeParticipation, ChallengeSettings, ChallengeSettingsData } from '@/types/challenge'; // Added ChallengeSettings
import {
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  addDoc,
  query,
  orderBy,
  where,
  Timestamp,
  serverTimestamp,
  updateDoc,
  getDoc,
  writeBatch,
} from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage"; // Added Storage imports
import { format } from 'date-fns';

const CHALLENGES_COLLECTION = 'challenges';
const PARTICIPATIONS_COLLECTION = 'challengeParticipations';
const CHALLENGE_MANAGEMENT_COLLECTION = 'challengeManagement';
const CHALLENGE_SETTINGS_DOC_ID = 'settings';


/**
 * Fetches all challenges for a specific organization from Firestore.
 */
export const getAllChallenges = async (organizationId: string): Promise<Challenge[]> => {
  const db = getDb();
  if (!db || !organizationId) {
    console.error('[ChallengeService] Firestore not initialized or organizationId missing.');
    return [];
  }
  const challengesPath = `organizations/${organizationId}/${CHALLENGES_COLLECTION}`;
  const challengesCollectionRef = collection(db, challengesPath);
  const q = query(challengesCollectionRef, orderBy("periodStartDate", "desc"));

  try {
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docSnapshot => {
      const data = docSnapshot.data();
      return {
        id: docSnapshot.id,
        ...data,
        organizationId,
        periodStartDate: data.periodStartDate,
        periodEndDate: data.periodEndDate,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : (data.createdAt ? new Date(data.createdAt) : new Date()),
        updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : (data.updatedAt ? new Date(data.updatedAt) : undefined),
        eligibility: data.eligibility || { type: 'all' },
      } as Challenge;
    });
  } catch (error) {
    console.error(`[ChallengeService] Error fetching challenges for org ${organizationId}:`, error);
    throw error;
  }
};

/**
 * Saves or updates a challenge in Firestore for a specific organization.
 */
export const saveChallenge = async (
  organizationId: string,
  challengeData: Omit<Challenge, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'> & { id?: string }
): Promise<Challenge> => {
  const db = getDb();
  if (!db || !organizationId) {
    throw new Error('[ChallengeService] Firestore not initialized or organizationId missing.');
  }
  const challengesPath = `organizations/${organizationId}/${CHALLENGES_COLLECTION}`;
  const { id, ...dataToSave } = challengeData;

  const eligibilityToSave: { type: Challenge['eligibility']['type']; entityIds?: string[] } = {
    type: dataToSave.eligibility.type,
  };

  if (dataToSave.eligibility.type !== 'all' && dataToSave.eligibility.entityIds && dataToSave.eligibility.entityIds.length > 0) {
    eligibilityToSave.entityIds = dataToSave.eligibility.entityIds;
  }

  const finalDataToSave = {
    title: dataToSave.title,
    description: dataToSave.description,
    category: dataToSave.category || null,
    periodStartDate: typeof dataToSave.periodStartDate === 'string' ? dataToSave.periodStartDate : format(dataToSave.periodStartDate, 'yyyy-MM-dd'),
    periodEndDate: typeof dataToSave.periodEndDate === 'string' ? dataToSave.periodEndDate : format(dataToSave.periodEndDate, 'yyyy-MM-dd'),
    points: dataToSave.points,
    difficulty: dataToSave.difficulty,
    participationType: dataToSave.participationType,
    eligibility: eligibilityToSave,
    evaluationMetrics: dataToSave.evaluationMetrics,
    supportMaterialUrl: dataToSave.supportMaterialUrl || null,
    imageUrl: dataToSave.imageUrl || null,
    status: id ? dataToSave.status : (dataToSave.status || 'draft'), // Set default 'draft' for new challenges
    updatedAt: serverTimestamp(),
  };

  let docRef;
  if (id) {
    docRef = doc(db, challengesPath, id);
    await updateDoc(docRef, finalDataToSave);
  } else {
    // @ts-ignore
    finalDataToSave.createdAt = serverTimestamp();
    docRef = await addDoc(collection(db, challengesPath), finalDataToSave);
  }

  const savedDoc = await getDoc(docRef);
  if (!savedDoc.exists()) {
    throw new Error('[ChallengeService] Failed to retrieve the saved challenge from Firestore.');
  }
  const savedData = savedDoc.data();
  return {
    id: savedDoc.id,
    ...savedData,
    organizationId,
    createdAt: savedData?.createdAt instanceof Timestamp ? savedData.createdAt.toDate() : new Date(),
    updatedAt: savedData?.updatedAt instanceof Timestamp ? savedData.updatedAt.toDate() : new Date(),
    eligibility: savedData?.eligibility || { type: 'all' },
  } as Challenge;
};


/**
 * Deletes a challenge and its participations from Firestore.
 */
export const deleteChallenge = async (organizationId: string, challengeId: string): Promise<void> => {
  const db = getDb();
  if (!db || !organizationId) {
    throw new Error('[ChallengeService] Firestore not initialized or organizationId missing.');
  }

  const batch = writeBatch(db);

  const challengeDocRef = doc(db, `organizations/${organizationId}/${CHALLENGES_COLLECTION}`, challengeId);
  batch.delete(challengeDocRef);

  const participationsPath = `organizations/${organizationId}/${PARTICIPATIONS_COLLECTION}`;
  const participationsQuery = query(collection(db, participationsPath), where("challengeId", "==", challengeId));

  try {
    const participationsSnapshot = await getDocs(participationsQuery);
    participationsSnapshot.forEach(docSnapshot => {
      batch.delete(docSnapshot.ref);
    });

    await batch.commit();
    console.log(`[ChallengeService] Challenge ${challengeId} and its participations deleted successfully.`);
  } catch (error) {
    console.error(`[ChallengeService] Error deleting challenge ${challengeId} or its participations:`, error);
    throw error;
  }
};

/**
 * Updates the status of a challenge.
 */
export const updateChallengeStatus = async (organizationId: string, challengeId: string, status: Challenge['status']): Promise<Challenge> => {
    const db = getDb();
    if (!db || !organizationId) {
        throw new Error('[ChallengeService] Firestore not initialized or organizationId missing.');
    }
    const challengeDocRef = doc(db, `organizations/${organizationId}/${CHALLENGES_COLLECTION}`, challengeId);
    await updateDoc(challengeDocRef, { status, updatedAt: serverTimestamp() });

    const updatedDoc = await getDoc(challengeDocRef);
    if (!updatedDoc.exists()) throw new Error("[ChallengeService] Challenge not found after status update.");
    const data = updatedDoc.data();
    return {
        id: updatedDoc.id,
        ...data,
        organizationId,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt),
        updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(),
        eligibility: data.eligibility || { type: 'all' },
    } as Challenge;
};

/**
 * Fetches participations for a specific challenge.
 */
export const getParticipationsForChallenge = async (organizationId: string, challengeId: string): Promise<ChallengeParticipation[]> => {
  const db = getDb();
  if (!db || !organizationId) {
    console.error('[ChallengeService] Firestore not initialized or organizationId missing.');
    return [];
  }
  const participationsPath = `organizations/${organizationId}/${PARTICIPATIONS_COLLECTION}`;
  const participationsCollectionRef = collection(db, participationsPath);
  const q = query(participationsCollectionRef, where("challengeId", "==", challengeId), orderBy("submittedAt", "desc"));

  try {
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docSnapshot => {
      const data = docSnapshot.data();
      return {
        id: docSnapshot.id,
        ...data,
        organizationId,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : (data.createdAt ? new Date(data.createdAt) : undefined),
        updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : (data.updatedAt ? new Date(data.updatedAt) : undefined),
        acceptedAt: data.acceptedAt instanceof Timestamp ? data.acceptedAt.toDate() : (data.acceptedAt ? new Date(data.acceptedAt) : undefined),
        submittedAt: data.submittedAt instanceof Timestamp ? data.submittedAt.toDate() : (data.submittedAt ? new Date(data.submittedAt) : undefined),
        evaluatedAt: data.evaluatedAt instanceof Timestamp ? data.evaluatedAt.toDate() : (data.evaluatedAt ? new Date(data.evaluatedAt) : undefined),
      } as ChallengeParticipation;
    });
  } catch (error) {
    console.error(`[ChallengeService] Error fetching participations for challenge ${challengeId}:`, error);
    throw error;
  }
};

/**
 * Fetches all approved challenge participations for an organization within a given date range (based on evaluation date).
 * @param organizationId The ID of the organization.
 * @param startDate The start date of the period.
 * @param endDate The end date of the period.
 * @returns Promise resolving to an array of ChallengeParticipation objects.
 */
export const getApprovedChallengeParticipationsForOrganizationInPeriod = async (organizationId: string, startDate: Date, endDate: Date): Promise<ChallengeParticipation[]> => {
  const db = getDb();
  if (!db || !organizationId) {
    console.error('[ChallengeService] Firestore not initialized or organizationId missing.');
    return [];
  }
  const participationsPath = `organizations/${organizationId}/${PARTICIPATIONS_COLLECTION}`;
  const participationsCollectionRef = collection(db, participationsPath);

  const startTimestamp = Timestamp.fromDate(startDate);
  const endTimestamp = Timestamp.fromDate(endDate);

  const q = query(
    participationsCollectionRef,
    where("status", "==", "approved"),
    where("evaluatedAt", ">=", startTimestamp),
    where("evaluatedAt", "<=", endTimestamp)
  );

  try {
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docSnapshot => {
      const data = docSnapshot.data();
      return {
        id: docSnapshot.id,
        ...data,
        organizationId,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : (data.createdAt ? new Date(data.createdAt) : undefined),
        updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : (data.updatedAt ? new Date(data.updatedAt) : undefined),
        acceptedAt: data.acceptedAt instanceof Timestamp ? data.acceptedAt.toDate() : (data.acceptedAt ? new Date(data.acceptedAt) : undefined),
        submittedAt: data.submittedAt instanceof Timestamp ? data.submittedAt.toDate() : (data.submittedAt ? new Date(data.submittedAt) : undefined),
        evaluatedAt: data.evaluatedAt instanceof Timestamp ? data.evaluatedAt.toDate() : (data.evaluatedAt ? new Date(data.evaluatedAt) : undefined),
      } as ChallengeParticipation;
    });
  } catch (error) {
    console.error(`[ChallengeService] Error fetching approved participations for org ${organizationId} in period:`, error);
    throw error;
  }
};


/**
 * Evaluates a challenge submission.
 */
export const evaluateSubmission = async (
  organizationId: string,
  participationId: string,
  evaluationData: { status: 'approved' | 'rejected'; score?: number; feedback?: string; evaluatorId: string; }
): Promise<ChallengeParticipation> => {
  const db = getDb();
  if (!db || !organizationId) {
    throw new Error('[ChallengeService] Firestore not initialized or organizationId missing.');
  }
  const participationDocRef = doc(db, `organizations/${organizationId}/${PARTICIPATIONS_COLLECTION}`, participationId);

  const dataToUpdate: any = {
    status: evaluationData.status,
    score: evaluationData.score !== undefined ? evaluationData.score : null,
    feedback: evaluationData.feedback || null,
    evaluatorId: evaluationData.evaluatorId,
    evaluatedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await updateDoc(participationDocRef, dataToUpdate);
  const updatedDoc = await getDoc(participationDocRef);
  if (!updatedDoc.exists()) throw new Error("[ChallengeService] Participation not found after evaluation.");
  const data = updatedDoc.data();
  return {
      id: updatedDoc.id,
      ...data,
      organizationId,
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt),
      updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(),
      acceptedAt: data.acceptedAt instanceof Timestamp ? data.acceptedAt.toDate() : (data.acceptedAt ? new Date(data.acceptedAt) : undefined),
      submittedAt: data.submittedAt instanceof Timestamp ? data.submittedAt.toDate() : (data.submittedAt ? new Date(data.submittedAt) : undefined),
      evaluatedAt: data.evaluatedAt instanceof Timestamp ? data.evaluatedAt.toDate() : new Date(),
  } as ChallengeParticipation;
};

/**
 * Fetches a single challenge and its participations.
 */
export const getChallengeDetails = async (organizationId: string, challengeId: string): Promise<{ challenge: Challenge; participants: ChallengeParticipation[] } | null> => {
  const db = getDb();
  if (!db || !organizationId) {
    console.error('[ChallengeService] Firestore not initialized or organizationId missing.');
    return null;
  }
  const challengeDocRef = doc(db, `organizations/${organizationId}/${CHALLENGES_COLLECTION}`, challengeId);
  const challengeSnap = await getDoc(challengeDocRef);

  if (!challengeSnap.exists()) return null;

  const challengeData = challengeSnap.data();
  const challenge = {
    id: challengeSnap.id,
    ...challengeData,
    organizationId,
    createdAt: challengeData.createdAt instanceof Timestamp ? challengeData.createdAt.toDate() : new Date(challengeData.createdAt),
    updatedAt: challengeData.updatedAt instanceof Timestamp ? challengeData.updatedAt.toDate() : (challengeData.updatedAt ? new Date(challengeData.updatedAt) : undefined),
    eligibility: challengeData.eligibility || { type: 'all' },
  } as Challenge;

  const participants = await getParticipationsForChallenge(organizationId, challengeId);
  return { challenge, participants };
};

/**
 * Uploads a submission file for a challenge to Firebase Storage.
 */
export const uploadChallengeSubmissionFile = async (
  organizationId: string,
  challengeId: string,
  employeeId: string,
  file: File
): Promise<string> => {
  const app = getFirebaseApp();
  if (!app) {
    throw new Error('[ChallengeService] Firebase App not initialized. Cannot upload file.');
  }
  const storage = getStorage(app);
  if (!storage) {
    throw new Error('[ChallengeService] Firebase Storage not initialized. Cannot upload file.');
  }
  if (!organizationId || !challengeId || !employeeId) {
    throw new Error('[ChallengeService] Missing organizationId, challengeId, or employeeId for file upload.');
  }

  const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
  const filePath = `organizations/${organizationId}/challenges/${challengeId}/submissions/${employeeId}/${Date.now()}_${sanitizedFileName}`;
  const fileRef = ref(storage, filePath);

  try {
    const snapshot = await uploadBytes(fileRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    console.log(`[ChallengeService] File uploaded for challenge ${challengeId} by ${employeeId}: ${downloadURL}`);
    return downloadURL;
  } catch (error) {
    console.error(`[ChallengeService] Error uploading file for challenge ${challengeId}:`, error);
    throw error;
  }
};

export const deleteChallengeSubmissionFile = async (fileUrl: string): Promise<void> => {
    const storage = getStorage();
    if (!storage) throw new Error("[ChallengeService] Firebase Storage not initialized.");

    try {
        const fileRef = ref(storage, fileUrl);
        await deleteObject(fileRef);
        console.log(`[ChallengeService] File deleted: ${fileUrl}`);
    } catch (error) {
        if ((error as any).code === 'storage/object-not-found') {
            console.warn(`[ChallengeService] File not found for deletion (might be already deleted): ${fileUrl}`);
        } else {
            console.error(`[ChallengeService] Error deleting file ${fileUrl}:`, error);
            throw error;
        }
    }
};

/**
 * Fetches all challenge participations for a specific employee within an organization.
 */
export const getChallengeParticipationsByEmployee = async (organizationId: string, employeeId: string): Promise<ChallengeParticipation[]> => {
  const db = getDb();
  if (!db || !organizationId || !employeeId) {
    console.error('[ChallengeService] Firestore not initialized or missing IDs for getChallengeParticipationsByEmployee.');
    return [];
  }
  const participationsPath = `organizations/${organizationId}/${PARTICIPATIONS_COLLECTION}`;
  const participationsCollectionRef = collection(db, participationsPath);
  const q = query(participationsCollectionRef, where("employeeId", "==", employeeId), orderBy("createdAt", "desc"));

  try {
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docSnapshot => {
      const data = docSnapshot.data();
      return {
        id: docSnapshot.id,
        ...data,
        organizationId,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : (data.createdAt ? new Date(data.createdAt) : undefined),
        updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : (data.updatedAt ? new Date(data.updatedAt) : undefined),
        acceptedAt: data.acceptedAt instanceof Timestamp ? data.acceptedAt.toDate() : (data.acceptedAt ? new Date(data.acceptedAt) : undefined),
        submittedAt: data.submittedAt instanceof Timestamp ? data.submittedAt.toDate() : (data.submittedAt ? new Date(data.submittedAt) : undefined),
        evaluatedAt: data.evaluatedAt instanceof Timestamp ? data.evaluatedAt.toDate() : (data.evaluatedAt ? new Date(data.evaluatedAt) : undefined),
      } as ChallengeParticipation;
    });
  } catch (error) {
    console.error(`[ChallengeService] Error fetching participations for employee ${employeeId} in org ${organizationId}:`, error);
    throw error;
  }
};

/**
 * Allows an employee to accept a challenge. Creates or updates participation status to 'accepted'.
 */
export const acceptChallengeForEmployee = async (
  organizationId: string,
  challengeId: string,
  employeeId: string,
  employeeName: string
): Promise<ChallengeParticipation> => { // Ensure it returns ChallengeParticipation
  const db = getDb();
  if (!db || !organizationId || !challengeId || !employeeId) {
    throw new Error('[ChallengeService] Missing required IDs for accepting challenge.');
  }

  const participationsPath = `organizations/${organizationId}/${PARTICIPATIONS_COLLECTION}`;
  const participationsCollectionRef = collection(db, participationsPath);
  const q = query(participationsCollectionRef, where("employeeId", "==", employeeId), where("challengeId", "==", challengeId));

  const snapshot = await getDocs(q);
  let participationDocRef;
  const now = serverTimestamp();

  if (snapshot.empty) {
    const newParticipationData: Omit<ChallengeParticipation, 'id' | 'createdAt' | 'updatedAt'> = {
      challengeId,
      employeeId,
      employeeName,
      status: 'accepted',
      acceptedAt: new Date(), 
      organizationId,
    };
    participationDocRef = await addDoc(collection(db, participationsPath), {
        ...newParticipationData,
        createdAt: now,
        updatedAt: now,
        acceptedAt: now,
    });
  } else {
    participationDocRef = snapshot.docs[0].ref;
    const currentData = snapshot.docs[0].data() as ChallengeParticipation;
    if (currentData.status === 'pending') {
      await updateDoc(participationDocRef, {
        status: 'accepted',
        acceptedAt: now,
        updatedAt: now,
        employeeName: employeeName, 
      });
    } else if (currentData.status !== 'accepted') {
      console.log(`[ChallengeService] Challenge ${challengeId} already in status ${currentData.status} for employee ${employeeId}.`);
    }
  }

  const updatedDocSnap = await getDoc(participationDocRef); // Fetch the doc again
  if (!updatedDocSnap.exists()) throw new Error("[ChallengeService] Participation not found after accept operation.");
  const data = updatedDocSnap.data()!;
  return {
    id: updatedDocSnap.id,
    ...data,
    organizationId,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt),
    updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(),
    acceptedAt: data.acceptedAt instanceof Timestamp ? data.acceptedAt.toDate() : (data.acceptedAt ? new Date(data.acceptedAt) : undefined),
    submittedAt: data.submittedAt instanceof Timestamp ? data.submittedAt.toDate() : (data.submittedAt ? new Date(data.submittedAt) : undefined),
    evaluatedAt: data.evaluatedAt instanceof Timestamp ? data.evaluatedAt.toDate() : (data.evaluatedAt ? new Date(data.evaluatedAt) : undefined),
  } as ChallengeParticipation;
};


/**
 * Allows an employee to submit their evidence for an accepted challenge.
 */
export const submitChallengeForEmployee = async (
  organizationId: string,
  challengeId: string,
  employeeId: string,
  submissionText?: string,
  submissionFileUrl?: string
): Promise<ChallengeParticipation> => {
  const db = getDb();
  if (!db || !organizationId || !challengeId || !employeeId) {
    throw new Error('[ChallengeService] Missing required IDs for submitting challenge.');
  }

  const participationsPath = `organizations/${organizationId}/${PARTICIPATIONS_COLLECTION}`;
  const participationsCollectionRef = collection(db, participationsPath);
  const q = query(participationsCollectionRef, where("employeeId", "==", employeeId), where("challengeId", "==", challengeId));

  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    throw new Error("Participation not found. Employee must accept the challenge first.");
  }

  const participationDocRef = snapshot.docs[0].ref;
  const currentData = snapshot.docs[0].data() as ChallengeParticipation;

  if (currentData.status !== 'accepted') {
    throw new Error(`Challenge cannot be submitted. Current status: ${currentData.status}.`);
  }

  const dataToUpdate: Partial<ChallengeParticipation> = {
    status: 'submitted',
    submittedAt: new Date(), 
    submissionText: submissionText || null,
    submissionFileUrl: submissionFileUrl || null,
    updatedAt: new Date(), 
  };

  await updateDoc(participationDocRef, {
      ...dataToUpdate,
      submittedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
  });

  const updatedDoc = await getDoc(participationDocRef);
  if (!updatedDoc.exists()) throw new Error("[ChallengeService] Participation not found after submission.");
  const data = updatedDoc.data()!;
  return {
    id: updatedDoc.id,
    ...data,
    organizationId,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt),
    updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(),
    acceptedAt: data.acceptedAt instanceof Timestamp ? data.acceptedAt.toDate() : (data.acceptedAt ? new Date(data.acceptedAt) : undefined),
    submittedAt: data.submittedAt instanceof Timestamp ? data.submittedAt.toDate() : new Date(),
  } as ChallengeParticipation;
};

// --- Challenge Settings Functions ---

/**
 * Fetches challenge settings for a specific organization.
 * @param organizationId The ID of the organization.
 * @returns Promise resolving to ChallengeSettings object or null if not found/error.
 */
export const getChallengeSettings = async (organizationId: string): Promise<ChallengeSettings | null> => {
  const db = getDb();
  if (!db || !organizationId) {
    console.error('[ChallengeService] Firestore not initialized or organizationId missing for getChallengeSettings.');
    return null;
  }
  const settingsDocRef = doc(db, `organizations/${organizationId}/${CHALLENGE_MANAGEMENT_COLLECTION}`, CHALLENGE_SETTINGS_DOC_ID);
  try {
    const docSnap = await getDoc(settingsDocRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        organizationId,
        ...data,
        updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : undefined,
      } as ChallengeSettings;
    }
    return {
        organizationId,
        rankingFactor: 1.0,
        defaultParticipationType: 'Opcional',
        enableGamificationFeatures: false,
        maxMonthlyChallengePointsCap: null,
    } as ChallengeSettings;
  } catch (error) {
    console.error(`[ChallengeService] Error fetching challenge settings for org ${organizationId}:`, error);
    throw error;
  }
};

/**
 * Saves challenge settings for a specific organization.
 * @param organizationId The ID of the organization.
 * @param settingsData The challenge settings data to save.
 * @returns Promise resolving on successful save.
 */
export const saveChallengeSettings = async (organizationId: string, settingsData: ChallengeSettingsData): Promise<void> => {
  const db = getDb();
  if (!db || !organizationId) {
    throw new Error('[ChallengeService] Firestore not initialized or organizationId missing for saveChallengeSettings.');
  }
  const settingsDocRef = doc(db, `organizations/${organizationId}/${CHALLENGE_MANAGEMENT_COLLECTION}`, CHALLENGE_SETTINGS_DOC_ID);
  try {
    await setDoc(settingsDocRef, {
      ...settingsData,
      organizationId, 
      updatedAt: serverTimestamp(),
    }, { merge: true }); 
  } catch (error) {
    console.error(`[ChallengeService] Error saving challenge settings for org ${organizationId}:`, error);
    throw error;
  }
};
