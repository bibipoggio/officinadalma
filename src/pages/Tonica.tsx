import { useParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { LoadingState, ErrorState } from "@/components/layout/PageState";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SliderEnergia } from "@/components/ui/SliderEnergia";
import { useState } from "react";
import { Sun, Play, Pause, Heart } from "lucide-react";

type PageState = "loading" | "error" | "success";

const mockTonica = {
  date: "2024-01-15",
  title: "Aterramento e Presença",
  message: "Hoje é um dia para se reconectar com suas raízes. Sinta seus pés no chão, respire fundo e permita-se estar presente. A estabilidade que você busca já mora dentro de você.",
  meditationTitle: "Meditação de Aterramento",
  meditationDuration: "15 min",
  affirmation: "Eu estou seguro(a) e conectado(a) com a terra.",
};

const Tonica = () => {
  const { date } = useParams<{ date: string }>();
  const [state] = useState<PageState>("success");
  const [isPlaying, setIsPlaying] = useState(false);
  const [energy, setEnergy] = useState(5);
  const [checkinDone, setCheckinDone] = useState(false);

  // Format date for display (DD/MM/AAAA)
  const displayDate = date === "hoje" 
    ? new Date().toLocaleDateString("pt-BR")
    : date ? new Date(date).toLocaleDateString("pt-BR") : "";

  return (
    <AppLayout>
      <div className="space-y-6">
        <header className="text-center">
          <div className="w-14 h-14 rounded-full bg-amethyst-light flex items-center justify-center mx-auto mb-3">
            <Sun className="w-7 h-7 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground">{displayDate}</p>
          <h1 className="text-2xl font-display font-semibold text-foreground mt-1">
            Tônica do Dia
          </h1>
        </header>

        {state === "loading" && <LoadingState message="Carregando tônica..." />}
        
        {state === "error" && (
          <ErrorState 
            title="Tônica não encontrada"
            message="Não encontramos a tônica para esta data."
            onRetry={() => {}}
          />
        )}

        {state === "success" && (
          <>
            {/* Daily Message */}
            <Card variant="elevated">
              <CardContent className="p-6 space-y-4">
                <h2 className="font-display text-xl font-semibold text-foreground">
                  {mockTonica.title}
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  {mockTonica.message}
                </p>
                
                {/* Affirmation */}
                <div className="pt-4 border-t border-border">
                  <p className="text-sm text-muted-foreground mb-1">Afirmação do dia:</p>
                  <p className="font-display text-lg text-primary italic">
                    "{mockTonica.affirmation}"
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Meditation Player */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="w-14 h-14 rounded-full bg-primary flex items-center justify-center hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    aria-label={isPlaying ? "Pausar" : "Reproduzir"}
                  >
                    {isPlaying ? (
                      <Pause className="w-6 h-6 text-primary-foreground" />
                    ) : (
                      <Play className="w-6 h-6 text-primary-foreground ml-1" />
                    )}
                  </button>
                  
                  <div className="flex-1">
                    <h3 className="font-medium text-foreground">
                      {mockTonica.meditationTitle}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {mockTonica.meditationDuration}
                    </p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-4 space-y-1">
                  <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full w-0 bg-primary rounded-full" />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>0:00</span>
                    <span>{mockTonica.meditationDuration}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Check-in */}
            {!checkinDone ? (
              <Card>
                <CardContent className="p-6 space-y-5">
                  <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
                    <Heart className="w-5 h-5 text-primary" />
                    Check-in de Energia
                  </h3>
                  
                  <SliderEnergia
                    label="Como você está se sentindo?"
                    value={energy}
                    onChange={setEnergy}
                    id="checkin-energy"
                  />

                  <Button className="w-full" size="lg" onClick={() => setCheckinDone(true)}>
                    Registrar Check-in
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-success/30 bg-success/5">
                <CardContent className="p-6 text-center">
                  <p className="text-success font-medium">
                    ✓ Check-in registrado com sucesso!
                  </p>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
};

export default Tonica;
