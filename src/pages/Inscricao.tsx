import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Sparkles, Loader2, CreditCard } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

const features = [
  "Acesso a todos os cursos premium",
  "Meditações guiadas diárias",
  "Tônica do dia personalizada",
  "Comunidade exclusiva",
  "Suporte prioritário",
];

const Inscricao = () => {
  const { user } = useAuth();
  const { isPremium, isLoading: subLoading } = useSubscription();
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubscribe = async () => {
    if (!user) return;

    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "mp-create-subscription",
        { body: {} }
      );

      if (error) throw error;

      // Use sandbox_init_point for testing, init_point for production
      const checkoutUrl = data.sandbox_init_point || data.init_point;

      if (checkoutUrl) {
        window.open(checkoutUrl, "_blank");
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (err) {
      console.error("Subscription error:", err);
      toast({
        title: "Erro ao processar",
        description: "Não foi possível iniciar o pagamento. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (subLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (isPremium) {
    return (
      <AppLayout>
        <div className="max-w-md mx-auto py-12">
          <Card>
            <CardContent className="p-8 text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                <Check className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-2xl font-display font-semibold text-foreground">
                Assinatura Ativa
              </h1>
              <p className="text-muted-foreground">
                Você já tem acesso a todo o conteúdo premium. Aproveite!
              </p>
              <Button variant="outline" onClick={() => navigate("/aulas")}>
                Ver Cursos
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-8 max-w-lg mx-auto py-4">
        <header className="text-center">
          <div className="w-14 h-14 rounded-full bg-amethyst-light flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-display font-semibold text-foreground">
            Officina da Alma Premium
          </h1>
          <p className="text-muted-foreground mt-2">
            Desbloqueie todo o conteúdo com a assinatura anual
          </p>
        </header>

        {/* Plan */}
        <Card className="border-2 border-primary">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Assinatura Anual</h3>
                <p className="text-sm text-muted-foreground">Pagamento mensal recorrente</p>
              </div>
              <div className="text-right">
                <span className="text-3xl font-bold text-foreground">R$ 79</span>
                <span className="text-sm text-muted-foreground">/mês</span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
              <CreditCard className="w-4 h-4" />
              <span>Pague com PIX ou Cartão de Crédito</span>
            </div>

            <ul className="space-y-3 mb-6">
              {features.map((feature, index) => (
                <li key={index} className="flex items-center gap-3">
                  <span className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-primary" />
                  </span>
                  <span className="text-sm text-foreground">{feature}</span>
                </li>
              ))}
            </ul>

            <Button
              size="xl"
              className="w-full"
              onClick={handleSubscribe}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                "Assinar Agora"
              )}
            </Button>

            <p className="text-xs text-muted-foreground text-center mt-3">
              Pagamento seguro via Mercado Pago. Cancele quando quiser.
            </p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Inscricao;
