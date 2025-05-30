
// src/lib/challenge-service.ts
import { getDb } from './firebase';
import type { Challenge, ChallengeParticipation } from '@/types/challenge';
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
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { format, parseISO } from 'date-fns';

const CHALLENGES_COLLECTION = 'challenges';
const PARTICIPATIONS_COLLECTION = 'challengeParticipations';

/**
 * Fetches all challenges for a specific organization from Firestore.
 */
export const getAllChallenges = async (organizationId: string): Promise<Challenge[]> => {
  const db = getDb();
  if (!db || !organizationId) {
    console.error('Firestore not initialized or organizationId missing.');
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
        // Ensure dates are JS Date objects
        periodStartDate: data.periodStartDate, // Stored as YYYY-MM-DD string
        periodEndDate: data.periodEndDate,   // Stored as YYYY-MM-DD string
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt),
        updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : (data.updatedAt ? new Date(data.updatedAt) : undefined),
      } as Challenge;
    });
  } catch (error) {
    console.error(`Error fetching challenges for org ${organizationId}:`, error);
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
    throw new Error('Firestore not initialized or organizationId missing.');
  }
  const challengesPath = `organizations/${organizationId}/${CHALLENGES_COLLECTION}`;
  const { id, ...dataToSave } = challengeData;

  // Ensure date strings are used, not Date objects, if form sends Date objects
  const finalDataToSave = {
    ...dataToSave,
    periodStartDate: typeof dataToSave.periodStartDate === 'string' ? dataToSave.periodStartDate : format(dataToSave.periodStartDate, 'yyyy-MM-dd'),
    periodEndDate: typeof dataToSave.periodEndDate === 'string' ? dataToSave.periodEndDate : format(dataToSave.periodEndDate, 'yyyy-MM-dd'),
    updatedAt: serverTimestamp(),
  };

  if (id) {
    const challengeDocRef = doc(db, challengesPath, id);
    await updateDoc(challengeDocRef, finalDataToSave);
    const updatedDoc = await getDoc(challengeDocRef);
    const updatedData = updatedDoc.data();
    return { 
        id, 
        ...updatedData, 
        organizationId,
        createdAt: updatedData?.createdAt instanceof Timestamp ? updatedData.createdAt.toDate() : new Date(),
        updatedAt: updatedData?.updatedAt instanceof Timestamp ? updatedData.updatedAt.toDate() : new Date(),
    } as Challenge;
  } else {
    const docRef = await addDoc(collection(db, challengesPath), {
      ...finalDataToSave,
      organizationId,
      createdAt: serverTimestamp(),
    });
    const newDoc = await getDoc(docRef);
    const newData = newDoc.data();
    return { 
        id: docRef.id, 
        ...newData, 
        organizationId,
        createdAt: newData?.createdAt instanceof Timestamp ? newData.createdAt.toDate() : new Date(),
        updatedAt: newData?.updatedAt instanceof Timestamp ? newData.updatedAt.toDate() : new Date(),
    } as Challenge;
  }
};

/**
 * Deletes a challenge and its participations from Firestore.
 */
export const deleteChallenge = async (organizationId: string, challengeId: string): Promise<void> => {
  const db = getDb();
  if (!db || !organizationId) {
    throw new Error('Firestore not initialized or organizationId missing.');
  }
  // TODO: Also delete associated participations (batched write or Cloud Function trigger)
  const challengeDocRef = doc(db, `organizations/${organizationId}/${CHALLENGES_COLLECTION}`, challengeId);
  await deleteDoc(challengeDocRef);
};

/**
 * Updates the status of a challenge.
 */
export const updateChallengeStatus = async (organizationId: string, challengeId: string, status: Challenge['status']): Promise<Challenge> => {
    const db = getDb();
    if (!db || !organizationId) {
        throw new Error('Firestore not initialized or organizationId missing.');
    }
    const challengeDocRef = doc(db, `organizations/${organizationId}/${CHALLENGES_COLLECTION}`, challengeId);
    await updateDoc(challengeDocRef, { status, updatedAt: serverTimestamp() });
    const updatedDoc = await getDoc(challengeDocRef);
    if (!updatedDoc.exists()) throw new Error("Challenge not found after status update.");
    const data = updatedDoc.data();
    return {
        id: updatedDoc.id,
        ...data,
        organizationId,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt),
        updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(),
    } as Challenge;
};

/**
 * Fetches participations for a specific challenge.
 */
export const getParticipationsForChallenge = async (organizationId: string, challengeId: string): Promise<ChallengeParticipation[]> => {
  const db = getDb();
  if (!db || !organizationId) {
    console.error('Firestore not initialized or organizationId missing.');
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
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt),
        updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : (data.updatedAt ? new Date(data.updatedAt) : undefined),
        acceptedAt: data.acceptedAt instanceof Timestamp ? data.acceptedAt.toDate() : (data.acceptedAt ? new Date(data.acceptedAt) : undefined),
        submittedAt: data.submittedAt instanceof Timestamp ? data.submittedAt.toDate() : (data.submittedAt ? new Date(data.submittedAt) : undefined),
        evaluatedAt: data.evaluatedAt instanceof Timestamp ? data.evaluatedAt.toDate() : (data.evaluatedAt ? new Date(data.evaluatedAt) : undefined),
      } as ChallengeParticipation;
    });
  } catch (error) {
    console.error(`Error fetching participations for challenge ${challengeId}:`, error);
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
    throw new Error('Firestore not initialized or organizationId missing.');
  }
  const participationDocRef = doc(db, `organizations/${organizationId}/${PARTICIPATIONS_COLLECTION}`, participationId);
  
  const dataToUpdate = {
    ...evaluationData,
    evaluatedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await updateDoc(participationDocRef, dataToUpdate);
  const updatedDoc = await getDoc(participationDocRef);
  if (!updatedDoc.exists()) throw new Error("Participation not found after evaluation.");
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
    console.error('Firestore not initialized or organizationId missing.');
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
  } as Challenge;

  const participants = await getParticipationsForChallenge(organizationId, challengeId);
  return { challenge, participants };
};
