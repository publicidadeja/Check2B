
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
    limit,
    getDoc // Import getDoc directly
} from 'firebase/firestore';
import { getAllDepartments } from './department'; // Still needed for validation
import { getAllRoles } from './role'; // For validation

/**
 * Represents employee information.
 */
export interface Employee {
  /**
   * The employee's unique identifier (document ID).
   */
  id: string;
  /**
   * The employee's full name.
   */
  name: string;
  /**
   * The employee's department name (should match a valid Department name).
   */
  department: string;
  /**
   * The employee's role or job title (should match a valid Role name).
   */
  role: string;
   /**
   * Optional: Employee's email.
   */
  email?: string;
   /**
   * Optional: Admission date (stored as string YYYY-MM-DD).
   */
  admissionDate?: string;
  /** Timestamp of creation */
  createdAt?: Timestamp;
}

const employeesCollection = collection(db, 'employees');

// Helper to convert Firestore doc to Employee
const docToEmployee = (doc: QueryDocumentSnapshot<DocumentData> | DocumentData): Employee => {
    const data = doc.data();
     if (!data) {
        throw new Error("Document data is undefined.");
    }
    return {
        id: doc.id,
        name: data.name,
        department: data.department,
        role: data.role,
        email: data.email,
        admissionDate: data.admissionDate, // Stored as string
        createdAt: data.createdAt,
    };
};

// --- Firestore API Functions ---

/**
 * Asynchronously retrieves employee information by ID.
 *
 * @param id The ID of the employee to retrieve.
 * @returns A promise that resolves to an Employee object or null if not found.
 */
export async function getEmployee(id: string): Promise<Employee | null> {
  console.log("Fetching employee by ID from Firestore:", id);
  try {
      const docRef = doc(db, 'employees', id);
      const docSnap = await getDoc(docRef); // Use imported getDoc
      return docSnap.exists() ? docToEmployee(docSnap) : null;
  } catch (error) {
      console.error("Error fetching employee by ID:", error);
      throw new Error("Falha ao buscar colaborador.");
  }
}

/**
 * Asynchronously retrieves all employees, optionally filtered by department.
 *
 * @param department Optional. Filter employees by department name.
 * @returns A promise that resolves to an array of Employee objects.
 */
