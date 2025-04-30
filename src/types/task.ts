export interface Task {
  id: string;
  title: string; // Título da tarefa
  description: string; // Descrição detalhada
  criteria: string; // Critério para nota 10
  category?: string; // Categoria (opcional)
  priority?: 'low' | 'medium' | 'high'; // Prioridade (opcional)
  periodicity: 'daily' | 'specific_days' | 'specific_dates'; // Periodicidade
  // Tipo de atribuição (opcional): 'role', 'department', 'individual'
  assignedTo?: 'role' | 'department' | 'individual';
  // ID ou Nome da entidade atribuída (opcional, obrigatório se assignedTo for definido)
  assignedEntityId?: string;
}
