
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
    type User
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

// --- Initialize Firebase ---
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

// --- Authentication Functions ---

/**
 * Logs in a user with email and password.
 * @param email User's email
 * @param password User's password
 * @returns Promise resolving to UserCredential on success
 */
export const loginUser = async (email: string, password: string): Promise<UserCredential> => {
    // Set session persistence (optional, adjust as needed)
    await setPersistence(auth, browserSessionPersistence);
    return signInWithEmailAndPassword(auth, email, password);
};

/**
 * Logs out the current user.
 * @returns Promise resolving on successful logout
 */
export const logoutUser = async (): Promise<void> => {
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
        // secure: process.env.NODE_ENV === 'production', // Use secure in production
        // sameSite: 'lax', // Adjust SameSite policy as needed
        // path: '/', // Accessible across the site
        // expires: 1 // Expires in 1 day, adjust as needed
    });

    // TODO: Implement server-side cookie setting via API Route/Server Action
    // Example using an API route:
    // await fetch('/api/auth/set-cookie', {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify({ idToken }),
    // });
};

/**
 * Gets the current authentication state.
 * @returns A promise that resolves with the current user or null.
 */
export const getCurrentUser = (): Promise<User | null> => {
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
        const idTokenResult = await user.getIdTokenResult(true); // Force refresh token if needed
        return idTokenResult.claims.role || 'colaborador'; // Default to 'colaborador' if claim is missing
    } catch (error) {
        console.error("Error getting user role:", error);
        return 'unknown'; // Return unknown on error
    }
};


// --- Listener for Auth State Changes ---
/**
 * Attaches a listener for authentication state changes.
 * @param callback Function to call when the auth state changes
 * @returns Unsubscribe function
 */
export const onAuthChange = (callback: (user: User | null) => void) => {
    return onAuthStateChanged(auth, callback);
};

// Export auth instance if needed elsewhere
export { auth };
