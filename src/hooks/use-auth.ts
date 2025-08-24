
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
    isLoading: true, // Start as loading
    isGuest: false,
  });

  React.useEffect(() => {
    const auth = getAuthInstance();
    let isMounted = true;

    if (!auth) {
      console.error("[AuthProvider] Firebase Auth is not initialized.");
      if (isMounted) {
        setAuthState(prev => ({ ...prev, isLoading: false }));
      }
      return;
    }
    
    // Check for user-uid cookie at the start to prevent logged-in users from seeing a flash of the login page.
    const uidFromCookie = Cookies.get('user-uid');
    if (!uidFromCookie && !authState.user) {
        // No user session cookie and no user in state, so we are definitely not logged in.
        // We can stop loading sooner.
        if (authState.isLoading) {
            setAuthState(prev => ({...prev, isLoading: false}));
        }
    }


    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!isMounted) return;

      if (firebaseUser) {
        if (authState.user?.uid === firebaseUser.uid && authState.role) {
          // Already have the user and role, probably a token refresh, no need to re-fetch
          // but ensure loading is false.
          if (authState.isLoading) setAuthState(prev => ({ ...prev, isLoading: false }));
          return;
        }

        try {
          const profileData = await getUserProfileData(firebaseUser.uid);

          if (!isMounted) return;

          if (profileData) {
            if (profileData.role !== 'super_admin' && !profileData.organizationId) {
              console.error(`[AuthProvider] User ${firebaseUser.uid} (role: ${profileData.role}) missing organizationId! Logging out.`);
              await logoutUserHelper();
              return;
            }

            const idToken = await firebaseUser.getIdToken(true);
            setAuthCookiesLib(idToken, profileData.role, profileData.organizationId, firebaseUser.uid);

            setAuthState({
              user: firebaseUser,
              role: profileData.role,
              organizationId: profileData.organizationId,
              isLoading: false,
              isGuest: false,
            });
          } else {
            console.error(`[AuthProvider] User profile MISSING for UID: ${firebaseUser.uid}. Logging out.`);
            await logoutUserHelper();
          }
        } catch (error) {
          if (!isMounted) return;
          console.error("[AuthProvider] Error fetching profile/token, logging out:", error);
          await logoutUserHelper();
        }
      } else {
        // No Firebase user
        const allAuthCookies = ['auth-token', 'user-role', 'organization-id', 'user-uid'];
        let hadCookies = false;
        allAuthCookies.forEach(cookie => {
            if(Cookies.get(cookie)) {
                hadCookies = true;
                Cookies.remove(cookie);
            }
        });
        if(hadCookies) console.log("[AuthProvider] Cleared stale auth cookies.");


        setAuthState({ user: null, role: null, organizationId: null, isLoading: false, isGuest: false });
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []); // Run only once on mount

  const logout = React.useCallback(async () => {
    await logoutUserHelper();
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
