
'use server';

import type { Employee } from './employee';
import { getAllEmployees } from './employee';
import type { EvaluationScore } from './evaluation';
import { mockEvaluationsData } from './mock-data'; // Import shared stores
import { currentSettings, getSettings } from './settings'; // Use currentSettings directly for sync access
import { parse, startOfMonth, endOfMonth, isValid } from 'date-fns'; // Import date-fns

/**
 * Representa a entrada de um colaborador no ranking.
 */
export interface RankingEntry {
  employeeId: string;
  employeeName: string;
  department: string;
  /** Pontuação total acumulada no período */
  totalScore: number;
  /** Número total de tarefas *avaliadas* no período */
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
let rankingCache: { period: string; timestamp: number; data: RankingEntry[] } | null = null;
const CACHE_DURATION_MS = 1 * 60 * 1000; // 1 minuto cache

/** Invalida o cache do ranking */
export async function invalidateRankingCache(): Promise<void> {
    console.log("Invalidating ranking cache.");
    rankingCache = null;
}


/**
 * Calcula (ou busca do cache) o ranking dos colaboradores para um determinado período.
 *
 * @param yearMonth Período no formato 'YYYY-MM' (ex: '2024-07').
 * @param department Optional. Filtra o ranking por departamento.
 * @returns Promise<RankingEntry[]> - Lista ordenada de entradas do ranking.
 */
export async function getRanking(yearMonth: string, department?: string): Promise<RankingEntry[]> {
    console.log(`Getting ranking (mock) for ${yearMonth}${department ? ` in ${department}` : ''}...`);

    const now = Date.now();
    // Verifica cache por período
    if (rankingCache && rankingCache.period === yearMonth && (now - rankingCache.timestamp < CACHE_DURATION_MS)) {
       console.log("Returning cached ranking.");
       return filterRanking(rankingCache.data, department);
    }

    console.log("Calculating ranking...");
    await new Promise(resolve => setTimeout(resolve, 50)); // Shorter delay for calculation

    try {
        const employees = await getAllEmployees(); // Use the function from employee service
        const settings = await getSettings(); // Fetch latest settings asynchronously
        const rankingData: Omit<RankingEntry, 'rank'>[] = [];

        // Validar yearMonth
        const targetMonthDate = parse(yearMonth, 'yyyy-MM', new Date());
        if (!isValid(targetMonthDate)) {
            throw new Error(`Invalid yearMonth format: ${yearMonth}. Use YYYY-MM.`);
        }
        const monthStart = startOfMonth(targetMonthDate);
        const monthEnd = endOfMonth(targetMonthDate);
        // const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

        // Iterar sobre os colaboradores para calcular scores
        for (const employee of employees) {
            let totalScore = 0;
            let evaluatedTasksCount = 0;
            let zerosCount = 0;

            // Buscar todas as avaliações do funcionário no período
            const employeeEvaluations = mockEvaluationsData[employee.id] || {};

            // Filtrar avaliações para o mês específico
            for (const taskId in employeeEvaluations) {
                const evaluation = employeeEvaluations[taskId];
                 try {
                    // Ensure timestamp exists and is valid before parsing
                     if (evaluation.timestamp && typeof evaluation.timestamp === 'string') {
                        const evalDate = parse(evaluation.timestamp, "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", new Date());
                        if (isValid(evalDate) && evalDate >= monthStart && evalDate <= monthEnd) {
                            totalScore += evaluation.score;
                            evaluatedTasksCount++;
                            if (evaluation.score === 0) {
                                zerosCount++;
                            }
                        }
                     } else {
                         console.warn(`Missing or invalid timestamp for task ${taskId}, employee ${employee.id}`);
                     }
                 } catch (e) {
                     console.error(`Error parsing timestamp ${evaluation.timestamp} for task ${taskId}, employee ${employee.id}:`, e);
                 }
            }

            const averagePercentage = evaluatedTasksCount > 0
                ? Math.round((totalScore / (evaluatedTasksCount * 10)) * 100)
                : 0;

            const isEligible = zerosCount <= settings.maxZerosThreshold;

            rankingData.push({
                employeeId: employee.id,
                employeeName: employee.name,
                department: employee.department,
                totalScore: totalScore,
                evaluatedTasksCount: evaluatedTasksCount,
                zerosCount: zerosCount,
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
        rankingCache = { period: yearMonth, timestamp: now, data: finalRanking };

        return filterRanking(finalRanking, department);

    } catch (error) {
         console.error("Error calculating ranking:", error);
         // Retornar vazio ou lançar erro?
         return [];
    }
}

/** Filtra o ranking por departamento (helper) */
function filterRanking(ranking: RankingEntry[], department?: string): RankingEntry[] {
    if (!department || department === "Todos") {
        return ranking; // Retorna todos se não houver filtro ou for 'Todos'
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

    // Simular histórico (poderia buscar rankings cacheados de meses anteriores)
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
