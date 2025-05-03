// src/components/layout/conditional-layout.tsx
'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
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

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" text="Carregando..." />
      </div>
    );
  }

  // Explicitly handle login page - no layout needed
  if (pathname === '/login') {
    return <>{children}</>;
  }

  // Determine layout based on role or guest status
  if (role === 'super_admin') {
    return <SuperAdminLayout>{children}</SuperAdminLayout>;
  } else if (role === 'admin') {
     // Check if the path indicates an admin area (root or non-collaborator/superadmin)
     if (!pathname.startsWith('/colaborador') && !pathname.startsWith('/superadmin')) {
         return <MainLayout>{children}</MainLayout>;
     }
  } else if (role === 'collaborator') {
     // Check if the path indicates a collaborator area
     if (pathname.startsWith('/colaborador')) {
         return <MobileLayout>{children}</MobileLayout>;
     }
  }

  // Fallback for unexpected states or non-matching paths after login/guest check
  // This might redirect or show a generic layout/error
  console.warn(`[ConditionalLayout] No matching layout for role "${role}" and path "${pathname}". Rendering children directly.`);
  return <>{children}</>; // Render children directly as a fallback
}
