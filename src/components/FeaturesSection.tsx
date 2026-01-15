import { Sparkles, BookOpen, Heart, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  {
    icon: BookOpen,
    title: "Cursos Transformadores",
    description: "Conteúdos exclusivos para seu desenvolvimento espiritual e autoconhecimento.",
  },
  {
    icon: Heart,
    title: "Check-in Diário",
    description: "Acompanhe sua jornada interior com reflexões e práticas guiadas.",
  },
  {
    icon: Users,
    title: "Comunidade Acolhedora",
    description: "Conecte-se com pessoas que compartilham da mesma busca por crescimento.",
  },
  {
    icon: Sparkles,
    title: "Experiência Premium",
    description: "Acesso ilimitado a todo conteúdo por um valor acessível.",
  },
];

export function FeaturesSection() {
  return (
    <section className="py-24 px-4">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-16">
          <h2 className="font-display text-4xl md:text-5xl font-semibold text-foreground mb-4">
            Sua Jornada Interior Começa Aqui
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto font-body">
            Ferramentas e conteúdos criados com cuidado para apoiar seu caminho de autoconhecimento.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <Card key={index} variant="ethereal" className="group">
              <CardContent className="p-6 text-center">
                <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-sage/10 flex items-center justify-center group-hover:bg-sage/20 transition-colors duration-300">
                  <feature.icon className="w-7 h-7 text-sage" />
                </div>
                <h3 className="font-display text-xl font-semibold text-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-muted-foreground font-body leading-relaxed">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
