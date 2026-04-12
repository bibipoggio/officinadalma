import { AppLayout } from "@/components/layout/AppLayout";
import { LoadingState, ErrorState } from "@/components/layout/PageState";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Lock,
  WifiOff,
  RotateCcw,
  Video,
  Headphones,
  ShoppingCart,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import {
  useLessonDetails,
  useLessonProgress,
  getCourseTypeLabel,
} from "@/hooks/useLessonDetails";
import { cn } from "@/lib/utils";
import { LessonComments } from "@/components/lessons/LessonComments";
import { VideoPlayer } from "@/components/lessons/VideoPlayer";
import { MultiVideoPlayer } from "@/components/lessons/MultiVideoPlayer";
import { AudioPlayer } from "@/components/lessons/AudioPlayer";
import { LessonContent } from "@/components/lessons/LessonContent";
import { useLessonTracking } from "@/hooks/useLessonAnalytics";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

const Aula = () => {
  const { slug, lessonId } = useParams<{ slug: string; lessonId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [mediaMode, setMediaMode] = useState<"video" | "audio">("video");
  const [isBuying, setIsBuying] = useState(false);

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

  const { trackView, trackComplete } = useLessonTracking();
  const hasTrackedView = useRef(false);

  // Track view once when lesson loads
  useEffect(() => {
    if (lesson && lessonId && !isLocked && !hasTrackedView.current) {
      hasTrackedView.current = true;
      trackView(lessonId);
    }
  }, [lesson, lessonId, isLocked, trackView]);

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

  const handleMarkCompleted = async () => {
    const result = await markCompleted();
    if (result.success) {
      toast.success("Aula marcada como concluída!");
      setProgress((prev) =>
        prev ? { ...prev, progress_percent: 100, completed_at: new Date().toISOString() } : prev
      );
      if (lessonId) {
        trackComplete(lessonId);
      }
    } else {
      toast.error("Não foi possível marcar como concluída. Tente novamente.");
    }
  };

  const handlePlaybackRateChange = () => {
    const currentIndex = PLAYBACK_RATES.indexOf(playbackRate);
    const nextIndex = (currentIndex + 1) % PLAYBACK_RATES.length;
    setPlaybackRate(PLAYBACK_RATES[nextIndex]);
  };

  const handleMediaEnded = async () => {
    const result = await markCompleted();
    if (result.success) {
      toast.success("Aula concluída!");
      setProgress((prev) =>
        prev ? { ...prev, progress_percent: 100, completed_at: new Date().toISOString() } : prev
      );
      if (lessonId) {
        trackComplete(lessonId);
      }
    }
  };

  const handleBuyLesson = async () => {
    if (!user || !lesson || !lessonId) return;
    setIsBuying(true);
    try {
      const { data, error } = await supabase.functions.invoke("mp-create-payment", {
        body: { lesson_id: lessonId, lesson_title: lesson.title },
      });
      if (error) throw error;
      if (data?.init_point) {
        window.open(data.init_point, "_blank");
      } else if (data?.sandbox_init_point) {
        window.open(data.sandbox_init_point, "_blank");
      }
    } catch (err) {
      console.error("Buy error:", err);
      toast.error("Erro ao iniciar compra. Tente novamente.");
    } finally {
      setIsBuying(false);
    }
  };

  // Check if lesson has multiple videos
  const lessonVideos = lesson?.videos || [];
  const hasMultipleVideos = lessonVideos.length > 1;

  // Detect if media_url is a video (YouTube, Vimeo, or .mp4)
  const isMediaUrlVideo = (() => {
    if (!lesson?.media_url) return false;
    const url = lesson.media_url.toLowerCase();
    return url.includes("youtube.com") || url.includes("youtu.be") || url.includes("vimeo.com") || url.endsWith(".mp4");
  })();

  // Has video content (either content_type=video or media_url is a video link)
  const hasVideo = (lesson?.content_type === "video" || isMediaUrlVideo) && !!lesson?.media_url;
  
  // Has audio content (audio_url, or content_type=audio with media_url)
  const hasAudio = !!lesson?.audio_url || (lesson?.content_type === "audio" && !!lesson?.media_url);
  
  // Show video/audio toggle when both are available
  const hasVideoAndAudio = hasVideo && hasAudio;
  
  const isCompleted = !!progress?.completed_at;
  const hasMediaContent = hasVideo || hasAudio || hasMultipleVideos;

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
                Assine o plano Premium para ter acesso completo a todas as aulas, ou compre esta aula individualmente.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button variant="outline" onClick={() => navigate(`/aulas/${slug}`)}>
                  Voltar ao curso
                </Button>
                <Button
                  variant="secondary"
                  onClick={handleBuyLesson}
                  disabled={isBuying}
                >
                  {isBuying ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <ShoppingCart className="w-4 h-4 mr-2" />
                  )}
                  Comprar Aula Avulsa — R$29,75
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

            {/* Multi-Video Player */}
            {hasMultipleVideos && lessonId && (
              <MultiVideoPlayer
                lessonId={lessonId}
                videos={lessonVideos}
                playbackRate={playbackRate}
                onPlaybackRateChange={handlePlaybackRateChange}
                onAllCompleted={handleMediaEnded}
              />
            )}

            {/* Single Video Player - show when video available and not multi-video */}
            {!hasMultipleVideos && hasVideo && lesson.media_url && (!hasVideoAndAudio || mediaMode === "video") && (
              <VideoPlayer
                src={lesson.media_url}
                title={lesson.title}
                initialPosition={progress?.last_position_seconds || 0}
                onTimeUpdate={savePosition}
                onEnded={handleMediaEnded}
                playbackRate={playbackRate}
                onPlaybackRateChange={handlePlaybackRateChange}
              />
            )}

            {/* Audio Player - podcast mode (when toggled from video+audio) */}
            {hasVideoAndAudio && mediaMode === "audio" && (
              <AudioPlayer
                src={lesson.audio_url || lesson.media_url!}
                title={lesson.title}
                initialPosition={progress?.last_position_seconds || 0}
                onTimeUpdate={savePosition}
                onEnded={handleMediaEnded}
                playbackRate={playbackRate}
                onPlaybackRateChange={handlePlaybackRateChange}
                variant="podcast"
              />
            )}

            {/* Audio-only Player (no video available) */}
            {hasAudio && !hasVideo && (
              <AudioPlayer
                src={lesson.audio_url || lesson.media_url!}
                title={lesson.title}
                initialPosition={progress?.last_position_seconds || 0}
                onTimeUpdate={savePosition}
                onEnded={handleMediaEnded}
                playbackRate={playbackRate}
                onPlaybackRateChange={handlePlaybackRateChange}
              />
            )}

            {/* Lesson Info & Content */}
            <LessonContent
              lesson={lesson}
              course={course}
              isCompleted={isCompleted}
              isSaving={isSaving}
              onMarkCompleted={handleMarkCompleted}
            />
          </CardContent>
        </Card>

        {/* Comments Section */}
        <LessonComments lessonId={lessonId || ""} />

        {/* Navigation */}
        {(prevLesson || nextLesson) && (
          <div className="flex gap-2 w-full overflow-hidden">
            {prevLesson && (
              <Link to={`/aulas/${slug}/aula/${prevLesson.id}`} className="flex-1 min-w-0">
                <Button
                  variant="outline"
                  className="w-full justify-start text-left min-w-0"
                  size="default"
                >
                  <ChevronLeft className="w-4 h-4 shrink-0" />
                  <span className="truncate">{prevLesson.title}</span>
                </Button>
              </Link>
            )}

            {nextLesson && (
              <Link to={`/aulas/${slug}/aula/${nextLesson.id}`} className="flex-1 min-w-0">
                <Button
                  variant="outline"
                  className="w-full justify-end text-right min-w-0"
                  size="default"
                >
                  <span className="truncate">{nextLesson.title}</span>
                  <ChevronRight className="w-4 h-4 shrink-0" />
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
