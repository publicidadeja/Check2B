/**
 * Represents an evaluation score.
 */
export interface EvaluationScore {
  /**
   * The evaluation score, which is either 0 or 10.
   */
  score: 0 | 10;
  /**
   * The justification for the score.
   */
  justification: string;
}

/**
 * Asynchronously submits an evaluation score for a task.
 *
 * @param taskId The ID of the task being evaluated.
 * @param employeeId The ID of the employee being evaluated.
 * @param score The evaluation score.
 * @param justification The justification for the score.
 */
export async function submitEvaluation(
  taskId: string,
  employeeId: string,
  score: EvaluationScore,
  justification: string
): Promise<void> {
  // TODO: Implement this by calling an API.
  return;
}
