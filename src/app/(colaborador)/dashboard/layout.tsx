// src/app/(colaborador)/dashboard/layout.tsx
import type { ReactNode } from 'react';

export default function DashboardSpecificLayout({ children }: { children: ReactNode }) {
  // Este layout específico do dashboard simplesmente repassa os filhos.
  // O layout principal de /src/app/(colaborador)/layout.tsx será aplicado.
  return <>{children}</>;
}
