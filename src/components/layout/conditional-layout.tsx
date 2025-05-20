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
  const { role, isLoading, isGuest } = useAuth();
  const pathname = usePathname();
  const router = useRouter(); // Import and use router

  console.log(`[ConditionalLayout START V5] Path: ${pathname}, Role: ${role}, isLoading: ${isLoading}, isGuest: ${isGuest}, Middleware Bypass: ${MIDDLEWARE_BYPASS_ACTIVE}`);

  if (isLoading) {
    console.log("[ConditionalLayout DECISION V5] Loading spinner (Auth state loading)");
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" text="Carregando sistema..." />
      </div>
    );
  }

  if (pathname === '/login') {
    console.log("[ConditionalLayout DECISION V5] Login page, rendering children directly.");
    return <>{children}</>;
  }

  // Define path types
  const isAdminPath = !pathname.startsWith('/colaborador') && !pathname.startsWith('/superadmin') && pathname !== '/login';
  const isColaboradorPath = pathname.startsWith('/colaborador');
  const isSuperAdminPath = pathname.startsWith('/superadmin');

  console.log(`[ConditionalLayout INFO V5] Path checks: isAdminPath=${isAdminPath}, isColaboradorPath=${isColaboradorPath}, isSuperAdminPath=${isSuperAdminPath}`);

  // --- MODO BYPASS DO MIDDLEWARE (APENAS PARA DESENVOLVIMENTO) ---
  if (MIDDLEWARE_BYPASS_ACTIVE) {
    console.log("[ConditionalLayout BYPASS ACTIVE V5]");
    if (isSuperAdminPath) {
      console.log(`[ConditionalLayout DECISION V5] (Middleware Bypass) Renderizando SuperAdminLayout para: ${pathname}`);
      return <SuperAdminLayout>{children}</SuperAdminLayout>;
    }
    if (isAdminPath) {
      console.log(`[ConditionalLayout DECISION V5] (Middleware Bypass) Renderizando MainLayout para: ${pathname}`);
      return <MainLayout>{children}</MainLayout>;
    }
    if (isColaboradorPath) {
      console.log(`[ConditionalLayout DECISION V5] (Middleware Bypass) Renderizando MobileLayout para: ${pathname}`);
      return <MobileLayout>{children}</MobileLayout>;
    }
    console.warn(`[ConditionalLayout BYPASS UNHANDLED V5] Path não corresponde a nenhum layout conhecido: ${pathname}. Renderizando children diretamente.`);
    return <>{children}</>; // Fallback for unknown paths in bypass mode
  }

  // --- ROTEAMENTO NORMAL (QUANDO O MIDDLEWARE ESTIVER ATIVO) ---

  // GUEST MODE ROUTING
  if (isGuest) {
    console.log(`[ConditionalLayout GUEST MODE V5] Role (from guest cookie): ${role}`);
    if (role === 'super_admin' && isSuperAdminPath) {
      console.log("[ConditionalLayout DECISION V5] Guest SuperAdminLayout");
      return <SuperAdminLayout>{children}</SuperAdminLayout>;
    }
    if (role === 'admin' && isAdminPath) {
      console.log(`[ConditionalLayout DECISION V5] Guest MainLayout for path ${pathname}`);
      return <MainLayout>{children}</MainLayout>;
    }
    if (role === 'collaborator' && isColaboradorPath) {
      console.log("[ConditionalLayout DECISION V5] Guest MobileLayout");
      return <MobileLayout>{children}</MobileLayout>;
    }
    console.warn(`[ConditionalLayout GUEST FALLBACK V5] Guest on unhandled path or role mismatch. Path: ${pathname}, Guest Role: ${role}. Redirecting to login.`);
    if (typeof window !== 'undefined') router.push('/login?reason=cl_guest_unhandled_path_v5');
    return <div className="flex min-h-screen items-center justify-center"><LoadingSpinner size="lg" text="Redirecionando..." /></div>;
  }

  // AUTHENTICATED USER ROUTING
  if (role) {
    console.log(`[ConditionalLayout AUTH MODE V5] Role: ${role}`);
    if (role === 'super_admin') {
      if (isSuperAdminPath) {
          console.log(`[ConditionalLayout DECISION V5] Authenticated SuperAdminLayout for path ${pathname}`);
          return <SuperAdminLayout>{children}</SuperAdminLayout>;
      }
      console.log(`[ConditionalLayout AUTH REDIRECT V5] Authenticated Super Admin on invalid path ${pathname}. Redirecting to /superadmin.`);
      if (typeof window !== 'undefined') router.push('/superadmin');
      return <div className="flex min-h-screen items-center justify-center"><LoadingSpinner size="lg" text="Redirecionando..." /></div>;
    }

    if (role === 'admin') {
       if (isAdminPath) {
           console.log(`[ConditionalLayout DECISION V5] Authenticated Admin MainLayout for path ${pathname}`);
           return <MainLayout>{children}</MainLayout>;
       }
       console.log(`[ConditionalLayout AUTH REDIRECT V5] Authenticated Admin on invalid path ${pathname}. Redirecting to /.`);
       if (typeof window !== 'undefined') router.push('/');
       return <div className="flex min-h-screen items-center justify-center"><LoadingSpinner size="lg" text="Redirecionando..." /></div>;
    }

    if (role === 'collaborator') {
       if (isColaboradorPath) {
           console.log(`[ConditionalLayout DECISION V5] Authenticated Collaborator MobileLayout for path ${pathname}`);
           return <MobileLayout>{children}</MobileLayout>;
       }
       console.log(`[ConditionalLayout AUTH REDIRECT V5] Authenticated Collaborator on invalid path ${pathname}. Redirecting to /colaborador/dashboard.`);
       if (typeof window !== 'undefined') router.push('/colaborador/dashboard');
       return <div className="flex min-h-screen items-center justify-center"><LoadingSpinner size="lg" text="Redirecionando..." /></div>;
    }
  }

  // Final fallback if no conditions met (should ideally not be reached if middleware and auth logic is correct)
  console.error(`[ConditionalLayout CRITICAL FALLBACK V5] Unhandled state. Path: ${pathname}, Role: ${role}, Guest: ${isGuest}. Redirecting to login.`);
  if (typeof window !== 'undefined') router.push('/login?reason=cl_critical_fallback_v5');
  return <div className="flex min-h-screen items-center justify-center"><LoadingSpinner size="lg" text="Erro de Roteamento..." /></div>;
}
