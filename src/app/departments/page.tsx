import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building } from "lucide-react";


export default function DepartmentsPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Gerenciamento de Departamentos
          </CardTitle>
          <CardDescription>Crie, edite ou remova departamentos dentro da organização.</CardDescription>
        </CardHeader>
        <CardContent>
          {/* TODO: Implement Department management UI (list, add, edit, remove) */}
          <p className="text-muted-foreground">Funcionalidade de gerenciamento de departamentos ainda não implementada.</p>
           <Button variant="default" className="mt-4">
                 <Building className="mr-2 h-4 w-4" />
                 Adicionar Departamento
           </Button>
        </CardContent>
      </Card>
    </div>
  );
}
