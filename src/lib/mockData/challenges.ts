
import type { Challenge, ChallengeParticipation } from '@/types/challenge'; // Import ChallengeParticipation

// --- Mock Data ---
export let mockChallenges: Challenge[] = [ // Exported
    { id: 'c1', title: 'Engajamento Total', description: 'Participar de todas as reuniões da semana e enviar resumo.', category: 'Comunicação', periodStartDate: '2024-08-05', periodEndDate: '2024-08-09', points: 50, difficulty: 'Médio', participationType: 'Opcional', eligibility: { type: 'all' }, evaluationMetrics: 'Presença confirmada e resumo enviado', status: 'completed' },
    { id: 'c2', title: 'Zero Bugs Críticos', description: 'Entregar a feature X sem nenhum bug crítico reportado na primeira semana.', category: 'Qualidade', periodStartDate: '2024-08-12', periodEndDate: '2024-08-16', points: 150, difficulty: 'Difícil', participationType: 'Obrigatório', eligibility: { type: 'department', entityIds: ['Engenharia'] }, evaluationMetrics: 'Relatório de QA e Jira', status: 'active' },
    { id: 'c3', title: 'Semana da Documentação', description: 'Documentar todas as APIs desenvolvidas no período.', category: 'Documentação', periodStartDate: '2024-08-19', periodEndDate: '2024-08-23', points: 75, difficulty: 'Médio', participationType: 'Obrigatório', eligibility: { type: 'role', entityIds: ['Desenvolvedor Backend', 'Desenvolvedora Frontend'] }, evaluationMetrics: 'Links para documentação no Confluence', status: 'scheduled' },
    { id: 'c4', title: 'Feedback 360 Completo', description: 'Enviar feedback para todos os colegas designados.', category: 'Colaboração', periodStartDate: '2024-07-29', periodEndDate: '2024-08-02', points: 30, difficulty: 'Fácil', participationType: 'Obrigatório', eligibility: { type: 'all' }, evaluationMetrics: 'Confirmação no sistema de RH', status: 'evaluating' },
    { id: 'c5', title: 'Ideia Inovadora (Rascunho)', description: 'Propor uma melhoria significativa em algum processo.', category: 'Inovação', periodStartDate: '2024-09-02', periodEndDate: '2024-09-06', points: 100, difficulty: 'Médio', participationType: 'Opcional', eligibility: { type: 'all' }, evaluationMetrics: 'Apresentação da ideia e avaliação do comitê', status: 'draft' },
    { id: 'c6', title: 'Organização do Código', description: 'Refatorar componente legado X.', category: 'Qualidade', periodStartDate: '2024-08-26', periodEndDate: '2024-08-30', points: 120, difficulty: 'Difícil', participationType: 'Obrigatório', eligibility: { type: 'individual', entityIds: ['2'] }, evaluationMetrics: 'Análise de código e PR aprovado', status: 'scheduled' },
];

// Mock participation data (replace with actual fetching/relation)
export let mockParticipants: ChallengeParticipation[] = [ // Exported
    { id: 'p1', challengeId: 'c2', employeeId: '2', employeeName: 'Beto Santos', status: 'submitted', submission: 'Feature entregue e testada.', submittedAt: new Date(2024, 7, 15) }, // Aug 15
    { id: 'p2', challengeId: 'c2', employeeId: '5', employeeName: 'Eva Pereira', status: 'pending' }, // Didn't participate / submit
    { id: 'p3', challengeId: 'c1', employeeId: '1', employeeName: 'Alice Silva', status: 'approved', score: 50, feedback: 'Ótimo resumo!', submittedAt: new Date(2024, 7, 9) }, // Aug 9
    { id: 'p4', challengeId: 'c1', employeeId: '4', employeeName: 'Davi Costa', status: 'rejected', feedback: 'Faltou o resumo da reunião de quinta.', submittedAt: new Date(2024, 7, 10) }, // Aug 10
    { id: 'p5', challengeId: 'c4', employeeId: '1', employeeName: 'Alice Silva', status: 'submitted', submission: 'Feedbacks enviados via sistema RH', submittedAt: new Date(2024, 7, 1) }, // Aug 1
    { id: 'p6', challengeId: 'c4', employeeId: '2', employeeName: 'Beto Santos', status: 'submitted', submission: 'OK', submittedAt: new Date(2024, 7, 2) }, // Aug 2
    { id: 'p7', challengeId: 'c4', employeeId: '4', employeeName: 'Davi Costa', status: 'approved', score: 30, feedback: 'Completo.', submittedAt: new Date(2024, 7, 1) }, // Aug 1
    { id: 'p8', challengeId: 'c4', employeeId: '5', employeeName: 'Eva Pereira', status: 'approved', score: 30, feedback: 'Obrigado!', submittedAt: new Date(2024, 7, 2) }, // Aug 2
];

// Mock Employee Data (minimal for details view)
export const mockEmployeesSimple = [
    { id: '1', name: 'Alice Silva', role: 'Recrutadora', department: 'RH' },
    { id: '2', name: 'Beto Santos', role: 'Desenvolvedor Backend', department: 'Engenharia' },
    { id: '4', name: 'Davi Costa', role: 'Executivo de Contas', department: 'Vendas' },
    { id: '5', name: 'Eva Pereira', role: 'Desenvolvedora Frontend', department: 'Engenharia' },
];

// Colaborador app needs this mock data too
// Mock participation data for CURRENT_EMPLOYEE_ID = '1'
export let mockCurrentParticipations: ChallengeParticipation[] = [
    { challengeId: 'c1', employeeId: '1', status: 'approved', acceptedAt: new Date(2024, 7, 5), submittedAt: new Date(2024, 7, 9), submissionText: 'Resumos enviados.', score: 50, feedback: 'Ótimo trabalho!' },
    { challengeId: 'c2', employeeId: '1', status: 'pending' }, // Eligible but not accepted
    { challengeId: 'c3', employeeId: '1', status: 'pending' }, // Eligible but not accepted
    { challengeId: 'c4', employeeId: '1', status: 'submitted', acceptedAt: new Date(2024, 7, 29), submittedAt: new Date(2024, 7, 31), submissionText: 'Feedbacks enviados via RH.', feedback: 'Recebido para avaliação.' }, // Added feedback
    { challengeId: 'c5', employeeId: '1', status: 'accepted', acceptedAt: new Date(Date.now() - 86400000 * 2) }, // Accepted 2 days ago
    { challengeId: 'c6', employeeId: '1', status: 'pending' }, // Assuming eligible for demo
];
