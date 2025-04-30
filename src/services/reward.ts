
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
    getCountFromServer // Import getCountFromServer
} from 'firebase/firestore';
import { getAllDepartments } from './department'; // Keep for validation


/**
 * Representa a definição de uma premiação.
 */
export interface Reward {
  /** Identificador único da premiação (document ID) */
  id: string;
  /** Título da premiação (ex: "Colaborador do Mês") */
  title: string;
  /** Descrição detalhada da premiação */
  description: string;
  /** Valor monetário (opcional) */
  monetaryValue?: number;
  /** Descrição da premiação não-monetária (opcional) */
  nonMonetaryDescription?: string;
  /** URL de uma imagem/ícone representativo (opcional) */
  imageUrl?: string;
  /** Mês/Ano de vigência (ex: "2024-08") ou "recorrente" */
  period: string;
  /** Se a premiação é recorrente mensalmente */
  isRecurring: boolean;
  /** Número de ganhadores */
  numberOfWinners: number;
  /** Departamentos elegíveis (array de nomes de departamentos ou ['Todos']) */
  eligibleDepartments: string[] | ['Todos'];
   /** Critérios extras de elegibilidade */
  eligibilityCriteria?: string;
   /** Indica se a premiação está ativa/publicada */
  isActive: boolean;
  /** Timestamp of creation */
  createdAt?: Timestamp;
}

const rewardsCollection = collection(db, 'rewards');

// Helper to convert Firestore doc to Reward
const docToReward = (doc: QueryDocumentSnapshot<DocumentData>): Reward => {
    const data = doc.data();
    return {
        id: doc.id,
        title: data.title,
        description: data.description,
        monetaryValue: data.monetaryValue,
        nonMonetaryDescription: data.nonMonetaryDescription,
        imageUrl: data.imageUrl,
        period: data.period,
        isRecurring: data.isRecurring,
        numberOfWinners: data.numberOfWinners,
        eligibleDepartments: data.eligibleDepartments,
        eligibilityCriteria: data.eligibilityCriteria,
        isActive: data.isActive,
        createdAt: data.createdAt,
    };
};

// --- Funções Firestore da API ---

/**
 * Busca todas as premiações cadastradas no Firestore.
 * @returns Promise<Reward[]> - Lista de premiações, ordenadas por data de criação.
 */
