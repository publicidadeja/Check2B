
'use server';

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
}

// Mock storage for evaluations (replace with actual database)
// Key: employeeId, Value: { taskId: EvaluationScore }
const mockEvaluations: Record<string, Record<string, EvaluationScore & { timestamp: string }>> = {};

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
  scoreData: EvaluationScore,
): Promise<void> {
  console.log(`Submitting evaluation (mock) for task ${taskId}, employee ${employeeId}:`, scoreData);
  await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200)); // Simulate variable delay

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
  if (!mockEvaluations[employeeId]) {
    mockEvaluations[employeeId] = {};
  }

  // Store the evaluation with a timestamp
  mockEvaluations[employeeId][taskId] = {
      ...scoreData,
      // Ensure justification is empty if score is 10, even if passed otherwise
      justification: scoreData.score === 10 ? '' : scoreData.justification.trim(),
      timestamp: new Date().toISOString(),
  };

  console.log("Mock evaluation stored:", mockEvaluations[employeeId][taskId]);
  // No return value needed for success
}

/**
 * Asynchronously retrieves evaluations for a specific employee on a given date (mock).
 * In a real scenario, you'd query by employeeId and date range.
 *
 * @param employeeId The ID of the employee.
 * @param date The date for which to retrieve evaluations (e.g., 'YYYY-MM-DD').
 * @returns A promise resolving to a record of taskId to EvaluationScore.
 */
export async function getEvaluationsForEmployeeByDate(employeeId: string, date: string): Promise<Record<string, EvaluationScore>> {
     console.log(`Getting evaluations (mock) for employee ${employeeId} on date ${date}`);
     await new Promise(resolve => setTimeout(resolve, 250));

     const employeeEvals = mockEvaluations[employeeId] || {};
     const evaluationsForDate: Record<string, EvaluationScore> = {};

     // Filter mock evaluations by timestamp matching the date (ignoring time)
     const targetDate = date.split('T')[0]; // Ensure only date part
     for (const taskId in employeeEvals) {
         const evaluation = employeeEvals[taskId];
         if (evaluation.timestamp.startsWith(targetDate)) {
             evaluationsForDate[taskId] = {
                 score: evaluation.score,
                 justification: evaluation.justification,
             };
         }
     }

     return evaluationsForDate;
}
