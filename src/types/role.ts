// src/types/role.ts
export interface Role {
  id: string;
  name: string;
  description?: string;
  // permissions?: string[]; // For future use, if needed
  organizationId: string; // Link to the organization
  createdAt?: Date;
  updatedAt?: Date;
}
