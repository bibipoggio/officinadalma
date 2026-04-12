import { AppLayout } from "@/components/layout/AppLayout";
import { LoadingState, EmptyState } from "@/components/layout/PageState";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, BookOpen, Music, ShoppingBag } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface PurchasedLesson {
  id: string;
  status: string;
  amount_cents: number;
  created_at: string;
  lesson_id: string;
  lesson_title: string | null;
  course_title: string | null;
  course_slug: string | null;
}

interface PurchasedMeditation {
  id: string;
  status: string;
  amount_cents: number;
  created_at: string;
  meditation_id: string;
  meditation_title: string | null;
  meditation_date: string | null;
}

function useMinhasCompras() {
  const { user } = useAuth();

  const lessonsQuery = useQuery({
    queryKey: ["purchased-lessons", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("aulas_compradas")
        .select("id, status, amount_cents, created_at, lesson_id")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch lesson details separately
      const lessonIds = data?.map((p) => p.lesson_id) || [];
      if (lessonIds.length === 0) return [];

      const { data: lessons } = await supabase
        .from("course_lessons")
        .select("id, title, course_id")
        .in("id", lessonIds);

      const courseIds = [...new Set(lessons?.map((l) => l.course_id) || [])];
      const { data: courses } = await supabase
        .from("courses")
        .select("id, title, route_slug")
        .in("id", courseIds);

      return (data || []).map((p) => {
        const lesson = lessons?.find((l) => l.id === p.lesson_id);
        const course = courses?.find((c) => c.id === lesson?.course_id);
        return {
          ...p,
          lesson_title: lesson?.title || null,
          course_title: course?.title || null,
          course_slug: course?.route_slug || null,
        } as PurchasedLesson;
      });
    },
    enabled: !!user,
  });

  const meditationsQuery = useQuery({
    queryKey: ["purchased-meditations", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meditacoes_compradas")
        .select("id, status, amount_cents, created_at, meditation_id")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const medIds = data?.map((p) => p.meditation_id) || [];
      if (medIds.length === 0) return [];

      const { data: meditations } = await supabase
        .from("daily_content")
        .select("id, meditation_title, date")
        .in("id", medIds);

      return (data || []).map((p) => {
        const med = meditations?.find((m) => m.id === p.meditation_id);
        return {
          ...p,
          meditation_title: med?.meditation_title || null,
          meditation_date: med?.date || null,
        } as PurchasedMeditation;
      });
    },
    enabled: !!user,
  });

  return {
    lessons: lessonsQuery.data || [],
    meditations: meditationsQuery.data || [],
    isLoading: lessonsQuery.isLoading || meditationsQuery.isLoading,
  };
}

const statusLabel: Record<string, string> = {
  pendente: "Pendente",
  aprovado: "Aprovado",
  rejeitado: "Rejeitado",
};

const statusVariant = (s: string) => {
  if (s === "aprovado") return "default" as const;
  if (s === "rejeitado") return "destructive" as const;
  return "secondary" as const;
};

const MinhasCompras = () => {
  const navigate = useNavigate();
  const { lessons, meditations, isLoading } = useMinhasCompras();

  const hasAny = lessons.length > 0 || meditations.length > 0;

  return (
    <AppLayout>
      <div className="space-y-6">
        <header className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/conta")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-display font-semibold text-foreground">
            Minhas Compras
          </h1>
        </header>

        {isLoading && <LoadingState message="Carregando compras..." />}

        {!isLoading && !hasAny && (
          <EmptyState
            icon={<ShoppingBag className="w-8 h-8 text-muted-foreground" />}
            title="Nenhuma compra"
            description="Você ainda não comprou nenhuma aula ou meditação avulsa."
          />
        )}

        {!isLoading && lessons.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-lg font-display font-semibold text-foreground px-1">
              Aulas
            </h2>
            {lessons.map((item) => (
              <Card key={item.id} variant="elevated">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <BookOpen className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <p className="font-medium text-foreground truncate">
                        {item.lesson_title || "Aula"}
                      </p>
                      {item.course_title && (
                        <p className="text-sm text-muted-foreground truncate">
                          {item.course_title}
                        </p>
                      )}
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={statusVariant(item.status)}>
                          {statusLabel[item.status] || item.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          R$ {(item.amount_cents / 100).toFixed(2).replace(".", ",")}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(item.created_at), "dd/MM/yyyy", { locale: ptBR })}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </section>
        )}

        {!isLoading && meditations.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-lg font-display font-semibold text-foreground px-1">
              Meditações
            </h2>
            {meditations.map((item) => (
              <Card key={item.id} variant="elevated">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Music className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <p className="font-medium text-foreground truncate">
                        {item.meditation_title || "Meditação"}
                      </p>
                      {item.meditation_date && (
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(item.meditation_date + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR })}
                        </p>
                      )}
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={statusVariant(item.status)}>
                          {statusLabel[item.status] || item.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          R$ {(item.amount_cents / 100).toFixed(2).replace(".", ",")}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(item.created_at), "dd/MM/yyyy", { locale: ptBR })}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </section>
        )}
      </div>
    </AppLayout>
  );
};

export default MinhasCompras;
