export interface Evaluation {
  id: string;
  employeeId: string;
  taskId: string;
  evaluationDate: string; // Consider using Date type
  score: 0 | 10;
  justification?: string; // Required if score is 0
  evidenceUrl?: string; // URL to attached evidence
  evaluatorId: string; // Admin ID
  isDraft: boolean;
  lastEdited?: string; // Timestamp of last edit
}
