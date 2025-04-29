'use client';

import * as React from 'react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from "@/hooks/use-toast";
import { DollarSign, Percent, AlertTriangle, Save } from 'lucide-react';

// Mock initial settings data - Replace with actual data fetching/saving
const initialSettings = {
  bonusValuePerPoint: 1.50, // Example: R$1,50 per point (assuming 10 points max per day)
  maxZerosThreshold: 5,     // Example: Max 5 zeros allowed per month before losing bonus
  enableAutoReports: true,
  notificationFrequency: 'daily', // Example setting
};

export default function SettingsPage() {
  const [settings, setSettings] = useState(initialSettings);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = event.target;
    setSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : type === 'number' ? parseFloat(value) || 0 : value,
    }));
  };

   const handleSwitchChange = (checked: boolean, name: string) => {
    setSettings(prev => ({
      ...prev,
      [name]: checked,
    }));
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    console.log("Saving settings:", settings);
    // TODO: Implement API call to save settings
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
       toast({
        title: "Configurações Salvas",
        description: "Os parâmetros do sistema foram atualizados com sucesso.",
       });
    } catch (error) {
      console.error("Failed to save settings:", error);
       toast({
        title: "Erro ao Salvar",
        description: "Não foi possível salvar as configurações. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Parâmetros de Bonificação</CardTitle>
          <CardDescription>Defina os valores e limites para o cálculo de bônus mensal.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="bonusValuePerPoint" className="flex items-center gap-1">
                <DollarSign className="h-4 w-4 text-muted-foreground"/> Valor do Bônus por Ponto (%)
            </Label>
            <Input
              id="bonusValuePerPoint"
              name="bonusValuePerPoint"
              type="number"
              step="0.01"
              value={settings.bonusValuePerPoint}
              onChange={handleInputChange}
              placeholder="Ex: 1.50"
            />
             <p className="text-xs text-muted-foreground">Valor em R$ ganho por cada ponto diário (base 10). Ex: 1.50 significa R$1,50 por cada 10 pontos.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="maxZerosThreshold" className="flex items-center gap-1">
                 <AlertTriangle className="h-4 w-4 text-muted-foreground"/> Limite Máximo de Zeros Mensal
            </Label>
            <Input
              id="maxZerosThreshold"
              name="maxZerosThreshold"
              type="number"
              step="1"
              value={settings.maxZerosThreshold}
              onChange={handleInputChange}
              placeholder="Ex: 5"
            />
             <p className="text-xs text-muted-foreground">Número máximo de notas '0' permitidas no mês para ser elegível ao bônus.</p>
          </div>
        </CardContent>
         <CardFooter>
          <Button onClick={handleSaveSettings} disabled={isSaving} className="ml-auto gap-1">
             <Save className="h-4 w-4" />
            {isSaving ? "Salvando..." : "Salvar Bonificação"}
          </Button>
        </CardFooter>
      </Card>

       <Card>
        <CardHeader>
          <CardTitle>Configurações Gerais</CardTitle>
          <CardDescription>Ajustes gerais do sistema e notificações.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
           <div className="flex items-center justify-between space-x-2">
                <Label htmlFor="enableAutoReports" className="flex flex-col space-y-1">
                    <span>Relatórios Automáticos</span>
                    <span className="font-normal leading-snug text-muted-foreground">
                    Ativar envio automático de relatórios periódicos por email.
                    </span>
                </Label>
                <Switch
                    id="enableAutoReports"
                    name="enableAutoReports"
                    checked={settings.enableAutoReports}
                    onCheckedChange={(checked) => handleSwitchChange(checked, 'enableAutoReports')}
                />
          </div>
           <div className="space-y-2">
            <Label htmlFor="notificationFrequency">Frequência de Notificações (Admin)</Label>
            {/* Replace with Select component if more options are needed */}
             <Input
              id="notificationFrequency"
              name="notificationFrequency"
              value={settings.notificationFrequency}
              onChange={handleInputChange}
              placeholder="Ex: daily, weekly"
            />
              <p className="text-xs text-muted-foreground">Configure a frequência dos resumos e alertas para administradores.</p>
          </div>
           {/* Add more general settings as needed */}
        </CardContent>
         <CardFooter>
          <Button onClick={handleSaveSettings} disabled={isSaving} className="ml-auto gap-1">
             <Save className="h-4 w-4" />
            {isSaving ? "Salvando..." : "Salvar Gerais"}
          </Button>
        </CardFooter>
      </Card>

        {/* Add more cards for other settings categories like Backup/Restore, User Management settings etc. */}

    </div>
  );
}
