import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { PWAInstallBanner } from "@/components/ui/PWAInstallBanner";
import { CommunityInviteModal, useCommunityInvite } from "@/components/ui/CommunityInviteModal";
import { SliderEnergia } from "@/components/ui/SliderEnergia";
import { 
  PrivacyDisclaimerModal, 
  hasAcceptedPrivacyDisclaimer 
} from "@/components/ui/PrivacyDisclaimerModal";
import { 
  useSubscription, 
  useDailyContentForDate, 
  useCheckin, 
  type ShareMode,
} from "@/hooks/useSubscription";
import { useBasicCourse } from "@/hooks/useBasicCourse";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { createSafeHtml } from "@/lib/sanitize";
import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Sun, 
  Moon, 
  Music, 
  Heart, 
  Flame, 
  ArrowRight,
  RefreshCw,
  Sparkles,
  BookOpen,
  CheckCircle,
  Pencil,
  Calendar,
  Play,
  Pause,
  Volume2,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { InlineMeditationPlayer } from "@/components/meditation/InlineMeditationPlayer";
import { StreakAchievement } from "@/components/streak/StreakAchievement";
import { formatTime } from "@/hooks/useMediaProgress";

const formatDateDisplay = (dateStr: string) => {
  const date = new Date(dateStr + "T12:00:00");
  return format(date, "dd/MM/yyyy", { locale: ptBR });
};

const formatDateISO = (date: Date) => {
  return format(date, "yyyy-MM-dd");
};

