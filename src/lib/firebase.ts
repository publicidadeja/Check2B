// src/lib/firebase.ts
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";
import { getAuth, Auth } from "firebase/auth"; // Specify Auth type
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
let authInstance: Auth | null = null; // Use Auth type
let appCheckInstance: AppCheck | null = null;

const requiredConfigKeys: (keyof typeof firebaseConfig)[] = [
    'apiKey',
    'authDomain',
    'projectId',
];

const missingKeys = requiredConfigKeys.filter(key => !firebaseConfig[key]);

if (typeof window !== 'undefined') {
    console.log("[Firebase Lib V4] Running in browser environment.");
    console.log("[Firebase Lib V4] NEXT_PUBLIC_FIREBASE_PROJECT_ID:", process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);
    console.log("[Firebase Lib V4] NODE_ENV:", process.env.NODE_ENV);
    console.log("[Firebase Lib V4] Raw NEXT_PUBLIC_RECAPTCHA_SITE_KEY from env:", process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY);
    console.log("[Firebase Lib V4] Raw NEXT_PUBLIC_APPCHECK_DEBUG_TOKEN from env:", process.env.NEXT_PUBLIC_APPCHECK_DEBUG_TOKEN);

    // --- TEMPORARY DEBUGGING FOR APP CHECK ---
    // !!!!! CRITICAL: REPLACE THE PLACEHOLDER WITH YOUR ACTUAL DEBUG TOKEN !!!!!
    const YOUR_DEBUG_TOKEN_FOR_TESTING = "COLOQUE_SEU_TOKEN_DE_DEBUG_AQUI_NO_CODIGO"; 

    if (YOUR_DEBUG_TOKEN_FOR_TESTING && YOUR_DEBUG_TOKEN_FOR_TESTING !== "COLOQUE_SEU_TOKEN_DE_DEBUG_AQUI_NO_CODIGO") {
        console.warn("[Firebase Lib V4 DEBUG] ==> HARDCODING App Check Debug Token:", YOUR_DEBUG_TOKEN_FOR_TESTING);
        (window as any).FIREBASE_APPCHECK_DEBUG_TOKEN = YOUR_DEBUG_TOKEN_FOR_TESTING;
    } else if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_APPCHECK_DEBUG_TOKEN) {
        console.log("[Firebase Lib V4 DEBUG] ==> USING App Check DEBUG TOKEN from process.env:", process.env.NEXT_PUBLIC_APPCHECK_DEBUG_TOKEN);
        (window as any).FIREBASE_APPCHECK_DEBUG_TOKEN = process.env.NEXT_PUBLIC_APPCHECK_DEBUG_TOKEN;
    } else {
        console.warn("[Firebase Lib V4 DEBUG] ==> App Check Debug Token NOT SET (neither hardcoded nor via env). For localhost, App Check might fail without it or reCAPTCHA setup for localhost.");
    }
    console.log("[Firebase Lib V4 DEBUG] Value of window.FIREBASE_APPCHECK_DEBUG_TOKEN JUST BEFORE App Check Init:", (window as any).FIREBASE_APPCHECK_DEBUG_TOKEN);
    // --- END TEMPORARY DEBUGGING ---

    if (missingKeys.length === 0) {
        try {
            if (!getApps().length) {
                console.log("[Firebase Lib V4] Initializing Firebase app with config:", firebaseConfig);
                app = initializeApp(firebaseConfig);
            } else {
                app = getApp();
                console.log("[Firebase Lib V4] Firebase app already initialized.");
            }

            if (app && !appCheckInstance) {
                const recaptchaSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
                console.log("[Firebase Lib V4 DEBUG] ReCaptcha Site Key for provider:", recaptchaSiteKey);

                if (recaptchaSiteKey) {
                    console.log("[Firebase Lib V4 DEBUG] Attempting to initialize App Check with ReCaptchaV3Provider...");
                    try {
                        // Log window debug token again right before initialization
                        console.log("[Firebase Lib V4 DEBUG] window.FIREBASE_APPCHECK_DEBUG_TOKEN at the moment of initializeAppCheck:", (window as any).FIREBASE_APPCHECK_DEBUG_TOKEN);
                        appCheckInstance = initializeAppCheck(app, {
                            provider: new ReCaptchaV3Provider(recaptchaSiteKey),
                            isTokenAutoRefreshEnabled: true
                        });
                        console.log("[Firebase Lib V4 DEBUG] Firebase App Check initialization call completed.");
                    } catch (appCheckError) {
                        console.error("[Firebase Lib V4 DEBUG] CRITICAL ERROR initializing Firebase App Check:", appCheckError);
                    }
                } else {
                    console.warn("[Firebase Lib V4] App Check: NEXT_PUBLIC_RECAPTCHA_SITE_KEY not found. App Check with reCAPTCHA will not be initialized. DEBUG TOKEN IS CRITICAL FOR LOCAL DEV.");
                }
            }

            if (app) {
                db = getFirestore(app);
                authInstance = getAuth(app);
                console.log("[Firebase Lib V4] Firebase App, Firestore, and Auth initialized successfully.");
            } else {
                 console.error("[Firebase Lib V4] Firebase app could not be initialized after checks.");
            }

        } catch (error) {
            console.error("[Firebase Lib V4] Firebase initialization failed:", error);
            if (missingKeys.length > 0) {
                alert(`Erro de configuração do Firebase: Chaves CRÍTICAS ausentes: ${missingKeys.join(', ')}. Verifique o console e o arquivo .env.`);
            } else {
                alert("Falha ao inicializar a conexão com o servidor. Verifique a configuração do Firebase.");
            }
        }
    } else {
        console.warn("[Firebase Lib V4] Firebase Web App initialization skipped due to missing CRITICAL configuration keys:", missingKeys.join(', '), ". Check .env file.");
        alert(`Erro de configuração do Firebase: Chaves CRÍTICAS ausentes: ${missingKeys.join(', ')}. Verifique seu arquivo .env e recarregue a página.`);
    }
} else {
    console.log("[Firebase Lib V4] Skipping client-side Firebase initialization (not in browser).");
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

export const getAuthInstance = (): Auth | null => { // Use Auth type
    const currentApp = getFirebaseApp();
    if (!authInstance && currentApp) {
        authInstance = getAuth(currentApp);
    }
    return authInstance;
}

export const getAppCheckInstance = (): AppCheck | null => {
    if (!appCheckInstance && app) {
        console.warn("[Firebase Lib V4] getAppCheckInstance called, but instance was not set. This might indicate an issue if called after initial load.");
    }
    return appCheckInstance;
}
