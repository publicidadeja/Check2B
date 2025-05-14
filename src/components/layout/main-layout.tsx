// src/components/layout/main-layout.tsx
'use client';

import type { ReactNode } from 'react';
import * as React from 'react';
// import Link from 'next/link';
// import { usePathname, useRouter } from 'next/navigation';
// import {
//   Users,
//   ClipboardList,
//   ClipboardCheck,
//   LayoutDashboard,
//   Settings,
//   LogOut,
//   Briefcase,
//   Building,
//   Trophy,
//   Target,
//   Menu as MenuIcon,
// } from 'lucide-react';

// import {
//   Sidebar,
//   SidebarContent,
//   SidebarHeader,
//   SidebarMenu,
//   SidebarMenuItem,
//   SidebarMenuButton,
//   SidebarProvider,
//   SidebarTrigger,
//   SidebarFooter,
//   SidebarSeparator,
// } from '@/components/ui/sidebar';
// import { useIsMobile } from '@/hooks/use-mobile';
// import { Button } from '@/components/ui/button';
// import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
// import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
// import { logoutUser } from '@/lib/auth';
// import { useToast } from '@/hooks/use-toast';
// import { Logo } from '@/components/logo';
// import { LoadingSpinner } from '@/components/ui/loading-spinner';
// import { cn } from '@/lib/utils';
// import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetClose } from '@/components/ui/sheet';
// import { useAuth } from '@/hooks/use-auth';

interface MainLayoutProps {
  children: ReactNode;
}

// EXTREME DEBUG VERSION
export function MainLayout({ children }: MainLayoutProps) {
  console.log('[MainLayout EXTREME DEBUG V3] Renderizando MainLayout...');
  console.log('[MainLayout EXTREME DEBUG V3] Children:', children);

  return (
    <div style={{ border: '8px solid hotpink', display: 'flex', flexDirection: 'column', minHeight: '100vh', position: 'relative', zIndex: 9999 }}>
      <header style={{ background: 'rgba(255, 105, 180, 0.7)', padding: '15px', color: 'black', textAlign: 'center', borderBottom: '2px solid darkmagenta', fontSize: '1.5rem', fontWeight: 'bold' }}>
        ADMIN HEADER (SUPER VISIBLE DEBUG V3)
      </header>
      <div style={{ display: 'flex', flexGrow: 1 }}>
        <aside style={{ background: 'rgba(144, 238, 144, 0.7)', width: '250px', padding: '15px', borderRight: '2px solid darkgreen', fontSize: '1.2rem' }}>
          <p style={{ fontWeight: 'bold', color: 'darkgreen' }}>SIDEBAR (SUPER VISIBLE DEBUG V3)</p>
          <ul style={{ listStyle: 'none', padding: '10px 0' }}>
            <li style={{ padding: '8px 0', borderBottom: '1px solid lightgray' }}>Dashboard (Link Fixo)</li>
            <li style={{ padding: '8px 0', borderBottom: '1px solid lightgray' }}>Colaboradores (Link Fixo)</li>
            <li style={{ padding: '8px 0', borderBottom: '1px solid lightgray' }}>Tarefas (Link Fixo)</li>
            <li style={{ padding: '8px 0' }}>Configurações (Link Fixo)</li>
          </ul>
        </aside>
        <main style={{ background: 'rgba(173, 216, 230, 0.7)', flexGrow: 1, padding: '25px', border: '2px solid darkblue' }}>
          <h2 style={{color: 'darkblue', borderBottom: '1px solid darkblue', paddingBottom: '10px', marginBottom: '15px'}}>Conteúdo Principal (DEBUG V3)</h2>
          {children}
        </main>
      </div>
      <footer style={{ background: 'lightgray', padding: '10px', textAlign: 'center', borderTop: '2px solid gray', fontSize: '0.9rem' }}>
        ADMIN FOOTER (DEBUG V3)
      </footer>
    </div>
  );
}
