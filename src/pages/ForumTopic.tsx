import { AppLayout } from "@/components/layout/AppLayout";
import { LoadingState, ErrorState } from "@/components/layout/PageState";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Modal } from "@/components/ui/Modal";
import { useForumTopic, useForumReport, ForumReply } from "@/hooks/useForum";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowLeft, Flag, Trash2, Send } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return format(date, "dd/MM/yyyy HH:mm", { locale: ptBR });
};

const formatRelativeTime = (dateStr: string) => {
  const date = new Date(dateStr);
  return formatDistanceToNow(date, { addSuffix: true, locale: ptBR });
};

const ForumTopic = () => {
  const { topicId } = useParams<{ topicId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { hasAdminAccess } = useAuth();
  
  const {
    topic,
    replies,
    isLoading,
    error,
    isSubmitting,
    addReply,
    softDeleteTopic,
    softDeleteReply,
    refetch,
    canModerate,
  } = useForumTopic(topicId);
  
  const { reportContent, isSubmitting: isReporting } = useForumReport();

  const [newReply, setNewReply] = useState("");
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportTarget, setReportTarget] = useState<{ type: "topic" | "reply"; id: string } | null>(null);

  const handleSubmitReply = async () => {
    if (!newReply.trim()) return;

    const result = await addReply(newReply.trim());
    if (result.success) {
      setNewReply("");
      toast({
        title: "Resposta enviada",
        description: "Sua resposta foi publicada com sucesso.",
      });
    } else {
      toast({
        title: "Erro",
        description: "Não foi possível enviar sua resposta.",
        variant: "destructive",
      });
    }
  };

  const handleOpenReport = (type: "topic" | "reply", id: string) => {
    setReportTarget({ type, id });
    setReportReason("");
    setShowReportModal(true);
  };

  const handleSubmitReport = async () => {
    if (!reportTarget || !reportReason.trim()) return;

    const result = await reportContent(reportTarget.type, reportTarget.id, reportReason.trim());
    if (result.success) {
      toast({
        title: "Recebido",
        description: "Obrigado por ajudar a manter este espaço seguro.",
      });
      setShowReportModal(false);
      setReportTarget(null);
      setReportReason("");
    } else {
      toast({
        title: "Erro",
        description: "Não foi possível enviar a denúncia.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteTopic = async () => {
    if (!window.confirm("Tem certeza que deseja remover este tópico?")) return;

    const result = await softDeleteTopic();
    if (result.success) {
      toast({
        title: "Tópico removido",
        description: "O tópico foi removido com sucesso.",
      });
      navigate("/comunidade/forum");
    } else {
      toast({
        title: "Erro",
        description: "Não foi possível remover o tópico.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteReply = async (replyId: string) => {
    if (!window.confirm("Tem certeza que deseja remover esta resposta?")) return;

    const result = await softDeleteReply(replyId);
    if (result.success) {
      toast({
        title: "Resposta removida",
        description: "A resposta foi removida com sucesso.",
      });
    } else {
      toast({
        title: "Erro",
        description: "Não foi possível remover a resposta.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <Skeleton className="w-8 h-8" />
            <Skeleton className="h-8 w-64" />
          </div>
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <Skeleton className="w-10 h-10 rounded-full" />
                <div className="space-y-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              <Skeleton className="h-24 w-full" />
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  if (error || !topic) {
    return (
      <AppLayout>
        <ErrorState
          title="Tópico não encontrado"
          message="Este tópico não existe ou foi removido."
          onRetry={() => navigate("/comunidade/forum")}
        />
      </AppLayout>
    );
  }

  const topicAuthorName = topic.author?.display_name || "Usuário";

  return (
    <AppLayout>
      <div className="space-y-6">
        <header className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/comunidade/forum")}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-xl font-display font-semibold text-foreground truncate">
            {topic.title}
          </h1>
        </header>

        {/* Topic Content */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={topic.author?.avatar_url || undefined} alt={topicAuthorName} />
                  <AvatarFallback className="text-sm font-medium bg-primary/10 text-primary">
                    {topicAuthorName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-foreground">{topicAuthorName}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(topic.created_at)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => handleOpenReport("topic", topic.id)}
                >
                  <Flag className="w-4 h-4" />
                </Button>
                {canModerate && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={handleDeleteTopic}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
            <p className="text-foreground leading-relaxed whitespace-pre-wrap">
              {topic.content}
            </p>
          </CardContent>
        </Card>

        {/* Replies Section */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">
            Respostas ({replies.length})
          </h2>

          {replies.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                Ainda não há respostas. Seja o primeiro a responder!
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {replies.map((reply) => {
                const replyAuthorName = reply.author?.display_name || "Usuário";
                return (
                  <Card key={reply.id}>
                    <CardContent className="p-5 space-y-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={reply.author?.avatar_url || undefined} alt={replyAuthorName} />
                            <AvatarFallback className="text-xs font-medium bg-primary/10 text-primary">
                              {replyAuthorName.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm text-foreground">{replyAuthorName}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatRelativeTime(reply.created_at)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                            onClick={() => handleOpenReport("reply", reply.id)}
                          >
                            <Flag className="w-3.5 h-3.5" />
                          </Button>
                          {canModerate && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                              onClick={() => handleDeleteReply(reply.id)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                      <p className="text-foreground text-sm leading-relaxed whitespace-pre-wrap">
                        {reply.content}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Reply Form */}
        <Card>
          <CardContent className="p-4">
            <div className="space-y-3">
              <Textarea
                value={newReply}
                onChange={(e) => setNewReply(e.target.value.slice(0, 2000))}
                placeholder="Escreva sua resposta..."
                className="min-h-[100px] resize-none"
                disabled={isSubmitting}
              />
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {newReply.length}/2000
                </p>
                <Button
                  onClick={handleSubmitReply}
                  disabled={isSubmitting || !newReply.trim()}
                >
                  <Send className="w-4 h-4 mr-2" />
                  {isSubmitting ? "Enviando..." : "Responder"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Report Modal */}
      <Modal
        open={showReportModal}
        onOpenChange={setShowReportModal}
        title="Denunciar conteúdo"
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
            placeholder="Por que você está denunciando este conteúdo?"
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

export default ForumTopic;
