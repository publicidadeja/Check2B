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
  Settings, // Added Settings icon
} from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from '@/components/ui/dropdown-menu';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/toaster';
import { logoutUser } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { BottomNavigation } from '@/components/layout/bottom-navigation';
import { Sheet, SheetContent, SheetTrigger, SheetClose, SheetTitle, SheetHeader } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Notification } from '@/types/notification'; // Import Notification type

interface EmployeeLayoutProps {
  children: ReactNode;
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
    return false;
};

const markAllNotificationsAsRead = async (employeeId: string): Promise<boolean> => {
    console.log(`[Mock] Marking all notifications as read for ${employeeId}...`);
    await new Promise(resolve => setTimeout(resolve, 300));
    initialMockNotifications.forEach(n => n.read = true);
    return true;
};


const navItems = [
  { href: '/colaborador/dashboard', label: 'Início', icon: LayoutDashboard }, // Renamed Dashboard to Início
  { href: '/colaborador/avaliacoes', label: 'Avaliações', icon: ClipboardCheck },
  { href: '/colaborador/desafios', label: 'Desafios', icon: Target },
  { href: '/colaborador/ranking', label: 'Ranking', icon: Trophy },
  // { href: '/colaborador/notificacoes', label: 'Notificações', icon: Bell }, // Keep commented out for now
  { href: '/colaborador/perfil', label: 'Perfil', icon: User },
];

