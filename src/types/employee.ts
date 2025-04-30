export interface Employee {
  id: string;
  name: string;
  photoUrl?: string; // URL opcional da foto
  department: string; // Departamento
  role: string; // Função/Cargo
  admissionDate: string; // Data de admissão (string YYYY-MM-DD)
  email: string; // Email corporativo
  phone?: string; // Telefone (opcional)
  isActive: boolean; // Status (ativo/inativo)
}
