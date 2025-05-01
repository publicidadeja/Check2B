// src/lib/notifications.ts
import { onValue, ref, set, get, push, update, getDatabase, query, orderByChild, equalTo } from "firebase/database";
import { getFirebaseApp } from "./firebase"; // Assuming you have a firebase init file
import type { Notification } from "@/types/notification";

// --- Mock Data (If needed for initial setup or fallback) ---
// Removed mock data as we rely on Firebase

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

// --- Browser Notification Functions ---

/**
 * Requests permission to show browser notifications.
 * @returns Promise resolving to the permission state ('granted', 'denied', 'default').
 */
export const requestBrowserNotificationPermission = async (): Promise<NotificationPermission> => {
    if (!("Notification" in window)) {
        console.warn("Este navegador não suporta notificações desktop.");
        return "denied";
    }
    try {
        const permission = await Notification.requestPermission();
        console.log("[Notifications] Browser permission status:", permission);
        return permission;
    } catch (error) {
        console.error("[Notifications] Error requesting browser permission:", error);
        return "default";
    }
};

/**
 * Shows a browser notification if permission is granted.
 * @param title The title of the notification.
 * @param options Optional NotificationOptions (body, icon, etc.).
 * @param notificationId Optional ID to prevent showing the same notification multiple times.
 */
const shownNotifications = new Set<string>(); // Keep track of shown notifications in this session
export const showBrowserNotification = (
    title: string,
    options?: NotificationOptions,
    notificationId?: string // Use the notification ID from the database
): void => {
    if (!("Notification" in window) || Notification.permission !== "granted") {
        return; // Do nothing if not supported or not granted
    }
    // Prevent showing the same notification repeatedly in the same session
    if (notificationId && shownNotifications.has(notificationId)) {
        console.log(`[Notifications] Notification ${notificationId} already shown this session.`);
        return;
    }

    const notification = new Notification(title, {
        body: options?.body,
        icon: options?.icon || '/logo.png', // Default icon
        tag: options?.tag || notificationId, // Use ID as tag to potentially replace older ones
        renotify: options?.renotify || false,
        silent: options?.silent || false,
        ...options, // Allow overriding other options
    });

     // Handle click event (e.g., focus the window/tab)
    notification.onclick = () => {
        window.focus(); // Focus the current window/tab
        notification.close(); // Close notification on click
    };

     // Handle error event
    notification.onerror = (event) => {
        console.error("[Notifications] Error showing browser notification:", event);
    };

    if (notificationId) {
        shownNotifications.add(notificationId);
         // Optional: Remove from set after a delay to allow re-notification later if needed
         // setTimeout(() => shownNotifications.delete(notificationId), 60000); // Example: Remove after 1 minute
    }

    console.log("[Notifications] Showing browser notification:", title);
};


// --- Firebase Functions ---

/**
 * Listens for real-time notification updates for a specific employee.
 * Also triggers browser notifications for new, unread items.
 * @param employeeId The ID of the employee.
 * @param callback Function to call with the updated notifications array (for in-app list).
 * @param onError Function to call if there's an error.
 * @returns An unsubscribe function.
 */
