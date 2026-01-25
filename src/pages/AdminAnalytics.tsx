import { AppLayout } from "@/components/layout/AppLayout";
import { LoadingState } from "@/components/layout/PageState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAdminAnalytics } from "@/hooks/useAdminAnalytics";
import { useAdminLessonAnalytics } from "@/hooks/useLessonAnalytics";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import {
  Users,
  UserPlus,
  Activity,
  MessageSquare,
  BookOpen,
  RefreshCw,
  TrendingUp,
  Calendar,
  Eye,
  CheckCircle,
  PlayCircle,
  GraduationCap,
} from "lucide-react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface MetricCardProps {
  title: string;
  value: number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: string;
}

function MetricCard({ title, value, subtitle, icon, trend }: MetricCardProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold">{value.toLocaleString("pt-BR")}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
            {trend && (
              <p className="text-xs text-primary flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                {trend}
              </p>
            )}
          </div>
          <div className="p-3 bg-primary/10 rounded-full text-primary">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const chartConfig = {
  active_users: {
    label: "Usuários Ativos",
    color: "hsl(var(--primary))",
  },
  new_users: {
    label: "Novos Usuários",
    color: "hsl(var(--secondary))",
  },
};

export default function AdminAnalytics() {
  const { hasAdminAccess, isLoading: authLoading } = useAuth();
  const { analytics, history, isLoading, error, refetch } = useAdminAnalytics();
  const { 
    analytics: lessonAnalytics, 
    topLessons, 
    courseEngagement, 
    isLoading: lessonLoading, 
    refetch: refetchLessons 
  } = useAdminLessonAnalytics();

  if (authLoading) {
    return (
      <AppLayout>
        <LoadingState message="Verificando permissões..." />
      </AppLayout>
    );
  }

  if (!hasAdminAccess) {
    return <Navigate to="/" replace />;
  }

  if (isLoading || lessonLoading) {
    return (
      <AppLayout>
        <LoadingState message="Carregando métricas..." />
      </AppLayout>
    );
  }

  const handleRefreshAll = () => {
    refetch();
    refetchLessons();
  };

  if (error) {
    return (
      <AppLayout>
        <div className="p-4 text-center">
          <p className="text-destructive mb-4">Erro ao carregar analytics</p>
          <Button onClick={handleRefreshAll}>Tentar novamente</Button>
        </div>
      </AppLayout>
    );
  }

  const chartData = history.map((item) => ({
    date: item.access_date,
    active_users: item.active_users,
    new_users: item.new_users,
    formattedDate: format(parseISO(item.access_date), "dd/MM", { locale: ptBR }),
  }));

  return (
    <AppLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold">
              Painel de Analytics
            </h1>
            <p className="text-sm text-muted-foreground">
              Métricas da Oficina da Alma
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleRefreshAll}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
        </div>

        {/* Lesson Analytics Cards */}
        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <PlayCircle className="w-5 h-5" />
            Analytics de Aulas
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Total de Visualizações"
              value={lessonAnalytics?.total_views || 0}
              icon={<Eye className="w-5 h-5" />}
            />
            <MetricCard
              title="Aulas Concluídas"
              value={lessonAnalytics?.total_completions || 0}
              icon={<CheckCircle className="w-5 h-5" />}
            />
            <MetricCard
              title="Usuários Engajados"
              value={lessonAnalytics?.unique_users || 0}
              icon={<GraduationCap className="w-5 h-5" />}
            />
            <MetricCard
              title="Taxa de Conclusão"
              value={lessonAnalytics?.completion_rate || 0}
              subtitle="%"
              icon={<TrendingUp className="w-5 h-5" />}
            />
          </div>
        </div>

        {/* Top Lessons */}
        {topLessons.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <PlayCircle className="w-5 h-5" />
                Aulas Mais Acessadas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topLessons.slice(0, 5).map((lesson, index) => (
                  <div key={lesson.lesson_id} className="flex items-center gap-3">
                    <span className="text-sm font-medium text-muted-foreground w-6">
                      #{index + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{lesson.lesson_title}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {lesson.course_title}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{lesson.view_count} views</p>
                      <p className="text-xs text-muted-foreground">
                        {lesson.completion_count} concluídas
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Course Engagement */}
        {courseEngagement.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <GraduationCap className="w-5 h-5" />
                Progresso por Curso
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {courseEngagement.map((course) => (
                  <div key={course.course_id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="font-medium truncate flex-1">{course.course_title}</p>
                      <span className="text-sm text-muted-foreground ml-2">
                        {Math.round(course.avg_progress)}%
                      </span>
                    </div>
                    <Progress value={course.avg_progress} className="h-2" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{course.enrolled_users} alunos</span>
                      <span>{course.total_lessons} aulas</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main User Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Total de Usuários"
            value={analytics?.total_users || 0}
            icon={<Users className="w-5 h-5" />}
          />
          <MetricCard
            title="Ativos Hoje (DAU)"
            value={analytics?.active_today || 0}
            icon={<Activity className="w-5 h-5" />}
          />
          <MetricCard
            title="Ativos no Mês (MAU)"
            value={analytics?.active_month || 0}
            icon={<Calendar className="w-5 h-5" />}
          />
          <MetricCard
            title="Novos este Mês"
            value={analytics?.new_users_month || 0}
            subtitle={`${analytics?.new_users_today || 0} hoje`}
            icon={<UserPlus className="w-5 h-5" />}
          />
        </div>

        {/* Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Acessos Diários (Últimos 30 dias)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <XAxis
                      dataKey="formattedDate"
                      tickLine={false}
                      axisLine={false}
                      fontSize={12}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      fontSize={12}
                      width={40}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line
                      type="monotone"
                      dataKey="active_users"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={false}
                      name="Usuários Ativos"
                    />
                    <Line
                      type="monotone"
                      dataKey="new_users"
                      stroke="hsl(var(--secondary))"
                      strokeWidth={2}
                      dot={false}
                      name="Novos Usuários"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Sem dados suficientes para exibir o gráfico
              </div>
            )}
          </CardContent>
        </Card>

        {/* Engagement Metrics */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Métricas de Engajamento</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MetricCard
              title="Tópicos no Fórum"
              value={analytics?.forum_topics || 0}
              subtitle={`${analytics?.forum_replies || 0} respostas`}
              icon={<MessageSquare className="w-5 h-5" />}
            />
            <MetricCard
              title="Diário Hoje"
              value={analytics?.diary_entries_today || 0}
              subtitle="entradas de diário"
              icon={<BookOpen className="w-5 h-5" />}
            />
            <MetricCard
              title="Diário no Mês"
              value={analytics?.diary_entries_month || 0}
              subtitle="entradas de diário"
              icon={<BookOpen className="w-5 h-5" />}
            />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
