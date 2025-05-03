
// src/hooks/use-auth.ts
'use client';

import * as React from 'react';
import Cookies from 'js-cookie';
import type { User } from 'firebase/auth';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { auth, db } from '@/lib/auth'; // Import auth and db from the central auth file
import { useRouter, usePathname } from 'next/navigation'; // Import useRouter and usePathname

type UserRole = 'super_admin' | 'admin' | 'collaborator' | null;

interface AuthState {
  user: User | null;
  role: UserRole;
  organizationId: string | null;
  isLoading: boolean;
  isGuest: boolean;
}

interface AuthContextProps extends AuthState {
  logout: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextProps | undefined>(undefined);

// --- Helper Functions ---

const getUserProfileData = async (userId: string): Promise<{ role: UserRole, organizationId: string | null } | null> => {
    if (!db) {
        console.error("[Auth Provider] Firestore not initialized. Cannot get user profile.");
        return null;
    }
    const userDocRef = doc(db, "users", userId);
    try {
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
            const data = userDocSnap.data();
            const role = data.role as UserRole | undefined;
            const organizationId = data.organizationId as string | undefined | null;

            if (!role || !['super_admin', 'admin', 'collaborator'].includes(role)) {
                console.warn(`[Auth Provider] Invalid or missing role ('${role}') in Firestore for UID: ${userId}`);
                return { role: 'collaborator', organizationId: organizationId ?? null };
            }

            return {
                role: role,
                organizationId: organizationId ?? null,
            };
        } else {
            console.warn(`[Auth Provider] User profile not found in Firestore for UID: ${userId}`);
            return null;
        }
    } catch (error) {
        console.error(`[Auth Provider] Error fetching Firestore profile for UID ${userId}:`, error);
        return null;
    }
};


const logoutUserHelper = async (): Promise<void> => {
    if (!auth) {
        console.warn("[Auth Provider] Firebase Auth not initialized, cannot log out.");
        return;
    }
    try {
        await signOut(auth);
        console.log("[Auth Provider] User signed out successfully.");
    } catch (error) {
        console.error("[Auth Provider] Error signing out:", error);
    } finally {
        Cookies.remove('auth-token');
        Cookies.remove('user-role');
        Cookies.remove('organization-id');
        Cookies.remove('guest-mode');
        console.log("[Auth Provider] Auth cookies cleared.");
    }
};


