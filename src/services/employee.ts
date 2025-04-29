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
   * The employee's department.
   */
  department: string;
  /**
   * The employee's role.
   */
  role: string;
}

/**
 * Asynchronously retrieves employee information by ID.
 *
 * @param id The ID of the employee to retrieve.
 * @returns A promise that resolves to an Employee object.
 */
export async function getEmployee(id: string): Promise<Employee> {
  // TODO: Implement this by calling an API.

  return {
    id: '123',
    name: 'John Doe',
    department: 'Engineering',
    role: 'Software Engineer',
  };
}

/**
 * Asynchronously retrieves all employees.
 *
 * @returns A promise that resolves to an array of Employee objects.
 */
export async function getAllEmployees(): Promise<Employee[]> {
  // TODO: Implement this by calling an API.

  return [
    {
      id: '123',
      name: 'John Doe',
      department: 'Engineering',
      role: 'Software Engineer',
    },
    {
      id: '456',
      name: 'Jane Smith',
      department: 'Marketing',
      role: 'Marketing Manager',
    },
  ];
}
