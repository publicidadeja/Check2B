
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

  console.log(`[AuthProvider V9 DEBUG] Component RENDER. Path: ${pathname}, isLoading: ${authState.isLoading}, Role: ${authState.role}, isGuest: ${authState.isGuest}, OrgID: ${authState.organizationId}`);

  // Effect for Guest Mode Detection
  React.useEffect(() => {
    console.log(`[AuthProvider V9 DEBUG] Guest Mode useEffect triggered. Pathname: ${pathname}`);
    const guestModeRoleFromCookie = Cookies.get('guest-mode') as UserRole | undefined;

    if (guestModeRoleFromCookie && pathname !== '/login') {
      console.log(`[AuthProvider V9 DEBUG] Guest mode DETECTED. Role from cookie: ${guestModeRoleFromCookie}`);
      const guestOrgId = guestModeRoleFromCookie === 'super_admin' ? null : (Cookies.get('organization-id') || 'org_default');
      // Only update if state needs to change to guest, or role/orgId mismatch, or still loading
      if (!authState.isGuest || authState.role !== guestModeRoleFromCookie || authState.organizationId !== guestOrgId || authState.isLoading) {
        setAuthState({
          user: null,
          role: guestModeRoleFromCookie,
          organizationId: guestOrgId,
          isLoading: false,
          isGuest: true,
        });
      }
    } else if (guestModeRoleFromCookie && pathname === '/login') {
      // On login page with guest cookie. Firebase auth listener should take precedence if user logs in.
      console.log(`[AuthProvider V9 DEBUG] On login page with guest cookie. Firebase auth may override.`);
    } else if (!guestModeRoleFromCookie && authState.isGuest && !authState.isLoading) {
        // No guest cookie, but state is guest (e.g., after logout or cookie cleared).
        // Reset guest state and trigger loading for Firebase auth to re-evaluate.
        console.log(`[AuthProvider V9 DEBUG] No guest cookie, but state is guest. Resetting guest state, re-checking Firebase auth.`);
        setAuthState({ user: null, role: null, organizationId: null, isLoading: true, isGuest: false });
    }
  // Removed authState dependencies to avoid potential loops, focusing on pathname and external cookie.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Effect for Firebase Auth State
  React.useEffect(() => {
    console.log("[AuthProvider V9 DEBUG] Firebase Auth useEffect - MAIN LISTENER setup");
    const auth = getAuthInstance();
    const db = getDb();
    let isMounted = true;

    if (!auth || !db) {
      console.error("[AuthProvider V9 DEBUG] Firebase Auth or Firestore is not initialized.");
      if (isMounted) {
        // Ensure isLoading is false if Firebase can't even be initialized
        setAuthState(prev => ({ ...prev, isLoading: false, user: null, role: null, organizationId: null, isGuest: false }));
      }
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!isMounted) {
        console.log("[AuthProvider V9 DEBUG] onAuthStateChanged: Component unmounted, skipping update.");
        return;
      }

      const guestModeCookie = Cookies.get('guest-mode');
      console.log(`[AuthProvider V9 DEBUG] onAuthStateChanged: User ${user ? user.uid : 'null'}. Guest cookie: ${guestModeCookie}`);

      if (user) { // User is signed in
        if (guestModeCookie) {
            console.log("[AuthProvider V9 DEBUG] onAuthStateChanged: User logged in, removing guest-mode cookie.");
            Cookies.remove('guest-mode'); // Clear guest mode if a real user logs in
        }

        // If current state is guest, or user changed, or role isn't set yet, set loading true for profile fetch.
        if (authState.isGuest || authState.user?.uid !== user.uid || !authState.role) {
             console.log("[AuthProvider V9 DEBUG] onAuthStateChanged: New user, or transitioning from guest, or role not set. Setting user, isLoading: true, isGuest: false.");
             setAuthState(prev => ({ ...prev, user, isLoading: true, isGuest: false }));
        }


        try {
          const profileData = await getUserProfileData(user.uid);
          console.log("[AuthProvider V9 DEBUG] Fetched profile for UID", user.uid, ":", JSON.stringify(profileData));

          if (!isMounted) return;

          if (profileData) {
            // CRITICAL CHECK: Ensure non-super_admin users have an organizationId
            if (profileData.role !== 'super_admin' && !profileData.organizationId) {
                console.error(`[AuthProvider V9 CRITICAL] User ${user.uid} (role: ${profileData.role}) is missing organizationId! Logging out.`);
                await logoutUserHelper(); // This will trigger onAuthStateChanged again with user=null
                // The subsequent onAuthStateChanged(null) will handle redirecting.
                return; // Early return to prevent setting broken auth state
            }

            const idToken = await user.getIdToken(true); // Force refresh for latest claims
            setAuthCookiesLib(idToken, profileData.role, profileData.organizationId);
            console.log("[AuthProvider V9 DEBUG] Setting auth state DEFINITIVELY: user authenticated, isLoading: false, role:", profileData.role, "orgId:", profileData.organizationId);
            setAuthState({ // This is the definitive authenticated state
              user,
              role: profileData.role,
              organizationId: profileData.organizationId,
              isLoading: false,
              isGuest: false, // Ensure isGuest is false
            });
          } else {
            console.error(`[AuthProvider V9 DEBUG] User profile missing for UID: ${user.uid}. Logging out.`);
            await logoutUserHelper();
            // onAuthStateChanged will be called with user=null, leading to redirect if not on /login
          }
        } catch (error) {
          if (!isMounted) return;
          console.error("[AuthProvider V9 DEBUG] Error fetching profile/token:", error);
          await logoutUserHelper();
          // onAuthStateChanged will be called with user=null
        }
      } else { // User is signed out or not yet determined
        console.log("[AuthProvider V9 DEBUG] onAuthStateChanged: No Firebase user.");
        // If there's no guest cookie and we are not already in a non-loading guest state, then set to non-guest, no user, not loading.
        if (!guestModeCookie) {
            console.log("[AuthProvider V9 DEBUG] onAuthStateChanged: No Firebase user & no guest cookie. Setting to logged out state.");
            Cookies.remove('auth-token');
            Cookies.remove('user-role');
            Cookies.remove('organization-id');
            // Only update if it's not already in this state or if it was loading
            if (authState.user || authState.role || authState.isLoading || authState.isGuest) {
                 setAuthState({ user: null, role: null, organizationId: null, isLoading: false, isGuest: false });
            }
             // If not on login page, redirect (handled by ConditionalLayout or middleware more directly)
             if (pathname !== '/login') {
                console.log(`[AuthProvider V9 DEBUG] No user, no guest, not on login. Path: ${pathname}. Should redirect via Layout/Middleware.`);
                // router.replace('/login?reason=authprovider_no_user_no_guest'); // Avoid direct redirect here to let layout handle
            }
        } else {
            // Has guest cookie, but no Firebase user. The guest useEffect should handle setting isGuest: true and isLoading: false.
            console.log("[AuthProvider V9 DEBUG] onAuthStateChanged: No Firebase user, but guest cookie exists. Guest useEffect should handle state.");
            if (authState.isLoading) { // If somehow still loading, ensure it's false for guest
                 setAuthState(prev => ({ ...prev, isLoading: false }));
            }
        }
      }
    });

    return () => {
      isMounted = false;
      console.log("[AuthProvider V9 DEBUG] Firebase Auth useEffect - MAIN LISTENER cleanup");
      unsubscribe();
    };
  // Using an empty dependency array for the main auth listener is standard.
  // Other effects handle guest mode based on pathname changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logout = React.useCallback(async () => {
    console.log("[AuthProvider V9 DEBUG] Logout initiated by user action.");
    const currentPath = pathname; // Capture pathname before navigation
    await logoutUserHelper(); // This clears Firebase auth state & cookies (including guest-mode)
    // Auth state will be updated by onAuthStateChanged (user becomes null)
    // Guest useEffect will handle the guest-mode cookie removal if necessary.
    // Explicitly set a clean logged-out state to avoid lingering guest states if not on login page
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
    // @ts-ignore - contextValue matches AuthContextProps
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
    