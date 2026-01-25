import { AppLayout } from "@/components/layout/AppLayout";
import { LoadingState, ErrorState } from "@/components/layout/PageState";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
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
  Video,
  Headphones,
  FileDown,
} from "lucide-react";
import { toast } from "sonner";
import {
  useLessonDetails,
  useLessonProgress,
  formatDuration,
  getCourseTypeLabel,
  type TextFile,
} from "@/hooks/useLessonDetails";
import { useMediaProgress, formatTime } from "@/hooks/useMediaProgress";
import { createSafeHtml } from "@/lib/sanitize";
import { cn } from "@/lib/utils";
import { LessonComments } from "@/components/lessons/LessonComments";

const Aula = () => {
  const { slug, lessonId } = useParams<{ slug: string; lessonId: string }>();
  const navigate = useNavigate();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showContinue, setShowContinue] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [mediaMode, setMediaMode] = useState<"video" | "audio">("video");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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

  const handlePlaybackRateChange = () => {
    const rates = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
    const currentIndex = rates.indexOf(playbackRate);
    const nextIndex = (currentIndex + 1) % rates.length;
    const newRate = rates[nextIndex];
    setPlaybackRate(newRate);
    
    if (videoRef.current) {
      videoRef.current.playbackRate = newRate;
    }
    if (audioRef.current) {
      audioRef.current.playbackRate = newRate;
    }
  };

  const handleVideoRef = (element: HTMLVideoElement | null) => {
    videoRef.current = element;
    if (element) {
      element.playbackRate = playbackRate;
    }
    setRef(element);
  };

  const handleAudioRef = (element: HTMLAudioElement | null) => {
    audioRef.current = element;
    if (element) {
      element.playbackRate = playbackRate;
    }
    setRef(element);
  };

  // Check if lesson has both video and audio
  const hasVideoAndAudio = lesson?.content_type === "video" && lesson?.media_url && lesson?.audio_url;

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
            {/* Media Mode Toggle (when both video and audio available) */}
            {hasVideoAndAudio && (
              <div className="flex border-b">
                <button
                  onClick={() => setMediaMode("video")}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-medium transition-colors",
                    mediaMode === "video"
                      ? "bg-primary/10 text-primary border-b-2 border-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  <Video className="w-4 h-4" />
                  Assistir Vídeo
                </button>
                <button
                  onClick={() => setMediaMode("audio")}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-medium transition-colors",
                    mediaMode === "audio"
                      ? "bg-primary/10 text-primary border-b-2 border-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  <Headphones className="w-4 h-4" />
                  Ouvir Podcast
                </button>
              </div>
            )}

            {/* Video Player */}
            {lesson.content_type === "video" && lesson.media_url && (!hasVideoAndAudio || mediaMode === "video") && (
              <div className="relative bg-foreground/5 group">
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
                      ref={handleVideoRef as React.RefCallback<HTMLVideoElement>}
                      src={lesson.media_url}
                      className="w-full aspect-video"
                      playsInline
                      aria-label={`Vídeo: ${lesson.title}`}
                    />

                    {/* Custom Controls Overlay */}
                    <div 
                      className={cn(
                        "absolute inset-0 flex items-center justify-center bg-black/20 transition-opacity",
                        isPlaying ? "opacity-0 group-hover:opacity-100" : "opacity-100"
                      )}
                      onClick={togglePlay}
                    >
                      <Button
                        size="lg"
                        className="w-16 h-16 rounded-full"
                        onClick={(e) => {
                          e.stopPropagation();
                          togglePlay();
                        }}
                        aria-label={isPlaying ? "Pausar vídeo" : "Reproduzir vídeo"}
                      >
                        {isPlaying ? (
                          <Pause className="w-6 h-6" />
                        ) : (
                          <Play className="w-6 h-6 ml-1" />
                        )}
                      </Button>
                    </div>

                    {/* Bottom Controls Bar */}
                    <div 
                      className={cn(
                        "absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 transition-opacity",
                        isPlaying ? "opacity-0 group-hover:opacity-100" : "opacity-100"
                      )}
                    >
                      {/* Progress Slider */}
                      <div className="mb-3">
                        <Slider
                          value={[mediaProgress]}
                          max={100}
                          step={0.1}
                          onValueChange={handleSeek}
                          aria-label="Progresso do vídeo"
                          className="cursor-pointer"
                        />
                      </div>

                      <div className="flex items-center justify-between text-white">
                        <div className="flex items-center gap-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-white hover:text-white hover:bg-white/20 h-8 w-8 p-0"
                            onClick={togglePlay}
                          >
                            {isPlaying ? (
                              <Pause className="w-4 h-4" />
                            ) : (
                              <Play className="w-4 h-4 ml-0.5" />
                            )}
                          </Button>
                          <span className="text-sm font-medium">
                            {formatTime(currentTime)} / {formatTime(duration)}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {/* Playback Speed */}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-white hover:text-white hover:bg-white/20 h-8 px-2 text-xs font-medium"
                            onClick={handlePlaybackRateChange}
                          >
                            {playbackRate}x
                          </Button>
                          
                          {/* Volume indicator */}
                          <Volume2 className="w-4 h-4" />
                        </div>
                      </div>
                    </div>

                    {/* Continue from where you left */}
                    {showContinue && !isPlaying && progress?.last_position_seconds && (
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 mt-16">
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

            {/* Alternative Audio Mode (Podcast) for lessons with both video and audio */}
            {hasVideoAndAudio && mediaMode === "audio" && lesson.audio_url && (
              <div className="p-6 bg-primary/5">
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
                      ref={handleAudioRef as React.RefCallback<HTMLAudioElement>}
                      src={lesson.audio_url}
                      className="hidden"
                      aria-label={`Podcast: ${lesson.title}`}
                    />

                    <div className="flex flex-col items-center gap-6">
                      <div className="flex items-center gap-3 text-primary">
                        <Headphones className="w-6 h-6" />
                        <span className="font-medium">Modo Podcast</span>
                      </div>
                      
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

                      <div className="flex items-center gap-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handlePlaybackRateChange}
                          className="text-muted-foreground"
                        >
                          {playbackRate}x
                        </Button>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Volume2 className="w-4 h-4" />
                          <span className="text-sm">{lesson.title}</span>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Audio Player (for audio-only lessons) */}
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

            {/* Audio Progress Bar (audio-only lessons) */}
            {lesson.content_type === "audio" && !mediaError && (
              <div className="px-5 pt-3">
                <Progress value={mediaProgress} className="h-1" aria-label="Progresso da mídia" />
              </div>
            )}

            {/* Lesson Info */}
            <div className="p-5 sm:p-6 space-y-5">
              <header className="space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
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

                <h1 className="text-2xl sm:text-3xl font-display font-semibold text-foreground leading-tight">
                  {lesson.title}
                </h1>

                {lesson.duration_seconds && (
                  <p className="text-sm text-muted-foreground font-body">
                    Duração: {formatDuration(lesson.duration_seconds)}
                  </p>
                )}
              </header>

              {/* Summary */}
              {lesson.summary && (
                <div className="rounded-xl bg-muted/50 border border-border/50 p-4">
                  <p 
                    className="text-muted-foreground font-body text-sm leading-relaxed"
                    dangerouslySetInnerHTML={createSafeHtml(lesson.summary)}
                  />
                </div>
              )}

              {/* Text/Markdown Content - visible for ALL content types if present */}
              {lesson.body_markdown && (
                <div className="rounded-xl bg-card border border-border p-5 sm:p-6 shadow-sm">
                  <div 
                    className="prose prose-sm sm:prose-base dark:prose-invert max-w-none
                      font-body text-foreground leading-relaxed
                      prose-headings:font-display prose-headings:text-foreground prose-headings:font-semibold
                      prose-p:text-foreground/90 prose-p:leading-relaxed
                      prose-strong:text-foreground prose-strong:font-semibold
                      prose-a:text-primary prose-a:no-underline hover:prose-a:underline
                      prose-li:text-foreground/90
                      [&_br]:block [&_br]:my-2"
                    dangerouslySetInnerHTML={createSafeHtml(lesson.body_markdown)}
                  />
                </div>
              )}

              {/* Attachments Section */}
              {(lesson.pdf_url || (lesson.text_files_urls && lesson.text_files_urls.length > 0)) && (
                <div className="space-y-3 pt-2 border-t">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <FileDown className="w-4 h-4" />
                    Materiais para download
                  </h3>
                  <div className="grid gap-2">
                    {lesson.pdf_url && (
                      <a
                        href={lesson.pdf_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        download
                        className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors group"
                      >
                        <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
                          <FileDown className="w-5 h-5 text-destructive" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">Material Complementar</p>
                          <p className="text-xs text-muted-foreground">PDF</p>
                        </div>
                      </a>
                    )}
                    {lesson.text_files_urls?.map((file, index) => (
                      <a
                        key={index}
                        href={file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        download
                        className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors group"
                      >
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <FileDown className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{file.name}</p>
                          <p className="text-xs text-muted-foreground">Arquivo de texto</p>
                        </div>
                      </a>
                    ))}
                  </div>
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

        {/* Comments Section */}
        <LessonComments lessonId={lessonId || ""} />

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
