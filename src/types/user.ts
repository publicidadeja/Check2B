// src/types/user.ts
export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: 'super_admin' | 'admin' | 'collaborator';
  organizationId: string | null; // Null for super_admin
  // Minimal fields before user management expansion
  // createdAt?: Date | any; // Example of a field that might have existed
  // status?: 'active' | 'inactive' | 'pending';
  // photoUrl?: string;
  // department?: string;
  // phone?: string;
  // isActive?: boolean; // This might be redundant if 'status' exists
}
