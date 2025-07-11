
// src/lib/task-service.ts
import { getDb } from './firebase';
import type { Task } from '@/types/task';
import { 
  collection, 
  getDocs, 
  query, 
  doc, 
  setDoc, 
  deleteDoc, 
  addDoc, 
  orderBy, 
  serverTimestamp, 
  Timestamp,
  updateDoc,
  getDoc,
  getCountFromServer
} from 'firebase/firestore';

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
  // console.log(`[TaskService] Fetching all tasks for org ID: ${organizationId}`);
  const tasksCollectionRef = collection(db, `organizations/${organizationId}/tasks`);
  const q = query(tasksCollectionRef, orderBy("title")); 

  try {
    const tasksSnapshot = await getDocs(q);
    // console.log(`[TaskService] Found ${tasksSnapshot.docs.length} tasks for org ${organizationId}`);
    return tasksSnapshot.docs.map(docSnapshot => {
      const data = docSnapshot.data();
      return {
        id: docSnapshot.id,
        ...data,
        organizationId, 
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : (data.createdAt ? new Date(data.createdAt) : undefined),
        updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : (data.updatedAt ? new Date(data.updatedAt) : undefined),
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

  return tasksSnapshot.docs.map(docSnapshot => {
    const data = docSnapshot.data();
    return {
      id: docSnapshot.id,
      ...data,
      organizationId: organizationId,
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : (data.createdAt ? new Date(data.createdAt) : undefined),
      updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : (data.updatedAt ? new Date(data.updatedAt) : undefined),
    } as Task;
  });
};

/**
 * Saves or updates a task in Firestore for a specific organization.
 * @param organizationId The ID of the organization.
 * @param taskData The task data to save. Includes ID for updates.
 * @returns Promise resolving to the saved or updated Task object.
 */
export const saveTaskToFirestore = async (organizationId: string, taskData: Partial<Omit<Task, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>> & { id?: string }): Promise<Task> => {
  const db = getDb();
  if (!db) {
    throw new Error('Firestore not initialized. Cannot save task.');
  }
  if (!organizationId) {
    throw new Error('Organization ID is required to save a task.');
  }

  const { id, ...formData } = taskData;

  // Prepare data for Firestore. It should be clean from the form.
  // We'll set null for fields that should be cleared.
  const dataForFirestore: { [key: string]: any } = {
    ...formData,
    updatedAt: serverTimestamp(),
  };

  // Ensure `assignedEntityId` is null if `assignedTo` is null or undefined.
  if (!dataForFirestore.assignedTo) {
    dataForFirestore.assignedTo = null;
    dataForFirestore.assignedEntityId = null;
  }

  // Sanitize other optional fields to be null if they are empty strings or undefined
  dataForFirestore.category = formData.category || null;
  dataForFirestore.priority = formData.priority || null;
  dataForFirestore.assignedEntityId = formData.assignedEntityId || null;
  
  let docRef;
  if (id) {
    // Update existing task
    docRef = doc(db, `organizations/${organizationId}/tasks`, id);
    // Use updateDoc to avoid overwriting createdAt, etc.
    await updateDoc(docRef, dataForFirestore);
  } else {
    // Create new task
    dataForFirestore.createdAt = serverTimestamp();
    const tasksCollectionRef = collection(db, `organizations/${organizationId}/tasks`);
    docRef = await addDoc(tasksCollectionRef, dataForFirestore);
  }

  // Fetch the document to return the complete object with server-generated timestamps
  const savedDoc = await getDoc(docRef);
  if (!savedDoc.exists()) {
    throw new Error('Failed to retrieve the saved task from Firestore.');
  }
  const savedData = savedDoc.data();
  return {
    id: savedDoc.id,
    ...savedData,
    organizationId, // Add organizationId to the returned object
    createdAt: savedData.createdAt instanceof Timestamp ? savedData.createdAt.toDate() : new Date(),
    updatedAt: savedData.updatedAt instanceof Timestamp ? savedData.updatedAt.toDate() : new Date(),
  } as Task;
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
  if (!organizationId || !taskId) {
    throw new Error('Organization ID and Task ID are required to delete a task.');
  }
  const taskDocRef = doc(db, `organizations/${organizationId}/tasks`, taskId);
  await deleteDoc(taskDocRef);
};

/**
 * Counts total tasks in an organization.
 * @param organizationId The ID of the organization.
 * @returns Promise resolving to the count of tasks.
 */
export const countTasksByOrganization = async (organizationId: string): Promise<number> => {
  const db = getDb();
  if (!db || !organizationId) {
    console.error('Firestore not initialized or organizationId missing for countTasksByOrganization.');
    return 0;
  }
  const tasksCollectionRef = collection(db, `organizations/${organizationId}/tasks`);
  const q = query(tasksCollectionRef); // No specific filters needed for total count
  
  try {
    const snapshot = await getCountFromServer(q);
    return snapshot.data().count;
  } catch (error) {
    console.error(`Error counting tasks for org ${organizationId}:`, error);
    throw error;
  }
};

    