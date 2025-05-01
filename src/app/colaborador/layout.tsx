
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
  Bell, // Icon for notifications
  Check, // Icon for mark as read
  X, // Icon for close/dismiss
} from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup, // Added DropdownMenuGroup
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
import { Sheet, SheetContent, SheetTrigger, SheetClose, SheetTitle, SheetHeader } from '@/components/ui/sheet'; // Import Sheet for mobile menu, including SheetTitle and SheetHeader
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge'; // Import Badge for notification count
import { ScrollArea } from '@/components/ui/scroll-area'; // Import ScrollArea

interface EmployeeLayoutProps {
  children: ReactNode;
}

// --- Notification Type ---
interface Notification {
    id: string;
    type: 'evaluation' | 'challenge' | 'ranking' | 'announcement' | 'system';
    message: string;
    timestamp: Date;
    read: boolean;
    link?: string; // Optional link to related page
}

// --- Mock Notification Data ---
const initialMockNotifications: Notification[] = [
    { id: 'n1', type: 'evaluation', message: 'Sua avaliação de 05/08 foi registrada.', timestamp: new Date(Date.now() - 3600000 * 2), read: false, link: '/colaborador/avaliacoes' },
    { id: 'n2', type: 'challenge', message: 'Novo desafio "Engajamento Total" disponível!', timestamp: new Date(Date.now() - 86400000), read: false, link: '/colaborador/desafios' },
    { id: 'n3', type: 'ranking', message: 'Você subiu para a 3ª posição no ranking!', timestamp: new Date(Date.now() - 2 * 86400000), read: true, link: '/colaborador/ranking' },
    { id: 'n4', type: 'announcement', message: 'Reunião geral da empresa na próxima sexta-feira.', timestamp: new Date(Date.now() - 3 * 86400000), read: true },
    { id: 'n5', type: 'evaluation', message: 'Você recebeu nota 0 na tarefa "Relatório Semanal".', timestamp: new Date(Date.now() - 4 * 86400000), read: false, link: '/colaborador/avaliacoes' },
];

// --- Mock API Functions (Simulated) ---
const fetchNotifications = async (employeeId: string): Promise<Notification[]> => {
    console.log(`[Mock] Fetching notifications for ${employeeId}...`);
    await new Promise(resolve => setTimeout(resolve, 400)); // Simulate network delay
    // In a real app, fetch from backend API: GET /api/notifications?employeeId=...
    return [...initialMockNotifications].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()); // Sort newest first
};

const markNotificationAsRead = async (employeeId: string, notificationId: string): Promise<boolean> => {
    console.log(`[Mock] Marking notification ${notificationId} as read for ${employeeId}...`);
    await new Promise(resolve => setTimeout(resolve, 200));
    const index = initialMockNotifications.findIndex(n => n.id === notificationId);
    if (index !== -1) {
        initialMockNotifications[index].read = true;
        return true;
    }
    // In a real app, send request to backend: PUT /api/notifications/{notificationId}/read
    return false;
};

const markAllNotificationsAsRead = async (employeeId: string): Promise<boolean> => {
    console.log(`[Mock] Marking all notifications as read for ${employeeId}...`);
    await new Promise(resolve => setTimeout(resolve, 300));
    initialMockNotifications.forEach(n => n.read = true);
    // In a real app, send request to backend: POST /api/notifications/mark-all-read
    return true;
};


const navItems = [
  { href: '/colaborador/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/colaborador/avaliacoes', label: 'Avaliações', icon: ClipboardCheck },
  { href: '/colaborador/desafios', label: 'Desafios', icon: Target },
  { href: '/colaborador/ranking', label: 'Ranking', icon: Trophy },
  { href: '/colaborador/perfil', label: 'Perfil', icon: User },
];