const Home = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const today = formatDateISO(new Date());

  // Parallel data loading
  const { isPremium, isLoading: subscriptionLoading } = useSubscription();
  const { content: dailyContent, isLoading: contentLoading, error: contentError, refetch: refetchContent } = useDailyContentForDate(today);
  const { checkin, isLoading: checkinLoading, isSaving, saveCheckin, refetch: refetchCheckin } = useCheckin(today);
  const { course: basicCourse, latestLesson, totalLessons, isLoading: courseLoading } = useBasicCourse();

  // Check-in form state
  const [energy, setEnergy] = useState(5);
  const [feelingText, setFeelingText] = useState("");
  const [shareMode, setShareMode] = useState<ShareMode>("private");
  const [isEditing, setIsEditing] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const { open: inviteOpen, setOpen: setInviteOpen, triggerInvite } = useCommunityInvite();

  // Enraizamento audio player state
  const enraizamentoRef = useRef<HTMLAudioElement | null>(null);
  const [enraizamentoPlaying, setEnraizamentoPlaying] = useState(false);
  const [enraizamentoTime, setEnraizamentoTime] = useState(0);
  const [enraizamentoDuration, setEnraizamentoDuration] = useState(0);
  const [enraizamentoRate, setEnraizamentoRate] = useState(1);
  const PLAYBACK_RATES = [1, 1.25, 1.5, 1.75, 2];

  const toggleEnraizamento = useCallback(() => {
    if (!enraizamentoRef.current) return;
    if (enraizamentoPlaying) {
      enraizamentoRef.current.pause();
    } else {
      enraizamentoRef.current.play();
    }
  }, [enraizamentoPlaying]);

  const cycleEnraizamentoRate = useCallback(() => {
    setEnraizamentoRate(prev => {
      const idx = PLAYBACK_RATES.indexOf(prev);
      const next = PLAYBACK_RATES[(idx + 1) % PLAYBACK_RATES.length];
      if (enraizamentoRef.current) enraizamentoRef.current.playbackRate = next;
      return next;
    });
  }, []);

  const seekEnraizamento = useCallback((value: number[]) => {
    if (!enraizamentoRef.current || enraizamentoDuration <= 0) return;
    const time = (value[0] / 100) * enraizamentoDuration;
    enraizamentoRef.current.currentTime = time;
    setEnraizamentoTime(time);
  }, [enraizamentoDuration]);

  // Sync form with existing checkin
  useEffect(() => {
    if (checkin) {
      setEnergy(checkin.energy);
      setFeelingText(checkin.feeling_text);
      setShareMode(checkin.share_mode);
    }
  }, [checkin]);

  // Handle share mode change
  const handleShareModeChange = (newMode: ShareMode) => {
    setShareMode(newMode);
  };

  // Handle save button click
  const handleSaveClick = () => {
    // If public mode and not yet accepted privacy, show modal
    if ((shareMode === "community" || shareMode === "anonymous") && !hasAcceptedPrivacyDisclaimer()) {
      setShowPrivacyModal(true);
    } else {
      // Save directly
      performSave();
    }
  };

  // Actually save the check-in
  const performSave = async () => {
    // If private, published = false; otherwise published = true
    const shouldPublish = shareMode !== "private";
    
    const result = await saveCheckin({
      energy,
      feeling_text: feelingText,
      share_mode: shareMode,
      published: shouldPublish,
    });

    if (result.success) {
      toast({ 
        title: "Check-in salvo!", 
        description: shouldPublish 
          ? (shareMode === "community" 
            ? "Seu check-in foi compartilhado com a comunidade." 
            : "Seu check-in foi compartilhado de forma anônima.")
          : "Seu check-in foi salvo de forma privada."
      });
      // Trigger community invite after first check-in
      setTimeout(() => triggerInvite(), 1500);
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
    // After accepting, save the check-in
    performSave();
  };

  const handlePrivacyCancel = () => {
    setShowPrivacyModal(false);
  };

  const isLoading = subscriptionLoading || contentLoading || checkinLoading || streakLoading;

  const getPrivacyDescription = () => {
    if (shareMode === "private") {
      return "Somente você verá este check-in.";
    }
    if (shareMode === "community") {
      return "Seu nome e check-in serão visíveis para a comunidade.";
    }
    if (shareMode === "anonymous") {
      return "Seu check-in será visível para a comunidade, mas sem seu nome.";
    }
    return "";
  };

  return (
    <AppLayout>
      <div className="space-y-6 pb-12">
        {/* Welcome Header */}
        <section className="text-center py-4">
          <h1 className="text-2xl md:text-3xl font-display font-semibold text-foreground mb-1">
            Seu Ritual do Dia
          </h1>
          <p className="text-muted-foreground">
            {formatDateDisplay(today)}
          </p>
        </section>

        {/* Streak Achievement Section */}
        <StreakAchievement />

        {/* Error State */}
        {contentError && (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="p-5 text-center">
              <p className="text-destructive mb-3">Não foi possível carregar o conteúdo do dia.</p>
              <Button variant="outline" onClick={refetchContent}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Tentar novamente
              </Button>
            </CardContent>
          </Card>
        )}


        {/* Tônica do Dia */}
        <Card>
          <CardContent className="p-5">
            {contentLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ) : dailyContent ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Sun className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
                      Tônica do Dia
                    </p>
                    <h3 className="font-display text-lg font-semibold text-foreground">
                      {dailyContent.tonica_title}
                    </h3>
                  </div>
                </div>

                {/* Enraizamento Audio Player */}
                {dailyContent.enraizamento_audio_url && (
                  <div className="rounded-xl bg-primary/5 p-4 space-y-3">
                    <audio
                      ref={enraizamentoRef}
                      src={dailyContent.enraizamento_audio_url}
                      className="hidden"
                      onPlay={() => setEnraizamentoPlaying(true)}
                      onPause={() => setEnraizamentoPlaying(false)}
                      onEnded={() => setEnraizamentoPlaying(false)}
                      onTimeUpdate={() => {
                        if (enraizamentoRef.current) setEnraizamentoTime(enraizamentoRef.current.currentTime);
                      }}
                      onLoadedMetadata={() => {
                        if (enraizamentoRef.current) {
                          setEnraizamentoDuration(enraizamentoRef.current.duration);
                          enraizamentoRef.current.playbackRate = enraizamentoRate;
                        }
                      }}
                    />
                    <div className="flex items-center gap-3">
                      <Volume2 className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium text-foreground">Enraizamento</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-10 w-10 rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
                        onClick={toggleEnraizamento}
                        aria-label={enraizamentoPlaying ? "Pausar" : "Reproduzir"}
                      >
                        {enraizamentoPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                      </Button>
                      <div className="flex-1 space-y-1">
                        <Slider
                          value={[enraizamentoDuration > 0 ? (enraizamentoTime / enraizamentoDuration) * 100 : 0]}
                          max={100}
                          step={0.1}
                          onValueChange={seekEnraizamento}
                          aria-label="Progresso do áudio"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{formatTime(enraizamentoTime)}</span>
                          <span>{formatTime(enraizamentoDuration)}</span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={cycleEnraizamentoRate}
                        className="text-xs text-muted-foreground"
                      >
                        {enraizamentoRate}x
                      </Button>
                    </div>
                  </div>
                )}

                <div 
                  className="text-muted-foreground leading-relaxed prose prose-sm max-w-none [&_br]:block [&_br]:my-2"
                  dangerouslySetInnerHTML={createSafeHtml(dailyContent.tonica_short)}
                />
                <Link to={`/tonica/${today}`}>
                  <Button variant="outline" className="w-full sm:w-auto">
                    Ver mais <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <Sun className="w-10 h-10 mx-auto mb-3 opacity-50" />
                <p>Nenhuma tônica disponível para hoje.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Meditação do Dia - Gratuita para todos */}
        {dailyContent?.meditation_audio_url && (
          <Card>
            <CardContent className="p-5">
              {contentLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-6 w-40" />
                  <Skeleton className="h-4 w-32" />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Moon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
                        Meditação do Dia
                      </p>
                    </div>
                  </div>

                  <InlineMeditationPlayer
                    audioUrl={dailyContent.meditation_audio_url}
                    title={dailyContent.tonica_title || "Meditação do Dia"}
                    durationSeconds={dailyContent.meditation_duration_seconds}
                    dailyContentId={dailyContent.id}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Astrowake (Spotify Podcast) */}
        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <Music className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
                  Astrowake
                </p>
                <h3 className="font-display text-lg font-semibold text-foreground">
                  {dailyContent?.spotify_episode_url ? "Episódio do Dia" : "Podcast"}
                </h3>
              </div>
            </div>
            
            <div className="rounded-xl overflow-hidden bg-muted">
              {dailyContent?.spotify_episode_url ? (
                <iframe
                  src={dailyContent.spotify_episode_url.replace("/episode/", "/embed/episode/")}
                  width="100%"
                  height="152"
                  frameBorder="0"
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  loading="lazy"
                  title="Spotify Episode"
                  className="rounded-xl"
                />
              ) : (
                <iframe
                  src="https://open.spotify.com/embed/show/58somiTUbjWS1D1XGkIbOs?utm_source=generator"
                  width="100%"
                  height="352"
                  frameBorder="0"
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  loading="lazy"
                  title="Astrowake Podcast"
                  className="rounded-xl"
                  style={{ borderRadius: '12px' }}
                />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Gotas de Sabedoria - Basic Course Preview */}
        {basicCourse && (
          <Card className="bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/20 dark:to-orange-950/20 border-amber-200/50 dark:border-amber-800/30">
            <CardContent className="p-5">
              {courseLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-6 w-40" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs uppercase tracking-wide text-amber-600/80 dark:text-amber-400/80 font-medium">
                        Curso Gratuito
                      </p>
                      <h3 className="font-display text-lg font-semibold text-foreground">
                        Gotas de Sabedoria
                      </h3>
                    </div>
                    {totalLessons > 0 && (
                      <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 rounded-full">
                        <BookOpen className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                        <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                          {totalLessons} {totalLessons === 1 ? "lição" : "lições"}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <p className="text-muted-foreground leading-relaxed">
                    {basicCourse.description_short || "Pequenas reflexões diárias para nutrir sua alma."}
                  </p>

                  {latestLesson && (
                    <div className="bg-white/60 dark:bg-black/20 rounded-lg p-3 border border-amber-200/30 dark:border-amber-800/20">
                      <p className="text-xs text-amber-600/70 dark:text-amber-400/70 font-medium mb-1">
                        Última lição
                      </p>
                      <p className="text-sm font-medium text-foreground">
                        {latestLesson.title}
                      </p>
                      {latestLesson.summary && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {latestLesson.summary}
                        </p>
                      )}
                    </div>
                  )}

                  <Link to={`/aulas/${basicCourse.route_slug}`}>
                    <Button variant="outline" className="w-full sm:w-auto border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/30">
                      Explorar curso <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Check-in do Dia */}
        <Card>
          <CardContent className="p-5 space-y-6">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                checkin ? "bg-green-500/10" : "bg-rose-500/10"
              }`}>
                {checkin ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <Heart className="w-5 h-5 text-rose-500" />
                )}
              </div>
              <div className="flex-1">
                <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
                  Check-in do Dia
                </p>
                <h3 className="font-display text-lg font-semibold text-foreground">
                  {checkin ? "Check-in realizado" : "Como você está hoje?"}
                </h3>
              </div>
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
              <div className="space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-24 w-full" />
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
                {/* Energy Slider */}
                <SliderEnergia
                  value={energy}
                  onChange={setEnergy}
                  disabled={isSaving}
                />

                {/* Feeling Text */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Como você está se sentindo?
                  </label>
                  <Textarea
                    value={feelingText}
                    onChange={(e) => setFeelingText(e.target.value.slice(0, 500))}
                    placeholder="Escreva sobre o seu dia, seus sentimentos..."
                    className="min-h-[100px] resize-none"
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
                        onClick={() => handleShareModeChange(option.value)}
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
                  {/* Privacy description */}
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
                        // Reset form to original values
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
      </div>

      {/* Privacy Disclaimer Modal */}
      <PrivacyDisclaimerModal
        open={showPrivacyModal}
        onOpenChange={setShowPrivacyModal}
        onAccept={handlePrivacyAccept}
        onCancel={handlePrivacyCancel}
        shareMode={shareMode === "anonymous" ? "anonymous" : "community"}
      />
      
      {/* PWA Install Banner */}
      <PWAInstallBanner />

      {/* Community Invite Modal */}
      <CommunityInviteModal open={inviteOpen} onOpenChange={setInviteOpen} />
    </AppLayout>
  );
};

export default Home;
