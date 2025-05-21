// src/components/layout/conditional-layout.tsx
'use client';

import *as React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { MainLayout } from '@/components/layout/main-layout';
import { MobileLayout } from '@/components/layout/mobile-layout';
import { SuperAdminLayout } from '@/components/layout/superadmin-layout';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface ConditionalLayoutProps {
  children: React.ReactNode;
}

// Mude para false para testar o middleware real e o fluxo de autenticação
const MIDDLEWARE_BYPASS_ACTIVE = true; 

export function ConditionalLayout({ children }: ConditionalLayoutProps) {
  const { user, role, organizationId, isLoading, isGuest } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  console.log(`[ConditionalLayout START V8] Path: ${pathname}, Role: ${role}, OrgId: ${organizationId}, isLoading: ${isLoading}, isGuest: ${isGuest}, Middleware Bypass: ${MIDDLEWARE_BYPASS_ACTIVE}`);

  if (isLoading) {
    console.log("[ConditionalLayout DECISION V8] Loading spinner (Auth state loading or initial check)");
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" text="Carregando sistema..." />
      </div>
    );
  }
  
  if (pathname === '/login') {
    // Se estiver na página de login
    if (!isGuest && role) {
      // E o usuário está autenticado (não é convidado e tem um papel)
      let redirectPath = '/'; // Default redirect path
      if (role === 'super_admin') {
        redirectPath = '/superadmin';
      } else if (role === 'admin') {
        redirectPath = '/'; // Admin dashboard is root
      } else if (role === 'collaborator') {
        redirectPath = '/colaborador/dashboard';
      }
      console.log(`[ConditionalLayout REDIRECT V8] Authenticated user (${role}) on /login. Redirecting to ${redirectPath}`);
      if (typeof window !== 'undefined') { // Client-side check for router
          router.push(redirectPath); // Use push for better history management after login
          return ( // Show a spinner while redirecting
              <div className="flex min-h-screen items-center justify-center">
                  <LoadingSpinner size="lg" text="Redirecionando..." />
              </div>
          );
      }
      // Se não for client-side, ou antes do router.push efetivar, pode renderizar um spinner
      return <div className="flex min-h-screen items-center justify-center"><LoadingSpinner size="lg" text="Redirecionando..." /></div>;
    } else {
      // Se estiver na página de login E não autenticado OU é convidado, renderiza o formulário de login
      console.log("[ConditionalLayout DECISION V8] Login page, user not authenticated or is guest. Rendering login form.");
      return <>{children}</>;
    }
  }

  // Define path types
  const isAdminPath = !pathname.startsWith('/colaborador') && !pathname.startsWith('/superadmin') && pathname !== '/login';
  const isColaboradorPath = pathname.startsWith('/colaborador');
  const isSuperAdminPath = pathname.startsWith('/superadmin');

  console.log(`[ConditionalLayout INFO V8] Path checks: isAdminPath=${isAdminPath}, isColaboradorPath=${isColaboradorPath}, isSuperAdminPath=${isSuperAdminPath}`);

  // --- MODO BYPASS DO MIDDLEWARE (APENAS PARA DESENVOLVIMENTO) ---
  if (MIDDLEWARE_BYPASS_ACTIVE) {
    console.log("[ConditionalLayout BYPASS ACTIVE V8]");
    if (isSuperAdminPath) {
      console.log(`[ConditionalLayout DECISION V8] (Middleware Bypass) Renderizando SuperAdminLayout para: ${pathname}`);
      return <SuperAdminLayout>{children}</SuperAdminLayout>;
    }
    if (isAdminPath) {
      console.log(`[ConditionalLayout DECISION V8] (Middleware Bypass) Renderizando MainLayout para: ${pathname}`);
      return <MainLayout>{children}</MainLayout>;
    }
    if (isColaboradorPath) {
      console.log(`[ConditionalLayout DECISION V8] (Middleware Bypass) Renderizando MobileLayout para: ${pathname}`);
      return <MobileLayout>{children}</MobileLayout>;
    }
    console.warn(`[ConditionalLayout BYPASS UNHANDLED V8] Path não corresponde a nenhum layout conhecido: ${pathname}. Renderizando children diretamente.`);
    return <>{children}</>; 
  }

  // --- ROTEAMENTO NORMAL (QUANDO O MIDDLEWARE ESTIVER ATIVO E MIDDLEWARE_BYPASS_ACTIVE = false) ---

  // GUEST MODE ROUTING
  if (isGuest) {
    console.log(`[ConditionalLayout GUEST MODE V8] Role (from guest cookie): ${role}`);
    if (role === 'super_admin' && isSuperAdminPath) {
      console.log("[ConditionalLayout DECISION V8] Guest SuperAdminLayout");
      return <SuperAdminLayout>{children}</SuperAdminLayout>;
    }
    if (role === 'admin' && isAdminPath) {
      console.log(`[ConditionalLayout DECISION V8] Guest MainLayout for path ${pathname}`);
      return <MainLayout>{children}</MainLayout>;
    }
    if (role === 'collaborator' && isColaboradorPath) {
      console.log("[ConditionalLayout DECISION V8] Guest MobileLayout");
      return <MobileLayout>{children}</MobileLayout>;
    }
    console.warn(`[ConditionalLayout GUEST FALLBACK V8] Guest on unhandled path or role mismatch. Path: ${pathname}, Guest Role: ${role}. Redirecting to login.`);
    if (typeof window !== 'undefined') router.replace('/login?reason=cl_guest_unhandled_path_v8');
    return <div className="flex min-h-screen items-center justify-center"><LoadingSpinner size="lg" text="Redirecionando..." /></div>;
  }

  // AUTHENTICATED USER ROUTING
  if (role) { // User is authenticated (not guest, and role is present)
    console.log(`[ConditionalLayout AUTH MODE V8] Role: ${role}, OrgID: ${organizationId}`);
    if (role === 'super_admin') {
      if (isSuperAdminPath) {
          console.log(`[ConditionalLayout DECISION V8] Authenticated SuperAdminLayout for path ${pathname}`);
          return <SuperAdminLayout>{children}</SuperAdminLayout>;
      }
      console.log(`[ConditionalLayout AUTH REDIRECT V8] Authenticated Super Admin on invalid path ${pathname}. Redirecting to /superadmin.`);
      if (typeof window !== 'undefined') router.replace('/superadmin');
      return <div className="flex min-h-screen items-center justify-center"><LoadingSpinner size="lg" text="Redirecionando..." /></div>;
    }

    if (role === 'admin') {
       if (!organizationId) {
            console.error(`[ConditionalLayout AUTH ERROR V8] Admin user ${user?.uid} missing organizationId! Redirecting to login.`);
            if (typeof window !== 'undefined') router.replace('/login?reason=no_org_cl');
            return <div className="flex min-h-screen items-center justify-center"><LoadingSpinner size="lg" text="Erro de Configuração..." /></div>;
       }
       if (isAdminPath) {
           console.log(`[ConditionalLayout DECISION V8] Authenticated Admin MainLayout for path ${pathname}`);
           return <MainLayout>{children}</MainLayout>;
       }
       console.log(`[ConditionalLayout AUTH REDIRECT V8] Authenticated Admin on invalid path ${pathname}. Redirecting to /.`);
       if (typeof window !== 'undefined') router.replace('/');
       return <div className="flex min-h-screen items-center justify-center"><LoadingSpinner size="lg" text="Redirecionando..." /></div>;
    }

    if (role === 'collaborator') {
       if (!organizationId) {
            console.error(`[ConditionalLayout AUTH ERROR V8] Collaborator user ${user?.uid} missing organizationId! Redirecting to login.`);
            if (typeof window !== 'undefined') router.replace('/login?reason=no_org_cl');
            return <div className="flex min-h-screen items-center justify-center"><LoadingSpinner size="lg" text="Erro de Configuração..." /></div>;
       }
       if (isColaboradorPath) {
           console.log(`[ConditionalLayout DECISION V8] Authenticated Collaborator MobileLayout for path ${pathname}`);
           return <MobileLayout>{children}</MobileLayout>;
       }
       console.log(`[ConditionalLayout AUTH REDIRECT V8] Authenticated Collaborator on invalid path ${pathname}. Redirecting to /colaborador/dashboard.`);
       if (typeof window !== 'undefined') router.replace('/colaborador/dashboard');
       return <div className="flex min-h-screen items-center justify-center"><LoadingSpinner size="lg" text="Redirecionando..." /></div>;
    }

    // Fallback for unknown authenticated role
    console.error(`[ConditionalLayout AUTH ERROR V8] Unknown authenticated role: ${role}. UID: ${user?.uid}. Redirecting to login.`);
    if (typeof window !== 'undefined') router.replace('/login?reason=unknown_role_cl');
    return <div className="flex min-h-screen items-center justify-center"><LoadingSpinner size="lg" text="Erro de Perfil..." /></div>;
  }

  // Final fallback if no conditions met (e.g., not loading, not guest, no role - should be caught by middleware if active)
  console.error(`[ConditionalLayout CRITICAL FALLBACK V8] Unhandled state. Path: ${pathname}, Role: ${role}, Guest: ${isGuest}. Redirecting to login.`);
  // Evitar redirecionamento se já estiver na página de login para não causar loop aqui
  if (typeof window !== 'undefined' && pathname !== '/login') {
       router.replace('/login?reason=cl_critical_fallback_v8');
  }
  return pathname === '/login' ? <>{children}</> : <div className="flex min-h-screen items-center justify-center"><LoadingSpinner size="lg" text="Erro de Roteamento..." /></div>;
}
