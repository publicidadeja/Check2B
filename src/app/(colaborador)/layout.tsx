// src/app/(colaborador)/layout.tsx
import type { ReactNode } from 'react';

interface CollaboratorLayoutProps {
  children: ReactNode;
}

// This layout should be a simple pass-through.
// The ConditionalLayout in the root layout will handle applying MobileLayout.
export default function CollaboratorLayout({ children }: CollaboratorLayoutProps) {
  return <>{children}</>;
}
