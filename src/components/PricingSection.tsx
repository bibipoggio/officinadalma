import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Check, Star } from "lucide-react";

const plans = [
  {
    name: "Mensal",
    price: "R$ 49",
    period: "/mês",
    description: "Acesso completo, cancele quando quiser.",
    features: [
      "Todos os cursos disponíveis",
      "Check-in diário ilimitado",
      "Comunidade exclusiva",
      "Novos conteúdos semanais",
    ],
    popular: false,
    badge: null,
  },
  {
    name: "Semestral",
    price: "R$ 39",
    period: "/mês",
    description: "6 meses de transformação com economia.",
    features: [
      "Tudo do plano mensal",
      "Economia de 20%",
      "Bônus: meditações exclusivas",
      "Suporte prioritário",
    ],
    popular: true,
    badge: "Mais Popular",
  },
  {
    name: "Anual",
    price: "R$ 29",
    period: "/mês",
    description: "Melhor valor. PIX disponível.",
    features: [
      "Tudo do plano semestral",
      "Economia de 40%",
      "Pagamento via PIX",
      "Acesso vitalício a bônus",
    ],
    popular: false,
    badge: "PIX Disponível",
  },
];

export function PricingSection() {
  return (
    <section className="py-24 px-4 gradient-ethereal">
      <div className="container mx-auto max-w-5xl">
        <div className="text-center mb-16">
          <h2 className="font-display text-4xl md:text-5xl font-semibold text-foreground mb-4">
            Comece Sua Jornada
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto font-body">
            Experimente grátis por 7 dias. Cancele a qualquer momento.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan, index) => (
            <Card 
              key={index} 
              variant={plan.popular ? "premium" : "elevated"}
              className={`relative ${plan.popular ? 'scale-105 z-10' : ''}`}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
                    plan.popular 
                      ? 'bg-gold text-earth' 
                      : 'bg-sage text-primary-foreground'
                  }`}>
                    {plan.popular && <Star className="w-3 h-3" />}
                    {plan.badge}
                  </span>
                </div>
              )}
              
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              
              <CardContent className="text-center pb-6">
                <div className="mb-6">
                  <span className="font-display text-5xl font-bold text-foreground">{plan.price}</span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </div>
                
                <ul className="space-y-3 text-left">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm">
                      <Check className="w-4 h-4 text-sage flex-shrink-0" />
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              
              <CardFooter>
                <Button 
                  variant={plan.popular ? "gold" : "sage"} 
                  size="lg" 
                  className="w-full"
                >
                  Começar Agora
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
