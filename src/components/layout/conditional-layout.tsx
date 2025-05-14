
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
  const router = useRouter(); // Ensure useRouter is imported

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

  // Define path categories
  const isAdminPath = !pathname.startsWith('/colaborador') && !pathname.startsWith('/superadmin') && pathname !== '/login';
  const isColaboradorPath = pathname.startsWith('/colaborador');
  const isSuperAdminPath = pathname.startsWith('/superadmin');

  // --- GUEST MODE ROUTING ---
  if (isGuest) {
    if (role === 'super_admin' && isSuperAdminPath) {
      console.log("[ConditionalLayout] DECISION: Guest SuperAdminLayout");
      return <SuperAdminLayout>{children}</SuperAdminLayout>;
    }
    if (role === 'admin' && isAdminPath) {
      console.log(`[ConditionalLayout] DECISION: Guest MainLayout for path ${pathname}`);
      return <MainLayout>{children}</MainLayout>;
    }
    if (role === 'collaborator' && isColaboradorPath) {
      console.log("[ConditionalLayout] DECISION: Guest MobileLayout");
      return <MobileLayout>{children}</MobileLayout>;
    }
    // Fallback for guest on unexpected path or role mismatch
    console.warn(`[ConditionalLayout] Guest on unhandled path or role mismatch. Path: ${pathname}, Guest Role: ${role}. Redirecting to login.`);
    if (typeof window !== 'undefined') router.push('/login?reason=guest_unhandled_path');
    return <div className="flex min-h-screen items-center justify-center"><LoadingSpinner size="lg" text="Redirecionando..." /></div>;
  }

  // --- AUTHENTICATED USER ROUTING ---
  if (role === 'super_admin') {
    if (isSuperAdminPath) {
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
     if (typeof window !== 'undefined') router.push('/'); // Default to admin root
     return <div className="flex min-h-screen items-center justify-center"><LoadingSpinner size="lg" text="Redirecionando..." /></div>;
  }

  if (role === 'collaborator') {
     if (isColaboradorPath) {
         console.log(`[ConditionalLayout] DECISION: Authenticated Collaborator MobileLayout for path ${pathname}`);
         return <MobileLayout>{children}</MobileLayout>;
     }
     console.log(`[ConditionalLayout] Authenticated Collaborator on invalid path ${pathname}. Redirecting to /colaborador/dashboard.`);
     if (typeof window !== 'undefined') router.push('/colaborador/dashboard');
     return <div className="flex min-h-screen items-center justify-center"><LoadingSpinner size="lg" text="Redirecionando..." /></div>;
  }

  // --- TEMPORARY BYPASS FOR DEVELOPMENT (if no role and not guest) ---
  // This part is active because of the middleware bypass
  if (!isGuest && !role) {
      if (isAdminPath) {
        console.log(`[ConditionalLayout] DECISION: Unauthenticated on admin path (middleware bypass active), TEMPORARILY rendering MainLayout for path ${pathname}`);
        return <MainLayout>{children}</MainLayout>;
      }
      if (isColaboradorPath) {
         console.log(`[ConditionalLayout] DECISION: Unauthenticated on colaborador path (middleware bypass active), TEMPORARILY rendering MobileLayout for path ${pathname}`);
         return <MobileLayout>{children}</MobileLayout>;
      }
      if (isSuperAdminPath) {
           console.log(`[ConditionalLayout] DECISION: Unauthenticated on superadmin path (middleware bypass active), TEMPORARILY rendering SuperAdminLayout for path ${pathname}`);
           return <SuperAdminLayout>{children}</SuperAdminLayout>;
      }
    // Default redirect if no bypass condition met (e.g., accessing an unknown path without auth state)
    console.log(`[ConditionalLayout] No auth state (and middleware bypass active) & no specific path category match. Path: ${pathname}. Redirecting to login.`);
    if (typeof window !== 'undefined') router.push('/login?reason=no_auth_state_no_bypass');
    return <div className="flex min-h-screen items-center justify-center"><LoadingSpinner size="lg" text="Redirecionando para login..." /></div>;
  }

  // Final fallback if something is very wrong
  console.error(`[ConditionalLayout] CRITICAL FALLBACK - Path: ${pathname}, Role: ${role}, Guest: ${isGuest}. This state should not be reached. Redirecting to login as a safety measure.`);
  if (typeof window !== 'undefined') router.push('/login?reason=cl_critical_fallback');
  return <div className="flex min-h-screen items-center justify-center"><LoadingSpinner size="lg" text="Erro de Roteamento Crítico..." /></div>;
}
