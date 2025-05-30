
// src/lib/task-service.ts
import { getDb } from './firebase';
import type { Task } from '@/types/task';
import { collection, getDocs, query, where, doc, setDoc, deleteDoc, addDoc, orderBy, serverTimestamp, Timestamp } from 'firebase/firestore';
import type { Firestore, DocumentData, QuerySnapshot, Query } from 'firebase/firestore';

/**
 * Fetches all tasks for a specific organization from Firestore.
 * @param organizationId The ID of the organization.
 * @returns Promise resolving to an array of Task objects.
 */
export const getAllTasksForOrganization = async (organizationId: string): Promise<Task[]> => {
  const db = getDb();
  if (!db) {
    console.error('Firestore not initialized. Cannot fetch all tasks for organization.');
    return [];
  }
  console.log(`[TaskService] Fetching all tasks for org ID: ${organizationId}`);
  const tasksCollectionRef = collection(db, `organizations/${organizationId}/tasks`);
  const q = query(tasksCollectionRef, orderBy("title")); // Example: order by title

  try {
    const tasksSnapshot = await getDocs(q);
    console.log(`[TaskService] Found ${tasksSnapshot.docs.length} tasks for org ${organizationId}`);
    return tasksSnapshot.docs.map(docSnapshot => {
      const data = docSnapshot.data();
      return {
        id: docSnapshot.id,
        ...data,
        organizationId, // Ensure organizationId is part of the returned object
      } as Task;
    });
  } catch (error) {
    console.error(`[TaskService] Error fetching all tasks for org ${organizationId}:`, error);
    throw error;
  }
};


/**
 * Fetches tasks for a specific organization from Firestore.
 * @param organizationId The ID of the organization.
 * @returns Promise resolving to an array of Task objects.
 */
export const getTasksByOrganization = async (organizationId: string): Promise<Task[]> => {
  const db = getDb();
  if (!db) {
    console.error('Firestore not initialized. Cannot fetch tasks.');
    return [];
  }

  const tasksCollectionRef = collection(db, `organizations/${organizationId}/tasks`);
  const q = query(tasksCollectionRef, orderBy("title"));
  const tasksSnapshot = await getDocs(q);

  return tasksSnapshot.docs.map(docSnapshot => ({ // Renamed doc to docSnapshot
    id: docSnapshot.id,
    ...(docSnapshot.data() as Omit<Task, 'id' | 'organizationId'>),
    organizationId: organizationId
  })) as Task[];
};

/**
 * Saves or updates a task in Firestore for a specific organization.
 * @param organizationId The ID of the organization.
 * @param taskData The task data to save. Includes ID for updates.
 * @returns Promise resolving to the saved or updated Task object.
 */
export const saveTask = async (organizationId: string, taskData: Omit<Task, 'id' | 'organizationId'> | Task): Promise<Task> => {
  const db = getDb();
  if (!db) {
    throw new Error('Firestore not initialized. Cannot save task.');
  }
  
  const { organizationId: _orgId, ...dataToSaveInDoc } = taskData as Task; // Type assertion and destructure

  if (taskData.id) {
    // Update existing task
    const taskDocRef = doc(db, `organizations/${organizationId}/tasks`, taskData.id);
    await setDoc(taskDocRef, dataToSaveInDoc, { merge: true });
    return { ...taskData, organizationId } as Task;
  } else {
    // Create new task
    const tasksCollectionRef = collection(db, `organizations/${organizationId}/tasks`);
    const docRef = await addDoc(tasksCollectionRef, dataToSaveInDoc);
    return { id: docRef.id, ...dataToSaveInDoc, organizationId } as Task;
  }
};

/**
 * Deletes a task from Firestore for a specific organization.
 * @param organizationId The ID of the organization.
 * @param taskId The ID of the task to delete.
 * @returns Promise resolving on successful deletion.
 */
export const deleteTask = async (organizationId: string, taskId: string): Promise<void> => {
  const db = getDb();
  if (!db) {
    throw new Error('Firestore not initialized. Cannot delete task.');
  }
  const taskDocRef = doc(db, `organizations/${organizationId}/tasks`, taskId);
  await deleteDoc(taskDocRef);
};
