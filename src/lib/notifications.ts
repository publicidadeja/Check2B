
// src/lib/notifications.ts
import { onValue, ref, set, get, push, update, getDatabase, query, orderByChild, equalTo, remove } from "firebase/database";
import { getFirebaseApp } from "./firebase"; 
import type { Notification } from "@/types/notification";


let db: ReturnType<typeof getDatabase> | null = null;
try {
    const app = getFirebaseApp(); 
    if (app) {
        db = getDatabase(app);
    } else {
        console.error("[Notifications Lib] Firebase app not initialized for Database. Notifications might not work.");
    }
} catch (error) {
    console.error("[Notifications Lib] Error getting Firebase Database instance:", error);
}


export const requestBrowserNotificationPermission = async (): Promise<NotificationPermission> => {
    if (!("Notification" in window)) {
        console.warn("[Notifications Lib] Este navegador não suporta notificações desktop.");
        return "denied";
    }
    try {
        const permission = await Notification.requestPermission();
        console.log("[Notifications Lib] Browser permission status:", permission);
        return permission;
    } catch (error) {
        console.error("[Notifications Lib] Error requesting browser permission:", error);
        return "default";
    }
};

const shownNotifications = new Set<string>(); 
export const showBrowserNotification = (
    title: string,
    options?: NotificationOptions,
    notificationId?: string 
): void => {
    if (!("Notification" in window) || Notification.permission !== "granted") {
        console.log("[Notifications Lib] Browser notifications not supported or permission not granted. Permission:", Notification.permission);
        return; 
    }
    
    if (notificationId && shownNotifications.has(notificationId)) {
        console.log(`[Notifications Lib] Notification ${notificationId} already shown this session.`);
        return;
    }

    const notification = new Notification(title, {
        body: options?.body,
        icon: options?.icon || '/logo.png', 
        tag: options?.tag || notificationId, 
        renotify: options?.renotify || false,
        silent: options?.silent || false,
        ...options, 
    });

    notification.onclick = () => {
        window.focus(); 
        notification.close(); 
    };

    notification.onerror = (event) => {
        console.error("[Notifications Lib] Error showing browser notification:", event);
    };

    if (notificationId) {
        shownNotifications.add(notificationId);
    }

    console.log("[Notifications Lib] Showing browser notification:", title);
};


export const listenToNotifications = (
    employeeId: string,
    callback: (notifications: Notification[]) => void,
    onError: (error: Error) => void
): (() => void) => {
    if (!db) {
        console.error("[Notifications Lib] Database not initialized. Cannot listen for notifications.");
        onError(new Error("Database not initialized for notifications."));
        return () => {}; 
    }
    if (!employeeId) {
        console.error("[Notifications Lib] Employee ID is null or undefined. Cannot listen for notifications.");
        onError(new Error("Employee ID not provided for notifications."));
        return () => {};
    }

    const notificationsRef = ref(db, `userNotifications/${employeeId}`);
    console.log(`[Notifications Lib] Attempting to set up listener for user: ${employeeId} at path: userNotifications/${employeeId}`);

    const unsubscribe = onValue(notificationsRef, (snapshot) => {
        console.log(`[Notifications Lib] onValue callback triggered for user: ${employeeId}. Snapshot exists: ${snapshot.exists()}`);
        const data = snapshot.val();
        let notificationsArray: Notification[] = [];
        if (data) {
            notificationsArray = Object.keys(data).map(key => {
                const notificationData = data[key];
                return {
                    id: key,
                    ...notificationData,
                    timestamp: new Date(notificationData.timestamp || Date.now()), 
                    read: notificationData.read === true, 
                };
            }).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()); 
        }
        console.log(`[Notifications Lib] Processed ${notificationsArray.length} notifications for user ${employeeId}.`);
        callback(notificationsArray);

    }, (error) => {
        console.error(`[Notifications Lib] Firebase onValue error for user ${employeeId}:`, error);
        onError(error);
    });

    // Test if the path exists right after setting up the listener (for debugging)
    get(notificationsRef).then(snapshot => {
        console.log(`[Notifications Lib] Manual get() after onValue setup for ${employeeId}. Path exists: ${snapshot.exists()}`);
    }).catch(err => {
        console.error(`[Notifications Lib] Manual get() error for ${employeeId}:`, err);
    });


    return () => {
        console.log(`[Notifications Lib] Unsubscribing listener for user: ${employeeId}`);
        unsubscribe();
    };
};


