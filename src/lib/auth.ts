
// src/lib/auth.ts
import {
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    setPersistence,
    browserSessionPersistence,
    type UserCredential,
    type User,
    createUserWithEmailAndPassword,
    updateProfile,
    sendPasswordResetEmail,
    EmailAuthProvider, // Import EmailAuthProvider
    reauthenticateWithCredential, // Import reauthenticateWithCredential
    updatePassword, // Import updatePassword
} from "firebase/auth";
import Cookies from 'js-cookie';
import { doc, getDoc, setDoc } from "firebase/firestore";
import { getAuthInstance, getDb } from "./firebase";
import type { UserProfile } from '@/types/user';

const auth = getAuthInstance();
const db = getDb();

/**
 * Logs in a user with email and password. Retrieves role and orgId from Firestore.
 * @param email User's email
 * @param password User's password
 * @returns Promise resolving to UserCredential & user data on success
 */
export const loginUser = async (email: string, password: string): Promise<{ userCredential: UserCredential, userData: { role: string, organizationId: string | null } }> => {
    if (!auth) {
        throw new Error("Firebase Auth is not initialized. Check configuration.");
    }
    if (!db) {
        throw new Error("Firebase Firestore is not initialized. Check configuration.");
    }

    await setPersistence(auth, browserSessionPersistence);
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    const userDocRef = doc(db, "users", user.uid);
    const userDocSnap = await getDoc(userDocRef);

    if (!userDocSnap.exists()) {
        await signOut(auth);
        throw new Error("Perfil de usuário não encontrado no banco de dados. Contate o suporte.");
    }
    const userDataFromDb = userDocSnap.data() as UserProfile;
    const role: string = userDataFromDb.role || 'collaborator';
    const organizationId: string | null = userDataFromDb.organizationId || null;

    console.log(`[Auth] User profile fetched: Role=${role}, OrgID=${organizationId}`);

    const idToken = await user.getIdToken(true);
    setAuthCookie(idToken, role, organizationId);

    return {
        userCredential,
        userData: { role, organizationId }
    };
};

export const logoutUser = async (): Promise<void> => {
    if (!auth) {
        console.warn("Firebase Auth not initialized, cannot log out.");
        return;
    }
    await signOut(auth);
    Cookies.remove('auth-token');
    Cookies.remove('user-role');
    Cookies.remove('organization-id');
    Cookies.remove('guest-mode');
    console.log("[Auth] User signed out and cookies cleared.");
};

export const setAuthCookie = (idToken: string, role: string | null, organizationId: string | null): void => {
    const cookieOptions: Cookies.CookieAttributes = {
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        expires: 1 // Expires in 1 day
    };

    Cookies.set('auth-token', idToken, cookieOptions);
    if (role) {
        Cookies.set('user-role', role, cookieOptions);
    } else {
        Cookies.remove('user-role');
    }
    if (organizationId) {
        Cookies.set('organization-id', organizationId, cookieOptions);
    } else {
        Cookies.remove('organization-id');
    }
    Cookies.remove('guest-mode');
};

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
            role: data.role || 'collaborator',
            organizationId: data.organizationId || null,
            createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : (data.createdAt ? new Date(data.createdAt) : new Date()),
            status: data.status || 'pending',
            photoUrl: data.photoUrl || undefined,
            department: data.department || undefined,
            userRole: data.userRole || undefined,
            phone: data.phone || undefined,
            admissionDate: data.admissionDate || undefined,
        } as UserProfile;
    } else {
        console.warn(`User profile not found in Firestore for UID: ${userId}`);
        return null;
    }
};

export const createUserWithProfile = async (
    email: string,
    password: string,
    name: string,
    role: 'admin' | 'collaborator' | 'super_admin',
    organizationId: string | null
): Promise<User> => {
     if (!auth || !db) {
        throw new Error("Firebase Auth or Firestore is not initialized.");
    }
     if (role !== 'super_admin' && !organizationId) {
        throw new Error("Organization ID is required to create a non-super_admin user.");
     }

     const userCredential = await createUserWithEmailAndPassword(auth, email, password);
     const user = userCredential.user;
     await updateProfile(user, { displayName: name });

     const userDocRef = doc(db, "users", user.uid);
     const userProfile: UserProfile = {
         uid: user.uid,
         name: name,
         email: email,
         role: role,
         organizationId: organizationId,
         createdAt: Timestamp.now(), // Use Timestamp for new docs
         status: 'active',
     };
     await setDoc(userDocRef, userProfile);

     console.log(`User profile created in Firestore for ${name} (${email}) with role ${role} in org ${organizationId}`);
     return user;
};

export const sendPasswordReset = async (email: string): Promise<void> => {
    if (!auth) {
        throw new Error("Firebase Auth is not initialized.");
    }
    try {
        await sendPasswordResetEmail(auth, email);
        console.log(`[Auth] Password reset email sent to ${email}`);
    } catch (error: any) {
        console.error(`[Auth] Error sending password reset email to ${email}:`, error);
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
 * Changes the current user's password.
 * Requires re-authentication with the current password.
 * @param currentPassword The user's current password.
 * @param newPassword The new password (must be at least 6 characters).
 * @returns Promise resolving on successful password change.
 */
export const changeUserPassword = async (currentPassword: string, newPassword: string): Promise<void> => {
    if (!auth) {
        throw new Error("Firebase Auth não inicializado.");
    }
    const user = auth.currentUser;
    if (!user || !user.email) {
        throw new Error("Nenhum usuário autenticado ou email do usuário não encontrado.");
    }

    const credential = EmailAuthProvider.credential(user.email, currentPassword);

    try {
        await reauthenticateWithCredential(user, credential);
        // User re-authenticated, now change password
        await updatePassword(user, newPassword);
        console.log("[Auth] Senha alterada com sucesso.");
    } catch (error: any) {
        console.error("[Auth] Erro ao alterar senha:", error);
        if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
            throw new Error("Senha atual incorreta.");
        } else if (error.code === 'auth/weak-password') {
            throw new Error("Nova senha é muito fraca. Use pelo menos 6 caracteres.");
        } else if (error.code === 'auth/requires-recent-login') {
             throw new Error("Esta operação é sensível e requer autenticação recente. Faça login novamente e tente outra vez.");
        }
        throw new Error("Falha ao alterar senha. Tente novamente.");
    }
};


export const onAuthChange = (callback: (user: User | null) => void) => {
    if (!auth) {
        console.warn("Firebase Auth not initialized. Cannot attach listener.");
        return () => {};
    }
    return onAuthStateChanged(auth, callback);
};

export { auth, db };
