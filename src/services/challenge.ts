
'use server';

import { mockChallenges } from './mock-data'; // Import from centralized store
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
}


// --- Mock API Functions ---

/**
 * Fetches all challenges, optionally filtering by status or department.
 * @param options - Optional filtering criteria { isActive?: boolean, department?: string }.
 * @returns Promise<Challenge[]> - List of challenges.
 */
export async function getAllChallenges(options?: { isActive?: boolean, department?: string }): Promise<Challenge[]> {
  console.log("Fetching challenges (mock) with options:", options);
  await new Promise(resolve => setTimeout(resolve, 150)); // Reduced delay

  let filteredChallenges = [...mockChallenges]; // Use shared store

  if (options?.isActive !== undefined) {
    filteredChallenges = filteredChallenges.filter(c => c.isActive === options.isActive);
  }

  if (options?.department && options.department !== 'Todos') {
    filteredChallenges = filteredChallenges.filter(c =>
      c.eligibleDepartments.includes('Todos') || c.eligibleDepartments.includes(options.department!)
    );
  }

  return filteredChallenges.map(c => ({ ...c })); // Return copies
}

/**
 * Fetches a specific challenge by its ID.
 * @param id - The ID of the challenge.
 * @returns Promise<Challenge | null> - The challenge found or null.
 */
export async function getChallengeById(id: string): Promise<Challenge | null> {
  console.log("Fetching challenge by ID (mock):", id);
  await new Promise(resolve => setTimeout(resolve, 50));
  const challenge = mockChallenges.find(c => c.id === id);
  return challenge ? { ...challenge } : null;
}

/**
 * Adds a new challenge.
 * @param challengeData - Data for the new challenge (excluding ID).
 * @returns Promise<Challenge> - The newly created challenge.
 * @throws Error - If validation fails.
 */