export async function getAllRewards(): Promise<Reward[]> {
    console.log("Fetching all rewards from Firestore...");
    try {
        // Order by creation date descending, most recent first
        const q = query(rewardsCollection, orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(docToReward);
    } catch (error) {
        console.error("Error fetching rewards:", error);
        throw new Error("Falha ao buscar premiações.");
    }
}

/**
 * Busca uma premiação específica pelo ID no Firestore.
 * @param id - O ID da premiação.
 * @returns Promise<Reward | null> - A premiação encontrada ou null.
 */
export async function getRewardById(id: string): Promise<Reward | null> {
    console.log("Fetching reward by ID from Firestore:", id);
     try {
        const docRef = doc(db, 'rewards', id);
        const docSnap = await getDoc(docRef);
        return docSnap.exists() ? docToReward(docSnap as QueryDocumentSnapshot<DocumentData>) : null;
    } catch (error) {
        console.error("Error fetching reward by ID:", error);
        throw new Error("Falha ao buscar a premiação.");
    }
}


/**
 * Adiciona uma nova premiação ao Firestore.
 * @param rewardData - Dados da nova premiação (sem ID e createdAt).
 * @returns Promise<Reward> - A premiação criada.
 * @throws Error - Se a validação falhar.
 */
export async function addReward(rewardData: Omit<Reward, 'id' | 'createdAt'>): Promise<Reward> {
    console.log("Adding reward to Firestore:", rewardData);
    try {
        // --- Validação Básica ---
        if (!rewardData.title?.trim() || !rewardData.description?.trim()) {
            throw new Error("Título e Descrição são obrigatórios.");
        }
        if (rewardData.numberOfWinners <= 0) {
            throw new Error("Número de vencedores deve ser positivo.");
        }
        if (!rewardData.isRecurring && !rewardData.period?.match(/^\d{4}-(0[1-9]|1[0-2])$/)) {
             throw new Error("Período deve estar no formato AAAA-MM (ex: 2024-08) se não for recorrente.");
        }
        if (!rewardData.eligibleDepartments || rewardData.eligibleDepartments.length === 0) {
            throw new Error("Selecione pelo menos um departamento elegível ou 'Todos'.");
        }
        // Validate eligible departments against Firestore (if not 'Todos')
        if (!rewardData.eligibleDepartments.includes('Todos')) {
            const validDepartments = await getAllDepartments(); // Fetch from Firestore
            const validDeptNames = validDepartments.map(d => d.name);
            const invalidDepts = rewardData.eligibleDepartments.filter(dept => !validDeptNames.includes(dept));
            if (invalidDepts.length > 0) {
                throw new Error(`Departamentos inválidos: ${invalidDepts.join(', ')}`);
            }
        }
         // Ensure period is 'recorrente' if isRecurring is true
         if (rewardData.isRecurring) {
             rewardData.period = 'recorrente';
         }

        const newRewardData = {
            ...rewardData,
            isActive: rewardData.isActive ?? false, // Default para inativo
            eligibleDepartments: rewardData.eligibleDepartments?.length ? rewardData.eligibleDepartments : ['Todos'],
            createdAt: Timestamp.now(),
        };

        const docRef = await addDoc(rewardsCollection, newRewardData);
        return {
            id: docRef.id,
            ...newRewardData,
        } as Reward; // Ensure return type matches

    } catch (error: any) {
        console.error("Error adding reward:", error);
        if (error.message.includes("obrigatórios") || error.message.includes("inválidos") || error.message.includes("positivo") || error.message.includes("Período") || error.message.includes("Selecione")) {
            throw error; // Rethrow validation errors
        }
        throw new Error("Falha ao adicionar premiação.");
    }
}

/**
 * Atualiza uma premiação existente no Firestore.
 * @param id - ID da premiação a ser atualizada.
 * @param rewardData - Dados parciais para atualizar.
 * @returns Promise<Reward> - A premiação atualizada.
 * @throws Error - Se a premiação não for encontrada ou validação falhar.
 */
export async function updateReward(id: string, rewardData: Partial<Omit<Reward, 'id' | 'createdAt'>>): Promise<Reward> {
    console.log("Updating reward in Firestore:", id, rewardData);
    try {
        const docRef = doc(db, 'rewards', id);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            throw new Error("Premiação não encontrada.");
        }

        // --- Validação (exemplo) ---
        if (rewardData.numberOfWinners !== undefined && rewardData.numberOfWinners <= 0) {
            throw new Error("Número de vencedores deve ser positivo.");
        }
        // Validate period format if changing and not recurring
         if (rewardData.period !== undefined && !(rewardData.isRecurring ?? docSnap.data().isRecurring) && !rewardData.period?.match(/^\d{4}-(0[1-9]|1[0-2])$/)) {
             throw new Error("Período deve estar no formato AAAA-MM (ex: 2024-08) se não for recorrente.");
         }
         // Ensure period is 'recorrente' if isRecurring is true (or being set to true)
         if (rewardData.isRecurring === true) {
              rewardData.period = 'recorrente';
         } else if (rewardData.isRecurring === false && rewardData.period === 'recorrente') {
              // If changing from recurring to specific, ensure a valid period is provided
              throw new Error("Um período AAAA-MM deve ser informado ao desmarcar 'recorrente'.");
         }

        // Validate eligible departments if they are being updated
         if (rewardData.eligibleDepartments && !rewardData.eligibleDepartments.includes('Todos')) {
             const validDepartments = await getAllDepartments(); // Fetch from Firestore
             const validDeptNames = validDepartments.map(d => d.name);
             const invalidDepts = rewardData.eligibleDepartments.filter(dept => !validDeptNames.includes(dept));
             if (invalidDepts.length > 0) {
                 throw new Error(`Departamentos inválidos: ${invalidDepts.join(', ')}`);
             }
         }
        // Add more validations as needed...

        const updateData = { ...rewardData, updatedAt: Timestamp.now() };

        // Remove undefined fields before updating
        Object.keys(updateData).forEach(key => updateData[key as keyof typeof updateData] === undefined && delete updateData[key as keyof typeof updateData]);

        await updateDoc(docRef, updateData);

        // Fetch the updated document to return complete data
        const updatedDoc = await getDoc(docRef);
        return docToReward(updatedDoc as QueryDocumentSnapshot<DocumentData>);

    } catch (error: any) {
        console.error("Error updating reward:", error);
         if (error.message.includes("encontrada") || error.message.includes("positivo") || error.message.includes("Período") || error.message.includes("inválidos") || error.message.includes("desmarcar 'recorrente'")) {
             throw error; // Rethrow known errors
         }
        throw new Error("Falha ao atualizar premiação.");
    }
}

/**
 * Deleta uma premiação do Firestore.
 * @param id - ID da premiação a ser deletada.
 * @returns Promise<void>
 * @throws Error - Se a premiação não for encontrada.
 */
export async function deleteReward(id: string): Promise<void> {
    console.log("Deleting reward from Firestore:", id);
    try {
        const docRef = doc(db, 'rewards', id);
        // Optional: Check if doc exists before deleting
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) {
            throw new Error("Premiação não encontrada para exclusão.");
        }

        // TODO: Add checks here if there are related 'rewardWinner' records before deleting.
        // const winnersQuery = query(collection(db, 'rewardWinners'), where('rewardId', '==', id), limit(1));
        // const winnersSnap = await getDocs(winnersQuery);
        // if (!winnersSnap.empty) {
        //    throw new Error("Não é possível excluir a premiação pois já existem vencedores registrados para ela.");
        // }

        await deleteDoc(docRef);
        console.log(`Reward ${id} deleted successfully.`);
    } catch (error: any) {
        console.error("Error deleting reward:", error);
         if (error.message.includes("encontrada") /* || error.message.includes("vencedores registrados") */) {
             throw error;
         }
        throw new Error("Falha ao excluir premiação.");
    }
}

// Helper to get document snapshot
async function getDoc(ref: any): Promise<DocumentData> {
    const docSnap = await getDoc(ref);
    // Removed the throw here, let the caller decide how to handle non-existence
    return docSnap;
}

// Helper function needed by deleteReward checks - consider moving limit to a shared utils?
function limit(n: number): any { // Simplified type, adjust as per actual Firestore v9 usage if needed
    return (query: Query) => query.limit(n);
}
