
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/toaster';
import { useToast } from '@/hooks/use-toast';
import { BottomNavigation } from '@/components/layout/bottom-navigation';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Notification as NotificationType } from '@/types/notification';
import { listenToNotifications, markNotificationAsRead, markAllNotificationsAsRead, requestBrowserNotificationPermission, triggerTestNotification } from '@/lib/notifications';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Logo } from '@/components/logo';
import { useAuth } from '@/hooks/use-auth'; // Import useAuth

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

// Helper to get initials from a name
const getInitials = (name?: string) => {
    if (!name) return '??';
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

function EmployeeLayoutContent({ children }: EmployeeLayoutProps) {
  const isMobile = useIsMobile();
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const { user, isLoading: authLoading, isGuest, logout: authLogout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [notifications, setNotifications] = React.useState<NotificationType[]>([]);
  const [isLoadingNotifications, setIsLoadingNotifications] = React.useState(true);
  const [browserNotificationPermission, setBrowserNotificationPermission] = React.useState<NotificationPermission | null>(null);
  const unsubscribeRef = React.useRef<() => void>(() => {});

  const currentUserId = user?.uid;
  const userName = user?.displayName || (isGuest ? 'Convidado' : 'Colaborador');
  const userPhotoUrl = user?.photoURL;


  // Request Browser Notification Permission and Setup Listener
  React.useEffect(() => {
    const setupNotifications = async () => {
        if (isGuest || !currentUserId) { // Only setup if not guest and userId exists
            setIsLoadingNotifications(false);
            setNotifications([]);
            console.log("[Notifications] Guest mode or no user ID, skipping notification setup.");
            return;
        }
         console.log("[Notifications] Setting up for user ID:", currentUserId);

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

        setIsLoadingNotifications(true);
        if (unsubscribeRef.current) {
            console.log("[Notifications] Unsubscribing previous listener.");
            unsubscribeRef.current();
        }
        console.log("[Notifications] Starting listener...");
        unsubscribeRef.current = listenToNotifications(
            currentUserId,
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

    return () => {
         if (unsubscribeRef.current) {
            console.log("[Notifications] Cleaning up listener.");
            unsubscribeRef.current();
            unsubscribeRef.current = () => {};
         }
    };
  }, [isGuest, currentUserId, toast]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkRead = async (notificationId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (isGuest || !currentUserId) return;
    try {
      await markNotificationAsRead(currentUserId, notificationId);
    } catch (error) {
        console.error("Error marking notification as read:", error);
        toast({ title: "Erro", description: "Falha ao marcar notificação como lida.", variant: "destructive" });
    }
  };

  const handleMarkAllRead = async (e: React.MouseEvent) => {
     e.stopPropagation();
    if (isGuest || !currentUserId) return;
     try {
        await markAllNotificationsAsRead(currentUserId);
         toast({ title: "Sucesso", description: "Notificações marcadas como lidas.", duration: 2000 });
    } catch (error) {
        toast({ title: "Erro", description: "Falha ao marcar notificações como lidas.", variant: "destructive" });
    }
  };

  const getCurrentTitle = () => {
    const currentNavItem = navItems.find(item => pathname?.startsWith(item.href));
    if (pathname === '/colaborador/dashboard' || pathname === '/colaborador') return 'Visão Geral';
    return currentNavItem?.label || 'Check2B Colaborador';
  };

  const handleLogout = async () => {
    try {
        await authLogout(); // Use logout from useAuth
        // No need to call setIsGuest or setNotifications, useAuth handles it
        router.push('/login'); // useAuth should trigger re-render or middleware will redirect
    } catch (error) {
        console.error("Erro ao fazer logout:", error);
        toast({ title: "Erro", description: "Falha ao fazer logout.", variant: "destructive" });
    }
  };

  const handleNotificationClick = (notification: NotificationType) => {
      if (isGuest) return;
      if (!notification.read && currentUserId) {
          handleMarkRead(notification.id);
      }
      if (notification.link) {
          router.push(notification.link);
      }
  };

   const handleTestNotification = async () => {
       if (isGuest || !currentUserId) return;
       const success = await triggerTestNotification(currentUserId);
       if (success) {
           toast({ title: "Teste Enviado", description: "Notificação de teste enviada." });
       } else {
           toast({ title: "Erro Teste", description: "Falha ao enviar notificação.", variant: "destructive" });
       }
   };

  if (authLoading) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <TooltipProvider>
      <div className="flex flex-col min-h-screen w-full bg-gradient-to-b from-sky-50 via-white to-gray-100 dark:from-slate-900 dark:via-slate-950 dark:to-slate-800">

        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/80 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
             <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="shrink-0">
                        <Menu className="h-5 w-5" />
                        <span className="sr-only">Abrir menu</span>
                    </Button>
                </SheetTrigger>
                <SheetContent side="left" className="flex flex-col p-0 w-72">
                     <VisuallyHidden><SheetTitle>Menu Principal</SheetTitle></VisuallyHidden>
                     <SheetHeader className='p-4 border-b'>
                         <SheetTitle className="flex items-center gap-2 text-lg font-semibold">
                            <Logo className="w-7 h-7 text-primary" />
                            <span>Check2B</span>
                       </SheetTitle>
                       <SheetDescription className="text-xs text-muted-foreground">Menu Colaborador</SheetDescription>
                     </SheetHeader>
                     <ScrollArea className="flex-grow">
                         <nav className="flex flex-col gap-1 p-4 text-base font-medium">
                            {navItems.map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={cn(
                                        "flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:bg-muted hover:text-primary",
                                        (pathname === item.href || (item.href === '/colaborador/dashboard' && pathname === '/colaborador')) ? "bg-muted text-primary font-semibold" : "text-muted-foreground"
                                    )}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                >
                                    <item.icon className="h-5 w-5" />
                                    {item.label}
                                </Link>
                            ))}
                         </nav>
                     </ScrollArea>
                     <div className="mt-auto border-t p-4">
                        {!isGuest && user ? (
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 overflow-hidden">
                                    <Avatar className="h-9 w-9 flex-shrink-0">
                                        <AvatarImage src={userPhotoUrl || undefined} alt={userName} />
                                        <AvatarFallback>{getInitials(userName)}</AvatarFallback>
                                    </Avatar>
                                    <span className="text-sm font-medium truncate flex-1">{userName}</span>
                                </div>
                                <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }}>
                                    <LogOut className="h-4 w-4" />
                                    <span className="sr-only">Sair</span>
                                </Button>
                            </div>
                            ) : (
                            <Button variant="outline" size="sm" className='w-full' onClick={() => { router.push('/login'); setIsMobileMenuOpen(false); }}>
                                Fazer Login
                            </Button>
                         )}
                     </div>
                </SheetContent>
             </Sheet>

            <h1 className="text-base font-semibold text-center flex-1 truncate px-2">
                {getCurrentTitle()}
            </h1>

             <div className="flex items-center gap-1">
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="relative rounded-full h-9 w-9">
                        <Bell className="h-5 w-5" />
                        {unreadCount > 0 && !isGuest && (
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
                            {unreadCount > 0 && !isGuest && (
                                <Button variant="link" size="sm" className="h-auto p-0 text-xs text-primary" onClick={handleMarkAllRead}>
                                    Marcar todas como lidas
                                </Button>
                            )}
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                         <ScrollArea className="h-[300px]">
                            {isLoadingNotifications && !isGuest ? (
                                 <div className="flex justify-center items-center p-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
                            ) : isGuest ? (
                                 <DropdownMenuItem disabled className="text-center justify-center py-4 text-muted-foreground italic text-xs">Login necessário para ver notificações</DropdownMenuItem>
                            ) : notifications.length === 0 ? (
                                <DropdownMenuItem disabled className="text-center justify-center py-4 text-muted-foreground italic text-xs">Nenhuma notificação</DropdownMenuItem>
                            ) : (
                                notifications.map((notification) => (
                                <DropdownMenuItem
                                    key={notification.id}
                                    className={cn("flex items-start gap-3 cursor-pointer p-2 data-[highlighted]:bg-muted/50 group min-h-[50px]", !notification.read && "bg-accent/20 dark:bg-accent/10 font-medium")}
                                    onClick={() => handleNotificationClick(notification)}
                                    onSelect={(e) => e.preventDefault()}
                                    style={{whiteSpace: 'normal'}}
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
                                                     aria-label="Marcar como lida"
                                                 >
                                                     <Check className="h-4 w-4" />
                                                 </Button>
                                            </TooltipTrigger>
                                            <TooltipContent side="left"><p>Marcar como lida</p></TooltipContent>
                                        </Tooltip>
                                     )}
                                </DropdownMenuItem>
                                ))
                            )}
                        </ScrollArea>
                        {process.env.NODE_ENV === 'development' && !isGuest && currentUserId && (
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
             </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 pb-20">
             {children}
        </main>

        {isMobile && <BottomNavigation />}

        <Toaster />
      </div>
    </TooltipProvider>
  );
}

export default function EmployeeLayout({ children }: EmployeeLayoutProps) {
  // Envolve o conteúdo principal com AuthProvider para fornecer o contexto
  // A verificação de authLoading e o spinner global podem ser feitos aqui
  // ou em um nível superior se AuthProvider já o fizer.
  // Por agora, vamos manter o spinner dentro de EmployeeLayoutContent.
  // Se ConditionalLayout já lida com o carregamento global, AuthProvider pode ser desnecessário aqui.
  // No entanto, useAuth precisa do provider em algum lugar acima.
  // A estrutura atual sugere que AuthProvider está no RootLayout.
  return <EmployeeLayoutContent>{children}</EmployeeLayoutContent>;
}

