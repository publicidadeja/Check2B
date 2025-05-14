// src/components/layout/conditional-layout.tsx
'use client';

import * as React from 'react';
import { usePathname, useRouter } from 'next/navigation'; // Added useRouter
import { useAuth } from '@/hooks/use-auth';
import { MainLayout } from '@/components/layout/main-layout'; // Admin Layout
import { MobileLayout } from '@/components/layout/mobile-layout'; // Collaborator Layout
import { SuperAdminLayout } from '@/components/layout/superadmin-layout'; // Super Admin Layout
import { LoadingSpinner } from '@/components/ui/loading-spinner'; // Loading state

interface ConditionalLayoutProps {
  children: React.ReactNode;
}

export function ConditionalLayout({ children }: ConditionalLayoutProps) {
  const { role, isLoading, isGuest } = useAuth();
  const pathname = usePathname();
  const router = useRouter(); // Initialize router

  console.log(`[ConditionalLayout] Evaluating. isLoading: ${isLoading}, role: ${role}, isGuest: ${isGuest}, pathname: ${pathname}`);

  if (isLoading) {
    console.log("[ConditionalLayout] Showing loading spinner.");
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" text="Carregando..." />
      </div>
    );
  }

  if (pathname === '/login') {
    console.log("[ConditionalLayout] Path is /login, rendering children directly.");
    return <>{children}</>;
  }

  if (role === 'super_admin') {
    // Allow super_admin at root or /superadmin paths
    if (pathname.startsWith('/superadmin') || pathname === '/') {
        console.log(`[ConditionalLayout] Applying SuperAdminLayout. Role: ${role}, Guest: ${isGuest}, Path: ${pathname}`);
        return <SuperAdminLayout>{children}</SuperAdminLayout>;
    }
  } else if (role === 'admin') {
     // Check if the path indicates an admin area (root or non-collaborator/superadmin)
     if (!pathname.startsWith('/colaborador') && !pathname.startsWith('/superadmin')) {
         console.log(`[ConditionalLayout] Applying MainLayout for admin. Role: ${role}, Guest: ${isGuest}, Path: ${pathname}`);
         return <MainLayout>{children}</MainLayout>;
     }
  } else if (role === 'collaborator') {
     // Check if the path indicates a collaborator area
     if (pathname.startsWith('/colaborador')) {
         console.log(`[ConditionalLayout] Applying MobileLayout for collaborator. Role: ${role}, Guest: ${isGuest}, Path: ${pathname}`);
         return <MobileLayout>{children}</MobileLayout>;
     }
  }

  // Fallback logic
  console.warn(`[ConditionalLayout] No matching layout. Role: "${role}", Guest: ${isGuest}, Path: "${pathname}".`);

  if (isGuest) {
      console.log(`[ConditionalLayout] Guest on unhandled path "${pathname}". Redirecting to /login.`);
      // Client-side redirect for guest on unhandled path
      if (typeof window !== 'undefined') {
        router.push('/login?reason=guest_unhandled_path');
      }
      return <div className="flex min-h-screen items-center justify-center"><LoadingSpinner size="lg" text="Redirecionando..." /></div>;
  }

  // Fallback for authenticated users with unhandled role/path combination.
  console.error(`[ConditionalLayout] CRITICAL FALLBACK for authenticated user. Role: ${role}, Path: ${pathname}. Redirecting to /login.`);
  if (typeof window !== 'undefined') {
    router.push('/login?reason=auth_unhandled_path');
  }
  return <div className="flex min-h-screen items-center justify-center"><LoadingSpinner size="lg" text="Erro de Roteamento..." /></div>;
}
