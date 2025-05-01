'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ClipboardCheck,
  Target,
  Trophy,
  User,
  Bell,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

const navItems = [
  { href: '/colaborador/dashboard', label: 'Início', icon: LayoutDashboard }, // Renamed
  { href: '/colaborador/avaliacoes', label: 'Avaliações', icon: ClipboardCheck },
  { href: '/colaborador/desafios', label: 'Desafios', icon: Target },
  { href: '/colaborador/ranking', label: 'Ranking', icon: Trophy },
  { href: '/colaborador/perfil', label: 'Perfil', icon: User },
];

export function BottomNavigation() {
  const pathname = usePathname();
  // TODO: Get real unread count from context or state management
  const mockUnreadCount = 3; // Placeholder

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden">
      <div className="flex h-16 items-center justify-around">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href === '/colaborador/dashboard' && pathname === '/colaborador'); // Make 'Início' active for root too
          const isNotificationItem = item.label === 'Notificações'; // Keep check if needed

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'relative flex flex-col items-center justify-center gap-1 p-2 text-xs transition-colors hover:text-primary flex-1 min-w-0 text-center', // Added text-center
                isActive ? 'text-primary font-semibold' : 'text-muted-foreground' // Use font-semibold for active
              )}
            >
              {/* Notification Badge - Can be added back if Notifications tab is re-enabled */}
              {/* {isNotificationItem && mockUnreadCount > 0 && ( ... )} */}
              <item.icon className="h-5 w-5 mb-0.5" /> {/* Added margin-bottom */}
              <span className="truncate w-full">{item.label}</span> {/* Ensure text truncates */}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
