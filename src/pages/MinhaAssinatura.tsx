import { AppLayout } from "@/components/layout/AppLayout";
import { LoadingState } from "@/components/layout/PageState";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CreditCard, BookOpen, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface EnrolledCourse {
  id: string;
  course_id: string;
  access_type: string;
  created_at: string;
  course_title: string;
}

function useEnrolledCoursesDetails() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["enrolled-courses-details", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_enrollments")
        .select("id, course_id, access_type, created_at")
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (!data || data.length === 0) return [];

      const courseIds = data.map((e) => e.course_id);
      const { data: courses } = await supabase
        .from("courses")
        .select("id, title")
        .in("id", courseIds);

      return data.map((e) => ({
        ...e,
        course_title: courses?.find((c) => c.id === e.course_id)?.title || "Curso",
      })) as EnrolledCourse[];
    },
    enabled: !!user,
  });
}

const MinhaAssinatura = () => {
  const navigate = useNavigate();
  const { isPremium, isTrialing, subscription, isLoading: subLoading } = useSubscription();
  const { data: enrolledCourses, isLoading: coursesLoading } = useEnrolledCoursesDetails();

  const isLoading = subLoading || coursesLoading;

  const getStatusInfo = () => {
    if (!subscription) return { label: "Sem assinatura", variant: "secondary" as const, icon: AlertCircle };
    if (isTrialing) return { label: "Período de teste", variant: "default" as const, icon: Clock };
    if (isPremium) return { label: "Ativa", variant: "default" as const, icon: CheckCircle2 };
    return { label: "Expirada", variant: "destructive" as const, icon: AlertCircle };
  };

  const statusInfo = getStatusInfo();

  return (
    <AppLayout>
      <div className="space-y-6">
        <header className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/conta")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-display font-semibold text-foreground">
            Minha Assinatura
          </h1>
        </header>

        {isLoading && <LoadingState message="Carregando assinatura..." />}

        {!isLoading && (
          <>
            {/* Subscription Status */}
            <Card variant="elevated">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <CreditCard className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h2 className="font-display font-semibold text-foreground text-lg">
                      Plano Premium
                    </h2>
                    <Badge variant={statusInfo.variant} className="mt-1">
                      <statusInfo.icon className="w-3 h-3 mr-1" />
                      {statusInfo.label}
                    </Badge>
                  </div>
                </div>

                {subscription && (
                  <div className="space-y-2 pt-2 border-t border-border">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Provedor</span>
                      <span className="text-foreground font-medium">Mercado Pago</span>
                    </div>
                    {subscription.trial_ends_at && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Teste grátis até</span>
                        <span className="text-foreground font-medium">
                          {format(new Date(subscription.trial_ends_at), "dd/MM/yyyy", { locale: ptBR })}
                        </span>
                      </div>
                    )}
                    {subscription.current_period_end && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Válido até</span>
                        <span className="text-foreground font-medium">
                          {format(new Date(subscription.current_period_end), "dd/MM/yyyy", { locale: ptBR })}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {!subscription && (
                  <div className="pt-2">
                    <p className="text-sm text-muted-foreground mb-3">
                      Você ainda não possui uma assinatura ativa.
                    </p>
                    <Button variant="primary" className="w-full" onClick={() => navigate("/inscricao")}>
                      Assinar agora
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Enrolled Courses */}
            <section className="space-y-3">
              <h2 className="text-lg font-display font-semibold text-foreground px-1">
                Cursos Adquiridos
              </h2>

              {(!enrolledCourses || enrolledCourses.length === 0) ? (
                <Card>
                  <CardContent className="p-6 text-center">
                    <BookOpen className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Nenhum curso adquirido ainda.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                enrolledCourses.map((course) => (
                  <Card key={course.id} variant="elevated">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <BookOpen className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0 space-y-1">
                          <p className="font-medium text-foreground truncate">
                            {course.course_title}
                          </p>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="secondary">
                              {course.access_type === "premium" ? "Premium" : course.access_type === "subscription" ? "Assinatura" : course.access_type}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              Desde {format(new Date(course.created_at), "dd/MM/yyyy", { locale: ptBR })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </section>
          </>
        )}
      </div>
    </AppLayout>
  );
};

export default MinhaAssinatura;
