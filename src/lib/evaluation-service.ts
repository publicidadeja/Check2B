
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
  writeBatch,
  getCountFromServer, // Import getCountFromServer
} from 'firebase/firestore';
import { format, parseISO, startOfMonth, endOfMonth, subMonths } from 'date-fns'; // Added subMonths
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
  if (!employee || employee.status !== 'active') return []; // Check if UserProfile has isActive, or adjust
  
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

/**
 * Fetches all evaluations for a specific organization within a given date range.
 * @param organizationId The ID of the organization.
 * @param startDateString The start date string in 'yyyy-MM-dd' format.
 * @param endDateString The end date string in 'yyyy-MM-dd' format.
 * @returns Promise resolving to an array of Evaluation objects.
 */
export const getEvaluationsForOrganizationInPeriod = async (organizationId: string, startDateString: string, endDateString: string): Promise<Evaluation[]> => {
  const db = getDb();
  if (!db || !organizationId) {
    console.error('[EvaluationService] Firestore not initialized or organizationId missing.');
    return [];
  }
  const evaluationsPath = `organizations/${organizationId}/evaluations`;
  const evaluationsCollectionRef = collection(db, evaluationsPath);
  const q = query(
    evaluationsCollectionRef,
    where("evaluationDate", ">=", startDateString),
    where("evaluationDate", "<=", endDateString),
    orderBy("evaluationDate", "asc") // Optional: order by date
  );

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
    console.error(`Error fetching evaluations for org ${organizationId} in period ${startDateString} - ${endDateString}:`, error);
    // Firestore might require an index for this query. The error message will usually include a link to create it.
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

/**
 * Counts distinct employees who have evaluations on a specific date.
 * @param organizationId The ID of the organization.
 * @param dateString The date string in 'yyyy-MM-dd' format.
 * @returns Promise resolving to the count of distinct evaluated employees.
 */
export const countDistinctEvaluatedEmployeesForDate = async (organizationId: string, dateString: string): Promise<number> => {
  const evaluations = await getEvaluationsForDay(organizationId, dateString);
  const distinctEmployeeIds = new Set(evaluations.map(ev => ev.employeeId));
  return distinctEmployeeIds.size;
};

/**
 * Counts users who have more than a specified number of zero-score evaluations in a given period.
 * @param organizationId The ID of the organization.
 * @param startDateString The start date string 'yyyy-MM-dd'.
 * @param endDateString The end date string 'yyyy-MM-dd'.
 * @param zeroThreshold The number of zeros to consider as "excessive".
 * @returns Promise resolving to the count of users with excessive zeros.
 */
export const countUsersWithExcessiveZeros = async (
  organizationId: string,
  startDateString: string,
  endDateString: string,
  zeroThreshold: number
): Promise<number> => {
  const evaluationsInPeriod = await getEvaluationsForOrganizationInPeriod(organizationId, startDateString, endDateString);
  
  const zerosByEmployee: Record<string, number> = {};
  evaluationsInPeriod.forEach(ev => {
    if (ev.score === 0) {
      zerosByEmployee[ev.employeeId] = (zerosByEmployee[ev.employeeId] || 0) + 1;
    }
  });

  let usersWithExcessiveZeros = 0;
  for (const employeeId in zerosByEmployee) {
    if (zerosByEmployee[employeeId] > zeroThreshold) {
      usersWithExcessiveZeros++;
    }
  }
  return usersWithExcessiveZeros;
};

/**
 * Fetches aggregated monthly evaluation statistics for the dashboard chart.
 * @param organizationId The ID of the organization.
 * @param numberOfMonths The number of past months to fetch data for (including current).
 * @returns Promise resolving to an array of objects like { month: "MMM", total: count }.
 */
export const getMonthlyEvaluationStats = async (
  organizationId: string,
  numberOfMonths: number
): Promise<{ month: string; total: number }[]> => {
  const db = getDb();
  if (!db || !organizationId) {
    console.error('Firestore not initialized or organizationId missing for getMonthlyEvaluationStats.');
    return [];
  }
  const evaluationsPath = `organizations/${organizationId}/evaluations`;
  const evaluationsCollectionRef = collection(db, evaluationsPath);
  const stats: { month: string; total: number }[] = [];
  const today = new Date();

  for (let i = 0; i < numberOfMonths; i++) {
    const targetMonthDate = subMonths(today, i);
    const monthName = format(targetMonthDate, 'MMM', { locale: require('date-fns/locale/pt-BR').default }); // For pt-BR month names
    const firstDayOfMonth = format(startOfMonth(targetMonthDate), 'yyyy-MM-dd');
    const lastDayOfMonth = format(endOfMonth(targetMonthDate), 'yyyy-MM-dd');

    const q = query(
      evaluationsCollectionRef,
      where("evaluationDate", ">=", firstDayOfMonth),
      where("evaluationDate", "<=", lastDayOfMonth)
    );
    
    try {
      // Here we just count all evaluation documents for the month.
      // If you need to count *distinct completed evaluations per employee day*, the logic would be more complex.
      const snapshot = await getCountFromServer(q);
      stats.push({ month: monthName, total: snapshot.data().count });
    } catch (error) {
      console.error(`Error fetching evaluation stats for month ${monthName} of org ${organizationId}:`, error);
      stats.push({ month: monthName, total: 0 }); // Add zero if error
    }
  }
  return stats.reverse(); // Reverse to have oldest month first for chart
};
