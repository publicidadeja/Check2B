
'use server';

import { db } from '@/lib/firebase';
import {
    collection,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    query,
    where,
    orderBy,
    Timestamp,
    DocumentData,
    QueryDocumentSnapshot,
    Query,
    collectionGroup,
    getCountFromServer,
    getDoc // Import getDoc directly
} from 'firebase/firestore';
import { getAllDepartments } from './department'; // Keep for validation

/**
 * Represents the structure of a weekly challenge.
 */
export interface Challenge {
  /** Unique identifier for the challenge */
  id: string;
  /** Title of the challenge */
  title: string;
  /** Detailed description of the challenge */
  description: string;
  /** Category for grouping (e.g., Produtividade, Qualidade) */
  category?: string;
  /** Start date of the challenge (ISO format YYYY-MM-DD) */
  startDate: string;
  /** End date of the challenge (ISO format YYYY-MM-DD) */
  endDate: string;
  /** Points awarded for successful completion */
  points: number;
  /** Difficulty level */
  difficulty?: 'Fácil' | 'Médio' | 'Difícil';
  /** Participation type */
  participationType: 'Obrigatório' | 'Opcional';
  /** Departments eligible to participate (array of names or ['Todos']) */
  eligibleDepartments: string[] | ['Todos'];
  /** How the challenge completion will be assessed */
  evaluationMetrics?: string;
  /** URL or text description of support material (optional) */
  supportMaterial?: string;
  /** URL for an illustrative image/icon (optional) */
  imageUrl?: string;
  /** Whether the challenge is currently active/visible */
  isActive: boolean;
  /** Timestamp of creation */
  createdAt?: Timestamp; // Add timestamp
}

const challengesCollection = collection(db, 'challenges');

// Helper to convert Firestore doc to Challenge
const docToChallenge = (doc: QueryDocumentSnapshot<DocumentData> | DocumentData): Challenge => {
    const data = doc.data();
    if (!data) {
        throw new Error("Document data is undefined.");
    }
    return {
        id: doc.id,
        title: data.title,
        description: data.description,
        category: data.category,
        startDate: data.startDate, // Assuming stored as 'YYYY-MM-DD' string
        endDate: data.endDate,     // Assuming stored as 'YYYY-MM-DD' string
        points: data.points,
        difficulty: data.difficulty,
        participationType: data.participationType,
        eligibleDepartments: data.eligibleDepartments,
        evaluationMetrics: data.evaluationMetrics,
        supportMaterial: data.supportMaterial,
        imageUrl: data.imageUrl,
        isActive: data.isActive,
        createdAt: data.createdAt, // Keep timestamp if needed
    };
};

// --- Firestore API Functions ---

/**
 * Fetches all challenges, optionally filtering by status or department.
 * @param options - Optional filtering criteria { isActive?: boolean, department?: string }.
 * @returns Promise<Challenge[]> - List of challenges.
 */
export async function getAllChallenges(options?: { isActive?: boolean, department?: string }): Promise<Challenge[]> {
  console.log("Fetching challenges from Firestore with options:", options);
  try {
    let q: Query = query(challengesCollection, orderBy('startDate', 'desc')); // Base query

    if (options?.isActive !== undefined) {
      q = query(q, where("isActive", "==", options.isActive));
    }

    // Department filtering needs to be done client-side or requires more complex queries/data structure
    // if Firestore doesn't support 'array-contains-any' combined with other filters easily.
    // For now, fetch based on isActive and filter department afterwards.

    const snapshot = await getDocs(q);
    let challenges = snapshot.docs.map(docToChallenge);

    // Client-side filtering for department (if needed)
    if (options?.department && options.department !== 'Todos') {
        challenges = challenges.filter(c =>
          c.eligibleDepartments.includes('Todos') || c.eligibleDepartments.includes(options.department!)
        );
    }

    return challenges;

  } catch (error) {
    console.error("Error fetching challenges:", error);
    throw new Error("Falha ao buscar desafios.");
  }
}

/**
 * Fetches a specific challenge by its ID.
 * @param id - The ID of the challenge.
 * @returns Promise<Challenge | null> - The challenge found or null.
 */
