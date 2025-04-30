
'use server';

import type { Employee } from './employee';
import { getAllEmployees } from './employee';
import type { EvaluationScore } from './evaluation';
import { getEvaluationsForMultipleEmployeesByMonth } from './evaluation'; // Import Firestore-based function
import type { AppSettings } from './settings';
import { getSettings } from './settings'; // Fetch settings from Firestore
import { parse, startOfMonth, endOfMonth, isValid, format } from 'date-fns'; // Import date-fns

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

// In-memory Cache simulado para o ranking (substituir por Redis/Memcached em produção)
interface RankingCache {
    [key: string]: { // Key format: YYYY-MM[_department?]
        timestamp: number;
        data: RankingEntry[];
    }
}
let rankingCache: RankingCache = {};
const CACHE_DURATION_MS = 2 * 60 * 1000; // 2 minutos cache

/**
 * Invalida o cache do ranking para um período específico ou todos os períodos.
 * @param yearMonth Optional. Periodo 'YYYY-MM' para invalidar. Se omitido, invalida todo o cache.
 */
export async function invalidateRankingCache(yearMonth?: string): Promise<void> {
    if (yearMonth) {
        console.log(`Invalidating ranking cache for period ${yearMonth}...`);
        // Invalidate specific month and related departmental caches
        Object.keys(rankingCache).forEach(key => {
            if (key.startsWith(yearMonth)) {
                delete rankingCache[key];
            }
        });
    } else {
        console.log("Invalidating all ranking cache.");
        rankingCache = {};
    }
}

/**
 * Calcula (ou busca do cache) o ranking dos colaboradores para um determinado período.
 *
 * @param yearMonth Período no formato 'YYYY-MM' (ex: '2024-07').
 * @param department Optional. Filtra o ranking por departamento.
 * @returns Promise<RankingEntry[]> - Lista ordenada de entradas do ranking.
 */
