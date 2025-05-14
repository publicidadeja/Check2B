// src/components/layout/conditional-layout.tsx
'use client';

import * as React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { MainLayout } from '@/components/layout/main-layout';
import { MobileLayout } from '@/components/layout/mobile-layout';
import { SuperAdminLayout } from '@/components/layout/superadmin-layout';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface ConditionalLayoutProps {
  children: React.ReactNode;
}

export function ConditionalLayout({ children }: ConditionalLayoutProps) {
  const { role, isLoading, isGuest } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  console.log(`[ConditionalLayout START] Path: ${pathname}, Role: ${role}, isLoading: ${isLoading}, isGuest: ${isGuest}`);

  if (isLoading) {
    console.log("[ConditionalLayout] DECISION: Loading spinner");
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" text="Carregando..." />
      </div>
    );
  }

  if (pathname === '/login') {
    console.log("[ConditionalLayout] DECISION: Login page, rendering children directly.");
    return <>{children}</>;
  }

  // Define admin paths
  const isAdminPath = !pathname.startsWith('/colaborador') && !pathname.startsWith('/superadmin');

  if (isGuest) {
    console.log(`[ConditionalLayout] GUEST MODE. Role: ${role}, Path: ${pathname}`);
    if (role === 'super_admin' && pathname.startsWith('/superadmin')) {
      console.log("[ConditionalLayout] DECISION: Guest SuperAdminLayout");
      return <SuperAdminLayout>{children}</SuperAdminLayout>;
    }
    if (role === 'admin' && isAdminPath) {
      console.log(`[ConditionalLayout] DECISION: Guest MainLayout for path ${pathname}`);
      return <MainLayout>{children}</MainLayout>;
    }
    if (role === 'collaborator' && pathname.startsWith('/colaborador')) {
      console.log("[ConditionalLayout] DECISION: Guest MobileLayout");
      return <MobileLayout>{children}</MobileLayout>;
    }
    // If guest role/path mismatch, redirect to login
    console.warn(`[ConditionalLayout] Guest on unhandled path or role mismatch. Path: ${pathname}, Guest Role: ${role}. Redirecting to login.`);
    if (typeof window !== 'undefined') router.push('/login?reason=guest_unhandled_path');
    return <div className="flex min-h-screen items-center justify-center"><LoadingSpinner size="lg" text="Redirecionando..." /></div>;
  }

  // Authenticated User Routing
  if (role === 'super_admin') {
    if (pathname.startsWith('/superadmin')) {
        console.log(`[ConditionalLayout] DECISION: Authenticated SuperAdminLayout for path ${pathname}`);
        return <SuperAdminLayout>{children}</SuperAdminLayout>;
    }
    console.log(`[ConditionalLayout] Authenticated Super Admin on invalid path ${pathname}. Redirecting to /superadmin.`);
    if (typeof window !== 'undefined') router.push('/superadmin');
    return <div className="flex min-h-screen items-center justify-center"><LoadingSpinner size="lg" text="Redirecionando..." /></div>;
  }

  if (role === 'admin') {
     if (isAdminPath) {
         console.log(`[ConditionalLayout] DECISION: Authenticated Admin MainLayout for path ${pathname}`);
         return <MainLayout>{children}</MainLayout>;
     }
     console.log(`[ConditionalLayout] Authenticated Admin on invalid path ${pathname}. Redirecting to /.`);
     if (typeof window !== 'undefined') router.push('/');
     return <div className="flex min-h-screen items-center justify-center"><LoadingSpinner size="lg" text="Redirecionando..." /></div>;
  }

  if (role === 'collaborator') {
     if (pathname.startsWith('/colaborador')) {
         console.log(`[ConditionalLayout] DECISION: Authenticated Collaborator MobileLayout for path ${pathname}`);
         return <MobileLayout>{children}</MobileLayout>;
     }
     console.log(`[ConditionalLayout] Authenticated Collaborator on invalid path ${pathname}. Redirecting to /colaborador/dashboard.`);
     if (typeof window !== 'undefined') router.push('/colaborador/dashboard');
     return <div className="flex min-h-screen items-center justify-center"><LoadingSpinner size="lg" text="Redirecionando..." /></div>;
  }

  // Fallback for users not logged in (neither guest nor authenticated role)
  // This state means useAuth has finished loading, user is not a guest, and no role was determined (e.g., not logged in)
  if (!isGuest && !role) {
    console.warn(`[ConditionalLayout] No authenticated role and not guest. Path: ${pathname}. Redirecting to login.`);
    if (typeof window !== 'undefined') router.push('/login?reason=no_auth_state');
    return <div className="flex min-h-screen items-center justify-center"><LoadingSpinner size="lg" text="Redirecionando para login..." /></div>;
  }

  // If execution reaches here, it's a truly unhandled state.
  // This might happen if 'role' is some unexpected value.
  console.error(`[ConditionalLayout] CRITICAL FALLBACK - Unhandled routing state. Role: "${role}", Path: "${pathname}", isGuest: ${isGuest}. Redirecting to login as a safety measure.`);
  if (typeof window !== 'undefined') router.push('/login?reason=critical_fallback');
  return <div className="flex min-h-screen items-center justify-center"><LoadingSpinner size="lg" text="Erro de Roteamento Crítico..." /></div>;
}
