// src/app/(superadmin)/layout.tsx
import type { ReactNode } from 'react';
import { ConditionalLayout } from '@/components/layout/conditional-layout';

interface SuperAdminLayoutProps {
  children: ReactNode;
}

// Wrap the children with ConditionalLayout. It will handle rendering the correct UI.
export default function SuperAdminLayout({ children }: SuperAdminLayoutProps) {
  return <ConditionalLayout>{children}</ConditionalLayout>;
}
