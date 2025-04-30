
// src/lib/auth.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import {
    getAuth,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    setPersistence,
    browserSessionPersistence, // Or browserLocalPersistence for longer persistence
    type UserCredential,
    type User,
    createUserWithEmailAndPassword // Import for user creation
} from "firebase/auth";
import Cookies from 'js-cookie'; // Using js-cookie for client-side cookie management

// --- Firebase Configuration ---
// Ensure these environment variables are set in your .env.local file
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// --- Check for missing Firebase config ---
const requiredConfigKeys: (keyof typeof firebaseConfig)[] = [
    'apiKey',
    'authDomain',
    'projectId',
    'storageBucket',
    'messagingSenderId',
    'appId',
];

const missingKeys = requiredConfigKeys.filter(key => !firebaseConfig[key]);

if (missingKeys.length > 0 && typeof window !== 'undefined') { // Only show error client-side initially
  console.error(`Client-side Error: Missing Firebase configuration keys in environment variables: ${missingKeys.join(', ')}. Please check your .env file and ensure it's loaded correctly.`);
  // Consider showing a user-friendly message instead of just logging
}


// --- Initialize Firebase ---
let app;
let auth: ReturnType<typeof getAuth> | null = null; // Initialize auth as potentially null

try {
  // Only initialize if config seems complete OR if on server (where different env var setup might exist)
  if (missingKeys.length === 0 || typeof window === 'undefined') {
    app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    console.log("Firebase initialized successfully."); // Add success log
  } else {
      // Log warning on client-side if keys are missing
      if (typeof window !== 'undefined') {
          console.warn("Firebase initialization skipped due to missing configuration keys:", missingKeys.join(', '));
          alert("Erro de configuração do Firebase. Verifique as variáveis de ambiente e recarregue a página."); // Alert user
      }
  }
} catch (error) {
    console.error("Firebase initialization failed:", error);
    // Optionally alert the user or handle the error in a user-facing way
     if (typeof window !== 'undefined') {
       alert("Falha ao inicializar a conexão com o servidor de autenticação. Verifique a configuração.");
     }
}


// --- Authentication Functions ---

/**
 * Logs in a user with email and password.
 * @param email User's email
 * @param password User's password
 * @returns Promise resolving to UserCredential on success
 */
export const loginUser = async (email: string, password: string): Promise<UserCredential> => {
    if (!auth) {
        throw new Error("Firebase Auth is not initialized. Check configuration and console logs.");
    }
    // Set session persistence (optional, adjust as needed)
    await setPersistence(auth, browserSessionPersistence);
    return signInWithEmailAndPassword(auth, email, password);
};

/**
 * Logs out the current user.
 * @returns Promise resolving on successful logout
 */
export const logoutUser = async (): Promise<void> => {
    if (!auth) {
        console.warn("Firebase Auth not initialized, cannot log out.");
        return;
    }
    await signOut(auth);
    // Remove the auth cookie on logout
    Cookies.remove('auth-token');
};

/**
 * Sets the authentication token as an HTTP-only cookie (server-side).
 * This function needs to be called from a Server Action or API Route.
 * For client-side redirection after login, we'll set a regular cookie first.
 * @param idToken Firebase ID token
 */
export const setAuthCookie = async (idToken: string): Promise<void> => {
    // Client-side cookie for immediate use after login (non-HttpOnly)
    Cookies.set('auth-token', idToken, {
        secure: process.env.NODE_ENV === 'production', // Use secure in production
        sameSite: 'lax', // Adjust SameSite policy as needed
        path: '/', // Accessible across the site
        // expires: 1 // Expires in 1 day, adjust as needed
    });

    // TODO: Implement server-side cookie setting via API Route/Server Action if needed for SSR/API routes
    // Example using an API route:
    // try {
    //   const response = await fetch('/api/auth/set-cookie', {
    //       method: 'POST',
    //       headers: { 'Content-Type': 'application/json' },
    //       body: JSON.stringify({ idToken }),
    //   });
    //   if (!response.ok) {
    //       console.error("Failed to set server-side auth cookie:", await response.text());
    //   }
    // } catch (error) {
    //    console.error("Error calling set-cookie API:", error);
    // }
};


/**
 * Gets the current authentication state.
 * @returns A promise that resolves with the current user or null.
 */
export const getCurrentUser = (): Promise<User | null> => {
    if (!auth) {
        console.warn("Firebase Auth not initialized. Cannot get current user.");
        return Promise.resolve(null);
    }
    return new Promise((resolve, reject) => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            unsubscribe(); // Unsubscribe after getting the initial state
            resolve(user);
        }, reject);
    });
};


/**
 * Gets the user's role from the ID token claims.
 * This requires the custom claims to be set (e.g., via Firebase Functions).
 * @param user Firebase User object
 * @returns The user's role ('admin', 'colaborador', or 'unknown')
 */
export const getUserRole = async (user: User | null): Promise<'admin' | 'colaborador' | 'unknown'> => {
    if (!user) {
        return 'unknown';
    }
    try {
        // Force refresh is true by default in getIdTokenResult, ensures fresh claims
        const idTokenResult = await user.getIdTokenResult(true);
        console.log("[getUserRole] Claims:", idTokenResult.claims); // Log claims for debugging
        return idTokenResult.claims.role || 'colaborador'; // Default to 'colaborador' if claim is missing
    } catch (error) {
        console.error("Error getting user role from token claims:", error);
        return 'unknown'; // Return unknown on error
    }
};

/**
 * Creates a new user with email and password.
 * IMPORTANT: This should typically be done server-side (e.g., Cloud Function)
 * to manage roles securely. Exposing this client-side is risky unless properly secured.
 * @param email User's email
 * @param password User's password
 * @returns Promise resolving to UserCredential on success
 */
export const createUser = async (email: string, password: string): Promise<UserCredential> => {
     if (!auth) {
        throw new Error("Firebase Auth is not initialized. Check configuration.");
    }
     console.warn("Creating user client-side. Ensure proper security measures are in place.");
     // In a real app, you'd likely call a backend function here to create the user
     // AND set their custom claims (role) securely.
    return createUserWithEmailAndPassword(auth, email, password);
};


// --- Listener for Auth State Changes ---
/**
 * Attaches a listener for authentication state changes.
 * @param callback Function to call when the auth state changes
 * @returns Unsubscribe function
 */
export const onAuthChange = (callback: (user: User | null) => void) => {
    if (!auth) {
        console.warn("Firebase Auth not initialized. Cannot attach listener.");
        return () => {}; // Return an empty unsubscribe function
    }
    return onAuthStateChanged(auth, callback);
};

// Export auth instance if needed elsewhere
export { auth };
