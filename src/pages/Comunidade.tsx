import { AppLayout } from "@/components/layout/AppLayout";
import { LoadingState, EmptyState, ErrorState } from "@/components/layout/PageState";
import { Card, CardContent } from "@/components/ui/card";
import { Users } from "lucide-react";
import { useState } from "react";

type PageState = "loading" | "empty" | "error" | "success";

const Comunidade = () => {
  const [state] = useState<PageState>("empty");

  return (
    <AppLayout>
      <div className="space-y-6">
        <header>
          <h1 className="text-2xl font-display font-semibold text-foreground">Comunidade</h1>
          <p className="text-muted-foreground mt-1">
            Conecte-se com outras almas em jornada
          </p>
        </header>

        {state === "loading" && <LoadingState message="Carregando comunidade..." />}
        
        {state === "error" && (
          <ErrorState 
            title="Erro ao carregar"
            message="Não foi possível carregar a comunidade. Verifique sua conexão."
            onRetry={() => {}}
          />
        )}

        {state === "empty" && (
          <EmptyState
            icon={<Users className="w-8 h-8 text-muted-foreground" />}
            title="Nenhum compartilhamento ainda"
            description="Seja a primeira pessoa a compartilhar sua experiência com a comunidade."
            action={{
              label: "Compartilhar",
              onClick: () => {},
            }}
          />
        )}

        {state === "success" && (
          <div className="space-y-4">
            <Card>
              <CardContent className="p-6">
                <p className="text-muted-foreground">Conteúdo da comunidade...</p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Comunidade;