// Mock employee data - Replace with actual data fetching/auth context
const mockEmployee = {
    id: '1', // IMPORTANT: Using ID '1' to match mock data fetching
    name: 'Alice Silva',
    email: 'alice.silva@check2b.com',
    photoUrl: 'https://picsum.photos/id/1027/80/80', // Slightly larger photo
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
              const fetchedNotifications = await fetchNotifications(mockEmployee.id);
              setNotifications(fetchedNotifications);
          } catch (error) {
              console.error("Failed to fetch notifications:", error);
              toast({ title: "Erro", description: "Não foi possível carregar as notificações.", variant: "destructive" });
          } finally {
              setIsLoadingNotifications(false);
          }
      };
      // Simulate guest mode or fetch based on actual auth state
      const isGuest = false; // Replace with actual auth check
      if (!isGuest) {
         loadNotifications();
      } else {
         setIsLoadingNotifications(false); // No need to load for guest
      }
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
    // Use a more generic or app-specific title if not on a main nav item path
    if (pathname === '/colaborador/dashboard') return 'Visão Geral';
    return currentNavItem?.label || 'Check2B Colaborador';
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

  // --- Guest Mode Handling (as implemented previously) ---
  // Check if guest based on cookie (replace with your actual auth logic)
  const [isGuest, setIsGuest] = React.useState(true); // Default to guest for safety if check fails
  React.useEffect(() => {
      const checkAuth = () => {
          // Check for the auth cookie client-side
          const token = Cookies.get('auth-token');
          setIsGuest(!token);
      };
      checkAuth();
  }, []);

  const handleGuestLoginRedirect = () => {
      console.log("[Guest Mode] Accessing employee area without login.");
      // No longer redirects, allows access
  };


  // Handle clicking a notification item (navigate if link exists, mark as read)
  const handleNotificationClick = (notification: Notification) => {
      if (!notification.read) {
          handleMarkRead(notification.id, {} as React.MouseEvent); // Mark as read programmatically
      }
      if (notification.link) {
          router.push(notification.link);
      }
  };

  // Function to get notification icon based on type
    const getNotificationIcon = (type: Notification['type']) => {
        switch (type) {
            case 'evaluation': return <ClipboardCheck className="h-4 w-4 text-blue-500" />;
            case 'challenge': return <Target className="h-4 w-4 text-purple-500" />;
            case 'ranking': return <Trophy className="h-4 w-4 text-yellow-500" />;
            case 'announcement': return <Bell className="h-4 w-4 text-gray-500" />;
            case 'system': return <Settings className="h-4 w-4 text-red-500" />; // Example for system alert
            default: return <Bell className="h-4 w-4 text-muted-foreground" />;
        }
    };


  return (
    <TooltipProvider>
        {/* Use bg-muted/40 for a slightly off-white/grey background for the whole app */}
        <div className="flex min-h-screen w-full flex-col bg-muted/40">
            {/* Header - Only visible on larger screens (md and up) or as Mobile Sheet Trigger */}
            <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:px-6">
                 {/* Mobile Menu Trigger (Left) */}
                 <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                    <SheetTrigger asChild>
                        <Button variant="ghost" size="icon" className="shrink-0 md:hidden">
                            <Menu className="h-5 w-5" />
                            <span className="sr-only">Abrir menu</span>
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="flex flex-col p-0 w-72"> {/* Adjust width if needed */}
                         <SheetHeader className='p-4 border-b'>
                            <SheetTitle className="flex items-center gap-2 text-lg font-semibold">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7 text-primary">
                                  <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" clipRule="evenodd" />
                                </svg>
                                <span>Check2B</span>
                           </SheetTitle>
                         </SheetHeader>
                         <nav className="flex flex-col gap-1 p-4 text-base font-medium flex-grow">
                            {navItems.map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={cn(
                                        "flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:bg-muted hover:text-primary",
                                        pathname === item.href ? "bg-muted text-primary" : "text-muted-foreground"
                                    )}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                >
                                    <item.icon className="h-5 w-5" />
                                    {item.label}
                                </Link>
                             ))}
                         </nav>
                         {/* Mobile Menu Footer */}
                         <div className="mt-auto border-t p-4">
                            {!isGuest ? (
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Avatar className="h-9 w-9">
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
                                ) : (
                                <Button variant="outline" size="sm" className='w-full' onClick={() => router.push('/login')}>
                                    Fazer Login
                                </Button>
                             )}
                         </div>
                    </SheetContent>
                 </Sheet>

                 {/* Title centered on mobile, aligned left on desktop */}
                 <h1 className="text-lg font-semibold text-center flex-1 md:text-left md:flex-none">
                   {getCurrentTitle()}
                 </h1>

                {/* Right side Actions: Notifications & User Dropdown (visible on larger screens) */}
                <div className="flex items-center gap-3">
                     {/* Notification Dropdown */}
                     {!isGuest && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="relative rounded-full h-8 w-8">
                                <Bell className="h-5 w-5" />
                                {unreadCount > 0 && (
                                    <Badge
                                    variant="destructive"
                                    className="absolute -top-1 -right-1 h-4 min-w-[1rem] px-1 py-0 text-[10px] flex items-center justify-center rounded-full"
                                    >
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                    </Badge>
                                )}
                                <span className="sr-only">Abrir notificações</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-80">
                                <DropdownMenuLabel className="flex justify-between items-center">
                                    Notificações
                                    {unreadCount > 0 && (
                                        <Button variant="link" size="sm" className="h-auto p-0 text-xs text-primary" onClick={handleMarkAllRead}>
                                            Marcar todas como lidas
                                        </Button>
                                    )}
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <ScrollArea className="h-[300px]">
                                    {isLoadingNotifications ? (
                                        <DropdownMenuItem disabled className="flex justify-center items-center py-4">Carregando...</DropdownMenuItem>
                                    ) : notifications.length === 0 ? (
                                        <DropdownMenuItem disabled className="text-center py-4">Nenhuma notificação</DropdownMenuItem>
                                    ) : (
                                        notifications.map((notification) => (
                                        <DropdownMenuItem
                                            key={notification.id}
                                            className={cn("flex items-start gap-3 cursor-pointer p-2", !notification.read && "bg-accent/50 font-medium")}
                                            onClick={() => handleNotificationClick(notification)}
                                        >
                                            <div className="flex-shrink-0 pt-0.5 text-muted-foreground">
                                                {getNotificationIcon(notification.type)}
                                            </div>
                                            <div className={cn("flex-1 space-y-0.5")}>
                                                <p className="text-xs leading-tight">{notification.message}</p>
                                                <p className="text-[10px] text-muted-foreground/80">{notification.timestamp.toLocaleTimeString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</p>
                                            </div>
                                             {!notification.read && (
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                         <Button
                                                             variant="ghost"
                                                             size="icon"
                                                             className="h-6 w-6 text-muted-foreground hover:text-primary flex-shrink-0 opacity-0 group-hover:opacity-100"
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

                    {/* User Profile Dropdown or Guest Button */}
                    {!isGuest ? (
                        <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                            <Avatar className="h-9 w-9">
                                <AvatarImage src={mockEmployee.photoUrl} alt={mockEmployee.name} />
                                <AvatarFallback>{getInitials(mockEmployee.name)}</AvatarFallback>
                            </Avatar>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuLabel className="font-normal">
                                <div className="flex flex-col space-y-1">
                                    <p className="text-sm font-medium leading-none">{mockEmployee.name}</p>
                                    <p className="text-xs leading-none text-muted-foreground">{mockEmployee.email}</p>
                                </div>
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuGroup>
                                <DropdownMenuItem asChild><Link href="/colaborador/perfil"><User className="mr-2 h-4 w-4" /><span>Perfil</span></Link></DropdownMenuItem>
                                {/* Add other actions like settings, help etc. */}
                            </DropdownMenuGroup>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={handleLogout}>
                                <LogOut className="mr-2 h-4 w-4"/>
                                Sair
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                        </DropdownMenu>
                    ) : (
                         <Button variant="outline" size="sm" onClick={() => router.push('/login')}>
                            Login
                         </Button>
                    )}
                </div>
            </header>

            {/* Main Content Area */}
            {/* Added pb-20 to account for bottom navigation height more reliably */}
            <main className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6 pb-20">
                 {children}
            </main>

            {/* Bottom Navigation for Mobile */}
            {isMobile && <BottomNavigation />}

            <Toaster />
        </div>
    </TooltipProvider>
  );
}