export async function getAllEmployees(department?: string): Promise<Employee[]> {
  console.log(`Fetching all employees${department ? ` for department ${department}` : ''} from Firestore...`);
  try {
      let q: Query = query(employeesCollection, orderBy("name")); // Order by name

      if (department) {
          q = query(q, where("department", "==", department));
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map(docToEmployee);
  } catch (error) {
      console.error("Error fetching employees:", error);
      throw new Error("Falha ao buscar colaboradores.");
  }
}

/**
 * Asynchronously adds a new employee to Firestore.
 *
 * @param employeeData Data for the new employee (excluding ID, createdAt).
 * @returns A promise that resolves to the newly created Employee object.
 * @throws Error if validation fails (e.g., duplicate email, invalid department/role).
 */
export async function addEmployee(employeeData: Omit<Employee, 'id' | 'createdAt'>): Promise<Employee> {
    console.log("Adding employee to Firestore:", employeeData);
    try {
        // --- Validation ---
        if (!employeeData.name?.trim() || !employeeData.department?.trim() || !employeeData.role?.trim()) {
            throw new Error("Nome, Departamento e Função são obrigatórios.");
        }
        if (employeeData.email && !/\S+@\S+\.\S+/.test(employeeData.email)) {
             throw new Error("Formato de email inválido.");
        }
        // Check for duplicate email if provided
        if (employeeData.email) {
            const q = query(employeesCollection, where("email", "==", employeeData.email));
            const existingEmail = await getDocs(q);
            if (!existingEmail.empty) {
                throw new Error(`Email "${employeeData.email}" já está em uso.`);
            }
        }
        // Validate department exists
        const validDepartments = await getAllDepartments(); // Fetches from Firestore
        if (!validDepartments.some(dept => dept.name === employeeData.department)) {
             throw new Error(`Departamento "${employeeData.department}" inválido.`);
        }
         // Validate role exists
        const validRoles = await getAllRoles(); // Fetches from Firestore
        if (!validRoles.some(role => role.name === employeeData.role)) {
            throw new Error(`Função "${employeeData.role}" inválida.`);
        }
        // Validate admissionDate format if provided (basic check)
        if (employeeData.admissionDate && !/^\d{4}-\d{2}-\d{2}$/.test(employeeData.admissionDate)) {
            throw new Error("Formato inválido para Data de Admissão (use AAAA-MM-DD).");
        }

        const newEmployeeData = {
            ...employeeData,
            createdAt: Timestamp.now(),
        };

        const docRef = await addDoc(employeesCollection, newEmployeeData);

        // Fetch the created doc to return consistent data structure
        const newDoc = await getDoc(docRef);
        if (!newDoc.exists()) {
            throw new Error("Falha ao buscar colaborador recém-criado.");
        }
        return docToEmployee(newDoc); // Ensure return type matches

    } catch (error: any) {
        console.error("Error adding employee:", error);
        // Rethrow specific validation errors
        if (error.message.includes("obrigatórios") || error.message.includes("inválido") || error.message.includes("em uso") || error.message.includes("inválida")) {
            throw error;
        }
        throw new Error("Falha ao adicionar colaborador.");
    }
}

/**
 * Asynchronously updates an existing employee in Firestore.
 *
 * @param id The ID of the employee to update.
 * @param employeeData Partial data containing the fields to update.
 * @returns A promise that resolves to the updated Employee object.
 * @throws Error if employee not found or validation fails.
 */
export async function updateEmployee(id: string, employeeData: Partial<Omit<Employee, 'id' | 'createdAt'>>): Promise<Employee> {
    console.log("Updating employee in Firestore:", id, employeeData);
    try {
        const docRef = doc(db, 'employees', id);
        const docSnap = await getDoc(docRef); // Use imported getDoc

        if (!docSnap.exists()) {
            throw new Error("Colaborador não encontrado.");
        }
        const currentEmployee = docToEmployee(docSnap); // Get current data

        // --- Validation on updated fields ---
        if (employeeData.name !== undefined && !employeeData.name?.trim()) {
            throw new Error("Nome não pode ser vazio.");
        }
        if (employeeData.email !== undefined && employeeData.email && !/\S+@\S+\.\S+/.test(employeeData.email)) {
             throw new Error("Formato de email inválido.");
        }
        // Check for duplicate email if changed
        if (employeeData.email !== undefined && employeeData.email && employeeData.email !== currentEmployee.email) {
            const q = query(employeesCollection, where("email", "==", employeeData.email));
            const existingEmail = await getDocs(q);
             // Ensure the found doc isn't the one we are currently updating
            if (!existingEmail.empty && existingEmail.docs[0].id !== id) {
                throw new Error(`Email "${employeeData.email}" já está em uso por outro colaborador.`);
            }
        }
        // Validate department if changed
        if (employeeData.department !== undefined && employeeData.department !== currentEmployee.department) {
             if (!employeeData.department?.trim()) {
                throw new Error("Departamento não pode ser vazio.");
            }
             const validDepartments = await getAllDepartments();
             if (!validDepartments.some(dept => dept.name === employeeData.department)) {
                throw new Error(`Departamento "${employeeData.department}" inválido.`);
            }
        }
         // Validate role if changed
        if (employeeData.role !== undefined && employeeData.role !== currentEmployee.role) {
            if (!employeeData.role?.trim()) {
                throw new Error("Função não pode ser vazia.");
            }
            const validRoles = await getAllRoles();
            if (!validRoles.some(role => role.name === employeeData.role)) {
                throw new Error(`Função "${employeeData.role}" inválida.`);
            }
        }
        // Validate admissionDate format if changed
        if (employeeData.admissionDate !== undefined && employeeData.admissionDate && !/^\d{4}-\d{2}-\d{2}$/.test(employeeData.admissionDate)) {
            throw new Error("Formato inválido para Data de Admissão (use AAAA-MM-DD).");
        }

        const updateData = { ...employeeData, updatedAt: Timestamp.now() };

         // Remove undefined fields before updating
        Object.keys(updateData).forEach(key => updateData[key as keyof typeof updateData] === undefined && delete updateData[key as keyof typeof updateData]);

        await updateDoc(docRef, updateData);

        // Fetch the updated document to return complete data
        const updatedDoc = await getDoc(docRef); // Use imported getDoc
        return docToEmployee(updatedDoc); // Cast needed

    } catch (error: any) {
        console.error("Error updating employee:", error);
         if (error.message.includes("encontrado") || error.message.includes("vazio") || error.message.includes("inválido") || error.message.includes("em uso") || error.message.includes("inválida")) {
            throw error;
        }
        throw new Error("Falha ao atualizar colaborador.");
    }
}


/**
 * Asynchronously deletes an employee from Firestore.
 *
 * @param id The ID of the employee to delete.
 * @returns A promise that resolves when deletion is complete.
 * @throws Error if employee not found or cannot be deleted.
 */
export async function deleteEmployee(id: string): Promise<void> {
    console.log("Deleting employee from Firestore:", id);
    try {
        const docRef = doc(db, 'employees', id);
         // Optional: Check if doc exists before attempting delete
        const docSnap = await getDoc(docRef); // Use imported getDoc
        if (!docSnap.exists()) {
             throw new Error("Colaborador não encontrado para exclusão.");
        }

        await deleteDoc(docRef);
        console.log(`Employee ${id} deleted successfully.`);
         // TODO: Consider implications for related data (evaluations, ranking history, etc.)
         // Might need a Firebase Function for cleanup.
    } catch (error: any) {
        console.error("Error deleting employee:", error);
         if (error.message.includes("encontrado")) {
             throw error;
         }
        throw new Error("Falha ao excluir colaborador.");
    }
}

// --- Helper Functions (using Firestore) ---

/**
 * Gets a list of unique department names currently used by employees.
 * Note: Can be inefficient on very large datasets.
 */
export async function getUsedDepartmentNames(): Promise<string[]> {
    console.log("Fetching used department names from Firestore employees...");
    try {
        const snapshot = await getDocs(collection(db, 'employees'));
        const departments = new Set<string>();
        snapshot.docs.forEach(doc => {
            const dept = doc.data().department;
            if (dept) departments.add(dept);
        });
        return Array.from(departments).sort();
    } catch (error) {
        console.error("Error fetching used department names:", error);
        return [];
    }
}

/**
 * Gets a list of unique role names currently used by employees.
 * Note: Can be inefficient on very large datasets.
 */
export async function getUsedRoleNames(): Promise<string[]> {
     console.log("Fetching used role names from Firestore employees...");
     try {
        const snapshot = await getDocs(collection(db, 'employees'));
        const roles = new Set<string>();
        snapshot.docs.forEach(doc => {
             const role = doc.data().role;
             if (role) roles.add(role);
        });
        return Array.from(roles).sort();
    } catch (error) {
        console.error("Error fetching used role names:", error);
        return [];
    }
}

// Removed local helper function 'getDoc'
