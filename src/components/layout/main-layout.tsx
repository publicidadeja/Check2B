
// src/components/layout/main-layout.tsx
'use client';

import type { ReactNode } from 'react';
import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Users,
  ClipboardList,
  ClipboardCheck,
  LayoutDashboard,
  Settings,
  LogOut,
  Briefcase,
  Building,
  Trophy,
  Target,
  Menu as MenuIcon, // Renamed to avoid conflict
  ChevronDown,
  LifeBuoy, // Added for Support/Help
} from 'lucide-react';

import {
  Sidebar,
  SidebarGroupLabel,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarTrigger,
  SidebarFooter,
  SidebarSeparator,
  SidebarInset,
} from '@/components/ui/sidebar';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { logoutUser, setAuthCookie } from '@/lib/auth'; // Assuming shared auth logic, added setAuthCookie
import { useToast } from '@/hooks/use-toast';
import { Logo } from '@/components/logo';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth'; // Import useAuth

interface MainLayoutProps {
  children: ReactNode;
}

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/employees', label: 'Colaboradores', icon: Users },
  { href: '/tasks', label: 'Tarefas', icon: ClipboardList },
  { href: '/evaluations', label: 'Avaliações', icon: ClipboardCheck },
  { href: '/challenges', label: 'Desafios', icon: Target },
  { href: '/ranking', label: 'Ranking', icon: Trophy },
];

const adminTools = [
  { href: '/roles', label: 'Funções', icon: Briefcase },
  { href: '/departments', label: 'Departamentos', icon: Building },
  { href: '/settings', label: 'Configurações', icon: Settings },
];

const getInitials = (name: string = '') => {
  return name
    ?.split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'AD'; // Default to AD for Admin
};

export function MainLayout({ children }: MainLayoutProps) {
  const { user, role, isLoading: authLoading, isGuest } = useAuth();
  const isMobile = useIsMobile();
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const [isClient, setIsClient] = React.useState(false);

  React.useEffect(() => {
    setIsClient(true);
  }, []);

  const handleLogout = async () => {
    try {
      await logoutUser();
      toast({ title: 'Logout', description: 'Você saiu com sucesso.' });
      router.push('/login');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      toast({ title: 'Erro', description: 'Falha ao fazer logout.', variant: 'destructive' });
    }
  };

  const getCurrentPageTitle = () => {
    const allNavItems = [...navItems, ...adminTools];
    const sortedNavItems = [...allNavItems].sort((a, b) => b.href.length - a.href.length);
    const currentNavItem = sortedNavItems.find(item => pathname === item.href || (pathname.startsWith(item.href) && item.href !== '/'));
    if (pathname === '/') return 'Dashboard';
    return currentNavItem?.label || 'Painel Administrativo';
  };

  const userName = user?.displayName || (isGuest && role === 'admin' ? 'Admin Convidado' : 'Admin');
  const userEmail = user?.email || (isGuest && role === 'admin' ? 'guest@check2b.com' : '');


  if (!isClient || authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" text="Carregando painel..." />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <SidebarProvider defaultOpen={!isMobile} collapsible={isMobile ? "offcanvas" : "icon"}>
        <Sidebar variant="sidebar" side="left" collapsible={isMobile ? "offcanvas" : "icon"}>
          <SidebarHeader className="items-center justify-center gap-2 p-4">
            <div className="flex items-center gap-2 group-data-[collapsible=icon]:hidden">
              <Logo className="w-7 h-7 text-primary" />
              <span className="text-xl font-semibold text-primary">Check2B</span>
            </div>
            <div className="group-data-[collapsible=icon]:flex group-data-[collapsible=offcanvas]:hidden group-data-[state=expanded]:hidden hidden">
              <Logo className="w-7 h-7 text-primary" />
            </div>
            <SidebarTrigger className="group-data-[collapsible=offcanvas]:flex hidden ml-auto" />
          </SidebarHeader>
          <SidebarSeparator />
          <SidebarContent className="p-2">
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <Link href={item.href} passHref legacyBehavior>
                    <SidebarMenuButton
                      as="a"
                      isActive={pathname === item.href || (item.href === '/' && pathname.startsWith('/')) && pathname.length <= 1}
                      tooltip={item.label}
                    >
                      <item.icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </Link>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
            <SidebarSeparator />
            <SidebarMenu>
              <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">Ferramentas</SidebarGroupLabel>
              {adminTools.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <Link href={item.href} passHref legacyBehavior>
                    <SidebarMenuButton
                      as="a"
                      isActive={pathname.startsWith(item.href)}
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
            <SidebarSeparator />
            <div className="flex items-center justify-between p-2 group-data-[collapsible=icon]:hidden">
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  {/* Add user photo if available, otherwise initials */}
                  {/* <AvatarImage src={user?.photoURL} alt={userName} /> */}
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
            {/* User Dropdown for smaller screens, or other actions */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                     {/* <AvatarImage src={user?.photoURL} alt={userName} /> */}
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
                <DropdownMenuItem onClick={() => router.push('/settings')}> {/* Assuming admin settings are at /settings */}
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Configurações</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => {/* TODO: Implement help/support link */}}>
                  <LifeBuoy className="mr-2 h-4 w-4" />
                  <span>Suporte</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sair</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </header>
          <main className="flex-1 overflow-auto p-4 lg:p-6">
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
