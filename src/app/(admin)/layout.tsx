// src/app/(admin)/layout.tsx
import type { ReactNode } from 'react';

interface AdminLayoutProps {
  children: ReactNode;
}

// This layout should be a simple pass-through.
// The ConditionalLayout in the root layout will handle applying MainLayout.
export default function AdminLayout({ children }: AdminLayoutProps) {
  return <>{children}</>;
}
