
import type { ReactNode } from 'react';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarTrigger,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Bell, Gauge, Users, Settings, LogOut, Building, UserPlus, Trophy, Award, Target, UserRoundCog, ListTodo, SquareCheckBig } from 'lucide-react'; // Added SquareCheckBig
import Link from 'next/link';

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  // TODO: Replace with actual authentication check and user data
  const isAdminAuthenticated = true; // Example
  const adminUser = { name: 'Admin', avatarFallback: 'AD', avatarUrl: 'https://picsum.photos/seed/adminavatar/32/32' };

  if (!isAdminAuthenticated) {
    // Handle unauthenticated state, e.g., redirect to login
    // For now, rendering null or a loading state might be suitable if using client-side auth checks
    // If server-side, redirect would happen before component renders
    // redirect('/login');
    return null; // Or a loading indicator
  }

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2 p-2">
            {/* Check2B Logo SVG */}
             <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-primary">
                 <path fillRule="evenodd" d="M8.603 3.799A4.49 4.49 0 0 1 12 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 0 1 3.498 1.307 4.491 4.491 0 0 1 1.307 3.497A4.49 4.49 0 0 1 21.75 12c0 1.357-.6 2.573-1.549 3.397a4.49 4.49 0 0 1-1.307 3.497 4.491 4.491 0 0 1-3.497 1.307A4.49 4.49 0 0 1 12 21.75a4.49 4.49 0 0 1-3.397-1.549 4.49 4.49 0 0 1-3.498-1.306 4.491 4.491 0 0 1-1.307-3.498A4.49 4.49 0 0 1 2.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 0 1 1.307-3.497 4.49 4.49 0 0 1 3.497-1.307Zm7.007 6.387a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" clipRule="evenodd" />
             </svg>
            <span className="text-lg font-semibold">Check2B</span>
          </div>
        </SidebarHeader>
        <SidebarContent className="flex-1 overflow-auto">
          <SidebarMenu>
            {/* Dashboard */}
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={true}>
                <Link href="/admin/dashboard" className="flex items-center gap-2 w-full">
                  <Gauge />
                  <span>Dashboard</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

             {/* Avaliações */}
             <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href="/admin/evaluations" className="flex items-center gap-2 w-full">
                  <SquareCheckBig />
                  <span>Avaliações</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

             {/* Ranking */}
             <SidebarMenuItem>
              <SidebarMenuButton asChild>
                 <Link href="/admin/ranking" className="flex items-center gap-2 w-full">
                   <Trophy />
                   <span>Ranking</span>
                 </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

             {/* Desafios */}
             <SidebarMenuItem>
              <SidebarMenuButton asChild>
                 <Link href="/admin/challenges" className="flex items-center gap-2 w-full">
                   <Target />
                   <span>Desafios</span>
                 </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            {/* Prêmios */}
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                 <Link href="/admin/rewards" className="flex items-center gap-2 w-full">
                   <Award />
                   <span>Prêmios</span>
                 </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            {/* Colaboradores */}
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                 <Link href="/admin/employees" className="flex items-center gap-2 w-full">
                   <Users />
                   <span>Colaboradores</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

             {/* Funções */}
             <SidebarMenuItem>
              <SidebarMenuButton asChild>
                 <Link href="/admin/roles" className="flex items-center gap-2 w-full">
                   <UserRoundCog />
                   <span>Funções</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            {/* Tarefas */}
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href="/admin/tasks" className="flex items-center gap-2 w-full">
                 <ListTodo />
                  <span>Tarefas</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            {/* Departamentos */}
            <SidebarMenuItem>
               <SidebarMenuButton asChild>
                 <Link href="/admin/departments" className="flex items-center gap-2 w-full">
                  <Building />
                  <span>Departamentos</span>
                 </Link>
               </SidebarMenuButton>
            </SidebarMenuItem>

            {/* Admins */}
            <SidebarMenuItem>
               <SidebarMenuButton asChild>
                 <Link href="/admin/admins" className="flex items-center gap-2 w-full">
                  <UserPlus />
                  <span>Admins</span>
                 </Link>
               </SidebarMenuButton>
            </SidebarMenuItem>

            {/* Configurações */}
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href="/admin/settings" className="flex items-center gap-2 w-full">
                  <Settings />
                  <span>Configurações</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
           <SidebarMenu>
            {/* Logout */}
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href="/logout" className="flex items-center gap-2 w-full"> {/* TODO: Implementar logout real */}
                  <LogOut />
                  <span>Logout</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
           </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-14 items-center justify-between border-b bg-background px-4 lg:px-6">
           <SidebarTrigger className="md:hidden" /> {/* Gatilho Mobile */}
           <div className="flex items-center gap-4 ml-auto"> {/* Alinhar à direita */}
            {/* TODO: Implement Notification functionality */}
            <Button variant="ghost" size="icon" className="rounded-full">
              <Bell className="h-5 w-5" />
              <span className="sr-only">Ativar notificações</span>
            </Button>
            <Avatar className="h-8 w-8">
              <AvatarImage src={adminUser.avatarUrl} alt={`@${adminUser.name}`} />
              <AvatarFallback>{adminUser.avatarFallback}</AvatarFallback>
            </Avatar>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
