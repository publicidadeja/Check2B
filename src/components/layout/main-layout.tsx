
'use client';

import type { ReactNode } from 'react';
import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation'; // Import usePathname and useRouter
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
  Target, // Added icon for Challenges
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'; // Ensure TooltipProvider is imported
import { logoutUser } from '@/lib/auth'; // Import logout function
import { useToast } from '@/hooks/use-toast'; // Import useToast

interface MainLayoutProps {
  children: ReactNode;
}

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/employees', label: 'Colaboradores', icon: Users },
  { href: '/tasks', label: 'Tarefas', icon: ClipboardList },
  { href: '/evaluations', label: 'Avaliações', icon: ClipboardCheck },
  { href: '/challenges', label: 'Desafios', icon: Target }, // Added Challenges link
  { href: '/ranking', label: 'Ranking', icon: Trophy },
];

const adminTools = [
   { href: '/roles', label: 'Funções', icon: Briefcase },
   { href: '/departments', label: 'Departamentos', icon: Building },
   { href: '/settings', label: 'Configurações', icon: Settings },
]

export function MainLayout({ children }: MainLayoutProps) {
  const isMobile = useIsMobile();
  const pathname = usePathname(); // Use the hook to get the current path
  const router = useRouter(); // Initialize router
  const { toast } = useToast(); // Initialize toast

   const handleLogout = async () => {
    try {
        await logoutUser();
        toast({ title: "Logout", description: "Você saiu com sucesso." });
        router.push('/login'); // Redirect to login page after logout
    } catch (error) {
        console.error("Erro ao fazer logout:", error);
        toast({ title: "Erro", description: "Falha ao fazer logout.", variant: "destructive" });
    }
  };


  return (
    // Ensure TooltipProvider wraps the entire layout content if tooltips are used anywhere within
    <TooltipProvider>
      <SidebarProvider defaultOpen={!isMobile} collapsible="icon">
        <Sidebar variant="sidebar" side="left" collapsible="icon">
          <SidebarHeader className="items-center justify-center gap-2 p-4">
             <div className="flex items-center gap-2 group-data-[collapsible=icon]:hidden">
               {/* Placeholder Logo */}
               <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7 text-primary">
                 <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" clipRule="evenodd" />
               </svg>
               <span className="text-xl font-semibold text-primary">Check2B</span>
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
                      as="a" // Ensure it renders as an anchor tag
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
            <Separator />
            <SidebarGroup>
                <SidebarGroupLabel>Ferramentas Admin</SidebarGroupLabel>
                 <SidebarMenu>
                    {adminTools.map((item) => (
                      <SidebarMenuItem key={item.href}>
                        <Link href={item.href} passHref legacyBehavior>
                          <SidebarMenuButton
                            as="a" // Ensure it renders as an anchor tag
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
              </SidebarGroup>
          </SidebarContent>
           <SidebarFooter className="p-2">
              <Separator />
              <div className="flex items-center justify-between p-2 group-data-[collapsible=icon]:hidden">
                 <div className="flex items-center gap-2">
                   <Avatar className="h-8 w-8">
                     <AvatarImage src="https://picsum.photos/id/238/40/40" alt="Admin User" />
                     <AvatarFallback>AD</AvatarFallback>
                   </Avatar>
                   <div className="flex flex-col">
                       <span className="text-sm font-medium">Usuário Admin</span>
                       <span className="text-xs text-muted-foreground">admin@check2b.com</span>
                   </div>
                 </div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleLogout}> {/* Call handleLogout */}
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
                       <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleLogout}> {/* Call handleLogout */}
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
               {/* Dynamically set based on current page/route */}
               {[...navItems, ...adminTools].find(item => pathname?.startsWith(item.href) && (item.href !== '/' || pathname === '/'))?.label || // Match start for nested routes, exact for '/'
                'Check2B'}
            </h1>
            {/* Add any header actions here if needed */}
          </header>
          <main className="flex-1 overflow-auto p-4 lg:p-6">{children}</main>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
