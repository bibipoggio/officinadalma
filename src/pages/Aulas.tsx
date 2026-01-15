import { AppLayout } from "@/components/layout/AppLayout";
import { LoadingState, EmptyState, ErrorState } from "@/components/layout/PageState";
import { Card, CardContent } from "@/components/ui/card";
import { Chip } from "@/components/ui/Chip";
import { Button } from "@/components/ui/button";
import { GraduationCap, Clock, Play } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";

type PageState = "loading" | "empty" | "error" | "success";

const mockCourses = [
  {
    id: "1",
    slug: "despertar-interior",
    title: "Despertar Interior",
    description: "Uma jornada de autoconhecimento profundo",
    type: "regular",
    lessonsCount: 12,
    duration: "4h 30min",
    thumbnail: null,
  },
  {
    id: "2",
    slug: "meditacao-avancada",
    title: "Meditação Avançada",
    description: "Práticas profundas para expandir sua consciência",
    type: "aparte",
    lessonsCount: 8,
    duration: "2h 15min",
    thumbnail: null,
  },
];

const Aulas = () => {
  const [state] = useState<PageState>("success");
  const [filter, setFilter] = useState<"all" | "regular" | "aparte">("all");

  const filteredCourses = mockCourses.filter(
    (course) => filter === "all" || course.type === filter
  );

  return (
    <AppLayout>
      <div className="space-y-6">
        <header>
          <h1 className="text-2xl font-display font-semibold text-foreground">Aulas</h1>
          <p className="text-muted-foreground mt-1">
            Cursos e conteúdos para sua transformação
          </p>
        </header>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          <Chip
            variant={filter === "all" ? "primary" : "outline"}
            className="cursor-pointer"
            onClick={() => setFilter("all")}
          >
            Todos
          </Chip>
          <Chip
            variant={filter === "regular" ? "primary" : "outline"}
            className="cursor-pointer"
            onClick={() => setFilter("regular")}
          >
            Básico
          </Chip>
          <Chip
            variant={filter === "aparte" ? "primary" : "outline"}
            className="cursor-pointer"
            onClick={() => setFilter("aparte")}
          >
            Premium
          </Chip>
        </div>

        {state === "loading" && <LoadingState message="Carregando cursos..." />}
        
        {state === "error" && (
          <ErrorState 
            title="Erro ao carregar cursos"
            message="Não foi possível carregar a lista de cursos."
            onRetry={() => {}}
          />
        )}

        {state === "empty" && (
          <EmptyState
            icon={<GraduationCap className="w-8 h-8 text-muted-foreground" />}
            title="Nenhum curso disponível"
            description="Em breve novos cursos estarão disponíveis."
          />
        )}

        {state === "success" && (
          <div className="grid gap-4 md:grid-cols-2">
            {filteredCourses.map((course) => (
              <Link key={course.id} to={`/aulas/${course.slug}`}>
                <Card className="h-full hover:shadow-card transition-shadow group">
                  <CardContent className="p-5">
                    {/* Thumbnail Placeholder */}
                    <div className="aspect-video rounded-lg bg-amethyst-light mb-4 flex items-center justify-center group-hover:bg-amethyst/20 transition-colors">
                      <Play className="w-10 h-10 text-primary" />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Chip size="sm" variant={course.type === "aparte" ? "primary" : "muted"}>
                          {course.type === "regular" ? "Básico" : "Premium"}
                        </Chip>
                      </div>

                      <h3 className="font-display font-semibold text-foreground group-hover:text-primary transition-colors">
                        {course.title}
                      </h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {course.description}
                      </p>

                      <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2">
                        <span className="flex items-center gap-1">
                          <GraduationCap className="w-3.5 h-3.5" />
                          {course.lessonsCount} aulas
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {course.duration}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Aulas;
