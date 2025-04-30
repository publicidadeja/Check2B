
import type { AdminUser } from './adminUser';
import type { Challenge } from './challenge';
import type { Department } from './department';
import type { Employee } from './employee';
import type { EvaluationScore } from './evaluation';
import type { Reward } from './reward';
import type { Role } from './role';
import type { AppSettings } from './settings';
import type { Task } from './task';

// --- Admin Users ---
export let mockAdmins: AdminUser[] = [
    { id: 'admin1', name: 'Admin Principal', email: 'admin@check2b.com', isActive: true, lastLogin: '2024-07-27 10:00' },
    { id: 'admin2', name: 'Supervisor RH', email: 'rh.supervisor@check2b.com', isActive: true },
    { id: 'admin3', name: 'Gerente Vendas', email: 'vendas.gerente@check2b.com', isActive: false },
];

// --- Challenges ---
export let mockChallenges: Challenge[] = [
  {
    id: 'challenge_1',
    title: 'Superação de Metas de Vendas',
    description: 'Atingir 110% da meta de vendas individual da semana.',
    category: 'Produtividade',
    startDate: '2024-08-05',
    endDate: '2024-08-09',
    points: 50,
    difficulty: 'Médio',
    participationType: 'Obrigatório',
    eligibleDepartments: ['Vendas'],
    evaluationMetrics: 'Verificação do relatório de vendas no CRM.',
    isActive: true,
    imageUrl: 'https://picsum.photos/seed/challenge1/100/100'
  },
  {
    id: 'challenge_2',
    title: 'Inovação Operacional Proposta',
    description: 'Sugerir uma melhoria concreta em um processo operacional existente.',
    category: 'Inovação',
    startDate: '2024-08-05',
    endDate: '2024-08-09',
    points: 75,
    difficulty: 'Difícil',
    participationType: 'Opcional',
    eligibleDepartments: ['Todos'],
    evaluationMetrics: 'Avaliação da proposta pela gerência (originalidade, viabilidade, impacto).',
    supportMaterial: 'Link para formulário de sugestões: [link]',
    isActive: true,
  },
  {
    id: 'challenge_3',
    title: 'Zero Erros de Digitação',
    description: 'Concluir todas as tarefas de entrada de dados da semana sem erros reportados.',
    category: 'Qualidade',
    startDate: '2024-08-12',
    endDate: '2024-08-16',
    points: 30,
    difficulty: 'Fácil',
    participationType: 'Obrigatório',
    eligibleDepartments: ['Administrativo', 'RH'],
    evaluationMetrics: 'Auditoria aleatória de 10% das entradas realizadas.',
    isActive: false, // Example of an inactive (past or future) challenge
  },
];

// --- Departments ---
export let mockDepartments: Department[] = [
    { id: 'dept1', name: 'Engenharia' },
    { id: 'dept2', name: 'Vendas' },
    { id: 'dept3', name: 'Marketing' },
    { id: 'dept4', name: 'RH' },
     { id: 'dept5', name: 'Administrativo' }, // Added based on challenge example
     { id: 'dept6', name: 'Suporte' }, // Added based on reward example
];

// --- Employees ---
export let mockEmployees: Employee[] = [
    {
      id: 'emp_123',
      name: 'João Silva',
      department: 'Engenharia',
      role: 'Engenheiro de Software Pleno',
      email: 'joao.silva@check2b.com',
      admissionDate: '2023-05-20'
    },
    {
      id: 'emp_456',
      name: 'Maria Oliveira',
      department: 'Vendas',
      role: 'Executiva de Contas',
      email: 'maria.oliveira@check2b.com',
      admissionDate: '2022-11-10'
    },
     {
      id: 'emp_789',
      name: 'Carlos Pereira',
      department: 'Marketing',
      role: 'Especialista em SEO',
      // No email or admission date for this mock employee
    },
     {
      id: 'emp_101',
      name: 'Ana Costa',
      department: 'RH',
      role: 'Analista de Recrutamento',
       email: 'ana.costa@check2b.com',
    },
];

// --- Evaluations ---
// Key: employeeId, Value: { taskId: EvaluationScore & { timestamp: string } }
export const mockEvaluationsData: Record<string, Record<string, EvaluationScore & { timestamp: string }>> = {};

