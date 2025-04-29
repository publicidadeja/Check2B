
'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from "@/hooks/use-toast";
import { DollarSign, AlertTriangle, Save, BellRing, Loader2, Settings as SettingsIcon } from 'lucide-react';
import type { AppSettings } from '@/services/settings';
import { getSettings, saveSettings } from '@/services/settings';

// Default state matching the interface
const defaultSettings: AppSettings = {
  bonusValuePerPoint: 0,
  maxZerosThreshold: 0,
  enableAutoReports: false,
  notificationFrequency: 'daily',
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [initialSettings, setInitialSettings] = useState<AppSettings>(defaultSettings); // To track changes
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

   // Fetch settings on component mount
   useEffect(() => {
    async function loadSettings() {
        setIsLoading(true);
        try {
            const fetchedSettings = await getSettings();
            setSettings(fetchedSettings);
            setInitialSettings(fetchedSettings); // Store initial state
        } catch (error) {
            console.error("Failed to load settings:", error);
            toast({
                title: "Erro ao Carregar",
                description: "Não foi possível carregar as configurações.",
                variant: "destructive",
            });
            // Keep default settings on error? Or show an error state?
        } finally {
            setIsLoading(false);
        }
    }
    loadSettings();
  }, [toast]);


  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = event.target;

    // Handle number inputs specifically
    if (type === 'number') {
       // Allow empty input or valid numbers, handle potential NaN/negative on save/blur
       const numValue = value === '' ? '' : Number(value);
       setSettings(prev => ({ ...prev, [name]: numValue }));
    } else {
       setSettings(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSelectChange = (value: string, name: keyof AppSettings) => {
     // Ensure the value matches the expected type for notificationFrequency
     if (name === 'notificationFrequency' && ['daily', 'weekly', 'monthly', 'never'].includes(value)) {
        setSettings(prev => ({ ...prev, [name]: value as AppSettings['notificationFrequency'] }));
     } else {
          // Handle other potential select changes if added
     }
  };


   const handleSwitchChange = (checked: boolean, name: keyof AppSettings) => {
    if (name === 'enableAutoReports' && typeof checked === 'boolean') {
         setSettings(prev => ({ ...prev, [name]: checked }));
    }
     // Handle other potential switch changes
  };

  const handleSaveSettings = async () => {
    // Validate numeric inputs before saving
    if (settings.bonusValuePerPoint === '' || isNaN(Number(settings.bonusValuePerPoint)) || Number(settings.bonusValuePerPoint) < 0) {
        toast({ title: "Erro de Validação", description: "Valor do Bônus por Ponto deve ser um número não negativo.", variant: "destructive" });
        return;
    }
    if (settings.maxZerosThreshold === '' || !Number.isInteger(Number(settings.maxZerosThreshold)) || Number(settings.maxZerosThreshold) < 0) {
        toast({ title: "Erro de Validação", description: "Limite Máximo de Zeros deve ser um número inteiro não negativo.", variant: "destructive" });
        return;
    }

    // Create object with only changed settings
     const changes: Partial<AppSettings> = {};
    (Object.keys(settings) as Array<keyof AppSettings>).forEach(key => {
        if (settings[key] !== initialSettings[key]) {
            // Convert potentially empty string numbers back to numbers for saving
            if ((key === 'bonusValuePerPoint' || key === 'maxZerosThreshold') && settings[key] === '') {
                 changes[key] = 0 as any; // Assuming 0 is the default if empty
            } else {
                 changes[key] = settings[key] as any;
            }
        }
    });


    if (Object.keys(changes).length === 0) {
        toast({ title: "Nenhuma Alteração", description: "Nenhuma configuração foi modificada." });
        return;
    }

    setIsSaving(true);
    console.log("Saving settings changes:", changes);
    try {
      const updatedSettings = await saveSettings(changes);
      setSettings(updatedSettings); // Update local state with response from server
      setInitialSettings(updatedSettings); // Update initial state to reflect saved changes
       toast({
        title: "Configurações Salvas",
        description: "Os parâmetros do sistema foram atualizados com sucesso.",
       });
    } catch (error: any) {
      console.error("Failed to save settings:", error);
       toast({
        title: "Erro ao Salvar",
        description: error.message || "Não foi possível salvar as configurações.",
        variant: "destructive",
      });
       // Optionally revert changes: setSettings(initialSettings);
    } finally {
      setIsSaving(false);
    }
  };

   // Check if settings have changed from initial load
   const hasChanges = JSON.stringify(settings) !== JSON.stringify(initialSettings);


   if (isLoading) {
      return (
         <div className="flex justify-center items-center p-10">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Carregando configurações...</span>
         </div>
      );
   }


  return (
     <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5"/> Parâmetros de Bonificação</CardTitle>
          <CardDescription>Defina os valores e limites para o cálculo de bônus mensal dos colaboradores.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
             <div className="space-y-2">
                <Label htmlFor="bonusValuePerPoint">Valor por Ponto (R$)</Label>
                <Input
                id="bonusValuePerPoint"
                name="bonusValuePerPoint"
                type="number"
                step="0.01"
                min="0"
                value={settings.bonusValuePerPoint}
                onChange={handleInputChange}
                placeholder="Ex: 1.50"
                disabled={isSaving}
                />
                <p className="text-xs text-muted-foreground">Valor em R$ ganho por cada ponto diário (máximo 10). Ex: 1.50 = R$1,50 se o score for 10/10.</p>
            </div>
             <div className="space-y-2">
                <Label htmlFor="maxZerosThreshold">Limite Máx. de Zeros / Mês</Label>
                <Input
                id="maxZerosThreshold"
                name="maxZerosThreshold"
                type="number"
                step="1"
                min="0"
                value={settings.maxZerosThreshold}
                onChange={handleInputChange}
                placeholder="Ex: 5"
                disabled={isSaving}
                />
                <p className="text-xs text-muted-foreground">Qtd. máxima de notas '0' no mês para ter direito ao bônus total.</p>
             </div>
          </div>

        </CardContent>
         {/* Footer removed, save button at the bottom */}
      </Card>

       <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><SettingsIcon className="h-5 w-5"/> Configurações Gerais</CardTitle>
          <CardDescription>Ajustes gerais do sistema e notificações administrativas.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
           <div className="flex items-center justify-between space-x-4 border p-4 rounded-md">
                <Label htmlFor="enableAutoReports" className="flex flex-col space-y-1">
                    <span>Relatórios Automáticos por Email</span>
                    <span className="font-normal leading-snug text-muted-foreground text-xs">
                    Ativar envio periódico de resumos de desempenho para administradores.
                    </span>
                </Label>
                <Switch
                    id="enableAutoReports"
                    name="enableAutoReports" // Ensure name matches state key
                    checked={settings.enableAutoReports}
                    onCheckedChange={(checked) => handleSwitchChange(checked, 'enableAutoReports')}
                    disabled={isSaving}
                />
          </div>
           <div className="space-y-2">
            <Label htmlFor="notificationFrequency" className="flex items-center gap-1">
                <BellRing className="h-4 w-4 text-muted-foreground"/> Frequência de Notificações (Admin)
            </Label>
            <Select
                name="notificationFrequency"
                value={settings.notificationFrequency}
                onValueChange={(value) => handleSelectChange(value, 'notificationFrequency')}
                disabled={isSaving}
            >
              <SelectTrigger className="w-full sm:w-[250px]">
                <SelectValue placeholder="Selecione a frequência" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Diariamente</SelectItem>
                <SelectItem value="weekly">Semanalmente</SelectItem>
                <SelectItem value="monthly">Mensalmente</SelectItem>
                <SelectItem value="never">Nunca</SelectItem>
              </SelectContent>
            </Select>
              <p className="text-xs text-muted-foreground">Define com que frequência os administradores recebem emails de resumo/alerta.</p>
          </div>
           {/* Add more general settings as needed */}
           {/* Example:
           <div className="space-y-2">
              <Label htmlFor="companyName">Nome da Empresa</Label>
              <Input id="companyName" name="companyName" value={settings.companyName || ''} onChange={handleInputChange} disabled={isSaving} />
           </div>
            */}
        </CardContent>
         {/* Footer removed, save button at the bottom */}
      </Card>

        {/* Centralized Save Button */}
        <div className="flex justify-end mt-6">
             <Button onClick={handleSaveSettings} disabled={isSaving || !hasChanges} size="lg">
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? "Salvando..." : "Salvar Alterações"}
                {isSaving && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
            </Button>
        </div>

    </div>
  );
}
