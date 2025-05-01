
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


// Added definition for ChallengeParticipation used in admin/challenges page
export interface ChallengeParticipation {
    id: string;
    challengeId: string;
    employeeId: string;
    employeeName: string; // For display
    submission?: string; // Link or text description
    submittedAt?: Date;
    status: 'pending' | 'submitted' | 'approved' | 'rejected' | 'accepted'; // Added accepted status
    score?: number; // Score given if approved
    feedback?: string;
    acceptedAt?: Date; // Added acceptedAt
    submissionText?: string; // Explicit text submission field
    submissionFileUrl?: string; // Explicit file submission field
}
