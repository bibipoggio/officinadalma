import { AppLayout } from "@/components/layout/AppLayout";
import { LoadingState } from "@/components/layout/PageState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { useDailyContent } from "@/hooks/useDailyContent";
import { format, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, ChevronLeft, ChevronRight, Check, X } from "lucide-react";

const formatDateDisplay = (dateStr: string) => {
  const date = new Date(dateStr + "T12:00:00");
  return format(date, "dd/MM/yyyy", { locale: ptBR });
};

const formatDateISO = (date: Date) => {
  return format(date, "yyyy-MM-dd");
};

const AdminConteudoDiario = () => {
  const today = formatDateISO(new Date());
  const [selectedDate, setSelectedDate] = useState(today);
  
  const {
    content,
    isLoading,
    isSaving,
    isNewContent,
    updateField,
    saveContent,
    unpublish,
  } = useDailyContent(selectedDate);

  const goToToday = () => setSelectedDate(formatDateISO(new Date()));
  const goToTomorrow = () => setSelectedDate(formatDateISO(addDays(new Date(), 1)));
  const goToPrevDay = () => setSelectedDate(formatDateISO(addDays(new Date(selectedDate + "T12:00:00"), -1)));
  const goToNextDay = () => setSelectedDate(formatDateISO(addDays(new Date(selectedDate + "T12:00:00"), 1)));

  const handleDurationChange = (value: string) => {
    const minutes = parseInt(value, 10);
    if (isNaN(minutes) || minutes < 0) {
      updateField("meditation_duration_seconds", null);
    } else {
      updateField("meditation_duration_seconds", minutes * 60);
    }
  };

  const durationInMinutes = content.meditation_duration_seconds 
    ? Math.round(content.meditation_duration_seconds / 60) 
    : "";

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-8 pb-12">
        {/* Header */}
        <header className="text-center space-y-4">
          <h1 className="text-3xl font-display font-semibold text-foreground">
            Conteúdo do Dia
          </h1>
          
          {/* Status Badge */}
          <div className="flex justify-center">
            {!isLoading && (
              <div
                className={`inline-flex items-center gap-2 px-6 py-3 rounded-full text-lg font-medium ${
                  content.published
                    ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                    : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                }`}
              >
                {content.published ? (
                  <>
                    <Check className="w-5 h-5" />
                    Publicado
                  </>
                ) : (
                  <>
                    <X className="w-5 h-5" />
                    Agendado (não publicado)
                  </>
                )}
              </div>
            )}
          </div>
        </header>

        {/* Date Selector */}
        <section className="bg-card border rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-center gap-3">
            <Button
              variant="outline"
              size="icon"
              className="h-12 w-12"
              onClick={goToPrevDay}
              aria-label="Dia anterior"
            >
              <ChevronLeft className="w-6 h-6" />
            </Button>
            
            <div className="flex items-center gap-3 px-6 py-3 bg-primary/10 rounded-xl min-w-[200px] justify-center">
              <Calendar className="w-6 h-6 text-primary" />
              <span className="text-xl font-semibold text-foreground">
                {formatDateDisplay(selectedDate)}
              </span>
            </div>
            
            <Button
              variant="outline"
              size="icon"
              className="h-12 w-12"
              onClick={goToNextDay}
              aria-label="Próximo dia"
            >
              <ChevronRight className="w-6 h-6" />
            </Button>
          </div>
          
          <div className="flex justify-center gap-3">
            <Button
              variant={selectedDate === today ? "default" : "outline"}
              size="lg"
              className="text-lg px-8"
              onClick={goToToday}
            >
              Hoje
            </Button>
            <Button
              variant={selectedDate === formatDateISO(addDays(new Date(), 1)) ? "default" : "outline"}
              size="lg"
              className="text-lg px-8"
              onClick={goToTomorrow}
            >
              Amanhã
            </Button>
          </div>
        </section>

        {isLoading ? (
          <LoadingState message="Carregando conteúdo..." />
        ) : (
          <>
            {/* Section A - Tônica */}
            <section className="bg-card border rounded-2xl p-6 space-y-6">
              <h2 className="text-2xl font-display font-semibold text-foreground border-b pb-3">
                Seção A — Tônica (Texto)
              </h2>
              <p className="text-muted-foreground text-lg">
                Campos obrigatórios
              </p>
              
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="tonica_title" className="text-lg font-medium">
                    Título da Tônica *
                  </Label>
                  <Input
                    id="tonica_title"
                    value={content.tonica_title}
                    onChange={(e) => updateField("tonica_title", e.target.value)}
                    placeholder="Ex: Aterramento e Presença"
                    className="text-lg h-14"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tonica_short" className="text-lg font-medium">
                    Resumo curto (aparece na Home) *
                  </Label>
                  <Textarea
                    id="tonica_short"
                    value={content.tonica_short}
                    onChange={(e) => updateField("tonica_short", e.target.value)}
                    placeholder="Escreva um resumo curto..."
                    className="text-lg min-h-[100px]"
                    maxLength={400}
                  />
                  <p className="text-right text-muted-foreground">
                    {content.tonica_short.length}/280 recomendado
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tonica_full" className="text-lg font-medium">
                    Texto completo *
                  </Label>
                  <Textarea
                    id="tonica_full"
                    value={content.tonica_full}
                    onChange={(e) => updateField("tonica_full", e.target.value)}
                    placeholder="Escreva o texto completo da tônica..."
                    className="text-lg min-h-[200px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tonica_practice" className="text-lg font-medium">
                    Prática do dia *
                  </Label>
                  <Textarea
                    id="tonica_practice"
                    value={content.tonica_practice}
                    onChange={(e) => updateField("tonica_practice", e.target.value)}
                    placeholder="Descreva a prática do dia..."
                    className="text-lg min-h-[120px]"
                  />
                </div>
              </div>
            </section>

            {/* Section B - Meditação */}
            <section className="bg-card border rounded-2xl p-6 space-y-6">
              <h2 className="text-2xl font-display font-semibold text-foreground border-b pb-3">
                Seção B — Meditação (Áudio)
              </h2>
              <p className="text-muted-foreground text-lg">
                Campos opcionais
              </p>
              
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="meditation_audio_url" className="text-lg font-medium">
                    Link do áudio (Bunny)
                  </Label>
                  <Input
                    id="meditation_audio_url"
                    type="url"
                    value={content.meditation_audio_url || ""}
                    onChange={(e) => updateField("meditation_audio_url", e.target.value || null)}
                    placeholder="https://..."
                    className="text-lg h-14"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="meditation_duration" className="text-lg font-medium">
                    Duração em minutos
                  </Label>
                  <Input
                    id="meditation_duration"
                    type="number"
                    min="0"
                    value={durationInMinutes}
                    onChange={(e) => handleDurationChange(e.target.value)}
                    placeholder="Ex: 15"
                    className="text-lg h-14 w-32"
                  />
                </div>
              </div>
            </section>

            {/* Section C - Astrowake */}
            <section className="bg-card border rounded-2xl p-6 space-y-6">
              <h2 className="text-2xl font-display font-semibold text-foreground border-b pb-3">
                Seção C — Astrowake (Spotify)
              </h2>
              <p className="text-muted-foreground text-lg">
                Campos opcionais
              </p>
              
              <div className="space-y-2">
                <Label htmlFor="spotify_episode_url" className="text-lg font-medium">
                  Link do episódio no Spotify
                </Label>
                <Input
                  id="spotify_episode_url"
                  type="url"
                  value={content.spotify_episode_url || ""}
                  onChange={(e) => updateField("spotify_episode_url", e.target.value || null)}
                  placeholder="https://open.spotify.com/episode/..."
                  className="text-lg h-14"
                />
              </div>
            </section>

            {/* Action Buttons */}
            <section className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  variant="outline"
                  size="lg"
                  className="flex-1 text-xl h-16"
                  onClick={() => saveContent(false)}
                  disabled={isSaving}
                >
                  {isSaving ? "Salvando..." : "Salvar rascunho"}
                </Button>
                
                {content.published ? (
                  <Button
                    variant="destructive"
                    size="lg"
                    className="flex-1 text-xl h-16"
                    onClick={unpublish}
                    disabled={isSaving}
                  >
                    {isSaving ? "Processando..." : "Despublicar"}
                  </Button>
                ) : (
                  <Button
                    size="lg"
                    className="flex-1 text-xl h-16 bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => saveContent(true)}
                    disabled={isSaving}
                  >
                    {isSaving ? "Publicando..." : "Publicar"}
                  </Button>
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </AppLayout>
  );
};

export default AdminConteudoDiario;
