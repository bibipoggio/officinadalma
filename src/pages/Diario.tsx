import { AppLayout } from "@/components/layout/AppLayout";
import { LoadingState, EmptyState, ErrorState } from "@/components/layout/PageState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Modal } from "@/components/ui/Modal";
import { SliderEnergia } from "@/components/ui/SliderEnergia";
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  PrivacyDisclaimerModal, 
  hasAcceptedPrivacyDisclaimer 
} from "@/components/ui/PrivacyDisclaimerModal";
import {
  BookOpen,
  CalendarDays,
  BookMarked,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Eye,
  EyeOff,
  Users,
  Lock,
  User,
  GraduationCap,
} from "lucide-react";
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { format, startOfMonth, endOfMonth, isSameMonth, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import {
  useMonthlyCheckins,
  useCheckinHistory,
  useUpdateCheckin,
  useMyEnrollments,
  getEnergyColor,
  getEnergyBadgeColor,
  type FilterState,
} from "@/hooks/useDiario";
import type { Checkin, ShareMode } from "@/hooks/useSubscription";
import { cn } from "@/lib/utils";
import { StreakAchievement } from "@/components/streak/StreakAchievement";

// Format date to PT-BR
const formatDatePtBr = (dateStr: string) => {
  const date = parseISO(dateStr);
  return format(date, "dd/MM/yyyy", { locale: ptBR });
};

// Share mode labels
const shareModeLabels: Record<ShareMode, string> = {
  private: "Privado",
  community: "Comunidade",
  anonymous: "Anônimo",
};

const shareModeIcons: Record<ShareMode, React.ReactNode> = {
  private: <Lock className="w-3 h-3" />,
  community: <Users className="w-3 h-3" />,
  anonymous: <User className="w-3 h-3" />,
};

// Filter chips config
const periodOptions = [
  { value: "all", label: "Todo período" },
  { value: "7days", label: "7 dias" },
  { value: "30days", label: "30 dias" },
  { value: "thisMonth", label: "Este mês" },
];

const visibilityOptions = [
  { value: "all", label: "Todos" },
  { value: "published", label: "Publicados" },
  { value: "unpublished", label: "Não publicados" },
];

const shareModeOptions = [
  { value: "all", label: "Todos" },
  { value: "private", label: "Privado" },
  { value: "community", label: "Comunidade" },
  { value: "anonymous", label: "Anônimo" },
];

const Diario = () => {
  const navigate = useNavigate();
  const [currentMonth] = useState(new Date());
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<FilterState>({
    period: "all",
    visibility: "all",
    shareMode: "all",
  });

  // Modals
  const [selectedCheckin, setSelectedCheckin] = useState<Checkin | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);

  // Edit form state
  const [editEnergy, setEditEnergy] = useState(5);
  const [editText, setEditText] = useState("");
  const [editShareMode, setEditShareMode] = useState<ShareMode>("private");
  const [editPublished, setEditPublished] = useState(false);
  
  // Privacy modal state
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [pendingShareMode, setPendingShareMode] = useState<ShareMode | null>(null);

  // Hooks
  const { checkins: monthlyCheckins, isLoading: loadingCalendar, error: calendarError, refetch: refetchCalendar } = useMonthlyCheckins();
  const { checkins: historyCheckins, totalPages, isLoading: loadingHistory, error: historyError, refetch: refetchHistory } = useCheckinHistory(filters, page);
  const { updateCheckin, isUpdating } = useUpdateCheckin();
  const { enrollments, isLoading: loadingEnrollments, error: enrollmentsError, refetch: refetchEnrollments } = useMyEnrollments();

  // Create a map of dates with checkins for the calendar
  const checkinsByDate = useMemo(() => {
    const map = new Map<string, Checkin>();
    monthlyCheckins.forEach((c) => {
      map.set(c.date, c);
    });
    return map;
  }, [monthlyCheckins]);

  // Custom day render for calendar
  const modifiers = useMemo(() => {
    const hasCheckin: Date[] = [];
    monthlyCheckins.forEach((c) => {
      hasCheckin.push(parseISO(c.date));
    });
    return { hasCheckin };
  }, [monthlyCheckins]);

  const handleDayClick = (day: Date) => {
    const dateStr = format(day, "yyyy-MM-dd");
    const checkin = checkinsByDate.get(dateStr);

    if (checkin) {
      setSelectedCheckin(checkin);
      setViewModalOpen(true);
    } else if (isSameMonth(day, currentMonth) && day <= new Date()) {
      // Suggest going to home to check in
      toast.info("Faça seu check-in do dia", {
        description: "Vá para a página inicial para registrar como você está.",
        action: {
          label: "Ir para Home",
          onClick: () => navigate("/"),
        },
      });
    }
  };

  const openEditModal = (checkin: Checkin) => {
    setSelectedCheckin(checkin);
    setEditEnergy(checkin.energy);
    setEditText(checkin.feeling_text);
    setEditShareMode(checkin.share_mode);
    setEditPublished(checkin.published);
    setViewModalOpen(false);
    setEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedCheckin) return;

    const result = await updateCheckin(selectedCheckin.id, {
      energy: editEnergy,
      feeling_text: editText,
      share_mode: editShareMode,
      published: editPublished,
    });

    if (result.success) {
      toast.success("Check-in atualizado.");
      setEditModalOpen(false);
      refetchHistory();
      refetchCalendar();
    } else {
      toast.error("Não foi possível atualizar. Tente novamente.");
    }
  };

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  // Handle share mode change with privacy check
  const handleEditShareModeChange = (newMode: ShareMode) => {
    if ((newMode === "community" || newMode === "anonymous") && !hasAcceptedPrivacyDisclaimer()) {
      setPendingShareMode(newMode);
      setShowPrivacyModal(true);
    } else {
      setEditShareMode(newMode);
    }
  };

  const handlePrivacyAccept = () => {
    if (pendingShareMode) {
      setEditShareMode(pendingShareMode);
      setPendingShareMode(null);
    }
    setShowPrivacyModal(false);
  };

  const handlePrivacyCancel = () => {
    setPendingShareMode(null);
    setShowPrivacyModal(false);
  };

  const isLoading = loadingCalendar || loadingHistory || loadingEnrollments;
  const hasError = calendarError || historyError || enrollmentsError;

  const handleRetry = () => {
    refetchCalendar();
    refetchHistory();
    refetchEnrollments();
  };

  if (isLoading && !historyCheckins.length && !monthlyCheckins.length && !enrollments.length) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <header>
            <h1 className="text-2xl font-display font-semibold text-foreground">Meu Diário</h1>
            <p className="text-muted-foreground mt-1">
              Seus registros pessoais de check-in e reflexões
            </p>
          </header>
          <LoadingState message="Carregando seu diário..." />
        </div>
      </AppLayout>
    );
  }

  if (hasError) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <header>
            <h1 className="text-2xl font-display font-semibold text-foreground">Meu Diário</h1>
            <p className="text-muted-foreground mt-1">
              Seus registros pessoais de check-in e reflexões
            </p>
          </header>
          <ErrorState
            title="Erro ao carregar"
            message="Não foi possível carregar seu diário. Tente novamente."
            onRetry={handleRetry}
          />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <header>
          <h1 className="text-2xl font-display font-semibold text-foreground">Meu Diário</h1>
          <p className="text-muted-foreground mt-1">
            Seus registros pessoais de check-in e reflexões
          </p>
        </header>

        <Tabs defaultValue="calendario" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
            <TabsTrigger value="calendario" className="gap-2">
              <CalendarDays className="w-4 h-4" />
              <span className="hidden sm:inline">Calendário</span>
            </TabsTrigger>
            <TabsTrigger value="historico" className="gap-2">
              <BookOpen className="w-4 h-4" />
              <span className="hidden sm:inline">Histórico</span>
            </TabsTrigger>
            <TabsTrigger value="cursos" className="gap-2">
              <GraduationCap className="w-4 h-4" />
              <span className="hidden sm:inline">Meus Cursos</span>
            </TabsTrigger>
          </TabsList>

          {/* Streak Achievement Section - below quick access bar */}
          <StreakAchievement />

          {/* Calendar Tab */}
          <TabsContent value="calendario" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-medium flex items-center gap-2">
                  <CalendarDays className="w-5 h-5 text-primary" />
                  {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-center">
                  <Calendar
                    mode="single"
                    month={currentMonth}
                    onDayClick={handleDayClick}
                    modifiers={modifiers}
                    modifiersStyles={{
                      hasCheckin: {
                        fontWeight: "bold",
                      },
                    }}
                    components={{
                      Day: ({ date, ...props }) => {
                        const dateStr = format(date, "yyyy-MM-dd");
                        const checkin = checkinsByDate.get(dateStr);
                        const isToday = format(new Date(), "yyyy-MM-dd") === dateStr;
                        const isCurrentMonth = isSameMonth(date, currentMonth);

                        return (
                          <button
                            {...props}
                            onClick={() => handleDayClick(date)}
                            className={cn(
                              "relative flex h-9 w-9 items-center justify-center rounded-md text-sm transition-colors",
                              isCurrentMonth
                                ? "text-foreground hover:bg-accent"
                                : "text-muted-foreground/50",
                              isToday && "ring-2 ring-primary ring-offset-1"
                            )}
                          >
                            {date.getDate()}
                            {checkin && (
                              <span
                                className={cn(
                                  "absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full",
                                  getEnergyColor(checkin.energy)
                                )}
                              />
                            )}
                          </button>
                        );
                      },
                    }}
                    className="rounded-md border-0"
                  />
                </div>

                {/* Legend */}
                <div className="mt-6 pt-4 border-t">
                  <p className="text-xs text-muted-foreground mb-2">Energia por cor:</p>
                  <div className="flex flex-wrap gap-3 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-full bg-gray-300" />
                      <span>0-2</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-full bg-blue-200" />
                      <span>3-4</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-full bg-purple-200" />
                      <span>5-6</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-full bg-amethyst-light" />
                      <span>7-8</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-full bg-primary/70" />
                      <span>9-10</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="historico" className="space-y-4">
            {/* Filters */}
            <Card>
              <CardContent className="p-4 space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Período</Label>
                  <div className="flex flex-wrap gap-2">
                    {periodOptions.map((opt) => (
                      <Badge
                        key={opt.value}
                        variant={filters.period === opt.value ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => handleFilterChange("period", opt.value)}
                      >
                        {opt.label}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Visibilidade</Label>
                  <div className="flex flex-wrap gap-2">
                    {visibilityOptions.map((opt) => (
                      <Badge
                        key={opt.value}
                        variant={filters.visibility === opt.value ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => handleFilterChange("visibility", opt.value)}
                      >
                        {opt.label}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Compartilhamento</Label>
                  <div className="flex flex-wrap gap-2">
                    {shareModeOptions.map((opt) => (
                      <Badge
                        key={opt.value}
                        variant={filters.shareMode === opt.value ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => handleFilterChange("shareMode", opt.value)}
                      >
                        {opt.label}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Checkin List */}
            {loadingHistory ? (
              <LoadingState message="Carregando histórico..." />
            ) : historyCheckins.length === 0 ? (
              <EmptyState
                icon={<BookOpen className="w-8 h-8 text-muted-foreground" />}
                title="Nenhum check-in encontrado"
                description="Ajuste os filtros ou faça seu primeiro check-in."
                action={{
                  label: "Fazer Check-in",
                  onClick: () => navigate("/"),
                }}
              />
            ) : (
              <div className="space-y-3">
                {historyCheckins.map((checkin) => (
                  <Card key={checkin.id} className="transition-shadow hover:shadow-card">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm font-medium">
                              {formatDatePtBr(checkin.date)}
                            </span>
                            <Badge className={cn("text-xs", getEnergyBadgeColor(checkin.energy))}>
                              Energia: {checkin.energy}
                            </Badge>
                          </div>

                          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                            {checkin.feeling_text || "Sem texto"}
                          </p>

                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              {shareModeIcons[checkin.share_mode]}
                              {shareModeLabels[checkin.share_mode]}
                            </span>
                            <span className="flex items-center gap-1">
                              {checkin.published ? (
                                <>
                                  <Eye className="w-3 h-3" />
                                  Publicado
                                </>
                              ) : (
                                <>
                                  <EyeOff className="w-3 h-3" />
                                  Não publicado
                                </>
                              )}
                            </span>
                          </div>
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditModal(checkin)}
                          aria-label="Editar check-in"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 pt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Página {page} de {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* Courses Tab */}
          <TabsContent value="cursos" className="space-y-4">
            {loadingEnrollments ? (
              <LoadingState message="Carregando seus cursos..." />
            ) : enrollments.length === 0 ? (
              <EmptyState
                icon={<BookMarked className="w-8 h-8 text-muted-foreground" />}
                title="Você ainda não está matriculado"
                description="Explore os cursos disponíveis e comece sua jornada."
                action={{
                  label: "Ver Cursos",
                  onClick: () => navigate("/aulas"),
                }}
              />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {enrollments.map((enrollment) => (
                  <Card
                    key={enrollment.id}
                    className="overflow-hidden transition-shadow hover:shadow-card"
                  >
                    {enrollment.courses.cover_image_url && (
                      <div className="aspect-video bg-muted">
                        <img
                          src={enrollment.courses.cover_image_url}
                          alt={enrollment.courses.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="font-medium line-clamp-1">
                          {enrollment.courses.title}
                        </h3>
                        <Badge variant="secondary" className="text-xs shrink-0">
                          {enrollment.courses.type === "aparte" ? "Premium" : "Básico"}
                        </Badge>
                      </div>

                      {enrollment.courses.description_short && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                          {enrollment.courses.description_short}
                        </p>
                      )}

                      <Button
                        className="w-full"
                        onClick={() => navigate(`/aulas/${enrollment.courses.route_slug}`)}
                      >
                        Acessar
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* View Modal */}
      <Modal
        open={viewModalOpen}
        onOpenChange={setViewModalOpen}
        title={selectedCheckin ? formatDatePtBr(selectedCheckin.date) : "Check-in"}
        description="Detalhes do seu check-in"
        size="default"
        footer={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setViewModalOpen(false)}>
              Fechar
            </Button>
            <Button onClick={() => selectedCheckin && openEditModal(selectedCheckin)}>
              <Edit2 className="w-4 h-4 mr-2" />
              Editar
            </Button>
          </div>
        }
      >
        {selectedCheckin && (
          <div className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground">Energia</Label>
              <Badge className={cn("mt-1", getEnergyBadgeColor(selectedCheckin.energy))}>
                {selectedCheckin.energy}/10
              </Badge>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Como você estava</Label>
              <p className="mt-1 text-sm">
                {selectedCheckin.feeling_text || "Sem texto registrado"}
              </p>
            </div>

            <div className="flex gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Privacidade</Label>
                <p className="mt-1 text-sm flex items-center gap-1">
                  {shareModeIcons[selectedCheckin.share_mode]}
                  {shareModeLabels[selectedCheckin.share_mode]}
                </p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Status</Label>
                <p className="mt-1 text-sm flex items-center gap-1">
                  {selectedCheckin.published ? (
                    <>
                      <Eye className="w-3 h-3" /> Publicado
                    </>
                  ) : (
                    <>
                      <EyeOff className="w-3 h-3" /> Não publicado
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit Modal */}
      <Modal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        title="Editar Check-in"
        description={selectedCheckin ? formatDatePtBr(selectedCheckin.date) : ""}
        size="lg"
        footer={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setEditModalOpen(false)} disabled={isUpdating}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit} disabled={isUpdating}>
              {isUpdating ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        }
      >
        <div className="space-y-6">
          <SliderEnergia
            value={editEnergy}
            onChange={setEditEnergy}
            showLabels
            label="Energia"
          />

          <div className="space-y-2">
            <Label htmlFor="edit-feeling">Como você estava?</Label>
            <Textarea
              id="edit-feeling"
              value={editText}
              onChange={(e) => setEditText(e.target.value.slice(0, 500))}
              placeholder="Descreva como você estava se sentindo..."
              rows={4}
            />
            <p className="text-xs text-muted-foreground text-right">
              {editText.length}/500
            </p>
          </div>

          <div className="space-y-2">
            <Label>Privacidade</Label>
            <div className="flex gap-2">
              {(["private", "community", "anonymous"] as ShareMode[]).map((mode) => (
                <Badge
                  key={mode}
                  variant={editShareMode === mode ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => handleEditShareModeChange(mode)}
                >
                  {shareModeIcons[mode]}
                  <span className="ml-1">{shareModeLabels[mode]}</span>
                </Badge>
              ))}
            </div>
            {/* Privacy warning for public modes */}
            {editShareMode !== "private" && (
              <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                {editShareMode === "community" 
                  ? "Seu nome, energia e texto serão visíveis para todos"
                  : "Sua energia e texto serão visíveis (sem seu nome)"}
              </p>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="edit-published">Publicado</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                {editPublished
                  ? editShareMode === "anonymous"
                    ? "A comunidade vê como Anônimo."
                    : "A comunidade vê com seu nome."
                  : "Somente você vê."}
              </p>
            </div>
            <Switch
              id="edit-published"
              checked={editPublished}
              onCheckedChange={setEditPublished}
              disabled={editShareMode === "private"}
            />
          </div>
        </div>
      </Modal>

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

export default Diario;
