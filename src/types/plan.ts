
export interface Plan {
  id: string;
  name: string; // Ex: Básico, Premium, Enterprise
  description: string;
  priceMonthly: number;
  priceYearly?: number;
  features: string[]; // Lista de funcionalidades (pode ser uma string separada por vírgulas ou JSON)
  userLimit?: number | 'unlimited'; // Limite de usuários (colaboradores)
  adminLimit?: number | 'unlimited'; // Limite de administradores
  status: 'active' | 'inactive' | 'archived'; // Status do plano
  isPopular?: boolean; // Para destacar um plano na página de preços, por exemplo
  createdAt: Date;
  updatedAt?: Date;
}
