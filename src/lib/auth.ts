
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
    updateProfile, // Import for updating user profile (e.g., displayName)
    sendPasswordResetEmail // Import for password reset
} from "firebase/auth";
import Cookies from 'js-cookie'; // Using js-cookie for client-side cookie management
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore"; // Firestore for user profile data
import { getFirebaseApp } from "./firebase"; // Import the getFirebaseApp function
import type { UserProfile } from '@/types/user'; // Import UserProfile type

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
             // Commenting out alert for better DX during dev
             // alert("Falha ao inicializar a conexão com o servidor de autenticação/banco de dados. Verifique a configuração.");
             console.error("Falha ao inicializar a conexão com o servidor de autenticação/banco de dados. Verifique a configuração do Firebase no .env");
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
 * Special handling for the hardcoded super admin email.
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

    // Fetch user role and organizationId from Firestore
    const userDocRef = doc(db, "users", userCredential.user.uid);
    const userDocSnap = await getDoc(userDocRef);

    if (!userDocSnap.exists()) {
        // Handle case where user exists in Auth but not Firestore (should not happen ideally)
        await signOut(auth); // Sign out the user
        throw new Error("Perfil de usuário não encontrado no banco de dados.");
    }
    const userData = userDocSnap.data();
    const role: string = userData.role || 'collaborator'; // Assign fetched role or default
    const organizationId: string | null = userData.organizationId || null; // Assign fetched orgId or null
    console.log(`[Auth] User profile fetched: Role=${role}, OrgID=${organizationId}`);

    // Set cookies
    const idToken = await userCredential.user.getIdToken(true); // Get token for cookie
    setAuthCookie(idToken, role, organizationId); // Pass potentially overridden role and orgId

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
export const setAuthCookie = (idToken: string, role: string | null, organizationId: string | null): void => {
    const cookieOptions: Cookies.CookieAttributes = {
        // secure: process.env.NODE_ENV === 'production', // Use secure in production
        secure: false, // Temporarily disable secure for local dev if not using HTTPS
        sameSite: 'lax',
        path: '/',
        expires: 1 // Example: expires in 1 day
    };

    Cookies.set('auth-token', idToken, cookieOptions);
    // Only set role cookie if role is not null
    if (role) {
        Cookies.set('user-role', role, cookieOptions);
    } else {
        Cookies.remove('user-role');
    }
    if (organizationId) {
        Cookies.set('organization-id', organizationId, cookieOptions);
    } else {
        Cookies.remove('organization-id'); // Remove if null (e.g., super_admin or missing)
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
 * Gets the user's profile data from Firestore.
 * @param userId Firebase User ID
 * @returns Promise resolving to UserProfile or null if not found.
 */
export const getUserProfileData = async (userId: string): Promise<UserProfile | null> => {
     if (!db) {
        console.error("Firestore not initialized. Cannot get user profile.");
        return null;
    }
    const userDocRef = doc(db, "users", userId);
    const userDocSnap = await getDoc(userDocRef);

    if (userDocSnap.exists()) {
        const data = userDocSnap.data();
        return {
            uid: userId,
            name: data.name || 'Nome não definido',
            email: data.email,
            role: data.role || 'collaborator', // Default to collaborator
            organizationId: data.organizationId || null,
            createdAt: data.createdAt, // Keep as Firestore Timestamp or Date
            status: data.status || 'pending',
            photoUrl: data.photoUrl || undefined,
            department: data.department || undefined,
            phone: data.phone || undefined,
            isActive: data.isActive !== undefined ? data.isActive : true, // Add isActive with default
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
    role: 'admin' | 'collaborator' | 'super_admin', // Allow 'super_admin' type
    organizationId: string | null // Allow null for super_admin
): Promise<User> => {
     if (!auth || !db) {
        throw new Error("Firebase Auth or Firestore is not initialized.");
    }
     if (role !== 'super_admin' && !organizationId) { // Org ID required unless super_admin
        throw new Error("Organization ID is required to create a non-super_admin user.");
     }

     // 1. Create user in Firebase Auth
     const userCredential = await createUserWithEmailAndPassword(auth, email, password);
     const user = userCredential.user;

     // 2. Update Auth profile (optional, but good practice)
     await updateProfile(user, { displayName: name });

     // 3. Create user profile in Firestore
     const userDocRef = doc(db, "users", user.uid);
     await setDoc(userDocRef, {
         uid: user.uid, // Store UID for easier querying
         name: name,
         email: email,
         role: role,
         organizationId: organizationId, // Store null for super_admin
         createdAt: new Date(), // Use server timestamp in production: serverTimestamp()
         status: 'active',
         isActive: true, // Default to active
         // Add other relevant profile fields (department, phone, etc.) as needed
     });

     console.log(`User profile created in Firestore for ${name} (${email}) with role ${role} in org ${organizationId}`);
     return user;
};

/**
 * Sends a password reset email to the specified email address.
 * @param email The email address to send the reset link to.
 * @returns Promise resolving on successful email sending.
 */
export const sendPasswordReset = async (email: string): Promise<void> => {
    if (!auth) {
        throw new Error("Firebase Auth is not initialized.");
    }
    try {
        await sendPasswordResetEmail(auth, email);
        console.log(`[Auth] Password reset email sent to ${email}`);
    } catch (error: any) {
        console.error(`[Auth] Error sending password reset email to ${email}:`, error);
        // Rethrow specific errors or a generic one
        if (error.code === 'auth/user-not-found') {
             throw new Error("Nenhum usuário encontrado com este email.");
        } else if (error.code === 'auth/invalid-email') {
             throw new Error("O endereço de email fornecido é inválido.");
        } else {
            throw new Error("Falha ao enviar email de redefinição de senha.");
        }
    }
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

