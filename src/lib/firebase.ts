// src/lib/firebase.ts
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";
import { getAuth, Auth } from "firebase/auth"; // Specify Auth type
// Updated import to use ReCaptchaEnterpriseProvider
import { initializeAppCheck, ReCaptchaEnterpriseProvider, AppCheck } from "firebase/app-check";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let authInstance: Auth | null = null;
let appCheckInstance: AppCheck | null = null;

const requiredConfigKeysForInit: (keyof typeof firebaseConfig)[] = [
    'apiKey',
    'authDomain',
    'projectId',
];

if (typeof window !== 'undefined') {
    console.log("[Firebase Lib V9 DEBUG] Running in browser environment.");
    console.log("[Firebase Lib V9 DEBUG] NODE_ENV:", process.env.NODE_ENV);

    const allRequiredPresent = requiredConfigKeysForInit.every(key => firebaseConfig[key]);

    if (allRequiredPresent) {
        try {
            // --- START OF FIX: Set App Check debug token on window object ---
            // This is the recommended way to enable App Check debug mode.
            // The Firebase SDK will automatically detect this and use the debug provider.
            const debugToken = process.env.NEXT_PUBLIC_APPCHECK_DEBUG_TOKEN;
            if (process.env.NODE_ENV === 'development' && debugToken) {
                console.log("[Firebase Lib V9 DEBUG] Setting App Check DEBUG TOKEN on window object:", debugToken);
                (window as any).FIREBASE_APPCHECK_DEBUG_TOKEN = debugToken;
            }
            // --- END OF FIX ---


            if (!getApps().length) {
                console.log("[Firebase Lib V9 DEBUG] Initializing Firebase app with config for project:", firebaseConfig.projectId);
                app = initializeApp(firebaseConfig);
            } else {
                app = getApp();
                console.log("[Firebase Lib V9 DEBUG] Firebase app already initialized for project:", app.options.projectId);
            }

            // --- APP CHECK INITIALIZATION (remains mostly the same) ---
            if (app && !appCheckInstance) {
                const recaptchaSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
                
                // Initialize App Check. The provider will be automatically selected based on
                // whether FIREBASE_APPCHECK_DEBUG_TOKEN is set on the window.
                if (recaptchaSiteKey) {
                    try {
                        appCheckInstance = initializeAppCheck(app, {
                            provider: new ReCaptchaEnterpriseProvider(recaptchaSiteKey),
                            isTokenAutoRefreshEnabled: true
                        });
                        console.log("[Firebase Lib V9 DEBUG] Firebase App Check initialized.");
                    } catch (appCheckError: any) {
                         console.error("[Firebase Lib V9 DEBUG] CRITICAL ERROR initializing Firebase App Check:", appCheckError);
                    }
                } else {
                    console.warn("[Firebase Lib V9 DEBUG] App Check NOT INITIALIZED. Required for production. NEXT_PUBLIC_RECAPTCHA_SITE_KEY is missing.");
                }
            }
            // --- END APP CHECK ---

            if (app) {
                db = getFirestore(app);
                authInstance = getAuth(app);
                console.log("[Firebase Lib V9 DEBUG] Firebase App, Firestore, and Auth setup completed.");
            }

        } catch (error) {
            console.error("[Firebase Lib V9 DEBUG] Firebase initialization failed:", error);
            alert("Falha ao inicializar a conexão com o servidor. Verifique a configuração do Firebase e o console (F12).");
        }
    } else {
        const missingCriticalKeys = requiredConfigKeysForInit.filter(key => !firebaseConfig[key]);
        console.error("[Firebase Lib V9 DEBUG] Firebase Web App initialization SKIPPED due to missing CRITICAL configuration keys:", missingCriticalKeys.join(', '));
        alert(`Erro de configuração do Firebase: Chaves CRÍTICAS ausentes: ${missingCriticalKeys.join(', ')}. Verifique suas variáveis de ambiente e recarregue a página.`);
    }
} else {
    console.log("[Firebase Lib V9 DEBUG] Skipping client-side Firebase initialization (not in browser).");
}

export const getFirebaseApp = (): FirebaseApp | null => {
    if (!app && typeof window !== 'undefined' && getApps().length > 0) {
        app = getApp();
    }
    return app;
};

export const getDb = (): Firestore | null => {
    const currentApp = getFirebaseApp();
    if (!db && currentApp) {
        db = getFirestore(currentApp);
    }
    return db;
}

export const getAuthInstance = (): Auth | null => {
    const currentApp = getFirebaseApp();
    if (!authInstance && currentApp) {
        authInstance = getAuth(currentApp);
    }
    return authInstance;
}

export const getAppCheckInstance = (): AppCheck | null => {
    if (!appCheckInstance) {
        const currentApp = getFirebaseApp();
        if (currentApp) {
             console.warn("[Firebase Lib V9 DEBUG] getAppCheckInstance called, but instance was null. This might indicate an initialization issue.");
        }
    }
    return appCheckInstance;
}
