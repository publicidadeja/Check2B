
// src/lib/mockData/challenges.ts

import type { Challenge, ChallengeParticipation } from '@/types/challenge';
import { format, addDays, subDays } from 'date-fns';

const DEFAULT_ORG_ID = 'org_default';

export const mockEmployeesSimple = [
    { id: '1', name: 'Alice Silva', role: 'Recrutadora', department: 'RH' },
    { id: '2', name: 'Beto Santos', role: 'Desenvolvedor Backend', department: 'Engenharia' },
    { id: '4', name: 'Davi Costa', role: 'Executivo de Contas', department: 'Vendas' },
    { id: '5', name: 'Eva Pereira', role: 'Desenvolvedora Frontend', department: 'Engenharia' },
];

// Re-defining mockChallenges to ensure it's exported
export let mockChallenges: Challenge[] = [
  {
    id: 'c1',
    title: 'Feedback Construtivo Semanal',
    description: 'Forneça feedback detalhado para 3 colegas sobre projetos recentes nesta semana.',
    category: 'Colaboração',
    periodStartDate: format(subDays(new Date(), 2), 'yyyy-MM-dd'), // Starts 2 days ago
    periodEndDate: format(addDays(new Date(), 5), 'yyyy-MM-dd'),   // Ends in 5 days
    points: 50,
    difficulty: 'Médio',
    participationType: 'Opcional',
    eligibility: { type: 'all' },
    evaluationMetrics: 'Qualidade e especificidade do feedback fornecido, conforme avaliação dos gestores. Pelo menos 50 palavras por feedback.',
    status: 'active',
    organizationId: DEFAULT_ORG_ID,
    createdAt: subDays(new Date(), 7),
  },
  {
    id: 'c2',
    title: 'Organização da Área de Trabalho Digital',
    description: 'Mantenha sua área de trabalho e arquivos digitais (principais pastas de projeto) impecavelmente organizados e nomeados conforme padrão.',
    category: 'Organização',
    periodStartDate: format(new Date(), 'yyyy-MM-dd'), // Starts today
    periodEndDate: format(addDays(new Date(), 7), 'yyyy-MM-dd'), // Ends in 7 days
    points: 30,
    difficulty: 'Fácil',
    participationType: 'Obrigatório',
    eligibility: { type: 'department', entityIds: ['Engenharia', 'Marketing'] },
    evaluationMetrics: 'Verificação da organização pelo gestor e auto-declaração com print (opcional).',
    status: 'active',
    organizationId: DEFAULT_ORG_ID,
    createdAt: new Date(),
  },
  {
    id: 'c3',
    title: 'Ideia Inovadora do Mês (Ativa)',
    description: 'Apresente uma ideia inovadora para melhorar um processo interno, produto ou serviço ao cliente.',
    category: 'Inovação',
    periodStartDate: format(subDays(new Date(), 10), 'yyyy-MM-dd'),
    periodEndDate: format(addDays(new Date(), 20), 'yyyy-MM-dd'),
    points: 100,
    difficulty: 'Difícil',
    participationType: 'Opcional',
    eligibility: { type: 'all' },
    evaluationMetrics: 'Originalidade, viabilidade, impacto potencial e clareza da apresentação da ideia.',
    status: 'active',
    organizationId: DEFAULT_ORG_ID,
    imageUrl: 'https://placehold.co/600x400.png',
    supportMaterialUrl: 'https://example.com/innovation_guide_v2',
    createdAt: subDays(new Date(), 12),
  },
  {
    id: 'c4',
    title: 'Maratona de Documentação (Concluído)',
    description: 'Documente 5 funcionalidades críticas do sistema Check2B que ainda não possuem documentação completa.',
    category: 'Qualidade',
    periodStartDate: format(subDays(new Date(), 15), 'yyyy-MM-dd'),
    periodEndDate: format(subDays(new Date(), 8), 'yyyy-MM-dd'), // Desafio passado
    points: 75,
    difficulty: 'Médio',
    participationType: 'Opcional',
    eligibility: { type: 'role', entityIds: ['Desenvolvedor Backend', 'Desenvolvedora Frontend'] },
    evaluationMetrics: 'Clareza, completude e precisão da documentação produzida. Deve seguir o template padrão.',
    status: 'completed',
    organizationId: DEFAULT_ORG_ID,
    createdAt: subDays(new Date(), 20),
  },
];

// Re-defining mockParticipants to ensure it's exported
export let mockParticipants: ChallengeParticipation[] = [
    {
        id: 'cp-admin-example-1',
        challengeId: 'c1', // Feedback Construtivo
        employeeId: '2', // Beto Santos
        employeeName: 'Beto Santos',
        status: 'submitted',
        acceptedAt: subDays(new Date(), 1), // Aceitou ontem
        submittedAt: new Date(),      // Submeteu hoje
        submissionText: 'Feedback enviado para Alice, Davi e Eva sobre os últimos relatórios.',
        organizationId: DEFAULT_ORG_ID,
        createdAt: subDays(new Date(), 1),
    },
    {
        id: 'cp-admin-example-2',
        challengeId: 'c3', // Ideia Inovadora
        employeeId: '5', // Eva Pereira
        employeeName: 'Eva Pereira',
        status: 'accepted',
        acceptedAt: subDays(new Date(), 3),
        organizationId: DEFAULT_ORG_ID,
        createdAt: subDays(new Date(), 3),
    }
];

// Re-defining mockCurrentParticipations to ensure it's exported
export let mockCurrentParticipations: ChallengeParticipation[] = [
    { 
        id: 'cp1-alice-c1', 
        challengeId: 'c1', 
        employeeId: '1', // Alice Silva
        employeeName: 'Alice Silva', 
        status: 'approved', 
        acceptedAt: subDays(new Date(), 2), 
        submittedAt: subDays(new Date(), 1), 
        submissionText: 'Feedback construtivo detalhado enviado para Carlos, Bia e Davi.', 
        score: 50, 
        feedback: 'Excelente qualidade de feedback, Alice! Muito útil.', 
        organizationId: DEFAULT_ORG_ID, 
        createdAt: subDays(new Date(),2), 
        updatedAt: subDays(new Date(),0) 
    },
    { 
        id: 'cp2-alice-c3', 
        challengeId: 'c3', // Ideia Inovadora
        employeeId: '1', // Alice Silva
        employeeName: 'Alice Silva', 
        status: 'accepted', // Alice aceitou, mas ainda não submeteu
        acceptedAt: subDays(new Date(), 1), 
        organizationId: DEFAULT_ORG_ID, 
        createdAt: subDays(new Date(),1) 
    },
    // Para o desafio 'c2' (Organização), se Alice for da Engenharia ou Marketing (conforme eligibility)
    // Se Alice NÃO é de Engenharia/Marketing, ela não deveria ter uma participação 'pending' ou 'accepted'
    // a menos que a lógica de elegibilidade não esteja sendo aplicada para criar esta lista mock.
    // Assumindo que ela NÃO é para testar o filtro de 'Disponíveis' vs 'Em Andamento'.
    // Se ela fosse, a linha abaixo poderia ser:
    // { id: 'cp3-alice-c2', challengeId: 'c2', employeeId: '1', status: 'pending', organizationId: DEFAULT_ORG_ID, createdAt: new Date() },
];

    