import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { LoadingState, ErrorState } from "@/components/layout/PageState";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SliderEnergia } from "@/components/ui/SliderEnergia";
import { Textarea } from "@/components/ui/textarea";
import { useState, useRef, useEffect } from "react";
import { Sun, Play, Pause, Heart, Music, CheckCircle, Pencil, ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { useDailyContentForDate, formatDuration } from "@/hooks/useDailyContentForDate";
import { useCheckin, type ShareMode } from "@/hooks/useSubscription";
import { 
  PrivacyDisclaimerModal, 
  hasAcceptedPrivacyDisclaimer 
} from "@/components/ui/PrivacyDisclaimerModal";
import { useToast } from "@/hooks/use-toast";
import { createSafeHtml } from "@/lib/sanitize";
import { format, subDays, addDays, isSameDay, parseISO, isAfter } from "date-fns";
import { ptBR } from "date-fns/locale";

const Tonica = () => {
  const { date } = useParams<{ date: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Today's date for comparison
  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");
  
  // Determine the actual date to fetch
  const targetDate = date === "hoje" 
    ? todayStr
    : date || todayStr;
  
  // Parse target date for navigation
  const targetDateObj = parseISO(targetDate + "T12:00:00");
  const isToday = isSameDay(targetDateObj, today);
  const canGoForward = !isToday && !isAfter(addDays(targetDateObj, 1), today);
  
  // Navigate to previous/next day
  const goToPreviousDay = () => {
    const prevDate = format(subDays(targetDateObj, 1), "yyyy-MM-dd");
    navigate(`/tonica/${prevDate}`);
  };
  
  const goToNextDay = () => {
    if (canGoForward) {
      const nextDate = format(addDays(targetDateObj, 1), "yyyy-MM-dd");
      navigate(`/tonica/${nextDate}`);
    } else if (!isToday) {
      navigate("/tonica/hoje");
    }
  };
  
  const goToToday = () => {
    navigate("/tonica/hoje");
  };

  const { content, isLoading, error } = useDailyContentForDate(targetDate);
  const { checkin, isLoading: checkinLoading, isSaving, saveCheckin } = useCheckin(targetDate);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [energy, setEnergy] = useState(5);
  const [feelingText, setFeelingText] = useState("");
  const [shareMode, setShareMode] = useState<ShareMode>("private");
  const [isEditing, setIsEditing] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Format date for display
  const displayDate = format(new Date(targetDate + "T12:00:00"), "dd 'de' MMMM, yyyy", { locale: ptBR });

  // Sync form with existing checkin
  useEffect(() => {
    if (checkin) {
      setEnergy(checkin.energy);
      setFeelingText(checkin.feeling_text);
      setShareMode(checkin.share_mode);
    }
  }, [checkin]);

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

  // Handle save button click
  const handleSaveClick = () => {
    if ((shareMode === "community" || shareMode === "anonymous") && !hasAcceptedPrivacyDisclaimer()) {
      setShowPrivacyModal(true);
    } else {
      performSave();
    }
  };

  // Actually save the check-in
  const performSave = async () => {
    const shouldPublish = shareMode !== "private";
    
    const result = await saveCheckin({
      energy,
      feeling_text: feelingText,
      share_mode: shareMode,
      published: shouldPublish,
    });

    if (result.success) {
      setIsEditing(false);
      toast({ 
        title: "Check-in salvo!", 
        description: shouldPublish 
          ? (shareMode === "community" 
            ? "Seu check-in foi compartilhado com a comunidade." 
            : "Seu check-in foi compartilhado de forma anônima.")
          : "Seu check-in foi salvo de forma privada."
      });
    } else {
      toast({ 
        title: "Erro", 
        description: "Não foi possível salvar. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handlePrivacyAccept = () => {
    setShowPrivacyModal(false);
    performSave();
  };

  const handlePrivacyCancel = () => {
    setShowPrivacyModal(false);
  };

  const getPrivacyDescription = () => {
    if (shareMode === "private") return "Somente você verá este check-in.";
    if (shareMode === "community") return "Seu nome e check-in serão visíveis para a comunidade.";
    if (shareMode === "anonymous") return "Seu check-in será visível para a comunidade, mas sem seu nome.";
    return "";
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Date Navigation */}
        <div className="flex items-center justify-between gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={goToPreviousDay}
            aria-label="Dia anterior"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          
          <button
            onClick={goToToday}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-muted transition-colors"
            disabled={isToday}
          >
            <CalendarDays className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">
              {isToday ? "Hoje" : displayDate}
            </span>
          </button>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={goToNextDay}
            disabled={isToday}
            aria-label="Próximo dia"
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>

        {/* Header with optional cover image */}
        {content?.cover_image_url ? (
          <div className="relative -mx-4 sm:-mx-6">
            <div className="relative w-full overflow-hidden bg-muted/30">
              <img 
                src={content.cover_image_url} 
                alt={content.tonica_title}
                className="w-full h-auto max-h-[60vh] object-contain mx-auto"
              />
            </div>
            <div className="relative -mt-8 mx-4 sm:mx-6 z-10">
              <div className="bg-card/95 backdrop-blur-sm border border-border rounded-xl p-4 sm:p-5 text-center shadow-lg">
                <p className="text-sm text-muted-foreground">{displayDate}</p>
                <h1 className="text-2xl sm:text-3xl font-display font-semibold text-foreground mt-1">
                  {content.tonica_title}
                </h1>
              </div>
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
                  dangerouslySetInnerHTML={createSafeHtml(content.tonica_full)}
                />
                
                {/* Practice */}
                <div className="pt-4 border-t border-border">
                  <p className="text-sm text-muted-foreground mb-2">Prática do dia:</p>
                  <div 
                    className="font-medium text-foreground prose prose-sm max-w-none [&_br]:block [&_br]:my-2"
                    dangerouslySetInnerHTML={createSafeHtml(content.tonica_practice)}
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
            <Card>
              <CardContent className="p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
                    {checkin ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <Heart className="w-5 h-5 text-primary" />
                    )}
                    {checkin ? "Check-in realizado" : "Check-in de Energia"}
                  </h3>
                  {checkin && !isEditing && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setIsEditing(true)}
                    >
                      <Pencil className="w-4 h-4 mr-1" />
                      Editar
                    </Button>
                  )}
                </div>
                
                {checkinLoading ? (
                  <div className="space-y-3">
                    <div className="h-12 bg-muted animate-pulse rounded-lg" />
                    <div className="h-24 bg-muted animate-pulse rounded-lg" />
                  </div>
                ) : checkin && !isEditing ? (
                  /* Completed check-in view */
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground">Energia:</span>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                          <span className="text-sm font-bold text-primary">{checkin.energy}</span>
                        </div>
                        <span className="text-sm text-muted-foreground">/10</span>
                      </div>
                    </div>
                    
                    {checkin.feeling_text && (
                      <div className="bg-muted/30 rounded-lg p-4">
                        <p className="text-sm text-foreground whitespace-pre-wrap">{checkin.feeling_text}</p>
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      {checkin.share_mode === "private" && <span>🔒 Privado</span>}
                      {checkin.share_mode === "community" && <span>👥 Compartilhado com a comunidade</span>}
                      {checkin.share_mode === "anonymous" && <span>🎭 Compartilhado anonimamente</span>}
                    </div>
                  </div>
                ) : (
                  /* Edit/Create form */
                  <>
                    <SliderEnergia
                      label="Como você está se sentindo?"
                      value={energy}
                      onChange={setEnergy}
                      id="checkin-energy"
                      disabled={isSaving}
                    />

                    <div className="space-y-2">
                      <label htmlFor="feeling-text" className="text-sm font-medium text-foreground">
                        Quer compartilhar algo? (opcional)
                      </label>
                      <Textarea
                        id="feeling-text"
                        value={feelingText}
                        onChange={(e) => setFeelingText(e.target.value.slice(0, 500))}
                        placeholder="Como você está se sentindo hoje..."
                        className="min-h-[100px]"
                        disabled={isSaving}
                      />
                      <p className="text-right text-xs text-muted-foreground">
                        {feelingText.length}/500
                      </p>
                    </div>

                    {/* Privacy Options */}
                    <div className="space-y-3">
                      <label className="text-sm font-medium text-foreground">
                        Compartilhar como
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {([
                          { value: "private", label: "🔒 Privado", desc: "Só você vê" },
                          { value: "community", label: "👥 Comunidade", desc: "Com seu nome" },
                          { value: "anonymous", label: "🎭 Anônimo", desc: "Sem seu nome" },
                        ] as const).map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => setShareMode(option.value)}
                            disabled={isSaving}
                            className={`flex-1 min-w-[100px] px-4 py-3 rounded-xl text-sm font-medium transition-all border-2 ${
                              shareMode === option.value
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-background text-muted-foreground hover:bg-muted/50 border-border"
                            }`}
                          >
                            <span className="block text-base">{option.label}</span>
                            <span className="block text-xs opacity-80 mt-0.5">{option.desc}</span>
                          </button>
                        ))}
                      </div>
                      <p className={`text-xs flex items-center gap-1.5 ${
                        shareMode === "private" 
                          ? "text-muted-foreground" 
                          : "text-amber-600 dark:text-amber-400"
                      }`}>
                        {shareMode !== "private" && (
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                        )}
                        {getPrivacyDescription()}
                      </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      {isEditing && (
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => {
                            setIsEditing(false);
                            if (checkin) {
                              setEnergy(checkin.energy);
                              setFeelingText(checkin.feeling_text);
                              setShareMode(checkin.share_mode);
                            }
                          }}
                          disabled={isSaving}
                        >
                          Cancelar
                        </Button>
                      )}
                      <Button
                        className={isEditing ? "flex-1" : "w-full"}
                        size="lg"
                        onClick={handleSaveClick}
                        disabled={isSaving || !feelingText.trim()}
                      >
                        {isSaving 
                          ? "Salvando..." 
                          : isEditing
                            ? "Salvar alterações"
                            : shareMode === "private"
                              ? "Salvar check-in"
                              : shareMode === "community"
                                ? "Compartilhar com a comunidade"
                                : "Compartilhar anonimamente"
                        }
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Privacy Disclaimer Modal */}
      <PrivacyDisclaimerModal
        open={showPrivacyModal}
        onOpenChange={setShowPrivacyModal}
        onAccept={handlePrivacyAccept}
        onCancel={handlePrivacyCancel}
        shareMode={shareMode === "anonymous" ? "anonymous" : "community"}
      />
    </AppLayout>
  );
};

export default Tonica;