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
   * The description of the task.
   */
  description: string;
  /**
   * The department to which the task belongs.
   */
  department: string;
}

/**
 * Asynchronously retrieves task information by ID.
 *
 * @param id The ID of the task to retrieve.
 * @returns A promise that resolves to a Task object.
 */
export async function getTask(id: string): Promise<Task> {
  // TODO: Implement this by calling an API.

  return {
    id: '1',
    title: 'Complete Daily Report',
    description: 'Submit the daily report by EOD.',
    department: 'Engineering',
  };
}

/**
 * Asynchronously retrieves all tasks for a given department.
 *
 * @param department The department for which to retrieve tasks.
 * @returns A promise that resolves to an array of Task objects.
 */
export async function getTasksByDepartment(department: string): Promise<Task[]> {
  // TODO: Implement this by calling an API.

  return [
    {
      id: '1',
      title: 'Complete Daily Report',
      description: 'Submit the daily report by EOD.',
      department: 'Engineering',
    },
    {
      id: '2',
      title: 'Attend Daily Standup',
      description: 'Attend the daily standup meeting at 10 AM.',
      department: 'Engineering',
    },
  ];
}