// --- AuthProvider Component ---

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname(); // Get current path
  const [authState, setAuthState] = React.useState<AuthState>({
    user: null,
    role: null,
    organizationId: null,
    isLoading: true,
    isGuest: false,
  });

  React.useEffect(() => {
    const handleGuestMode = (): boolean => {
        const guestModeRole = Cookies.get('guest-mode') as UserRole | undefined;
        // Only activate guest mode if NOT on login page AND guest cookie exists
        if (pathname !== '/login' && guestModeRole) {
            // Prevent infinite loop if already in guest state with the same role
            if (!authState.isGuest || authState.role !== guestModeRole) {
                 console.log(`[Auth Provider] Guest mode detected: Role=${guestModeRole}`);
                 setAuthState({
                    user: null,
                    role: guestModeRole,
                    organizationId: 'org_default', // Default org for guest
                    isLoading: false,
                    isGuest: true,
                 });
            } else {
                // Already in the correct guest state, ensure loading is false
                 setAuthState(prev => ({ ...prev, isLoading: false }));
            }
            return true; // Guest mode handled
        }
        // If guest cookie exists but we are on login page, remove it
        if (pathname === '/login' && guestModeRole) {
            Cookies.remove('guest-mode');
        }
        return false; // Not in guest mode
    };


    // Initial check for guest mode on mount or path change
    if (handleGuestMode()) {
        return; // Stop further checks if guest mode is active
    }

    if (!auth) {
        console.error("[Auth Provider] Firebase Auth is not initialized. Auth state cannot be determined.");
        // Not guest, not loading, no user
        setAuthState({ isLoading: false, user: null, role: null, organizationId: null, isGuest: false });
        return; // Stop listener setup
    }

    console.log("[Auth Provider] Setting up onAuthStateChanged listener.");
    const unsubscribe = onAuthStateChanged(auth, async (user) => {

         // Re-check guest mode on every auth change
         if (handleGuestMode()) {
              console.log("[Auth Provider] Guest mode detected during auth change.");
              return; // Stop processing if switched to guest mode
         }

        console.log("[Auth Provider] Auth state changed. User:", user?.uid || 'null');
        if (user) {
            // User is signed in
            if (user.uid === authState.user?.uid && authState.role && !authState.isLoading) {
                console.log("[Auth Provider] Auth state changed, but user UID and role are the same. Skipping profile fetch.");
                setAuthState(prev => ({ ...prev, isGuest: false })); // Ensure guest is false
                return;
            }

            setAuthState(prev => ({ ...prev, isLoading: true, isGuest: false })); // Set loading true while fetching profile

            try {
                const profile = await getUserProfileData(user.uid);
                console.log("[Auth Provider] Fetched profile:", profile);

                if (profile) {
                     // Update cookies
                     const idToken = await user.getIdToken(); // Get token for potential future use (not strictly needed if relying on claims via middleware)
                     Cookies.set('auth-token', idToken, { path: '/', expires: 1, sameSite: 'lax' }); // Still useful for client-side checks? Or remove? Let's keep for now.
                     Cookies.set('user-role', profile.role, { path: '/', expires: 1, sameSite: 'lax' });
                     if (profile.organizationId) {
                       Cookies.set('organization-id', profile.organizationId, { path: '/', expires: 1, sameSite: 'lax' });
                     } else {
                       Cookies.remove('organization-id');
                     }
                     Cookies.remove('guest-mode'); // Ensure guest cookie removed

                     setAuthState({
                        user: user,
                        role: profile.role,
                        organizationId: profile.organizationId,
                        isLoading: false,
                        isGuest: false,
                    });
                } else {
                    console.error(`[Auth Provider] User profile issue for UID: ${user.uid}. Logging out.`);
                    await logoutUserHelper();
                    router.push('/login?reason=profile_missing');
                }
            } catch (error) {
                console.error("[Auth Provider] Error fetching user profile or getting token:", error);
                await logoutUserHelper();
                router.push('/login?reason=profile_error');
            }
        } else {
            // User is signed out
            console.log("[Auth Provider] No user signed in.");
            // Ensure cookies are cleared
            Cookies.remove('auth-token');
            Cookies.remove('user-role');
            Cookies.remove('organization-id');
            // Keep guest-mode check separate, but ensure logged-out state if not guest
             if (!Cookies.get('guest-mode')) {
                setAuthState({ user: null, role: null, organizationId: null, isLoading: false, isGuest: false });
            } else {
                 // If guest cookie still exists, handleGuestMode should catch it next cycle
                 setAuthState(prev => ({ ...prev, isLoading: false })); // Ensure loading is false
            }
        }
    });

    return () => {
        console.log("[Auth Provider] Cleaning up onAuthStateChanged listener.");
        unsubscribe();
    };
  }, [pathname, authState.user?.uid, authState.role, authState.isGuest, router]); // Added pathname and isGuest


   const logout = async () => {
       await logoutUserHelper();
       // State is cleared by the onAuthStateChanged listener
       router.push('/login'); // Redirect after logout
   };

  // Ensure the value passed to provider is stable or memoized if complex
   const contextValue = React.useMemo(() => ({
    user: authState.user,
    role: authState.role,
    organizationId: authState.organizationId,
    isLoading: authState.isLoading,
    isGuest: authState.isGuest,
    logout: logout,
  }), [authState.user, authState.role, authState.organizationId, authState.isLoading, authState.isGuest]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
