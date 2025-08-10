
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
  const { user, role, organizationId, isLoading, isGuest } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  // FINAL FIX: This is the most important change.
  // We wait until the authentication state is fully resolved before rendering anything.
  // This prevents the layout from flashing the login page or making incorrect routing decisions
  // while `useAuth` is still verifying the user's token and profile.
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" text="Verificando sessão..." />
      </div>
    );
  }

  // If we are on the login page, render it directly without any layout wrapper.
  // This also handles the case where an authenticated user might be redirected here,
  // letting the page logic handle the redirect back to the correct dashboard.
  if (pathname === '/login') {
    return <>{children}</>;
  }

  // If not loading and not on login, but we have no user and are not a guest,
  // it means the user is unauthenticated and trying to access a protected page.
  // Redirect them to the login page.
  if (!user && !isGuest) {
    // Using useEffect to avoid modifying state during render, though this is a navigation side-effect
    // that should be safe.
    React.useEffect(() => {
        router.replace(`/login?reason=unauthenticated&from=${pathname}`);
    }, [router, pathname]);
    
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" text="Redirecionando..." />
      </div>
    );
  }

  // Define path types based on the current URL
  const isAdminPath = !pathname.startsWith('/colaborador') && !pathname.startsWith('/superadmin');
  const isColaboradorPath = pathname.startsWith('/colaborador');
  const isSuperAdminPath = pathname.startsWith('/superadmin');

  // Determine the correct layout based on the user's role
  // This logic now runs only after `isLoading` is false and we have a valid auth state.
  if (role === 'super_admin') {
    return isSuperAdminPath ? <SuperAdminLayout>{children}</SuperAdminLayout> : <div className="flex min-h-screen items-center justify-center"><LoadingSpinner text="Redirecionando para painel Super Admin..."/></div>;
  }
  if (role === 'admin') {
    return isAdminPath ? <MainLayout>{children}</MainLayout> : <div className="flex min-h-screen items-center justify-center"><LoadingSpinner text="Redirecionando para painel Admin..."/></div>;
  }
  if (role === 'collaborator') {
    return isColaboradorPath ? <MobileLayout>{children}</MobileLayout> : <div className="flex min-h-screen items-center justify-center"><LoadingSpinner text="Redirecionando para painel do Colaborador..."/></div>;
  }
  
  // Fallback for any unknown state (e.g., guest on a protected route, unknown role)
  // This will be caught by the redirect logic at the top of the component on the next render cycle.
  return (
    <div className="flex min-h-screen items-center justify-center">
      <LoadingSpinner size="lg" text="Carregando..." />
    </div>
  );
}
