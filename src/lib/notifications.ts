// src/lib/notifications.ts
import { onValue, ref, set, getDatabase, query, orderByChild, equalTo, update } from "firebase/database";
import { getFirebaseApp } from "./firebase"; // Assuming you have a firebase init file
import type { Notification } from "@/types/notification";

// --- Mock Data (If needed for initial setup or fallback) ---
const initialMockNotifications: Notification[] = [
    { id: 'n1', type: 'evaluation', message: 'Sua avaliação de 05/08 foi registrada.', timestamp: new Date(Date.now() - 3600000 * 2), read: false, link: '/colaborador/avaliacoes' },
    { id: 'n2', type: 'challenge', message: 'Novo desafio "Engajamento Total" disponível!', timestamp: new Date(Date.now() - 86400000), read: false, link: '/colaborador/desafios' },
    // ... more mock data if needed
];

// --- Firebase Realtime Database Setup ---
let db: ReturnType<typeof getDatabase> | null = null;
try {
    const app = getFirebaseApp(); // Get initialized Firebase app
    if (app) {
        db = getDatabase(app);
    } else {
        console.error("[Notifications] Firebase app not initialized for Database.");
    }
} catch (error) {
    console.error("[Notifications] Error getting Firebase Database instance:", error);
}

// --- Functions ---

/**
 * Listens for real-time notification updates for a specific employee.
 * @param employeeId The ID of the employee.
 * @param callback Function to call with the updated notifications array.
 * @param onError Function to call if there's an error.
 * @returns An unsubscribe function.
 */
export const listenToNotifications = (
    employeeId: string,
    callback: (notifications: Notification[]) => void,
    onError: (error: Error) => void
): (() => void) => {
    if (!db) {
        console.error("[Notifications] Database not initialized. Cannot listen.");
        onError(new Error("Database not initialized"));
        // Simulate returning mock data if needed for development without backend
        // callback(initialMockNotifications.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()));
        return () => {}; // Return empty unsubscribe function
    }

    const notificationsRef = ref(db, `userNotifications/${employeeId}`);
    // Order by timestamp descending if needed, but often easier to sort client-side after fetch
    // const notificationsQuery = query(notificationsRef, orderByChild('timestamp'));

    const unsubscribe = onValue(notificationsRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            const notificationsArray: Notification[] = Object.keys(data).map(key => ({
                id: key,
                ...data[key],
                 // Convert timestamp string/number back to Date object
                timestamp: new Date(data[key].timestamp),
            })).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()); // Sort newest first
            callback(notificationsArray);
        } else {
            callback([]); // No notifications found
        }
    }, (error) => {
        console.error("[Notifications] Error listening to notifications:", error);
        onError(error);
    });

    return unsubscribe; // Return the unsubscribe function
};


/**
 * Marks a specific notification as read for an employee.
 * @param employeeId The ID of the employee.
 * @param notificationId The ID of the notification to mark as read.
 * @returns Promise resolving when the operation is complete.
 */
export const markNotificationAsRead = async (employeeId: string, notificationId: string): Promise<void> => {
    if (!db) {
        console.error("[Notifications] Database not initialized. Cannot mark as read.");
        throw new Error("Database not initialized");
    }

    const notificationRef = ref(db, `userNotifications/${employeeId}/${notificationId}`);
    try {
         // Update only the 'read' status
         await update(notificationRef, { read: true });
        console.log(`[Notifications] Marked ${notificationId} as read for user ${employeeId}`);
    } catch (error) {
        console.error(`[Notifications] Error marking notification ${notificationId} as read:`, error);
        throw error; // Re-throw the error for the caller to handle
    }
};

/**
 * Marks all notifications as read for an employee.
 * @param employeeId The ID of the employee.
 * @returns Promise resolving when the operation is complete.
 */
export const markAllNotificationsAsRead = async (employeeId: string): Promise<void> => {
    if (!db) {
        console.error("[Notifications] Database not initialized. Cannot mark all as read.");
        throw new Error("Database not initialized");
    }

    const userNotificationsRef = ref(db, `userNotifications/${employeeId}`);
    try {
        const snapshot = await get(userNotificationsRef); // Use get for single fetch
        const updates: { [key: string]: any } = {};
        if (snapshot.exists()) {
            snapshot.forEach((childSnapshot) => {
                // Only update if it's not already read
                if (!childSnapshot.val().read) {
                    updates[`${childSnapshot.key}/read`] = true;
                }
            });
        }

        if (Object.keys(updates).length > 0) {
            await update(userNotificationsRef, updates);
            console.log(`[Notifications] Marked all as read for user ${employeeId}`);
        } else {
            console.log(`[Notifications] No unread notifications to mark for user ${employeeId}`);
        }

    } catch (error) {
        console.error(`[Notifications] Error marking all notifications as read for user ${employeeId}:`, error);
        throw error; // Re-throw the error
    }
};


// --- Example: Function to ADD a notification (likely called from backend/admin actions) ---
export const addNotification = async (employeeId: string, notificationData: Omit<Notification, 'id' | 'timestamp' | 'read'>): Promise<string> => {
     if (!db) {
        console.error("[Notifications] Database not initialized. Cannot add notification.");
        throw new Error("Database not initialized");
    }
    const notificationsRef = ref(db, `userNotifications/${employeeId}`);
    const newNotificationRef = push(notificationsRef); // Generate unique key

    const newNotification: Notification = {
        ...notificationData,
        id: newNotificationRef.key!, // Use the generated key as the ID
        timestamp: new Date(), // Set current timestamp
        read: false, // New notifications are unread
    };

    try {
        await set(newNotificationRef, {
            ...notificationData, // Save original data
            timestamp: newNotification.timestamp.toISOString(), // Store as ISO string
            read: newNotification.read,
        });
        console.log(`[Notifications] Added notification ${newNotification.id} for user ${employeeId}`);
        return newNotification.id;
    } catch (error) {
        console.error(`[Notifications] Error adding notification for user ${employeeId}:`, error);
        throw error;
    }
};