let initialLoadComplete = false; // Flag to prevent showing old notifications on initial load
export const listenToNotifications = (
    employeeId: string,
    callback: (notifications: Notification[]) => void,
    onError: (error: Error) => void
): (() => void) => {
    if (!db) {
        console.error("[Notifications] Database not initialized. Cannot listen.");
        onError(new Error("Database not initialized"));
        initialLoadComplete = false; // Reset flag on error
        return () => {}; // Return empty unsubscribe function
    }

    const notificationsRef = ref(db, `userNotifications/${employeeId}`);
    initialLoadComplete = false; // Reset on new listener setup

    console.log(`[Notifications] Setting up listener for user: ${employeeId}`);

    const unsubscribe = onValue(notificationsRef, (snapshot) => {
        const data = snapshot.val();
        let notificationsArray: Notification[] = [];
        if (data) {
            notificationsArray = Object.keys(data).map(key => {
                const notificationData = data[key];
                return {
                    id: key,
                    ...notificationData,
                    timestamp: new Date(notificationData.timestamp || Date.now()), // Ensure timestamp is a Date
                    read: notificationData.read === true, // Ensure read is boolean
                };
            }).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()); // Sort newest first
        }

        // Process notifications (including triggering browser notifications)
        if (initialLoadComplete) {
             // Only process for browser notifications after the initial data load
            notificationsArray.forEach(n => {
                 // Show browser notification only if it's new and unread
                if (!n.read) {
                     console.log(`[Notifications] Attempting to show browser notification for unread item: ${n.id}`);
                     showBrowserNotification(
                         n.type === 'evaluation' ? 'Nova Avaliação' :
                         n.type === 'challenge' ? 'Novo Desafio' :
                         n.type === 'ranking' ? 'Ranking Atualizado' :
                         'Nova Notificação',
                         { body: n.message },
                         n.id // Pass ID to prevent duplicates
                     );
                 }
            });
        } else {
             console.log("[Notifications] Initial data load complete.");
             initialLoadComplete = true; // Mark initial load as done
             // Optionally, clear the shownNotifications set on initial load if desired
             // shownNotifications.clear();
        }


        // Update the in-app list via the callback
        callback(notificationsArray);

    }, (error) => {
        console.error("[Notifications] Error listening to notifications:", error);
        initialLoadComplete = false; // Reset flag on error
        onError(error);
    });

     // Return the unsubscribe function with reset for the flag
    return () => {
        console.log(`[Notifications] Unsubscribing listener for user: ${employeeId}`);
        initialLoadComplete = false; // Reset flag when unsubscribing
        unsubscribe();
    };
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
        await update(notificationRef, { read: true });
        console.log(`[Notifications] Marked ${notificationId} as read for user ${employeeId}`);
    } catch (error) {
        console.error(`[Notifications] Error marking notification ${notificationId} as read:`, error);
        throw error;
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
        const snapshot = await get(userNotificationsRef);
        const updates: { [key: string]: any } = {};
        if (snapshot.exists()) {
            snapshot.forEach((childSnapshot) => {
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
        throw error;
    }
};

/**
 * Adds a new notification for a specific employee.
 * Usually called from the backend/admin actions.
 * @param employeeId The ID of the employee.
 * @param notificationData Data for the new notification (type, message, link).
 * @returns Promise resolving with the new notification ID.
 */
export const addNotification = async (employeeId: string, notificationData: Omit<Notification, 'id' | 'timestamp' | 'read'>): Promise<string> => {
    if (!db) {
        console.error("[Notifications] Database not initialized. Cannot add notification.");
        throw new Error("Database not initialized");
    }
    const notificationsRef = ref(db, `userNotifications/${employeeId}`);
    const newNotificationRef = push(notificationsRef); // Generate unique key from Firebase

    const notificationPayload = {
        ...notificationData,
        timestamp: new Date().toISOString(), // Store timestamp as ISO string for consistency
        read: false,
    };

    try {
        await set(newNotificationRef, notificationPayload);
        const newId = newNotificationRef.key!;
        console.log(`[Notifications] Added notification ${newId} for user ${employeeId}`);
        return newId;
    } catch (error) {
        console.error(`[Notifications] Error adding notification for user ${employeeId}:`, error);
        throw error;
    }
};

// --- Example: Helper to trigger a test notification (for development) ---
export const triggerTestNotification = async (employeeId: string) => {
    console.log(`[Notifications] Triggering test notification for user ${employeeId}`);
    try {
        await addNotification(employeeId, {
            type: 'info',
            message: `Esta é uma notificação de teste. ${new Date().toLocaleTimeString()}`,
            link: '/colaborador/dashboard'
        });
        return true;
    } catch (error) {
        console.error("[Notifications] Failed to trigger test notification:", error);
        return false;
    }
};
