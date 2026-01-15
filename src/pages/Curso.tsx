import { AppLayout } from "@/components/layout/AppLayout";
import { LoadingState, ErrorState } from "@/components/layout/PageState";
import { Card, CardContent } from "@/components/ui/card";
import { Chip } from "@/components/ui/Chip";
import { Button } from "@/components/ui/button";
import { useParams, Link } from "react-router-dom";
import { useState } from "react";
import { ArrowLeft, Clock, Play, Lock, CheckCircle2 } from "lucide-react";

type PageState = "loading" | "error" | "success";

const mockCourse = {
  id: "1",
  slug: "despertar-interior",
  title: "Despertar Interior",
  description: "Uma jornada de autoconhecimento profundo através de práticas ancestrais e modernas de meditação e reflexão.",
  type: "regular" as "regular" | "aparte",
  lessons: [
    { id: "1", title: "Introdução à Jornada", duration: "15 min", completed: true, locked: false },
    { id: "2", title: "Encontrando seu Centro", duration: "20 min", completed: true, locked: false },
    { id: "3", title: "Meditação de Aterramento", duration: "25 min", completed: false, locked: false },
    { id: "4", title: "Expandindo a Consciência", duration: "30 min", completed: false, locked: true },
    { id: "5", title: "Integração e Prática", duration: "20 min", completed: false, locked: true },
  ],
};

const Curso = () => {
  const { slug } = useParams<{ slug: string }>();
  const [state] = useState<PageState>("success");

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Back Button */}
        <Link
          to="/aulas"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para Aulas
        </Link>

        {state === "loading" && <LoadingState message="Carregando curso..." />}
        
        {state === "error" && (
          <ErrorState 
            title="Curso não encontrado"
            message="Não encontramos o curso que você está procurando."
            onRetry={() => {}}
          />
        )}

        {state === "success" && (
          <>
            {/* Course Header */}
            <header className="space-y-4">
              <div className="flex items-center gap-2">
                <Chip variant={mockCourse.type === "aparte" ? "primary" : "muted"}>
                  {mockCourse.type === "regular" ? "Básico" : "Premium"}
                </Chip>
              </div>
              
              <h1 className="text-2xl md:text-3xl font-display font-semibold text-foreground">
                {mockCourse.title}
              </h1>
              
              <p className="text-muted-foreground">
                {mockCourse.description}
              </p>

              {/* Progress */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Progresso</span>
                  <span className="font-medium text-foreground">2 de 5 aulas</span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full w-2/5 bg-primary rounded-full" />
                </div>
              </div>
            </header>

            {/* Lessons List */}
            <section className="space-y-3">
              <h2 className="text-lg font-display font-semibold text-foreground">
                Aulas do Curso
              </h2>
              
              {mockCourse.lessons.map((lesson, index) => (
                <Link
                  key={lesson.id}
                  to={lesson.locked ? "#" : `/aulas/${slug}/aula/${lesson.id}`}
                  className={lesson.locked ? "cursor-not-allowed" : ""}
                >
                  <Card
                    className={`transition-all ${
                      lesson.locked
                        ? "opacity-60"
                        : "hover:shadow-card hover:border-primary/30"
                    }`}
                  >
                    <CardContent className="p-4 flex items-center gap-4">
                      {/* Status Icon */}
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                          lesson.completed
                            ? "bg-success/10 text-success"
                            : lesson.locked
                            ? "bg-muted text-muted-foreground"
                            : "bg-amethyst-light text-primary"
                        }`}
                      >
                        {lesson.completed ? (
                          <CheckCircle2 className="w-5 h-5" />
                        ) : lesson.locked ? (
                          <Lock className="w-4 h-4" />
                        ) : (
                          <Play className="w-4 h-4 ml-0.5" />
                        )}
                      </div>

                      {/* Lesson Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-foreground truncate">
                          {index + 1}. {lesson.title}
                        </h3>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {lesson.duration}
                        </p>
                      </div>

                      {lesson.locked && (
                        <Chip size="sm" variant="muted">
                          Bloqueado
                        </Chip>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </section>
          </>
        )}
      </div>
    </AppLayout>
  );
};

export default Curso;
