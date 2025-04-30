
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
    getCountFromServer,
    limit, // Use imported limit
    getDoc // Use imported getDoc
} from 'firebase/firestore';
import { getAllDepartments } from './department'; // Keep for validation

/**
 * Represents a task.
 */
export interface Task {
  /** The task's unique identifier (document ID) */
  id: string;
  /** The title of the task */
  title: string;
  /** The detailed description of the task */
  description: string;
  /** Department name or 'Geral' */
  department: string;
  /** Optional: Criteria for score 10 */
  criteria?: string;
  /** Optional: Category */
  category?: string;
  /** Optional: Priority */
  priority?: 'Baixa' | 'Média' | 'Alta' | 'Crítica';
  /** Optional: Periodicity */
  periodicity?: 'Diária' | 'Semanal' | 'Mensal' | 'Específica';
  /** Timestamp of creation */
  createdAt?: Timestamp;
}

const tasksCollection = collection(db, 'tasks');

// Helper to convert Firestore doc to Task
const docToTask = (doc: QueryDocumentSnapshot<DocumentData> | DocumentData): Task => {
    const data = doc.data();
     if (!data) {
        throw new Error("Document data is undefined.");
    }
    return {
        id: doc.id,
        title: data.title,
        description: data.description,
        department: data.department,
        criteria: data.criteria,
        category: data.category,
        priority: data.priority,
        periodicity: data.periodicity,
        createdAt: data.createdAt,
    };
};

// --- Firestore API Functions ---

/**
 * Asynchronously retrieves task information by ID from Firestore.
 *
 * @param id The ID of the task to retrieve.
 * @returns A promise that resolves to a Task object or null if not found.
 */
export async function getTask(id: string): Promise<Task | null> {
  console.log("Fetching task by ID from Firestore:", id);
  try {
    const docRef = doc(db, 'tasks', id);
    const docSnap = await getDoc(docRef); // Use imported getDoc
    return docSnap.exists() ? docToTask(docSnap) : null;
  } catch (error) {
    console.error("Error fetching task by ID:", error);
    throw new Error("Falha ao buscar tarefa.");
  }
}

/**
 * Asynchronously retrieves all tasks from Firestore, optionally filtered by department.
 *
 * @param department Optional department name to filter tasks. Use 'Todos' or undefined for all.
 * @returns A promise that resolves to an array of Task objects.
 */
export async function getAllTasks(department?: string): Promise<Task[]> {
   console.log(`Fetching tasks${department && department !== 'Todos' ? ` for ${department}` : ' (all)'} from Firestore...`);
   try {
       let q: Query = query(tasksCollection, orderBy("department"), orderBy("title")); // Order by department then title

       if (department && department !== 'Todos') {
           q = query(q, where("department", "==", department));
       }

       const snapshot = await getDocs(q);
       return snapshot.docs.map(docToTask);
   } catch (error) {
       console.error("Error fetching tasks:", error);
       throw new Error("Falha ao buscar tarefas.");
   }
}


/**
 * Asynchronously retrieves tasks relevant for a specific department's evaluation checklist from Firestore.
 * Includes tasks assigned directly to the department AND 'Geral' tasks.
 *
 * @param department The specific department name. Cannot be 'Todos'.
 * @returns A promise that resolves to an array of Task objects relevant to the department.
 * @throws Error if department is 'Todos' or invalid.
 */
export async function getTasksForDepartmentEvaluation(department: string): Promise<Task[]> {
   if (!department || department === 'Todos') {
       throw new Error("Departamento deve ser especificado para buscar tarefas de avaliação.");
   }
   console.log(`Fetching tasks for evaluation in ${department} from Firestore...`);
   try {
        // Query for tasks specific to the department OR 'Geral' tasks
        const q = query(
            tasksCollection,
            where("department", "in", [department, 'Geral']),
            orderBy("department"), // Optional: Group by 'Geral' then specific dept
            orderBy("title")
        );

        const snapshot = await getDocs(q);
        return snapshot.docs.map(docToTask);

   } catch (error) {
        console.error("Error fetching tasks for evaluation:", error);
        throw new Error("Falha ao buscar tarefas de avaliação para o departamento.");
   }
}


/**
 * Asynchronously adds a new task to Firestore.
 *
 * @param taskData Data for the new task (excluding ID, createdAt).
 * @returns A promise that resolves to the newly created Task object.
 * @throws Error if validation fails.
 */
