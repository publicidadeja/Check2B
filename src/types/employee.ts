export interface Employee {
  id: string;
  name: string;
  photoUrl?: string; // Optional photo URL
  department: string;
  role: string;
  admissionDate: string; // Consider using Date type if needed
  email: string;
  phone: string;
  isActive: boolean; // To handle activate/deactivate/archive
}
