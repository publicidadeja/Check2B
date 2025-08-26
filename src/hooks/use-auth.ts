
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

 // console.log(`[AuthProvider V10 DEBUG] Component RENDER. Path: ${pathname}, isLoading: ${authState.isLoading}, Role: ${authState.role}, isGuest: ${authState.isGuest}, OrgID: ${authState.organizationId}`);

  React.useEffect(() => {
   // console.log("[AuthProvider V10 DEBUG] Main Auth useEffect - LISTENER setup");
    const auth = getAuthInstance();
    let isMounted = true;

    if (!auth) {
      console.error("[AuthProvider V10 DEBUG] Firebase Auth is not initialized.");
      if (isMounted) {
        setAuthState({ user: null, role: null, organizationId: null, isLoading: false, isGuest: false });
      }
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
     // console.log(`[AuthProvider V10 DEBUG] onAuthStateChanged triggered. User: ${firebaseUser ? firebaseUser.uid : 'null'}`);
      if (!isMounted) {
       // console.log("[AuthProvider V10 DEBUG] onAuthStateChanged: Component unmounted, skipping update.");
        return;
      }

      const guestModeCookie = Cookies.get('guest-mode') as UserRole | undefined;
     // console.log(`[AuthProvider V10 DEBUG] Guest cookie: ${guestModeCookie}`);

      if (firebaseUser) {
        // User is signed in
       // console.log(`[AuthProvider V10 DEBUG] Firebase user ${firebaseUser.uid} detected.`);
        if (guestModeCookie) {
         // console.log("[AuthProvider V10 DEBUG] User logged in, removing guest-mode cookie if it exists.");
          Cookies.remove('guest-mode');
        }

        // Set isLoading to true while fetching profile, and isGuest to false.
        // Only update if the user is different, or if role/orgId needs to be fetched.
        if (authState.user?.uid !== firebaseUser.uid || !authState.role || authState.isGuest) {
            setAuthState(prev => ({
                ...prev,
                user: firebaseUser,
                isLoading: true, // Important: set loading true for profile fetch
                isGuest: false,
                role: null, // Reset role and orgId to ensure fresh fetch
                organizationId: null,
            }));
        }


        try {
          const profileData = await getUserProfileData(firebaseUser.uid);
         // console.log("[AuthProvider V10 DEBUG] Fetched profile for UID", firebaseUser.uid, ":", JSON.stringify(profileData));

          if (!isMounted) return;

          if (profileData) {
            if (profileData.role !== 'super_admin' && !profileData.organizationId) {
              console.error(`[AuthProvider V10 CRITICAL] User ${firebaseUser.uid} (role: ${profileData.role}) missing organizationId! Logging out.`);
              await logoutUserHelper(); // This will trigger onAuthStateChanged again with user=null
              return;
            }

            const idToken = await firebaseUser.getIdToken(true);
            setAuthCookiesLib(idToken, profileData.role, profileData.organizationId, firebaseUser.uid);

           // console.log("[AuthProvider V10 DEBUG] Setting AUTHENTICATED state: isLoading: false, role:", profileData.role, "orgId:", profileData.organizationId);
            setAuthState({
              user: firebaseUser,
              role: profileData.role,
              organizationId: profileData.organizationId,
              isLoading: false,
              isGuest: false,
            });
          } else {
            console.error(`[AuthProvider V10 DEBUG] User profile MISSING for UID: ${firebaseUser.uid}. Logging out.`);
            await logoutUserHelper();
          }
        } catch (error) {
          if (!isMounted) return;
          console.error("[AuthProvider V10 DEBUG] Error fetching profile/token:", error);
          await logoutUserHelper();
        }
      } else {
        // User is signed out or not yet determined
       // console.log("[AuthProvider V10 DEBUG] No Firebase user.");
        if (guestModeCookie && pathname !== '/login') {
         // console.log(`[AuthProvider V10 DEBUG] Guest mode cookie found (${guestModeCookie}). Setting GUEST state.`);
          const guestOrgId = guestModeCookie === 'super_admin' ? null : (Cookies.get('organization-id') || 'org_default');
          // Only update if not already in this specific guest state or was loading
          if (!authState.isGuest || authState.role !== guestModeCookie || authState.organizationId !== guestOrgId || authState.isLoading) {
            setAuthState({
              user: null,
              role: guestModeCookie,
              organizationId: guestOrgId,
              isLoading: false,
              isGuest: true,
            });
          }
        } else {
         // console.log("[AuthProvider V10 DEBUG] No Firebase user & no (or irrelevant) guest cookie. Setting LOGGED OUT state.");
          Cookies.remove('auth-token');
          Cookies.remove('user-role');
          Cookies.remove('organization-id');
          Cookies.remove('user-uid');
          // Cookies.remove('guest-mode'); // Don't remove guest-mode here if on /login and it exists

          // Only update if it's not already in this logged-out state or if it was loading
          if (authState.user || authState.role || authState.isLoading || authState.isGuest) {
            setAuthState({ user: null, role: null, organizationId: null, isLoading: false, isGuest: false });
          }
        }
      }
    });

    return () => {
      isMounted = false;
     // console.log("[AuthProvider V10 DEBUG] Firebase Auth useEffect - MAIN LISTENER cleanup");
      unsubscribe();
    };
  }, [pathname]); // Added pathname dependency

  const logout = React.useCallback(async () => {
   // console.log("[AuthProvider V10 DEBUG] Logout initiated by user action.");
    await logoutUserHelper(); // This clears Firebase auth state & all relevant cookies
    // The onAuthStateChanged listener will set the state to user: null, isLoading: false, isGuest: false.
    // For immediate UI feedback and to prevent issues if onAuthStateChanged is slow:
    setAuthState({ user: null, role: null, organizationId: null, isLoading: false, isGuest: false });
    if (pathname !== '/login') {
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
