import { AppLayout } from "@/components/layout/AppLayout";
import { LoadingState, ErrorState } from "@/components/layout/PageState";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, XCircle, Clock, Eye, CreditCard, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AdminInscricao {
  id: string;
  user_id: string;
  display_name: string | null;
  email: string | null;
  respostas: Record<string, unknown>;
  status: "pendente" | "aprovado" | "rejeitado";
  subscription_status: string;
  provider_subscription_id: string | null;
  created_at: string;
  updated_at: string;
}

const statusConfig = {
  pendente: { label: "Pendente", variant: "secondary" as const, icon: Clock },
  aprovado: { label: "Aprovado", variant: "default" as const, icon: CheckCircle2 },
  rejeitado: { label: "Rejeitado", variant: "destructive" as const, icon: XCircle },
};

const subStatusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  active: { label: "Ativo", variant: "default" },
  trialing: { label: "Teste", variant: "outline" },
  inactive: { label: "Inativo", variant: "destructive" },
  none: { label: "Sem assinatura", variant: "secondary" },
};

const AdminInscricoes = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedInscricao, setSelectedInscricao] = useState<AdminInscricao | null>(null);

  const { data: inscricoes, isLoading, error } = useQuery({
    queryKey: ["admin-inscricoes"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_admin_inscricoes");
      if (error) throw error;
      return (data || []) as unknown as AdminInscricao[];
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "aprovado" | "rejeitado" }) => {
      const { error } = await supabase
        .from("inscricoes")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ["admin-inscricoes"] });
      toast({
        title: `Inscrição ${status === "aprovado" ? "aprovada" : "rejeitada"}`,
        description: `O status da inscrição foi atualizado com sucesso.`,
      });
    },
    onError: (err) => {
      toast({ title: "Erro", description: (err as Error).message, variant: "destructive" });
    },
  });

  const filtered = (inscricoes || []).filter((i) => {
    const matchesSearch =
      !search ||
      i.display_name?.toLowerCase().includes(search.toLowerCase()) ||
      i.email?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === "all" || i.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const counts = {
    total: inscricoes?.length || 0,
    pendente: inscricoes?.filter((i) => i.status === "pendente").length || 0,
    aprovado: inscricoes?.filter((i) => i.status === "aprovado").length || 0,
    rejeitado: inscricoes?.filter((i) => i.status === "rejeitado").length || 0,
  };

  if (error) return <AppLayout><ErrorState title="Erro" message="Não foi possível carregar as inscrições." /></AppLayout>;

  return (
    <AppLayout>
      <div className="space-y-6">
        <header>
          <h1 className="text-2xl font-display font-semibold text-foreground">Inscrições</h1>
          <p className="text-sm text-muted-foreground mt-1">Gerencie aprovações de inscrições</p>
        </header>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Card><CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-foreground">{counts.total}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </CardContent></Card>
          <Card className="border-yellow-500/30"><CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-yellow-600">{counts.pendente}</p>
            <p className="text-xs text-muted-foreground">Pendentes</p>
          </CardContent></Card>
          <Card className="border-green-500/30"><CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-green-600">{counts.aprovado}</p>
            <p className="text-xs text-muted-foreground">Aprovadas</p>
          </CardContent></Card>
          <Card className="border-red-500/30"><CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-red-600">{counts.rejeitado}</p>
            <p className="text-xs text-muted-foreground">Rejeitadas</p>
          </CardContent></Card>
        </div>

        {/* Filters */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pendente">Pendentes</SelectItem>
              <SelectItem value="aprovado">Aprovadas</SelectItem>
              <SelectItem value="rejeitado">Rejeitadas</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading && <LoadingState message="Carregando inscrições..." />}

        {!isLoading && (
          <div className="space-y-3">
            {filtered.length === 0 && (
              <p className="text-center text-muted-foreground py-8">Nenhuma inscrição encontrada.</p>
            )}

            {/* Mobile cards */}
            <div className="space-y-3 sm:hidden">
              {filtered.map((insc) => {
                const cfg = statusConfig[insc.status];
                const subCfg = subStatusConfig[insc.subscription_status] || subStatusConfig.none;
                return (
                  <Card key={insc.id} variant="elevated">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-foreground truncate">{insc.display_name || "Sem nome"}</p>
                          <p className="text-xs text-muted-foreground truncate">{insc.email}</p>
                        </div>
                        <Badge variant={cfg.variant}>
                          <cfg.icon className="w-3 h-3 mr-1" />
                          {cfg.label}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={subCfg.variant}>
                          <CreditCard className="w-3 h-3 mr-1" />
                          {subCfg.label}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(insc.created_at), "dd/MM/yyyy", { locale: ptBR })}
                        </span>
                      </div>

                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setSelectedInscricao(insc)}>
                          <Eye className="w-4 h-4 mr-1" /> Ver
                        </Button>
                        {insc.status === "pendente" && (
                          <>
                            <Button
                              variant="default"
                              size="sm"
                              className="flex-1"
                              onClick={() => updateStatusMutation.mutate({ id: insc.id, status: "aprovado" })}
                              disabled={updateStatusMutation.isPending}
                            >
                              <CheckCircle2 className="w-4 h-4 mr-1" /> Aprovar
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              className="flex-1"
                              onClick={() => updateStatusMutation.mutate({ id: insc.id, status: "rejeitado" })}
                              disabled={updateStatusMutation.isPending}
                            >
                              <XCircle className="w-4 h-4 mr-1" /> Rejeitar
                            </Button>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Desktop table */}
            <div className="hidden sm:block">
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Pagamento</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((insc) => {
                      const cfg = statusConfig[insc.status];
                      const subCfg = subStatusConfig[insc.subscription_status] || subStatusConfig.none;
                      return (
                        <TableRow key={insc.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{insc.display_name || "Sem nome"}</p>
                              <p className="text-xs text-muted-foreground">{insc.email}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={cfg.variant}>
                              <cfg.icon className="w-3 h-3 mr-1" />
                              {cfg.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={subCfg.variant}>
                              <CreditCard className="w-3 h-3 mr-1" />
                              {subCfg.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {format(new Date(insc.created_at), "dd/MM/yyyy", { locale: ptBR })}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-1 justify-end">
                              <Button variant="ghost" size="sm" onClick={() => setSelectedInscricao(insc)}>
                                <Eye className="w-4 h-4" />
                              </Button>
                              {insc.status === "pendente" && (
                                <>
                                  <Button
                                    variant="default"
                                    size="sm"
                                    onClick={() => updateStatusMutation.mutate({ id: insc.id, status: "aprovado" })}
                                    disabled={updateStatusMutation.isPending}
                                  >
                                    <CheckCircle2 className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => updateStatusMutation.mutate({ id: insc.id, status: "rejeitado" })}
                                    disabled={updateStatusMutation.isPending}
                                  >
                                    <XCircle className="w-4 h-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Card>
            </div>
          </div>
        )}

        {/* Detail Dialog */}
        <Dialog open={!!selectedInscricao} onOpenChange={() => setSelectedInscricao(null)}>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Detalhes da Inscrição</DialogTitle>
            </DialogHeader>
            {selectedInscricao && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Nome</span>
                    <span className="font-medium">{selectedInscricao.display_name || "—"}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Email</span>
                    <span className="font-medium">{selectedInscricao.email || "—"}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Status</span>
                    <Badge variant={statusConfig[selectedInscricao.status].variant}>
                      {statusConfig[selectedInscricao.status].label}
                    </Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Pagamento</span>
                    <Badge variant={(subStatusConfig[selectedInscricao.subscription_status] || subStatusConfig.none).variant}>
                      {(subStatusConfig[selectedInscricao.subscription_status] || subStatusConfig.none).label}
                    </Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Data</span>
                    <span>{format(new Date(selectedInscricao.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
                  </div>
                </div>

                {/* Respostas do questionário */}
                <div className="border-t pt-4">
                  <h3 className="font-semibold text-sm mb-3">Respostas do Questionário</h3>
                  <div className="space-y-3">
                    {Object.entries(selectedInscricao.respostas || {}).map(([key, value]) => (
                      <div key={key} className="text-sm">
                        <p className="text-muted-foreground text-xs mb-0.5">{key}</p>
                        <p className="text-foreground">
                          {Array.isArray(value) ? value.join(", ") : String(value || "—")}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {selectedInscricao.status === "pendente" && (
                  <div className="flex gap-2 pt-2 border-t">
                    <Button
                      className="flex-1"
                      onClick={() => {
                        updateStatusMutation.mutate({ id: selectedInscricao.id, status: "aprovado" });
                        setSelectedInscricao(null);
                      }}
                      disabled={updateStatusMutation.isPending}
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" /> Aprovar
                    </Button>
                    <Button
                      variant="destructive"
                      className="flex-1"
                      onClick={() => {
                        updateStatusMutation.mutate({ id: selectedInscricao.id, status: "rejeitado" });
                        setSelectedInscricao(null);
                      }}
                      disabled={updateStatusMutation.isPending}
                    >
                      <XCircle className="w-4 h-4 mr-2" /> Rejeitar
                    </Button>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
};

export default AdminInscricoes;
