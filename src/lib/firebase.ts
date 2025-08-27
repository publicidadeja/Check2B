// src/lib/firebase.ts
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";
import { getAuth, Auth } from "firebase/auth";
// Updated import to use ReCaptchaEnterpriseProvider and CustomProvider
import { initializeAppCheck, ReCaptchaEnterpriseProvider, CustomProvider, AppCheck } from "firebase/app-check";

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
    console.log("[Firebase Lib V12 FINAL] Running in browser environment.");

    const allRequiredPresent = requiredConfigKeysForInit.every(key => firebaseConfig[key]);

    if (allRequiredPresent) {
        try {
            if (!getApps().length) {
                console.log("[Firebase Lib V12 FINAL] Initializing Firebase app for project:", firebaseConfig.projectId);
                app = initializeApp(firebaseConfig);
            } else {
                app = getApp();
                console.log("[Firebase Lib V12 FINAL] Firebase app already initialized for project:", app.options.projectId);
            }

            // --- APP CHECK INITIALIZATION V12 ---
            if (app && !appCheckInstance) {
                const urlParams = new URLSearchParams(window.location.search);
                const debugTokenFromUrl = urlParams.get('appCheckDebugToken');
                const debugTokenFromEnv = process.env.NEXT_PUBLIC_APPCHECK_DEBUG_TOKEN;

                const finalDebugToken = debugTokenFromUrl || debugTokenFromEnv;
                
                if (finalDebugToken) {
                    console.log("[Firebase Lib V12 FINAL] ==> App Check DEBUG TOKEN found. Forcing debug provider via CustomProvider.");
                    // Use CustomProvider as a workaround for the DebugTokenProvider import issue
                    appCheckInstance = initializeAppCheck(app, {
                        provider: new CustomProvider({
                            getToken: () => {
                                console.log("[Firebase Lib V12 FINAL] CustomProvider getToken() called.");
                                return Promise.resolve({
                                    token: finalDebugToken,
                                    expireTimeMillis: Date.now() + 60 * 60 * 1000, // 1 hour
                                });
                            },
                        }),
                        isTokenAutoRefreshEnabled: true
                    });
                } else {
                    const recaptchaSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
                    if (recaptchaSiteKey) {
                        appCheckInstance = initializeAppCheck(app, {
                            provider: new ReCaptchaEnterpriseProvider(recaptchaSiteKey),
                            isTokenAutoRefreshEnabled: true
                        });
                        console.log("[Firebase Lib V12 FINAL] Firebase App Check initialized with ReCaptcha for production.");
                    } else {
                         console.error("[Firebase Lib V12 CRITICAL] App Check NOT INITIALIZED for production. ReCaptcha key is missing.");
                    }
                }
            }
            // --- END APP CHECK ---

            if (app) {
                db = getFirestore(app);
                authInstance = getAuth(app);
                console.log("[Firebase Lib V12 FINAL] Firebase App, Firestore, and Auth setup completed.");
            }

        } catch (error) {
            console.error("[Firebase Lib V12 FINAL] Firebase initialization failed:", error);
            alert("Falha ao inicializar a conexão com o servidor. Verifique a configuração do Firebase e o console (F12).");
        }
    } else {
        const missingCriticalKeys = requiredConfigKeysForInit.filter(key => !firebaseConfig[key]);
        console.error("[Firebase Lib V12 FINAL] Firebase Web App initialization SKIPPED due to missing CRITICAL configuration keys:", missingCriticalKeys.join(', '));
        alert(`Erro de configuração do Firebase: Chaves CRÍTICAS ausentes: ${missingCriticalKeys.join(', ')}. Verifique suas variáveis de ambiente e recarregue a página.`);
    }
} else {
    console.log("[Firebase Lib V12 FINAL] Skipping client-side Firebase initialization (not in browser).");
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
             console.warn("[Firebase Lib V12 FINAL] getAppCheckInstance called, but instance was null. This might indicate an initialization issue.");
        }
    }
    return appCheckInstance;
}
