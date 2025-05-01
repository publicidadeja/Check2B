{'use client';

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
import Cookies from 'js-cookie'; // Import js-cookie

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
import { Sheet, SheetContent, SheetTrigger, SheetClose, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'; // Added SheetTitle, SheetDescription
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Notification as NotificationType } from '@/types/notification'; // Renamed to avoid conflict
import { listenToNotifications, markNotificationAsRead, markAllNotificationsAsRead, requestBrowserNotificationPermission, triggerTestNotification } from '@/lib/notifications'; // Added requestBrowserNotificationPermission, triggerTestNotification

interface EmployeeLayoutProps {
  children: ReactNode;
}

// Moved out of component for clarity
const navItems = [
  { href: '/colaborador/dashboard', label: 'Início', icon: LayoutDashboard },
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

// Function to get notification icon based on type
const getNotificationIcon = (type: NotificationType['type']) => {
    switch (type) {
        case 'evaluation': return <ClipboardCheck className="h-4 w-4 text-blue-500" />;
        case 'challenge': return <Target className="h-4 w-4 text-purple-500" />;
        case 'ranking': return <Trophy className="h-4 w-4 text-yellow-500" />;
        case 'announcement': return <Bell className="h-4 w-4 text-gray-500" />;
        case 'system': return <Settings className="h-4 w-4 text-red-500" />; // Example for system alert
        case 'info': return <Settings className="h-4 w-4 text-blue-500" />; // Info icon
        default: return <Bell className="h-4 w-4 text-muted-foreground" />;
    }
};


export default function EmployeeLayout({ children }: EmployeeLayoutProps) {
  const isMobile = useIsMobile();
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [notifications, setNotifications] = React.useState<NotificationType[]>([]);
  const [isLoadingNotifications, setIsLoadingNotifications] = React.useState(true);
  const [isGuest, setIsGuest] = React.useState(true); // Default to guest until checked
  const [browserNotificationPermission, setBrowserNotificationPermission] = React.useState<NotificationPermission | null>(null);
  const unsubscribeRef = React.useRef<() => void>(() => {}); // Ref to store unsubscribe function


  // Check authentication status on mount
  React.useEffect(() => {
      const checkAuth = () => {
          // Check for the auth cookie client-side
          const token = Cookies.get('auth-token');
          const isGuestMode = !token;
          setIsGuest(isGuestMode);
          console.log(`[AuthCheck] Guest mode: ${isGuestMode}`);
      };
      checkAuth();
  }, []);


  // Request Browser Notification Permission and Setup Listener
  React.useEffect(() => {
    const setupNotifications = async () => {
        if (isGuest) {
            setIsLoadingNotifications(false);
            setNotifications([]); // Clear notifications for guest
            return; // Don't fetch/listen if guest
        }

        // Request browser permission on mount if not guest
        if (typeof window !== 'undefined' && "Notification" in window) {
             if (Notification.permission === "default") {
                 const permission = await requestBrowserNotificationPermission();
                 setBrowserNotificationPermission(permission);
                 if (permission === 'granted') {
                    toast({title: "Notificações Ativadas", description: "Você receberá alertas importantes.", duration: 3000});
                 } else if (permission === 'denied') {
                    toast({title: "Notificações Bloqueadas", description: "Para receber alertas, ative as notificações nas configurações do seu navegador.", variant: "destructive", duration: 5000});
                 }
             } else {
                  setBrowserNotificationPermission(Notification.permission);
             }
         }

        // Setup Firebase listener
        setIsLoadingNotifications(true);
         // Ensure previous listener is unsubscribed before setting up a new one
        if (unsubscribeRef.current) {
            unsubscribeRef.current();
        }
        unsubscribeRef.current = listenToNotifications(
            mockEmployee.id,
            (newNotifications) => {
                console.log("[Notifications] Received update:", newNotifications);
                setNotifications(newNotifications);
                setIsLoadingNotifications(false);
            },
            (error) => {
                console.error("Failed to fetch notifications:", error);
                toast({ title: "Erro", description: "Não foi possível carregar as notificações.", variant: "destructive" });
                setIsLoadingNotifications(false);
            }
        );
    };

    setupNotifications();

    // Cleanup listener on component unmount or when guest status changes
    return () => {
         if (unsubscribeRef.current) {
            unsubscribeRef.current();
            unsubscribeRef.current = () => {}; // Clear the ref
         }
    };
  }, [isGuest, toast]); // Re-run if guest status changes

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkRead = async (notificationId: string, e?: React.MouseEvent) => {
    e?.stopPropagation(); // Prevent dropdown from closing if called from click
    try {
      await markNotificationAsRead(mockEmployee.id, notificationId);
      // Listener will update the state
    } catch (error) {
        console.error("Error marking notification as read:", error);
        toast({ title: "Erro", description: "Falha ao marcar notificação como lida.", variant: "destructive" });
    }
  };

  const handleMarkAllRead = async (e: React.MouseEvent) => {
     e.stopPropagation(); // Prevent dropdown from closing
     try {
        await markAllNotificationsAsRead(mockEmployee.id);
         toast({ title: "Sucesso", description: "Todas as notificações marcadas como lidas.", duration: 2000 });
         // Listener will update the state
    } catch (error) {
         console.error("Error marking all notifications as read:", error);
        toast({ title: "Erro", description: "Falha ao marcar todas as notificações como lidas.", variant: "destructive" });
    }
  };


  const getCurrentTitle = () => {
    const currentNavItem = navItems.find(item => pathname?.startsWith(item.href));
    if (pathname === '/colaborador/dashboard') return 'Visão Geral';
    return currentNavItem?.label || 'Check2B Colaborador';
  };

  const handleLogout = async () => {
    try {
        await logoutUser();
        setIsGuest(true); // Update guest state on logout
        setNotifications([]); // Clear notifications
        toast({ title: "Logout", description: "Você saiu com sucesso." });
        router.push('/login');
    } catch (error) {
        console.error("Erro ao fazer logout:", error);
        toast({ title: "Erro", description: "Falha ao fazer logout.", variant: "destructive" });
    }
  };


  // Handle clicking a notification item (navigate if link exists, mark as read)
  const handleNotificationClick = (notification: NotificationType) => {
      if (!notification.read) {
          handleMarkRead(notification.id); // Mark as read programmatically
      }
      if (notification.link) {
          router.push(notification.link);
      }
  };

   // Handler for test notification button (development only)
   const handleTestNotification = async () => {
       if (isGuest) return;
       const success = await triggerTestNotification(mockEmployee.id);
       if (success) {
           toast({ title: "Teste Enviado", description: "Notificação de teste enviada para a base de dados." });
       } else {
           toast({ title: "Erro Teste", description: "Falha ao enviar notificação de teste.", variant: "destructive" });
       }
   };

  return (
    <TooltipProvider>
        <div className="flex min-h-screen w-full flex-col bg-gradient-to-b from-sky-50 via-white to-white dark:from-slate-900 dark:via-slate-950 dark:to-background">
            {/* Header - Mobile */}
             <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b bg-background/80 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden">
                 {/* Mobile Menu Trigger (Left) */}
                 <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                    <SheetTrigger asChild>
                        <Button variant="ghost" size="icon" className="shrink-0">
                            <Menu className="h-5 w-5" />
                            <span className="sr-only">Abrir menu</span>
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="flex flex-col p-0 w-72">
                         <SheetHeader className='p-4 border-b'>
                             <SheetTitle className="flex items-center gap-2 text-lg font-semibold">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7 text-primary">
                                  <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" clipRule="evenodd" />
                                </svg>
                                <span>Check2B</span>
                           </SheetTitle>
                            {/* Optionally add a description */}
                           {/* <SheetDescription>Menu de Navegação</SheetDescription> */}
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
                                    <div className="flex items-center gap-2 overflow-hidden">
                                        <Avatar className="h-9 w-9 flex-shrink-0">
                                            <AvatarImage src={mockEmployee.photoUrl} alt={mockEmployee.name} />
                                            <AvatarFallback>{getInitials(mockEmployee.name)}</AvatarFallback>
                                        </Avatar>
                                        <span className="text-sm font-medium truncate flex-1">{mockEmployee.name}</span>
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }}>
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

                 {/* Title centered on mobile*/}
                 <h1 className="text-lg font-semibold text-center flex-1 truncate px-2">
                   {getCurrentTitle()}
                 </h1>

                 {/* Right side Actions: Notifications Dropdown (Mobile) */}
                  <div className="flex items-center gap-1">
                     {/* Notification Dropdown */}
                     {!isGuest && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="relative rounded-full h-8 w-8">
                                <Bell className="h-5 w-5" />
                                {unreadCount > 0 && (
                                    <Badge
                                    variant="destructive"
                                    className="absolute -top-1 -right-1 h-4 min-w-[1rem] px-1 py-0 text-[10px] flex items-center justify-center rounded-full animate-pulse"
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
                                         <div className="flex justify-center items-center p-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
                                    ) : notifications.length === 0 ? (
                                        <DropdownMenuItem disabled className="text-center py-4 text-muted-foreground italic">Nenhuma notificação</DropdownMenuItem>
                                    ) : (
                                        notifications.map((notification) => (
                                        <DropdownMenuItem
                                            key={notification.id}
                                            className={cn("flex items-start gap-3 cursor-pointer p-2 data-[highlighted]:bg-muted/50 group min-h-[50px]", !notification.read && "bg-accent/20 dark:bg-accent/10 font-medium")}
                                            onClick={() => handleNotificationClick(notification)}
                                            style={{whiteSpace: 'normal'}} // Allow text wrapping
                                        >
                                            <div className="flex-shrink-0 pt-1 text-muted-foreground">
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
                                                             className="h-6 w-6 text-muted-foreground hover:text-primary flex-shrink-0 ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
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
                                 {/* Add Test Button for Development */}
                                {process.env.NODE_ENV === 'development' && (
                                    <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="p-1">
                                         <Button variant="outline" size="sm" className="w-full text-xs" onClick={handleTestNotification}>
                                            Testar Notificação
                                         </Button>
                                    </DropdownMenuItem>
                                    </>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                     )}
                      {/* Guest Button */}
                     {isGuest && (
                         <Button variant="outline" size="sm" onClick={() => router.push('/login')}>
                            Login
                         </Button>
                     )}
                 </div>
            </header>

            {/* Main Content Area - Padding adjusted for bottom nav */}
            <main className="flex-1 overflow-auto p-4 pb-20"> {/* Adjusted padding-bottom */}
                 {children}
            </main>

            {/* Bottom Navigation for Mobile */}
            {isMobile && <BottomNavigation />}

            <Toaster />
        </div>
    </TooltipProvider>
  );
}