export async function addChallenge(challengeData: Omit<Challenge, 'id'>): Promise<Challenge> {
  console.log("Adding challenge (mock):", challengeData);
  await new Promise(resolve => setTimeout(resolve, 250));

  // --- Basic Validation ---
  if (!challengeData.title?.trim() || !challengeData.description?.trim() || !challengeData.startDate || !challengeData.endDate) {
    throw new Error("Título, Descrição, Data de Início e Fim são obrigatórios.");
  }
  if (new Date(challengeData.endDate) < new Date(challengeData.startDate)) {
      throw new Error("Data final não pode ser anterior à data inicial.");
  }
  if (challengeData.points <= 0) {
      throw new Error("Pontuação deve ser positiva.");
  }
  if (!challengeData.participationType) {
      throw new Error("Tipo de participação é obrigatório.");
  }
  if (!challengeData.eligibleDepartments || challengeData.eligibleDepartments.length === 0) {
      throw new Error("Departamentos elegíveis devem ser definidos (ou 'Todos').");
  }
  // Validate eligible departments against existing ones (if not 'Todos')
  if (!challengeData.eligibleDepartments.includes('Todos')) {
    const validDepartments = await getAllDepartments();
    const validDeptNames = validDepartments.map(d => d.name);
    const invalidDepts = challengeData.eligibleDepartments.filter(dept => !validDeptNames.includes(dept));
    if (invalidDepts.length > 0) {
      throw new Error(`Departamentos inválidos: ${invalidDepts.join(', ')}`);
    }
  }

  const newChallenge: Challenge = {
    ...challengeData,
    id: `challenge_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    isActive: challengeData.isActive ?? false, // Default to inactive if not set
  };

  mockChallenges.push(newChallenge); // Modify shared store
  return { ...newChallenge }; // Return copy
}

/**
 * Updates an existing challenge.
 * @param id - ID of the challenge to update.
 * @param challengeData - Partial data containing the fields to update.
 * @returns Promise<Challenge> - The updated challenge.
 * @throws Error - If the challenge is not found or validation fails.
 */
export async function updateChallenge(id: string, challengeData: Partial<Omit<Challenge, 'id'>>): Promise<Challenge> {
  console.log("Updating challenge (mock):", id, challengeData);
  await new Promise(resolve => setTimeout(resolve, 250));

  const challengeIndex = mockChallenges.findIndex(c => c.id === id);
  if (challengeIndex === -1) {
    throw new Error("Desafio não encontrado.");
  }

  const currentChallenge = mockChallenges[challengeIndex];
  const updatedFields = { ...currentChallenge, ...challengeData };

  // --- Validation on updated fields ---
  if (updatedFields.title !== undefined && !updatedFields.title?.trim()) {
    throw new Error("Título não pode ser vazio.");
  }
  if (updatedFields.description !== undefined && !updatedFields.description?.trim()) {
    throw new Error("Descrição não pode ser vazia.");
  }
  if (updatedFields.startDate !== undefined && updatedFields.endDate !== undefined && new Date(updatedFields.endDate) < new Date(updatedFields.startDate)) {
      throw new Error("Data final não pode ser anterior à data inicial.");
  } else if (updatedFields.startDate !== undefined && new Date(currentChallenge.endDate) < new Date(updatedFields.startDate)) {
       throw new Error("Data final não pode ser anterior à data inicial.");
  } else if (updatedFields.endDate !== undefined && new Date(updatedFields.endDate) < new Date(currentChallenge.startDate)) {
      throw new Error("Data final não pode ser anterior à data inicial.");
  }
  if (updatedFields.points !== undefined && updatedFields.points <= 0) {
    throw new Error("Pontuação deve ser positiva.");
  }
  if (updatedFields.eligibleDepartments !== undefined) {
     if (!updatedFields.eligibleDepartments || updatedFields.eligibleDepartments.length === 0) {
        throw new Error("Departamentos elegíveis devem ser definidos (ou 'Todos').");
    }
     if (!updatedFields.eligibleDepartments.includes('Todos')) {
        const validDepartments = await getAllDepartments();
        const validDeptNames = validDepartments.map(d => d.name);
        const invalidDepts = updatedFields.eligibleDepartments.filter(dept => !validDeptNames.includes(dept));
        if (invalidDepts.length > 0) {
        throw new Error(`Departamentos inválidos: ${invalidDepts.join(', ')}`);
        }
    }
  }


  mockChallenges[challengeIndex] = updatedFields; // Update shared store
  return { ...updatedFields }; // Return copy
}

/**
 * Deletes a challenge.
 * @param id - ID of the challenge to delete.
 * @returns Promise<void>
 * @throws Error - If the challenge is not found.
 */
export async function deleteChallenge(id: string): Promise<void> {
  console.log("Deleting challenge (mock):", id);
  await new Promise(resolve => setTimeout(resolve, 200));

  const initialLength = mockChallenges.length;
  const challengeIndex = mockChallenges.findIndex(c => c.id === id);

  if (challengeIndex === -1) {
    throw new Error("Desafio não encontrado para exclusão.");
  }

  mockChallenges.splice(challengeIndex, 1); // Remove from shared store
}

/**
 * Fetches unique categories used in challenges.
 * @returns Promise<string[]> - Array of unique category names.
 */
export async function getUsedChallengeCategories(): Promise<string[]> {
    await new Promise(resolve => setTimeout(resolve, 20));
    const categories = new Set(mockChallenges.map(c => c.category).filter(Boolean) as string[]);
    return Array.from(categories);
}

// --- Placeholder functions for other aspects (remain unchanged) ---
export async function acceptChallenge(challengeId: string, employeeId: string): Promise<void> {
    console.log(`Employee ${employeeId} accepted challenge ${challengeId} (mock).`);
    await new Promise(resolve => setTimeout(resolve, 100));
}
export async function submitChallengeEvidence(challengeId: string, employeeId: string, evidence: any): Promise<void> {
     console.log(`Employee ${employeeId} submitted evidence for challenge ${challengeId} (mock):`, evidence);
     await new Promise(resolve => setTimeout(resolve, 200));
}
export async function evaluateChallengeSubmission(challengeId: string, employeeId: string, score: number, feedback?: string): Promise<void> {
    console.log(`Admin evaluated challenge ${challengeId} for employee ${employeeId} (mock). Score: ${score}, Feedback: ${feedback || 'N/A'}`);
    await new Promise(resolve => setTimeout(resolve, 150));
}
