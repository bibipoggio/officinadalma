import { AppLayout } from "@/components/layout/AppLayout";
import { LoadingState, ErrorState } from "@/components/layout/PageState";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useParams, Link } from "react-router-dom";
import { useState } from "react";
import { ArrowLeft, Play, Pause, ChevronLeft, ChevronRight, CheckCircle } from "lucide-react";

type PageState = "loading" | "error" | "success";

const mockLesson = {
  id: "3",
  title: "Meditação de Aterramento",
  description: "Aprenda técnicas de aterramento para se conectar com a terra e encontrar estabilidade interior.",
  duration: "25 min",
  videoUrl: null,
  courseTitle: "Despertar Interior",
  courseSlug: "despertar-interior",
  prevLesson: { id: "2", title: "Encontrando seu Centro" },
  nextLesson: { id: "4", title: "Expandindo a Consciência" },
};

const Aula = () => {
  const { slug, lessonId } = useParams<{ slug: string; lessonId: string }>();
  const [state] = useState<PageState>("success");
  const [isPlaying, setIsPlaying] = useState(false);
  const [completed, setCompleted] = useState(false);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Back Button */}
        <Link
          to={`/aulas/${slug}`}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para {mockLesson.courseTitle}
        </Link>

        {state === "loading" && <LoadingState message="Carregando aula..." />}
        
        {state === "error" && (
          <ErrorState 
            title="Aula não encontrada"
            message="Não encontramos a aula que você está procurando."
            onRetry={() => {}}
          />
        )}

        {state === "success" && (
          <>
            {/* Video Player Card */}
            <Card variant="elevated">
              <CardContent className="p-0">
                {/* Video Placeholder */}
                <div className="aspect-video bg-foreground/5 rounded-t-lg flex items-center justify-center">
                  <Button
                    size="xl"
                    className="w-20 h-20 rounded-full"
                    onClick={() => setIsPlaying(!isPlaying)}
                    aria-label={isPlaying ? "Pausar" : "Reproduzir"}
                  >
                    {isPlaying ? (
                      <Pause className="w-8 h-8" />
                    ) : (
                      <Play className="w-8 h-8 ml-1" />
                    )}
                  </Button>
                </div>

                {/* Progress */}
                <div className="px-5 pt-3">
                  <div className="h-1 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full w-1/4 bg-primary rounded-full" />
                  </div>
                </div>

                {/* Lesson Info */}
                <div className="p-5 space-y-4">
                  <header>
                    <h1 className="text-xl font-display font-semibold text-foreground">
                      {mockLesson.title}
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                      {mockLesson.duration}
                    </p>
                  </header>

                  <p className="text-muted-foreground">
                    {mockLesson.description}
                  </p>

                  {/* Complete Button */}
                  <Button
                    variant={completed ? "ethereal" : "default"}
                    className="w-full"
                    size="lg"
                    onClick={() => setCompleted(!completed)}
                  >
                    {completed ? (
                      <>
                        <CheckCircle className="w-5 h-5 mr-2" />
                        Aula Concluída
                      </>
                    ) : (
                      "Marcar como Concluída"
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Navigation */}
            <div className="flex gap-3">
              {mockLesson.prevLesson && (
                <Link to={`/aulas/${slug}/aula/${mockLesson.prevLesson.id}`} className="flex-1">
                  <Button variant="outline" className="w-full justify-start" size="lg">
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    <span className="truncate">{mockLesson.prevLesson.title}</span>
                  </Button>
                </Link>
              )}
              
              {mockLesson.nextLesson && (
                <Link to={`/aulas/${slug}/aula/${mockLesson.nextLesson.id}`} className="flex-1">
                  <Button variant="outline" className="w-full justify-end" size="lg">
                    <span className="truncate">{mockLesson.nextLesson.title}</span>
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              )}
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
};

export default Aula;