export const markNotificationAsRead = async (employeeId: string, notificationId: string): Promise<void> => {
    if (!db) {
        console.error("[Notifications Lib] Database not initialized. Cannot mark as read.");
        throw new Error("Database not initialized");
    }

    const notificationRef = ref(db, `userNotifications/${employeeId}/${notificationId}`);
    try {
        await update(notificationRef, { read: true });
        console.log(`[Notifications Lib] Marked ${notificationId} as read for user ${employeeId}`);
    } catch (error) {
        console.error(`[Notifications Lib] Error marking notification ${notificationId} as read:`, error);
        throw error;
    }
};


export const markAllNotificationsAsRead = async (employeeId: string): Promise<void> => {
    if (!db) {
        console.error("[Notifications Lib] Database not initialized. Cannot mark all as read.");
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
            console.log(`[Notifications Lib] Marked all as read for user ${employeeId}`);
        } else {
            console.log(`[Notifications Lib] No unread notifications to mark for user ${employeeId}`);
        }
    } catch (error) {
        console.error(`[Notifications Lib] Error marking all notifications as read for user ${employeeId}:`, error);
        throw error;
    }
};

export const deleteNotification = async (employeeId: string, notificationId: string): Promise<void> => {
    if (!db) {
        console.error("[Notifications Lib] Database not initialized. Cannot delete notification.");
        throw new Error("Database not initialized");
    }
    const notificationRef = ref(db, `userNotifications/${employeeId}/${notificationId}`);
    try {
        await remove(notificationRef);
        console.log(`[Notifications Lib] Deleted notification ${notificationId} for user ${employeeId}`);
    } catch (error) {
        console.error(`[Notifications Lib] Error deleting notification ${notificationId}:`, error);
        throw error;
    }
};

export const deleteAllNotifications = async (employeeId: string): Promise<void> => {
    if (!db) {
        console.error("[Notifications Lib] Database not initialized. Cannot delete all notifications.");
        throw new Error("Database not initialized");
    }
    const userNotificationsRef = ref(db, `userNotifications/${employeeId}`);
    try {
        await set(userNotificationsRef, null);
        console.log(`[Notifications Lib] Deleted all notifications for user ${employeeId}`);
    } catch (error) {
        console.error(`[Notifications Lib] Error deleting all notifications for user ${employeeId}:`, error);
        throw error;
    }
};


export const addNotification = async (employeeId: string, notificationData: Omit<Notification, 'id' | 'timestamp' | 'read'>): Promise<string> => {
    if (!db) {
        console.error("[Notifications Lib] Database not initialized. Cannot add notification.");
        throw new Error("Database not initialized");
    }
    const notificationsRef = ref(db, `userNotifications/${employeeId}`);
    const newNotificationRef = push(notificationsRef); 

    const notificationPayload = {
        ...notificationData,
        timestamp: new Date().toISOString(), 
        read: false,
    };

    try {
        await set(newNotificationRef, notificationPayload);
        const newId = newNotificationRef.key!;
        console.log(`[Notifications Lib] Added notification ${newId} for user ${employeeId}`);
        return newId;
    } catch (error) {
        console.error(`[Notifications Lib] Error adding notification for user ${employeeId}:`, error);
        throw error;
    }
};

export const triggerTestNotification = async (employeeId: string) => {
    console.log(`[Notifications Lib] Triggering test notification for user ${employeeId}`);
    try {
        await addNotification(employeeId, {
            type: 'info',
            message: `Esta é uma notificação de teste para ${employeeId} às ${new Date().toLocaleTimeString()}.`,
            link: '/colaborador/dashboard'
        });
        return true;
    } catch (error) {
        console.error("[Notifications Lib] Failed to trigger test notification:", error);
        return false;
    }
};

