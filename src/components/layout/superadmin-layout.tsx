// src/components/layout/superadmin-layout.tsx
'use client';

import type { ReactNode } from 'react';
import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Settings,
  LogOut,
  Building,
  Users,
  BarChart,
  LifeBuoy,
  DollarSign, // Added DollarSign
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
} from '@/components/ui/sidebar'; // Adjusted import path assuming standard structure
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { logoutUser } from '@/lib/auth'; // Assuming shared auth logic
import { useToast } from '@/hooks/use-toast';
import { Logo } from '@/components/logo';

interface SuperAdminLayoutProps {
  children: ReactNode;
}

// Super Admin specific navigation items
const navItems = [
  { href: '/superadmin', label: 'Visão Geral', icon: LayoutDashboard },
  { href: '/superadmin/organizations', label: 'Organizações', icon: Building },
  { href: '/superadmin/users', label: 'Usuários Globais', icon: Users },
  { href: '/superadmin/plans', label: 'Planos', icon: DollarSign },
  { href: '/superadmin/settings', label: 'Config. SaaS', icon: Settings },
  { href: '/superadmin/analytics', label: 'Analytics', icon: BarChart },
  { href: '/superadmin/support', label: 'Suporte', icon: LifeBuoy },
];

const getInitials = (name: string = '') => {
    return name
        ?.split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase() || 'SA'; // Default to SA for Super Admin
};

export function SuperAdminLayout({ children }: SuperAdminLayoutProps) {
  const isMobile = useIsMobile();
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();

   const handleLogout = async () => {
    try {
        await logoutUser();
        toast({ title: "Logout", description: "Você saiu com sucesso." });
        router.push('/login'); // Redirect to main login
    } catch (error) {
        console.error("Erro ao fazer logout:", error);
        toast({ title: "Erro", description: "Falha ao fazer logout.", variant: "destructive" });
    }
  };

  const isNavItemActive = (itemHref: string) => {
    if (itemHref === '/superadmin') {
      return pathname === '/superadmin';
    }
    return pathname.startsWith(itemHref);
  };

  const getCurrentPageTitle = () => {
    const sortedNavItems = [...navItems].sort((a, b) => b.href.length - a.href.length);
    const currentNavItem = sortedNavItems.find(item => isNavItemActive(item.href));
    return currentNavItem?.label || 'Super Admin Panel';
  };


  return (
    <TooltipProvider>
      <SidebarProvider defaultOpen={!isMobile} collapsible="icon">
        {/* Sidebar Component */}
        <Sidebar variant="sidebar" side="left" collapsible="icon">
          <SidebarHeader className="items-center justify-center gap-2 p-4">
             <div className="flex items-center gap-2 group-data-[collapsible=icon]:hidden">
                <Logo className="w-7 h-7 text-primary" />
               <span className="text-xl font-semibold text-primary">Check2B</span>
               <span className="text-xs text-muted-foreground">(Super Admin)</span>
             </div>
              <div className="group-data-[collapsible=icon]:flex group-data-[collapsible=offcanvas]:hidden group-data-[state=expanded]:hidden hidden">
                  <Logo className="w-7 h-7 text-primary" />
             </div>
             <SidebarTrigger className="group-data-[collapsible=offcanvas]:flex hidden ml-auto" />
          </SidebarHeader>
          <Separator />
          {/* Sidebar Content (Menus) */}
          <SidebarContent className="p-2">
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <Link href={item.href} passHref legacyBehavior>
                    <SidebarMenuButton
                      as="a"
                      isActive={isNavItemActive(item.href)}
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
          {/* Sidebar Footer */}
           <SidebarFooter className="p-2">
              <Separator />
              <div className="flex items-center justify-between p-2 group-data-[collapsible=icon]:hidden">
                 <div className="flex items-center gap-2">
                   <Avatar className="h-8 w-8">
                     <AvatarFallback>{getInitials('Super Admin')}</AvatarFallback>
                   </Avatar>
                   <div className="flex flex-col">
                       <span className="text-sm font-medium">Super Admin</span>
                       <span className="text-xs text-muted-foreground">super@check2b.com</span>
                   </div>
                 </div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleLogout}>
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
                       <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleLogout}>
                         <LogOut className="h-4 w-4" />
                         <span className="sr-only">Sair</span>
                       </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right" align="center">Sair</TooltipContent>
                  </Tooltip>
               </div>
          </SidebarFooter>
        </Sidebar>

        {/* Main Content Area */}
        <SidebarInset className="flex flex-col">
          {/* Header */}
          <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 lg:px-6">
            <SidebarTrigger className="md:hidden" /> {/* Mobile trigger */}
            <h1 className="text-lg font-semibold">
               {getCurrentPageTitle()} {/* Display dynamic title */}
            </h1>
            {/* Add any header actions here if needed */}
          </header>
          {/* Page Content */}
          <main className="flex-1 overflow-auto p-4 lg:p-6">{children}</main>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
