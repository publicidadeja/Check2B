
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

  console.log(`[ConditionalLayout START V10] Path: ${pathname}, Role: ${role}, OrgId: ${organizationId}, isLoading: ${isLoading}, isGuest: ${isGuest}, Bypass: ${MIDDLEWARE_BYPASS_ACTIVE}`);

  if (isLoading) {
    console.log("[ConditionalLayout DECISION V10] Auth state loading. Rendering spinner.");
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" text="Carregando sistema..." />
      </div>
    );
  }
  
  if (pathname === '/login') {
    if (!isGuest && role) { // User is authenticated (not guest, has role)
      let redirectPath = '/';
      if (role === 'super_admin') redirectPath = '/superadmin';
      else if (role === 'admin') redirectPath = '/';
      else if (role === 'collaborator') redirectPath = '/colaborador/dashboard';
      
      console.log(`[ConditionalLayout REDIRECT V10] Authenticated user (${role}) on /login. Redirecting to ${redirectPath}`);
      if (typeof window !== 'undefined') router.push(redirectPath);
      return <div className="flex min-h-screen items-center justify-center"><LoadingSpinner size="lg" text="Redirecionando..." /></div>;
    }
    console.log("[ConditionalLayout DECISION V10] Login page, user not authenticated or is guest. Rendering login form.");
    return <>{children}</>; // Render login page content
  }

  // Define path types
  const isAdminPath = !pathname.startsWith('/colaborador') && !pathname.startsWith('/superadmin') && pathname !== '/login';
  const isColaboradorPath = pathname.startsWith('/colaborador');
  const isSuperAdminPath = pathname.startsWith('/superadmin');
  console.log(`[ConditionalLayout INFO V10] Path checks: isAdminPath=${isAdminPath}, isColaboradorPath=${isColaboradorPath}, isSuperAdminPath=${isSuperAdminPath}`);


  // --- MODO BYPASS DO MIDDLEWARE (APENAS PARA DESENVOLVIMENTO) ---
  if (MIDDLEWARE_BYPASS_ACTIVE) {
    console.warn("[ConditionalLayout BYPASS ACTIVE V10]");
    if (isSuperAdminPath) {
      console.log(`[ConditionalLayout DECISION V10] (Bypass) Renderizando SuperAdminLayout para: ${pathname}`);
      return <SuperAdminLayout>{children}</SuperAdminLayout>;
    }
    if (isAdminPath) {
      console.log(`[ConditionalLayout DECISION V10] (Bypass) Renderizando MainLayout para: ${pathname}`);
      return <MainLayout>{children}</MainLayout>;
    }
    if (isColaboradorPath) {
      console.log(`[ConditionalLayout DECISION V10] (Bypass) Renderizando MobileLayout para: ${pathname}`);
      return <MobileLayout>{children}</MobileLayout>;
    }
    console.warn(`[ConditionalLayout BYPASS UNHANDLED V10] Path ${pathname} não corresponde a nenhum layout. Renderizando children.`);
    return <>{children}</>; 
  }

  // --- ROTEAMENTO NORMAL (QUANDO MIDDLEWARE_BYPASS_ACTIVE = false) ---
  // This part is reached only if MIDDLEWARE_BYPASS_ACTIVE is false.
  // The middleware should have already redirected unauthenticated users to /login.
  // So, here we assume the user is either authenticated or in guest mode and on an allowed path.

  if (isGuest) {
    console.log(`[ConditionalLayout GUEST MODE V10] Role (from guest cookie): ${role}`);
    if (role === 'super_admin' && isSuperAdminPath) return <SuperAdminLayout>{children}</SuperAdminLayout>;
    if (role === 'admin' && isAdminPath) return <MainLayout>{children}</MainLayout>;
    if (role === 'collaborator' && isColaboradorPath) return <MobileLayout>{children}</MobileLayout>;
    
    console.warn(`[ConditionalLayout GUEST FALLBACK V10] Guest on unhandled path or role mismatch. Path: ${pathname}, Guest Role: ${role}. Redirecting to login (middleware should catch).`);
    if (typeof window !== 'undefined') router.replace('/login?reason=cl_guest_unhandled_v10');
    return <div className="flex min-h-screen items-center justify-center"><LoadingSpinner size="lg" text="Redirecionando..." /></div>;
  }

  // Authenticated User Routing (if middleware didn't redirect, user has token and role SHOULD be set by useAuth)
  if (role) {
    console.log(`[ConditionalLayout AUTH MODE V10] Role: ${role}, OrgID: ${organizationId}`);
    if (role === 'super_admin') {
        return isSuperAdminPath ? <SuperAdminLayout>{children}</SuperAdminLayout> : (() => {
            if (typeof window !== 'undefined') router.replace('/superadmin');
            return <div className="flex min-h-screen items-center justify-center"><LoadingSpinner size="lg" text="Redirecionando Super Admin..." /></div>;
        })();
    }
    if (role === 'admin') {
        if (!organizationId) {
            console.error(`[ConditionalLayout AUTH ERROR V10] Admin ${user?.uid} missing organizationId!`);
            if (typeof window !== 'undefined') router.replace('/login?reason=no_org_cl_v10');
            return <div className="flex min-h-screen items-center justify-center"><LoadingSpinner size="lg" text="Erro de Configuração (Admin)..." /></div>;
        }
        return isAdminPath ? <MainLayout>{children}</MainLayout> : (() => {
            if (typeof window !== 'undefined') router.replace('/');
            return <div className="flex min-h-screen items-center justify-center"><LoadingSpinner size="lg" text="Redirecionando Admin..." /></div>;
        })();
    }
    if (role === 'collaborator') {
        if (!organizationId) {
            console.error(`[ConditionalLayout AUTH ERROR V10] Colaborador ${user?.uid} missing organizationId!`);
            if (typeof window !== 'undefined') router.replace('/login?reason=no_org_cl_v10');
            return <div className="flex min-h-screen items-center justify-center"><LoadingSpinner size="lg" text="Erro de Configuração (Colab.)..." /></div>;
        }
        return isColaboradorPath ? <MobileLayout>{children}</MobileLayout> : (() => {
            if (typeof window !== 'undefined') router.replace('/colaborador/dashboard');
            return <div className="flex min-h-screen items-center justify-center"><LoadingSpinner size="lg" text="Redirecionando Colaborador..." /></div>;
        })();
    }
    // Fallback for unknown authenticated role
    console.error(`[ConditionalLayout AUTH ERROR V10] Unknown role: ${role}. UID: ${user?.uid}.`);
    if (typeof window !== 'undefined') router.replace('/login?reason=unknown_role_cl_v10');
    return <div className="flex min-h-screen items-center justify-center"><LoadingSpinner size="lg" text="Erro de Perfil..." /></div>;
  }

  // Fallback if !isLoading, not /login, not guest, and no role (e.g., profile fetch failed silently before setting role)
  // Middleware should ideally prevent this state for non-bypassed flow.
  console.error(`[ConditionalLayout CRITICAL FALLBACK V10] Unhandled state (Not loading, not /login, not guest, no role). Path: ${pathname}. Redirecting to login.`);
  if (typeof window !== 'undefined') router.replace('/login?reason=cl_critical_fallback_v10');
  return <div className="flex min-h-screen items-center justify-center"><LoadingSpinner size="lg" text="Erro Inesperado de Roteamento..." /></div>;
}
