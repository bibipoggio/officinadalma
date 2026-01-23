import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare, Send, Trash2, Reply, Shield } from "lucide-react";
import { useLessonComments, type LessonComment } from "@/hooks/useLessonComments";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface LessonCommentsProps {
  lessonId: string;
}

function CommentItem({ 
  comment, 
  onReply, 
  onDelete,
  canModerate,
  currentUserId,
  isSubmitting,
  depth = 0,
}: {
  comment: LessonComment;
  onReply: (commentId: string) => void;
  onDelete: (commentId: string) => void;
  canModerate: boolean;
  currentUserId: string | undefined;
  isSubmitting: boolean;
  depth?: number;
}) {
  const isOwner = currentUserId === comment.user_id;
  const canDelete = isOwner || canModerate;
  const isReply = depth > 0;
  
  const initials = comment.user?.display_name
    ?.split(" ")
    .map(n => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "?";

  return (
    <div className={`${isReply ? "ml-8 mt-3" : ""}`}>
      <div className="flex gap-3">
        <Avatar className="w-8 h-8 shrink-0">
          <AvatarImage src={comment.user?.avatar_url || undefined} />
          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
        </Avatar>
        
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm">
              {comment.user?.display_name || "Usuário"}
            </span>
            {canModerate && isReply && (
              <Badge variant="secondary" className="text-xs py-0 px-1.5">
                <Shield className="w-3 h-3 mr-1" />
                Equipe
              </Badge>
            )}
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(comment.created_at), { 
                addSuffix: true, 
                locale: ptBR 
              })}
            </span>
          </div>
          
          <p className="text-sm text-foreground whitespace-pre-wrap">
            {comment.content}
          </p>
          
          <div className="flex items-center gap-2 pt-1">
            {!isReply && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => onReply(comment.id)}
                disabled={isSubmitting}
              >
                <Reply className="w-3 h-3 mr-1" />
                Responder
              </Button>
            )}
            {canDelete && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
                onClick={() => onDelete(comment.id)}
                disabled={isSubmitting}
              >
                <Trash2 className="w-3 h-3 mr-1" />
                Excluir
              </Button>
            )}
          </div>
        </div>
      </div>
      
      {/* Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="border-l-2 border-border pl-3 mt-3">
          {comment.replies.map(reply => (
            <CommentItem
              key={reply.id}
              comment={reply}
              onReply={onReply}
              onDelete={onDelete}
              canModerate={canModerate}
              currentUserId={currentUserId}
              isSubmitting={isSubmitting}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function LessonComments({ lessonId }: LessonCommentsProps) {
  const { user, hasAdminAccess } = useAuth();
  const { toast } = useToast();
  const { comments, isLoading, error, isSubmitting, addComment, deleteComment, canModerate } = useLessonComments(lessonId);
  
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");

  const handleSubmitComment = async () => {
    if (!newComment.trim()) return;
    
    const result = await addComment(newComment, null);
    if (result.success) {
      setNewComment("");
      toast({ title: "Comentário enviado!" });
    } else {
      toast({ 
        title: "Erro", 
        description: result.error,
        variant: "destructive" 
      });
    }
  };

  const handleSubmitReply = async (parentId: string) => {
    if (!replyContent.trim()) return;
    
    const result = await addComment(replyContent, parentId);
    if (result.success) {
      setReplyContent("");
      setReplyingTo(null);
      toast({ title: "Resposta enviada!" });
    } else {
      toast({ 
        title: "Erro", 
        description: result.error,
        variant: "destructive" 
      });
    }
  };

  const handleDelete = async (commentId: string) => {
    const result = await deleteComment(commentId);
    if (result.success) {
      toast({ title: "Comentário excluído" });
    } else {
      toast({ 
        title: "Erro", 
        description: result.error,
        variant: "destructive" 
      });
    }
  };

  const handleReply = (commentId: string) => {
    setReplyingTo(commentId);
    setReplyContent("");
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessageSquare className="w-5 h-5" />
            Comentários e Dúvidas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2].map(i => (
            <div key={i} className="flex gap-3">
              <Skeleton className="w-8 h-8 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-12 w-full" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          {error}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <MessageSquare className="w-5 h-5" />
          Comentários e Dúvidas
          {comments.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {comments.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* New Comment Form */}
        {user ? (
          <div className="space-y-3">
            <Textarea
              placeholder="Escreva seu comentário ou dúvida..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value.slice(0, 1000))}
              className="min-h-[80px]"
              disabled={isSubmitting}
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {newComment.length}/1000
              </span>
              <Button
                onClick={handleSubmitComment}
                disabled={isSubmitting || !newComment.trim()}
                size="sm"
              >
                <Send className="w-4 h-4 mr-2" />
                Enviar
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            Faça login para comentar
          </p>
        )}

        {/* Comments List */}
        {comments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p>Nenhum comentário ainda.</p>
            <p className="text-sm">Seja o primeiro a perguntar!</p>
          </div>
        ) : (
          <div className="space-y-6">
            {comments.map(comment => (
              <div key={comment.id}>
                <CommentItem
                  comment={comment}
                  onReply={handleReply}
                  onDelete={handleDelete}
                  canModerate={canModerate}
                  currentUserId={user?.id}
                  isSubmitting={isSubmitting}
                />
                
                {/* Reply Form */}
                {replyingTo === comment.id && hasAdminAccess && (
                  <div className="ml-11 mt-3 space-y-2">
                    <Textarea
                      placeholder="Escreva sua resposta..."
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value.slice(0, 1000))}
                      className="min-h-[60px]"
                      disabled={isSubmitting}
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleSubmitReply(comment.id)}
                        disabled={isSubmitting || !replyContent.trim()}
                      >
                        <Send className="w-3 h-3 mr-1" />
                        Responder
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setReplyingTo(null)}
                        disabled={isSubmitting}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                )}
                
                {/* Notice for non-moderators trying to reply */}
                {replyingTo === comment.id && !hasAdminAccess && (
                  <div className="ml-11 mt-3 p-3 bg-muted rounded-lg text-sm text-muted-foreground">
                    Apenas moderadores e administradores podem responder comentários.
                    <Button
                      size="sm"
                      variant="ghost"
                      className="ml-2"
                      onClick={() => setReplyingTo(null)}
                    >
                      Fechar
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
