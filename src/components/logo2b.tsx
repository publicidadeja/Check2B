// src/components/logo2b.tsx
'use client';

import Image from 'next/image';
import * as React from 'react';
import { cn } from '@/lib/utils';

interface Logo2bProps {
  className?: string; // Ex: "h-8 w-auto"
}

// Este componente agora renderiza o logo completo "Check2B" como uma imagem.
// Certifique-se de que você tem um arquivo de imagem em `public/logo-check2b-text.png`
export default function Logo2b({ className }: Logo2bProps) {
  return (
    <div className={cn('relative', className)}>
      <Image
        src="/logo-check2b-text.png" // Caminho para a imagem do logo completo na pasta public
        alt="Check2B Logo"
        fill
        style={{ objectFit: 'contain' }} // 'contain' é bom para logos para manter a proporção
        priority // Adicione priority se este logo for LCP (Largest Contentful Paint)
      />
    </div>
  );
}
