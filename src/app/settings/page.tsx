import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

// TODO: Replace with actual settings state management and API calls

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Configurações Gerais</CardTitle>
          <CardDescription>Ajuste as configurações globais do sistema CheckUp.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="bonusValue">Valor Base da Bonificação (R$)</Label>
            <Input id="bonusValue" type="number" placeholder="Ex: 100.00" defaultValue="100.00" />
            <p className="text-sm text-muted-foreground">
              Valor pago por dia sem nenhuma nota zero no mês.
            </p>
          </div>
          <Separator />
          <div className="space-y-2">
            <Label htmlFor="zeroLimit">Limite de Zeros para Perder Bonificação</Label>
            <Input id="zeroLimit" type="number" placeholder="Ex: 3" defaultValue="3" />
             <p className="text-sm text-muted-foreground">
               Número máximo de notas zero permitidas no mês para receber a bonificação.
            </p>
          </div>
           <Separator />
           {/* Add more general settings here */}
           <Button>Salvar Configurações</Button>
        </CardContent>
      </Card>

       <Card>
        <CardHeader>
          <CardTitle>Gerenciamento de Administradores</CardTitle>
          <CardDescription>Adicione ou remova outros usuários administrativos.</CardDescription>
        </CardHeader>
        <CardContent>
          {/* TODO: Implement admin user management UI (list, add, remove) */}
          <p className="text-muted-foreground">Funcionalidade de gerenciamento de administradores ainda não implementada.</p>
           <Button variant="outline" className="mt-4">Adicionar Administrador</Button>
        </CardContent>
      </Card>

       <Card>
        <CardHeader>
          <CardTitle>Backup e Restauração</CardTitle>
          <CardDescription>Gerencie backups dos dados do sistema.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* TODO: Implement backup/restore functionality */}
           <p className="text-muted-foreground">Último backup: [Data/Hora]</p>
           <div className="flex gap-4">
            <Button variant="outline">Criar Backup Agora</Button>
            <Button variant="secondary">Restaurar Backup</Button>
           </div>
        </CardContent>
      </Card>

    </div>
  );
}
