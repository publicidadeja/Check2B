
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
    orderBy,
    writeBatch, // Import writeBatch for atomic operations
    getDoc // Import getDoc to check existence if needed
} from 'firebase/firestore';
import { format, parse, startOfMonth, endOfMonth, isValid, startOfDay, endOfDay, parseISO } from 'date-fns'; // Import date-fns functions
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
  // Store employeeId within the task document for easier querying with collectionGroup
  employeeId: string;
  taskId: string; // Keep taskId for reference within the document data
  evaluationDate: string; // Store YYYY-MM-DD date for potential filtering
}

// Collection structure: /evaluations/{YYYY-MM-DD}/employees/{employeeId}/tasks/{taskId} -> EvaluationScore
// OR consider storing employeeId within the task document itself for simpler collectionGroup queries:
// /evaluations/{YYYY-MM-DD}/tasks/{taskId} -> EvaluationScore (with employeeId field)
// Let's use the second structure for now for easier querying by employee/month.

/**
 * Submits a batch of evaluations for a specific employee on a specific date.
 *
 * @param employeeId The ID of the employee being evaluated.
 * @param evaluationDate The date of the evaluation (YYYY-MM-DD string).
 * @param evaluationsData An array of evaluation objects { taskId: string, score: 0 | 10, justification: string }.
 * @returns A promise that resolves when the submission is complete.
 * @throws Error if validation fails for any evaluation.
 */
export async function submitDailyEvaluations(
  employeeId: string,
  evaluationDate: string, // e.g., '2024-08-15'
  evaluationsData: Array<{ taskId: string; score: 0 | 10 | null; justification: string }>
): Promise<void> {
  console.log(`Submitting daily evaluations (Firestore Batch) for employee ${employeeId}, date ${evaluationDate}`);

  // --- Basic Validation ---
  if (!isValid(parse(evaluationDate, 'yyyy-MM-dd', new Date()))) {
       throw new Error("Formato de data inválido. Use AAAA-MM-DD.");
  }
  if (!evaluationsData || evaluationsData.length === 0) {
      throw new Error("Nenhuma avaliação fornecida para submissão.");
  }

  // Validate each evaluation entry
  for (const ev of evaluationsData) {
      if (ev.score === null || ev.score === undefined) {
          throw new Error(`Score inválido para a tarefa ${ev.taskId}. A avaliação deve estar completa.`);
      }
      if (ev.score === 0 && !ev.justification?.trim()) {
          throw new Error(`Justificativa é obrigatória para nota 0 na tarefa ${ev.taskId}.`);
      }
      if (ev.score !== 0 && ev.score !== 10) {
          throw new Error(`Score deve ser 0 ou 10 para a tarefa ${ev.taskId}.`);
      }
  }

  try {
      const batch = writeBatch(db);
      const serverTimestamp = Timestamp.now(); // Use the same timestamp for all entries in the batch

      evaluationsData.forEach(ev => {
          // Document path: /evaluations/{evaluationDate}/tasks/{taskId}_{employeeId} -> unique doc per task/employee/day
          // OR /employees/{employeeId}/evaluations/{evaluationDate}/tasks/{taskId} -> might be better for employee history
          // Let's try: /employees/{employeeId}/dailyEvaluations/{evaluationDate}_{taskId}
           const docRef = doc(db, `employees/${employeeId}/dailyEvaluations/${evaluationDate}_${ev.taskId}`);

          const dataToSave: Omit<EvaluationScore, 'id'> = { // Omit 'id' as it's the doc ID
              score: ev.score as 0 | 10, // Cast is safe due to prior validation
              justification: ev.score === 10 ? '' : (ev.justification || '').trim(),
              timestamp: serverTimestamp,
              employeeId: employeeId,
              taskId: ev.taskId,
              evaluationDate: evaluationDate, // Store the date string
          };
          batch.set(docRef, dataToSave); // Use set to overwrite or create
      });

      await batch.commit();
      console.log("Daily evaluations batch committed successfully.");

      // Invalidate ranking cache for the relevant month after submission
      const yearMonth = format(parse(evaluationDate, 'yyyy-MM-dd', new Date()), 'yyyy-MM');
      await invalidateRankingCache(yearMonth);

  } catch (error: any) {
    console.error("Error submitting daily evaluations batch to Firestore:", error);
    throw new Error("Falha ao enviar avaliações diárias.");
  }
}


