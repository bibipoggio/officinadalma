import { AppLayout } from "@/components/layout/AppLayout";
import { LoadingState, EmptyState, ErrorState } from "@/components/layout/PageState";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Modal } from "@/components/ui/Modal";
import { 
  useCommunityFeed, 
  REACTION_EMOJIS,
  type CommunityCheckin,
} from "@/hooks/useCommunityFeed";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Users, Flag, Zap, RefreshCw } from "lucide-react";

const formatDateDisplay = (dateStr: string) => {
  const date = new Date(dateStr + "T12:00:00");
  return format(date, "dd/MM/yyyy", { locale: ptBR });
};

const getEnergyColor = (energy: number) => {
  if (energy <= 3) return "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400";
  if (energy <= 6) return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
  return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
};

const truncateText = (text: string, maxLength: number = 180) => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + "...";
};

const Comunidade = () => {
  const { toast } = useToast();
  const { 
    checkins, 
    isLoading, 
    error, 
    refetch, 
    toggleReaction, 
    reportCheckin,
  } = useCommunityFeed();

  const [selectedCheckin, setSelectedCheckin] = useState<CommunityCheckin | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [isReporting, setIsReporting] = useState(false);
  const [checkinToReport, setCheckinToReport] = useState<string | null>(null);

  const handleOpenDetail = (checkin: CommunityCheckin) => {
    setSelectedCheckin(checkin);
    setShowDetailModal(true);
  };

  const handleOpenReport = (checkinId: string) => {
    setCheckinToReport(checkinId);
    setReportReason("");
    setShowReportModal(true);
  };

  const handleSubmitReport = async () => {
    if (!checkinToReport || !reportReason.trim()) return;

    setIsReporting(true);
    const result = await reportCheckin(checkinToReport, reportReason.trim());
    setIsReporting(false);

    if (result.success) {
      toast({
        title: "Recebido",
        description: "Obrigado por ajudar a manter este espaço seguro.",
      });
      setShowReportModal(false);
      setCheckinToReport(null);
      setReportReason("");
    } else {
      toast({
        title: "Erro",
        description: "Não foi possível enviar a denúncia. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleReaction = async (checkinId: string, emoji: string) => {
    await toggleReaction(checkinId, emoji);
  };

  const renderCheckinCard = (checkin: CommunityCheckin) => {
    const authorName = checkin.share_mode === "anonymous" 
      ? "Anônimo" 
      : checkin.display_name || "Usuário";
    
    const previewText = truncateText(checkin.feeling_text);
    const hasMore = checkin.feeling_text.length > 180;

    return (
      <Card key={checkin.id} className="overflow-hidden">
        <CardContent className="p-5 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-lg font-medium text-primary">
                  {authorName.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <p className="font-medium text-foreground">{authorName}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDateDisplay(checkin.date)}
                </p>
              </div>
            </div>
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${getEnergyColor(checkin.energy)}`}>
              <Zap className="w-3.5 h-3.5" />
              {checkin.energy}/10
            </div>
          </div>

          {/* Text Preview */}
          <p className="text-foreground leading-relaxed">
            {previewText}
            {hasMore && (
              <button
                onClick={() => handleOpenDetail(checkin)}
                className="ml-1 text-primary hover:underline font-medium"
              >
                Ver mais
              </button>
            )}
          </p>

          {/* Reactions */}
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="flex flex-wrap gap-1.5">
              {REACTION_EMOJIS.map((emoji) => {
                const reactionData = checkin.reactions.find(r => r.emoji === emoji);
                const count = reactionData?.count || 0;
                const hasReacted = checkin.userReactions.includes(emoji);

                return (
                  <button
                    key={emoji}
                    onClick={() => handleReaction(checkin.id, emoji)}
                    className={`
                      flex items-center gap-1 px-2.5 py-1.5 rounded-full text-sm transition-all
                      ${hasReacted 
                        ? "bg-primary/20 text-primary ring-1 ring-primary/30" 
                        : "bg-muted hover:bg-muted/80 text-foreground"
                      }
                    `}
                  >
                    <span>{emoji}</span>
                    {count > 0 && (
                      <span className="text-xs font-medium">{count}</span>
                    )}
                  </button>
                );
              })}
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-destructive"
              onClick={() => handleOpenReport(checkin.id)}
            >
              <Flag className="w-4 h-4" />
              <span className="sr-only">Denunciar</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-semibold text-foreground">
              Comunidade
            </h1>
            <p className="text-muted-foreground mt-1">
              Últimos 7 dias de check-ins compartilhados
            </p>
          </div>
          {!isLoading && !error && (
            <Button variant="ghost" size="icon" onClick={refetch}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          )}
        </header>

        {isLoading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className="w-10 h-10 rounded-full" />
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <div className="flex gap-2 pt-2">
                    <Skeleton className="h-8 w-12 rounded-full" />
                    <Skeleton className="h-8 w-12 rounded-full" />
                    <Skeleton className="h-8 w-12 rounded-full" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        
        {error && (
          <ErrorState 
            title="Erro ao carregar"
            message="Não foi possível carregar a comunidade. Verifique sua conexão."
            onRetry={refetch}
          />
        )}

        {!isLoading && !error && checkins.length === 0 && (
          <EmptyState
            icon={<Users className="w-8 h-8 text-muted-foreground" />}
            title="Ainda não há check-ins compartilhados"
            description="Ainda não há check-ins compartilhados nos últimos 7 dias."
          />
        )}

        {!isLoading && !error && checkins.length > 0 && (
          <div className="space-y-4">
            {checkins.map(renderCheckinCard)}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <Modal
        open={showDetailModal}
        onOpenChange={setShowDetailModal}
        title={selectedCheckin?.share_mode === "anonymous" 
          ? "Anônimo" 
          : selectedCheckin?.display_name || "Usuário"
        }
        size="lg"
      >
        {selectedCheckin && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">
                {formatDateDisplay(selectedCheckin.date)}
              </span>
              <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-sm font-medium ${getEnergyColor(selectedCheckin.energy)}`}>
                <Zap className="w-3.5 h-3.5" />
                Energia: {selectedCheckin.energy}/10
              </div>
            </div>
            
            <p className="text-foreground leading-relaxed whitespace-pre-wrap">
              {selectedCheckin.feeling_text}
            </p>

            {/* Reactions in modal */}
            <div className="flex flex-wrap gap-2 pt-4 border-t">
              {REACTION_EMOJIS.map((emoji) => {
                const reactionData = selectedCheckin.reactions.find(r => r.emoji === emoji);
                const count = reactionData?.count || 0;
                const hasReacted = selectedCheckin.userReactions.includes(emoji);

                return (
                  <button
                    key={emoji}
                    onClick={() => {
                      handleReaction(selectedCheckin.id, emoji);
                      // Update local state
                      setSelectedCheckin(prev => {
                        if (!prev) return null;
                        const newHasReacted = !hasReacted;
                        let newReactions = [...prev.reactions];
                        let newUserReactions = [...prev.userReactions];

                        if (newHasReacted) {
                          newUserReactions.push(emoji);
                          const existing = newReactions.find(r => r.emoji === emoji);
                          if (existing) {
                            newReactions = newReactions.map(r =>
                              r.emoji === emoji ? { ...r, count: r.count + 1 } : r
                            );
                          } else {
                            newReactions.push({ emoji, count: 1 });
                          }
                        } else {
                          newUserReactions = newUserReactions.filter(e => e !== emoji);
                          newReactions = newReactions.map(r =>
                            r.emoji === emoji ? { ...r, count: Math.max(0, r.count - 1) } : r
                          ).filter(r => r.count > 0);
                        }

                        return { ...prev, userReactions: newUserReactions, reactions: newReactions };
                      });
                    }}
                    className={`
                      flex items-center gap-1.5 px-3 py-2 rounded-full text-base transition-all
                      ${hasReacted 
                        ? "bg-primary/20 text-primary ring-1 ring-primary/30" 
                        : "bg-muted hover:bg-muted/80 text-foreground"
                      }
                    `}
                  >
                    <span>{emoji}</span>
                    {count > 0 && (
                      <span className="text-sm font-medium">{count}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </Modal>

      {/* Report Modal */}
      <Modal
        open={showReportModal}
        onOpenChange={setShowReportModal}
        title="Denunciar check-in"
        description="Descreva o motivo da denúncia. Sua identidade será mantida em sigilo."
        footer={
          <>
            <Button 
              variant="ghost" 
              onClick={() => setShowReportModal(false)}
              disabled={isReporting}
            >
              Cancelar
            </Button>
            <Button 
              variant="destructive"
              onClick={handleSubmitReport}
              disabled={isReporting || !reportReason.trim()}
            >
              {isReporting ? "Enviando..." : "Enviar denúncia"}
            </Button>
          </>
        }
      >
        <div className="space-y-2">
          <Textarea
            value={reportReason}
            onChange={(e) => setReportReason(e.target.value.slice(0, 300))}
            placeholder="Por que você está denunciando este check-in?"
            className="min-h-[100px] resize-none"
            disabled={isReporting}
          />
          <p className="text-right text-xs text-muted-foreground">
            {reportReason.length}/300
          </p>
        </div>
      </Modal>
    </AppLayout>
  );
};

export default Comunidade;
