// src/app/(colaborador)/layout.tsx
import type { ReactNode } from 'react';
import { ConditionalLayout } from '@/components/layout/conditional-layout';

interface CollaboratorLayoutProps {
  children: ReactNode;
}

// Wrap the children with ConditionalLayout. It will handle rendering the correct UI.
export default function CollaboratorLayout({ children }: CollaboratorLayoutProps) {
  return <ConditionalLayout>{children}</ConditionalLayout>;
}
