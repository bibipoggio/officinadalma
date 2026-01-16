import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { SliderEnergia } from "@/components/ui/SliderEnergia";
import { 
  PrivacyDisclaimerModal, 
  hasAcceptedPrivacyDisclaimer 
} from "@/components/ui/PrivacyDisclaimerModal";
import { 
  useSubscription, 
  useDailyContentForDate, 
  useCheckin, 
  useMonthlyStreak,
  type ShareMode,
} from "@/hooks/useSubscription";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Sun, 
  Moon, 
  Music, 
  Heart, 
  Flame, 
  ArrowRight,
  Lock,
  RefreshCw,
} from "lucide-react";

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
  const currentDayOfMonth = new Date().getDate();

  // Parallel data loading
  const { isPremium, isLoading: subscriptionLoading } = useSubscription();
  const { content: dailyContent, isLoading: contentLoading, error: contentError, refetch: refetchContent } = useDailyContentForDate(today);
  const { checkin, isLoading: checkinLoading, isSaving, saveCheckin, refetch: refetchCheckin } = useCheckin(today);
  const { streakDays, isLoading: streakLoading } = useMonthlyStreak();

  // Check-in form state
  const [energy, setEnergy] = useState(5);
  const [feelingText, setFeelingText] = useState("");
  const [shareMode, setShareMode] = useState<ShareMode>("private");
  const [published, setPublished] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [pendingShareMode, setPendingShareMode] = useState<ShareMode | null>(null);

  // Sync form with existing checkin
  useEffect(() => {
    if (checkin) {
      setEnergy(checkin.energy);
      setFeelingText(checkin.feeling_text);
      setShareMode(checkin.share_mode);
      setPublished(checkin.published);
    }
  }, [checkin]);

  // Handle share mode change with privacy check
  const handleShareModeChange = (newMode: ShareMode) => {
    if ((newMode === "community" || newMode === "anonymous") && !hasAcceptedPrivacyDisclaimer()) {
      setPendingShareMode(newMode);
      setShowPrivacyModal(true);
    } else {
      setShareMode(newMode);
    }
  };

  const handlePrivacyAccept = () => {
    if (pendingShareMode) {
      setShareMode(pendingShareMode);
      setPendingShareMode(null);
    }
    setShowPrivacyModal(false);
  };

  const handlePrivacyCancel = () => {
    setPendingShareMode(null);
    setShowPrivacyModal(false);
  };

  const handleSaveCheckin = async () => {
    const result = await saveCheckin({
      energy,
      feeling_text: feelingText,
      share_mode: shareMode,
      published,
    });

    if (result.success) {
      toast({ title: "Check-in salvo." });
    } else {
      toast({ 
        title: "Erro", 
        description: "Não foi possível salvar. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const isLoading = subscriptionLoading || contentLoading || checkinLoading || streakLoading;

  const getPrivacyExplanation = () => {
    if (!published) {
      return "Somente você vê.";
    }
    if (shareMode === "community") {
      return "A comunidade vê com seu nome.";
    }
    if (shareMode === "anonymous") {
      return "A comunidade vê como Anônimo.";
    }
    return "Somente você vê.";
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

        {/* Monthly Streak Card */}
        <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-5">
            {streakLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-56" />
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                  <Flame className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-foreground">
                    Seu ritmo neste mês
                  </h2>
                  {streakDays === 0 ? (
                    <p className="text-muted-foreground">
                      Seu primeiro check-in do mês pode ser hoje.
                    </p>
                  ) : (
                    <>
                      <p className="text-muted-foreground">
                        <span className="text-primary font-semibold">{streakDays} {streakDays === 1 ? "dia" : "dias"}</span> com check-in neste mês
                      </p>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        Continue no seu ritmo.
                      </p>
                    </>
                  )}
                </div>
                {/* Simple progress indicator */}
                <div className="hidden sm:block w-24">
                  <div className="h-2 bg-primary/20 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${Math.min((streakDays / currentDayOfMonth) * 100, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground text-center mt-1">
                    {streakDays}/{currentDayOfMonth}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

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
                <p className="text-muted-foreground leading-relaxed">
                  {dailyContent.tonica_short}
                </p>
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

        {/* Meditação do Dia (Premium) */}
        <Card className={!isPremium ? "bg-muted/30" : ""}>
          <CardContent className="p-5">
            {contentLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-32" />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isPremium ? "bg-primary/10" : "bg-muted"}`}>
                    <Moon className={`w-5 h-5 ${isPremium ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
                      Meditação do Dia
                    </p>
                    <h3 className="font-display text-lg font-semibold text-foreground">
                      {dailyContent?.meditation_audio_url ? "Meditação Disponível" : "Sem meditação hoje"}
                    </h3>
                  </div>
                  {!isPremium && (
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-primary/10 rounded-full">
                      <Lock className="w-3.5 h-3.5 text-primary" />
                      <span className="text-xs font-medium text-primary">Premium</span>
                    </div>
                  )}
                </div>

                {dailyContent?.meditation_duration_seconds && isPremium && (
                  <p className="text-sm text-muted-foreground">
                    Duração: {Math.round(dailyContent.meditation_duration_seconds / 60)} minutos
                  </p>
                )}

                {isPremium ? (
                  dailyContent?.meditation_audio_url ? (
                    <Link to={`/meditacao/${today}`}>
                      <Button className="w-full sm:w-auto">
                        Ouvir agora <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </Link>
                  ) : (
                    <p className="text-muted-foreground text-sm">Nenhuma meditação disponível para hoje.</p>
                  )
                ) : (
                  <Link to="/assinar">
                    <Button variant="outline" className="w-full sm:w-auto">
                      Desbloquear Premium <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>

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

        {/* Check-in do Dia */}
        <Card>
          <CardContent className="p-5 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-rose-500/10 flex items-center justify-center">
                <Heart className="w-5 h-5 text-rose-500" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
                  Check-in do Dia
                </p>
                <h3 className="font-display text-lg font-semibold text-foreground">
                  Como você está hoje?
                </h3>
              </div>
            </div>

            {checkinLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            ) : (
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
                    Privacidade
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {([
                      { value: "private", label: "Privado", desc: "Só você vê" },
                      { value: "community", label: "Comunidade", desc: "Público com seu nome" },
                      { value: "anonymous", label: "Anônimo", desc: "Público sem nome" },
                    ] as const).map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => handleShareModeChange(option.value)}
                        disabled={isSaving}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          shareMode === option.value
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                        title={option.desc}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                  {/* Privacy warning for public modes */}
                  {shareMode !== "private" && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                      {shareMode === "community" 
                        ? "Seu nome, energia e texto serão visíveis para todos os usuários"
                        : "Sua energia e texto serão visíveis para todos (sem seu nome)"}
                    </p>
                  )}
                </div>

                {/* Published Toggle */}
                <div className="flex items-center justify-between bg-muted/50 rounded-xl p-4">
                  <div>
                    <label className="text-sm font-medium text-foreground">
                      Publicado
                    </label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {getPrivacyExplanation()}
                    </p>
                  </div>
                  <Switch
                    checked={published}
                    onCheckedChange={setPublished}
                    disabled={isSaving || shareMode === "private"}
                  />
                </div>

                {/* Save Button */}
                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleSaveCheckin}
                  disabled={isSaving || !feelingText.trim()}
                >
                  {isSaving 
                    ? "Salvando..." 
                    : checkin 
                      ? "Salvar alterações" 
                      : "Salvar check-in"
                  }
                </Button>
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
        shareMode={pendingShareMode === "anonymous" ? "anonymous" : "community"}
      />
    </AppLayout>
  );
};

export default Home;
