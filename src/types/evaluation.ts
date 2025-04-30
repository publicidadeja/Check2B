export interface Evaluation {
  id: string; // ID único da avaliação (ex: employeeId-taskId-date)
  employeeId: string; // ID do colaborador avaliado
  taskId: string; // ID da tarefa avaliada
  evaluationDate: string; // Data da avaliação (string YYYY-MM-DD)
  score: 0 | 10; // Nota (0 ou 10)
  justification?: string; // Justificativa (obrigatória se score for 0)
  evidenceUrl?: string; // URL da evidência anexada (opcional)
  evaluatorId: string; // ID do administrador que avaliou
  isDraft: boolean; // Indica se é um rascunho (não implementado ainda)
  lastEdited?: string; // Timestamp da última edição (ISO string, opcional)
}
