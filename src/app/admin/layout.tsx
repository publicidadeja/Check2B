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
import { Bell, Gauge, Users, CheckSquare, Settings, LogOut, Building, UserPlus, Trophy, Award } from 'lucide-react'; // Importado Trophy e Award
import Link from 'next/link';

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  // TODO: Replace with actual authentication check and user data
  const isAdminAuthenticated = true; // Example
  const adminUser = { name: 'Admin', avatarFallback: 'AD', avatarUrl: 'https://picsum.photos/32/32' };

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
             <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-primary">
               <path fillRule="evenodd" d="M12.963 2.286a.75.75 0 0 0-1.071-.136 9.742 9.742 0 0 0-3.539 6.177A7.547 7.547 0 0 1 6.648 6.61a.75.75 0 0 0-1.152-.082A9 9 0 1 0 15.68 4.534a7.46 7.46 0 0 1-2.717-2.248ZM15.75 14.25a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" clipRule="evenodd" />
            </svg>
            <span className="text-lg font-semibold">CheckInBonus</span>
          </div>
        </SidebarHeader>
        <SidebarContent className="flex-1 overflow-auto">
          <SidebarMenu>
            <SidebarMenuItem>
              {/* // TODO: Implement dynamic isActive based on pathname */}
              <SidebarMenuButton asChild isActive>
                <Link href="/admin/dashboard">
                   <span className="flex items-center gap-2 w-full">
                     <Gauge />
                     <span>Dashboard</span>
                   </span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
             <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href="/admin/evaluations">
                  <span className="flex items-center gap-2 w-full">
                    <CheckSquare />
                    <span>Avaliações</span>
                  </span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
             <SidebarMenuItem>
              <SidebarMenuButton asChild>
                 <Link href="/admin/ranking">
                    <span className="flex items-center gap-2 w-full">
                      <Trophy />
                      <span>Ranking</span>
                    </span>
                 </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                 <Link href="/admin/rewards">
                   <span className="flex items-center gap-2 w-full">
                     <Award />
                     <span>Prêmios</span>
                   </span>
                 </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                 <Link href="/admin/employees">
                    <span className="flex items-center gap-2 w-full">
                      <Users />
                      <span>Colaboradores</span>
                    </span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
             <SidebarMenuItem>
              <SidebarMenuButton asChild>
                 <Link href="/admin/roles">
                   <span className="flex items-center gap-2 w-full">
                     {/* Using a generic icon for Role */}
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-user-round-cog"><path d="M2 18c.6.5 1.2 1 2.5 1s2.5-.5 3-1c.6-.5 1.2-1 2.5-1s2.5.5 3 1c.6.5 1.2 1 2.5 1s2.5-.5 3-1c.6-.5 1.2-1 2.5-1"/><path d="M10 6c0-1.1.9-2 2-2s2 .9 2 2v1"/><path d="M12 8a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"/><path d="M19.42 15a1.71 1.71 0 0 0-1.22-.53"/><path d="M22 18.5V17.5a2 2 0 0 0-2-2h-1a2 2 0 0 0-2 2v1a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-.5a2 2 0 1 0-4 0v.5"/><circle cx="19" cy="18.5" r=".5"/></svg>
                      <span>Funções</span>
                   </span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href="/admin/tasks">
                   <span className="flex items-center gap-2 w-full">
                    <CheckSquare /> {/* Using CheckSquare as a placeholder, consider a more specific icon */}
                    <span>Tarefas</span>
                   </span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
               <SidebarMenuButton asChild>
                 <Link href="/admin/departments">
                    <span className="flex items-center gap-2 w-full">
                     <Building />
                     <span>Departamentos</span>
                    </span>
                 </Link>
               </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
               <SidebarMenuButton asChild>
                 <Link href="/admin/admins">
                    <span className="flex items-center gap-2 w-full">
                     <UserPlus />
                     <span>Admins</span>
                    </span>
                 </Link>
               </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href="/admin/settings">
                   <span className="flex items-center gap-2 w-full">
                     <Settings />
                     <span>Configurações</span>
                   </span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
           <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href="/logout"> {/* TODO: Implementar logout */}
                  <span className="flex items-center gap-2 w-full">
                   <LogOut />
                   <span>Logout</span>
                  </span>
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