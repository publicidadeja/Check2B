<<<<<<< HEAD
import type { ReactNode } from 'react';
import { ConditionalLayout } from '@/components/layout/conditional-layout';
import { Home, CalendarClock, Target, Trophy, User } from 'lucide-react';
import BottomNav from '@/components/colaborador/BottomNav'; // Assuming BottomNav component exists
import { Toaster } from '@/components/ui/toaster';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import Link from 'next/link';


interface CollaboratorLayoutProps {
  children: ReactNode;
}

export default function CollaboratorLayout({ children }: CollaboratorLayoutProps) {
  // TODO: Replace with actual authentication check and user data
  const isColaboradorAuthenticated = true; // Example
   // Placeholder user data - replace with actual data fetching logic
   const colaboradorUser = {
    name: 'Colaborador Teste',
    avatarFallback: 'CT',
    avatarUrl: `https://api.dicebear.com/8.x/initials/svg?seed=Colaborador%20Teste` // Example avatar
  };


  if (!isColaboradorAuthenticated) {
    // Handle unauthenticated state, e.g., redirect to login
    // For now, rendering null or a loading state might be suitable if using client-side auth checks
    // If server-side, redirect would happen before component renders
    // redirect('/colaborador/login'); // Adjust login path if needed
    return (
         <div className="flex min-h-screen flex-col items-center justify-center p-4">
             <p>Redirecionando para login...</p>
             {/* Implement redirect logic here */}
         </div>
    );
  }


  const navItems = [
    { href: '/colaborador/dashboard', label: 'Início', icon: Home },
    { href: '/colaborador/historico', label: 'Histórico', icon: CalendarClock },
    { href: '/colaborador/desafios', label: 'Desafios', icon: Target },
    { href: '/colaborador/ranking', label: 'Ranking', icon: Trophy },
    { href: '/colaborador/perfil', label: 'Perfil', icon: User },
  ];

import type { ReactNode } from 'react';
import { Home, CalendarClock, Target, Trophy, User } from 'lucide-react';
import BottomNav from '@/components/colaborador/BottomNav'; // Assuming BottomNav component exists
import { Toaster } from '@/components/ui/toaster';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import Link from 'next/link';


interface ColaboradorLayoutProps {
  children: ReactNode;
}

export default function ColaboradorLayout({ children }: ColaboradorLayoutProps) {
  // TODO: Replace with actual authentication check and user data
  const isColaboradorAuthenticated = true; // Example
   // Placeholder user data - replace with actual data fetching logic
   const colaboradorUser = {
    name: 'Colaborador Teste',
    avatarFallback: 'CT',
    avatarUrl: `https://api.dicebear.com/8.x/initials/svg?seed=Colaborador%20Teste` // Example avatar
  };


  if (!isColaboradorAuthenticated) {
    // Handle unauthenticated state, e.g., redirect to login
    // For now, rendering null or a loading state might be suitable if using client-side auth checks
    // If server-side, redirect would happen before component renders
    // redirect('/colaborador/login'); // Adjust login path if needed
    return (
         <div className="flex min-h-screen flex-col items-center justify-center p-4">
             <p>Redirecionando para login...</p>
             {/* Implement redirect logic here */}
         </div>
    );
  }


  const navItems = [
    { href: '/colaborador/dashboard', label: 'Início', icon: Home },
    { href: '/colaborador/historico', label: 'Histórico', icon: CalendarClock },
    { href: '/colaborador/desafios', label: 'Desafios', icon: Target },
    { href: '/colaborador/ranking', label: 'Ranking', icon: Trophy },
    { href: '/colaborador/perfil', label: 'Perfil', icon: User },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-background">
       {/* Header */}
       <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b bg-card px-4 shadow-sm">
         <div className="flex items-center gap-2">
            {/* Check2B Logo SVG */}
             <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-primary">
                 <path fillRule="evenodd" d="M8.603 3.799A4.49 4.49 0 0 1 12 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 0 1 3.498 1.307 4.491 4.491 0 0 1 1.307 3.497A4.49 4.49 0 0 1 21.75 12c0 1.357-.6 2.573-1.549 3.397a4.49 4.49 0 0 1-1.307 3.497 4.491 4.491 0 0 1-3.497 1.307A4.49 4.49 0 0 1 12 21.75a4.49 4.49 0 0 1-3.397-1.549 4.49 4.49 0 0 1-3.498-1.306 4.491 4.491 0 0 1-1.307-3.498A4.49 4.49 0 0 1 2.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 0 1 1.307-3.497 4.49 4.49 0 0 1 3.497-1.307Zm7.007 6.387a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" clipRule="evenodd" />
             </svg>
            <span className="font-semibold">Check2B</span>
         </div>
         <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
                <AvatarImage src={colaboradorUser.avatarUrl} alt={colaboradorUser.name} />
                <AvatarFallback>{colaboradorUser.avatarFallback}</AvatarFallback>
            </Avatar>
            {/* Logout Button - TODO: Implement actual logout logic */}
            <Button variant="ghost" size="icon" asChild title="Sair">
                <Link href="/logout">
                    <LogOut className="h-5 w-5 text-muted-foreground" />
                 </Link>
            </Button>
         </div>
       </header>

       {/* Main Content Area */}
       <main className="flex-1 overflow-y-auto pb-20 p-4"> {/* Add padding-bottom to avoid overlap with nav */}
        {children}
      </main>

       {/* Bottom Navigation */}
      <BottomNav items={navItems} />

      <Toaster /> {/* Ensure Toaster is included */}
    </div>
  );
>>>>>>> db468e262ea80d11ae78a92ebc0d8d79df5809e8
}
