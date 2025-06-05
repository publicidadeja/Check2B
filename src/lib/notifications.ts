
// src/lib/notifications.ts
import { onValue, ref, set, get, push, update, getDatabase, query, orderByChild, equalTo, remove } from "firebase/database"; // Added remove
import { getFirebaseApp } from "./firebase"; 
import type { Notification } from "@/types/notification";


let db: ReturnType<typeof getDatabase> | null = null;
try {
    const app = getFirebaseApp(); 
    if (app) {
        db = getDatabase(app);
    } else {
        console.error("[Notifications] Firebase app not initialized for Database.");
    }
} catch (error) {
    console.error("[Notifications] Error getting Firebase Database instance:", error);
}


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

const shownNotifications = new Set<string>(); 
export const showBrowserNotification = (
    title: string,
    options?: NotificationOptions,
    notificationId?: string 
): void => {
    if (!("Notification" in window) || Notification.permission !== "granted") {
        return; 
    }
    
    if (notificationId && shownNotifications.has(notificationId)) {
        console.log(`[Notifications] Notification ${notificationId} already shown this session.`);
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
        console.error("[Notifications] Error showing browser notification:", event);
    };

    if (notificationId) {
        shownNotifications.add(notificationId);
    }

    console.log("[Notifications] Showing browser notification:", title);
};


let initialLoadComplete = false; 
export const listenToNotifications = (
    employeeId: string,
    callback: (notifications: Notification[]) => void,
    onError: (error: Error) => void
): (() => void) => {
    if (!db) {
        console.error("[Notifications] Database not initialized. Cannot listen.");
        onError(new Error("Database not initialized"));
        initialLoadComplete = false; 
        return () => {}; 
    }

    const notificationsRef = ref(db, `userNotifications/${employeeId}`);
    initialLoadComplete = false; 

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
                    timestamp: new Date(notificationData.timestamp || Date.now()), 
                    read: notificationData.read === true, 
                };
            }).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()); 
        }

        if (initialLoadComplete) {
            notificationsArray.forEach(n => {
                if (!n.read) {
                     console.log(`[Notifications] Attempting to show browser notification for unread item: ${n.id}`);
                     showBrowserNotification(
                         n.type === 'evaluation' ? 'Nova Avaliação' :
                         n.type === 'challenge' ? 'Novo Desafio' :
                         n.type === 'ranking' ? 'Ranking Atualizado' :
                         'Nova Notificação',
                         { body: n.message },
                         n.id 
                     );
                 }
            });
        } else {
             console.log("[Notifications] Initial data load complete.");
             initialLoadComplete = true; 
        }

        callback(notificationsArray);

    }, (error) => {
        console.error("[Notifications] Error listening to notifications:", error);
        initialLoadComplete = false; 
        onError(error);
    });

    return () => {
        console.log(`[Notifications] Unsubscribing listener for user: ${employeeId}`);
        initialLoadComplete = false; 
        unsubscribe();
    };
};


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

export const deleteNotification = async (employeeId: string, notificationId: string): Promise<void> => {
    if (!db) {
        console.error("[Notifications] Database not initialized. Cannot delete notification.");
        throw new Error("Database not initialized");
    }
    const notificationRef = ref(db, `userNotifications/${employeeId}/${notificationId}`);
    try {
        await remove(notificationRef);
        console.log(`[Notifications] Deleted notification ${notificationId} for user ${employeeId}`);
    } catch (error) {
        console.error(`[Notifications] Error deleting notification ${notificationId}:`, error);
        throw error;
    }
};

export const deleteAllNotifications = async (employeeId: string): Promise<void> => {
    if (!db) {
        console.error("[Notifications] Database not initialized. Cannot delete all notifications.");
        throw new Error("Database not initialized");
    }
    const userNotificationsRef = ref(db, `userNotifications/${employeeId}`);
    try {
        await set(userNotificationsRef, null); // Set to null to remove the entire node
        console.log(`[Notifications] Deleted all notifications for user ${employeeId}`);
    } catch (error) {
        console.error(`[Notifications] Error deleting all notifications for user ${employeeId}:`, error);
        throw error;
    }
};


export const addNotification = async (employeeId: string, notificationData: Omit<Notification, 'id' | 'timestamp' | 'read'>): Promise<string> => {
    if (!db) {
        console.error("[Notifications] Database not initialized. Cannot add notification.");
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
        console.log(`[Notifications] Added notification ${newId} for user ${employeeId}`);
        return newId;
    } catch (error) {
        console.error(`[Notifications] Error adding notification for user ${employeeId}:`, error);
        throw error;
    }
};

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
