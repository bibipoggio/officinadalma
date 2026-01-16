import { AppLayout } from "@/components/layout/AppLayout";
import { LoadingState, EmptyState, ErrorState } from "@/components/layout/PageState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/Modal";
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
  Clock,
  User,
  Users,
  MessageSquare,
  Zap,
} from "lucide-react";
import { useState, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { useModeration, type ReportWithCheckin } from "@/hooks/useModeration";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

type ReportStatus = Database["public"]["Enums"]["report_status"];

const statusConfig: Record<ReportStatus, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { 
    label: "Pendente", 
    color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
    icon: <Clock className="w-3 h-3" />
  },
  reviewed: { 
    label: "Revisado", 
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    icon: <Eye className="w-3 h-3" />
  },
  dismissed: { 
    label: "Dispensado", 
    color: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
    icon: <XCircle className="w-3 h-3" />
  },
  actioned: { 
    label: "Ação Tomada", 
    color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    icon: <CheckCircle className="w-3 h-3" />
  },
};

const filterOptions: { value: ReportStatus | "all"; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "pending", label: "Pendentes" },
  { value: "reviewed", label: "Revisados" },
  { value: "actioned", label: "Ação Tomada" },
  { value: "dismissed", label: "Dispensados" },
];

const AdminModeracao = () => {
  const {
    reports,
    isLoading,
    error,
    statusFilter,
    setStatusFilter,
    refetch,
    updateReportStatus,
    hideCheckin,
    getStatusCounts,
  } = useModeration();

  const [selectedReport, setSelectedReport] = useState<ReportWithCheckin | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [isActioning, setIsActioning] = useState(false);
  const [statusCounts, setStatusCounts] = useState({ pending: 0, reviewed: 0, dismissed: 0, actioned: 0 });

  useEffect(() => {
    getStatusCounts().then(setStatusCounts);
  }, [getStatusCounts, reports]);

  const handleViewDetails = (report: ReportWithCheckin) => {
    setSelectedReport(report);
    setDetailsModalOpen(true);
  };

  const handleAction = async (action: "reviewed" | "dismissed" | "actioned", hideContent: boolean = false) => {
    if (!selectedReport) return;

    setIsActioning(true);

    try {
      if (hideContent && selectedReport.checkin_id) {
        const hideResult = await hideCheckin(selectedReport.checkin_id);
        if (!hideResult.success) {
          toast.error("Erro ao ocultar o conteúdo");
          setIsActioning(false);
          return;
        }
      }

      const result = await updateReportStatus(selectedReport.id, action);

      if (result.success) {
        toast.success(
          action === "actioned" 
            ? "Ação registrada com sucesso" 
            : action === "dismissed" 
              ? "Denúncia dispensada" 
              : "Marcado como revisado"
        );
        setDetailsModalOpen(false);
        setSelectedReport(null);
      } else {
        toast.error("Erro ao atualizar status");
      }
    } catch {
      toast.error("Erro inesperado");
    } finally {
      setIsActioning(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return format(parseISO(dateStr), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <header>
            <h1 className="text-2xl font-display font-semibold text-foreground flex items-center gap-2">
              <Shield className="w-6 h-6 text-primary" />
              Moderação
            </h1>
            <p className="text-muted-foreground mt-1">
              Gerencie denúncias e conteúdo da comunidade
            </p>
          </header>
          <LoadingState message="Carregando denúncias..." />
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <header>
            <h1 className="text-2xl font-display font-semibold text-foreground flex items-center gap-2">
              <Shield className="w-6 h-6 text-primary" />
              Moderação
            </h1>
          </header>
          <ErrorState
            title="Erro ao carregar"
            message="Não foi possível carregar as denúncias."
            onRetry={refetch}
          />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <header>
          <h1 className="text-2xl font-display font-semibold text-foreground flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            Moderação
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie denúncias e conteúdo da comunidade
          </p>
        </header>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className={cn(statusCounts.pending > 0 && "border-amber-500/50")}>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-amber-600">{statusCounts.pending}</p>
              <p className="text-sm text-muted-foreground">Pendentes</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{statusCounts.reviewed}</p>
              <p className="text-sm text-muted-foreground">Revisados</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{statusCounts.actioned}</p>
              <p className="text-sm text-muted-foreground">Ações Tomadas</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-gray-600">{statusCounts.dismissed}</p>
              <p className="text-sm text-muted-foreground">Dispensados</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-2">
              {filterOptions.map((option) => (
                <Badge
                  key={option.value}
                  variant={statusFilter === option.value ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setStatusFilter(option.value)}
                >
                  {option.label}
                  {option.value === "pending" && statusCounts.pending > 0 && (
                    <span className="ml-1 bg-background/20 px-1.5 rounded-full text-xs">
                      {statusCounts.pending}
                    </span>
                  )}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Reports List */}
        {reports.length === 0 ? (
          <EmptyState
            icon={<Shield className="w-8 h-8 text-muted-foreground" />}
            title="Nenhuma denúncia encontrada"
            description={
              statusFilter === "pending"
                ? "Não há denúncias pendentes no momento."
                : "Não há denúncias com este filtro."
            }
          />
        ) : (
          <div className="space-y-3">
            {reports.map((report) => (
              <Card key={report.id} className="transition-shadow hover:shadow-card">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0 space-y-2">
                      {/* Report Header */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={cn("text-xs flex items-center gap-1", statusConfig[report.status].color)}>
                          {statusConfig[report.status].icon}
                          {statusConfig[report.status].label}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(report.created_at)}
                        </span>
                      </div>

                      {/* Report Reason */}
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                        <p className="text-sm line-clamp-2">{report.reason}</p>
                      </div>

                      {/* Checkin Preview */}
                      {report.checkin && (
                        <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {report.checkin.share_mode === "community" ? (
                              <>
                                <Users className="w-3 h-3" />
                                <span>{report.checkin.display_name || "Usuário"}</span>
                              </>
                            ) : (
                              <>
                                <User className="w-3 h-3" />
                                <span>Anônimo</span>
                              </>
                            )}
                            <span>•</span>
                            <Zap className="w-3 h-3" />
                            <span>Energia: {report.checkin.energy}</span>
                            {!report.checkin.published && (
                              <>
                                <span>•</span>
                                <EyeOff className="w-3 h-3" />
                                <span className="text-amber-600">Oculto</span>
                              </>
                            )}
                          </div>
                          <p className="text-sm line-clamp-2">{report.checkin.feeling_text}</p>
                        </div>
                      )}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewDetails(report)}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Detalhes
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Details Modal */}
      <Modal
        open={detailsModalOpen}
        onOpenChange={setDetailsModalOpen}
        title="Detalhes da Denúncia"
        description={selectedReport ? formatDate(selectedReport.created_at) : ""}
        size="lg"
        footer={
          selectedReport?.status === "pending" || selectedReport?.status === "reviewed" ? (
            <div className="flex flex-col sm:flex-row gap-2 w-full">
              <Button
                variant="outline"
                onClick={() => handleAction("dismissed")}
                disabled={isActioning}
                className="flex-1"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Dispensar
              </Button>
              <Button
                variant="outline"
                onClick={() => handleAction("reviewed")}
                disabled={isActioning || selectedReport?.status === "reviewed"}
                className="flex-1"
              >
                <Eye className="w-4 h-4 mr-2" />
                Marcar Revisado
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleAction("actioned", true)}
                disabled={isActioning || !selectedReport?.checkin?.published}
                className="flex-1"
              >
                <EyeOff className="w-4 h-4 mr-2" />
                Ocultar e Ação
              </Button>
            </div>
          ) : (
            <Button variant="outline" onClick={() => setDetailsModalOpen(false)}>
              Fechar
            </Button>
          )
        }
      >
        {selectedReport && (
          <div className="space-y-6">
            {/* Status */}
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Status</p>
              <Badge className={cn("text-sm flex items-center gap-1 w-fit", statusConfig[selectedReport.status].color)}>
                {statusConfig[selectedReport.status].icon}
                {statusConfig[selectedReport.status].label}
              </Badge>
            </div>

            {/* Reason */}
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1 flex items-center gap-1">
                <MessageSquare className="w-3 h-3" />
                Motivo da Denúncia
              </p>
              <p className="text-sm bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                {selectedReport.reason}
              </p>
            </div>

            {/* Reported Content */}
            {selectedReport.checkin && (
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                  Conteúdo Denunciado
                </p>
                <Card>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm">
                        {selectedReport.checkin.share_mode === "community" ? (
                          <>
                            <Users className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium">
                              {selectedReport.checkin.display_name || "Usuário"}
                            </span>
                          </>
                        ) : (
                          <>
                            <User className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium">Anônimo</span>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          <Zap className="w-3 h-3 mr-1" />
                          Energia: {selectedReport.checkin.energy}
                        </Badge>
                        {selectedReport.checkin.published ? (
                          <Badge variant="outline" className="text-xs text-green-600">
                            <Eye className="w-3 h-3 mr-1" />
                            Visível
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs text-amber-600">
                            <EyeOff className="w-3 h-3 mr-1" />
                            Oculto
                          </Badge>
                        )}
                      </div>
                    </div>
                    <p className="text-sm">{selectedReport.checkin.feeling_text}</p>
                    <p className="text-xs text-muted-foreground">
                      Data do check-in: {format(parseISO(selectedReport.checkin.date), "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}

            {!selectedReport.checkin && (
              <div className="text-center py-4 text-muted-foreground">
                <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>O conteúdo denunciado não foi encontrado ou foi excluído.</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </AppLayout>
  );
};

export default AdminModeracao;
