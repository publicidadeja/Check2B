
'use server';

import { mockEvaluationsData } from './mock-data'; // Import shared store
import { format, parse, startOfMonth, endOfMonth, isValid } from 'date-fns'; // Import date-fns functions
import { invalidateRankingCache } from './ranking'; // Import cache invalidation function

/**
 * Represents an evaluation score and its justification.
 */
export interface EvaluationScore {
  /**
   * The evaluation score, which is either 0 or 10.
   */
  score: 0 | 10;
  /**
   * The justification for the score (required if score is 0, optional/ignored if 10).
   */
  justification: string;
  /** Optional timestamp for when the evaluation was recorded */
  timestamp?: string;
}

/**
 * Asynchronously submits or updates an evaluation score for a specific task and employee.
 *
 * @param taskId The ID of the task being evaluated.
 * @param employeeId The ID of the employee being evaluated.
 * @param scoreData The evaluation score object { score: 0 | 10, justification: string }.
 * @returns A promise that resolves when the submission is complete.
 * @throws Error if validation fails.
 */
export async function submitEvaluation(
  taskId: string,
  employeeId: string,
  scoreData: EvaluationScore
): Promise<void> {
  console.log(`Submitting evaluation (mock) for task ${taskId}, employee ${employeeId}:`, scoreData);
  await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100)); // Shorter delay

  // --- Validation ---
  if (scoreData.score === null || scoreData.score === undefined) {
      throw new Error(`Score inválido para a tarefa ${taskId}.`);
  }
  if (scoreData.score === 0 && !scoreData.justification?.trim()) {
    throw new Error(`Justificativa é obrigatória para nota 0 na tarefa ${taskId}.`);
  }
  if (scoreData.score !== 0 && scoreData.score !== 10) {
      throw new Error(`Score deve ser 0 ou 10 para a tarefa ${taskId}.`);
  }

  // --- Mock Storage Logic ---
  if (!mockEvaluationsData[employeeId]) {
    mockEvaluationsData[employeeId] = {};
  }

  // Store the evaluation with a timestamp (using current date for simplicity in mock)
  // In a real app, you might pass the evaluation date explicitly.
  const evaluationDate = format(new Date(), 'yyyy-MM-dd');
  const timestamp = new Date(`${evaluationDate}T${format(new Date(), 'HH:mm:ss')}`).toISOString(); // Store with time

  mockEvaluationsData[employeeId][taskId] = {
      score: scoreData.score,
      // Ensure justification is empty if score is 10, even if passed otherwise
      justification: scoreData.score === 10 ? '' : scoreData.justification.trim(),
      timestamp: timestamp,
  };

  console.log("Mock evaluation stored:", mockEvaluationsData[employeeId][taskId]);
  // Invalidate ranking cache after submission
  await invalidateRankingCache();
}

/**
 * Asynchronously retrieves evaluations for a specific employee within a given month.
 *
 * @param employeeId The ID of the employee.
 * @param yearMonth The period string 'YYYY-MM'.
 * @returns A promise resolving to a record of taskId to EvaluationScore for the specified month.
 */
export async function getEvaluationsForEmployeeByMonth(employeeId: string, yearMonth: string): Promise<Record<string, EvaluationScore>> {
     console.log(`Getting evaluations (mock) for employee ${employeeId} in month ${yearMonth}`);
     await new Promise(resolve => setTimeout(resolve, 150));

     const employeeEvals = mockEvaluationsData[employeeId] || {};
     const evaluationsForMonth: Record<string, EvaluationScore> = {};

     try {
        const targetMonthDate = parse(yearMonth, 'yyyy-MM', new Date());
        if (!isValid(targetMonthDate)) {
             console.error(`Invalid yearMonth format provided: ${yearMonth}`);
             return evaluationsForMonth; // Return empty if date is invalid
        }
        const monthStart = startOfMonth(targetMonthDate);
        const monthEnd = endOfMonth(targetMonthDate);

         // Iterate through stored evaluations for the employee
        for (const taskId in employeeEvals) {
            const evaluation = employeeEvals[taskId];
             if (evaluation.timestamp && typeof evaluation.timestamp === 'string') {
                 const evalDate = parse(evaluation.timestamp, "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", new Date());

                 // Check if the evaluation date falls within the target month
                 if (isValid(evalDate) && evalDate >= monthStart && evalDate <= monthEnd) {
                     evaluationsForMonth[taskId] = {
                         score: evaluation.score,
                         justification: evaluation.justification,
                         timestamp: evaluation.timestamp, // Include timestamp
                     };
                 }
            } else {
                console.warn(`Missing or invalid timestamp for task ${taskId} of employee ${employeeId}`);
            }
        }
     } catch (e) {
         console.error(`Error processing evaluations for ${employeeId} in ${yearMonth}:`, e);
     }

     return evaluationsForMonth;
}

/**
 * Asynchronously retrieves all evaluations for a specific employee across all time.
 * Useful for calculating overall stats or history.
 *
 * @param employeeId The ID of the employee.
 * @returns A promise resolving to a record of taskId to EvaluationScore[].
 */
export async function getAllEvaluationsForEmployee(employeeId: string): Promise<Record<string, EvaluationScore[]>> {
     console.log(`Getting all evaluations (mock) for employee ${employeeId}`);
     await new Promise(resolve => setTimeout(resolve, 200));

     const employeeEvals = mockEvaluationsData[employeeId] || {};
     const allEvaluations: Record<string, EvaluationScore[]> = {};

     for (const taskId in employeeEvals) {
         if (!allEvaluations[taskId]) {
             allEvaluations[taskId] = [];
         }
         // Include timestamp if needed for historical view
         allEvaluations[taskId].push({
             score: employeeEvals[taskId].score,
             justification: employeeEvals[taskId].justification,
             timestamp: employeeEvals[taskId].timestamp // Include timestamp
         });
     }

     // Optionally sort evaluations within each task by timestamp descending
     for (const taskId in allEvaluations) {
         allEvaluations[taskId].sort((a, b) => {
             if (!a.timestamp || !b.timestamp) return 0;
             return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
         });
     }

     return allEvaluations;
}
