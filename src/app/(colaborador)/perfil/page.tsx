
'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { User, Mail, Building, Briefcase, CalendarDays, Trophy, Award, Settings, Bell, ShieldCheck, Lock } from 'lucide-react';
import Link from 'next/link';

// Mock User Data Interface
interface MockColaboradorProfile {
    id: string;
    name: string;
    email: string;
    department: string;
    role: string;
    admissionDate: string; // YYYY-MM-DD
    avatarUrl: string;
    avatarFallback: string;
    currentRank?: number;
    averageScore?: number; // e.g., 92
    badges: { id: string; name: string; icon: LucideIcon }[]; // Example badges
    achievements: string[]; // Example achievements text
}

// Mock Data (Replace with actual data fetching)
const mockProfile: MockColaboradorProfile = {
    id: 'emp123',
    name: 'Colaborador Teste',
    email: 'colaborador.teste@check2b.com',
    department: 'Engenharia',
    role: 'Desenvolvedor Frontend',
    admissionDate: '2023-05-15',
    avatarUrl: `https://api.dicebear.com/8.x/initials/svg?seed=Colaborador%20Teste`,
    avatarFallback: 'CT',
    currentRank: 5,
    averageScore: 92,
    badges: [
        { id: 'b1', name: 'Mestre da Qualidade', icon: ShieldCheck },
        { id: 'b2', name: 'Rei da Pontualidade', icon: Clock },
        { id: 'b3', name: 'Desafio Semanal Pro', icon: Target },
    ],
    achievements: [
        'Top 3 no Ranking de Julho/2024',
        'Completou 10 desafios consecutivos',
        'Recebeu prêmio "Destaque Inovação" em Junho/2024',
    ],
};

export default function PerfilPage() {
    const [isLoading, setIsLoading] = useState(true);
    const [profile, setProfile] = useState<MockColaboradorProfile | null>(null);

    // Simulate data fetching
    useEffect(() => {
        const timer = setTimeout(() => {
            setProfile(mockProfile);
            setIsLoading(false);
        }, 1200); // Simulate 1.2 second fetch
        return () => clearTimeout(timer);
    }, []);

    if (isLoading) {
        return (
            <div className="space-y-6">
                <Card>
                    <CardHeader className="items-center text-center">
                        <Skeleton className="h-24 w-24 rounded-full mb-2" />
                        <Skeleton className="h-6 w-48 mb-1" />
                        <Skeleton className="h-4 w-32" />
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Skeleton className="h-8 w-full" />
                        <Skeleton className="h-8 w-full" />
                        <Skeleton className="h-8 w-full" />
                        <Skeleton className="h-8 w-full" />
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader><Skeleton className="h-6 w-32" /></CardHeader>
                    <CardContent className="space-y-3">
                        <Skeleton className="h-10 w-full" />
                         <Skeleton className="h-10 w-full" />
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader><Skeleton className="h-6 w-32" /></CardHeader>
                    <CardContent className="space-y-3">
                         <Skeleton className="h-6 w-full" />
                        <Skeleton className="h-6 w-full" />
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!profile) {
        return <p className="text-center text-muted-foreground">Não foi possível carregar os dados do perfil.</p>;
    }

    return (
        <div className="space-y-6">
            {/* Profile Header */}
            <Card>
                <CardHeader className="items-center text-center">
                    <Avatar className="h-24 w-24 mb-2 border-2 border-primary">
                        <AvatarImage src={profile.avatarUrl} alt={profile.name} />
                        <AvatarFallback className="text-3xl">{profile.avatarFallback}</AvatarFallback>
                    </Avatar>
                    <CardTitle className="text-2xl">{profile.name}</CardTitle>
                    <CardDescription>{profile.role}</CardDescription>
                    <div className="flex gap-2 mt-2">
                        {profile.currentRank && <Badge variant="outline"><Trophy className="h-3 w-3 mr-1" /> Rank: {profile.currentRank}º</Badge>}
                        {profile.averageScore && <Badge variant="outline"><CheckCircle className="h-3 w-3 mr-1"/> Média: {profile.averageScore}%</Badge>}
                    </div>
                </CardHeader>
                <Separator />
                <CardContent className="pt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                     <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground"/>
                        <span>{profile.email}</span>
                     </div>
                     <div className="flex items-center gap-2">
                         <Building className="h-4 w-4 text-muted-foreground"/>
                         <span>{profile.department}</span>
                     </div>
                     <div className="flex items-center gap-2">
                         <Briefcase className="h-4 w-4 text-muted-foreground"/>
                         <span>{profile.role}</span> {/* Redundant? Maybe show manager */}
                     </div>
                      <div className="flex items-center gap-2">
                         <CalendarDays className="h-4 w-4 text-muted-foreground"/>
                         <span>Admissão: {format(parseISO(profile.admissionDate + 'T00:00:00'), 'dd/MM/yyyy')}</span>
                     </div>
                </CardContent>
                 {/* Footer can contain edit button if functionality is added */}
                 {/* <CardFooter className="justify-end">
                     <Button variant="outline" size="sm">Editar Perfil</Button>
                 </CardFooter> */}
            </Card>

            {/* Badges/Conquistas */}
            <Card>
                 <CardHeader>
                     <CardTitle className="text-lg flex items-center gap-2"><Award className="h-5 w-5"/> Emblemas e Conquistas</CardTitle>
                 </CardHeader>
                 <CardContent className="space-y-4">
                     {profile.badges.length > 0 && (
                         <div>
                             <h4 className="font-semibold mb-2 text-sm">Emblemas:</h4>
                             <div className="flex flex-wrap gap-2">
                                 {profile.badges.map(badge => (
                                     <Badge key={badge.id} variant="secondary" className="text-xs py-1 px-2">
                                         <badge.icon className="h-3 w-3 mr-1"/> {badge.name}
                                     </Badge>
                                 ))}
                             </div>
                         </div>
                     )}
                      {profile.achievements.length > 0 && (
                         <div>
                              <h4 className="font-semibold mb-2 text-sm">Conquistas Recentes:</h4>
                              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                                 {profile.achievements.map((ach, index) => (
                                    <li key={index}>{ach}</li>
                                 ))}
                             </ul>
                         </div>
                     )}
                     {(profile.badges.length === 0 && profile.achievements.length === 0) && (
                          <p className="text-sm text-muted-foreground">Nenhum emblema ou conquista ainda.</p>
                     )}
                 </CardContent>
            </Card>

            {/* Configurações */}
             <Card>
                 <CardHeader>
                     <CardTitle className="text-lg flex items-center gap-2"><Settings className="h-5 w-5"/> Configurações</CardTitle>
                 </CardHeader>
                 <CardContent className="space-y-2">
                    <Button variant="outline" className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground hover:bg-muted/50">
                         <Bell className="h-4 w-4"/> Gerenciar Notificações
                    </Button>
                     <Button variant="outline" className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground hover:bg-muted/50">
                         <Lock className="h-4 w-4"/> Alterar Senha
                     </Button>
                     {/* Add more settings options here */}
                 </CardContent>
            </Card>

        </div>
    );
}
