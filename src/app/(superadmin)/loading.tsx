// src/app/(superadmin)/loading.tsx
'use client';

import { LoadingSpinner } from '@/components/ui/loading-spinner';

export default function Loading() {
  return (
    <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
      <LoadingSpinner size="lg" text="Carregando painel Super Admin..." />
    </div>
  );
}
