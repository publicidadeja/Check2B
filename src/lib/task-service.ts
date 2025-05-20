// src/lib/task-service.ts
import { getDb } from './firebase';
import type { Task } from '@/types/task';
import { collection, getDocs, query, where, doc, setDoc, deleteDoc, addDoc, orderBy } from 'firebase/firestore';
import type { Firestore, DocumentData, QuerySnapshot, Query } from 'firebase/firestore';

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
  // Optional: Add ordering, e.g., by title or creation date
  // const q = query(tasksCollectionRef, orderBy("title"));
  const tasksSnapshot = await getDocs(tasksCollectionRef);

  return tasksSnapshot.docs.map(doc => ({
    id: doc.id,
    ...(doc.data() as Omit<Task, 'id' | 'organizationId'>), // organizationId is part of the path
    organizationId: organizationId // Add organizationId back for consistency if needed in Task type
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

  const tasksCollectionRef = collection(db, `organizations/${organizationId}/tasks`);
  
  // Remove organizationId from data to save as it's part of the path
  const { organizationId: _, ...dataToSaveInDoc } = taskData;


  if ('id' in taskData && taskData.id) {
    // Update existing task
    const taskDocRef = doc(db, `organizations/${organizationId}/tasks`, taskData.id);
    await setDoc(taskDocRef, dataToSaveInDoc, { merge: true });
    return { ...taskData, organizationId } as Task; // Return with orgId
  } else {
    // Create new task
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
