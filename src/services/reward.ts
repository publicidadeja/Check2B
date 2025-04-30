
'use server';

import type { Department } from './department';

/**
 * Representa a definição de uma premiação.
 */
export interface Reward {
  /** Identificador único da premiação */
  id: string;
  /** Título da premiação (ex: "Colaborador do Mês") */
  title: string;
  /** Descrição detalhada da premiação */
  description: string;
  /** Valor monetário (opcional) */
  monetaryValue?: number;
  /** Descrição da premiação não-monetária (opcional) */
  nonMonetaryDescription?: string;
  /** URL de uma imagem/ícone representativo (opcional) */
  imageUrl?: string;
  /** Mês/Ano de vigência (ex: "2024-08") ou "recorrente" */
  period: string; // Pode ser melhorado com datas de início/fim
  /** Se a premiação é recorrente mensalmente */
  isRecurring: boolean;
  /** Número de ganhadores (ex: 1 para 1º lugar, 3 para 1º, 2º e 3º) */
  numberOfWinners: number;
   /** Define se premiações diferentes por colocação (simplificado por enquanto) */
  // differentValuesPerRank?: boolean; // Adicionar lógica se necessário
   /** Departamentos elegíveis (array de nomes de departamentos ou ['Todos']) */
  eligibleDepartments: string[] | ['Todos'];
   /** Critérios extras de elegibilidade (ex: apenas quem teve 100%) */
  eligibilityCriteria?: string;
   /** Indica se a premiação está ativa/publicada */
  isActive: boolean;
}

// In-memory store para dados mock (substituir por banco de dados real)
let mockRewards: Reward[] = [
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

// --- Funções Mock da API ---

/**
 * Busca todas as premiações cadastradas.
 * @returns Promise<Reward[]> - Lista de premiações.
 */
export async function getAllRewards(): Promise<Reward[]> {
    console.log("Fetching all rewards (mock)...");
    await new Promise(resolve => setTimeout(resolve, 300));
    return mockRewards.map(r => ({...r})); // Retorna cópias
}

/**
 * Busca uma premiação específica pelo ID.
 * @param id - O ID da premiação.
 * @returns Promise<Reward | null> - A premiação encontrada ou null.
 */
export async function getRewardById(id: string): Promise<Reward | null> {
    console.log("Fetching reward by ID (mock):", id);
    await new Promise(resolve => setTimeout(resolve, 150));
    const reward = mockRewards.find(r => r.id === id);
    return reward ? {...reward} : null;
}


/**
 * Adiciona uma nova premiação.
 * @param rewardData - Dados da nova premiação (sem ID).
 * @returns Promise<Reward> - A premiação criada.
 * @throws Error - Se a validação falhar.
 */
export async function addReward(rewardData: Omit<Reward, 'id'>): Promise<Reward> {
    console.log("Adding reward (mock):", rewardData);
    await new Promise(resolve => setTimeout(resolve, 400));

    // --- Validação Básica ---
    if (!rewardData.title?.trim() || !rewardData.description?.trim()) {
        throw new Error("Título e Descrição são obrigatórios.");
    }
    if (rewardData.numberOfWinners <= 0) {
        throw new Error("Número de vencedores deve ser positivo.");
    }
    // Adicionar mais validações (ex: período, departamentos válidos, etc.)

    const newReward: Reward = {
        ...rewardData,
        id: `reward_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        isActive: rewardData.isActive ?? false, // Default para inativo se não especificado
        eligibleDepartments: rewardData.eligibleDepartments?.length ? rewardData.eligibleDepartments : ['Todos'],
    };

    mockRewards.push(newReward);
    return { ...newReward }; // Retorna cópia
}

/**
 * Atualiza uma premiação existente.
 * @param id - ID da premiação a ser atualizada.
 * @param rewardData - Dados parciais para atualizar.
 * @returns Promise<Reward> - A premiação atualizada.
 * @throws Error - Se a premiação não for encontrada ou validação falhar.
 */
export async function updateReward(id: string, rewardData: Partial<Omit<Reward, 'id'>>): Promise<Reward> {
    console.log("Updating reward (mock):", id, rewardData);
    await new Promise(resolve => setTimeout(resolve, 400));

    const rewardIndex = mockRewards.findIndex(r => r.id === id);
    if (rewardIndex === -1) {
        throw new Error("Premiação não encontrada.");
    }

    // --- Validação (exemplo) ---
    if (rewardData.numberOfWinners !== undefined && rewardData.numberOfWinners <= 0) {
        throw new Error("Número de vencedores deve ser positivo.");
    }
    // Adicionar mais validações conforme necessário

    const updatedReward = { ...mockRewards[rewardIndex], ...rewardData };
    mockRewards[rewardIndex] = updatedReward;
    return { ...updatedReward }; // Retorna cópia
}

/**
 * Deleta uma premiação.
 * @param id - ID da premiação a ser deletada.
 * @returns Promise<void>
 * @throws Error - Se a premiação não for encontrada.
 */
export async function deleteReward(id: string): Promise<void> {
    console.log("Deleting reward (mock):", id);
    await new Promise(resolve => setTimeout(resolve, 300));

    const initialLength = mockRewards.length;
    mockRewards = mockRewards.filter(r => r.id !== id);

    if (mockRewards.length === initialLength) {
        throw new Error("Premiação não encontrada para exclusão.");
    }
    // Em uma aplicação real, considerar o que acontece com históricos associados, etc.
}
