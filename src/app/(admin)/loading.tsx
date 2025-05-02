'use client';

import { LoadingSpinner } from '@/components/ui/loading-spinner';

export default function Loading() {
  // You can add any UI inside Loading, including a Skeleton.
  return (
    <div className="flex items-center justify-center h-[calc(100vh-8rem)]"> {/* Adjust height as needed */}
      <LoadingSpinner size="lg" text="Carregando painel administrativo..." />
    </div>
  );
}
