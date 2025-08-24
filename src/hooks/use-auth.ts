
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
    isLoading: true, // Começa como carregando e só muda quando o Firebase confirmar o estado
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
    
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!isMounted) return;

      console.log(`[AuthProvider] onAuthStateChanged triggered. User: ${firebaseUser?.uid || 'null'}`);

      if (firebaseUser) {
        // Se o usuário já estiver no estado, não faz nada para evitar re-renderizações.
        if (authState.user?.uid === firebaseUser.uid && authState.role) {
          if (authState.isLoading) setAuthState(prev => ({ ...prev, isLoading: false }));
          return;
        }

        try {
          const profileData = await getUserProfileData(firebaseUser.uid);
          if (!isMounted) return;

          if (profileData) {
            // Verificação crítica: admins e colaboradores DEVEM ter um organizationId
            if (profileData.role !== 'super_admin' && !profileData.organizationId) {
              console.error(`[AuthProvider] User ${firebaseUser.uid} (role: ${profileData.role}) is missing organizationId! Logging out.`);
              await logoutUserHelper(); // Isso irá limpar os cookies e o estado
              // O próprio onAuthStateChanged será acionado novamente com 'null'
              return; 
            }

            const idToken = await firebaseUser.getIdToken(true);
            setAuthCookiesLib(idToken, profileData.role, profileData.organizationId, firebaseUser.uid);

            console.log(`[AuthProvider] Setting state for user ${firebaseUser.uid}, role: ${profileData.role}`);
            setAuthState({
              user: firebaseUser,
              role: profileData.role,
              organizationId: profileData.organizationId,
              isLoading: false,
              isGuest: false,
            });
          } else {
            console.error(`[AuthProvider] User authenticated with Firebase, but profile data is missing in Firestore for UID: ${firebaseUser.uid}. Logging out.`);
            await logoutUserHelper();
          }
        } catch (error) {
          if (!isMounted) return;
          console.error("[AuthProvider] Error fetching user profile/token during onAuthStateChanged, logging out:", error);
          await logoutUserHelper();
        }
      } else {
        // Nenhum usuário Firebase, limpa o estado e os cookies.
        console.log("[AuthProvider] No Firebase user. Setting auth state to unauthenticated.");
        const allAuthCookies = ['auth-token', 'user-role', 'organization-id', 'user-uid'];
        let hadCookies = false;
        allAuthCookies.forEach(cookie => {
            if(Cookies.get(cookie)) {
                hadCookies = true;
                Cookies.remove(cookie, { path: '/' });
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
  // A remoção do array de dependências faz com que este useEffect seja executado apenas uma vez,
  // como `componentDidMount`, que é o comportamento correto para o `onAuthStateChanged`.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logout = React.useCallback(async () => {
    await logoutUserHelper();
    // A chamada a logoutUserHelper irá disparar o onAuthStateChanged, 
    // que por sua vez atualizará o estado para deslogado.
    // Redirecionamento é feito pelo ConditionalLayout ou pela página que chama o logout.
  }, []);

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
