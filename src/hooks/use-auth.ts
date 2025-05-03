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
                // Default to collaborator if role is invalid/missing
                return { role: 'collaborator', organizationId: organizationId ?? null };
            }

            return {
                role: role,
                organizationId: organizationId ?? null,
            };
        } else {
            console.warn(`[Auth Provider] User profile not found in Firestore for UID: ${userId}`);
            return null; // Indicate profile not found
        }
    } catch (error) {
        console.error(`[Auth Provider] Error fetching Firestore profile for UID ${userId}:`, error);
        return null; // Indicate error during fetch
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
        // Clear all auth-related cookies
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
    let isMounted = true; // Track if the component is still mounted

    const handleGuestMode = (): boolean => {
        const guestModeRole = Cookies.get('guest-mode') as UserRole | undefined;
        // Only activate guest mode if NOT on login page AND guest cookie exists
        if (pathname !== '/login' && guestModeRole) {
            // Prevent unnecessary state updates if already in the correct guest state
            if (!authState.isGuest || authState.role !== guestModeRole || authState.isLoading) {
                 console.log(`[Auth Provider] Setting guest mode state: Role=${guestModeRole}`);
                 if (isMounted) {
                     setAuthState({
                        user: null,
                        role: guestModeRole,
                        organizationId: 'org_default', // Default org for guest
                        isLoading: false,
                        isGuest: true,
                     });
                 }
            }
            return true; // Guest mode handled
        }
        // If guest cookie exists but we are on login page, remove it
        if (pathname === '/login' && guestModeRole) {
            Cookies.remove('guest-mode');
        }
        return false; // Not in guest mode
    };


    // Initial check for guest mode
    if (handleGuestMode()) {
        return () => { isMounted = false; }; // Cleanup mount flag
    }

    if (!auth) {
        console.error("[Auth Provider] Firebase Auth is not initialized.");
        if (isMounted) {
             setAuthState({ isLoading: false, user: null, role: null, organizationId: null, isGuest: false });
        }
        return () => { isMounted = false; };
    }

    console.log("[Auth Provider] Setting up onAuthStateChanged listener.");
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (!isMounted) return; // Don't update state if component unmounted

         // Check guest mode again on auth change
         if (handleGuestMode()) {
              console.log("[Auth Provider] Switched to guest mode during auth change.");
              return;
         }

        console.log("[Auth Provider] Auth state changed. User:", user?.uid || 'null');
        if (user) {
             // User is signed in, but profile might still be loading or invalid
             // Avoid fetching profile if user and role are already set and not loading
             if (authState.user?.uid === user.uid && authState.role && !authState.isLoading) {
                 console.log("[Auth Provider] Auth state changed, but user and role already set. Ensuring guest=false.");
                 setAuthState(prev => ({ ...prev, isGuest: false })); // Ensure guest is false if user is logged in
                 return;
             }

            setAuthState(prev => ({ ...prev, isLoading: true, isGuest: false }));

            try {
                const profile = await getUserProfileData(user.uid);
                console.log("[Auth Provider] Fetched profile:", profile);

                 if (!isMounted) return; // Check mount status after async operation

                if (profile) {
                     // Set cookies (Consider security implications of client-side cookies)
                     const idToken = await user.getIdToken();
                     // Pass role and orgId to setAuthCookie
                     setAuthCookie(idToken, profile.role, profile.organizationId);

                     setAuthState({
                        user: user,
                        role: profile.role,
                        organizationId: profile.organizationId,
                        isLoading: false,
                        isGuest: false,
                    });
                } else {
                    // User exists in Auth, but no profile in Firestore
                    console.error(`[Auth Provider] User profile missing for UID: ${user.uid}. Logging out.`);
                    await logoutUserHelper();
                     // Redirect must happen outside the listener's async callback potentially
                     // Schedule redirect after state update allows UI to potentially show a message
                     router.push('/login?reason=profile_missing');
                     // Directly setting state might be better here if redirect is immediate
                     setAuthState({ user: null, role: null, organizationId: null, isLoading: false, isGuest: false });
                }
            } catch (error) {
                 if (!isMounted) return;
                console.error("[Auth Provider] Error during profile fetch/token generation:", error);
                await logoutUserHelper();
                router.push('/login?reason=profile_error');
                setAuthState({ user: null, role: null, organizationId: null, isLoading: false, isGuest: false });
            }
        } else {
            // User is signed out
            console.log("[Auth Provider] No user signed in.");
            // Clear cookies and set logged-out state, unless already in guest mode
            if (!Cookies.get('guest-mode')) {
                 Cookies.remove('auth-token');
                 Cookies.remove('user-role');
                 Cookies.remove('organization-id');
                 setAuthState({ user: null, role: null, organizationId: null, isLoading: false, isGuest: false });
            } else {
                // Still in guest mode, just ensure loading is false
                 setAuthState(prev => ({ ...prev, isLoading: false }));
            }
        }
    });

    // Cleanup function
    return () => {
        isMounted = false; // Set flag on unmount
        console.log("[Auth Provider] Cleaning up onAuthStateChanged listener.");
        unsubscribe();
    };
  // Dependencies: Re-run if path changes (to handle guest mode logic) or if auth instance itself changes (unlikely)
  }, [pathname, authState.user?.uid, authState.role, authState.isLoading, authState.isGuest, router]); // Added authState checks to deps


   const logout = React.useCallback(async () => {
        await logoutUserHelper();
        // State update will be handled by the onAuthStateChanged listener
        router.push('/login'); // Redirect after logout call
   }, [router]); // Include router in dependency array for logout


  // Memoize the context value to prevent unnecessary re-renders
   const contextValue = React.useMemo(() => ({
    user: authState.user,
    role: authState.role,
    organizationId: authState.organizationId,
    isLoading: authState.isLoading,
    isGuest: authState.isGuest,
    logout: logout, // Add the logout function
   }), [authState, logout]); // Depend on authState and the memoized logout

   // Fix: Use React.createElement to avoid potential JSX parsing issues
   return React.createElement(
     AuthContext.Provider,
     { value: contextValue },
     children
   );
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

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
