export interface Challenge {
  id: string;
  title: string;
  description: string;
  category?: string;
  periodStartDate: string; // YYYY-MM-DD
  periodEndDate: string; // YYYY-MM-DD
  points: number; // Can be more complex later (variable, per level)
  difficulty: 'Fácil' | 'Médio' | 'Difícil';
  participationType: 'Obrigatório' | 'Opcional';
  eligibility: { // Defines who is eligible
    type: 'all' | 'department' | 'role' | 'individual';
    entityIds?: string[]; // Array of department/role/individual IDs if not 'all'
  };
  evaluationMetrics: string; // How success is measured
  supportMaterialUrl?: string; // Link to guides, etc.
  imageUrl?: string; // URL for an illustrative image/icon
  status: 'draft' | 'active' | 'scheduled' | 'evaluating' | 'completed' | 'archived'; // Lifecycle status
}

// Example of a more complex point system if needed later
// interface ChallengePoints {
//   base: number;
//   levels?: { [level: string]: number }; // e.g., { Bronze: 50, Silver: 100, Gold: 150 }
//   earlyCompletionBonus?: number;
// }

// Example of participation tracking (might need separate type)
// export interface ChallengeParticipation {
//   challengeId: string;
//   employeeId: string;
//   accepted: boolean; // For optional challenges
//   status: 'pending' | 'in_progress' | 'submitted' | 'evaluated';
//   submissionUrl?: string; // Link to evidence submitted by employee
//   evaluationScore?: number; // Score given by admin
//   evaluationFeedback?: string;
//   evaluationDate?: string;
// }
