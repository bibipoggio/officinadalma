 import { useState } from "react";
 import { AppLayout } from "@/components/layout/AppLayout";
 import { LoadingState } from "@/components/layout/PageState";
 import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
 import { Button } from "@/components/ui/button";
 import { Progress } from "@/components/ui/progress";
 import { useAdminAnalytics } from "@/hooks/useAdminAnalytics";
 import { useAdminLessonAnalytics } from "@/hooks/useLessonAnalytics";
 import {
   useEnhancedAnalytics,
   useNewUsersHistory,
   type AnalyticsPeriod,
 } from "@/hooks/useEnhancedAnalytics";
 import { useAuth } from "@/contexts/AuthContext";
 import { Navigate } from "react-router-dom";
 import {
   Users,
   UserPlus,
   Activity,
   RefreshCw,
   TrendingUp,
   Eye,
   CheckCircle,
   PlayCircle,
   GraduationCap,
   Headphones,
   Heart,
 } from "lucide-react";
 import {
   ChartContainer,
   ChartTooltip,
   ChartTooltipContent,
 } from "@/components/ui/chart";
 import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, BarChart, Bar } from "recharts";
 import { format, parseISO } from "date-fns";
 import { ptBR } from "date-fns/locale";
 import { AnalyticsMetricCard } from "@/components/admin/AnalyticsMetricCard";
 import { PeriodFilter } from "@/components/admin/PeriodFilter";
 import { UsersReportDialog } from "@/components/admin/UsersReportDialog";
 
 const chartConfig = {
   active_users: {
     label: "Usuários Ativos",
     color: "hsl(var(--primary))",
   },
   new_users: {
     label: "Novos Usuários",
     color: "hsl(var(--chart-2))",
   },
 };
 
 export default function AdminAnalytics() {
   const { hasAdminAccess, isLoading: authLoading } = useAuth();
   const [period, setPeriod] = useState<AnalyticsPeriod>("all");
   
   const { history, isLoading, error, refetch } = useAdminAnalytics();
   const {
     analytics: lessonAnalytics,
     topLessons,
     courseEngagement,
     isLoading: lessonLoading,
     refetch: refetchLessons,
   } = useAdminLessonAnalytics();
   const {
     analytics: enhancedAnalytics,
     isLoading: enhancedLoading,
     refetch: refetchEnhanced,
   } = useEnhancedAnalytics(period);
   const { data: newUsersHistory } = useNewUsersHistory(30);
 
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
 
   if (isLoading || lessonLoading || enhancedLoading) {
     return (
       <AppLayout>
         <LoadingState message="Carregando métricas..." />
       </AppLayout>
     );
   }
 
   const handleRefreshAll = () => {
     refetch();
     refetchLessons();
     refetchEnhanced();
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
 
   const accessChartData = history.map((item) => ({
     date: item.access_date,
     active_users: item.active_users,
     new_users: item.new_users,
     formattedDate: format(parseISO(item.access_date), "dd/MM", { locale: ptBR }),
   }));
 
   const newUsersChartData = (newUsersHistory || []).map((item) => ({
     date: item.date,
     new_users: item.new_users,
     formattedDate: format(parseISO(item.date), "dd/MM", { locale: ptBR }),
   }));
 
   const periodLabel = {
     today: "hoje",
     week: "nos últimos 7 dias",
     month: "este mês",
     all: "no total",
   }[period];
 
   return (
     <AppLayout>
       <div className="space-y-6 max-w-6xl mx-auto">
         {/* Header */}
         <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
           <div>
             <h1 className="text-2xl font-display font-bold">
               Painel de Analytics
             </h1>
             <p className="text-sm text-muted-foreground">
               Métricas da Oficina da Alma
             </p>
           </div>
           <div className="flex flex-wrap items-center gap-2">
             <UsersReportDialog />
             <Button variant="outline" size="sm" onClick={handleRefreshAll}>
               <RefreshCw className="w-4 h-4 mr-2" />
               Atualizar
             </Button>
           </div>
         </div>
 
         {/* Period Filter */}
         <div className="flex items-center gap-4">
           <span className="text-sm text-muted-foreground">Filtrar por:</span>
           <PeriodFilter value={period} onChange={setPeriod} />
         </div>
 
         {/* Main User Metrics */}
         <div>
           <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
             <Users className="w-5 h-5" />
             Usuários
           </h2>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
             <AnalyticsMetricCard
               title="Total de Usuários"
               value={enhancedAnalytics?.total_users || 0}
               icon={<Users className="w-5 h-5" />}
             />
             <AnalyticsMetricCard
               title={`Novos Usuários`}
               value={enhancedAnalytics?.new_users || 0}
               subtitle={periodLabel}
               icon={<UserPlus className="w-5 h-5" />}
             />
             <AnalyticsMetricCard
               title="Ativos Hoje"
               value={enhancedAnalytics?.active_today || 0}
               icon={<Activity className="w-5 h-5" />}
             />
             <AnalyticsMetricCard
               title="Check-ins Hoje"
               value={enhancedAnalytics?.checkins_unique_users || 0}
               subtitle={`${enhancedAnalytics?.checkins_today || 0} check-ins`}
               icon={<Heart className="w-5 h-5" />}
             />
           </div>
         </div>
 
         {/* Meditation Metrics */}
         <div>
           <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
             <Headphones className="w-5 h-5" />
             Meditação do Dia
           </h2>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <AnalyticsMetricCard
               title="Reproduções Hoje"
               value={enhancedAnalytics?.meditation_plays || 0}
               icon={<PlayCircle className="w-5 h-5" />}
             />
             <AnalyticsMetricCard
               title="Usuários que Meditaram"
               value={enhancedAnalytics?.meditation_unique_users || 0}
               subtitle="usuários únicos hoje"
               icon={<Headphones className="w-5 h-5" />}
             />
           </div>
         </div>
 
         {/* New Users Chart */}
         <Card>
           <CardHeader>
             <CardTitle className="text-lg flex items-center gap-2">
               <UserPlus className="w-5 h-5" />
               Novos Usuários (Últimos 30 dias)
             </CardTitle>
           </CardHeader>
           <CardContent>
             {newUsersChartData.length > 0 ? (
               <ChartContainer config={chartConfig} className="h-[200px] w-full">
                 <ResponsiveContainer width="100%" height="100%">
                   <BarChart data={newUsersChartData}>
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
                       width={30}
                     />
                     <ChartTooltip content={<ChartTooltipContent />} />
                     <Bar
                       dataKey="new_users"
                       fill="hsl(var(--primary))"
                       radius={[4, 4, 0, 0]}
                       name="Novos Usuários"
                     />
                   </BarChart>
                 </ResponsiveContainer>
               </ChartContainer>
             ) : (
               <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                 Sem dados suficientes
               </div>
             )}
           </CardContent>
         </Card>
 
         {/* Lesson Analytics Cards */}
         <div>
           <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
             <PlayCircle className="w-5 h-5" />
             Analytics de Aulas
           </h2>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
             <AnalyticsMetricCard
               title="Total de Visualizações"
               value={lessonAnalytics?.total_views || 0}
               icon={<Eye className="w-5 h-5" />}
             />
             <AnalyticsMetricCard
               title="Aulas Concluídas"
               value={lessonAnalytics?.total_completions || 0}
               icon={<CheckCircle className="w-5 h-5" />}
             />
             <AnalyticsMetricCard
               title="Usuários Engajados"
               value={lessonAnalytics?.unique_users || 0}
               icon={<GraduationCap className="w-5 h-5" />}
             />
             <AnalyticsMetricCard
               title="Taxa de Conclusão"
               value={lessonAnalytics?.completion_rate || 0}
               icon={<TrendingUp className="w-5 h-5" />}
               format="percent"
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
 
         {/* Daily Access Chart */}
         <Card>
           <CardHeader>
             <CardTitle className="text-lg flex items-center gap-2">
               <TrendingUp className="w-5 h-5" />
               Acessos Diários (Últimos 30 dias)
             </CardTitle>
           </CardHeader>
           <CardContent>
             {accessChartData.length > 0 ? (
               <ChartContainer config={chartConfig} className="h-[300px] w-full">
                 <ResponsiveContainer width="100%" height="100%">
                   <LineChart data={accessChartData}>
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
                       stroke="hsl(var(--chart-2))"
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
       </div>
     </AppLayout>
   );
 }
