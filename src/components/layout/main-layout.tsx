'use client';

import type { ReactNode } from 'react';
import * as React from 'react';
import Link from 'next/link';
import {
  Users,
  ClipboardList,
  ClipboardCheck,
  LayoutDashboard,
  Settings,
  LogOut,
  Briefcase,
  Building,
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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface MainLayoutProps {
  children: ReactNode;
}

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/employees', label: 'Colaboradores', icon: Users },
  { href: '/tasks', label: 'Tarefas', icon: ClipboardList },
  { href: '/evaluations', label: 'Avaliações', icon: ClipboardCheck },
  { href: '/settings', label: 'Configurações', icon: Settings },
];

const adminTools = [
   { href: '/roles', label: 'Funções', icon: Briefcase },
   { href: '/departments', label: 'Departamentos', icon: Building },
]

export function MainLayout({ children }: MainLayoutProps) {
  const isMobile = useIsMobile();
  const [pathname, setPathname] = React.useState('/'); // Default or read from router

  // Effect to update pathname when route changes (requires router integration)
  // React.useEffect(() => {
  //   // Replace with actual router logic if using Next.js router
  //   // Example: const currentPath = window.location.pathname;
  //   // setPathname(currentPath);
  // }, [/* router.pathname */]); // Dependency on router change

  return (
    <SidebarProvider defaultOpen={!isMobile} collapsible="icon">
      <Sidebar variant="sidebar" side="left" collapsible="icon">
        <SidebarHeader className="items-center justify-center gap-2 p-4">
           <div className="flex items-center gap-2 group-data-[collapsible=icon]:hidden">
             {/* Placeholder for Logo */}
             <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-accent">
               <path fillRule="evenodd" d="M12.963 2.286a.75.75 0 0 0-1.071-.136 9.742 9.742 0 0 0-3.539 6.177A7.547 7.547 0 0 1 6.648 6.61a.75.75 0 0 0-1.152-.082A9 9 0 1 0 15.68 4.534a7.46 7.46 0 0 1-2.91 1.553 9.742 9.742 0 0 0-3.538-6.177.75.75 0 0 0-.136-1.071Zm3.59 5.07A.75.75 0 0 0 16.5 7.5v.008c0 .414.336.75.75.75h.008a.75.75 0 0 0 .75-.75v-.008a.75.75 0 0 0-.75-.75h-.008ZM12.75 9.75a.75.75 0 0 0-.75.75v.008c0 .414.336.75.75.75h.008a.75.75 0 0 0 .75-.75v-.008a.75.75 0 0 0-.75-.75h-.008ZM10.5 7.5a.75.75 0 0 0-.75.75v.008c0 .414.336.75.75.75h.008a.75.75 0 0 0 .75-.75v-.008a.75.75 0 0 0-.75-.75h-.008Z" clipRule="evenodd" />
             </svg>
             <span className="text-lg font-semibold">CheckUp</span>
           </div>
            <div className="group-data-[collapsible=icon]:flex group-data-[collapsible=offcanvas]:hidden group-data-[state=expanded]:hidden hidden">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-accent">
               <path fillRule="evenodd" d="M12.963 2.286a.75.75 0 0 0-1.071-.136 9.742 9.742 0 0 0-3.539 6.177A7.547 7.547 0 0 1 6.648 6.61a.75.75 0 0 0-1.152-.082A9 9 0 1 0 15.68 4.534a7.46 7.46 0 0 1-2.91 1.553 9.742 9.742 0 0 0-3.538-6.177.75.75 0 0 0-.136-1.071Zm3.59 5.07A.75.75 0 0 0 16.5 7.5v.008c0 .414.336.75.75.75h.008a.75.75 0 0 0 .75-.75v-.008a.75.75 0 0 0-.75-.75h-.008ZM12.75 9.75a.75.75 0 0 0-.75.75v.008c0 .414.336.75.75.75h.008a.75.75 0 0 0 .75-.75v-.008a.75.75 0 0 0-.75-.75h-.008ZM10.5 7.5a.75.75 0 0 0-.75.75v.008c0 .414.336.75.75.75h.008a.75.75 0 0 0 .75-.75v-.008a.75.75 0 0 0-.75-.75h-.008Z" clipRule="evenodd" />
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
                    asChild
                    isActive={pathname === item.href}
                    tooltip={item.label}
                  >
                    <a>
                      <item.icon />
                      <span>{item.label}</span>
                    </a>
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
                          asChild
                          isActive={pathname === item.href}
                          tooltip={item.label}
                        >
                          <a>
                            <item.icon />
                            <span>{item.label}</span>
                          </a>
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
                   <AvatarImage src="https://picsum.photos/id/237/40/40" alt="Admin User" />
                   <AvatarFallback>AD</AvatarFallback>
                 </Avatar>
                 <div className="flex flex-col">
                     <span className="text-sm font-medium">Admin User</span>
                     <span className="text-xs text-muted-foreground">admin@checkup.com</span>
                 </div>
               </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <LogOut className="h-4 w-4" />
                       <span className="sr-only">Logout</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right" align="center">Logout</TooltipContent>
                </Tooltip>
            </div>
             <div className="group-data-[collapsible=icon]:flex group-data-[collapsible=offcanvas]:hidden group-data-[state=expanded]:hidden hidden justify-center p-2">
               <Tooltip>
                  <TooltipTrigger asChild>
                     <Button variant="ghost" size="icon" className="h-8 w-8">
                       <LogOut className="h-4 w-4" />
                       <span className="sr-only">Logout</span>
                     </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right" align="center">Logout</TooltipContent>
                </Tooltip>
             </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="flex flex-col">
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 lg:px-6">
          <SidebarTrigger className="md:hidden" /> {/* Mobile trigger */}
          <h1 className="text-lg font-semibold">
             {/* Dynamically set based on current page/route */}
             {navItems.find(item => item.href === pathname)?.label ||
              adminTools.find(item => item.href === pathname)?.label ||
              'CheckUp'}
          </h1>
          {/* Add any header actions here if needed */}
        </header>
        <main className="flex-1 overflow-auto p-4 lg:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
