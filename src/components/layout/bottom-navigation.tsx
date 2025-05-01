
'use client';

import * as React from 'react'; // Add React import
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ClipboardCheck,
  Target,
  Trophy,
  User,
  Bell, // Add Bell icon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge'; // Import Badge

const navItems = [
  { href: '/colaborador/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/colaborador/avaliacoes', label: 'Avaliações', icon: ClipboardCheck },
  { href: '/colaborador/desafios', label: 'Desafios', icon: Target },
  { href: '/colaborador/ranking', label: 'Ranking', icon: Trophy },
  // { href: '/colaborador/notificacoes', label: 'Notificações', icon: Bell }, // Placeholder for dedicated notification page
  { href: '/colaborador/perfil', label: 'Perfil', icon: User },
];

export function BottomNavigation() {
  const pathname = usePathname();
  // TODO: Get real unread count from context or state management
  const mockUnreadCount = 3; // Placeholder for unread notification count

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden">
      <div className="flex h-16 items-center justify-around">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const isNotificationItem = item.label === 'Notificações'; // Check if it's the notification item

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'relative flex flex-col items-center justify-center gap-1 p-2 text-xs transition-colors hover:text-primary flex-1 min-w-0', // Added flex-1 and min-w-0
                isActive ? 'text-primary font-medium' : 'text-muted-foreground'
              )}
            >
              {/* Notification Badge */}
              {isNotificationItem && mockUnreadCount > 0 && (
                 <Badge
                    variant="destructive"
                    className="absolute top-1 right-1 h-4 min-w-[1rem] px-1 py-0 text-[9px] flex items-center justify-center rounded-full"
                 >
                    {mockUnreadCount > 9 ? '9+' : mockUnreadCount}
                 </Badge>
              )}
              <item.icon className="h-5 w-5" />
              <span className="truncate">{item.label}</span> {/* Added truncate */}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
