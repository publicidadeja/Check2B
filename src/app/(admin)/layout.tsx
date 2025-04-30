
// src/app/(admin)/layout.tsx
import type { ReactNode } from 'react';
import { MainLayout } from '@/components/layout/main-layout';

interface AdminLayoutProps {
  children: ReactNode;
}

// This layout will wrap all pages inside the (admin) group
export default function AdminLayout({ children }: AdminLayoutProps) {
  return <MainLayout>{children}</MainLayout>;
}
