
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
  PanelLeft, // For a simple trigger example
} from 'lucide-react';

// Removed Sidebar specific imports for now to simplify
// import {
//   Sidebar,
//   SidebarContent,
//   SidebarHeader,
//   SidebarMenu,
//   SidebarMenuItem,
//   SidebarMenuButton,
//   SidebarProvider,
//   SidebarInset,
//   SidebarTrigger,
//   SidebarFooter,
//   SidebarGroup,
//   SidebarGroupLabel,
// } from '@/components/ui/sidebar';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { logoutUser } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { Logo } from '@/components/logo';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

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

const getInitials = (name: string = '') => {
    return name
        ?.split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase() || '??';
};

export function MainLayout({ children }: MainLayoutProps) {
  const isMobile = useIsMobile(); // Still need this for conditional logic if we bring sidebar back
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
        toast({ title: "Logout", description: "Você saiu com sucesso." });
        router.push('/login');
    } catch (error) {
        console.error("Erro ao fazer logout:", error);
        toast({ title: "Erro", description: "Falha ao fazer logout.", variant: "destructive" });
    }
  };

  const isNavItemActive = (itemHref: string) => {
    if (itemHref === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(itemHref);
  };

  const getCurrentPageTitle = () => {
    const allNavItems = [...navItems, ...adminTools];
    const sortedNavItems = [...allNavItems].sort((a, b) => b.href.length - a.href.length);
    const currentNavItem = sortedNavItems.find(item => isNavItemActive(item.href));
    return currentNavItem?.label || 'Check2B Admin';
  };

  if (!isClient) {
    return (
        <div className="flex min-h-screen items-center justify-center">
            <LoadingSpinner size="lg" text="Carregando layout administrativo..." />
        </div>
    );
  }

  // Temporarily simplified layout for debugging
  return (
    <div className="flex flex-col min-h-screen">
      <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 lg:px-6">
        {/* Simple Mobile Menu Trigger placeholder */}
        <Button variant="ghost" size="icon" className="md:hidden">
          <PanelLeft className="h-5 w-5" />
          <span className="sr-only">Abrir menu</span>
        </Button>
        <div className="flex items-center gap-2">
          <Logo className="w-7 h-7 text-primary" />
          <span className="text-xl font-semibold text-primary">Check2B</span>
        </div>
        <h1 className="text-lg font-semibold text-center flex-1 truncate px-2">
           {getCurrentPageTitle()}
        </h1>
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleLogout}>
                    <LogOut className="h-4 w-4" />
                    <span className="sr-only">Sair</span>
                </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" align="end">Sair</TooltipContent>
            </Tooltip>
        </TooltipProvider>
      </header>
      {/* Placeholder for a simple sidebar structure if needed for visual cue */}
      <div className="flex flex-1">
        <aside className="hidden md:block w-64 bg-muted/40 border-r p-4">
          <nav className="flex flex-col gap-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-muted ${isNavItemActive(item.href) ? 'bg-muted text-primary' : 'text-muted-foreground'}`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
            <Separator className="my-2" />
             {adminTools.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-muted ${isNavItemActive(item.href) ? 'bg-muted text-primary' : 'text-muted-foreground'}`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>
        <main className="flex-1 overflow-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