/**
 * Asynchronously retrieves evaluations for a specific employee within a given date range (usually a month).
 * Uses the new structure: /employees/{employeeId}/dailyEvaluations/{evaluationDate}_{taskId}
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
        const evaluationsCollectionRef = collection(db, `employees/${employeeId}/dailyEvaluations`);

        // Firestore timestamps for the start and end of the day range
        const startTimestamp = Timestamp.fromDate(startOfDay(startDate));
        const endTimestamp = Timestamp.fromDate(endOfDay(endDate));

        // Query based on the timestamp field within the documents
        const q = query(
            evaluationsCollectionRef,
            where('timestamp', '>=', startTimestamp),
            where('timestamp', '<=', endTimestamp),
            orderBy('timestamp', 'desc') // Order by time descending
        );

        const snapshot = await getDocs(q);

        snapshot.forEach((doc) => {
            const data = doc.data() as EvaluationScore; // Cast to EvaluationScore
            const taskId = data.taskId; // Get taskId from the document data

            if (!evaluationsResult[taskId]) {
                evaluationsResult[taskId] = [];
            }
             // Convert Firestore Timestamp to JS Date if needed by frontend, otherwise keep as Timestamp
            evaluationsResult[taskId].push({
                score: data.score,
                justification: data.justification,
                timestamp: data.timestamp, // Keep Firestore Timestamp
                employeeId: data.employeeId,
                taskId: data.taskId,
                evaluationDate: data.evaluationDate,
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
 * Uses the new structure: /employees/{employeeId}/dailyEvaluations/{evaluationDate}_{taskId}
 *
 * @param employeeId The ID of the employee.
 * @returns A promise resolving to a record of taskId to EvaluationScore[].
 */
export async function getAllEvaluationsForEmployee(employeeId: string): Promise<Record<string, EvaluationScore[]>> {
     console.warn(`Getting ALL evaluations (Firestore) for employee ${employeeId}. This might be inefficient.`);
      try {
        const evaluationsResult: Record<string, EvaluationScore[]> = {};
        const evaluationsCollectionRef = collection(db, `employees/${employeeId}/dailyEvaluations`);

        // Querying across all time for a specific employee
        const q = query(
            evaluationsCollectionRef,
            orderBy('timestamp', 'desc')
        );

        const snapshot = await getDocs(q);

        snapshot.forEach((doc) => {
            const data = doc.data() as EvaluationScore;
            const taskId = data.taskId;

            if (!evaluationsResult[taskId]) {
                evaluationsResult[taskId] = [];
            }
            evaluationsResult[taskId].push({
                 score: data.score,
                 justification: data.justification,
                 timestamp: data.timestamp,
                 employeeId: data.employeeId,
                 taskId: data.taskId,
                 evaluationDate: data.evaluationDate,
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
 * Uses the new structure: /employees/{employeeId}/dailyEvaluations/{evaluationDate}_{taskId}
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
        const targetMonthDate = parse(yearMonth + '-01', 'yyyy-MM-dd', new Date()); // Parse start of month
        if (!isValid(targetMonthDate)) {
            console.error(`Invalid yearMonth format provided: ${yearMonth}`);
            return results; // Return empty if date is invalid
        }
        const monthStartTimestamp = Timestamp.fromDate(startOfMonth(targetMonthDate));
        const monthEndTimestamp = Timestamp.fromDate(endOfMonth(targetMonthDate));

        // Query each employee's subcollection individually
        for (const empId of employeeIds) {
            const evaluationsCollectionRef = collection(db, `employees/${empId}/dailyEvaluations`);
            const q = query(
                evaluationsCollectionRef,
                where('timestamp', '>=', monthStartTimestamp),
                where('timestamp', '<=', monthEndTimestamp)
                // No need to order here if just aggregating scores for the month
            );

            const snapshot = await getDocs(q);

            if (!snapshot.empty) {
                if (!results[empId]) {
                    results[empId] = {};
                }

                snapshot.forEach((doc) => {
                    const data = doc.data() as EvaluationScore;
                    const taskId = data.taskId;

                    if (!results[empId][taskId]) {
                        results[empId][taskId] = [];
                    }
                    results[empId][taskId].push({
                        score: data.score,
                        justification: data.justification,
                        timestamp: data.timestamp,
                        employeeId: data.employeeId,
                        taskId: data.taskId,
                        evaluationDate: data.evaluationDate,
                    });
                    // Sort individual task evaluations by timestamp if needed (optional, depends on use case)
                    results[empId][taskId].sort((a, b) => b.timestamp.toMillis() - a.timestamp.toMillis());
                });
            }
        }

        return results;

    } catch (error) {
        console.error("Error fetching evaluations for multiple employees:", error);
        throw new Error("Falha ao buscar avaliações para o ranking.");
    }
}

    