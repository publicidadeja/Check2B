
import type { Challenge, ChallengeParticipation } from '@/types/challenge';

const DEFAULT_ORG_ID = 'org_default';

// mockChallenges and mockParticipants are removed as data will come from Firestore.
// We keep mockEmployeesSimple as it's still used by ChallengeForm for populating eligibility selects.
// In a full Firestore integration, these would also be fetched.

export const mockEmployeesSimple = [
    { id: '1', name: 'Alice Silva', role: 'Recrutadora', department: 'RH' },
    { id: '2', name: 'Beto Santos', role: 'Desenvolvedor Backend', department: 'Engenharia' },
    { id: '4', name: 'Davi Costa', role: 'Executivo de Contas', department: 'Vendas' },
    { id: '5', name: 'Eva Pereira', role: 'Desenvolvedora Frontend', department: 'Engenharia' },
];

// Mock participation data for CURRENT_EMPLOYEE_ID = '1' (used by collaborator challenges page)
// This will also need to be replaced with Firestore data in the collaborator section.
export let mockCurrentParticipations: ChallengeParticipation[] = [
    { id: 'cp1', challengeId: 'c1', employeeId: '1', status: 'approved', acceptedAt: new Date(2024, 7, 5), submittedAt: new Date(2024, 7, 9), submissionText: 'Resumos enviados.', score: 50, feedback: 'Ótimo trabalho!', organizationId: DEFAULT_ORG_ID, createdAt: new Date(), updatedAt: new Date() },
    { id: 'cp2', challengeId: 'c2', employeeId: '1', status: 'pending', organizationId: DEFAULT_ORG_ID, createdAt: new Date() },
    { id: 'cp3', challengeId: 'c3', employeeId: '1', status: 'pending', organizationId: DEFAULT_ORG_ID, createdAt: new Date() },
    { id: 'cp4', challengeId: 'c4', employeeId: '1', status: 'submitted', acceptedAt: new Date(2024, 7, 29), submittedAt: new Date(2024, 7, 31), submissionText: 'Feedbacks enviados via RH.', feedback: 'Recebido para avaliação.', organizationId: DEFAULT_ORG_ID, createdAt: new Date(), updatedAt: new Date() },
    { id: 'cp5', challengeId: 'c5', employeeId: '1', status: 'accepted', acceptedAt: new Date(Date.now() - 86400000 * 2), organizationId: DEFAULT_ORG_ID, createdAt: new Date() },
    { id: 'cp6', challengeId: 'c6', employeeId: '1', status: 'pending', organizationId: DEFAULT_ORG_ID, createdAt: new Date() },
];
