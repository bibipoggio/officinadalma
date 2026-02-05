 import { useState } from "react";
 import { AppLayout } from "@/components/layout/AppLayout";
 import { LoadingState, ErrorState } from "@/components/layout/PageState";
 import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
 import { Button } from "@/components/ui/button";
 import { Input } from "@/components/ui/input";
 import { Label } from "@/components/ui/label";
 import { Textarea } from "@/components/ui/textarea";
 import { Switch } from "@/components/ui/switch";
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
 import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
 import { useScheduledEvents, getDayName, ScheduledEventInsert } from "@/hooks/useScheduledEvents";
 import { useToast } from "@/hooks/use-toast";
 import { Plus, Pencil, Trash2, Bell, Calendar, Clock } from "lucide-react";
 
 const DAYS_OF_WEEK = [
   { value: 0, label: "Domingo" },
   { value: 1, label: "Segunda-feira" },
   { value: 2, label: "Terça-feira" },
   { value: 3, label: "Quarta-feira" },
   { value: 4, label: "Quinta-feira" },
   { value: 5, label: "Sexta-feira" },
   { value: 6, label: "Sábado" },
 ];
 
 const REMINDER_OPTIONS = [
   { value: 5, label: "5 minutos antes" },
   { value: 10, label: "10 minutos antes" },
   { value: 15, label: "15 minutos antes" },
   { value: 30, label: "30 minutos antes" },
   { value: 60, label: "1 hora antes" },
 ];
 
 interface EventFormData {
   title: string;
   description: string;
   day_of_week: number;
   event_time: string;
   reminder_minutes_before: number;
   is_active: boolean;
 }
 
 const defaultFormData: EventFormData = {
   title: "",
   description: "",
   day_of_week: 4, // Thursday
   event_time: "19:30",
   reminder_minutes_before: 5,
   is_active: true,
 };
 
 const AdminEventos = () => {
   const { toast } = useToast();
   const { events, isLoading, error, createEvent, updateEvent, deleteEvent, toggleEventActive } = useScheduledEvents();
   const [isDialogOpen, setIsDialogOpen] = useState(false);
   const [editingId, setEditingId] = useState<string | null>(null);
   const [formData, setFormData] = useState<EventFormData>(defaultFormData);
   const [isSaving, setIsSaving] = useState(false);
 
   const handleOpenCreate = () => {
     setEditingId(null);
     setFormData(defaultFormData);
     setIsDialogOpen(true);
   };
 
   const handleOpenEdit = (event: any) => {
     setEditingId(event.id);
     setFormData({
       title: event.title,
       description: event.description || "",
       day_of_week: event.day_of_week,
       event_time: event.event_time.slice(0, 5), // Remove seconds if present
       reminder_minutes_before: event.reminder_minutes_before,
       is_active: event.is_active,
     });
     setIsDialogOpen(true);
   };
 
   const handleSubmit = async (e: React.FormEvent) => {
     e.preventDefault();
     setIsSaving(true);
 
     const eventData: ScheduledEventInsert = {
       title: formData.title,
       description: formData.description || null,
       day_of_week: formData.day_of_week,
       event_time: formData.event_time,
       reminder_minutes_before: formData.reminder_minutes_before,
       is_active: formData.is_active,
     };
 
     let result;
     if (editingId) {
       result = await updateEvent(editingId, eventData);
     } else {
       result = await createEvent(eventData);
     }
 
     setIsSaving(false);
 
     if (result.success) {
       toast({
         title: editingId ? "Evento atualizado!" : "Evento criado!",
         description: `O lembrete para "${formData.title}" foi ${editingId ? "atualizado" : "agendado"}.`,
       });
       setIsDialogOpen(false);
     } else {
       toast({
         title: "Erro",
         description: result.error?.message || "Não foi possível salvar o evento.",
         variant: "destructive",
       });
     }
   };
 
   const handleDelete = async (id: string, title: string) => {
     if (!confirm(`Tem certeza que deseja excluir "${title}"?`)) return;
     
     const result = await deleteEvent(id);
     if (result.success) {
       toast({ title: "Evento excluído" });
     } else {
       toast({
         title: "Erro",
         description: "Não foi possível excluir o evento.",
         variant: "destructive",
       });
     }
   };
 
   const handleToggleActive = async (id: string, isActive: boolean) => {
     const result = await toggleEventActive(id, isActive);
     if (!result.success) {
       toast({
         title: "Erro",
         description: "Não foi possível alterar o status.",
         variant: "destructive",
       });
     }
   };
 
   if (isLoading) {
     return (
       <AppLayout>
         <LoadingState message="Carregando eventos..." />
       </AppLayout>
     );
   }
 
   if (error) {
     return (
       <AppLayout>
         <ErrorState message="Erro ao carregar eventos" />
       </AppLayout>
     );
   }
 
   return (
     <AppLayout>
       <div className="space-y-6">
         <header className="flex items-center justify-between">
           <div>
             <h1 className="text-2xl font-display font-semibold text-foreground">
               Lembretes de Eventos
             </h1>
             <p className="text-muted-foreground text-sm mt-1">
               Configure notificações push para eventos recorrentes
             </p>
           </div>
           <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
             <DialogTrigger asChild>
               <Button onClick={handleOpenCreate} className="gap-2">
                 <Plus className="w-4 h-4" />
                 Novo Evento
               </Button>
             </DialogTrigger>
             <DialogContent className="sm:max-w-md">
               <DialogHeader>
                 <DialogTitle>
                   {editingId ? "Editar Evento" : "Novo Evento"}
                 </DialogTitle>
               </DialogHeader>
               <form onSubmit={handleSubmit} className="space-y-4">
                 <div className="space-y-2">
                   <Label htmlFor="title">Título do Evento</Label>
                   <Input
                     id="title"
                     value={formData.title}
                     onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                     placeholder="Ex: Aula Ao Vivo da Officina da Alma"
                     required
                   />
                 </div>
 
                 <div className="space-y-2">
                   <Label htmlFor="description">Descrição (opcional)</Label>
                   <Textarea
                     id="description"
                     value={formData.description}
                     onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                     placeholder="Mensagem adicional para o lembrete"
                     rows={2}
                   />
                 </div>
 
                 <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                     <Label>Dia da Semana</Label>
                     <Select
                       value={formData.day_of_week.toString()}
                       onValueChange={(v) => setFormData({ ...formData, day_of_week: parseInt(v) })}
                     >
                       <SelectTrigger>
                         <SelectValue />
                       </SelectTrigger>
                       <SelectContent>
                         {DAYS_OF_WEEK.map((day) => (
                           <SelectItem key={day.value} value={day.value.toString()}>
                             {day.label}
                           </SelectItem>
                         ))}
                       </SelectContent>
                     </Select>
                   </div>
 
                   <div className="space-y-2">
                     <Label htmlFor="event_time">Horário do Evento</Label>
                     <Input
                       id="event_time"
                       type="time"
                       value={formData.event_time}
                       onChange={(e) => setFormData({ ...formData, event_time: e.target.value })}
                       required
                     />
                   </div>
                 </div>
 
                 <div className="space-y-2">
                   <Label>Lembrar</Label>
                   <Select
                     value={formData.reminder_minutes_before.toString()}
                     onValueChange={(v) => setFormData({ ...formData, reminder_minutes_before: parseInt(v) })}
                   >
                     <SelectTrigger>
                       <SelectValue />
                     </SelectTrigger>
                     <SelectContent>
                       {REMINDER_OPTIONS.map((opt) => (
                         <SelectItem key={opt.value} value={opt.value.toString()}>
                           {opt.label}
                         </SelectItem>
                       ))}
                     </SelectContent>
                   </Select>
                 </div>
 
                 <div className="flex items-center justify-between">
                   <Label htmlFor="is_active">Ativo</Label>
                   <Switch
                     id="is_active"
                     checked={formData.is_active}
                     onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                   />
                 </div>
 
                 <div className="flex gap-2 pt-2">
                   <Button
                     type="button"
                     variant="outline"
                     className="flex-1"
                     onClick={() => setIsDialogOpen(false)}
                   >
                     Cancelar
                   </Button>
                   <Button type="submit" className="flex-1" disabled={isSaving}>
                     {isSaving ? "Salvando..." : editingId ? "Salvar" : "Criar"}
                   </Button>
                 </div>
               </form>
             </DialogContent>
           </Dialog>
         </header>
 
         {events.length === 0 ? (
           <Card>
             <CardContent className="py-12 text-center">
               <Bell className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
               <p className="text-muted-foreground">Nenhum evento agendado</p>
               <p className="text-sm text-muted-foreground mt-1">
                 Crie um evento para enviar lembretes push aos usuários
               </p>
             </CardContent>
           </Card>
         ) : (
           <div className="space-y-3">
             {events.map((event) => (
               <Card key={event.id} className={!event.is_active ? "opacity-60" : ""}>
                 <CardContent className="p-4">
                   <div className="flex items-start gap-4">
                     <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                       event.is_active ? "bg-primary/10" : "bg-muted"
                     }`}>
                       <Bell className={`w-5 h-5 ${event.is_active ? "text-primary" : "text-muted-foreground"}`} />
                     </div>
                     
                     <div className="flex-1 min-w-0">
                       <h3 className="font-medium text-foreground">{event.title}</h3>
                       {event.description && (
                         <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">
                           {event.description}
                         </p>
                       )}
                       <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                         <span className="flex items-center gap-1">
                           <Calendar className="w-3.5 h-3.5" />
                           {getDayName(event.day_of_week)}
                         </span>
                         <span className="flex items-center gap-1">
                           <Clock className="w-3.5 h-3.5" />
                           {event.event_time.slice(0, 5)}
                         </span>
                         <span className="text-xs">
                           Lembrete {event.reminder_minutes_before}min antes
                         </span>
                       </div>
                     </div>
 
                     <div className="flex items-center gap-2">
                       <Switch
                         checked={event.is_active}
                         onCheckedChange={(checked) => handleToggleActive(event.id, checked)}
                         aria-label="Ativar/desativar evento"
                       />
                       <Button
                         variant="ghost"
                         size="icon"
                         onClick={() => handleOpenEdit(event)}
                       >
                         <Pencil className="w-4 h-4" />
                       </Button>
                       <Button
                         variant="ghost"
                         size="icon"
                         className="text-destructive hover:text-destructive"
                         onClick={() => handleDelete(event.id, event.title)}
                       >
                         <Trash2 className="w-4 h-4" />
                       </Button>
                     </div>
                   </div>
                 </CardContent>
               </Card>
             ))}
           </div>
         )}
 
         <Card className="border-muted">
           <CardContent className="p-4">
             <p className="text-sm text-muted-foreground">
               <strong>Como funciona:</strong> Os lembretes são enviados automaticamente 
               via notificação push para todos os usuários com notificações ativadas, 
               no horário configurado antes do evento.
             </p>
           </CardContent>
         </Card>
       </div>
     </AppLayout>
   );
 };
 
 export default AdminEventos;