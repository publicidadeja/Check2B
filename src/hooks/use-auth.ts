// src/hooks/use-auth.ts
'use client';

import * as React from 'react';
import Cookies from 'js-cookie';
import type { User } from 'firebase/auth'; // Import User type if needed later
import { onAuthChange, getUserProfileData } from '@/lib/auth'; // Import functions to check auth state and profile

type UserRole = 'super_admin' | 'admin' | 'collaborator' | null;

interface AuthState {
  user: User | null; // Firebase User object
  role: UserRole;
  organizationId: string | null;
  isLoading: boolean;
  isGuest: boolean;
}

interface AuthContextProps extends AuthState {
  // Add functions like login, logout if managing state here
}

const AuthContext = React.createContext<AuthContextProps | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = React.useState<AuthState>({
    user: null,
    role: null,
    organizationId: null,
    isLoading: true, // Start in loading state
    isGuest: false,
  });

  React.useEffect(() => {
    // Check for guest mode first
    const guestModeRole = Cookies.get('guest-mode') as UserRole | undefined;
    if (guestModeRole) {
      console.log(`[Auth Provider] Guest mode detected: Role=${guestModeRole}`);
      setAuthState({
        user: null,
        role: guestModeRole,
        organizationId: 'org_default', // Assign a default or placeholder org ID for guests
        isLoading: false,
        isGuest: true,
      });
      return; // Stop further checks if in guest mode
    }

    // If not guest mode, listen for Firebase Auth changes
    const unsubscribe = onAuthChange(async (user) => {
      console.log("[Auth Provider] Auth state changed. User:", user?.uid);
      if (user) {
        try {
          // Fetch profile data (role, orgId) from Firestore
          const profile = await getUserProfileData(user.uid);
          console.log("[Auth Provider] Fetched profile:", profile);
          if (profile) {
             // Set cookies based on profile data (redundant if set on login, but good for session persistence)
             Cookies.set('user-role', profile.role, { path: '/', expires: 1, sameSite: 'lax' });
             if (profile.organizationId) {
                 Cookies.set('organization-id', profile.organizationId, { path: '/', expires: 1, sameSite: 'lax' });
             } else {
                 Cookies.remove('organization-id');
             }

            setAuthState({
              user: user,
              role: profile.role as UserRole,
              organizationId: profile.organizationId,
              isLoading: false,
              isGuest: false,
            });
          } else {
            // User exists in Auth but not in Firestore profile (error state)
            console.error(`[Auth Provider] User profile not found for UID: ${user.uid}. Logging out.`);
            // Optionally log out the user here
             // await logoutUser(); // Consider if auto-logout is desired
            setAuthState({ user: null, role: null, organizationId: null, isLoading: false, isGuest: false });
          }
        } catch (error) {
           console.error("[Auth Provider] Error fetching user profile:", error);
           setAuthState({ user: user, role: null, organizationId: null, isLoading: false, isGuest: false }); // Keep user but mark as error state?
        }
      } else {
        // No user logged in
        console.log("[Auth Provider] No user logged in.");
        // Clear potentially stale cookies
        Cookies.remove('auth-token');
        Cookies.remove('user-role');
        Cookies.remove('organization-id');
        setAuthState({ user: null, role: null, organizationId: null, isLoading: false, isGuest: false });
      }
    });

    // Cleanup listener on unmount
    return () => unsubscribe();
  }, []); // Run only once on mount

  return (
    <AuthContext.Provider value={authState}>
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
