// src/app/colaborador/layout.tsx
'use client';
import type { ReactNode } from 'react';

// Este layout deve ser um simples pass-through.
// O ConditionalLayout no layout raiz (src/app/layout.tsx)
// já é responsável por aplicar o MobileLayout correto para as rotas de colaborador.
export default function ColaboradorRootLayout({ children }: { children: ReactNode }) {
  console.log("[ColaboradorRootLayout /colaborador/layout.tsx] Rendering children directly. ConditionalLayout handles MobileLayout application.");
  return <>{children}</>;
}