export async function getRanking(yearMonth: string, department?: string): Promise<RankingEntry[]> {
    const cacheKey = `${yearMonth}${department ? `_${department}` : '_Todos'}`;
    const now = Date.now();

    console.log(`Getting ranking for ${yearMonth}${department ? ` in ${department}` : ''}... Cache key: ${cacheKey}`);

    // Verifica cache
    if (rankingCache[cacheKey] && (now - rankingCache[cacheKey].timestamp < CACHE_DURATION_MS)) {
       console.log("Returning cached ranking.");
       return rankingCache[cacheKey].data;
    }

    console.log("Calculating ranking...");

    try {
        // 1. Fetch Settings (needed for bonus eligibility)
        const settings = await getSettings(); // Fetch latest settings

        // 2. Fetch Employees (filter by department later if needed)
        const allEmployees = await getAllEmployees(); // Fetch all employees
        if (allEmployees.length === 0) return []; // No employees, empty ranking

        const employeeIds = allEmployees.map(e => e.id);

        // 3. Validate yearMonth and get date range
        const targetMonthDate = parse(yearMonth, 'yyyy-MM', new Date());
        if (!isValid(targetMonthDate)) {
            throw new Error(`Invalid yearMonth format: ${yearMonth}. Use YYYY-MM.`);
        }
        const monthStart = startOfMonth(targetMonthDate);
        const monthEnd = endOfMonth(targetMonthDate);

        // 4. Fetch Evaluations for all employees for the period
        // This function needs to be efficient (e.g., using collectionGroup query)
        const evaluationsByEmployee = await getEvaluationsForMultipleEmployeesByMonth(employeeIds, yearMonth);

        // 5. Process evaluations and calculate scores for each employee
        const rankingData: Omit<RankingEntry, 'rank'>[] = [];

        for (const employee of allEmployees) {
            let totalScore = 0;
            let evaluatedTasksCount = 0;
            let zerosCount = 0;

            const employeeEvaluationsMap = evaluationsByEmployee[employee.id] || {}; // TaskId -> EvaluationScore[]

            // Iterate through tasks evaluated for this employee in the period
            for (const taskId in employeeEvaluationsMap) {
                const evaluationsForTask = employeeEvaluationsMap[taskId];
                // Since getEvaluationsForMultipleEmployeesByMonth already filters by month,
                // we just process the scores found for this employee.
                evaluationsForTask.forEach(evaluation => {
                    totalScore += evaluation.score;
                    evaluatedTasksCount++; // Count each evaluation record
                    if (evaluation.score === 0) {
                        zerosCount++;
                    }
                });
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

        // 6. Sort the ranking (Critério: Maior Média Percentual, Menor nº Zeros, Nome)
        const sortedRanking = rankingData.sort((a, b) => {
            if (b.averagePercentage !== a.averagePercentage) {
                return b.averagePercentage - a.averagePercentage; // Maior média primeiro
            }
            if (a.zerosCount !== b.zerosCount) {
                return a.zerosCount - b.zerosCount; // Menor qtd de zeros primeiro
            }
            return a.employeeName.localeCompare(b.employeeName); // Desempate por nome
        });

        // 7. Assign rank
        let currentRank = 0;
        let lastPercentage = -1;
        let lastZeros = -1;
        const finalRankingWithRank: RankingEntry[] = sortedRanking.map((entry, index) => {
            // Increment rank only if score or zeros count differs from the previous entry
            if (entry.averagePercentage !== lastPercentage || entry.zerosCount !== lastZeros) {
                currentRank = index + 1;
            }
            lastPercentage = entry.averagePercentage;
            lastZeros = entry.zerosCount;
            return {
                ...entry,
                rank: currentRank,
            };
        });

        // 8. Filter by department *after* calculating full ranking and ranks
        const filteredRanking = filterRanking(finalRankingWithRank, department);


        // 9. Update cache
        rankingCache[cacheKey] = { timestamp: now, data: filteredRanking };
        // Cache the full ranking as well if not already cached
        const fullCacheKey = `${yearMonth}_Todos`;
        if (!rankingCache[fullCacheKey] || now - rankingCache[fullCacheKey].timestamp >= CACHE_DURATION_MS) {
             rankingCache[fullCacheKey] = { timestamp: now, data: finalRankingWithRank };
        }


        return filteredRanking;

    } catch (error) {
         console.error("Error calculating ranking:", error);
         // Retornar vazio ou lançar erro?
         throw new Error("Falha ao calcular o ranking."); // Throw to indicate failure
    }
}

/** Filtra o ranking por departamento (helper) */
function filterRanking(ranking: RankingEntry[], department?: string): RankingEntry[] {
    if (!department || department === "Todos") {
        return ranking; // Retorna todos se não houver filtro ou for 'Todos'
    }
    return ranking.filter(entry => entry.department === department);
}


// --- Funções Adicionais (Exemplos - precisam de implementação Firestore) ---

/**
 * Busca o histórico de ranking para um colaborador específico.
 * (Precisa implementar lógica de busca em rankings arquivados)
 *
 * @param employeeId ID do colaborador.
 * @returns Promise<{ period: string; rank: number; averagePercentage: number }[]>
 */
export async function getEmployeeRankingHistory(employeeId: string): Promise<{ period: string; rank: number; averagePercentage: number }[]> {
    console.log(`Getting ranking history (Firestore TODO) for employee ${employeeId}...`);
    // Firestore Logic: Query an 'archivedRankings' collection or similar,
    // filtering by employeeId and ordering by period.
    await new Promise(resolve => setTimeout(resolve, 200));
    // Placeholder data:
    return [
        // { period: '2024-07', rank: 3, averagePercentage: 95 },
        // { period: '2024-06', rank: 5, averagePercentage: 92 },
        // { period: '2024-05', rank: 2, averagePercentage: 98 },
    ];
}

/**
 * Confirma os vencedores de uma premiação para um período.
 * (Precisa implementar lógica de salvamento em Firestore)
 *
 * @param rewardId ID da premiação.
 * @param period Período 'YYYY-MM'.
 * @param winnerIds Lista de IDs dos colaboradores vencedores.
 * @param adminNotes Observações do administrador.
 * @returns Promise<void>
 */
export async function confirmRewardWinners(rewardId: string, period: string, winnerIds: string[], adminNotes?: string): Promise<void> {
    console.log(`Confirming winners (Firestore TODO) for reward ${rewardId}, period ${period}`);
    console.log('Winners:', winnerIds);
    if (adminNotes) {
        console.log('Admin Notes:', adminNotes);
    }
    // Firestore Logic:
    // 1. Create a document in a 'rewardWinners' collection:
    //    docId could be `${rewardId}_${period}`
    //    Data: { rewardId, period, winnerIds, confirmedAt: Timestamp.now(), confirmedBy: adminId, notes: adminNotes }
    // 2. Potentially update the Reward document itself to mark the period as awarded.
    await new Promise(resolve => setTimeout(resolve, 300));
}
