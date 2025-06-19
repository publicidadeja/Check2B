
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

const requiredConfigKeysForInit: (keyof typeof firebaseConfig)[] = [
    'apiKey',
    'authDomain',
    'projectId',
];

if (typeof window !== 'undefined') {
    console.log("[Firebase Lib V6 DEBUG] Running in browser environment.");
    console.log("[Firebase Lib V6 DEBUG] NODE_ENV:", process.env.NODE_ENV);
    console.log("[Firebase Lib V6 DEBUG] Verifying Firebase config keys used by the app:");

    const expectedKeysAndConfigValues: { [key: string]: { envVarName: string, value: string | undefined } } = {
        apiKey: { envVarName: 'NEXT_PUBLIC_FIREBASE_API_KEY', value: firebaseConfig.apiKey },
        authDomain: { envVarName: 'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN', value: firebaseConfig.authDomain },
        projectId: { envVarName: 'NEXT_PUBLIC_FIREBASE_PROJECT_ID', value: firebaseConfig.projectId },
        storageBucket: { envVarName: 'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET', value: firebaseConfig.storageBucket },
        messagingSenderId: { envVarName: 'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID', value: firebaseConfig.messagingSenderId },
        appId: { envVarName: 'NEXT_PUBLIC_FIREBASE_APP_ID', value: firebaseConfig.appId },
    };

    let allRequiredPresent = true;
    requiredConfigKeysForInit.forEach(key => {
        if (!firebaseConfig[key]) {
            allRequiredPresent = false;
        }
    });

    Object.entries(expectedKeysAndConfigValues).forEach(([configKey, { envVarName, value }]) => {
        const isRequired = requiredConfigKeysForInit.includes(configKey as keyof typeof firebaseConfig);
        const status = value ? 'Present' : 'MISSING or Undefined';
        console.log(`  - ${configKey} (from ${envVarName}): ${status}${isRequired && !value ? ' (CRITICAL!)' : ''}`);
    });

    const recaptchaSiteKeyFromEnv = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
    const appCheckDebugTokenFromEnv = process.env.NEXT_PUBLIC_APPCHECK_DEBUG_TOKEN;

    console.log("[Firebase Lib V6 DEBUG] NEXT_PUBLIC_RECAPTCHA_SITE_KEY from env:", recaptchaSiteKeyFromEnv || "NOT SET");
    console.log("[Firebase Lib V6 DEBUG] NEXT_PUBLIC_APPCHECK_DEBUG_TOKEN from env:", appCheckDebugTokenFromEnv || "NOT SET");

    if (process.env.NODE_ENV === 'development' && appCheckDebugTokenFromEnv) {
        console.log("[Firebase Lib V6 DEBUG] ==> USING App Check DEBUG TOKEN from process.env:", appCheckDebugTokenFromEnv);
        (window as any).FIREBASE_APPCHECK_DEBUG_TOKEN = appCheckDebugTokenFromEnv;
    } else if (process.env.NODE_ENV === 'development') {
        console.warn("[Firebase Lib V6 DEBUG] ==> App Check Debug Token NOT SET via env. For localhost/Studio, App Check might fail without it if reCAPTCHA v3 doesn't validate localhost well.");
    }


    if (allRequiredPresent) {
        try {
            if (!getApps().length) {
                console.log("[Firebase Lib V6 DEBUG] Initializing Firebase app with config for project:", firebaseConfig.projectId);
                app = initializeApp(firebaseConfig);
            } else {
                app = getApp();
                console.log("[Firebase Lib V6 DEBUG] Firebase app already initialized for project:", app.options.projectId);
            }

            if (app && !appCheckInstance) {
                const recaptchaSiteKeyForProvider = recaptchaSiteKeyFromEnv || "PLACEHOLDER_RECAPTCHA_KEY_FOR_PROVIDER_INIT";
                if (recaptchaSiteKeyFromEnv) {
                    console.log("[Firebase Lib V6 DEBUG] ReCaptcha Site Key for provider:", recaptchaSiteKeyForProvider);
                } else {
                    console.warn("[Firebase Lib V6 DEBUG] NEXT_PUBLIC_RECAPTCHA_SITE_KEY not found in env. Using placeholder for ReCaptchaV3Provider instantiation. Debug token should be active for App Check to work on localhost if reCAPTCHA is not configured correctly for it.");
                }
                
                console.log("[Firebase Lib V6 DEBUG] Value of window.FIREBASE_APPCHECK_DEBUG_TOKEN JUST BEFORE App Check Init:", (window as any).FIREBASE_APPCHECK_DEBUG_TOKEN);
                
                try {
                    appCheckInstance = initializeAppCheck(app, {
                        provider: new ReCaptchaV3Provider(recaptchaSiteKeyForProvider),
                        isTokenAutoRefreshEnabled: true
                    });
                    console.log("[Firebase Lib V6 DEBUG] Firebase App Check initialization call completed successfully.");
                } catch (appCheckError: any) {
                    console.error("[Firebase Lib V6 DEBUG] CRITICAL ERROR initializing Firebase App Check:", appCheckError);
                    console.error("[Firebase Lib V6 DEBUG] App Check Error Details:", appCheckError.code, appCheckError.message);
                    if (appCheckError.message?.includes("reCAPTCHA V3 provider")) {
                        console.error("[Firebase Lib V6 DEBUG] This often means the ReCaptcha Site Key is invalid, not configured for this domain, or the reCAPTCHA API is not enabled in Google Cloud.");
                    }
                }
            }

            if (app) {
                db = getFirestore(app);
                authInstance = getAuth(app);
                console.log("[Firebase Lib V6 DEBUG] Firebase App, Firestore, and Auth setup attempted.");
            } else {
                 console.error("[Firebase Lib V6 DEBUG] Firebase app could not be obtained after checks.");
            }

        } catch (error) {
            console.error("[Firebase Lib V6 DEBUG] Firebase initialization failed:", error);
            if (!allRequiredPresent) {
                alert(`Erro de configuração do Firebase: Chaves CRÍTICAS ausentes. Verifique o console (F12) e suas variáveis de ambiente.`);
            } else {
                alert("Falha ao inicializar a conexão com o servidor. Verifique a configuração do Firebase e o console (F12).");
            }
        }
    } else {
        const missingCriticalKeys = requiredConfigKeysForInit.filter(key => !firebaseConfig[key])
                                     .map(key => expectedKeysAndConfigValues[key]?.envVarName || key);
        console.error("[Firebase Lib V6 DEBUG] Firebase Web App initialization SKIPPED due to missing CRITICAL configuration keys:", missingCriticalKeys.join(', '), ". Check your environment variables.");
        alert(`Erro de configuração do Firebase: Chaves CRÍTICAS ausentes: ${missingCriticalKeys.join(', ')}. Verifique suas variáveis de ambiente e recarregue a página.`);
    }
} else {
    console.log("[Firebase Lib V6 DEBUG] Skipping client-side Firebase initialization (not in browser).");
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
    if (!appCheckInstance && app) { 
        console.warn("[Firebase Lib V6 DEBUG] getAppCheckInstance called, attempting re-check of App Check instance.");
         const recaptchaSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || "PLACEHOLDER_RECAPTCHA_KEY_FOR_PROVIDER_INIT";
        try {
            appCheckInstance = initializeAppCheck(app, { 
                provider: new ReCaptchaV3Provider(recaptchaSiteKey),
                isTokenAutoRefreshEnabled: true
            });
        } catch (e) {
            console.error("[Firebase Lib V6 DEBUG] Error in getAppCheckInstance re-check:", e)
        }
    }
    return appCheckInstance;
}
