// src/hooks/use-auth.ts
'use client';

import * as React from 'react';
import Cookies from 'js-cookie';
import type { User } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import { getAuthInstance, getDb } from '@/lib/firebase';
import { logoutUser as logoutUserHelper, getUserProfileData, setAuthCookie as setAuthCookiesLib } from '@/lib/auth';
import { useRouter, usePathname } from 'next/navigation';

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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [authState, setAuthState] = React.useState<AuthState>({
    user: null,
    role: null,
    organizationId: null,
    isLoading: true,
    isGuest: false,
  });

  console.log(`[AuthProvider V8 DEBUG] Component RENDER. Path: ${pathname}, isLoading: ${authState.isLoading}, Role: ${authState.role}, isGuest: ${authState.isGuest}`);

  // Effect for Guest Mode Detection
  React.useEffect(() => {
    console.log(`[AuthProvider V8 DEBUG] Guest Mode useEffect triggered. Pathname: ${pathname}`);
    const guestModeRoleFromCookie = Cookies.get('guest-mode') as UserRole | undefined;

    if (guestModeRoleFromCookie && pathname !== '/login') {
      console.log(`[AuthProvider V8 DEBUG] Guest mode DETECTED. Role from cookie: ${guestModeRoleFromCookie}`);
      // Only update if not already guest or if role changes, or if still loading
      if (!authState.isGuest || authState.role !== guestModeRoleFromCookie || authState.isLoading) {
        setAuthState({
          user: null,
          role: guestModeRoleFromCookie,
          organizationId: guestModeRoleFromCookie === 'super_admin' ? null : (Cookies.get('organization-id') || 'org_default'),
          isLoading: false,
          isGuest: true,
        });
      }
    } else if (guestModeRoleFromCookie && pathname === '/login') {
      // If on login page with guest cookie, user might be trying to log in.
      // The Firebase auth listener should take precedence if a user signs in.
      // We don't immediately clear the guest state here, but ensure isLoading might be true
      // so Firebase auth listener can proceed if no actual user session is found.
      console.log(`[AuthProvider V8 DEBUG] On login page with guest cookie. Guest state might be overridden by Firebase auth.`);
      if (authState.isGuest && !authState.isLoading) { // If guest state is set and not loading for auth
        // Set loading to true so Firebase auth has a chance to run if user *actually* logs out then tries to login
        // setAuthState(prev => ({ ...prev, isLoading: true }));
      }
    } else if (!guestModeRoleFromCookie && authState.isGuest) {
        // If no guest cookie but state is guest (e.g., after logout, or cookie expired/cleared externally)
        // and Firebase auth isn't already loading, reset guest state and trigger loading for Firebase auth.
        if (!authState.isLoading) {
             console.log(`[AuthProvider V8 DEBUG] No guest cookie, but state is guest. Resetting guest state, will check Firebase auth.`);
             setAuthState({ user: null, role: null, organizationId: null, isLoading: true, isGuest: false });
        }
    }
  }, [pathname]); // Rerun when pathname changes to correctly evaluate guest mode entry/exit

  // Effect for Firebase Auth State
  React.useEffect(() => {
    console.log("[AuthProvider V8 DEBUG] Firebase Auth useEffect - MAIN LISTENER setup");
    const auth = getAuthInstance();
    const db = getDb();
    let isMounted = true;

    if (!auth || !db) {
      console.error("[AuthProvider V8 DEBUG] Firebase Auth or Firestore is not initialized.");
      if (isMounted) {
        setAuthState({ isLoading: false, user: null, role: null, organizationId: null, isGuest: false });
      }
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!isMounted) {
        console.log("[AuthProvider V8 DEBUG] onAuthStateChanged: Component unmounted, skipping update.");
        return;
      }

      const guestModeCookie = Cookies.get('guest-mode');
      console.log(`[AuthProvider V8 DEBUG] onAuthStateChanged: User ${user ? user.uid : 'null'} ${user ? 'authenticated' : 'not authenticated'}. Guest cookie: ${guestModeCookie}`);

      if (user) {
        // User is signed in
        if (guestModeCookie) {
            console.log("[AuthProvider V8 DEBUG] onAuthStateChanged: User logged in, removing guest-mode cookie.");
            Cookies.remove('guest-mode'); // Clear guest mode if a real user logs in
        }

        // Set loading true ONLY if user object changed or role not yet fetched (isLoading is true)
        // Or if current state IS guest (meaning we are transitioning from guest to auth)
        if (authState.user?.uid !== user.uid || authState.isLoading || authState.isGuest) {
             console.log("[AuthProvider V8 DEBUG] onAuthStateChanged: New user, or role not fetched, or transitioning from guest. Setting user and isLoading: true.");
             // Set user, keep/set isGuest: false, set isLoading: true to fetch profile
             // Do not clear role/orgId yet, let profile fetch confirm them
             setAuthState(prev => ({ ...prev, user, isLoading: true, isGuest: false }));
        }

        try {
          const profileData = await getUserProfileData(user.uid);
          console.log("[AuthProvider V8 DEBUG] Fetched profile:", profileData);

          if (!isMounted) return;

          if (profileData) {
            const idToken = await user.getIdToken(true); // Force refresh for latest claims
            setAuthCookiesLib(idToken, profileData.role, profileData.organizationId);
            console.log("[AuthProvider V8 DEBUG] Setting auth state: user authenticated, isLoading: false, role:", profileData.role, "orgId:", profileData.organizationId);
            setAuthState({ // This is the definitive authenticated state
              user,
              role: profileData.role,
              organizationId: profileData.organizationId,
              isLoading: false,
              isGuest: false, // Ensure isGuest is false
            });
          } else {
            console.error(`[AuthProvider V8 DEBUG] User profile missing for UID: ${user.uid}. Logging out.`);
            await logoutUserHelper(); // This will trigger onAuthStateChanged again with user=null
            if (isMounted) {
                 setAuthState({ user: null, role: null, organizationId: null, isLoading: false, isGuest: false });
                 if (typeof window !== 'undefined' && pathname !== '/login') router.replace('/login?reason=profile_missing_auth_hook');
            }
          }
        } catch (error) {
          if (!isMounted) return;
          console.error("[AuthProvider V8 DEBUG] Error fetching profile/token:", error);
          await logoutUserHelper();
          if (isMounted) {
            setAuthState({ user: null, role: null, organizationId: null, isLoading: false, isGuest: false });
             if (typeof window !== 'undefined' && pathname !== '/login') router.replace('/login?reason=profile_error_auth_hook');
          }
        }
      } else {
        // User is signed out or not yet determined by Firebase
        console.log("[AuthProvider V8 DEBUG] onAuthStateChanged: No Firebase user.");
        // If there's no guest cookie and we are not already in a non-loading guest state, then set to non-guest, no user, not loading.
        if (!guestModeCookie) {
            console.log("[AuthProvider V8 DEBUG] onAuthStateChanged: No Firebase user & no guest cookie. Setting to logged out state.");
            Cookies.remove('auth-token');
            Cookies.remove('user-role');
            Cookies.remove('organization-id');
            // Only update if it's not already in this state or if it was loading
            if (authState.user || authState.role || authState.isLoading || authState.isGuest) {
                 setAuthState({ user: null, role: null, organizationId: null, isLoading: false, isGuest: false });
            }
        } else {
            // Has guest cookie, but no Firebase user. The guest useEffect should handle setting isGuest: true and isLoading: false.
            // If for some reason isLoading is still true here, set it to false.
            if (authState.isLoading) {
                 console.log("[AuthProvider V8 DEBUG] onAuthStateChanged: No Firebase user, but guest cookie exists. Ensuring isLoading is false.");
                 setAuthState(prev => ({ ...prev, isLoading: false }));
            }
        }
      }
    });

    return () => {
      isMounted = false;
      console.log("[AuthProvider V8 DEBUG] Firebase Auth useEffect - MAIN LISTENER cleanup");
      unsubscribe();
    };
  }, []); // Empty dependency array: run only on mount and unmount

  const logout = React.useCallback(async () => {
    console.log("[AuthProvider V8 DEBUG] Logout initiated by user action.");
    const currentPath = pathname; // Capture pathname before navigation
    await logoutUserHelper(); // This clears Firebase auth state & cookies (including guest-mode)
    // State will be updated by onAuthStateChanged (user becomes null) and guest useEffect (guest cookie removed)
    // Explicitly set isLoading to false and isGuest to false to ensure clean state for login page
    setAuthState({ user: null, role: null, organizationId: null, isLoading: false, isGuest: false });
    if (currentPath !== '/login') {
        router.push('/login');
    }
  }, [router, pathname]);

  const contextValue = React.useMemo(() => ({
    user: authState.user,
    role: authState.role,
    organizationId: authState.organizationId,
    isLoading: authState.isLoading,
    isGuest: authState.isGuest,
    logout,
  }), [authState, logout]);

  return React.createElement(
    AuthContext.Provider,
    // @ts-ignore
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

