// src/app/(colaborador)/dashboard/layout.tsx
import type { ReactNode } from 'react';

export default function DashboardSpecificLayout({ children }: { children: ReactNode }) {
  // This layout simply passes children through, allowing the parent layout
  // from /src/app/(colaborador)/layout.tsx to apply.
  return <>{children}</>;
}
