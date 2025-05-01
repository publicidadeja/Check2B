
'use client';

import type { ReactNode } from 'react';
import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  ClipboardCheck,
  Target,
  Trophy,
  User,
  LogOut,
  Menu, // Icon for mobile sidebar toggle
} from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'; // Import DropdownMenu components
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/toaster';
import { logoutUser } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { BottomNavigation } from '@/components/layout/bottom-navigation'; // Import BottomNavigation
import { Sheet, SheetContent, SheetTrigger, SheetClose } from '@/components/ui/sheet'; // Import Sheet for mobile menu
import { cn } from '@/lib/utils';

interface EmployeeLayoutProps {
  children: ReactNode;
}

const navItems = [
  { href: '/colaborador/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/colaborador/avaliacoes', label: 'Avaliações', icon: ClipboardCheck },
  { href: '/colaborador/desafios', label: 'Desafios', icon: Target },
  { href: '/colaborador/ranking', label: 'Ranking', icon: Trophy },
  { href: '/colaborador/perfil', label: 'Perfil', icon: User },
];

// Mock employee data - Replace with actual data fetching/auth context
const mockEmployee = {
    id: '1',
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
  const router = useRouter();
  const { toast } = useToast();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const getCurrentTitle = () => {
    const currentNavItem = navItems.find(item => pathname?.startsWith(item.href));
    return currentNavItem?.label || 'Check2B'; // Simpler title
  };

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

  return (
    <TooltipProvider>
        <div className="flex min-h-screen w-full flex-col bg-background">
            {/* Header - Adjusted for Mobile */}
            <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:justify-end">
                 {/* Mobile Menu Trigger */}
                 <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                    <SheetTrigger asChild>
                        <Button variant="outline" size="icon" className="shrink-0 md:hidden">
                            <Menu className="h-5 w-5" />
                            <span className="sr-only">Abrir menu de navegação</span>
                        </Button>
                    </SheetTrigger>
                     {/* Use SheetContent for the mobile sidebar */}
                    <SheetContent side="left" className="flex flex-col p-0">
                         <nav className="flex flex-col gap-1 p-4 text-lg font-medium flex-grow">
                             <Link
                                href="#"
                                className="flex items-center gap-2 text-lg font-semibold mb-4"
                                onClick={() => setIsMobileMenuOpen(false)}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7 text-primary">
                                  <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" clipRule="evenodd" />
                                </svg>
                                <span className="sr-only">Check2B</span>
                              </Link>
                            {navItems.map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={cn(
                                        "flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary",
                                        pathname === item.href ? "bg-muted text-primary" : "text-muted-foreground"
                                    )}
                                    onClick={() => setIsMobileMenuOpen(false)} // Close menu on navigation
                                >
                                    <item.icon className="h-4 w-4" />
                                    {item.label}
                                </Link>
                             ))}
                         </nav>
                         {/* Mobile Menu Footer */}
                         <div className="mt-auto border-t p-4">
                             <div className="flex items-center justify-between">
                                 <div className="flex items-center gap-2">
                                    <Avatar className="h-8 w-8">
                                        <AvatarImage src={mockEmployee.photoUrl} alt={mockEmployee.name} />
                                        <AvatarFallback>{getInitials(mockEmployee.name)}</AvatarFallback>
                                    </Avatar>
                                    <span className="text-sm font-medium truncate">{mockEmployee.name}</span>
                                </div>
                                 <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }}>
                                     <LogOut className="h-4 w-4" />
                                     <span className="sr-only">Sair</span>
                                </Button>
                             </div>
                         </div>
                    </SheetContent>
                </Sheet>

                 <h1 className="text-lg font-semibold md:hidden"> {/* Show title only on mobile header */}
                   {getCurrentTitle()}
                 </h1>

                {/* Right side of Header (User info/logout for desktop) */}
                <div className="hidden items-center gap-4 md:flex">
                    {/* Maybe add notifications or other icons here */}
                     <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="secondary" size="icon" className="rounded-full">
                           <Avatar className="h-8 w-8">
                              <AvatarImage src={mockEmployee.photoUrl} alt={mockEmployee.name} />
                              <AvatarFallback>{getInitials(mockEmployee.name)}</AvatarFallback>
                           </Avatar>
                          <span className="sr-only">Alternar menu do usuário</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild><Link href="/colaborador/perfil">Perfil</Link></DropdownMenuItem>
                        {/* <DropdownMenuItem>Suporte</DropdownMenuItem> */}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleLogout}>Sair</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </header>

            {/* Main Content Area */}
            {/* Added pb-16 to account for bottom navigation height */}
            <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6 pb-20 md:pb-6">
                 {children}
            </main>

            {/* Bottom Navigation for Mobile */}
            {isMobile && <BottomNavigation />}

            <Toaster />
        </div>
    </TooltipProvider>
  );
}
