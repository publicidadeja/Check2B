
// src/lib/evaluation-service.ts
import { getDb, getFirebaseApp } from './firebase'; // Added getFirebaseApp
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
  getCountFromServer,
  collectionGroup, // Import collectionGroup
} from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage"; // Added Storage imports
import { format, parseISO, startOfMonth, endOfMonth, subMonths, subHours } from 'date-fns'; // Added subHours
import { getAllTasksForOrganization } from './task-service';

/**
 * Uploads an evidence file for an evaluation to Firebase Storage.
 * @param organizationId The ID of the organization.
 * @param evaluationId A unique identifier for the evaluation (e.g., employeeId-taskId-dateString).
 * @param file The file to upload.
 * @returns Promise resolving to the download URL of the uploaded file.
 */
export const uploadEvaluationEvidence = async (
  organizationId: string,
  evaluationId: string, // This should be a stable identifier for the evaluation event
  file: File
): Promise<string> => {
  const app = getFirebaseApp();
  if (!app) {
    throw new Error('Firebase App not initialized. Cannot upload evidence.');
  }
  const storage = getStorage(app);
  if (!storage) {
    throw new Error('Firebase Storage not initialized. Cannot upload evidence.');
  }

  // Sanitize filename: replace non-alphanumeric (except dots) with underscores
  const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
  const filePath = `organizations/${organizationId}/evaluations_evidence/${evaluationId}/${sanitizedFileName}`;
  const fileRef = ref(storage, filePath);

  try {
    const snapshot = await uploadBytes(fileRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    console.log(`[EvaluationService] Evidence file uploaded to ${filePath}, URL: ${downloadURL}`);
    return downloadURL;
  } catch (error) {
    console.error(`[EvaluationService] Error uploading evidence file for evaluation ${evaluationId}:`, error);
    throw error;
  }
};


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
  if (!employee || employee.status !== 'active') return [];

  const employeeDepartment = employee.department;
  const employeeUserRole = employee.userRole;

  return allOrgTasks.filter(task => {
    let appliesByPeriodicity = false;
    const dayOfWeek = date.getDay();
    const dateString = format(date, 'yyyy-MM-dd');

    switch (task.periodicity) {
      case 'daily':
        appliesByPeriodicity = true;
        break;
      case 'specific_days':
        if (Array.isArray(task.specificDays) && task.specificDays.includes(dayOfWeek.toString())) {
             appliesByPeriodicity = true;
        } else if (task.id === 't6' && dayOfWeek === 5) { // Example specific logic from mock
            appliesByPeriodicity = true;
        }
        break;
      case 'specific_dates':
        if (Array.isArray(task.specificDates) && task.specificDates.includes(dateString)) {
            appliesByPeriodicity = true;
        }
        break;
      default:
        appliesByPeriodicity = false;
    }

    if (!appliesByPeriodicity) return false;

    if (!task.assignedTo) return true;
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
    orderBy("evaluationDate", "asc")
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
    throw error;
  }
};


interface TaskEvaluationStateForSave {
    taskId: string;
    score?: 0 | 10;
    justification?: string;
    evidenceFile?: File | null; // Keep File type here
    evaluationId?: string; // For existing evaluations
}
/**
 * Saves or updates evaluations for a specific employee on a given date.
 * Uses batch writes for efficiency. Handles evidence file upload.
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

  for (const taskEval of taskEvaluations) {
    if (taskEval.score === undefined) continue; // Skip tasks not scored

    const evaluationIdForStorage = taskEval.evaluationId || `${employeeId}-${taskEval.taskId}-${dateString}-new-${Date.now()}`;
    const firestoreDocId = `${employeeId}-${taskEval.taskId}-${dateString}`;
    const evalDocRef = doc(db, evaluationsPath, firestoreDocId);

    let evidenceUrlToSave: string | undefined = undefined;

    if (taskEval.evidenceFile) {
      try {
        evidenceUrlToSave = await uploadEvaluationEvidence(
          organizationId,
          evaluationIdForStorage, 
          taskEval.evidenceFile
        );
      } catch (uploadError) {
        console.error(`[EvaluationService] Failed to upload evidence for task ${taskEval.taskId}, employee ${employeeId}. Skipping evidence for this task.`, uploadError);
      }
    }

    const evaluationData: Partial<Evaluation> = {
      employeeId: employeeId,
      taskId: taskEval.taskId,
      evaluationDate: dateString,
      score: taskEval.score,
      justification: taskEval.justification || undefined,
      evidenceUrl: evidenceUrlToSave, 
      evaluatorId: evaluatorId,
      organizationId: organizationId,
      isDraft: false, 
      updatedAt: new Date(), 
    };
    
    const existingEvalDoc = await getDoc(evalDocRef);
    if (!existingEvalDoc.exists()) {
        evaluationData.createdAt = new Date();
    }
    
    batch.set(evalDocRef, evaluationData, { merge: true });
  }

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
    const monthName = format(targetMonthDate, 'MMM', { locale: require('date-fns/locale/pt-BR').default });
    const firstDayOfMonth = format(startOfMonth(targetMonthDate), 'yyyy-MM-dd');
    const lastDayOfMonth = format(endOfMonth(targetMonthDate), 'yyyy-MM-dd');

    const q = query(
      evaluationsCollectionRef,
      where("evaluationDate", ">=", firstDayOfMonth),
      where("evaluationDate", "<=", lastDayOfMonth)
    );
    
    try {
      const snapshot = await getCountFromServer(q);
      stats.push({ month: monthName, total: snapshot.data().count });
    } catch (error) {
      console.error(`Error fetching evaluation stats for month ${monthName} of org ${organizationId}:`, error);
      stats.push({ month: monthName, total: 0 });
    }
  }
  return stats.reverse();
};

/**
 * Counts evaluations created or updated in the last N hours across all organizations.
 * Requires a collection group index on 'evaluations' by 'updatedAt'.
 * @param hoursAgo Number of hours in the past to check for activity.
 * @returns Promise resolving to the count of recent evaluations.
 */
export const countRecentEvaluations = async (hoursAgo: number): Promise<number> => {
    const db = getDb();
    if (!db) {
        console.error('Firestore not initialized. Cannot count recent evaluations.');
        return 0;
    }

    const thresholdDate = subHours(new Date(), hoursAgo);
    const thresholdTimestamp = Timestamp.fromDate(thresholdDate);

    const evaluationsGroupRef = collectionGroup(db, 'evaluations');
    const q = query(evaluationsGroupRef, where('updatedAt', '>=', thresholdTimestamp));

    try {
        const snapshot = await getCountFromServer(q);
        return snapshot.data().count;
    } catch (error) {
        console.error(`Error counting recent evaluations (last ${hoursAgo}h):`, error);
        // This error might indicate a missing index.
        // Log a more specific message for the developer if it's a permission or index issue.
        if ((error as any).code === 'failed-precondition') {
            console.warn("Firestore query for recent evaluations failed. This might be due to a missing composite index for the 'evaluations' collection group on 'updatedAt'. Please check your Firestore indexes.");
        }
        return 0; // Return 0 on error to prevent breaking the dashboard
    }
};
