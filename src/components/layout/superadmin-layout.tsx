// src/components/layout/superadmin-layout.tsx
'use client';

import Image from 'next/image';
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
  DollarSign,
  ShieldAlert,
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
  SidebarSeparator,
} from '@/components/ui/sidebar';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { logoutUser } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { Logo } from '@/components/logo';
import Logo2b from '@/components/logo2b'; // Importação Default
import { useAuth } from '@/hooks/use-auth';
import { LoadingSpinner } from '../ui/loading-spinner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';


interface SuperAdminLayoutProps {
  children: ReactNode;
}

const navItems = [
  { href: '/superadmin', label: 'Visão Geral', icon: LayoutDashboard },
  { href: '/superadmin/organizations', label: 'Organizações', icon: Building },
  { href: '/superadmin/users', label: 'Usuários Globais', icon: Users, disabled: true },
  { href: '/superadmin/plans', label: 'Planos', icon: DollarSign },
  { href: '/superadmin/settings', label: 'Config. SaaS', icon: Settings, disabled: true },
  { href: '/superadmin/analytics', label: 'Analytics', icon: BarChart, disabled: true },
  { href: '/superadmin/support', label: 'Suporte (Tickets)', icon: LifeBuoy, disabled: true },
  { href: '/superadmin/system-health', label: 'Status do Sistema', icon: ShieldAlert, disabled: true },
];

const getInitials = (name: string = '') => {
    return name
        ?.split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase() || 'SA';
};

export function SuperAdminLayout({ children }: SuperAdminLayoutProps) {
  const isMobile = useIsMobile();
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const { user, role, isLoading: authLoading, isGuest } = useAuth();
  const [isClient, setIsClient] = React.useState(false);

  React.useEffect(() => {
    setIsClient(true);
  }, []);


   const handleLogout = async () => {
    try {
        await logoutUser();
        toast({ title: "Logout", description: "Você saiu com sucesso." });
        router.push('/login');
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

  const userName = user?.displayName || (isGuest && role === 'super_admin' ? 'Super Admin Convidado' : 'Super Admin');
  const userEmail = user?.email || (isGuest && role === 'super_admin' ? 'guest_super@check2b.com' : 'super@check2b.com');

  if (!isClient || authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" text="Carregando painel Super Admin..." />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <SidebarProvider defaultOpen={!isMobile} collapsible={isMobile ? "offcanvas" : "icon"}>
        <Sidebar variant="sidebar" side="left" collapsible={isMobile ? "offcanvas" : "icon"}>
          <SidebarHeader className="items-center justify-start p-4 md:justify-center">
            {/* Desktop: Expanded - Logo2b (agora usando next/image) */}
            <div className="hidden md:flex group-data-[state=collapsed]:hidden items-center justify-center w-full">
            <Image
              src="/logo.png" // Caminho para a imagem do logo completo na pasta public
              alt="Check2B Logo"
              width={80}
              height={50}
              />
            </div>
            {/* Desktop: Collapsed - Logo (ícone) */}
            <div className="hidden group-data-[state=collapsed]:md:flex items-center justify-center w-full">
            <Image
              src="/logo.png" // Caminho para a imagem do logo completo na pasta public
              alt="Check2B Logo"
              width={80}
              height={50}
              />
            </div>
            {/* Mobile (Sheet): Logo2b (agora usando next/image) */}
            <div className="flex md:hidden items-center gap-2">
            <Image
              src="/logo.png" // Caminho para a imagem do logo completo na pasta public
              alt="Check2B Logo"
              width={80}
              height={50}
              />
            </div>
             <SidebarTrigger className="group-data-[collapsible=offcanvas]:flex hidden ml-auto md:hidden" />
          </SidebarHeader>
          <SidebarSeparator />
          <SidebarContent className="p-2">
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <Link href={item.href} passHref legacyBehavior={item.disabled ? undefined : true} aria-disabled={item.disabled}>
                    <SidebarMenuButton
                      as="a"
                      isActive={isNavItemActive(item.href)}
                      tooltip={item.label}
                      disabled={item.disabled}
                      className={item.disabled ? "cursor-not-allowed opacity-50" : ""}
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
              <SidebarSeparator />
              <div className="flex items-center justify-between p-2 group-data-[collapsible=icon]:hidden">
                 <div className="flex items-center gap-2">
                   <Avatar className="h-8 w-8">
                     <AvatarFallback>{getInitials(userName)}</AvatarFallback>
                   </Avatar>
                   <div className="flex flex-col">
                       <span className="text-sm font-medium">{userName}</span>
                       <span className="text-xs text-muted-foreground">{userEmail}</span>
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

        <SidebarInset className="flex flex-col">
          <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 lg:px-6">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="lg:hidden" />
              <h1 className="text-lg font-semibold">
               {getCurrentPageTitle()}
              </h1>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>{getInitials(userName)}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{userName}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {userEmail}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sair</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </header>
          <main className="flex-1 overflow-auto p-4 lg:p-6">{children}</main>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
