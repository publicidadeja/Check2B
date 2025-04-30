
'use server';

import { Department, getAllDepartments } from './department';

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

// In-memory store for mock data (replace with actual database)
let mockChallenges: Challenge[] = [
  {
    id: 'challenge_1',
    title: 'Superação de Metas de Vendas',
    description: 'Atingir 110% da meta de vendas individual da semana.',
    category: 'Produtividade',
    startDate: '2024-08-05',
    endDate: '2024-08-09',
    points: 50,
    difficulty: 'Médio',
    participationType: 'Obrigatório',
    eligibleDepartments: ['Vendas'],
    evaluationMetrics: 'Verificação do relatório de vendas no CRM.',
    isActive: true,
    imageUrl: 'https://picsum.photos/seed/challenge1/100/100'
  },
  {
    id: 'challenge_2',
    title: 'Inovação Operacional Proposta',
    description: 'Sugerir uma melhoria concreta em um processo operacional existente.',
    category: 'Inovação',
    startDate: '2024-08-05',
    endDate: '2024-08-09',
    points: 75,
    difficulty: 'Difícil',
    participationType: 'Opcional',
    eligibleDepartments: ['Todos'],
    evaluationMetrics: 'Avaliação da proposta pela gerência (originalidade, viabilidade, impacto).',
    supportMaterial: 'Link para formulário de sugestões: [link]',
    isActive: true,
  },
  {
    id: 'challenge_3',
    title: 'Zero Erros de Digitação',
    description: 'Concluir todas as tarefas de entrada de dados da semana sem erros reportados.',
    category: 'Qualidade',
    startDate: '2024-08-12',
    endDate: '2024-08-16',
    points: 30,
    difficulty: 'Fácil',
    participationType: 'Obrigatório',
    eligibleDepartments: ['Administrativo', 'RH'],
    evaluationMetrics: 'Auditoria aleatória de 10% das entradas realizadas.',
    isActive: false, // Example of an inactive (past or future) challenge
  },
];

// --- Mock API Functions ---

/**
 * Fetches all challenges, optionally filtering by status or department.
 * @param options - Optional filtering criteria { isActive?: boolean, department?: string }.
 * @returns Promise<Challenge[]> - List of challenges.
 */
export async function getAllChallenges(options?: { isActive?: boolean, department?: string }): Promise<Challenge[]> {
  console.log("Fetching challenges (mock) with options:", options);
  await new Promise(resolve => setTimeout(resolve, 400));

  let filteredChallenges = [...mockChallenges];

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
  await new Promise(resolve => setTimeout(resolve, 150));
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
  await new Promise(resolve => setTimeout(resolve, 350));

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

  mockChallenges.push(newChallenge);
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
  await new Promise(resolve => setTimeout(resolve, 350));

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


  mockChallenges[challengeIndex] = updatedFields;
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
  await new Promise(resolve => setTimeout(resolve, 300));

  const initialLength = mockChallenges.length;
  mockChallenges = mockChallenges.filter(c => c.id !== id);

  if (mockChallenges.length === initialLength) {
    throw new Error("Desafio não encontrado para exclusão.");
  }
  // Consider implications in a real app (e.g., ongoing participations?)
}

/**
 * Fetches unique categories used in challenges.
 * @returns Promise<string[]> - Array of unique category names.
 */
export async function getUsedChallengeCategories(): Promise<string[]> {
    await new Promise(resolve => setTimeout(resolve, 50));
    const categories = new Set(mockChallenges.map(c => c.category).filter(Boolean) as string[]);
    return Array.from(categories);
}

// --- Placeholder functions for other aspects ---

/**
 * Simulates a participant accepting a challenge.
 * @param challengeId - ID of the challenge.
 * @param employeeId - ID of the employee accepting.
 * @returns Promise<void>
 */
export async function acceptChallenge(challengeId: string, employeeId: string): Promise<void> {
    console.log(`Employee ${employeeId} accepted challenge ${challengeId} (mock).`);
    await new Promise(resolve => setTimeout(resolve, 100));
    // In a real app: Record acceptance in a participation table.
}

/**
 * Simulates submitting evidence for challenge completion.
 * @param challengeId - ID of the challenge.
 * @param employeeId - ID of the employee submitting.
 * @param evidence - Evidence data (e.g., text, file URL).
 * @returns Promise<void>
 */
export async function submitChallengeEvidence(challengeId: string, employeeId: string, evidence: any): Promise<void> {
     console.log(`Employee ${employeeId} submitted evidence for challenge ${challengeId} (mock):`, evidence);
     await new Promise(resolve => setTimeout(resolve, 200));
     // In a real app: Store evidence link/data, mark participation as 'pending review'.
}

/**
 * Simulates an admin evaluating a challenge submission.
 * @param challengeId - ID of the challenge.
 * @param employeeId - ID of the employee whose submission is being evaluated.
 * @param score - Points awarded (can be different from challenge.points if variable).
 * @param feedback - Optional feedback for the employee.
 * @returns Promise<void>
 */
export async function evaluateChallengeSubmission(challengeId: string, employeeId: string, score: number, feedback?: string): Promise<void> {
    console.log(`Admin evaluated challenge ${challengeId} for employee ${employeeId} (mock). Score: ${score}, Feedback: ${feedback || 'N/A'}`);
    await new Promise(resolve => setTimeout(resolve, 150));
    // In a real app: Update participation record with score, feedback, timestamp. Trigger ranking update.
}
