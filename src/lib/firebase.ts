// src/lib/firebase.ts
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { initializeAppCheck, ReCaptchaV3Provider, AppCheck } from "firebase/app-check";

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
let authInstance: ReturnType<typeof getAuth> | null = null;
let appCheckInstance: AppCheck | null = null;

const requiredConfigKeys: (keyof typeof firebaseConfig)[] = [
    'apiKey',
    'authDomain',
    'projectId',
];

const missingKeys = requiredConfigKeys.filter(key => !firebaseConfig[key]);

if (typeof window !== 'undefined') {
    console.log("[Firebase Lib V3] Running in browser environment.");
    console.log("[Firebase Lib V3] NEXT_PUBLIC_FIREBASE_PROJECT_ID:", process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);

    if (missingKeys.length === 0) {
        try {
            // --- TEMPORARY DEBUGGING FOR APP CHECK ---
            // !!!!! IMPORTANT: REPLACE WITH YOUR ACTUAL DEBUG TOKEN FOR TESTING !!!!!
            // !!!!! AND REMOVE THIS HARDCODING BEFORE PRODUCTION !!!!!
            const YOUR_DEBUG_TOKEN_FOR_TESTING = "COLOQUE_SEU_TOKEN_DE_DEBUG_AQUI_PARA_TESTE"; 

            if (process.env.NODE_ENV === 'development') {
                if (YOUR_DEBUG_TOKEN_FOR_TESTING && YOUR_DEBUG_TOKEN_FOR_TESTING !== "COLOQUE_SEU_TOKEN_DE_DEBUG_AQUI_PARA_TESTE") {
                    console.warn("[Firebase Lib DEBUG] HARDCODING App Check Debug Token:", YOUR_DEBUG_TOKEN_FOR_TESTING);
                    (window as any).FIREBASE_APPCHECK_DEBUG_TOKEN = YOUR_DEBUG_TOKEN_FOR_TESTING;
                } else if (process.env.NEXT_PUBLIC_APPCHECK_DEBUG_TOKEN) {
                    console.log("[Firebase Lib DEBUG] Using App Check DEBUG TOKEN from process.env:", process.env.NEXT_PUBLIC_APPCHECK_DEBUG_TOKEN);
                    (window as any).FIREBASE_APPCHECK_DEBUG_TOKEN = process.env.NEXT_PUBLIC_APPCHECK_DEBUG_TOKEN;
                } else {
                    console.warn("[Firebase Lib DEBUG] App Check Debug Token NOT SET (neither hardcoded nor via env). For localhost, App Check might fail without it or reCAPTCHA setup for localhost.");
                }
            }
            // --- END TEMPORARY DEBUGGING ---

            if (!getApps().length) {
                console.log("[Firebase Lib V3] Initializing Firebase app with config:", firebaseConfig);
                app = initializeApp(firebaseConfig);
            } else {
                app = getApp();
                console.log("[Firebase Lib V3] Firebase app already initialized.");
            }

            if (app && !appCheckInstance) { // Initialize App Check if not already done
                const recaptchaSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
                console.log("[Firebase Lib DEBUG] Value of window.FIREBASE_APPCHECK_DEBUG_TOKEN before initializeAppCheck:", (window as any).FIREBASE_APPCHECK_DEBUG_TOKEN);
                console.log("[Firebase Lib DEBUG] NEXT_PUBLIC_RECAPTCHA_SITE_KEY:", recaptchaSiteKey);

                if (recaptchaSiteKey) {
                    console.log("[Firebase Lib V3] Attempting to initialize App Check with ReCaptchaV3Provider using site key:", recaptchaSiteKey);
                    try {
                        appCheckInstance = initializeAppCheck(app, {
                            provider: new ReCaptchaV3Provider(recaptchaSiteKey),
                            isTokenAutoRefreshEnabled: true
                        });
                        console.log("[Firebase Lib DEBUG] Firebase App Check initialized successfully.");
                    } catch (appCheckError) {
                        console.error("[Firebase Lib DEBUG] Error initializing Firebase App Check:", appCheckError);
                        // Optionally, alert the user or log to a monitoring service
                        // alert("Erro ao inicializar a verificação de segurança do app. Algumas funcionalidades podem não estar disponíveis.");
                    }
                } else {
                    console.warn("[Firebase Lib V3] App Check: NEXT_PUBLIC_RECAPTCHA_SITE_KEY not found. App Check with reCAPTCHA will not be initialized. DEBUG TOKEN IS CRITICAL FOR LOCAL DEV.");
                }
            }


            if (app) {
                db = getFirestore(app);
                authInstance = getAuth(app);
                console.log("[Firebase Lib V3] Firebase App, Firestore, and Auth initialized successfully.");
            } else {
                 console.error("[Firebase Lib V3] Firebase app could not be initialized after checks.");
            }

        } catch (error) {
            console.error("[Firebase Lib V3] Firebase initialization failed:", error);
            if (missingKeys.length > 0) {
                alert(`Erro de configuração do Firebase: Chaves CRÍTICAS ausentes: ${missingKeys.join(', ')}. Verifique o console e o arquivo .env.`);
            } else {
                alert("Falha ao inicializar a conexão com o servidor. Verifique a configuração do Firebase.");
            }
        }
    } else {
        console.warn("[Firebase Lib V3] Firebase Web App initialization skipped due to missing CRITICAL configuration keys:", missingKeys.join(', '), ". Check .env file.");
        alert(`Erro de configuração do Firebase: Chaves CRÍTICAS ausentes: ${missingKeys.join(', ')}. Verifique seu arquivo .env e recarregue a página.`);
    }
} else {
    console.log("[Firebase Lib V3] Skipping client-side Firebase initialization (not in browser).");
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

export const getAuthInstance = (): ReturnType<typeof getAuth> | null => {
    const currentApp = getFirebaseApp();
    if (!authInstance && currentApp) {
        authInstance = getAuth(currentApp);
    }
    return authInstance;
}

export const getAppCheckInstance = (): AppCheck | null => {
    // This function might not be strictly necessary if initialization is robust,
    // but can be a safeguard or for specific checks.
    if (!appCheckInstance && app) {
        console.warn("[Firebase Lib V3] getAppCheckInstance called, but instance was not set. This might indicate an issue if called after initial load.");
        // Avoid re-initializing here as it should happen on load.
        // If it's null here, it means initial setup failed or hasn't run.
    }
    return appCheckInstance;
}
