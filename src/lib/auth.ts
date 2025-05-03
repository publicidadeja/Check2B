
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
    createUserWithEmailAndPassword, // Import for user creation
    updateProfile // Import for updating user profile (e.g., displayName)
} from "firebase/auth";
import Cookies from 'js-cookie'; // Using js-cookie for client-side cookie management
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore"; // Firestore for user profile data
import { getFirebaseApp } from "./firebase"; // Import the getFirebaseApp function

// --- Firebase Configuration ---
// Ensure these environment variables are set in your .env.local file
// No changes needed here if your Firebase config setup is already correct

// --- Initialize Firebase App and Services ---
let app = getFirebaseApp(); // Use the centralized app instance
let auth: ReturnType<typeof getAuth> | null = null;
let db: ReturnType<typeof getFirestore> | null = null;

if (app) {
    try {
        auth = getAuth(app);
        db = getFirestore(app);
        console.log("Firebase Auth and Firestore initialized successfully.");
    } catch (error) {
        console.error("Error initializing Firebase Auth/Firestore:", error);
        // Optionally alert the user or handle the error in a user-facing way
         if (typeof window !== 'undefined') {
             alert("Falha ao inicializar a conexão com o servidor de autenticação/banco de dados. Verifique a configuração.");
         }
    }
} else {
     if (typeof window !== 'undefined') {
        console.warn("Firebase App not initialized, Auth/Firestore setup skipped.");
     }
}


// --- Authentication Functions ---

/**
 * Logs in a user with email and password. Retrieves role and orgId from Firestore.
 * @param email User's email
 * @param password User's password
 * @returns Promise resolving to UserCredential & user data on success
 */
export const loginUser = async (email: string, password: string): Promise<{ userCredential: UserCredential, userData: { role: string, organizationId: string | null } }> => {
    if (!auth || !db) {
        throw new Error("Firebase Auth or Firestore is not initialized. Check configuration.");
    }
    await setPersistence(auth, browserSessionPersistence);
    const userCredential = await signInWithEmailAndPassword(auth, email, password);

    // Fetch user role and organizationId from Firestore after login
    const userDocRef = doc(db, "users", userCredential.user.uid);
    const userDocSnap = await getDoc(userDocRef);

    if (!userDocSnap.exists()) {
        // Handle case where user exists in Auth but not Firestore (should not happen ideally)
        await signOut(auth); // Sign out the user
        throw new Error("Perfil de usuário não encontrado no banco de dados.");
    }

    const userData = userDocSnap.data();
    const role = userData.role || 'collaborator'; // Default role
    const organizationId = userData.organizationId || null; // Organization might be null for super_admin

    // Set cookies (consider adding role/orgId here if needed immediately client-side, but custom claims are preferred)
    const idToken = await userCredential.user.getIdToken(true); // Get token for cookie
    setAuthCookie(idToken, role, organizationId); // Pass role and orgId

    return {
        userCredential,
        userData: { role, organizationId }
    };
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
    // Remove auth cookies on logout
    Cookies.remove('auth-token');
    Cookies.remove('user-role');
    Cookies.remove('organization-id');
    Cookies.remove('guest-mode');
};

/**
 * Sets authentication cookies client-side.
 * For production, setting secure, HttpOnly cookies server-side is recommended.
 * @param idToken Firebase ID token
 * @param role User's role
 * @param organizationId User's organization ID (can be null)
 */
export const setAuthCookie = (idToken: string, role: string, organizationId: string | null): void => {
    const cookieOptions: Cookies.CookieAttributes = {
        // secure: process.env.NODE_ENV === 'production', // Use secure in production
        secure: false, // Temporarily disable secure for local dev if not using HTTPS
        sameSite: 'lax',
        path: '/',
        expires: 1 // Example: expires in 1 day
    };

    Cookies.set('auth-token', idToken, cookieOptions);
    Cookies.set('user-role', role, cookieOptions);
    if (organizationId) {
        Cookies.set('organization-id', organizationId, cookieOptions);
    } else {
        Cookies.remove('organization-id'); // Remove if null (e.g., super_admin)
    }
    // Remove guest mode cookie upon successful login
    Cookies.remove('guest-mode');
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
            unsubscribe();
            resolve(user);
        }, reject);
    });
};


/**
 * Gets the user's role and organization ID from Firestore.
 * @param userId Firebase User ID
 * @returns Promise resolving to { role, organizationId } or null if not found.
 */
export const getUserProfileData = async (userId: string): Promise<{ role: string, organizationId: string | null } | null> => {
     if (!db) {
        console.error("Firestore not initialized. Cannot get user profile.");
        return null;
    }
    const userDocRef = doc(db, "users", userId);
    const userDocSnap = await getDoc(userDocRef);

    if (userDocSnap.exists()) {
        const data = userDocSnap.data();
        return {
            role: data.role || 'collaborator',
            organizationId: data.organizationId || null,
        };
    } else {
        console.warn(`User profile not found in Firestore for UID: ${userId}`);
        return null;
    }
};


/**
 * Creates a new user with email and password, and saves profile data to Firestore.
 * Typically called by Super Admin or an Admin within their organization.
 * @param email User's email
 * @param password User's password
 * @param name User's display name
 * @param role User's role ('admin' or 'collaborator')
 * @param organizationId ID of the organization the user belongs to
 * @returns Promise resolving to the created User object
 */
export const createUserWithProfile = async (
    email: string,
    password: string,
    name: string,
    role: 'admin' | 'collaborator',
    organizationId: string
): Promise<User> => {
     if (!auth || !db) {
        throw new Error("Firebase Auth or Firestore is not initialized.");
    }
     if (!organizationId) {
        throw new Error("Organization ID is required to create a user.");
     }

     // 1. Create user in Firebase Auth
     const userCredential = await createUserWithEmailAndPassword(auth, email, password);
     const user = userCredential.user;

     // 2. Update Auth profile (optional, but good practice)
     await updateProfile(user, { displayName: name });

     // 3. Set Custom Claims (IMPORTANT FOR SECURITY - Usually done server-side/Firebase Functions)
     // **WARNING:** Setting claims client-side is insecure. This is a placeholder.
     // In a real app, trigger a Firebase Function after user creation to set claims.
     console.warn("Setting custom claims client-side is INSECURE. Move this logic to a backend function.");
     // Example (Insecure): await user.getIdToken(true); // Refresh token to potentially pick up claims if set server-side quickly
     // You would typically call a function like:
     // await callFirebaseFunction('setCustomClaims', { uid: user.uid, role, organizationId });

     // 4. Create user profile in Firestore
     const userDocRef = doc(db, "users", user.uid);
     await setDoc(userDocRef, {
         uid: user.uid, // Store UID for easier querying
         name: name,
         email: email,
         role: role,
         organizationId: organizationId,
         createdAt: new Date(), // Use server timestamp in production: serverTimestamp()
         status: 'active',
         // Add other relevant profile fields (department, phone, etc.) as needed
     });

     console.log(`User profile created in Firestore for ${name} (${email}) in org ${organizationId}`);
     return user;
};


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

// Export auth and db instances if needed elsewhere
export { auth, db };
