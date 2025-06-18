'use client';

import Image from 'next/image';
import * as React from 'react';
import { Logo } from '@/components/logo'; // Import the new logo
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  text?: string; // Optional loading text
}

export function LoadingSpinner({ size = 'md', className, text }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  };

  return (
    <div className={cn("flex flex-col items-center justify-center gap-3", className)}>
      <div className={cn('animate-pulse', sizeClasses[size])}>
      <Image
              src="/logo.png" // Caminho para a imagem do logo completo na pasta public
              alt="Check2B Logo"
              width={80}
              height={50}
              />
      </div>
      {text && <p className="text-sm text-muted-foreground animate-pulse">{text}</p>}
    </div>
  );
}

// Add basic pulse animation to globals.css if needed, or rely on existing Tailwind animations if suitable.
// Example for globals.css:
/*
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
*/
