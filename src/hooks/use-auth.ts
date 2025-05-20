// src/hooks/use-auth.ts
'use client';

import * as React from 'react';
import Cookies from 'js-cookie';
import type { User } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth'; // Removed signOut as logout is handled by auth.ts
import { getAuthInstance, getDb } from '@/lib/firebase'; // Use getAuthInstance
import { logoutUser as logoutUserHelper, getUserProfileData, setAuthCookie as setAuthCookiesLib  } from '@/lib/auth'; // Renamed to avoid conflict
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

  React.useEffect(() => {
    let isMounted = true;
    const auth = getAuthInstance(); // Get auth instance
    const db = getDb(); // Get db instance

    const handleGuestMode = (): boolean => {
        const guestModeRole = Cookies.get('guest-mode') as UserRole | undefined;
        if (pathname !== '/login' && guestModeRole) {
            if (!authState.isGuest || authState.role !== guestModeRole || authState.isLoading) {
                 console.log(`[Auth Provider] Setting guest mode state: Role=${guestModeRole}`);
                 if (isMounted) {
                     setAuthState({
                        user: null,
                        role: guestModeRole,
                        organizationId: guestModeRole === 'super_admin' ? null : 'org_default', // Super admin has null orgId
                        isLoading: false,
                        isGuest: true,
                     });
                 }
            }
            return true;
        }
        if (pathname === '/login' && guestModeRole) {
            Cookies.remove('guest-mode');
        }
        return false;
    };

    if (handleGuestMode()) {
        return () => { isMounted = false; };
    }

    if (!auth || !db) {
        console.error("[Auth Provider] Firebase Auth or Firestore is not initialized.");
        if (isMounted) {
             setAuthState({ isLoading: false, user: null, role: null, organizationId: null, isGuest: false });
        }
        return () => { isMounted = false; };
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (!isMounted) return;

         if (handleGuestMode()) {
              console.log("[Auth Provider] Switched to guest mode during auth change.");
              return;
         }

        console.log("[Auth Provider] Auth state changed. User:", user?.uid || 'null');
        if (user) {
            // No need to set loading: true here if already handled or causes flicker
            // setAuthState(prev => ({ ...prev, isLoading: true, isGuest: false }));
            setAuthState(prev => ({ ...prev, user: user, isGuest: false, isLoading: true }));


            try {
                const profileData = await getUserProfileData(user.uid);
                console.log("[Auth Provider] Fetched profile:", profileData);

                 if (!isMounted) return;

                if (profileData) {
                     const idToken = await user.getIdToken(true); // Force refresh to get latest claims
                     setAuthCookiesLib(idToken, profileData.role, profileData.organizationId);

                     setAuthState({
                        user: user,
                        role: profileData.role,
                        organizationId: profileData.organizationId,
                        isLoading: false,
                        isGuest: false,
                    });
                } else {
                    console.error(`[Auth Provider] User profile missing for UID: ${user.uid}. Logging out.`);
                    await logoutUserHelper();
                    // router.push('/login?reason=profile_missing'); // Client-side redirect
                    if (typeof window !== 'undefined') window.location.href = '/login?reason=profile_missing';
                    setAuthState({ user: null, role: null, organizationId: null, isLoading: false, isGuest: false });
                }
            } catch (error) {
                 if (!isMounted) return;
                console.error("[Auth Provider] Error during profile fetch/token generation:", error);
                await logoutUserHelper();
                // router.push('/login?reason=profile_error'); // Client-side redirect
                if (typeof window !== 'undefined') window.location.href = '/login?reason=profile_error';
                setAuthState({ user: null, role: null, organizationId: null, isLoading: false, isGuest: false });
            }
        } else {
            console.log("[Auth Provider] No user signed in.");
            if (!Cookies.get('guest-mode')) {
                 Cookies.remove('auth-token');
                 Cookies.remove('user-role');
                 Cookies.remove('organization-id');
                 setAuthState({ user: null, role: null, organizationId: null, isLoading: false, isGuest: false });
            } else {
                 setAuthState(prev => ({ ...prev, isLoading: false }));
            }
        }
    });

    return () => {
        isMounted = false;
        console.log("[Auth Provider] Cleaning up onAuthStateChanged listener.");
        unsubscribe();
    };
  }, [pathname, router, authState.isGuest, authState.role, authState.isLoading]); // Refined dependencies


   const logout = React.useCallback(async () => {
        await logoutUserHelper();
        // The onAuthStateChanged listener will handle the state update
        router.push('/login');
   }, [router]);


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
