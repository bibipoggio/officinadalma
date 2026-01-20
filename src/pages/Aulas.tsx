import { AppLayout } from "@/components/layout/AppLayout";
import { LoadingState, EmptyState, ErrorState } from "@/components/layout/PageState";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GraduationCap, BookOpen, Lock, Play } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAulasHub, getCourseTypeLabel } from "@/hooks/useAulasHub";
import { cn } from "@/lib/utils";

// Get badge variant based on course type
function getCourseTypeBadgeVariant(type: string): "default" | "secondary" | "outline" {
  if (type === "aparte") return "default";
  if (type === "basic") return "outline";
  return "secondary";
}

const Aulas = () => {
  const navigate = useNavigate();
  const { enrollments, availableCourses, isPremium, isLoading, error, refetch } = useAulasHub();

  if (isLoading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <header>
            <h1 className="text-2xl font-display font-semibold text-foreground">Aulas</h1>
            <p className="text-muted-foreground mt-1">
              Cursos e conteúdos para sua transformação
            </p>
          </header>
          <LoadingState message="Carregando cursos..." />
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <header>
            <h1 className="text-2xl font-display font-semibold text-foreground">Aulas</h1>
            <p className="text-muted-foreground mt-1">
              Cursos e conteúdos para sua transformação
            </p>
          </header>
          <ErrorState
            title="Erro ao carregar cursos"
            message="Não foi possível carregar a lista de cursos. Tente novamente."
            onRetry={refetch}
          />
        </div>
      </AppLayout>
    );
  }

  const hasEnrollments = enrollments.length > 0;
  const hasCatalog = availableCourses.length > 0;

  return (
    <AppLayout>
      <div className="space-y-8">
        <header>
          <h1 className="text-2xl font-display font-semibold text-foreground">Aulas</h1>
          <p className="text-muted-foreground mt-1">
            Cursos e conteúdos para sua transformação
          </p>
        </header>

        {/* Meus Cursos Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-display font-medium">Meus Cursos</h2>
          </div>

          {hasEnrollments ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {enrollments.map((enrollment) => (
                <Card
                  key={enrollment.id}
                  className="overflow-hidden transition-shadow hover:shadow-card group"
                >
                  {/* Thumbnail */}
                  <div className="aspect-video bg-amethyst-light relative">
                    {enrollment.courses.cover_image_url ? (
                      <img
                        src={enrollment.courses.cover_image_url}
                        alt={enrollment.courses.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Play className="w-10 h-10 text-primary group-hover:scale-110 transition-transform" />
                      </div>
                    )}
                  </div>

                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-display font-medium text-foreground group-hover:text-primary transition-colors line-clamp-1">
                        {enrollment.courses.title}
                      </h3>
                      <Badge
                        variant={getCourseTypeBadgeVariant(enrollment.courses.type)}
                        className="shrink-0 text-xs"
                      >
                        {getCourseTypeLabel(enrollment.courses.type)}
                      </Badge>
                    </div>

                    {enrollment.courses.description_short && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                        {enrollment.courses.description_short}
                      </p>
                    )}

                    <Button
                      className="w-full"
                      onClick={() => navigate(`/aulas/${enrollment.courses.route_slug}`)}
                    >
                      Acessar
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-dashed">
              <CardContent className="p-6 text-center">
                <GraduationCap className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">
                  Você ainda não está matriculado em nenhum curso.
                </p>
                {hasCatalog && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Explore o catálogo abaixo para começar.
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </section>

        {/* Catálogo Section */}
        {hasCatalog && (
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-display font-medium">Catálogo</h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {availableCourses.map((course) => {
                const isPremiumCourse = course.type === "aparte";
                const isLocked = isPremiumCourse && !isPremium;

                return (
                  <Card
                    key={course.id}
                    className={cn(
                      "overflow-hidden transition-shadow group",
                      isLocked ? "opacity-90" : "hover:shadow-card"
                    )}
                  >
                    {/* Thumbnail */}
                    <div className="aspect-video bg-amethyst-light relative">
                      {course.cover_image_url ? (
                        <img
                          src={course.cover_image_url}
                          alt={course.title}
                          className={cn(
                            "w-full h-full object-cover",
                            isLocked && "grayscale-[30%]"
                          )}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          {isLocked ? (
                            <Lock className="w-10 h-10 text-muted-foreground" />
                          ) : (
                            <Play className="w-10 h-10 text-primary group-hover:scale-110 transition-transform" />
                          )}
                        </div>
                      )}

                      {/* Lock overlay for premium courses */}
                      {isLocked && (
                        <div className="absolute inset-0 bg-foreground/10 flex items-center justify-center">
                          <div className="bg-background/90 rounded-full p-3">
                            <Lock className="w-6 h-6 text-muted-foreground" />
                          </div>
                        </div>
                      )}
                    </div>

                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="font-display font-medium text-foreground line-clamp-1">
                          {course.title}
                        </h3>
                        <Badge
                          variant={getCourseTypeBadgeVariant(course.type)}
                          className="shrink-0 text-xs"
                        >
                          {getCourseTypeLabel(course.type)}
                        </Badge>
                      </div>

                      {course.description_short && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                          {course.description_short}
                        </p>
                      )}

                      {isLocked ? (
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => navigate("/assinar")}
                        >
                          <Lock className="w-4 h-4 mr-2" />
                          Assinar Premium
                        </Button>
                      ) : (
                        <Button
                          className="w-full"
                          onClick={() => navigate(`/aulas/${course.route_slug}`)}
                        >
                          Ver Curso
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>
        )}

        {/* No courses at all */}
        {!hasEnrollments && !hasCatalog && (
          <EmptyState
            icon={<GraduationCap className="w-8 h-8 text-muted-foreground" />}
            title="Nenhum curso disponível"
            description="Em breve novos cursos estarão disponíveis para você."
          />
        )}
      </div>
    </AppLayout>
  );
};

export default Aulas;
