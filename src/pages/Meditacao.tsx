import { AppLayout } from "@/components/layout/AppLayout";
import { LoadingState } from "@/components/layout/PageState";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useParams, Link } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import { useSubscription, useDailyContentForDate } from "@/hooks/useSubscription";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Play, 
  Pause, 
  Headphones, 
  Lock, 
  ArrowLeft, 
  RefreshCw,
  WifiOff,
  AlertCircle,
  Clock,
} from "lucide-react";

const formatDateDisplay = (dateStr: string) => {
  const date = new Date(dateStr + "T12:00:00");
  return format(date, "dd/MM/yyyy", { locale: ptBR });
};

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

const Meditacao = () => {
  const { date } = useParams<{ date: string }>();
  const audioRef = useRef<HTMLAudioElement>(null);
  
  const { isPremium, isLoading: subscriptionLoading } = useSubscription();
  const { content, isLoading: contentLoading, error: contentError, refetch } = useDailyContentForDate(date || "");

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [audioError, setAudioError] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  // Handle online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Audio event handlers
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleDurationChange = () => setDuration(audio.duration || 0);
    const handleEnded = () => setIsPlaying(false);
    const handleError = () => setAudioError(true);
    const handleCanPlay = () => setAudioError(false);

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("durationchange", handleDurationChange);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);
    audio.addEventListener("canplay", handleCanPlay);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("durationchange", handleDurationChange);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
      audio.removeEventListener("canplay", handleCanPlay);
    };
  }, [content?.meditation_audio_url]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(() => setAudioError(true));
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const handleRetryAudio = () => {
    setAudioError(false);
    if (audioRef.current) {
      audioRef.current.load();
    }
  };

  const isLoading = subscriptionLoading || contentLoading;
  const displayDate = date ? formatDateDisplay(date) : "";
  const mediationDurationMinutes = content?.meditation_duration_seconds 
    ? Math.round(content.meditation_duration_seconds / 60) 
    : null;

  // Offline state
  if (isOffline) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <header>
            <Link to="/" className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground mb-4">
              <ArrowLeft className="w-4 h-4" /> Voltar
            </Link>
            <h1 className="text-2xl font-display font-semibold text-foreground">Meditação</h1>
          </header>

          <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
            <CardContent className="p-8 text-center space-y-4">
              <WifiOff className="w-12 h-12 mx-auto text-amber-600" />
              <h2 className="text-xl font-semibold text-foreground">Você está sem internet</h2>
              <p className="text-muted-foreground">
                Conecte-se à internet para acessar a meditação.
              </p>
              <Button variant="outline" onClick={() => window.location.reload()}>
                <RefreshCw className="w-4 h-4 mr-2" /> Tentar novamente
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <header>
          <Link to="/" className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Link>
          <h1 className="text-2xl font-display font-semibold text-foreground">Meditação do Dia</h1>
          <p className="text-muted-foreground mt-1">{displayDate}</p>
        </header>

        {isLoading && <LoadingState message="Carregando meditação..." />}

        {/* Premium Gating */}
        {!isLoading && !isPremium && (
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="p-8 text-center space-y-6">
              <div className="w-20 h-20 mx-auto rounded-full bg-primary/20 flex items-center justify-center">
                <Lock className="w-10 h-10 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-display font-semibold text-foreground mb-2">
                  Conteúdo Premium
                </h2>
                <p className="text-muted-foreground max-w-md mx-auto">
                  As meditações guiadas são exclusivas para assinantes Premium.
                  Desbloqueie para acessar meditações diárias e muito mais.
                </p>
              </div>
              <Link to="/assinar">
                <Button size="lg" className="text-lg px-8">
                  Assinar Premium
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Content Error */}
        {!isLoading && isPremium && contentError && (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="p-8 text-center space-y-4">
              <AlertCircle className="w-12 h-12 mx-auto text-destructive" />
              <h2 className="text-xl font-semibold text-foreground">Erro ao carregar</h2>
              <p className="text-muted-foreground">
                Não foi possível carregar o conteúdo. Tente novamente.
              </p>
              <Button variant="outline" onClick={refetch}>
                <RefreshCw className="w-4 h-4 mr-2" /> Tentar novamente
              </Button>
            </CardContent>
          </Card>
        )}

        {/* No content for date */}
        {!isLoading && isPremium && !contentError && !content && (
          <Card>
            <CardContent className="p-8 text-center space-y-4">
              <Headphones className="w-12 h-12 mx-auto text-muted-foreground opacity-50" />
              <h2 className="text-xl font-semibold text-foreground">Conteúdo não encontrado</h2>
              <p className="text-muted-foreground">
                Não há conteúdo disponível para esta data.
              </p>
              <Link to="/">
                <Button variant="outline">
                  <ArrowLeft className="w-4 h-4 mr-2" /> Voltar para Home
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* No meditation audio */}
        {!isLoading && isPremium && content && !content.meditation_audio_url && (
          <Card>
            <CardContent className="p-8 text-center space-y-4">
              <Clock className="w-12 h-12 mx-auto text-primary opacity-60" />
              <h2 className="text-xl font-semibold text-foreground">Meditação do dia em breve</h2>
              <p className="text-muted-foreground">
                A meditação para esta data ainda não foi publicada.
              </p>
              <Link to="/">
                <Button variant="outline">
                  <ArrowLeft className="w-4 h-4 mr-2" /> Voltar para Home
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Audio Error */}
        {!isLoading && isPremium && content?.meditation_audio_url && audioError && (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="p-8 text-center space-y-4">
              <AlertCircle className="w-12 h-12 mx-auto text-destructive" />
              <h2 className="text-xl font-semibold text-foreground">Erro no áudio</h2>
              <p className="text-muted-foreground">
                Não foi possível carregar o áudio agora.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button variant="outline" onClick={handleRetryAudio}>
                  <RefreshCw className="w-4 h-4 mr-2" /> Tentar novamente
                </Button>
                <Link to="/">
                  <Button variant="ghost">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Audio Player */}
        {!isLoading && isPremium && content?.meditation_audio_url && !audioError && (
          <Card variant="elevated">
            <CardContent className="p-6 space-y-6">
              {/* Cover */}
              <div className="aspect-square max-w-xs mx-auto rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                <Headphones className="w-20 h-20 text-primary" />
              </div>

              {/* Title */}
              <div className="text-center">
                <h2 className="text-xl font-display font-semibold text-foreground mb-1">
                  {content.tonica_title || "Meditação do Dia"}
                </h2>
                {mediationDurationMinutes && (
                  <p className="text-sm text-muted-foreground">
                    {mediationDurationMinutes} minutos
                  </p>
                )}
              </div>

              {/* Hidden Audio Element */}
              <audio
                ref={audioRef}
                src={content.meditation_audio_url}
                preload="metadata"
              />

              {/* Play Controls */}
              <div className="flex items-center justify-center">
                <Button
                  size="lg"
                  className="w-16 h-16 rounded-full"
                  onClick={togglePlay}
                  aria-label={isPlaying ? "Pausar" : "Reproduzir"}
                >
                  {isPlaying ? (
                    <Pause className="w-6 h-6" />
                  ) : (
                    <Play className="w-6 h-6 ml-1" />
                  )}
                </Button>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <input
                  type="range"
                  min={0}
                  max={duration || 100}
                  value={currentTime}
                  onChange={handleSeek}
                  className="w-full h-2 bg-secondary rounded-full appearance-none cursor-pointer
                    [&::-webkit-slider-thumb]:appearance-none
                    [&::-webkit-slider-thumb]:w-4
                    [&::-webkit-slider-thumb]:h-4
                    [&::-webkit-slider-thumb]:rounded-full
                    [&::-webkit-slider-thumb]:bg-primary
                    [&::-webkit-slider-thumb]:cursor-pointer
                    [&::-webkit-slider-thumb]:shadow-md
                    [&::-moz-range-thumb]:w-4
                    [&::-moz-range-thumb]:h-4
                    [&::-moz-range-thumb]:rounded-full
                    [&::-moz-range-thumb]:bg-primary
                    [&::-moz-range-thumb]:border-0
                    [&::-moz-range-thumb]:cursor-pointer
                  "
                  style={{
                    background: `linear-gradient(to right, hsl(var(--primary)) ${(currentTime / (duration || 1)) * 100}%, hsl(var(--secondary)) ${(currentTime / (duration || 1)) * 100}%)`,
                  }}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
};

export default Meditacao;
