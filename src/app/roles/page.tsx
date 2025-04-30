import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Briefcase } from "lucide-react";

export default function RolesPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
             <Briefcase className="h-5 w-5" />
             Gerenciamento de Funções
          </CardTitle>
          <CardDescription>Crie, edite ou remova funções (cargos) dentro da organização.</CardDescription>
        </CardHeader>
        <CardContent>
          {/* TODO: Implement Role management UI (list, add, edit, remove) */}
          <p className="text-muted-foreground">Funcionalidade de gerenciamento de funções ainda não implementada.</p>
           <Button variant="default" className="mt-4">
                <Briefcase className="mr-2 h-4 w-4" />
                Adicionar Função
            </Button>
        </CardContent>
      </Card>
    </div>
  );
}
