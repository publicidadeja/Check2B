
'use server';

import type { Department } from './department'; // Assuming department service exists
import { getAllDepartments } from './department'; // To validate department

/**
 * Represents employee information.
 */
export interface Employee {
  /**
   * The employee's unique identifier.
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
   * The employee's role or job title.
   */
  role: string;
   /**
   * Optional: Employee's email.
   */
  email?: string;
   /**
   * Optional: Admission date.
   */
  admissionDate?: string; // ISO string format ideally (e.g., "2024-01-15")
}

// In-memory store for mock data (replace with actual database interactions)
let mockEmployees: Employee[] = [
    {
      id: 'emp_123',
      name: 'João Silva',
      department: 'Engenharia',
      role: 'Engenheiro de Software Pleno',
      email: 'joao.silva@check2b.com',
      admissionDate: '2023-05-20'
    },
    {
      id: 'emp_456',
      name: 'Maria Oliveira',
      department: 'Vendas',
      role: 'Executiva de Contas',
      email: 'maria.oliveira@check2b.com',
      admissionDate: '2022-11-10'
    },
     {
      id: 'emp_789',
      name: 'Carlos Pereira',
      department: 'Marketing',
      role: 'Especialista em SEO',
      // No email or admission date for this mock employee
    },
     {
      id: 'emp_101',
      name: 'Ana Costa',
      department: 'RH',
      role: 'Analista de Recrutamento',
       email: 'ana.costa@check2b.com',
    },
];

// --- Mock API Functions ---

/**
 * Asynchronously retrieves employee information by ID.
 *
 * @param id The ID of the employee to retrieve.
 * @returns A promise that resolves to an Employee object or null if not found.
 */
export async function getEmployee(id: string): Promise<Employee | null> {
  console.log("Fetching employee by ID (mock):", id);
  await new Promise(resolve => setTimeout(resolve, 200));
  const employee = mockEmployees.find(emp => emp.id === id);
  return employee ? { ...employee } : null; // Return a copy
}

/**
 * Asynchronously retrieves all employees, optionally filtered by department.
 *
 * @param department Optional. Filter employees by department name.
 * @returns A promise that resolves to an array of Employee objects.
 */
export async function getAllEmployees(department?: string): Promise<Employee[]> {
  console.log(`Fetching all employees${department ? ` for department ${department}` : ''} (mock)...`);
  await new Promise(resolve => setTimeout(resolve, 400));
  if (department) {
      return mockEmployees.filter(emp => emp.department === department).map(emp => ({ ...emp })); // Return copies
  }
  return [...mockEmployees].map(emp => ({ ...emp })); // Return copies
}

/**
 * Asynchronously adds a new employee.
 *
 * @param employeeData Data for the new employee (excluding ID).
 * @returns A promise that resolves to the newly created Employee object.
 * @throws Error if validation fails (e.g., duplicate email, invalid department).
 */
