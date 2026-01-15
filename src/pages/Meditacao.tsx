import { AppLayout } from "@/components/layout/AppLayout";
import { LoadingState, ErrorState } from "@/components/layout/PageState";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SliderEnergia } from "@/components/ui/SliderEnergia";
import { useParams } from "react-router-dom";
import { useState } from "react";
import { Play, Pause, Headphones } from "lucide-react";

type PageState = "loading" | "error" | "success";

const Meditacao = () => {
  const { date } = useParams<{ date: string }>();
  const [state] = useState<PageState>("success");
  const [isPlaying, setIsPlaying] = useState(false);
  const [energyBefore, setEnergyBefore] = useState(5);
  const [energyAfter, setEnergyAfter] = useState(5);

  // Format date for display (DD/MM/AAAA)
  const displayDate = date === "hoje" 
    ? new Date().toLocaleDateString("pt-BR")
    : date ? new Date(date).toLocaleDateString("pt-BR") : "";

  return (
    <AppLayout>
      <div className="space-y-6">
        <header>
          <h1 className="text-2xl font-display font-semibold text-foreground">Meditação</h1>
          <p className="text-muted-foreground mt-1">{displayDate}</p>
        </header>

        {state === "loading" && <LoadingState message="Carregando meditação..." />}
        
        {state === "error" && (
          <ErrorState 
            title="Meditação não encontrada"
            message="Não encontramos uma meditação para esta data."
            onRetry={() => {}}
          />
        )}

        {state === "success" && (
          <div className="space-y-6">
            {/* Player Card */}
            <Card variant="elevated">
              <CardContent className="p-6 space-y-6">
                <div className="aspect-square max-w-xs mx-auto rounded-xl bg-amethyst-light flex items-center justify-center">
                  <Headphones className="w-20 h-20 text-primary" />
                </div>

                <div className="text-center">
                  <h2 className="text-xl font-display font-semibold text-foreground mb-1">
                    Meditação do Dia
                  </h2>
                  <p className="text-sm text-muted-foreground">15 minutos</p>
                </div>

                {/* Play Controls */}
                <div className="flex items-center justify-center gap-4">
                  <Button
                    size="xl"
                    className="w-16 h-16 rounded-full"
                    onClick={() => setIsPlaying(!isPlaying)}
                    aria-label={isPlaying ? "Pausar" : "Reproduzir"}
                  >
                    {isPlaying ? (
                      <Pause className="w-6 h-6" />
                    ) : (
                      <Play className="w-6 h-6 ml-1" />
                    )}
                  </Button>
                </div>

                {/* Progress Bar Placeholder */}
                <div className="space-y-2">
                  <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full w-1/3 bg-primary rounded-full" />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>5:00</span>
                    <span>15:00</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Energy Check */}
            <Card>
              <CardContent className="p-6 space-y-6">
                <h3 className="font-display font-semibold text-foreground">
                  Registro de Energia
                </h3>
                
                <SliderEnergia
                  label="Antes da meditação"
                  value={energyBefore}
                  onChange={setEnergyBefore}
                  id="energy-before"
                />
                
                <SliderEnergia
                  label="Depois da meditação"
                  value={energyAfter}
                  onChange={setEnergyAfter}
                  id="energy-after"
                />

                <Button className="w-full" size="lg">
                  Salvar Registro
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Meditacao;