// Mock employee data - Replace with actual data fetching/auth context
const mockEmployee = {
    id: '1', // IMPORTANT: Using ID '1' to match mock data fetching
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
  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  const [isLoadingNotifications, setIsLoadingNotifications] = React.useState(true);

  // Fetch notifications on mount
  React.useEffect(() => {
      const loadNotifications = async () => {
          setIsLoadingNotifications(true);
          try {
              // Replace mockEmployee.id with actual logged-in user ID from auth context/token
              const fetchedNotifications = await fetchNotifications(mockEmployee.id);
              setNotifications(fetchedNotifications);
          } catch (error) {
              console.error("Failed to fetch notifications:", error);
              toast({ title: "Erro", description: "Não foi possível carregar as notificações.", variant: "destructive" });
          } finally {
              setIsLoadingNotifications(false);
          }
      };
      loadNotifications();
  }, [toast]); // Run once on mount

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkRead = async (notificationId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent dropdown from closing
    try {
      const success = await markNotificationAsRead(mockEmployee.id, notificationId);
      if (success) {
        setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, read: true } : n));
      } else {
         toast({ title: "Erro", description: "Não foi possível marcar como lida.", variant: "destructive" });
      }
    } catch (error) {
        console.error("Error marking notification as read:", error);
        toast({ title: "Erro", description: "Falha ao marcar notificação como lida.", variant: "destructive" });
    }
  };

  const handleMarkAllRead = async (e: React.MouseEvent) => {
     e.stopPropagation(); // Prevent dropdown from closing
     try {
        const success = await markAllNotificationsAsRead(mockEmployee.id);
        if (success) {
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
             toast({ title: "Sucesso", description: "Todas as notificações marcadas como lidas.", duration: 2000 });
        } else {
            toast({ title: "Erro", description: "Não foi possível marcar todas como lidas.", variant: "destructive" });
        }
    } catch (error) {
         console.error("Error marking all notifications as read:", error);
        toast({ title: "Erro", description: "Falha ao marcar todas as notificações como lidas.", variant: "destructive" });
    }
  };


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

  const handleGuestLoginRedirect = () => {
      // Allow guest access for now based on previous request
      // router.push('/login'); // Original behavior: Redirect guest users to the login page
      // toast({
      //     title: "Acesso Requerido",
      //     description: "Por favor, faça login para acessar esta área.",
      //     variant: "destructive"
      // });
      console.log("[Guest Mode] Accessing employee area without login."); // Log guest access
   };


  // Check if the user is a guest (Simplified Check - Allow access for now)
   const isGuest = false; // Force non-guest for testing authenticated state UI
   // Original guest check (replace with actual logic if needed):
   // const isGuest = typeof window !== 'undefined' && !document.cookie.includes('auth-token=');

    // Handle clicking a notification item (navigate if link exists, mark as read)
    const handleNotificationClick = (notification: Notification) => {
        if (!notification.read) {
            handleMarkRead(notification.id, {} as React.MouseEvent); // Mark as read programmatically
        }
        if (notification.link) {
            router.push(notification.link);
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
                        {/* Add a visually hidden title for accessibility */}
                         <SheetHeader>
                           <SheetTitle className="sr-only">Menu de Navegação Principal</SheetTitle>
                         </SheetHeader>
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
                                  {/* Show logout button only if not guest */}
                                  {!isGuest ? (
                                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }}>
                                          <LogOut className="h-4 w-4" />
                                          <span className="sr-only">Sair</span>
                                      </Button>
                                  ) : ( // Show Guest login button if guest (now allows access)
                                       <Button variant="ghost" size="sm" onClick={() => { handleGuestLoginRedirect(); setIsMobileMenuOpen(false); }}>
                                          Acesso Convidado
                                       </Button>
                                  )}
                             </div>
                         </div>
                    </SheetContent>
                </Sheet>

                 <h1 className="text-lg font-semibold md:hidden"> {/* Show title only on mobile header */}
                   {getCurrentTitle()}
                 </h1>

                {/* Right side of Header (User info/logout & Notifications for desktop) */}
                <div className="hidden items-center gap-4 md:flex">
                     {/* Notification Dropdown */}
                     {!isGuest && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="relative rounded-full h-8 w-8">
                                <Bell className="h-5 w-5" />
                                {unreadCount > 0 && (
                                    <Badge
                                    variant="destructive"
                                    className="absolute -top-1 -right-1 h-4 min-w-[1rem] px-1 py-0 text-[10px] flex items-center justify-center"
                                    >
                                    {unreadCount}
                                    </Badge>
                                )}
                                <span className="sr-only">Abrir notificações</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-80">
                                <DropdownMenuLabel className="flex justify-between items-center">
                                    Notificações
                                    {unreadCount > 0 && (
                                        <Button variant="ghost" size="sm" className="h-auto p-0 text-xs" onClick={handleMarkAllRead}>
                                            Marcar todas como lidas
                                        </Button>
                                    )}
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <ScrollArea className="h-[300px]">
                                    {isLoadingNotifications ? (
                                        <DropdownMenuItem disabled>Carregando...</DropdownMenuItem>
                                    ) : notifications.length === 0 ? (
                                        <DropdownMenuItem disabled>Nenhuma notificação</DropdownMenuItem>
                                    ) : (
                                        notifications.map((notification) => (
                                        <DropdownMenuItem
                                            key={notification.id}
                                            className={cn("flex items-start gap-2 cursor-pointer", !notification.read && "bg-accent/50")}
                                            onClick={() => handleNotificationClick(notification)}
                                        >
                                            {!notification.read && <div className="h-2 w-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />}
                                            <div className={cn("flex-1 space-y-0.5", notification.read && "pl-4")}>
                                                <p className="text-xs font-medium leading-tight">{notification.message}</p>
                                                <p className="text-[10px] text-muted-foreground">{notification.timestamp.toLocaleTimeString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</p>
                                            </div>
                                             {!notification.read && (
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                         <Button
                                                             variant="ghost"
                                                             size="icon"
                                                             className="h-6 w-6 text-muted-foreground hover:text-foreground flex-shrink-0"
                                                             onClick={(e) => handleMarkRead(notification.id, e)}
                                                         >
                                                             <Check className="h-4 w-4" />
                                                             <span className="sr-only">Marcar como lida</span>
                                                         </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="left"><p>Marcar como lida</p></TooltipContent>
                                                </Tooltip>
                                             )}
                                        </DropdownMenuItem>
                                        ))
                                    )}
                                </ScrollArea>
                            </DropdownMenuContent>
                        </DropdownMenu>
                     )}

                    {/* User Profile Dropdown or Login Button */}
                    {!isGuest ? (
                        <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="secondary" size="icon" className="rounded-full h-8 w-8">
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
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={handleLogout}>Sair</DropdownMenuItem>
                        </DropdownMenuContent>
                        </DropdownMenu>
                    ) : ( // Show Guest Access button
                         <Button variant="outline" size="sm" onClick={handleGuestLoginRedirect}>
                            Acesso Convidado
                         </Button>
                    )}
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