export async function getChallengeById(id: string): Promise<Challenge | null> {
  console.log("Fetching challenge by ID from Firestore:", id);
  try {
    const docRef = doc(db, 'challenges', id);
    const docSnap = await getDoc(docRef); // Use imported getDoc
    return docSnap.exists() ? docToChallenge(docSnap) : null;
  } catch (error) {
    console.error("Error fetching challenge by ID:", error);
    throw new Error("Falha ao buscar o desafio.");
  }
}

/**
 * Adds a new challenge to Firestore.
 * @param challengeData - Data for the new challenge (excluding ID and createdAt).
 * @returns Promise<Challenge> - The newly created challenge.
 * @throws Error - If validation fails.
 */
export async function addChallenge(challengeData: Omit<Challenge, 'id' | 'createdAt'>): Promise<Challenge> {
  console.log("Adding challenge to Firestore:", challengeData);
  try {
    // --- Basic Validation --- (Keep frontend validation as well)
    if (!challengeData.title?.trim() || !challengeData.description?.trim() || !challengeData.startDate || !challengeData.endDate) {
        throw new Error("Título, Descrição, Data de Início e Fim são obrigatórios.");
    }
    // ... (keep other validations from previous version)
    if (!challengeData.eligibleDepartments || challengeData.eligibleDepartments.length === 0) {
        throw new Error("Departamentos elegíveis devem ser definidos (ou 'Todos').");
    }
    // Validate eligible departments against Firestore (if not 'Todos')
    if (!challengeData.eligibleDepartments.includes('Todos')) {
        const validDepartments = await getAllDepartments(); // Fetch from Firestore
        const validDeptNames = validDepartments.map(d => d.name);
        const invalidDepts = challengeData.eligibleDepartments.filter(dept => !validDeptNames.includes(dept));
        if (invalidDepts.length > 0) {
        throw new Error(`Departamentos inválidos: ${invalidDepts.join(', ')}`);
        }
    }

    const newChallengeData = {
        ...challengeData,
        isActive: challengeData.isActive ?? false, // Default to inactive
        createdAt: Timestamp.now(),
    };

    const docRef = await addDoc(challengesCollection, newChallengeData);

    // Fetch the created doc to return consistent data structure
    const newDoc = await getDoc(docRef);
     if (!newDoc.exists()) {
        throw new Error("Falha ao buscar desafio recém-criado.");
    }
    return docToChallenge(newDoc); // Ensure return type matches

  } catch (error: any) {
    console.error("Error adding challenge:", error);
    if (error.message.includes("obrigatórios") || error.message.includes("inválidos") || error.message.includes("positiva") || error.message.includes("Data final")) {
        throw error; // Rethrow validation errors
    }
    throw new Error("Falha ao adicionar desafio.");
  }
}

/**
 * Updates an existing challenge in Firestore.
 * @param id - ID of the challenge to update.
 * @param challengeData - Partial data containing the fields to update.
 * @returns Promise<Challenge> - The updated challenge.
 * @throws Error - If the challenge is not found or validation fails.
 */
export async function updateChallenge(id: string, challengeData: Partial<Omit<Challenge, 'id' | 'createdAt'>>): Promise<Challenge> {
  console.log("Updating challenge in Firestore:", id, challengeData);
  try {
    const docRef = doc(db, 'challenges', id);
    const docSnap = await getDoc(docRef); // Use imported getDoc

    if (!docSnap.exists()) {
      throw new Error("Desafio não encontrado.");
    }

    // --- Validation on updated fields --- (Keep relevant validations)
    if (challengeData.title !== undefined && !challengeData.title?.trim()) {
        throw new Error("Título não pode ser vazio.");
    }
     // Validate eligible departments if they are being updated
     if (challengeData.eligibleDepartments && !challengeData.eligibleDepartments.includes('Todos')) {
         const validDepartments = await getAllDepartments(); // Fetch from Firestore
         const validDeptNames = validDepartments.map(d => d.name);
         const invalidDepts = challengeData.eligibleDepartments.filter(dept => !validDeptNames.includes(dept));
         if (invalidDepts.length > 0) {
            throw new Error(`Departamentos inválidos: ${invalidDepts.join(', ')}`);
         }
     }
     // ... other validations ...

    const updateData = { ...challengeData, updatedAt: Timestamp.now() }; // Add update timestamp

    // Remove undefined fields before updating
     Object.keys(updateData).forEach(key => updateData[key as keyof typeof updateData] === undefined && delete updateData[key as keyof typeof updateData]);


    await updateDoc(docRef, updateData);

    // Fetch the updated document to return complete data
    const updatedDoc = await getDoc(docRef); // Use imported getDoc
    return docToChallenge(updatedDoc);

  } catch (error: any) {
    console.error("Error updating challenge:", error);
    if (error.message.includes("encontrado") || error.message.includes("inválidos") || error.message.includes("vazio") || error.message.includes("positiva") || error.message.includes("Data final")) {
        throw error; // Rethrow known errors
    }
    throw new Error("Falha ao atualizar desafio.");
  }
}

