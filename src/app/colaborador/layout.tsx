'use client';

import type { ReactNode } from 'react';
import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import {
  LayoutDashboard,
  ClipboardCheck,
  Target,
  Trophy,
  User,
  LogOut,
  Menu,
  Bell,
  Check,
  X,
  Settings,
  Loader2,
} from 'lucide-react';

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/toaster';
import { logoutUser } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { BottomNavigation } from '@/components/layout/bottom-navigation';
import { Sheet, SheetContent, SheetTrigger, SheetClose, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Notification as NotificationType } from '@/types/notification';
import { listenToNotifications, markNotificationAsRead, markAllNotificationsAsRead, requestBrowserNotificationPermission, triggerTestNotification } from '@/lib/notifications';

interface EmployeeLayoutProps {
  children: ReactNode;
}

// Navigation items for the main layout
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
    photoUrl: 'https://picsum.photos/seed/alicesilva/80/80', // More specific seed
};

// Helper to get initials from a name
const getInitials = (name: string = '') => {
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
        case 'system': return <Settings className="h-4 w-4 text-red-500" />;
        case 'info': return <Settings className="h-4 w-4 text-blue-500" />;
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
  const [isGuest, setIsGuest] = React.useState(false); // Start assuming not guest
  const [browserNotificationPermission, setBrowserNotificationPermission] = React.useState<NotificationPermission | null>(null);
  const unsubscribeRef = React.useRef<() => void>(() => {}); // Ref to store unsubscribe function

  // Check authentication status on mount
  React.useEffect(() => {
      const checkAuth = () => {
          // Check for the auth cookie client-side
          const token = Cookies.get('auth-token');
          const guestMode = !token && pathname !== '/login'; // Treat as guest if no token AND not on login page
          setIsGuest(guestMode);
          console.log(`[AuthCheck Client] Guest mode: ${guestMode} (Token: ${!!token}, Path: ${pathname})`);

          // If guest mode is activated (no token, not login page), redirect to login
          if (guestMode) {
              console.log("[AuthCheck Client] Guest detected, redirecting to /login");
              // router.replace('/login?reason=guest_mode'); // Use replace to avoid back button issues
          }
      };
      checkAuth();
  }, [pathname]); // Re-check when path changes

  // Request Browser Notification Permission and Setup Listener
  React.useEffect(() => {
    const setupNotifications = async () => {
        // Temporarily bypass guest check for development
        // if (isGuest) {
        //     setIsLoadingNotifications(false);
        //     setNotifications([]); // Clear notifications for guest
        //     console.log("[Notifications] Guest mode, skipping setup.");
        //     return; // Don't fetch/listen if guest
        // }
         console.log("[Notifications] Setting up for user ID:", mockEmployee.id);

        // Request browser permission on mount
        if (typeof window !== 'undefined' && "Notification" in window) {
             if (Notification.permission === "default") {
                 console.log("[Notifications] Requesting browser permission...");
                 const permission = await requestBrowserNotificationPermission();
                 setBrowserNotificationPermission(permission);
                 if (permission === 'granted') {
                    toast({title: "Notificações Ativadas", description: "Você receberá alertas importantes.", duration: 3000});
                 } else if (permission === 'denied') {
                    toast({title: "Notificações Bloqueadas", description: "Para receber alertas, ative nas configurações do navegador.", variant: "destructive", duration: 5000});
                 }
             } else {
                  console.log("[Notifications] Browser permission already set:", Notification.permission);
                  setBrowserNotificationPermission(Notification.permission);
             }
         }

        // Setup Firebase listener
        setIsLoadingNotifications(true);
         // Ensure previous listener is unsubscribed
        if (unsubscribeRef.current) {
            console.log("[Notifications] Unsubscribing previous listener.");
            unsubscribeRef.current();
        }
        console.log("[Notifications] Starting listener...");
        unsubscribeRef.current = listenToNotifications(
            mockEmployee.id,
            (newNotifications) => {
                console.log("[Notifications] Received update:", newNotifications.length, "items");
                setNotifications(newNotifications);
                setIsLoadingNotifications(false);
            },
            (error) => {
                console.error("[Notifications] Error listening:", error);
                toast({ title: "Erro Notificações", description: "Não foi possível carregar as notificações.", variant: "destructive" });
                setIsLoadingNotifications(false);
            }
        );
    };

    setupNotifications();

    // Cleanup listener on component unmount
    return () => {
         if (unsubscribeRef.current) {
            console.log("[Notifications] Cleaning up listener.");
            unsubscribeRef.current();
            unsubscribeRef.current = () => {}; // Clear the ref
         }
    };
  // }, [isGuest, toast]); // Re-run if guest status changes
  }, [toast]); // Temporarily remove isGuest dependency

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkRead = async (notificationId: string, e?: React.MouseEvent) => {
    e?.stopPropagation(); // Prevent dropdown from closing
    // if (isGuest) return; // Prevent action in guest mode
    try {
      console.log(`[Notifications] Marking ${notificationId} as read.`);
      await markNotificationAsRead(mockEmployee.id, notificationId);
      // Listener will update the state, no manual state update needed here
    } catch (error) {
        console.error("Error marking notification as read:", error);
        toast({ title: "Erro", description: "Falha ao marcar notificação como lida.", variant: "destructive" });
    }
  };

  const handleMarkAllRead = async (e: React.MouseEvent) => {
     e.stopPropagation();
    // if (isGuest) return;
     try {
        console.log("[Notifications] Marking all as read.");
        await markAllNotificationsAsRead(mockEmployee.id);
         toast({ title: "Sucesso", description: "Notificações marcadas como lidas.", duration: 2000 });
         // Listener updates state
    } catch (error) {
         console.error("Error marking all notifications as read:", error);
        toast({ title: "Erro", description: "Falha ao marcar notificações como lidas.", variant: "destructive" });
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
        setIsGuest(true); // Update guest state
        setNotifications([]); // Clear notifications
        toast({ title: "Logout", description: "Você saiu com sucesso." });
        router.push('/login');
    } catch (error) {
        console.error("Erro ao fazer logout:", error);
        toast({ title: "Erro", description: "Falha ao fazer logout.", variant: "destructive" });
    }
  };

  const handleNotificationClick = (notification: NotificationType) => {
      // if (isGuest) return;
      if (!notification.read) {
          handleMarkRead(notification.id);
      }
      if (notification.link) {
          router.push(notification.link);
      }
      // Close notification dropdown or sheet if open (logic depends on implementation)
  };

   const handleTestNotification = async () => {
      //  if (isGuest) return;
       console.log("[Notifications] Triggering test notification...");
       const success = await triggerTestNotification(mockEmployee.id);
       if (success) {
           toast({ title: "Teste Enviado", description: "Notificação de teste enviada." });
       } else {
           toast({ title: "Erro Teste", description: "Falha ao enviar notificação.", variant: "destructive" });
       }
   };

  return (
    //{<TooltipProvider>
     // <div className="flex flex-col min-h-screen w-full bg-gradient-to-b from-sky-50 via-white to-gray-100 dark:from-slate-900 dark:via-slate-950 dark:to-slate-800">

    //    {/* Header - Mobile First */}
     //   <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b bg-background/80 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
    //         {/* Mobile Menu Trigger (Left) */}
     //        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
    //            <SheetTrigger asChild>
     //               <Button variant="ghost" size="icon" className="shrink-0 md:hidden"> {/* Only show on mobile */}
     //                   <Menu className="h-5 w-5" />
     //                   <span className="sr-only">Abrir menu</span>
     //               </Button>
     //           </SheetTrigger>
     //           <SheetContent side="left" className="flex flex-col p-0 w-72">
     //                <SheetHeader className='p-4 border-b'>
     //                    <SheetTitle className="flex items-center gap-2 text-lg font-semibold">
     //                        {/* Placeholder Logo */}
     //                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7 text-primary">
     //                           <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" clipRule="evenodd" />
     //                        </svg>
     //                       <span>Check2B</span>
     //                  </SheetTitle>
     //                  <SheetDescription>Menu de Navegação</SheetDescription>
     //                </SheetHeader>
     //                <nav className="flex flex-col gap-1 p-4 text-base font-medium flex-grow">
     //                   {navItems.map((item) => (
     //                       <Link
     //                           key={item.href}
     //                           href={item.href}
     //                           className={cn(
     //                               "flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:bg-muted hover:text-primary",
     //                               pathname === item.href ? "bg-muted text-primary" : "text-muted-foreground"
     //                           )}
     //                           onClick={() => setIsMobileMenuOpen(false)} // Close sheet on navigation
     //                       >
     //                           <item.icon className="h-5 w-5" />
     //                           {item.label}
     //                       </Link>
     //                    ))}
     //                </nav>
     //                {/* Mobile Menu Footer - User Info / Login / Logout */}
     //                <div className="mt-auto border-t p-4">
     //                   {!isGuest ? (
     //                       <div className="flex items-center justify-between">
     //                           <div className="flex items-center gap-2 overflow-hidden">
     //                               <Avatar className="h-9 w-9 flex-shrink-0">
     //                                   <AvatarImage src={mockEmployee.photoUrl} alt={mockEmployee.name} />
     //                                   <AvatarFallback>{getInitials(mockEmployee.name)}</AvatarFallback>
     //                               </Avatar>
     //                               <span className="text-sm font-medium truncate flex-1">{mockEmployee.name}</span>
     //                           </div>
     //                           <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }}>
     //                               <LogOut className="h-4 w-4" />
     //                               <span className="sr-only">Sair</span>
     //                           </Button>
     //                       </div>
     //                       ) : (
     //                       <Button variant="outline" size="sm" className='w-full' onClick={() => { router.push('/login'); setIsMobileMenuOpen(false); }}>
     //                           Fazer Login
     //                       </Button>
     //                    )}
     //                </div>
     //           </SheetContent>
     //        </Sheet>

     //       {/* Title centered on mobile, left-aligned on desktop */}
     //        <h1 className="text-lg font-semibold text-center md:text-left flex-1 truncate px-2">
     //          {getCurrentTitle()}
     //        </h1>

     //        {/* Right side Actions: Notifications Dropdown */}
     //         <div className="flex items-center gap-1">
     //            {/* Notification Dropdown */}
     //            {/* {!isGuest && ( */}
     //            <DropdownMenu>
     //               <DropdownMenuTrigger asChild>
     //                   <Button variant="ghost" size="icon" className="relative rounded-full h-9 w-9"> {/* Increased size slightly */}
     //                   <Bell className="h-5 w-5" />
     //                   {unreadCount > 0 && (
     //                       <Badge
     //                       variant="destructive"
     //                       className="absolute -top-1 -right-1 h-4 min-w-[1rem] px-1 py-0 text-[10px] flex items-center justify-center rounded-full animate-pulse"
     //                       >
     //                       {unreadCount > 9 ? '9+' : unreadCount}
     //                      </Badge>
     //                   )}
     //                   <span className="sr-only">Abrir notificações</span>
     //                   </Button>
     //               </DropdownMenuTrigger>
     //                <DropdownMenuContent align="end" className="w-80">
     //                   <DropdownMenuLabel className="flex justify-between items-center">
     //                       Notificações
     //                       {unreadCount > 0 && (
     //                           <Button variant="link" size="sm" className="h-auto p-0 text-xs text-primary" onClick={handleMarkAllRead}>
     //                               Marcar todas como lidas
     //                           </Button>
     //                       )}
     //                   </DropdownMenuLabel>
     //                   <DropdownMenuSeparator />
     //                   <ScrollArea className="h-[300px]">
     //                       {isLoadingNotifications ? (
     //                            <div className="flex justify-center items-center p-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
     //                       ) : notifications.length === 0 ? (
     //                           <DropdownMenuItem disabled className="text-center justify-center py-4 text-muted-foreground italic text-xs">Nenhuma notificação</DropdownMenuItem>
     //                       ) : (
     //                           notifications.map((notification) => (
     //                           <DropdownMenuItem
     //                               key={notification.id}
     //                               className={cn("flex items-start gap-3 cursor-pointer p-2 data-[highlighted]:bg-muted/50 group min-h-[50px]", !notification.read && "bg-accent/20 dark:bg-accent/10 font-medium")}
     //                               onClick={() => handleNotificationClick(notification)}
     //                               onSelect={(e) => e.preventDefault()} // Prevent auto-close on select
     //                               style={{whiteSpace: 'normal'}} // Allow text wrapping
     //                           >
     //                               <div className="flex-shrink-0 pt-1 text-muted-foreground">
     //                                   {getNotificationIcon(notification.type)}
     //                               </div>
     //                               <div className={cn("flex-1 space-y-0.5")}>
     //                                   <p className="text-xs leading-tight">{notification.message}</p>
     //                                   <p className="text-[10px] text-muted-foreground/80">{notification.timestamp.toLocaleTimeString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</p>
     //                               </div>
     //                                {!notification.read && (
     //                                   <Tooltip>
     //                                       <TooltipTrigger asChild>
     //                                            <Button
     //                                                variant="ghost"
     //                                                size="icon"
     //                                                className="h-6 w-6 text-muted-foreground hover:text-primary flex-shrink-0 ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
     //                                                onClick={(e) => handleMarkRead(notification.id, e)}
     //                                                aria-label="Marcar como lida"
     //                                            >
     //                                                <Check className="h-4 w-4" />
     //                                            </Button>
     //                                       </TooltipTrigger>
     //                                       <TooltipContent side="left"><p>Marcar como lida</p></TooltipContent>
     //                                  </Tooltip>
     //                                )}
     //                           </DropdownMenuItem>
     //                           ))
     //                       )}
     //                   </ScrollArea>
     //                    {/* Add Test Button for Development */}
     //                   {process.env.NODE_ENV === 'development' && (
     //                       <>
     //                       <DropdownMenuSeparator />
     //                       <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="p-1">
     //                            <Button variant="outline" size="sm" className="w-full text-xs" onClick={handleTestNotification}>
     //                               Testar Notificação
     //                            </Button>
     //                       </DropdownMenuItem>
     //                       </>
     //                   )}
     //               </DropdownMenuContent>
     //           </DropdownMenu>
     //           {/* // )} */}
     //             {/* Guest Button */}
     //            {/* {isGuest && (
     //                <Button variant="outline" size="sm" onClick={() => router.push('/login')}>
     //                   Login
     //                </Button>
     //            )} */}
     //        </div>
     //   </header>

     //   {/* Main Content Area - Padding adjusted for bottom nav */}
     //   <main className="flex-1 overflow-auto p-4 pb-20"> {/* Add padding-bottom for bottom nav */}
     //        {children}
     //   </main>

     //   {/* Bottom Navigation for Mobile */}
     //   {isMobile && <BottomNavigation />}

     //   <Toaster />
     // </div>
    // </TooltipProvider>}
    <>
    {children}
    </>
  );
}