export async function addEmployee(employeeData: Omit<Employee, 'id'>): Promise<Employee> {
    console.log("Adding employee (mock):", employeeData);
    await new Promise(resolve => setTimeout(resolve, 300));

    // --- Basic Validation ---
    if (!employeeData.name?.trim() || !employeeData.department?.trim() || !employeeData.role?.trim()) {
        throw new Error("Nome, Departamento e Função são obrigatórios.");
    }
     // Validate email format if provided
    if (employeeData.email && !/\S+@\S+\.\S+/.test(employeeData.email)) {
         throw new Error("Formato de email inválido.");
    }
    // Check for duplicate email if provided
    if (employeeData.email && mockEmployees.some(emp => emp.email?.toLowerCase() === employeeData.email?.toLowerCase())) {
        throw new Error(`Email "${employeeData.email}" já está em uso.`);
    }
    // Validate department exists (requires fetching departments)
    const validDepartments = await getAllDepartments();
    if (!validDepartments.some(dept => dept.name === employeeData.department)) {
         throw new Error(`Departamento "${employeeData.department}" inválido.`);
    }
    // Add more validations as needed (e.g., role format, admission date)

    const newEmployee: Employee = {
        ...employeeData,
        id: `emp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    };
    mockEmployees.push(newEmployee);
    return { ...newEmployee }; // Return a copy
}

/**
 * Asynchronously updates an existing employee.
 *
 * @param id The ID of the employee to update.
 * @param employeeData Partial data containing the fields to update.
 * @returns A promise that resolves to the updated Employee object.
 * @throws Error if employee not found or validation fails.
 */
export async function updateEmployee(id: string, employeeData: Partial<Omit<Employee, 'id'>>): Promise<Employee> {
    console.log("Updating employee (mock):", id, employeeData);
    await new Promise(resolve => setTimeout(resolve, 300));

    const empIndex = mockEmployees.findIndex(e => e.id === id);
    if (empIndex === -1) {
        throw new Error("Colaborador não encontrado.");
    }

    const currentEmployee = mockEmployees[empIndex];
    const updatedFields = { ...currentEmployee, ...employeeData };

    // --- Validation on updated fields ---
    if (updatedFields.name !== undefined && !updatedFields.name?.trim()) {
        throw new Error("Nome não pode ser vazio.");
    }
    if (updatedFields.department !== undefined && !updatedFields.department?.trim()) {
        throw new Error("Departamento não pode ser vazio.");
    }
    if (updatedFields.role !== undefined && !updatedFields.role?.trim()) {
        throw new Error("Função não pode ser vazia.");
    }
     // Validate email format if changed
    if (updatedFields.email !== undefined && updatedFields.email && !/\S+@\S+\.\S+/.test(updatedFields.email)) {
         throw new Error("Formato de email inválido.");
    }
    // Check for duplicate email if changed
    if (updatedFields.email !== undefined && updatedFields.email && mockEmployees.some(emp => emp.email?.toLowerCase() === updatedFields.email?.toLowerCase() && emp.id !== id)) {
        throw new Error(`Email "${updatedFields.email}" já está em uso por outro colaborador.`);
    }
    // Validate department if changed
    if (updatedFields.department !== undefined && updatedFields.department !== currentEmployee.department) {
        const validDepartments = await getAllDepartments();
         if (!validDepartments.some(dept => dept.name === updatedFields.department)) {
            throw new Error(`Departamento "${updatedFields.department}" inválido.`);
        }
    }
    // Add more validations...

    mockEmployees[empIndex] = updatedFields;
    return { ...updatedFields }; // Return a copy
}


/**
 * Asynchronously deletes an employee.
 *
 * @param id The ID of the employee to delete.
 * @returns A promise that resolves when deletion is complete.
 * @throws Error if employee not found or cannot be deleted.
 */
export async function deleteEmployee(id: string): Promise<void> {
    console.log("Deleting employee (mock):", id);
    await new Promise(resolve => setTimeout(resolve, 300));

    // Example Guard: Prevent deleting a specific employee (e.g., CEO)
    // if (id === 'ceo_id') { throw new Error("Cannot delete the CEO."); }

    const initialLength = mockEmployees.length;
    mockEmployees = mockEmployees.filter(emp => emp.id !== id);

    if (mockEmployees.length === initialLength) {
        throw new Error("Colaborador não encontrado para exclusão.");
    }
    // In a real app, handle related data (e.g., evaluations, access rights)
}

// --- Helper Functions (could be moved) ---

/**
 * Gets a list of unique department names currently used by employees.
 * Useful for filtering if not fetching all departments separately.
 */
export async function getUsedDepartmentNames(): Promise<string[]> {
    await new Promise(resolve => setTimeout(resolve, 50)); // Simulate small delay
    const departments = new Set(mockEmployees.map(emp => emp.department));
    return Array.from(departments);
}

/**
 * Gets a list of unique role names currently used by employees.
 */
export async function getUsedRoleNames(): Promise<string[]> {
    await new Promise(resolve => setTimeout(resolve, 50));
    const roles = new Set(mockEmployees.map(emp => emp.role));
    return Array.from(roles);
}
