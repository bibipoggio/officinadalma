import { AppLayout } from "@/components/layout/AppLayout";
import { useSubscription } from "@/hooks/useSubscription";
import { LoadingState } from "@/components/layout/PageState";
import { FileText, Download, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const PDF_URL =
  "https://jevcgtpkartfvixnauhg.supabase.co/storage/v1/object/public/daily-content/orientacoes%2Forientacoes-acesso-escola.pdf";

export default function Orientacoes() {
  const { isPremium, isLoading } = useSubscription();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <AppLayout>
        <LoadingState message="Carregando..." />
      </AppLayout>
    );
  }

  if (!isPremium) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Lock className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">
            Orientações de Acesso
          </h2>
          <p className="text-muted-foreground mb-6 max-w-md">
            Este conteúdo está disponível apenas para assinantes da Officina da Alma.
          </p>
          <Button onClick={() => navigate("/inscricao")}>Assinar agora</Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">
                Orientações de Acesso à Escola
              </h1>
              <p className="text-sm text-muted-foreground">
                Login, dashboard e regras da plataforma
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(PDF_URL, "_blank")}
          >
            <Download className="w-4 h-4 mr-2" />
            Baixar PDF
          </Button>
        </div>

        <div className="rounded-xl border overflow-hidden bg-card" style={{ height: "80vh" }}>
          <iframe
            src={`${PDF_URL}#toolbar=1&navpanes=0`}
            title="Orientações de Acesso à Escola"
            className="w-full h-full"
            style={{ border: "none" }}
          />
        </div>
      </div>
    </AppLayout>
  );
}