// --- Rewards ---
export let mockRewards: Reward[] = [
    {
        id: 'reward_1',
        title: 'Colaborador Destaque do Mês',
        description: 'Reconhecimento pelo excelente desempenho e contribuição excepcional durante o mês.',
        monetaryValue: 500,
        period: 'recorrente',
        isRecurring: true,
        numberOfWinners: 1,
        eligibleDepartments: ['Todos'],
        isActive: true,
        imageUrl: 'https://picsum.photos/seed/reward1/100/100' // Placeholder image
    },
    {
        id: 'reward_2',
        title: 'Top Vendas Agosto/2024',
        description: 'Prêmio para o membro da equipe de vendas com o maior volume de negócios fechados em Agosto.',
        monetaryValue: 1000,
        nonMonetaryDescription: 'Troféu exclusivo Top Vendas',
        period: '2024-08',
        isRecurring: false,
        numberOfWinners: 1,
        eligibleDepartments: ['Vendas'],
        isActive: true,
        imageUrl: 'https://picsum.photos/seed/reward2/100/100'
    },
     {
        id: 'reward_3',
        title: 'Excelência Operacional Q3',
        description: 'Premiação trimestral para o colaborador que demonstrou maior eficiência e qualidade nas operações.',
        nonMonetaryDescription: '1 dia de folga adicional',
        period: '2024-Q3', // Exemplo de período trimestral
        isRecurring: false,
        numberOfWinners: 1,
        eligibleDepartments: ['Engenharia', 'Suporte'], // Exemplo múltiplos deptos
        isActive: false, // Exemplo inativo
    }
];

// --- Roles ---
export let mockRoles: Role[] = [
    { id: "engenheiro-de-software-junior", name: "Engenheiro de Software Júnior" },
    { id: "engenheiro-de-software-pleno", name: "Engenheiro de Software Pleno" },
    { id: "engenheiro-de-software-senior", name: "Engenheiro de Software Sênior" },
    { id: "gerente-de-vendas", name: "Gerente de Vendas" },
    { id: "executivo-de-contas", name: "Executivo de Contas" },
    { id: "especialista-em-marketing", name: "Especialista em Marketing" },
    { id: "analista-de-rh", name: "Analista de RH" },
    { id: "analista-de-recrutamento", name: "Analista de Recrutamento" },
    { id: "designer-ux-ui", name: "Designer UX/UI" },
];

// --- Settings ---
export let currentSettings: AppSettings = {
  bonusValuePerPoint: 1.50,
  maxZerosThreshold: 5,
  enableAutoReports: true,
  notificationFrequency: 'daily',
};

// --- Tasks ---
export let mockTasks: Task[] = [
    {
      id: 'task_1',
      title: 'Preencher Relatório Diário de Vendas',
      description: 'Registrar todas as vendas e contatos realizados no dia no CRM.',
      department: 'Vendas',
      criteria: 'Todos os campos obrigatórios do CRM preenchidos corretamente até às 18h.',
      category: 'Relatórios',
      priority: 'Alta',
      periodicity: 'Diária'
    },
    {
      id: 'task_2',
      title: 'Participar da Daily Standup',
      description: 'Comparecer à reunião diária de alinhamento da equipe às 9h.',
      department: 'Engenharia',
      criteria: 'Participação pontual e ativa na reunião.',
      category: 'Reuniões',
      priority: 'Alta',
      periodicity: 'Diária'
    },
     {
      id: 'task_3',
      title: 'Revisar Pull Requests Pendentes',
      description: 'Analisar e fornecer feedback sobre os PRs abertos no repositório da equipe.',
      department: 'Engenharia',
      criteria: 'Todos os PRs pendentes revisados ou comentados até o final do dia.',
      category: 'Desenvolvimento',
      priority: 'Média',
      periodicity: 'Diária'
    },
     {
      id: 'task_4',
      title: 'Planejar Campanha de Email Marketing',
      description: 'Definir público, conteúdo e cronograma para a próxima campanha de email.',
      department: 'Marketing',
      criteria: 'Documento de planejamento da campanha concluído e aprovado.',
      category: 'Planejamento', // New category example
      priority: 'Média',
      periodicity: 'Semanal' // Example of non-daily
    },
     {
      id: 'task_5',
      title: 'Organizar Arquivos de Contratos',
      description: 'Digitalizar e organizar contratos de novos clientes na pasta designada.',
      department: 'RH', // Example for RH
      criteria: 'Todos os contratos recebidos no dia anterior organizados até 12h.',
      category: 'Administrativo', // New category example
      priority: 'Baixa',
      periodicity: 'Diária'
    },
     {
      id: 'task_6', // Added generic task
      title: 'Verificar Caixa de Entrada Geral',
      description: 'Processar emails recebidos na caixa de entrada geral da empresa.',
      department: 'Geral',
      criteria: 'Caixa de entrada zerada ou com todos os emails direcionados/respondidos ao final do dia.',
      category: 'Comunicação',
      priority: 'Média',
      periodicity: 'Diária'
    },
];
