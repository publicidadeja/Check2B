
'use server';

import type { Department } from './department';
import { getAllDepartments } from './department'; // To validate department

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
   * The department name to which the task belongs.
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


// In-memory store for mock data (replace with actual database interactions)
let mockTasks: Task[] = [
    {
      id: 'task_1',
      title: 'Preencher Relatório Diário de Vendas',
      description: 'Registrar todas as vendas e contatos realizados no dia no CRM.',
      department: 'Vendas',
      criteria: 'Todos os campos obrigatórios do CRM preenchidos corretamente até às 18h.',
      category: 'Relatórios',
      priority: 'Alta',
      periodicity: 'Diária'
    },
    {
      id: 'task_2',
      title: 'Participar da Daily Standup',
      description: 'Comparecer à reunião diária de alinhamento da equipe às 9h.',
      department: 'Engenharia',
      criteria: 'Participação pontual e ativa na reunião.',
      category: 'Reuniões',
      priority: 'Alta',
      periodicity: 'Diária'
    },
     {
      id: 'task_3',
      title: 'Revisar Pull Requests Pendentes',
      description: 'Analisar e fornecer feedback sobre os PRs abertos no repositório da equipe.',
      department: 'Engenharia',
      criteria: 'Todos os PRs pendentes revisados ou comentados até o final do dia.',
      category: 'Desenvolvimento',
      priority: 'Média',
      periodicity: 'Diária'
    },
     {
      id: 'task_4',
      title: 'Planejar Campanha de Email Marketing',
      description: 'Definir público, conteúdo e cronograma para a próxima campanha de email.',
      department: 'Marketing',
      criteria: 'Documento de planejamento da campanha concluído e aprovado.',
      category: 'Planejamento', // New category example
      priority: 'Média',
      periodicity: 'Semanal' // Example of non-daily
    },
     {
      id: 'task_5',
      title: 'Organizar Arquivos de Contratos',
      description: 'Digitalizar e organizar contratos de novos clientes na pasta designada.',
      department: 'RH', // Example for RH
      criteria: 'Todos os contratos recebidos no dia anterior organizados até 12h.',
      category: 'Administrativo', // New category example
      priority: 'Baixa',
      periodicity: 'Diária'
    },
];


// --- Mock API Functions ---

/**
 * Asynchronously retrieves task information by ID.
 *
 * @param id The ID of the task to retrieve.
 * @returns A promise that resolves to a Task object or null if not found.
 */
export async function getTask(id: string): Promise<Task | null> {
  console.log("Fetching task by ID (mock):", id);
  await new Promise(resolve => setTimeout(resolve, 150));
  const task = mockTasks.find(t => t.id === id);
  return task ? { ...task } : null; // Return copy
}

/**
 * Asynchronously retrieves all tasks, optionally filtered by department.
 *
 * @param department Optional department name to filter tasks.
 * @returns A promise that resolves to an array of Task objects.
 */
export async function getAllTasks(department?: string): Promise<Task[]> {
   console.log(`Fetching tasks${department ? ` for ${department}` : ' (all)'} (mock)...`);
   await new Promise(resolve => setTimeout(resolve, 350));
   const filteredTasks = department
     ? mockTasks.filter(task => task.department === department)
     : [...mockTasks];
   return filteredTasks.map(task => ({...task})); // Return copies
}


/**
 * Asynchronously retrieves tasks relevant for a specific department.
 * This often includes tasks assigned directly to the department AND 'Geral' tasks.
 * Adapt this logic based on your application's requirements.
 *
 * @param department The specific department name.
 * @returns A promise that resolves to an array of Task objects relevant to the department.
 */
export async function getTasksForDepartmentEvaluation(department: string): Promise<Task[]> {
   console.log(`Fetching tasks for evaluation in ${department} (mock)...`);
   await new Promise(resolve => setTimeout(resolve, 350));

   // Filter tasks assigned to the specific department OR the 'Geral' department (if applicable)
   const relevantTasks = mockTasks.filter(task =>
       task.department === department || task.department === 'Geral' // Adjust 'Geral' logic if needed
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
    await new Promise(resolve => setTimeout(resolve, 300));

    // --- Basic Validation ---
    if (!taskData.title?.trim() || !taskData.description?.trim() || !taskData.department?.trim()) {
        throw new Error("Título, Descrição e Departamento são obrigatórios.");
    }
    // Validate department exists
    const validDepartments = await getAllDepartments();
     // Include 'Geral' as a potentially valid department if your logic uses it
    const allPossibleDepartments = [...validDepartments.map(d => d.name), 'Geral'];
    if (!allPossibleDepartments.includes(taskData.department)) {
         throw new Error(`Departamento "${taskData.department}" inválido.`);
    }
     // Add more specific validations (e.g., category from allowed list, priority format)

    const newTask: Task = {
        ...taskData,
        id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        // Set defaults if needed
        priority: taskData.priority ?? 'Média',
        periodicity: taskData.periodicity ?? 'Diária',
    };
    mockTasks.push(newTask);
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
    await new Promise(resolve => setTimeout(resolve, 300));

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
    if (updatedFields.department !== undefined && !updatedFields.department?.trim()) {
         throw new Error("Departamento não pode ser vazio.");
    }
    // Validate department if changed
    if (updatedFields.department !== undefined && updatedFields.department !== currentTask.department) {
        const validDepartments = await getAllDepartments();
         const allPossibleDepartments = [...validDepartments.map(d => d.name), 'Geral'];
        if (!allPossibleDepartments.includes(updatedFields.department)) {
            throw new Error(`Departamento "${updatedFields.department}" inválido.`);
        }
    }
    // Add more specific validations...

    mockTasks[taskIndex] = updatedFields;
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
    await new Promise(resolve => setTimeout(resolve, 300));

    const initialLength = mockTasks.length;
    mockTasks = mockTasks.filter(task => task.id !== id);

    if (mockTasks.length === initialLength) {
        throw new Error("Tarefa não encontrada para exclusão.");
    }
    // In a real app, consider implications (e.g., past evaluations using this task?)
}

// --- Helper Functions ---

/** Gets unique categories used in tasks */
export async function getUsedTaskCategories(): Promise<string[]> {
    await new Promise(resolve => setTimeout(resolve, 50));
    const categories = new Set(mockTasks.map(t => t.category).filter(Boolean) as string[]);
    return Array.from(categories);
}
