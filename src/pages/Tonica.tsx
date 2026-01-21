import { useParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { LoadingState, ErrorState } from "@/components/layout/PageState";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SliderEnergia } from "@/components/ui/SliderEnergia";
import { Textarea } from "@/components/ui/textarea";
import { useState, useRef, useEffect } from "react";
import { Sun, Play, Pause, Heart, Music } from "lucide-react";
import { useDailyContentForDate, formatDuration } from "@/hooks/useDailyContentForDate";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const Tonica = () => {
  const { date } = useParams<{ date: string }>();
  
  // Determine the actual date to fetch
  const targetDate = date === "hoje" 
    ? format(new Date(), "yyyy-MM-dd")
    : date || format(new Date(), "yyyy-MM-dd");

  const { content, isLoading, error } = useDailyContentForDate(targetDate);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [energy, setEnergy] = useState(5);
  const [feelingText, setFeelingText] = useState("");
  const [checkinDone, setCheckinDone] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Format date for display
  const displayDate = format(new Date(targetDate + "T12:00:00"), "dd 'de' MMMM, yyyy", { locale: ptBR });

  // Handle audio playback
  const togglePlay = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  // Update current time
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [content?.meditation_audio_url]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleCheckin = () => {
    // TODO: Implement actual check-in saving
    setCheckinDone(true);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header with optional cover image */}
        {content?.cover_image_url ? (
          <div className="relative -mx-4 -mt-4 sm:-mx-6 sm:-mt-6">
            <div className="relative h-48 sm:h-64 overflow-hidden">
              <img 
                src={content.cover_image_url} 
                alt={content.tonica_title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 text-center">
              <p className="text-sm text-muted-foreground">{displayDate}</p>
              <h1 className="text-2xl sm:text-3xl font-display font-semibold text-foreground mt-1">
                {content.tonica_title}
              </h1>
            </div>
          </div>
        ) : (
          <header className="text-center">
            <div className="w-14 h-14 rounded-full bg-amethyst-light flex items-center justify-center mx-auto mb-3">
              <Sun className="w-7 h-7 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">{displayDate}</p>
            <h1 className="text-2xl font-display font-semibold text-foreground mt-1">
              {content?.tonica_title || "Tônica do Dia"}
            </h1>
          </header>
        )}

        {isLoading && <LoadingState message="Carregando tônica..." />}
        
        {error && (
          <ErrorState 
            title="Erro ao carregar"
            message={error}
            onRetry={() => window.location.reload()}
          />
        )}

        {!isLoading && !error && !content && (
          <ErrorState 
            title="Tônica não disponível"
            message="O conteúdo para esta data ainda não foi publicado."
          />
        )}

        {!isLoading && content && (
          <>
            {/* Daily Message */}
            <Card variant="elevated">
              <CardContent className="p-6 space-y-4">
                <div 
                  className="text-muted-foreground leading-relaxed prose prose-sm max-w-none [&_br]:block [&_br]:my-2"
                  dangerouslySetInnerHTML={{ __html: content.tonica_full }}
                />
                
                {/* Practice */}
                <div className="pt-4 border-t border-border">
                  <p className="text-sm text-muted-foreground mb-2">Prática do dia:</p>
                  <div 
                    className="font-medium text-foreground prose prose-sm max-w-none [&_br]:block [&_br]:my-2"
                    dangerouslySetInnerHTML={{ __html: content.tonica_practice }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Meditation Player */}
            {content.meditation_audio_url && (
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={togglePlay}
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
                      <h3 className="font-medium text-foreground flex items-center gap-2">
                        <Music className="w-4 h-4" />
                        Meditação do Dia
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {formatDuration(content.meditation_duration_seconds)}
                      </p>
                    </div>
                  </div>

                  {/* Hidden audio element */}
                  <audio 
                    ref={audioRef} 
                    src={content.meditation_audio_url}
                    preload="metadata"
                  />

                  {/* Progress Bar */}
                  <div className="mt-4 space-y-1">
                    <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ 
                          width: content.meditation_duration_seconds 
                            ? `${(currentTime / content.meditation_duration_seconds) * 100}%`
                            : "0%"
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{formatTime(currentTime)}</span>
                      <span>{formatDuration(content.meditation_duration_seconds)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Spotify Episode */}
            {content.spotify_episode_url && (
              <Card>
                <CardContent className="p-6">
                  <a 
                    href={content.spotify_episode_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-4 hover:opacity-80 transition-opacity"
                  >
                    <div className="w-14 h-14 rounded-full bg-[#1DB954] flex items-center justify-center">
                      <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-foreground">
                        Astrowake no Spotify
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Ouvir episódio do dia
                      </p>
                    </div>
                  </a>
                </CardContent>
              </Card>
            )}

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

                  <div className="space-y-2">
                    <label htmlFor="feeling-text" className="text-sm font-medium text-foreground">
                      Quer compartilhar algo? (opcional)
                    </label>
                    <Textarea
                      id="feeling-text"
                      value={feelingText}
                      onChange={(e) => setFeelingText(e.target.value)}
                      placeholder="Como você está se sentindo hoje..."
                      className="min-h-[100px]"
                    />
                  </div>

                  <Button className="w-full" size="lg" onClick={handleCheckin}>
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