
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
  Menu as MenuIcon, // Renamed to avoid conflict with SidebarMenu
} from 'lucide-react';

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  // SidebarInset, // Not used in this simplified version yet
  SidebarTrigger,
  SidebarFooter,
  SidebarSeparator, // Import Separator
} from '@/components/ui/sidebar';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
// import { Separator } from '@/components/ui/separator'; // Use SidebarSeparator
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { logoutUser } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { Logo } from '@/components/logo';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetClose } from '@/components/ui/sheet'; // Import Sheet components for mobile menu
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

// Mock admin data - replace with actual data from useAuth or context
const mockAdmin = {
    name: 'Admin Check2B',
    email: 'admin@check2b.com',
    photoUrl: 'https://placehold.co/80x80.png?text=AD',
};


const getInitials = (name: string = '') => {
    return name
        ?.split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase() || 'AD';
};

export function MainLayout({ children }: MainLayoutProps) {
  const isMobile = useIsMobile();
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const { isGuest } = useAuth(); // Get guest status
  const [isClient, setIsClient] = React.useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);


  React.useEffect(() => {
    setIsClient(true);
  }, []);

  const handleLogout = async () => {
    try {
        await logoutUser(); // This clears cookies internally
        toast({ title: "Logout", description: "Você saiu com sucesso." });
        router.push('/login');
    } catch (error) {
        console.error("Erro ao fazer logout:", error);
        toast({ title: "Erro", description: "Falha ao fazer logout.", variant: "destructive" });
    }
  };

  const isNavItemActive = (itemHref: string) => {
    if (itemHref === '/') {
      // For dashboard, only active if it's exactly '/'
      return pathname === '/';
    }
    // For other items, active if pathname starts with item.href
    return pathname.startsWith(itemHref);
  };

  const getCurrentPageTitle = () => {
    const allNavItems = [...navItems, ...adminTools];
    // Sort by length of href descending to match more specific paths first
    const sortedNavItems = [...allNavItems].sort((a, b) => b.href.length - a.href.length);
    const currentNavItem = sortedNavItems.find(item => isNavItemActive(item.href));
    return currentNavItem?.label || 'Check2B Admin';
  };

  if (!isClient) {
    return (
        <div className="flex min-h-screen items-center justify-center">
            <LoadingSpinner size="lg" text="Carregando painel administrativo..." />
        </div>
    );
  }

  const sidebarContent = (
    <>
        <SidebarHeader className="items-center justify-center gap-2 p-4">
            <div className="flex items-center gap-2 group-data-[collapsible=icon]:hidden">
            <Logo className="w-7 h-7 text-primary" />
            <span className="text-xl font-semibold text-primary">Check2B</span>
            </div>
            <div className="group-data-[collapsible=icon]:flex group-data-[collapsible=offcanvas]:hidden group-data-[state=expanded]:hidden hidden">
                <Logo className="w-7 h-7 text-primary" />
            </div>
            {/* Mobile trigger inside Sheet can be handled differently or removed if sidebar is part of Sheet */}
        </SidebarHeader>
        <SidebarSeparator />
        <SidebarContent className="p-2">
            <SidebarMenu>
            {navItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                <Link href={item.href} passHref legacyBehavior>
                    <SidebarMenuButton
                    as="a"
                    isActive={isNavItemActive(item.href)}
                    tooltip={item.label}
                    onClick={() => isMobile && setIsMobileMenuOpen(false)} // Close mobile menu on click
                    >
                    <item.icon />
                    <span>{item.label}</span>
                    </SidebarMenuButton>
                </Link>
                </SidebarMenuItem>
            ))}
            <SidebarSeparator />
            {adminTools.map((item) => (
                 <SidebarMenuItem key={item.href}>
                 <Link href={item.href} passHref legacyBehavior>
                     <SidebarMenuButton
                     as="a"
                     isActive={isNavItemActive(item.href)}
                     tooltip={item.label}
                     onClick={() => isMobile && setIsMobileMenuOpen(false)} // Close mobile menu on click
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
            <div className={cn("flex items-center justify-between p-2", isMobile && "group-data-[collapsible=icon]:hidden")}>
                <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                    <AvatarImage src={mockAdmin.photoUrl} alt={mockAdmin.name}/>
                    <AvatarFallback>{getInitials(mockAdmin.name)}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col group-data-[collapsible=icon]:hidden">
                    <span className="text-sm font-medium">{isGuest ? "Convidado Admin" : mockAdmin.name}</span>
                    <span className="text-xs text-muted-foreground">{isGuest ? "Modo Demonstração" : mockAdmin.email}</span>
                </div>
                </div>
                {!isGuest && (
                    <Tooltip>
                        <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleLogout}>
                            <LogOut className="h-4 w-4" />
                            <span className="sr-only">Sair</span>
                        </Button>
                        </TooltipTrigger>
                        <TooltipContent side="right" align="center">Sair</TooltipContent>
                    </Tooltip>
                )}
            </div>
            <div className="group-data-[collapsible=icon]:flex group-data-[collapsible=offcanvas]:hidden group-data-[state=expanded]:hidden hidden justify-center p-2">
                {!isGuest && (
                    <Tooltip>
                        <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleLogout}>
                            <LogOut className="h-4 w-4" />
                            <span className="sr-only">Sair</span>
                        </Button>
                        </TooltipTrigger>
                        <TooltipContent side="right" align="center">Sair</TooltipContent>
                    </Tooltip>
                )}
            </div>
        </SidebarFooter>
    </>
  );


  return (
    <TooltipProvider>
      <SidebarProvider defaultOpen={!isMobile} collapsible={isMobile ? "offcanvas" : "icon"}>
        <div className="flex min-h-screen w-full">
          {/* Desktop Sidebar */}
          {!isMobile && (
            <Sidebar variant="sidebar" side="left">
              {sidebarContent}
            </Sidebar>
          )}

          {/* Mobile Sheet Menu */}
          {isMobile && (
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                {/* Trigger is in the header */}
                <SheetContent side="left" className="flex flex-col p-0 w-72 bg-sidebar text-sidebar-foreground">
                   {sidebarContent}
                </SheetContent>
            </Sheet>
          )}

          {/* Main Content Area */}
          <div className={cn("flex flex-1 flex-col", !isMobile && "md:pl-[var(--sidebar-width-icon)] group-data-[state=expanded]:md:pl-[var(--sidebar-width)] transition-[padding-left] duration-200 ease-linear")}>
            {/* Header */}
            <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 lg:px-6">
                <div className="flex items-center gap-2">
                    {isMobile ? (
                        <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setIsMobileMenuOpen(true)}>
                            <MenuIcon className="h-5 w-5" />
                            <span className="sr-only">Abrir menu</span>
                        </Button>
                    ) : (
                        <SidebarTrigger className="hidden md:flex" />
                    )}
                    {!isMobile && (
                        <div className="items-center gap-2 hidden md:flex">
                            <Logo className="w-7 h-7 text-primary" />
                            <span className="text-xl font-semibold text-primary">Check2B</span>
                        </div>
                    )}
                </div>

                <h1 className="text-lg font-semibold text-center flex-1 truncate px-2">
                    {getCurrentPageTitle()}
                </h1>

                {!isGuest && !isMobile && ( // Hide on mobile as logout is in sheet
                    <Tooltip>
                        <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleLogout}>
                            <LogOut className="h-4 w-4" />
                            <span className="sr-only">Sair</span>
                        </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" align="end">Sair</TooltipContent>
                    </Tooltip>
                )}
                 {/* Placeholder for right-aligned actions on mobile if needed */}
                 {isMobile && <div className="w-9 h-9"></div>}
            </header>
            {/* Page Content */}
            <main className="flex-1 overflow-y-auto p-4 lg:p-6 bg-muted/30 dark:bg-slate-950">
                {children}
            </main>
          </div>
        </div>
      </SidebarProvider>
    </TooltipProvider>
  );
}
