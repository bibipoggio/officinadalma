import { AppLayout } from "@/components/layout/AppLayout";
import { LoadingState, ErrorState } from "@/components/layout/PageState";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  ArrowLeft,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Lock,
  WifiOff,
  AlertCircle,
  RotateCcw,
  Volume2,
} from "lucide-react";
import { toast } from "sonner";
import {
  useLessonDetails,
  useLessonProgress,
  formatDuration,
  getCourseTypeLabel,
} from "@/hooks/useLessonDetails";
import { useMediaProgress, formatTime } from "@/hooks/useMediaProgress";
import { cn } from "@/lib/utils";

const Aula = () => {
  const { slug, lessonId } = useParams<{ slug: string; lessonId: string }>();
  const navigate = useNavigate();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showContinue, setShowContinue] = useState(false);

  const {
    lesson,
    course,
    progress,
    prevLesson,
    nextLesson,
    isLoading,
    isLocked,
    error,
    refetch,
    setProgress,
  } = useLessonDetails(lessonId || "", slug || "");

  const { savePosition, markCompleted, isSaving } = useLessonProgress(
    lessonId || "",
    lesson?.duration_seconds || null
  );

  const {
    setRef,
    isPlaying,
    currentTime,
    duration,
    progress: mediaProgress,
    mediaError,
    togglePlay,
    seek,
  } = useMediaProgress({
    onTimeUpdate: (time) => {
      savePosition(time);
    },
    onEnded: async () => {
      const result = await markCompleted();
      if (result.success) {
        toast.success("Aula concluída!");
        setProgress((prev) =>
          prev ? { ...prev, progress_percent: 100, completed_at: new Date().toISOString() } : prev
        );
      }
    },
    initialPosition: progress?.last_position_seconds || 0,
  });

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Show "continue from where you left" prompt
  useEffect(() => {
    if (progress?.last_position_seconds && progress.last_position_seconds > 10 && !progress.completed_at) {
      setShowContinue(true);
    }
  }, [progress]);

  const handleMarkCompleted = async () => {
    const result = await markCompleted();
    if (result.success) {
      toast.success("Aula marcada como concluída!");
      setProgress((prev) =>
        prev ? { ...prev, progress_percent: 100, completed_at: new Date().toISOString() } : prev
      );
    } else {
      toast.error("Não foi possível marcar como concluída. Tente novamente.");
    }
  };

  const handleSeek = (value: number[]) => {
    if (duration > 0) {
      const time = (value[0] / 100) * duration;
      seek(time);
    }
  };

  const isCompleted = !!progress?.completed_at;
  const hasMediaContent = lesson?.content_type === "video" || lesson?.content_type === "audio";

  if (isLoading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <Link
            to={`/aulas/${slug}`}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar para o curso
          </Link>
          <LoadingState message="Carregando aula..." />
        </div>
      </AppLayout>
    );
  }

  if (error || !lesson || !course) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <Link
            to={`/aulas/${slug}`}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar para o curso
          </Link>
          <ErrorState
            title="Aula não encontrada"
            message="Não encontramos a aula que você está procurando."
            onRetry={refetch}
          />
        </div>
      </AppLayout>
    );
  }

  // Offline state
  if (!isOnline && hasMediaContent) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <Link
            to={`/aulas/${slug}`}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar para {course.title}
          </Link>

          <Card className="border-destructive/20">
            <CardContent className="p-8 text-center space-y-4">
              <WifiOff className="w-12 h-12 text-muted-foreground mx-auto" />
              <h2 className="text-lg font-display font-semibold">Você está sem internet</h2>
              <p className="text-muted-foreground">
                Conecte-se à internet para assistir esta aula.
              </p>
              <Button onClick={() => window.location.reload()}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Tentar novamente
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  // Locked state (paywall)
  if (isLocked) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <Link
            to={`/aulas/${slug}`}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar para {course.title}
          </Link>

          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-8 text-center space-y-6">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <Lock className="w-8 h-8 text-primary" />
              </div>

              <div className="space-y-2">
                <Badge variant={course.type === "aparte" ? "default" : "secondary"}>
                  {getCourseTypeLabel(course.type)}
                </Badge>
                <h2 className="text-xl font-display font-semibold">{lesson.title}</h2>
                <p className="text-muted-foreground">
                  Esta aula faz parte do conteúdo Premium.
                </p>
              </div>

              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Assine o plano Premium para ter acesso completo a todas as aulas e funcionalidades
                da plataforma.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button variant="outline" onClick={() => navigate(`/aulas/${slug}`)}>
                  Voltar ao curso
                </Button>
                <Button onClick={() => navigate("/assinar")}>Assinar Premium</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Back Button */}
        <Link
          to={`/aulas/${slug}`}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para {course.title}
        </Link>

        {/* Media Player or Text Content */}
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            {/* Video Player */}
            {lesson.content_type === "video" && lesson.media_url && (
              <div className="relative bg-foreground/5">
                {mediaError ? (
                  <div className="aspect-video flex flex-col items-center justify-center gap-4 p-8">
                    <AlertCircle className="w-10 h-10 text-destructive" />
                    <p className="text-muted-foreground text-center">{mediaError}</p>
                    <Button onClick={() => window.location.reload()}>
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Tentar novamente
                    </Button>
                  </div>
                ) : (
                  <>
                    <video
                      ref={setRef as React.RefCallback<HTMLVideoElement>}
                      src={lesson.media_url}
                      className="w-full aspect-video"
                      playsInline
                      aria-label={`Vídeo: ${lesson.title}`}
                    />

                    {/* Custom Controls Overlay */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Button
                        size="lg"
                        className={cn(
                          "w-16 h-16 rounded-full transition-opacity",
                          isPlaying ? "opacity-0 hover:opacity-100" : "opacity-100"
                        )}
                        onClick={togglePlay}
                        aria-label={isPlaying ? "Pausar vídeo" : "Reproduzir vídeo"}
                      >
                        {isPlaying ? (
                          <Pause className="w-6 h-6" />
                        ) : (
                          <Play className="w-6 h-6 ml-1" />
                        )}
                      </Button>
                    </div>

                    {/* Continue from where you left */}
                    {showContinue && !isPlaying && progress?.last_position_seconds && (
                      <div className="absolute bottom-20 left-1/2 -translate-x-1/2">
                        <Button
                          variant="secondary"
                          onClick={() => {
                            seek(progress.last_position_seconds);
                            setShowContinue(false);
                          }}
                        >
                          Continuar de {formatTime(progress.last_position_seconds)}
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Audio Player */}
            {lesson.content_type === "audio" && lesson.media_url && (
              <div className="p-6 bg-amethyst-light/30">
                {mediaError ? (
                  <div className="flex flex-col items-center justify-center gap-4 py-8">
                    <AlertCircle className="w-10 h-10 text-destructive" />
                    <p className="text-muted-foreground text-center">{mediaError}</p>
                    <Button onClick={() => window.location.reload()}>
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Tentar novamente
                    </Button>
                  </div>
                ) : (
                  <>
                    <audio
                      ref={setRef as React.RefCallback<HTMLAudioElement>}
                      src={lesson.media_url}
                      className="hidden"
                      aria-label={`Áudio: ${lesson.title}`}
                    />

                    <div className="flex flex-col items-center gap-6">
                      {/* Play Button */}
                      <Button
                        size="lg"
                        className="w-20 h-20 rounded-full"
                        onClick={togglePlay}
                        aria-label={isPlaying ? "Pausar áudio" : "Reproduzir áudio"}
                      >
                        {isPlaying ? (
                          <Pause className="w-8 h-8" />
                        ) : (
                          <Play className="w-8 h-8 ml-1" />
                        )}
                      </Button>

                      {/* Continue from where you left */}
                      {showContinue && !isPlaying && progress?.last_position_seconds && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            seek(progress.last_position_seconds);
                            setShowContinue(false);
                          }}
                        >
                          Continuar de {formatTime(progress.last_position_seconds)}
                        </Button>
                      )}

                      {/* Progress Slider */}
                      <div className="w-full max-w-md space-y-2">
                        <Slider
                          value={[mediaProgress]}
                          max={100}
                          step={0.1}
                          onValueChange={handleSeek}
                          aria-label="Progresso do áudio"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{formatTime(currentTime)}</span>
                          <span>{formatTime(duration)}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Volume2 className="w-4 h-4" />
                        <span className="text-sm">{lesson.title}</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Video/Audio Progress Bar */}
            {hasMediaContent && !mediaError && (
              <div className="px-5 pt-3">
                <Progress value={mediaProgress} className="h-1" aria-label="Progresso da mídia" />
              </div>
            )}

            {/* Lesson Info */}
            <div className="p-5 space-y-4">
              <header className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant={course.type === "aparte" ? "default" : "secondary"}>
                    {getCourseTypeLabel(course.type)}
                  </Badge>
                  {isCompleted && (
                    <Badge variant="outline" className="text-success border-success/30">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Concluída
                    </Badge>
                  )}
                </div>

                <h1 className="text-xl font-display font-semibold text-foreground">
                  {lesson.title}
                </h1>

                {lesson.duration_seconds && (
                  <p className="text-sm text-muted-foreground">
                    {formatDuration(lesson.duration_seconds)}
                  </p>
                )}
              </header>

              {/* Summary */}
              {lesson.summary && (
                <p className="text-muted-foreground">{lesson.summary}</p>
              )}

              {/* Text Content (Markdown) */}
              {lesson.content_type === "text" && lesson.body_markdown && (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  {/* Simple markdown rendering - for production, use react-markdown */}
                  <div className="whitespace-pre-wrap">{lesson.body_markdown}</div>
                </div>
              )}

              {/* Complete Button */}
              <Button
                variant={isCompleted ? "outline" : "default"}
                className="w-full"
                size="lg"
                onClick={handleMarkCompleted}
                disabled={isSaving || isCompleted}
              >
                {isCompleted ? (
                  <>
                    <CheckCircle className="w-5 h-5 mr-2 text-success" />
                    Aula Concluída
                  </>
                ) : isSaving ? (
                  "Salvando..."
                ) : (
                  "Marcar como Concluída"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Navigation */}
        {(prevLesson || nextLesson) && (
          <div className="flex gap-3">
            {prevLesson && (
              <Link to={`/aulas/${slug}/aula/${prevLesson.id}`} className="flex-1">
                <Button
                  variant="outline"
                  className="w-full justify-start text-left"
                  size="lg"
                >
                  <ChevronLeft className="w-4 h-4 mr-2 shrink-0" />
                  <span className="truncate">{prevLesson.title}</span>
                </Button>
              </Link>
            )}

            {nextLesson && (
              <Link to={`/aulas/${slug}/aula/${nextLesson.id}`} className="flex-1">
                <Button
                  variant="outline"
                  className="w-full justify-end text-right"
                  size="lg"
                >
                  <span className="truncate">{nextLesson.title}</span>
                  <ChevronRight className="w-4 h-4 ml-2 shrink-0" />
                </Button>
              </Link>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Aula;
