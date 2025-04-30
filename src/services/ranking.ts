
'use server';

import type { Employee } from './employee';
import { getAllEmployees } from './employee';
import type { EvaluationScore } from './evaluation';
import { getEvaluationsForEmployeeByDate } from './evaluation'; // Assumindo que busca por período
import type { Task } from './task';
import { getTasksForDepartmentEvaluation } from './task';
import { AppSettings, getSettings } from './settings'; // Para buscar limite de zeros

/**
 * Representa a entrada de um colaborador no ranking.
 */
export interface RankingEntry {
  employeeId: string;
  employeeName: string;
  department: string;
  /** Pontuação total acumulada no período (0 a 10 * número de dias avaliados * número de tarefas diárias) */
  totalScore: number;
  /** Número total de tarefas avaliadas no período */
  evaluatedTasksCount: number;
   /** Número total de 'zeros' recebidos no período */
  zerosCount: number;
   /** Score médio percentual (totalScore / (evaluatedTasksCount * 10)) * 100 */
  averagePercentage: number;
   /** Posição no ranking */
  rank: number;
   /** Indica se está elegível para bônus baseado no limite de zeros */
  isEligibleForBonus: boolean;
   /** Variação em relação à posição anterior (ex: +2, -1, 0) - a ser implementado */
  // trend?: number;
}

// Cache simulado para o ranking (em produção, usar Redis ou similar)
let rankingCache: { timestamp: number; data: RankingEntry[] } | null = null;
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutos

/**
 * Calcula (ou busca do cache) o ranking dos colaboradores para um determinado período.
 * Esta é uma implementação MOCK e simplificada. Uma versão real seria mais complexa.
 *
 * @param yearMonth Período no formato 'YYYY-MM' (ex: '2024-07').
 * @param department Optional. Filtra o ranking por departamento.
 * @returns Promise<RankingEntry[]> - Lista ordenada de entradas do ranking.
 */
export async function getRanking(yearMonth: string, department?: string): Promise<RankingEntry[]> {
    console.log(`Getting ranking (mock) for ${yearMonth}${department ? ` in ${department}` : ''}...`);

    const now = Date.now();
    // Verifica cache
    if (rankingCache && (now - rankingCache.timestamp < CACHE_DURATION_MS)) {
       console.log("Returning cached ranking.");
       return filterRanking(rankingCache.data, department);
    }

    console.log("Calculating ranking...");
    await new Promise(resolve => setTimeout(resolve, 800)); // Simular cálculo demorado

    try {
        const employees = await getAllEmployees();
        const settings = await getSettings(); // Buscar configurações (limite de zeros)
        const rankingData: Omit<RankingEntry, 'rank'>[] = [];

        // Iterar sobre os colaboradores para calcular scores
        for (const employee of employees) {
             // Simular busca de avaliações para o mês (MOCK - busca apenas um dia fixo)
            // Em produção: buscar todas as avaliações do employee no yearMonth
            const mockDate = `${yearMonth}-15`; // Dia fixo para mock
            const evaluations = await getEvaluationsForEmployeeByDate(employee.id, mockDate);

             let totalScore = 0;
             let evaluatedTasksCount = 0;
             let zerosCount = 0;

            for (const taskId in evaluations) {
                const evaluation = evaluations[taskId];
                totalScore += evaluation.score;
                evaluatedTasksCount++;
                if (evaluation.score === 0) {
                    zerosCount++;
                }
            }

             // Adicionar lógica para lidar com dias sem avaliação ou tarefas não avaliadas?
             // Por enquanto, a média é baseada apenas nas tarefas *efetivamente* avaliadas.

            const averagePercentage = evaluatedTasksCount > 0
                ? Math.round((totalScore / (evaluatedTasksCount * 10)) * 100)
                : 0;

             const isEligible = zerosCount <= settings.maxZerosThreshold;

             rankingData.push({
                 employeeId: employee.id,
                 employeeName: employee.name,
                 department: employee.department,
                 totalScore: totalScore, // Simplificado - seria a soma do mês
                 evaluatedTasksCount: evaluatedTasksCount, // Simplificado
                 zerosCount: zerosCount, // Simplificado
                 averagePercentage: averagePercentage,
                 isEligibleForBonus: isEligible,
             });
        }

        // Ordenar o ranking (Critério: Maior Média Percentual, Menor nº Zeros, Nome)
        const sortedRanking = rankingData.sort((a, b) => {
            if (b.averagePercentage !== a.averagePercentage) {
                return b.averagePercentage - a.averagePercentage; // Maior média primeiro
            }
            if (a.zerosCount !== b.zerosCount) {
                return a.zerosCount - b.zerosCount; // Menor qtd de zeros primeiro
            }
            return a.employeeName.localeCompare(b.employeeName); // Desempate por nome
        });

        // Atribuir a posição (rank)
        const finalRanking: RankingEntry[] = sortedRanking.map((entry, index) => ({
            ...entry,
            rank: index + 1,
        }));

        // Atualizar cache
        rankingCache = { timestamp: now, data: finalRanking };

        return filterRanking(finalRanking, department);

    } catch (error) {
         console.error("Error calculating ranking:", error);
         // Retornar vazio ou lançar erro?
         return [];
    }
}

/** Filtra o ranking por departamento (helper) */
function filterRanking(ranking: RankingEntry[], department?: string): RankingEntry[] {
    if (!department) {
        return ranking; // Retorna todos se não houver filtro
    }
    return ranking.filter(entry => entry.department === department);
}


// --- Funções Adicionais (Exemplos) ---

/**
 * Busca o histórico de ranking para um colaborador específico.
 * (MOCK - Retorna ranking fixo para demonstração)
 *
 * @param employeeId ID do colaborador.
 * @returns Promise<{ period: string; rank: number; averagePercentage: number }[]>
 */
export async function getEmployeeRankingHistory(employeeId: string): Promise<{ period: string; rank: number; averagePercentage: number }[]> {
    console.log(`Getting ranking history (mock) for employee ${employeeId}...`);
    await new Promise(resolve => setTimeout(resolve, 200));

    // Simular histórico
    return [
        { period: '2024-07', rank: 3, averagePercentage: 95 },
        { period: '2024-06', rank: 5, averagePercentage: 92 },
        { period: '2024-05', rank: 2, averagePercentage: 98 },
    ];
}

/**
 * Confirma os vencedores de uma premiação para um período.
 * (MOCK - Apenas loga a ação)
 *
 * @param rewardId ID da premiação.
 * @param period Período 'YYYY-MM'.
 * @param winnerIds Lista de IDs dos colaboradores vencedores.
 * @param adminNotes Observações do administrador.
 * @returns Promise<void>
 */
export async function confirmRewardWinners(rewardId: string, period: string, winnerIds: string[], adminNotes?: string): Promise<void> {
    console.log(`Confirming winners (mock) for reward ${rewardId}, period ${period}`);
    console.log('Winners:', winnerIds);
    if (adminNotes) {
        console.log('Admin Notes:', adminNotes);
    }
    await new Promise(resolve => setTimeout(resolve, 300));
    // Em produção: Salvar registro de vencedores no banco, associado à premiação e período.
    // Marcar a premiação como "entregue" ou similar para o período.
}
