
'use server';

import { db } from '@/lib/firebase';
import {
    collection,
    doc,
    setDoc, // Using setDoc to overwrite/create daily evaluations easily
    getDocs,
    query,
    where,
    Timestamp,
    DocumentData,
    QueryDocumentSnapshot,
    Query,
    collectionGroup,
    orderBy // Import orderBy
} from 'firebase/firestore';
import { format, parse, startOfMonth, endOfMonth, isValid, startOfDay, endOfDay } from 'date-fns'; // Import date-fns functions
import { invalidateRankingCache } from './ranking'; // Import cache invalidation function

/**
 * Represents an evaluation score and its justification for a specific day.
 */
export interface EvaluationScore {
  /** The evaluation score, which is either 0 or 10 */
  score: 0 | 10;
  /** Justification (required if score is 0) */
  justification: string;
  /** Timestamp for when the evaluation was recorded */
  timestamp: Timestamp; // Use Firestore Timestamp
}

// Collection structure: /evaluations/{YYYY-MM-DD}/employees/{employeeId}/tasks/{taskId} -> EvaluationScore

/**
 * Asynchronously submits or updates an evaluation score for a specific task, employee, and date.
 *
 * @param taskId The ID of the task being evaluated.
 * @param employeeId The ID of the employee being evaluated.
 * @param evaluationDate The date of the evaluation (YYYY-MM-DD string).
 * @param scoreData The evaluation score object { score: 0 | 10, justification: string }.
 * @returns A promise that resolves when the submission is complete.
 * @throws Error if validation fails.
 */
export async function submitEvaluation(
  taskId: string,
  employeeId: string,
  evaluationDate: string, // e.g., '2024-08-15'
  scoreData: Omit<EvaluationScore, 'timestamp'> // Timestamp will be added server-side
): Promise<void> {
  console.log(`Submitting evaluation (Firestore) for task ${taskId}, employee ${employeeId}, date ${evaluationDate}:`, scoreData);

  // --- Validation ---
  if (!isValid(parse(evaluationDate, 'yyyy-MM-dd', new Date()))) {
       throw new Error("Formato de data inválido. Use AAAA-MM-DD.");
  }
  if (scoreData.score === null || scoreData.score === undefined) {
      throw new Error(`Score inválido para a tarefa ${taskId}.`);
  }
  if (scoreData.score === 0 && !scoreData.justification?.trim()) {
    throw new Error(`Justificativa é obrigatória para nota 0 na tarefa ${taskId}.`);
  }
  if (scoreData.score !== 0 && scoreData.score !== 10) {
      throw new Error(`Score deve ser 0 ou 10 para a tarefa ${taskId}.`);
  }

  try {
      const evalDocRef = doc(db, `evaluations/${evaluationDate}/employees/${employeeId}/tasks/${taskId}`);

      const dataToSave: EvaluationScore = {
          score: scoreData.score,
          // Ensure justification is empty if score is 10
          justification: scoreData.score === 10 ? '' : scoreData.justification.trim(),
          timestamp: Timestamp.now(), // Use server timestamp
      };

      // Use setDoc with merge: true to create or update the evaluation for that specific day/employee/task
      await setDoc(evalDocRef, dataToSave, { merge: true });

      console.log("Evaluation stored successfully:", evalDocRef.path);

      // Invalidate ranking cache for the relevant month after submission
      const yearMonth = format(parse(evaluationDate, 'yyyy-MM-dd', new Date()), 'yyyy-MM');
      await invalidateRankingCache(yearMonth);

  } catch (error: any) {
    console.error("Error submitting evaluation to Firestore:", error);
    throw new Error("Falha ao enviar avaliação.");
  }
}


/**
 * Asynchronously retrieves evaluations for a specific employee within a given date range (usually a month).
 *
 * @param employeeId The ID of the employee.
 * @param startDate The start date of the range.
 * @param endDate The end date of the range.
 * @returns A promise resolving to a record of taskId to EvaluationScore[] for the specified period.
 */
export async function getEvaluationsForEmployeeByPeriod(employeeId: string, startDate: Date, endDate: Date): Promise<Record<string, EvaluationScore[]>> {
     console.log(`Getting evaluations (Firestore) for employee ${employeeId} from ${format(startDate, 'yyyy-MM-dd')} to ${format(endDate, 'yyyy-MM-dd')}`);
     try {
        const evaluationsResult: Record<string, EvaluationScore[]> = {};

        // Query the 'tasks' subcollection across all date documents within the range
        // This uses a collection group query
        const tasksGroupRef = collectionGroup(db, 'tasks');
        const q = query(
            tasksGroupRef,
            where('employeeId', '==', employeeId), // Assuming employeeId is stored in the task doc for easier querying
            where('timestamp', '>=', Timestamp.fromDate(startOfDay(startDate))),
            where('timestamp', '<=', Timestamp.fromDate(endOfDay(endDate))),
            orderBy('timestamp', 'desc') // Order by time descending
        );

        const snapshot = await getDocs(q);

        snapshot.forEach((doc) => {
            const data = doc.data() as EvaluationScore; // Cast to EvaluationScore
            const taskId = doc.id; // The document ID is the taskId

            if (!evaluationsResult[taskId]) {
                evaluationsResult[taskId] = [];
            }
             // Convert Firestore Timestamp to JS Date if needed by frontend, otherwise keep as Timestamp
            evaluationsResult[taskId].push({
                score: data.score,
                justification: data.justification,
                timestamp: data.timestamp, // Keep Firestore Timestamp
            });
        });

        return evaluationsResult;

     } catch (error) {
         console.error(`Error fetching evaluations for ${employeeId}:`, error);
         throw new Error("Falha ao buscar avaliações do colaborador.");
     }
}

