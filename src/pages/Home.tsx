import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Heart, Sun, Moon, ArrowRight } from "lucide-react";

const Home = () => {
  const today = new Date().toLocaleDateString("pt-BR");

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Welcome Section */}
        <section className="text-center py-8">
          <h1 className="text-3xl md:text-4xl font-display font-semibold text-foreground mb-3">
            Bem-vinda à sua Jornada
          </h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Desperte sua essência com práticas diárias de autoconhecimento e transformação.
          </p>
        </section>

        {/* Quick Actions */}
        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card variant="elevated" className="group cursor-pointer hover:border-primary/30">
            <CardContent className="p-6 flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg bg-amethyst-light flex items-center justify-center shrink-0">
                <Sun className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-display font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">
                  Tônica do Dia
                </h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Sua mensagem e meditação para {today}
                </p>
                <Button variant="ghost" size="sm" className="p-0 h-auto text-primary">
                  Acessar <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card variant="elevated" className="group cursor-pointer hover:border-primary/30">
            <CardContent className="p-6 flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg bg-amethyst-light flex items-center justify-center shrink-0">
                <Heart className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-display font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">
                  Check-in Diário
                </h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Como você está se sentindo hoje?
                </p>
                <Button variant="ghost" size="sm" className="p-0 h-auto text-primary">
                  Registrar <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card variant="elevated" className="group cursor-pointer hover:border-primary/30">
            <CardContent className="p-6 flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg bg-amethyst-light flex items-center justify-center shrink-0">
                <Moon className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-display font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">
                  Meditação Guiada
                </h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Sessões para relaxamento e foco
                </p>
                <Button variant="ghost" size="sm" className="p-0 h-auto text-primary">
                  Meditar <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Featured Section Placeholder */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-display font-semibold text-foreground">
              Continue sua Jornada
            </h2>
            <Button variant="ghost" size="sm">
              Ver tudo
            </Button>
          </div>
          
          <Card className="border-dashed border-2 bg-muted/30">
            <CardContent className="p-8 text-center">
              <Sparkles className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">
                Conteúdo de destaque aparecerá aqui
              </p>
            </CardContent>
          </Card>
        </section>
      </div>
    </AppLayout>
  );
};

export default Home;
