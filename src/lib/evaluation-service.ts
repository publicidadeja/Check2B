
// src/lib/evaluation-service.ts
import { getDb } from './firebase';
import type { Evaluation } from '@/types/evaluation';
import type { Task } from '@/types/task';
import type { UserProfile } from '@/types/user';
import {
  collection,
  getDocs,
  doc,
  setDoc,
  query,
  where,
  Timestamp,
  orderBy,
  writeBatch
} from 'firebase/firestore';
import { format, parseISO } from 'date-fns';
import { getAllTasksForOrganization } from './task-service'; // Assuming this function exists

/**
 * Fetches tasks applicable to a specific employee on a given date for a specific organization.
 * This function now fetches all tasks for the organization once and then filters them.
 * @param organizationId The ID of the organization.
 * @param employee The UserProfile object of the employee.
 * @param date The date for which to fetch tasks.
 * @param allOrgTasks Pre-fetched list of all tasks for the organization.
 * @returns Promise resolving to an array of Task objects.
 */
export const getTasksForEmployeeOnDate = (
  employee: UserProfile,
  date: Date,
  allOrgTasks: Task[]
): Task[] => {
  if (!employee || !employee.isActive) return []; // Check if UserProfile has isActive, or adjust
  
  // Ensure employee has department and userRole for filtering
  const employeeDepartment = employee.department;
  const employeeUserRole = employee.userRole; // This is the cargo/função

  return allOrgTasks.filter(task => {
    let appliesByPeriodicity = false;
    const dayOfWeek = date.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
    const dateString = format(date, 'yyyy-MM-dd');

    switch (task.periodicity) {
      case 'daily':
        appliesByPeriodicity = true;
        break;
      case 'specific_days':
        // Example: Assuming specific_days stores an array of day numbers [0,1,2,3,4,5,6]
        // This part needs to be adapted based on how specific_days is actually stored in your Task type.
        // For now, a placeholder logic:
        if (Array.isArray(task.specificDays) && task.specificDays.includes(dayOfWeek.toString())) {
             appliesByPeriodicity = true;
        } else if (task.id === 't6' && dayOfWeek === 5) { // Mock logic for specific task t6 on Friday
            appliesByPeriodicity = true;
        }
        break;
      case 'specific_dates':
        // Example: Assuming specific_dates stores an array of "YYYY-MM-DD" strings
        if (Array.isArray(task.specificDates) && task.specificDates.includes(dateString)) {
            appliesByPeriodicity = true;
        }
        break;
      default:
        appliesByPeriodicity = false;
    }

    if (!appliesByPeriodicity) return false;

    // Check assignment
    if (!task.assignedTo) return true; // Global task
    if (task.assignedTo === 'department' && task.assignedEntityId === employeeDepartment) return true;
    if (task.assignedTo === 'role' && task.assignedEntityId === employeeUserRole) return true;
    if (task.assignedTo === 'individual' && task.assignedEntityId === employee.uid) return true;

    return false;
  });
};

/**
 * Fetches all evaluations for a specific organization on a given date string.
 * @param organizationId The ID of the organization.
 * @param dateString The date string in 'yyyy-MM-dd' format.
 * @returns Promise resolving to an array of Evaluation objects.
 */
export const getEvaluationsForDay = async (organizationId: string, dateString: string): Promise<Evaluation[]> => {
  const db = getDb();
  if (!db || !organizationId) {
    console.error('Firestore not initialized or organizationId missing. Cannot fetch evaluations.');
    return [];
  }

  const evaluationsPath = `organizations/${organizationId}/evaluations`;
  const evaluationsCollectionRef = collection(db, evaluationsPath);
  const q = query(evaluationsCollectionRef, where("evaluationDate", "==", dateString));

  try {
    const evaluationsSnapshot = await getDocs(q);
    return evaluationsSnapshot.docs.map(docSnapshot => {
      const data = docSnapshot.data();
      return {
        id: docSnapshot.id,
        ...data,
        organizationId,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : (data.createdAt ? new Date(data.createdAt) : undefined),
        updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : (data.updatedAt ? new Date(data.updatedAt) : undefined),
      } as Evaluation;
    });
  } catch (error) {
    console.error(`Error fetching evaluations for org ${organizationId} on date ${dateString}:`, error);
    throw error;
  }
};

interface TaskEvaluationStateForSave {
    taskId: string;
    score?: 0 | 10;
    justification?: string;
    evidenceUrl?: string;
}
/**
 * Saves or updates evaluations for a specific employee on a given date.
 * Uses batch writes for efficiency.
 * @param organizationId The ID of the organization.
 * @param evaluatorId The ID of the admin performing the evaluation.
 * @param employeeId The ID of the employee being evaluated.
 * @param dateString The date string of the evaluation ('yyyy-MM-dd').
 * @param taskEvaluations An array of task evaluation states to save.
 * @returns Promise resolving on successful save.
 */
export const saveEmployeeEvaluations = async (
  organizationId: string,
  evaluatorId: string,
  employeeId: string,
  dateString: string,
  taskEvaluations: TaskEvaluationStateForSave[]
): Promise<void> => {
  const db = getDb();
  if (!db || !organizationId) {
    throw new Error('Firestore not initialized or organizationId missing. Cannot save evaluations.');
  }
  
  const batch = writeBatch(db);
  const evaluationsPath = `organizations/${organizationId}/evaluations`;

  taskEvaluations.forEach(taskEval => {
    if (taskEval.score === undefined) return; // Skip tasks not scored

    const evaluationId = `${employeeId}-${taskEval.taskId}-${dateString}`;
    const evalDocRef = doc(db, evaluationsPath, evaluationId);

    const evaluationData: Partial<Evaluation> = {
      employeeId: employeeId,
      taskId: taskEval.taskId,
      evaluationDate: dateString,
      score: taskEval.score,
      justification: taskEval.justification || undefined,
      evidenceUrl: taskEval.evidenceUrl || undefined,
      evaluatorId: evaluatorId,
      organizationId: organizationId,
      isDraft: false, // Assuming these are final evaluations
      updatedAt: new Date(), // Will be converted to Timestamp by Firestore
    };

    // Check if document exists to set createdAt only once
    // For simplicity in batch, we can use set with merge and handle createdAt logic if needed via serverTimestamp() on create
    // However, to set createdAt only on creation with set(merge:true), it's tricky.
    // A common pattern is to fetch first, or use serverTimestamp and update.
    // For now, we'll rely on a more complex update logic if needed or assume new docs get createdAt.
    // A simpler approach: use a server timestamp for both and differentiate via logic if needed.
    // For this implementation, we'll assume `set` with `merge: true` and manage createdAt on first write via client logic if necessary.
    // Or, more robustly, use a transaction or a Cloud Function trigger for createdAt.
    // Simplified: always set/update updatedAt. createdAt if new.

    // For an upsert behavior where createdAt is only set once:
    // This would typically be done by fetching the doc first, or using a transaction,
    // which is more complex with batch writes without reading.
    // A common workaround is to always set updatedAt, and if a separate 'create' op, set createdAt.
    // Here, we'll just ensure updatedAt is always fresh.
    
    // Firestore automatically converts JS Date to Timestamp on write
    batch.set(evalDocRef, { ...evaluationData, createdAt: evaluationData.createdAt || new Date() }, { merge: true });
  });

  try {
    await batch.commit();
    console.log(`[EvaluationService] Batch evaluations saved for employee ${employeeId} on ${dateString}`);
  } catch (error) {
    console.error(`[EvaluationService] Error saving batch evaluations for employee ${employeeId}:`, error);
    throw error;
  }
};
