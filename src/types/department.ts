
export interface Department {
  id: string;
  name: string;
  description?: string;
  headId?: string; // Optional: ID of the employee who is the head of the department
  organizationId: string; // ID of the organization this department belongs to
  createdAt?: Date; // Timestamp of creation
  updatedAt?: Date; // Timestamp of last update
}
