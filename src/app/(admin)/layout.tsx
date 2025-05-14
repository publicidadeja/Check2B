// src/app/(admin)/layout.tsx
import type { ReactNode } from 'react';

// This layout should be a simple pass-through.
// The ConditionalLayout in the root layout will handle applying MainLayout.
export default function AdminLayout({ children }: { children: ReactNode }) {
  console.log("[AdminLayout (group) V2] Rendering children directly. Path should be handled by ConditionalLayout.");
  return <>{children}</>;
}