/**
 * Asynchronously retrieves *all* evaluations for a specific employee across all time.
 * Warning: Can be inefficient for employees with long history. Use date range queries primarily.
 *
 * @param employeeId The ID of the employee.
 * @returns A promise resolving to a record of taskId to EvaluationScore[].
 */
export async function getAllEvaluationsForEmployee(employeeId: string): Promise<Record<string, EvaluationScore[]>> {
     console.warn(`Getting ALL evaluations (Firestore) for employee ${employeeId}. This might be inefficient.`);
      try {
        const evaluationsResult: Record<string, EvaluationScore[]> = {};
        const tasksGroupRef = collectionGroup(db, 'tasks');
        // Querying across all time for a specific employee
        const q = query(
            tasksGroupRef,
            where('employeeId', '==', employeeId), // Requires employeeId in the task doc
            orderBy('timestamp', 'desc')
        );

        const snapshot = await getDocs(q);

        snapshot.forEach((doc) => {
            const data = doc.data() as EvaluationScore;
            const taskId = doc.id;

            if (!evaluationsResult[taskId]) {
                evaluationsResult[taskId] = [];
            }
            evaluationsResult[taskId].push({
                 score: data.score,
                 justification: data.justification,
                 timestamp: data.timestamp,
            });
        });
        return evaluationsResult;
     } catch (error) {
          console.error(`Error fetching all evaluations for ${employeeId}:`, error);
          throw new Error("Falha ao buscar histórico completo de avaliações.");
     }
}


/**
 * Helper function to get evaluations for multiple employees within a specific month.
 * Used by the ranking calculation.
 *
 * @param employeeIds Array of employee IDs.
 * @param yearMonth The period string 'YYYY-MM'.
 * @returns A promise resolving to a map of employeeId -> { taskId: EvaluationScore[] }.
 */
export async function getEvaluationsForMultipleEmployeesByMonth(employeeIds: string[], yearMonth: string): Promise<Record<string, Record<string, EvaluationScore[]>>> {
    console.log(`Getting evaluations (Firestore) for multiple employees in month ${yearMonth}`);

    const results: Record<string, Record<string, EvaluationScore[]>> = {};
    if (employeeIds.length === 0) return results;

    try {
        const targetMonthDate = parse(yearMonth, 'yyyy-MM', new Date());
        if (!isValid(targetMonthDate)) {
            console.error(`Invalid yearMonth format provided: ${yearMonth}`);
            return results; // Return empty if date is invalid
        }
        const monthStart = Timestamp.fromDate(startOfMonth(targetMonthDate));
        const monthEnd = Timestamp.fromDate(endOfMonth(targetMonthDate));

        // Use collectionGroup query - might need index configuration in Firestore
        const tasksGroupRef = collectionGroup(db, 'tasks');

        // Firestore IN queries are limited to 30 items per query in v9.
        // Chunk the employeeIds array if it's larger than 30.
        const MAX_IN_QUERIES = 30;
        const employeeIdChunks: string[][] = [];
        for (let i = 0; i < employeeIds.length; i += MAX_IN_QUERIES) {
            employeeIdChunks.push(employeeIds.slice(i, i + MAX_IN_QUERIES));
        }

        // Execute queries for each chunk
        for (const chunk of employeeIdChunks) {
            const q = query(
                tasksGroupRef,
                where('employeeId', 'in', chunk), // Assumes employeeId is stored in the task doc
                where('timestamp', '>=', monthStart),
                where('timestamp', '<=', monthEnd)
            );

            const snapshot = await getDocs(q);

            snapshot.forEach((doc) => {
                const data = doc.data() as EvaluationScore & { employeeId: string }; // Expect employeeId here
                const taskId = doc.id;
                const empId = data.employeeId; // Get employeeId from the document itself

                if (!results[empId]) {
                    results[empId] = {};
                }
                if (!results[empId][taskId]) {
                    results[empId][taskId] = [];
                }
                results[empId][taskId].push({
                    score: data.score,
                    justification: data.justification,
                    timestamp: data.timestamp,
                });
                 // Sort individual task evaluations by timestamp if needed (optional)
                 results[empId][taskId].sort((a, b) => b.timestamp.toMillis() - a.timestamp.toMillis());
            });
        }

        return results;

    } catch (error) {
        console.error("Error fetching evaluations for multiple employees:", error);
        throw new Error("Falha ao buscar avaliações para o ranking.");
    }
}
