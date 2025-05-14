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

export function ConditionalLayout({ children }: ConditionalLayoutProps) {
  const { role, isLoading, isGuest } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  console.log(`[ConditionalLayout START V4] Path: ${pathname}, Role: ${role}, isLoading: ${isLoading}, isGuest: ${isGuest}`);

  if (isLoading) {
    console.log("[ConditionalLayout DECISION V4] Loading spinner (Auth state loading)");
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" text="Carregando sistema..." />
      </div>
    );
  }

  if (pathname === '/login') {
    console.log("[ConditionalLayout DECISION V4] Login page, rendering children directly.");
    return <>{children}</>;
  }

  const isAdminPath = !pathname.startsWith('/colaborador') && !pathname.startsWith('/superadmin') && pathname !== '/login';
  const isColaboradorPath = pathname.startsWith('/colaborador');
  const isSuperAdminPath = pathname.startsWith('/superadmin');

  console.log(`[ConditionalLayout INFO V4] Path checks: isAdminPath=${isAdminPath}, isColaboradorPath=${isColaboradorPath}, isSuperAdminPath=${isSuperAdminPath}`);

  // --- GUEST MODE ROUTING ---
  if (isGuest) {
    console.log(`[ConditionalLayout GUEST MODE V4] Role (from guest cookie): ${role}`);
    if (role === 'super_admin' && isSuperAdminPath) {
      console.log("[ConditionalLayout DECISION V4] Guest SuperAdminLayout");
      return <SuperAdminLayout>{children}</SuperAdminLayout>;
    }
    if (role === 'admin' && isAdminPath) {
      console.log(`[ConditionalLayout DECISION V4] Guest MainLayout for path ${pathname}`);
      return <MainLayout>{children}</MainLayout>;
    }
    if (role === 'collaborator' && isColaboradorPath) {
      console.log("[ConditionalLayout DECISION V4] Guest MobileLayout");
      return <MobileLayout>{children}</MobileLayout>;
    }
    console.warn(`[ConditionalLayout GUEST FALLBACK V4] Guest on unhandled path or role mismatch. Path: ${pathname}, Guest Role: ${role}. Redirecting to login.`);
    if (typeof window !== 'undefined') router.push('/login?reason=cl_guest_unhandled_path_v4');
    return <div className="flex min-h-screen items-center justify-center"><LoadingSpinner size="lg" text="Redirecionando..." /></div>;
  }

  // --- AUTHENTICATED USER ROUTING ---
  if (role) { // User is authenticated if role is present and not guest
    console.log(`[ConditionalLayout AUTH MODE V4] Role: ${role}`);
    if (role === 'super_admin') {
      if (isSuperAdminPath) {
          console.log(`[ConditionalLayout DECISION V4] Authenticated SuperAdminLayout for path ${pathname}`);
          return <SuperAdminLayout>{children}</SuperAdminLayout>;
      }
      console.log(`[ConditionalLayout AUTH REDIRECT V4] Authenticated Super Admin on invalid path ${pathname}. Redirecting to /superadmin.`);
      if (typeof window !== 'undefined') router.push('/superadmin');
      return <div className="flex min-h-screen items-center justify-center"><LoadingSpinner size="lg" text="Redirecionando..." /></div>;
    }

    if (role === 'admin') {
       if (isAdminPath) {
           console.log(`[ConditionalLayout DECISION V4] Authenticated Admin MainLayout for path ${pathname}`);
           return <MainLayout>{children}</MainLayout>;
       }
       console.log(`[ConditionalLayout AUTH REDIRECT V4] Authenticated Admin on invalid path ${pathname}. Redirecting to /.`);
       if (typeof window !== 'undefined') router.push('/');
       return <div className="flex min-h-screen items-center justify-center"><LoadingSpinner size="lg" text="Redirecionando..." /></div>;
    }

    if (role === 'collaborator') {
       if (isColaboradorPath) {
           console.log(`[ConditionalLayout DECISION V4] Authenticated Collaborator MobileLayout for path ${pathname}`);
           return <MobileLayout>{children}</MobileLayout>;
       }
       console.log(`[ConditionalLayout AUTH REDIRECT V4] Authenticated Collaborator on invalid path ${pathname}. Redirecting to /colaborador/dashboard.`);
       if (typeof window !== 'undefined') router.push('/colaborador/dashboard');
       return <div className="flex min-h-screen items-center justify-center"><LoadingSpinner size="lg" text="Redirecionando..." /></div>;
    }
  }


  // --- TEMPORARY BYPASS FOR DEVELOPMENT (if no role and not guest, due to middleware bypass) ---
  if (!isGuest && !role) {
    console.log(`[ConditionalLayout BYPASS MODE V4] No role & not guest. Path: ${pathname}`);
    if (isAdminPath) {
      console.log(`[ConditionalLayout DECISION V4] (Bypass) USING MAINLAYOUT for admin path: ${pathname}`);
      return <MainLayout>{children}</MainLayout>;
    }
    if (isColaboradorPath) {
       console.log(`[ConditionalLayout DECISION V4] (Bypass) USING MOBILELAYOUT for colaborador path: ${pathname}`);
       return <MobileLayout>{children}</MobileLayout>;
    }
    if (isSuperAdminPath) {
        console.log(`[ConditionalLayout DECISION V4] (Bypass) USING SUPERADMINLAYOUT for superadmin path: ${pathname}`);
        return <SuperAdminLayout>{children}</SuperAdminLayout>;
    }
    console.log(`[ConditionalLayout BYPASS FALLBACK V4] No specific path category match. Path: ${pathname}. Redirecting to login.`);
    if (typeof window !== 'undefined') router.push('/login?reason=cl_bypass_no_path_match_v4');
    return <div className="flex min-h-screen items-center justify-center"><LoadingSpinner size="lg" text="Redirecionando para login..." /></div>;
  }

  // Final fallback (should ideally not be reached if logic above is complete)
  console.error(`[ConditionalLayout CRITICAL FALLBACK V4] Unhandled state. Path: ${pathname}, Role: ${role}, Guest: ${isGuest}. Redirecting to login.`);
  if (typeof window !== 'undefined') router.push('/login?reason=cl_critical_fallback_v4');
  return <div className="flex min-h-screen items-center justify-center"><LoadingSpinner size="lg" text="Erro de Roteamento..." /></div>;
}
