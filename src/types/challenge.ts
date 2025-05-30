
export interface Challenge {
  id: string;
  title: string;
  description: string;
  category?: string;
  periodStartDate: string; // YYYY-MM-DD
  periodEndDate: string; // YYYY-MM-DD
  points: number;
  difficulty: 'Fácil' | 'Médio' | 'Difícil';
  participationType: 'Obrigatório' | 'Opcional';
  eligibility: {
    type: 'all' | 'department' | 'role' | 'individual';
    entityIds?: string[];
  };
  evaluationMetrics: string;
  supportMaterialUrl?: string;
  imageUrl?: string;
  status: 'draft' | 'active' | 'scheduled' | 'evaluating' | 'completed' | 'archived';
  organizationId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ChallengeParticipation {
  id: string; // Firestore document ID
  challengeId: string;
  employeeId: string;
  employeeName?: string; // Denormalized for easier display
  status: 'pending' | 'accepted' | 'submitted' | 'approved' | 'rejected';
  acceptedAt?: Date;
  submittedAt?: Date;
  submissionText?: string;
  submissionFileUrl?: string; // URL to file in Firebase Storage
  score?: number;
  feedback?: string; // Feedback from admin
  evaluatedAt?: Date;
  evaluatorId?: string;
  organizationId: string;
  createdAt?: Date;
  updatedAt?: Date;
}
