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
let authInstance: Auth | null = null;
let appCheckInstance: AppCheck | null = null;

const requiredConfigKeys: (keyof typeof firebaseConfig)[] = [
    'apiKey',
    'authDomain',
    'projectId',
];

const missingKeys = requiredConfigKeys.filter(key => !firebaseConfig[key]);

if (typeof window !== 'undefined') {
    console.log("[Firebase Lib V4 DEBUG] Running in browser environment.");
    console.log("[Firebase Lib V4 DEBUG] NODE_ENV:", process.env.NODE_ENV);
    console.log("[Firebase Lib V4 DEBUG] Raw NEXT_PUBLIC_APPCHECK_DEBUG_TOKEN from env:", process.env.NEXT_PUBLIC_APPCHECK_DEBUG_TOKEN);
    console.log("[Firebase Lib V4 DEBUG] Raw NEXT_PUBLIC_RECAPTCHA_SITE_KEY from env:", process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY);

    // --- TEMPORARY DEBUGGING FOR APP CHECK ---
    // !!!!! CRITICAL: REPLACE THE PLACEHOLDER BELOW WITH YOUR ACTUAL DEBUG TOKEN !!!!!
    const YOUR_DEBUG_TOKEN_FOR_TESTING = "COLOQUE_SEU_TOKEN_DE_DEBUG_AQUI_NO_CODIGO"; 

    if (YOUR_DEBUG_TOKEN_FOR_TESTING && YOUR_DEBUG_TOKEN_FOR_TESTING !== "COLOQUE_SEU_TOKEN_DE_DEBUG_AQUI_NO_CODIGO") {
        console.warn("[Firebase Lib V4 DEBUG] ==> HARDCODING App Check Debug Token:", YOUR_DEBUG_TOKEN_FOR_TESTING);
        (window as any).FIREBASE_APPCHECK_DEBUG_TOKEN = YOUR_DEBUG_TOKEN_FOR_TESTING;
    } else if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_APPCHECK_DEBUG_TOKEN) {
        console.log("[Firebase Lib V4 DEBUG] ==> USING App Check DEBUG TOKEN from process.env:", process.env.NEXT_PUBLIC_APPCHECK_DEBUG_TOKEN);
        (window as any).FIREBASE_APPCHECK_DEBUG_TOKEN = process.env.NEXT_PUBLIC_APPCHECK_DEBUG_TOKEN;
    } else {
        console.warn("[Firebase Lib V4 DEBUG] ==> App Check Debug Token NOT SET (neither hardcoded nor via env). For localhost/Studio, App Check might fail without it.");
    }
    // --- END TEMPORARY DEBUGGING ---

    if (missingKeys.length === 0) {
        try {
            if (!getApps().length) {
                console.log("[Firebase Lib V4 DEBUG] Initializing Firebase app with config for project:", firebaseConfig.projectId);
                app = initializeApp(firebaseConfig);
            } else {
                app = getApp();
                console.log("[Firebase Lib V4 DEBUG] Firebase app already initialized for project:", app.options.projectId);
            }

            if (app && !appCheckInstance) {
                // Use a placeholder if the reCAPTCHA key is not set, to allow provider instantiation
                // The debug token should take precedence in dev environments anyway.
                const recaptchaSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || "PLACEHOLDER_RECAPTCHA_KEY_FOR_PROVIDER_INIT";
                if (process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY) {
                    console.log("[Firebase Lib V4 DEBUG] ReCaptcha Site Key for provider:", recaptchaSiteKey);
                } else {
                    console.warn("[Firebase Lib V4 DEBUG] NEXT_PUBLIC_RECAPTCHA_SITE_KEY not found. Using placeholder for ReCaptchaV3Provider instantiation. Debug token should be active.");
                }
                
                console.log("[Firebase Lib V4 DEBUG] Value of window.FIREBASE_APPCHECK_DEBUG_TOKEN JUST BEFORE App Check Init:", (window as any).FIREBASE_APPCHECK_DEBUG_TOKEN);
                
                try {
                    appCheckInstance = initializeAppCheck(app, {
                        provider: new ReCaptchaV3Provider(recaptchaSiteKey),
                        isTokenAutoRefreshEnabled: true
                    });
                    console.log("[Firebase Lib V4 DEBUG] Firebase App Check initialization call completed successfully.");
                } catch (appCheckError) {
                    console.error("[Firebase Lib V4 DEBUG] CRITICAL ERROR initializing Firebase App Check:", appCheckError);
                }
            }

            if (app) {
                db = getFirestore(app);
                authInstance = getAuth(app);
                console.log("[Firebase Lib V4 DEBUG] Firebase App, Firestore, and Auth setup attempted.");
            } else {
                 console.error("[Firebase Lib V4 DEBUG] Firebase app could not be obtained after checks.");
            }

        } catch (error) {
            console.error("[Firebase Lib V4 DEBUG] Firebase initialization failed:", error);
            if (missingKeys.length > 0) {
                alert(`Erro de configuração do Firebase: Chaves CRÍTICAS ausentes: ${missingKeys.join(', ')}. Verifique o console e o arquivo .env.`);
            } else {
                alert("Falha ao inicializar a conexão com o servidor. Verifique a configuração do Firebase.");
            }
        }
    } else {
        console.warn("[Firebase Lib V4 DEBUG] Firebase Web App initialization skipped due to missing CRITICAL configuration keys:", missingKeys.join(', '), ". Check .env file.");
        alert(`Erro de configuração do Firebase: Chaves CRÍTICAS ausentes: ${missingKeys.join(', ')}. Verifique seu arquivo .env e recarregue a página.`);
    }
} else {
    console.log("[Firebase Lib V4 DEBUG] Skipping client-side Firebase initialization (not in browser).");
}

export const getFirebaseApp = (): FirebaseApp | null => {
    if (!app && typeof window !== 'undefined' && getApps().length > 0) {
        app = getApp(); // Ensure app is retrieved if already initialized by another part
    }
    return app;
};

export const getDb = (): Firestore | null => {
    const currentApp = getFirebaseApp();
    if (!db && currentApp) { // Initialize db if not already and app exists
        db = getFirestore(currentApp);
    }
    return db;
}

export const getAuthInstance = (): Auth | null => {
    const currentApp = getFirebaseApp();
    if (!authInstance && currentApp) { // Initialize authInstance if not already and app exists
        authInstance = getAuth(currentApp);
    }
    return authInstance;
}

export const getAppCheckInstance = (): AppCheck | null => {
    if (!appCheckInstance && app) { // Attempt to initialize if called and not set, though primary init is above
        console.warn("[Firebase Lib V4 DEBUG] getAppCheckInstance called, attempting re-check of App Check instance.");
         const recaptchaSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || "PLACEHOLDER_RECAPTCHA_KEY_FOR_PROVIDER_INIT";
        try {
            appCheckInstance = initializeAppCheck(app, { // This might re-initialize or get existing
                provider: new ReCaptchaV3Provider(recaptchaSiteKey),
                isTokenAutoRefreshEnabled: true
            });
        } catch (e) {
            console.error("[Firebase Lib V4 DEBUG] Error in getAppCheckInstance re-check:", e)
        }
    }
    return appCheckInstance;
}
