
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
  const { user, role, isLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  // Show a full-page loading spinner while the auth state is being resolved.
  // This is the most crucial part to prevent layout flashes or premature redirects.
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <LoadingSpinner size="lg" text="Verificando sessão..." />
      </div>
    );
  }

  // If we are on the login page, render it directly without any layout wrapper.
  if (pathname === '/login') {
      // If user is somehow already authenticated while on login page, redirect them.
      if(user && role) {
          React.useEffect(() => {
              let redirectPath = '/'; 
              if (role === 'super_admin') redirectPath = '/superadmin';
              else if (role === 'collaborator') redirectPath = '/colaborador/dashboard';
              router.replace(redirectPath);
          }, [role, router]);
          // Render a loading spinner during the brief redirect period.
          return <div className="flex min-h-screen items-center justify-center bg-background"><LoadingSpinner size="lg" text="Redirecionando..."/></div>;
      }
      return <>{children}</>;
  }


  // If authentication is resolved (isLoading is false) and there's no user,
  // redirect any protected route access to the login page.
  if (!isLoading && !user) {
    React.useEffect(() => {
        const from = pathname === '/' ? '' : `?from=${pathname}`;
        router.replace(`/login${from}`);
    }, [pathname, router]);
    // Render a loading spinner while redirecting.
    return (
        <div className="flex min-h-screen items-center justify-center bg-background">
            <LoadingSpinner size="lg" text="Redirecionando..." />
        </div>
    );
  }


  // At this point, we have a logged-in user. Determine the correct layout.
  const isAdminPath = !pathname.startsWith('/colaborador') && !pathname.startsWith('/superadmin');
  const isColaboradorPath = pathname.startsWith('/colaborador');
  const isSuperAdminPath = pathname.startsWith('/superadmin');

  if (role === 'super_admin') {
    if (!isSuperAdminPath) {
        React.useEffect(() => { router.replace('/superadmin') }, [router]);
        return <div className="flex min-h-screen items-center justify-center bg-background"><LoadingSpinner size="lg" text="Redirecionando..."/></div>;
    }
    return <SuperAdminLayout>{children}</SuperAdminLayout>;
  }
  
  if (role === 'admin') {
    if (!isAdminPath) {
        React.useEffect(() => { router.replace('/') }, [router]);
        return <div className="flex min-h-screen items-center justify-center bg-background"><LoadingSpinner size="lg" text="Redirecionando..."/></div>;
    }
    return <MainLayout>{children}</MainLayout>;
  }

  if (role === 'collaborator') {
    if (!isColaboradorPath) {
        React.useEffect(() => { router.replace('/colaborador/dashboard') }, [router]);
        return <div className="flex min-h-screen items-center justify-center bg-background"><LoadingSpinner size="lg" text="Redirecionando..."/></div>;
    }
    return <MobileLayout>{children}</MobileLayout>;
  }
  
  // Fallback case: user exists but role is unknown or doesn't match any layout.
  // This is an error state, so redirect to login after logging the issue.
  console.error(`Unknown role or path combination. Role: ${role}, Path: ${pathname}`);
  React.useEffect(() => { router.replace('/login?reason=unknown_role') }, [router]);
  return <div className="flex min-h-screen items-center justify-center bg-background"><LoadingSpinner size="lg" text="Erro de perfil..."/></div>;
}
