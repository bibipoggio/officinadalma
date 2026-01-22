import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/Chip";
import { Check, Sparkles, Lock } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

type Plan = "mensal" | "trimestral" | "semestral" | "anual";

const plans: { id: Plan; name: string; price: string; period: string; popular?: boolean; pix?: boolean }[] = [
  { id: "mensal", name: "Mensal", price: "R$ 49,90", period: "/mês" },
  { id: "trimestral", name: "Trimestral", price: "R$ 39,90", period: "/mês", popular: true },
  { id: "semestral", name: "Semestral", price: "R$ 34,90", period: "/mês" },
  { id: "anual", name: "Anual", price: "R$ 29,90", period: "/mês", pix: true },
];

const features = [
  "Acesso a todas as meditações",
  "Tônica do dia personalizada",
  "Cursos premium exclusivos",
  "Comunidade privada",
  "Suporte prioritário",
  "7 dias de teste grátis",
];

const Assinar = () => {
  const [selectedPlan, setSelectedPlan] = useState<Plan>("trimestral");
  const { hasAdminAccess } = useAuth();

  const handleSubscribe = () => {
    // Navigate to Mercado Pago checkout (placeholder)
    console.log("Subscribe to:", selectedPlan);
  };

  // Show locked state for non-admin users
  if (!hasAdminAccess) {
    return (
      <AppLayout>
        <div className="max-w-md mx-auto py-12">
          <Card className="border-dashed border-2 border-muted-foreground/30">
            <CardContent className="p-8 text-center space-y-6">
              <div className="w-20 h-20 mx-auto rounded-full bg-muted flex items-center justify-center">
                <Lock className="w-10 h-10 text-muted-foreground" />
              </div>
              
              <div className="space-y-2">
                <h1 className="text-2xl font-display font-semibold text-foreground">
                  Em Breve
                </h1>
                <p className="text-muted-foreground">
                  A área de assinaturas estará disponível em breve. 
                  Continue aproveitando o conteúdo gratuito!
                </p>
              </div>

              <div className="pt-4 border-t border-border">
                <p className="text-sm text-muted-foreground">
                  Estamos preparando algo especial para você. Fique atento às novidades!
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-8 max-w-lg mx-auto">
        <header className="text-center">
          <div className="w-14 h-14 rounded-full bg-amethyst-light flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-display font-semibold text-foreground">
            Desbloqueie sua Jornada
          </h1>
          <p className="text-muted-foreground mt-2">
            Acesse todo o conteúdo premium com 7 dias grátis
          </p>
          <Chip variant="muted" size="sm" className="mt-2">
            Visível apenas para admins
          </Chip>
        </header>

        {/* Plans */}
        <div className="grid gap-3">
          {plans.map((plan) => (
            <button
              key={plan.id}
              onClick={() => setSelectedPlan(plan.id)}
              className={`relative p-4 rounded-lg border-2 text-left transition-all ${
                selectedPlan === plan.id
                  ? "border-primary bg-amethyst-light/50"
                  : "border-border hover:border-primary/30"
              }`}
            >
              {plan.popular && (
                <Chip
                  variant="primary"
                  size="sm"
                  className="absolute -top-2.5 right-4"
                >
                  Mais popular
                </Chip>
              )}
              
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-foreground">{plan.name}</h3>
                  {plan.pix && (
                    <span className="text-xs text-muted-foreground">Aceita PIX</span>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-xl font-semibold text-foreground">{plan.price}</span>
                  <span className="text-sm text-muted-foreground">{plan.period}</span>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Features */}
        <Card>
          <CardContent className="p-5">
            <h3 className="font-display font-semibold text-foreground mb-4">
              O que está incluso
            </h3>
            <ul className="space-y-3">
              {features.map((feature, index) => (
                <li key={index} className="flex items-center gap-3">
                  <span className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-primary" />
                  </span>
                  <span className="text-sm text-foreground">{feature}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* CTA */}
        <div className="space-y-3">
          <Button size="xl" className="w-full" onClick={handleSubscribe}>
            Começar Teste Grátis
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            Cancele quando quiser. Sem compromisso.
          </p>
        </div>
      </div>
    </AppLayout>
  );
};

export default Assinar;
