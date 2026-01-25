import { AppLayout } from "@/components/layout/AppLayout";
import { LoadingState, ErrorState } from "@/components/layout/PageState";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Modal } from "@/components/ui/Modal";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import {
  ArrowLeft,
  Clock,
  Play,
  Lock,
  CheckCircle2,
  Circle,
  BookOpen,
} from "lucide-react";
import {
  useCourseDetails,
  formatDuration,
  getCourseTypeLabel,
  type LessonWithProgress,
} from "@/hooks/useCourseDetails";
import { cn } from "@/lib/utils";

const Curso = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [paywallOpen, setPaywallOpen] = useState(false);

  const {
    course,
    modules,
    hasAccess,
    isPremiumCourse,
    totalLessons,
    completedLessons,
    overallProgress,
    isLoading,
    error,
    refetch,
  } = useCourseDetails(slug || "");

  const handleLessonClick = (lesson: LessonWithProgress) => {
    if (lesson.isLocked) {
      setPaywallOpen(true);
    } else {
      navigate(`/aulas/${slug}/aula/${lesson.id}`);
    }
  };

  const getLessonStatus = (lesson: LessonWithProgress) => {
    if (lesson.progress?.completed_at) {
      return "completed";
    }
    if (lesson.progress && lesson.progress.progress_percent > 0) {
      return "in_progress";
    }
    return "not_started";
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <Link
            to="/aulas"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar para Aulas
          </Link>
          <LoadingState message="Carregando curso..." />
        </div>
      </AppLayout>
    );
  }

  if (error || !course) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <Link
            to="/aulas"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar para Aulas
          </Link>
          <ErrorState
            title="Curso não encontrado"
            message="Não encontramos o curso que você está procurando."
            onRetry={refetch}
          />
        </div>
      </AppLayout>
    );
  }

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

        {/* Course Header */}
        <header className="space-y-5">
          {/* Cover Image */}
          {course.cover_image_url && (
            <div className="aspect-video rounded-xl overflow-hidden bg-muted shadow-sm">
              <img
                src={course.cover_image_url}
                alt={course.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={isPremiumCourse ? "default" : "secondary"}>
              {getCourseTypeLabel(course.type)}
            </Badge>
            {!hasAccess && (
              <Badge variant="outline" className="gap-1">
                <Lock className="w-3 h-3" />
                Bloqueado
              </Badge>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-display font-semibold text-foreground leading-tight">
            {course.title}
          </h1>

          {course.description_short && (
            <p className="text-muted-foreground font-body text-base leading-relaxed">
              {course.description_short}
            </p>
          )}

          {/* Progress */}
          {hasAccess && totalLessons > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Progresso</span>
                <span className="font-medium text-foreground">
                  {completedLessons} de {totalLessons} aulas
                </span>
              </div>
              <Progress value={overallProgress} className="h-2" />
            </div>
          )}

          {/* Access CTA for locked courses */}
          {!hasAccess && (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-foreground">
                    Este é um curso Premium
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Assine para ter acesso completo a todas as aulas.
                  </p>
                </div>
                <Button onClick={() => navigate("/assinar")}>
                  Assinar Premium
                </Button>
              </CardContent>
            </Card>
          )}
        </header>

        {/* Modules & Lessons */}
        <section className="space-y-5">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-display font-semibold text-foreground">
              Conteúdo do Curso
            </h2>
          </div>

          {modules.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground font-body">
                  Nenhuma aula disponível ainda.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Accordion
              type="multiple"
              defaultValue={modules.map((m) => m.id)}
              className="space-y-3"
            >
              {modules.map((module, moduleIndex) => (
                <AccordionItem
                  key={module.id}
                  value={module.id}
                  className="border rounded-xl overflow-hidden bg-card"
                >
                  <AccordionTrigger className="px-4 sm:px-5 py-4 hover:no-underline hover:bg-muted/50">
                    <div className="flex items-center gap-3 text-left">
                      <span className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary shrink-0">
                        {moduleIndex + 1}
                      </span>
                      <div>
                        <h3 className="font-display font-semibold text-foreground">
                          {module.title}
                        </h3>
                        {module.description && (
                          <p className="text-sm text-muted-foreground font-body line-clamp-1 mt-0.5">
                            {module.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-0 pb-0">
                    <div className="divide-y">
                      {module.lessons.map((lesson, lessonIndex) => {
                        const status = getLessonStatus(lesson);
                        const globalIndex =
                          modules
                            .slice(0, moduleIndex)
                            .reduce((acc, m) => acc + m.lessons.length, 0) +
                          lessonIndex +
                          1;

                        return (
                          <button
                            key={lesson.id}
                            onClick={() => handleLessonClick(lesson)}
                            className={cn(
                              "w-full px-4 py-4 flex items-center gap-3 sm:gap-4 text-left transition-colors",
                              lesson.isLocked
                                ? "opacity-60 cursor-not-allowed"
                                : "hover:bg-muted/50 active:bg-muted/70"
                            )}
                            disabled={lesson.isLocked}
                          >
                            {/* Status Icon */}
                            <div
                              className={cn(
                                "w-10 h-10 sm:w-9 sm:h-9 rounded-full flex items-center justify-center shrink-0",
                                status === "completed" &&
                                  "bg-success/10 text-success",
                                status === "in_progress" &&
                                  "bg-primary/10 text-primary",
                                status === "not_started" &&
                                  !lesson.isLocked &&
                                  "bg-muted text-muted-foreground",
                                lesson.isLocked && "bg-muted text-muted-foreground"
                              )}
                            >
                              {lesson.isLocked ? (
                                <Lock className="w-4 h-4" />
                              ) : status === "completed" ? (
                                <CheckCircle2 className="w-5 h-5" />
                              ) : status === "in_progress" ? (
                                <Play className="w-4 h-4 ml-0.5" />
                              ) : (
                                <Circle className="w-4 h-4" />
                              )}
                            </div>

                            {/* Lesson Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start gap-2">
                                <span className="text-xs text-muted-foreground font-medium mt-0.5 shrink-0">
                                  {globalIndex}.
                                </span>
                                <h4 className="font-body font-medium text-foreground text-sm sm:text-base leading-snug line-clamp-2 sm:line-clamp-1">
                                  {lesson.title}
                                </h4>
                              </div>

                              <div className="flex items-center gap-3 mt-1.5 ml-5">
                                {lesson.duration_seconds && (
                                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {formatDuration(lesson.duration_seconds)}
                                  </span>
                                )}

                                {/* Progress bar for in-progress lessons */}
                                {status === "in_progress" && lesson.progress && (
                                  <div className="flex items-center gap-2 flex-1 max-w-24 sm:max-w-32">
                                    <Progress
                                      value={lesson.progress.progress_percent}
                                      className="h-1.5"
                                    />
                                    <span className="text-xs text-muted-foreground">
                                      {lesson.progress.progress_percent}%
                                    </span>
                                  </div>
                                )}

                                {status === "completed" && (
                                  <span className="text-xs text-success font-medium">
                                    Concluída
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Locked badge - hidden on small mobile */}
                            {lesson.isLocked && (
                              <Badge variant="outline" className="shrink-0 text-xs hidden sm:flex">
                                Premium
                              </Badge>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </section>
      </div>

      {/* Paywall Modal */}
      <Modal
        open={paywallOpen}
        onOpenChange={setPaywallOpen}
        title="Conteúdo Premium"
        description="Esta aula faz parte do conteúdo exclusivo para assinantes."
        size="default"
        footer={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setPaywallOpen(false)}>
              Voltar
            </Button>
            <Button onClick={() => navigate("/assinar")}>
              Assinar Premium
            </Button>
          </div>
        }
      >
        <div className="space-y-4 text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <Lock className="w-8 h-8 text-primary" />
          </div>
          <div>
            <p className="text-muted-foreground">
              Assine o plano Premium para desbloquear todas as aulas e ter
              acesso completo à plataforma.
            </p>
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
};

export default Curso;
