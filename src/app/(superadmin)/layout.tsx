// src/app/(superadmin)/layout.tsx
import type { ReactNode } from 'react';

interface SuperAdminLayoutProps {
  children: ReactNode;
}

// This layout should be a simple pass-through.
// The ConditionalLayout in the root layout will handle applying SuperAdminLayout.
export default function SuperAdminLayout({ children }: SuperAdminLayoutProps) {
  return <>{children}</>;
}