/**
 * Deletes a challenge from Firestore.
 * @param id - ID of the challenge to delete.
 * @returns Promise<void>
 * @throws Error - If the challenge is not found.
 */
export async function deleteChallenge(id: string): Promise<void> {
  console.log("Deleting challenge from Firestore:", id);
  try {
    const docRef = doc(db, 'challenges', id);
    // Optional: Check if doc exists before deleting
    const docSnap = await getDoc(docRef); // Use imported getDoc
    if (!docSnap.exists()) {
        throw new Error("Desafio não encontrado para exclusão.");
    }
    await deleteDoc(docRef);
    console.log(`Challenge ${id} deleted successfully.`);
     // TODO: Consider deleting related submissions/acceptances if necessary
  } catch (error: any) {
    console.error("Error deleting challenge:", error);
     if (error.message.includes("encontrado")) {
        throw error;
     }
    throw new Error("Falha ao excluir desafio.");
  }
}

/**
 * Fetches unique categories used in challenges from Firestore.
 * Note: This can be inefficient for large datasets. Consider storing categories separately or using aggregation.
 * @returns Promise<string[]> - Array of unique category names.
 */
export async function getUsedChallengeCategories(): Promise<string[]> {
    console.log("Fetching used challenge categories from Firestore...");
    try {
        // This fetches all documents just to get categories - potentially inefficient
        const q = query(challengesCollection, where('category', '!=', null)); // Get docs with a category
        const snapshot = await getDocs(q);
        const categories = new Set<string>();
        snapshot.docs.forEach(doc => {
            const category = doc.data().category;
            if (category && typeof category === 'string') {
                categories.add(category);
            }
        });
        return Array.from(categories).sort(); // Sort alphabetically
    } catch (error) {
        console.error("Error fetching challenge categories:", error);
        // Return empty array or rethrow?
        return [];
    }
}


// --- Placeholder functions for other aspects (Need Firestore implementation) ---
// These require additional collections (e.g., 'challengeAcceptances', 'challengeSubmissions')

export async function acceptChallenge(challengeId: string, employeeId: string): Promise<void> {
    console.log(`Employee ${employeeId} accepted challenge ${challengeId} (Firestore TODO).`);
    // Firestore logic: Add a document to 'challengeAcceptances' collection
    // e.g., setDoc(doc(db, 'challengeAcceptances', `${employeeId}_${challengeId}`), { employeeId, challengeId, acceptedAt: Timestamp.now() });
    await new Promise(resolve => setTimeout(resolve, 100));
}
export async function submitChallengeEvidence(challengeId: string, employeeId: string, evidence: any): Promise<void> {
     console.log(`Employee ${employeeId} submitted evidence for challenge ${challengeId} (Firestore TODO):`, evidence);
     // Firestore logic: Add a document to 'challengeSubmissions' collection
     // e.g., addDoc(collection(db, 'challengeSubmissions'), { employeeId, challengeId, evidence, submittedAt: Timestamp.now(), status: 'pending' });
     await new Promise(resolve => setTimeout(resolve, 200));
}
export async function evaluateChallengeSubmission(challengeId: string, employeeId: string, score: number, feedback?: string): Promise<void> {
    console.log(`Admin evaluated challenge ${challengeId} for employee ${employeeId} (Firestore TODO). Score: ${score}, Feedback: ${feedback || 'N/A'}`);
    // Firestore logic: Update the corresponding 'challengeSubmissions' document
    // e.g., updateDoc(submissionDocRef, { status: 'evaluated', score, feedback, evaluatedAt: Timestamp.now() });
    // Also, potentially update employee's challenge points record.
    await new Promise(resolve => setTimeout(resolve, 150));
}

// Removed local helper function 'getDoc'
