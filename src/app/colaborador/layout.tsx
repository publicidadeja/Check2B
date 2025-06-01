// src/app/colaborador/layout.tsx
'use client';
import type { ReactNode } from 'react';
import { MobileLayout } from '@/components/layout/mobile-layout'; // Corrected path

interface ColaboradorPageLayoutProps {
  children: ReactNode;
}

export default function ColaboradorPageLayout({ children }: ColaboradorPageLayoutProps) {
  console.log("[ColaboradorPageLayout] Rendering. This layout will wrap children with MobileLayout.");
  return (
    <MobileLayout>
      {children}
    </MobileLayout>
  );
}
