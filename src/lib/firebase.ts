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

if (typeof window !== 'undefined') { // Ensure this runs only on the client-side for App Check client setup
    if (missingKeys.length === 0) {
        try {
            if (!getApps().length) {
                console.log("[Firebase Lib V3] Initializing Firebase app with config:", firebaseConfig);
                app = initializeApp(firebaseConfig);

                // Setup App Check Debug Token (Must be done BEFORE initializeAppCheck)
                if (process.env.NODE_ENV === 'development') {
                    const debugToken = process.env.NEXT_PUBLIC_APPCHECK_DEBUG_TOKEN;
                    if (debugToken) {
                        console.log("[Firebase Lib V3] USING APP CHECK DEBUG TOKEN:", debugToken);
                        (window as any).FIREBASE_APPCHECK_DEBUG_TOKEN = debugToken;
                    } else {
                        console.warn("[Firebase Lib V3] App Check: NEXT_PUBLIC_APPCHECK_DEBUG_TOKEN not found for development. reCAPTCHA will be attempted if site key is present.");
                    }
                }

                // Initialize App Check
                const recaptchaSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
                if (app && recaptchaSiteKey) {
                    console.log("[Firebase Lib V3] Initializing App Check with ReCaptchaV3Provider using site key:", recaptchaSiteKey);
                    try {
                        appCheckInstance = initializeAppCheck(app, {
                            provider: new ReCaptchaV3Provider(recaptchaSiteKey),
                            isTokenAutoRefreshEnabled: true
                        });
                        console.log("[Firebase Lib V3] Firebase App Check initialized successfully.");
                    } catch (appCheckError) {
                        console.error("[Firebase Lib V3] Error initializing Firebase App Check:", appCheckError);
                    }
                } else if (app && !recaptchaSiteKey) {
                    console.warn("[Firebase Lib V3] App Check: NEXT_PUBLIC_RECAPTCHA_SITE_KEY not found. App Check with reCAPTCHA will not be initialized.");
                }

            } else {
                app = getApp();
                // Ensure App Check is initialized if app already exists but appCheckInstance is not set (e.g., HMR)
                if (app && !appCheckInstance) {
                    if (process.env.NODE_ENV === 'development') {
                        const debugToken = process.env.NEXT_PUBLIC_APPCHECK_DEBUG_TOKEN;
                        // Re-apply debug token if not already set on window (might be needed on HMR)
                        if (debugToken && !(window as any).FIREBASE_APPCHECK_DEBUG_TOKEN) {
                            console.log("[Firebase Lib V3] Re-applying App Check DEBUG TOKEN on HMR:", debugToken);
                            (window as any).FIREBASE_APPCHECK_DEBUG_TOKEN = debugToken;
                        }
                    }
                    const recaptchaSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
                    if (recaptchaSiteKey) {
                        console.log("[Firebase Lib V3] Initializing App Check for existing app instance using site key:", recaptchaSiteKey);
                         try {
                            appCheckInstance = initializeAppCheck(app, {
                                provider: new ReCaptchaV3Provider(recaptchaSiteKey),
                                isTokenAutoRefreshEnabled: true
                            });
                            console.log("[Firebase Lib V3] Firebase App Check initialized successfully for existing app.");
                        } catch (appCheckError) {
                             console.error("[Firebase Lib V3] Error re-initializing App Check for existing app:", appCheckError);
                        }
                    } else {
                        console.warn("[Firebase Lib V3] App Check: NEXT_PUBLIC_RECAPTCHA_SITE_KEY not found for existing app. App Check with reCAPTCHA not initialized.");
                    }
                }
            }

            if (app) {
                db = getFirestore(app);
                authInstance = getAuth(app);
                console.log("[Firebase Lib V3] Firebase App, Firestore, and Auth initialized successfully.");
            } else {
                 console.error("[Firebase Lib V3] Firebase app could not be initialized.");
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
    console.log("[Firebase Lib V3] Skipping client-side Firebase initialization (not in browser or critical keys missing).");
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
    const currentApp = getFirebaseApp();
    if (!appCheckInstance && currentApp && typeof window !== 'undefined') {
        // Attempt re-initialization if called and not initialized, only on client
        if (process.env.NODE_ENV === 'development') {
            const debugToken = process.env.NEXT_PUBLIC_APPCHECK_DEBUG_TOKEN;
            if (debugToken && !(window as any).FIREBASE_APPCHECK_DEBUG_TOKEN) {
                 console.log("[Firebase Lib V3] Applying App Check DEBUG TOKEN in getter:", debugToken);
                (window as any).FIREBASE_APPCHECK_DEBUG_TOKEN = debugToken;
            }
        }
        const recaptchaSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
        if (recaptchaSiteKey) {
            try {
                console.log("[Firebase Lib V3] Attempting to initialize App Check in getter using site key:", recaptchaSiteKey);
                appCheckInstance = initializeAppCheck(currentApp, {
                    provider: new ReCaptchaV3Provider(recaptchaSiteKey),
                    isTokenAutoRefreshEnabled: true
                });
                console.log("[Firebase Lib V3] Firebase App Check initialized successfully in getter.");
            } catch (e) {
                console.error("[Firebase Lib V3] Error re-initializing App Check in getter:", e);
            }
        } else {
             console.warn("[Firebase Lib V3] App Check: NEXT_PUBLIC_RECAPTCHA_SITE_KEY not found in getter. App Check not initialized.");
        }
    }
    return appCheckInstance;
}
