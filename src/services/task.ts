
'use server';

import { mockTasks } from './mock-data'; // Import from centralized store
import { getAllDepartments } from './department'; // Keep for validation

/**
 * Represents a task.
 */
export interface Task {
  /**
   * The task's unique identifier.
   */
  id: string;
  /**
   * The title of the task.
   */
  title: string;
  /**
   * The detailed description of the task.
   */
  description: string;
  /**
   * The department name to which the task belongs, or 'Geral'.
   */
  department: string;
  /**
   * Optional: Criteria for achieving a score of 10.
   */
  criteria?: string;
   /**
   * Optional: Category for grouping tasks.
   */
  category?: string;
   /**
   * Optional: Priority level.
   */
  priority?: 'Baixa' | 'Média' | 'Alta' | 'Crítica';
   /**
   * Optional: How often the task should appear (e.g., daily, weekly).
   */
  periodicity?: 'Diária' | 'Semanal' | 'Mensal' | 'Específica';
}


// --- Mock API Functions ---

/**
 * Asynchronously retrieves task information by ID.
 *
 * @param id The ID of the task to retrieve.
 * @returns A promise that resolves to a Task object or null if not found.
 */
export async function getTask(id: string): Promise<Task | null> {
  console.log("Fetching task by ID (mock):", id);
  await new Promise(resolve => setTimeout(resolve, 50));
  const task = mockTasks.find(t => t.id === id);
  return task ? { ...task } : null; // Return copy
}

/**
 * Asynchronously retrieves all tasks, optionally filtered by department.
 *
 * @param department Optional department name to filter tasks. Use 'Todos' to skip filtering.
 * @returns A promise that resolves to an array of Task objects.
 */
export async function getAllTasks(department?: string): Promise<Task[]> {
   console.log(`Fetching tasks${department && department !== 'Todos' ? ` for ${department}` : ' (all)'} (mock)...`);
   await new Promise(resolve => setTimeout(resolve, 100)); // Reduced delay
   const filteredTasks = (department && department !== 'Todos')
     ? mockTasks.filter(task => task.department === department)
     : [...mockTasks];
   return filteredTasks.map(task => ({...task})); // Return copies from shared store
}


/**
 * Asynchronously retrieves tasks relevant for a specific department's evaluation checklist.
 * Includes tasks assigned directly to the department AND 'Geral' tasks.
 *
 * @param department The specific department name. Cannot be 'Todos'.
 * @returns A promise that resolves to an array of Task objects relevant to the department.
 * @throws Error if department is 'Todos' or invalid.
 */
export async function getTasksForDepartmentEvaluation(department: string): Promise<Task[]> {
   if (!department || department === 'Todos') {
       throw new Error("Department must be specified for evaluation tasks.");
   }
   console.log(`Fetching tasks for evaluation in ${department} (mock)...`);
   await new Promise(resolve => setTimeout(resolve, 100));

   // Filter tasks assigned to the specific department OR the 'Geral' department
   const relevantTasks = mockTasks.filter(task =>
       task.department === department || task.department === 'Geral'
   );

   return relevantTasks.map(task => ({...task})); // Return copies
}


/**
 * Asynchronously adds a new task.
 *
 * @param taskData Data for the new task (excluding ID).
 * @returns A promise that resolves to the newly created Task object.
 * @throws Error if validation fails.
 */
export async function addTask(taskData: Omit<Task, 'id'>): Promise<Task> {
    console.log("Adding task (mock):", taskData);
    await new Promise(resolve => setTimeout(resolve, 200));

    // --- Basic Validation ---
    if (!taskData.title?.trim() || !taskData.description?.trim() || !taskData.department?.trim()) {
        throw new Error("Título, Descrição e Departamento são obrigatórios.");
    }
    // Validate department exists (including 'Geral')
    if (taskData.department !== 'Geral') {
        const validDepartments = await getAllDepartments();
        if (!validDepartments.some(d => d.name === taskData.department)) {
            throw new Error(`Departamento "${taskData.department}" inválido.`);
        }
    }
     // Add more specific validations (e.g., category from allowed list, priority format)

    const newTask: Task = {
        ...taskData,
        id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        // Set defaults if needed
        priority: taskData.priority ?? 'Média',
        periodicity: taskData.periodicity ?? 'Diária',
    };
    mockTasks.push(newTask); // Add to shared store
    return { ...newTask }; // Return copy
}

/**
 * Asynchronously updates an existing task.
 *
 * @param id The ID of the task to update.
 * @param taskData Partial data containing the fields to update.
 * @returns A promise that resolves to the updated Task object.
 * @throws Error if task not found or validation fails.
 */
export async function updateTask(id: string, taskData: Partial<Omit<Task, 'id'>>): Promise<Task> {
    console.log("Updating task (mock):", id, taskData);
    await new Promise(resolve => setTimeout(resolve, 200));

    const taskIndex = mockTasks.findIndex(t => t.id === id);
    if (taskIndex === -1) {
        throw new Error("Tarefa não encontrada.");
    }

    const currentTask = mockTasks[taskIndex];
    const updatedFields = { ...currentTask, ...taskData };

    // --- Validation on updated fields ---
    if (updatedFields.title !== undefined && !updatedFields.title?.trim()) {
        throw new Error("Título não pode ser vazio.");
    }
    if (updatedFields.description !== undefined && !updatedFields.description?.trim()) {
         throw new Error("Descrição não pode ser vazia.");
    }
    if (updatedFields.department !== undefined) {
        if (!updatedFields.department?.trim()) {
            throw new Error("Departamento não pode ser vazio.");
        }
        // Validate department if changed
        if (updatedFields.department !== currentTask.department && updatedFields.department !== 'Geral') {
             const validDepartments = await getAllDepartments();
             if (!validDepartments.some(d => d.name === updatedFields.department)) {
                 throw new Error(`Departamento "${updatedFields.department}" inválido.`);
             }
        }
    }
    // Add more specific validations...

    mockTasks[taskIndex] = updatedFields; // Update shared store
    return { ...updatedFields }; // Return copy
}

/**
 * Asynchronously deletes a task.
 *
 * @param id The ID of the task to delete.
 * @returns A promise that resolves when deletion is complete.
 * @throws Error if task not found.
 */
export async function deleteTask(id: string): Promise<void> {
    console.log("Deleting task (mock):", id);
    await new Promise(resolve => setTimeout(resolve, 200));

    const initialLength = mockTasks.length;
    const taskIndex = mockTasks.findIndex(task => task.id === id);

    if (taskIndex === -1) {
        throw new Error("Tarefa não encontrada para exclusão.");
    }

    mockTasks.splice(taskIndex, 1); // Remove from shared store
    // In a real app, consider implications (e.g., past evaluations using this task?)
}

// --- Helper Functions ---

/** Gets unique categories used in tasks */
export async function getUsedTaskCategories(): Promise<string[]> {
    await new Promise(resolve => setTimeout(resolve, 20));
    const categories = new Set(mockTasks.map(t => t.category).filter(Boolean) as string[]);
    return Array.from(categories);
}