export async function addTask(taskData: Omit<Task, 'id' | 'createdAt'>): Promise<Task> {
    console.log("Adding task to Firestore:", taskData);
    try {
        // --- Validation ---
        if (!taskData.title?.trim() || !taskData.description?.trim() || !taskData.department?.trim()) {
            throw new Error("Título, Descrição e Departamento são obrigatórios.");
        }
        // Validate department exists (including 'Geral')
        if (taskData.department !== 'Geral') {
            const validDepartments = await getAllDepartments(); // Fetches from Firestore
            if (!validDepartments.some(d => d.name === taskData.department)) {
                throw new Error(`Departamento "${taskData.department}" inválido.`);
            }
        }
        // Add other specific validations as needed...

        const newTaskData = {
            ...taskData,
            priority: taskData.priority ?? 'Média', // Default priority
            periodicity: taskData.periodicity ?? 'Diária', // Default periodicity
            createdAt: Timestamp.now(),
        };

        const docRef = await addDoc(tasksCollection, newTaskData);

        // Fetch the created doc to return consistent data structure
        const newDoc = await getDoc(docRef);
        if (!newDoc.exists()) {
            throw new Error("Falha ao buscar tarefa recém-criada.");
        }
        return docToTask(newDoc); // Ensure return type matches

    } catch (error: any) {
        console.error("Error adding task:", error);
         if (error.message.includes("obrigatórios") || error.message.includes("inválido")) {
            throw error;
         }
        throw new Error("Falha ao adicionar tarefa.");
    }
}

/**
 * Asynchronously updates an existing task in Firestore.
 *
 * @param id The ID of the task to update.
 * @param taskData Partial data containing the fields to update.
 * @returns A promise that resolves to the updated Task object.
 * @throws Error if task not found or validation fails.
 */
export async function updateTask(id: string, taskData: Partial<Omit<Task, 'id' | 'createdAt'>>): Promise<Task> {
    console.log("Updating task in Firestore:", id, taskData);
    try {
        const docRef = doc(db, 'tasks', id);
        const docSnap = await getDoc(docRef); // Use imported getDoc

        if (!docSnap.exists()) {
            throw new Error("Tarefa não encontrada.");
        }

        // --- Validation on updated fields ---
        if (taskData.title !== undefined && !taskData.title?.trim()) {
            throw new Error("Título não pode ser vazio.");
        }
        if (taskData.description !== undefined && !taskData.description?.trim()) {
             throw new Error("Descrição não pode ser vazia.");
        }
        if (taskData.department !== undefined) {
            if (!taskData.department?.trim()) {
                throw new Error("Departamento não pode ser vazio.");
            }
            // Validate department if changed
            if (taskData.department !== docSnap.data().department && taskData.department !== 'Geral') {
                 const validDepartments = await getAllDepartments();
                 if (!validDepartments.some(d => d.name === taskData.department)) {
                     throw new Error(`Departamento "${taskData.department}" inválido.`);
                 }
            }
        }
        // Add more specific validations...

        const updateData = { ...taskData, updatedAt: Timestamp.now() };

         // Remove undefined fields before updating
        Object.keys(updateData).forEach(key => updateData[key as keyof typeof updateData] === undefined && delete updateData[key as keyof typeof updateData]);


        await updateDoc(docRef, updateData);

        // Fetch the updated document to return complete data
        const updatedDoc = await getDoc(docRef); // Use imported getDoc
        return docToTask(updatedDoc); // Cast needed

    } catch (error: any) {
        console.error("Error updating task:", error);
        if (error.message.includes("encontrada") || error.message.includes("vazio") || error.message.includes("inválido")) {
           throw error;
        }
        throw new Error("Falha ao atualizar tarefa.");
    }
}

/**
 * Asynchronously deletes a task from Firestore.
 *
 * @param id The ID of the task to delete.
 * @returns A promise that resolves when deletion is complete.
 * @throws Error if task not found.
 */
export async function deleteTask(id: string): Promise<void> {
    console.log("Deleting task from Firestore:", id);
    try {
        const docRef = doc(db, 'tasks', id);
        // Optional: Check if doc exists before attempting delete
        const docSnap = await getDoc(docRef); // Use imported getDoc
        if (!docSnap.exists()) {
             throw new Error("Tarefa não encontrada para exclusão.");
        }

        // TODO: Consider implications - should past evaluations using this task be kept?
        // Deleting might orphan evaluation data unless structured differently.
        // For now, we just delete the task definition.

        await deleteDoc(docRef);
        console.log(`Task ${id} deleted successfully.`);
    } catch (error: any) {
        console.error("Error deleting task:", error);
         if (error.message.includes("encontrada")) {
             throw error;
         }
        throw new Error("Falha ao excluir tarefa.");
    }
}

// --- Helper Functions ---

/**
 * Gets unique categories used in tasks from Firestore.
 * Note: Can be inefficient. Consider alternatives for large datasets.
 */
export async function getUsedTaskCategories(): Promise<string[]> {
    console.log("Fetching used task categories from Firestore...");
    try {
        // This fetches all documents just to get categories - potentially inefficient
        const q = query(tasksCollection, where('category', '!=', null)); // Get docs with a category
        const snapshot = await getDocs(q);
        const categories = new Set<string>();
        snapshot.docs.forEach(doc => {
            const category = doc.data().category;
            if (category && typeof category === 'string') {
                categories.add(category);
            }
        });
        return Array.from(categories).sort();
    } catch (error) {
        console.error("Error fetching task categories:", error);
        return [];
    }
}

// Removed local helper function 'getDoc'
