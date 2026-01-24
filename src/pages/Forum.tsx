import { AppLayout } from "@/components/layout/AppLayout";
import { LoadingState, EmptyState, ErrorState } from "@/components/layout/PageState";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useForumTopics } from "@/hooks/useForum";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MessageSquare, Plus, ChevronLeft, ChevronRight, ArrowLeft } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return format(date, "dd/MM/yyyy HH:mm", { locale: ptBR });
};

const Forum = () => {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const { topics, totalPages, isLoading, error, refetch } = useForumTopics(currentPage);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/comunidade")}
              className="shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-display font-semibold text-foreground">
                Fórum de Dúvidas
              </h1>
              <p className="text-muted-foreground mt-1">
                Tire suas dúvidas e participe das discussões
              </p>
            </div>
          </div>
          <Button onClick={() => navigate("/comunidade/forum/novo")} className="shrink-0">
            <Plus className="w-4 h-4 mr-2" />
            Novo Tópico
          </Button>
        </header>

        {isLoading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <Skeleton className="w-10 h-10 rounded-full shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                    <Skeleton className="h-6 w-16 rounded-full" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {error && (
          <ErrorState
            title="Erro ao carregar"
            message="Não foi possível carregar os tópicos. Verifique sua conexão."
            onRetry={refetch}
          />
        )}

        {!isLoading && !error && topics.length === 0 && (
          <EmptyState
            icon={<MessageSquare className="w-8 h-8 text-muted-foreground" />}
            title="Nenhum tópico ainda"
            description="Seja o primeiro a criar um tópico no fórum!"
          />
        )}

        {!isLoading && !error && topics.length > 0 && (
          <>
            <div className="space-y-3">
              {topics.map((topic) => {
                const authorName = topic.author?.display_name || "Usuário";
                return (
                  <Link key={topic.id} to={`/comunidade/forum/${topic.id}`}>
                    <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                      <CardContent className="p-5">
                        <div className="flex items-start gap-4">
                          <Avatar className="w-10 h-10 shrink-0">
                            <AvatarImage src={topic.author?.avatar_url || undefined} alt={authorName} />
                            <AvatarFallback className="text-sm font-medium bg-primary/10 text-primary">
                              {authorName.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-foreground truncate">
                              {topic.title}
                            </h3>
                            <p className="text-sm text-muted-foreground mt-1">
                              {authorName} • {formatDate(topic.created_at)}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted text-sm text-muted-foreground shrink-0">
                            <MessageSquare className="w-3.5 h-3.5" />
                            {topic.reply_count}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>

            {totalPages > 1 && (
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => handlePageChange(currentPage - 1)}
                      className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <PaginationItem key={page}>
                      <PaginationLink
                        onClick={() => handlePageChange(page)}
                        isActive={page === currentPage}
                        className="cursor-pointer"
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  <PaginationItem>
                    <PaginationNext
                      onClick={() => handlePageChange(currentPage + 1)}
                      className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
};

export default Forum;
