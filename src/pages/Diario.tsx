import { AppLayout } from "@/components/layout/AppLayout";
import { LoadingState, EmptyState, ErrorState } from "@/components/layout/PageState";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen } from "lucide-react";
import { useState } from "react";

type PageState = "loading" | "empty" | "error" | "success";

const Diario = () => {
  const [state] = useState<PageState>("empty");

  return (
    <AppLayout>
      <div className="space-y-6">
        <header>
          <h1 className="text-2xl font-display font-semibold text-foreground">Meu Diário</h1>
          <p className="text-muted-foreground mt-1">
            Seus registros pessoais de check-in e reflexões
          </p>
        </header>

        {state === "loading" && <LoadingState message="Carregando seu diário..." />}
        
        {state === "error" && (
          <ErrorState 
            title="Erro ao carregar"
            message="Não foi possível carregar seu diário. Tente novamente."
            onRetry={() => {}}
          />
        )}

        {state === "empty" && (
          <EmptyState
            icon={<BookOpen className="w-8 h-8 text-muted-foreground" />}
            title="Seu diário está vazio"
            description="Faça seu primeiro check-in para começar a registrar sua jornada."
            action={{
              label: "Fazer Check-in",
              onClick: () => {},
            }}
          />
        )}

        {state === "success" && (
          <div className="space-y-4">
            <Card>
              <CardContent className="p-6">
                <p className="text-muted-foreground">Entradas do diário...</p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Diario;
