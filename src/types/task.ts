export interface Task {
  id: string;
  title: string;
  description: string;
  criteria: string; // Criteria for achieving score 10
  category?: string;
  priority?: 'low' | 'medium' | 'high';
  periodicity: 'daily' | 'specific_days' | 'specific_dates'; // Adapt as needed
  assignedTo?: 'role' | 'department' | 'individual';
  assignedEntityId?: string; // ID of role, department, or employee
}
