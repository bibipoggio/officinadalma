import { AppLayout } from "@/components/layout/AppLayout";
import { useSubscription } from "@/hooks/useSubscription";
import { PaywallShell } from "@/components/ui/PaywallShell";
import { PageState } from "@/components/layout/PageState";
import { FileText, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

const PDF_URL =
  "https://jevcgtpkartfvixnauhg.supabase.co/storage/v1/object/public/daily-content/orientacoes%2Forientacoes-acesso-escola.pdf";

export default function Orientacoes() {
  const { isPremium, isLoading } = useSubscription();

  if (isLoading) {
    return (
      <AppLayout>
        <PageState type="loading" message="Carregando..." />
      </AppLayout>
    );
  }

  if (!isPremium) {
    return (
      <AppLayout>
        <PaywallShell
          title="Orientações de Acesso"
          description="Este conteúdo está disponível apenas para assinantes da Officina da Alma."
        />
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
