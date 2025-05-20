// src/lib/firebase.ts
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore"; // Import Firestore type and function
import { getAuth } from "firebase/auth"; // Import getAuth

// Ensure these environment variables are set in your .env.local file
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


const requiredConfigKeys: (keyof typeof firebaseConfig)[] = [
    'apiKey',
    'authDomain',
    'projectId',
    // 'storageBucket', // Storage Bucket pode ser opcional se não estiver usando Storage
    // 'messagingSenderId', // Messaging Sender ID pode ser opcional se não estiver usando FCM
    // 'appId', // App ID pode ser opcional para algumas configurações básicas
];

const missingKeys = requiredConfigKeys.filter(key => !firebaseConfig[key]);

// Permitir inicialização no lado do servidor (para Cloud Functions, por exemplo)
// ou se todas as chaves obrigatórias estiverem presentes no cliente.
if (typeof window === 'undefined' || missingKeys.length === 0) {
    try {
        if (!getApps().length) {
            console.log("Initializing Firebase app with config:", firebaseConfig);
            if (missingKeys.length > 0 && typeof window !== 'undefined') {
                console.warn("Firebase Web App config is missing keys:", missingKeys.join(', '));
                // Considerar não inicializar ou mostrar um erro mais proeminente se chaves CRÍTICAS faltarem
            }
            app = initializeApp(firebaseConfig);
        } else {
            app = getApp();
        }

        if (app) {
            db = getFirestore(app);
            authInstance = getAuth(app); // Initialize Auth instance
            console.log("Firebase App, Firestore, and Auth initialized successfully.");
        } else {
             console.error("Firebase app could not be initialized.");
        }

    } catch (error) {
        console.error("Firebase initialization failed:", error);
        if (typeof window !== 'undefined' && missingKeys.length > 0) {
            alert("Erro de configuração do Firebase. Algumas variáveis de ambiente CRÍTICAS estão faltando. Verifique o console para detalhes e o arquivo .env.");
        } else if (typeof window !== 'undefined') {
            // alert("Falha ao inicializar a conexão com o servidor. Verifique a configuração do Firebase.");
            console.error("Falha ao inicializar a conexão com o servidor. Verifique a configuração do Firebase no .env");
        }
    }
} else {
    if (typeof window !== 'undefined') {
        console.warn("Firebase Web App initialization skipped due to missing CRITICAL configuration keys:", missingKeys.join(', '), ". Check .env file.");
        alert(`Erro de configuração do Firebase: Chaves ausentes: ${missingKeys.join(', ')}. Verifique seu arquivo .env e recarregue a página.`);
    }
}

/**
 * Gets the initialized Firebase App instance.
 * Returns null if initialization failed or hasn't happened yet.
 */
export const getFirebaseApp = (): FirebaseApp | null => {
    if (!app && getApps().length > 0) { // Ensure app is initialized if others exist
        app = getApp();
    }
    return app;
};

/**
 * Gets the initialized Firestore instance.
 * Returns null if initialization failed or hasn't happened yet.
 */
export const getDb = (): Firestore | null => {
    if (!db && app) { // Ensure db is initialized if app exists
        db = getFirestore(app);
    }
    return db;
}

/**
 * Gets the initialized Firebase Auth instance.
 * Returns null if initialization failed or hasn't happened yet.
 */
export const getAuthInstance = (): ReturnType<typeof getAuth> | null => {
    if (!authInstance && app) { // Ensure auth is initialized if app exists
        authInstance = getAuth(app);
    }
    return authInstance;
}
