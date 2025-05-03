// src/types/user.ts
export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: 'super_admin' | 'admin' | 'collaborator';
  organizationId: string | null; // Null for super_admin
  createdAt: Date | any; // Use 'any' for Firebase ServerTimestamp compatibility or import it
  status: 'active' | 'inactive' | 'pending';
  photoUrl?: string;
  // Add other relevant profile fields from Employee type if needed for admins/superadmins too
  department?: string;
  phone?: string;
}
