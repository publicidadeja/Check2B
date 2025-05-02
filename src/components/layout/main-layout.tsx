
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
  SidebarGroup,
  SidebarGroupLabel,
} from '@/components/ui/sidebar';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { logoutUser } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { Logo } from '@/components/logo'; // Import the new Logo component

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
]

// Helper to get initials from a name
const getInitials = (name: string = '') => {
    return name
        ?.split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase() || '??';
};

export function MainLayout({ children }: MainLayoutProps) {
  const isMobile = useIsMobile();
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();

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

  // Function to determine if a menu item should be active
  const isNavItemActive = (itemHref: string) => {
    if (itemHref === '/') {
      return pathname === '/'; // Exact match for root dashboard
    }
    // Use startsWith for other routes within the group
    return pathname.startsWith(itemHref);
  };

  const getCurrentPageTitle = () => {
    // Combine both navigation arrays for title lookup
    const allNavItems = [...navItems, ...adminTools];
    // Find the *most specific* match first (longer href)
    const sortedNavItems = [...allNavItems].sort((a, b) => b.href.length - a.href.length);
    const currentNavItem = sortedNavItems.find(item => isNavItemActive(item.href));
    return currentNavItem?.label || 'Check2B Admin';
  };


  return (
    <TooltipProvider>
      <SidebarProvider defaultOpen={!isMobile} collapsible="icon">
        {/* Sidebar Component */}
        <Sidebar variant="sidebar" side="left" collapsible="icon">
          <SidebarHeader className="items-center justify-center gap-2 p-4">
             <div className="flex items-center gap-2 group-data-[collapsible=icon]:hidden">
                <Logo className="w-7 h-7 text-primary" /> {/* Use Logo component */}
               <span className="text-xl font-semibold text-primary">Check2B</span>
             </div>
              <div className="group-data-[collapsible=icon]:flex group-data-[collapsible=offcanvas]:hidden group-data-[state=expanded]:hidden hidden">
                  <Logo className="w-7 h-7 text-primary" /> {/* Use Logo component */}
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
                      isActive={isNavItemActive(item.href)} // Use updated logic
                      tooltip={item.label}
                    >
                      <item.icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </Link>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
            <Separator />
            <SidebarGroup>
                <SidebarGroupLabel>Ferramentas Admin</SidebarGroupLabel>
                 <SidebarMenu>
                    {adminTools.map((item) => (
                      <SidebarMenuItem key={item.href}>
                        <Link href={item.href} passHref legacyBehavior>
                          <SidebarMenuButton
                            as="a"
                            isActive={isNavItemActive(item.href)} // Use updated logic
                            tooltip={item.label}
                          >
                            <item.icon />
                            <span>{item.label}</span>
                          </SidebarMenuButton>
                        </Link>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
              </SidebarGroup>
          </SidebarContent>
          {/* Sidebar Footer */}
           <SidebarFooter className="p-2">
              <Separator />
              <div className="flex items-center justify-between p-2 group-data-[collapsible=icon]:hidden">
                 <div className="flex items-center gap-2">
                   <Avatar className="h-8 w-8">
                     {/* Placeholder image for admin */}
                     <AvatarImage src="https://picsum.photos/seed/admin/40/40" alt="Admin User" />
                     <AvatarFallback>AD</AvatarFallback>
                   </Avatar>
                   <div className="flex flex-col">
                       <span className="text-sm font-medium">Usuário Admin</span>
                       <span className="text-xs text-muted-foreground">admin@check2b.com</span>
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
