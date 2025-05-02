// src/app/(admin)/layout.tsx
import type { ReactNode } from 'react';
import { MainLayout } from '@/components/layout/main-layout';

interface AdminLayoutProps {
  children: ReactNode;
}

// This layout applies the MainLayout (with sidebar, header, etc.)
// to all pages within the (admin) route group (e.g., /, /employees, /tasks).
// The MainLayout handles the sidebar visibility and responsiveness.
export default function AdminLayout({ children }: AdminLayoutProps) {
  return <MainLayout>{children}</MainLayout>;
}