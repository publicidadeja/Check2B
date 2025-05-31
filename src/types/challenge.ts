
export interface Challenge {
  id: string;
  title: string;
  description: string;
  category?: string;
  periodStartDate: string; // YYYY-MM-DD
  periodEndDate: string; // YYYY-MM-DD
  points: number;
  difficulty: 'Fácil' | 'Médio' | 'Difícil';
  participationType: 'Opcional' | 'Obrigatório';
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

// --- Challenge Settings Types ---
export interface ChallengeSettings {
  id?: string; // Typically a fixed ID like 'config' for the doc
  rankingFactor: number;
  defaultParticipationType: 'Opcional' | 'Obrigatório';
  enableGamificationFeatures: boolean;
  maxMonthlyChallengePointsCap: number | null; // null if no cap
  organizationId: string;
  updatedAt?: Date;
}

// Data for saving, can omit id, organizationId, and updatedAt as they are managed by Firestore or service
export type ChallengeSettingsData = Omit<ChallengeSettings, 'id' | 'organizationId' | 'updatedAt'>;
