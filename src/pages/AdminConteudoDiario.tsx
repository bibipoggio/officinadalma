import { AppLayout } from "@/components/layout/AppLayout";
import { LoadingState, EmptyState, ErrorState } from "@/components/layout/PageState";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Plus, Calendar, Edit, Trash2 } from "lucide-react";

type PageState = "loading" | "empty" | "error" | "success";

const mockContent = [
  {
    id: "1",
    date: "2024-01-15",
    title: "Aterramento e Presença",
    status: "published",
  },
  {
    id: "2",
    date: "2024-01-16",
    title: "Expansão da Consciência",
    status: "draft",
  },
];

const AdminConteudoDiario = () => {
  const [state] = useState<PageState>("success");

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("pt-BR");
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-semibold text-foreground">
              Conteúdo Diário
            </h1>
            <p className="text-muted-foreground mt-1">
              Gerencie as tônicas e meditações do dia
            </p>
          </div>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Novo Conteúdo
          </Button>
        </header>

        {state === "loading" && <LoadingState message="Carregando conteúdos..." />}
        
        {state === "error" && (
          <ErrorState 
            title="Erro ao carregar"
            message="Não foi possível carregar os conteúdos."
            onRetry={() => {}}
          />
        )}

        {state === "empty" && (
          <EmptyState
            icon={<Calendar className="w-8 h-8 text-muted-foreground" />}
            title="Nenhum conteúdo criado"
            description="Crie o primeiro conteúdo diário para seus usuários."
            action={{
              label: "Criar Conteúdo",
              onClick: () => {},
            }}
          />
        )}

        {state === "success" && (
          <div className="space-y-3">
            {mockContent.map((item) => (
              <Card key={item.id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-amethyst-light flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground">{item.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(item.date)} • {item.status === "published" ? "Publicado" : "Rascunho"}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon">
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default AdminConteudoDiario;
