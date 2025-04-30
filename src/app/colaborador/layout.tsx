
'use client';

import type { ReactNode } from 'react';
import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ClipboardCheck,
  Target,
  Trophy,
  User,
  LogOut,
} from 'lucide-react';

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/toaster'; // Ensure Toaster is available

interface EmployeeLayoutProps {
  children: ReactNode;
}

// Simplified navigation for employees
const navItems = [
  { href: '/colaborador/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/colaborador/avaliacoes', label: 'Minhas Avaliações', icon: ClipboardCheck },
  { href: '/colaborador/desafios', label: 'Meus Desafios', icon: Target },
  { href: '/colaborador/ranking', label: 'Meu Ranking', icon: Trophy },
  { href: '/colaborador/perfil', label: 'Meu Perfil', icon: User },
];

// Mock employee data for layout display
const mockEmployee = {
    id: '1', // Assume logged-in employee is Alice Silva
    name: 'Alice Silva',
    email: 'alice.silva@check2b.com',
    photoUrl: 'https://picsum.photos/id/1027/40/40',
};

const getInitials = (name: string) => {
    return name
        ?.split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase() || '??';
};

export default function EmployeeLayout({ children }: EmployeeLayoutProps) {
  const isMobile = useIsMobile();
  const pathname = usePathname();

  // Determine the current section title based on the path
  const getCurrentTitle = () => {
    const currentNavItem = navItems.find(item => pathname?.startsWith(item.href));
    return currentNavItem?.label || 'Check2B Colaborador';
  };

  return (
    <TooltipProvider>
      <SidebarProvider defaultOpen={!isMobile} collapsible="icon">
        <Sidebar variant="sidebar" side="left" collapsible="icon">
           <SidebarHeader className="items-center justify-center gap-2 p-4">
              {/* Simplified Logo */}
              <div className="flex items-center gap-2 group-data-[collapsible=icon]:hidden">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7 text-primary">
                  <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" clipRule="evenodd" />
                </svg>
                <span className="text-lg font-semibold text-primary">Check2B</span>
              </div>
              <div className="group-data-[collapsible=icon]:flex group-data-[collapsible=offcanvas]:hidden group-data-[state=expanded]:hidden hidden">
                 <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7 text-primary">
                    <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" clipRule="evenodd" />
                  </svg>
              </div>
              <SidebarTrigger className="group-data-[collapsible=offcanvas]:flex hidden ml-auto" />
            </SidebarHeader>
          <Separator />
          <SidebarContent className="p-2">
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <Link href={item.href} passHref legacyBehavior>
                    <SidebarMenuButton
                      as="a"
                      isActive={pathname === item.href}
                      tooltip={item.label}
                    >
                      <item.icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </Link>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter className="p-2">
              <Separator />
              <div className="flex items-center justify-between p-2 group-data-[collapsible=icon]:hidden">
                 <div className="flex items-center gap-2">
                   <Avatar className="h-8 w-8">
                     <AvatarImage src={mockEmployee.photoUrl} alt={mockEmployee.name} />
                     <AvatarFallback>{getInitials(mockEmployee.name)}</AvatarFallback>
                   </Avatar>
                   <div className="flex flex-col">
                       <span className="text-sm font-medium">{mockEmployee.name}</span>
                       <span className="text-xs text-muted-foreground">{mockEmployee.email}</span>
                   </div>
                 </div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => alert('Logout não implementado')}>
                        <LogOut className="h-4 w-4" />
                         <span className="sr-only">Sair</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right" align="center">Sair</TooltipContent>
                  </Tooltip>
              </div>
               <div className="group-data-[collapsible=icon]:flex group-data-[collapsible=offcanvas]:hidden group-data-[state=expanded]:hidden hidden justify-center p-2">
                 <Tooltip>
                    <TooltipTrigger asChild>
                       <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => alert('Logout não implementado')}>
                         <LogOut className="h-4 w-4" />
                         <span className="sr-only">Sair</span>
                       </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right" align="center">Sair</TooltipContent>
                  </Tooltip>
               </div>
          </SidebarFooter>
        </Sidebar>
        <SidebarInset className="flex flex-col">
          <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 lg:px-6">
            <SidebarTrigger className="md:hidden" /> {/* Mobile trigger */}
            <h1 className="text-lg font-semibold">
               {getCurrentTitle()}
            </h1>
            {/* Header actions specific to employee view if any */}
          </header>
          <main className="flex-1 overflow-auto p-4 lg:p-6">{children}</main>
          <Toaster /> {/* Add Toaster to the layout */}
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}

