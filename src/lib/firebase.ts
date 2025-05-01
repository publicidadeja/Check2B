// src/lib/firebase.ts
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";

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

const requiredConfigKeys: (keyof typeof firebaseConfig)[] = [
    'apiKey',
    'authDomain',
    'projectId',
    'storageBucket',
    'messagingSenderId',
    'appId',
];

const missingKeys = requiredConfigKeys.filter(key => !firebaseConfig[key]);

if (missingKeys.length === 0 || typeof window === 'undefined') {
    try {
        app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
        console.log("Firebase App initialized successfully.");
    } catch (error) {
        console.error("Firebase initialization failed:", error);
        if (typeof window !== 'undefined') {
            alert("Falha ao inicializar a conexão com o servidor. Verifique a configuração.");
        }
    }
} else {
    if (typeof window !== 'undefined') {
        console.warn("Firebase initialization skipped due to missing configuration keys:", missingKeys.join(', '));
        alert("Erro de configuração do Firebase. Verifique as variáveis de ambiente e recarregue a página.");
    }
}

/**
 * Gets the initialized Firebase App instance.
 * Returns null if initialization failed or hasn't happened yet.
 */
export const getFirebaseApp = (): FirebaseApp | null => {
    return app;
};
