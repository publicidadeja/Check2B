
import type { Award } from '@/app/(admin)/ranking/page'; // Reuse admin types

// --- Mock Data ---
export let mockAwards: Award[] = [
    { id: 'awd1', title: 'Colaborador do Mês', description: 'Reconhecimento pelo desempenho excepcional.', monetaryValue: 500, period: 'recorrente', winnerCount: 1, eligibleDepartments: ['all'], status: 'active', isRecurring: true },
    { id: 'awd2', title: 'Destaque Operacional - Julho', description: 'Melhor performance nas tarefas operacionais.', nonMonetaryValue: 'Folga adicional', period: '2024-07', winnerCount: 1, eligibleDepartments: ['Engenharia', 'RH'], status: 'inactive', isRecurring: false, specificMonth: new Date(2024, 6, 1), eligibilityCriteria: true },
    { id: 'awd3', title: 'Top 3 Vendas', description: 'Maiores resultados em vendas.', monetaryValue: 300, period: 'recorrente', winnerCount: 3, eligibleDepartments: ['Vendas'], status: 'active', isRecurring: true, valuesPerPosition: { 1: { monetary: 300 }, 2: { monetary: 200 }, 3: { monetary: 100 } } },
    { id: 'awd4', title: 'Campeão da Inovação (Rascunho)', description: 'Melhor sugestão de melhoria.', period: 'recorrente', winnerCount: 1, eligibleDepartments: ['all'], status: 'draft', isRecurring: true },
];
