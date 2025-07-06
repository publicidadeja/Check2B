
// src/types/user.ts
export interface UserProfile {
  uid: string; // Firebase Auth UID
  name: string;
  email: string;
  role: 'super_admin' | 'admin' | 'collaborator';
  organizationId: string | null; // Null for super_admin
  status: 'active' | 'inactive' | 'pending';
  createdAt?: Date | any; // Firestore Timestamp or Date
  updatedAt?: Date | any; // Firestore Timestamp or Date
  photoUrl?: string;
  department?: string;
  userRole?: string; // Cargo/Função específica do usuário, ex: "Desenvolvedor Backend"
  phone?: string;
  admissionDate?: string; // YYYY-MM-DD, usado no EmployeeForm
  fcmTokens?: string[]; // Array of Firebase Cloud Messaging tokens for push notifications
}
