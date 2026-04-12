import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Layers, ArrowRight, Video, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { type CourseLesson, parseLessonVideos, type LessonVideo } from "@/hooks/useAdminCourses";

interface ConsolidateFragmentsProps {
  lessons: CourseLesson[];
  moduleId: string;
  courseId: string;
  onConsolidated: () => void;
}

const buildConsolidatedTitle = (selectedLessons: CourseLesson[]) => {
  const firstTitle = selectedLessons[0]?.title?.trim();

  if (!firstTitle) return "Aula consolidada";

  const baseTitle = firstTitle
    .replace(/\s*[-–—:]?\s*(parte|fragmento|trecho)\s*\d+\s*$/i, "")
    .trim();

  const normalizedTitle = baseTitle || firstTitle;

  return /consolidada/i.test(normalizedTitle)
    ? normalizedTitle
    : `${normalizedTitle} - Consolidada`;
};

export function ConsolidateFragments({
  lessons,
  moduleId,
  courseId,
  onConsolidated,
}: ConsolidateFragmentsProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Only show non-deleted lessons
  const availableLessons = useMemo(
    () => lessons.filter((l) => !l.deleted_at),
    [lessons]
  );

  const toggleLesson = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const selectedLessons = useMemo(
    () => availableLessons.filter((l) => selectedIds.includes(l.id)),
    [availableLessons, selectedIds]
  );

  const suggestedTitle = useMemo(
    () => buildConsolidatedTitle(selectedLessons),
    [selectedLessons]
  );

  const { mergedVideos, mergedFiles, mergedBody } = useMemo(() => {
    const videos: LessonVideo[] = [];
    const files: { url: string; name: string }[] = [];
    let body = "";

    selectedLessons.forEach((lesson) => {
      const lessonVideos = parseLessonVideos(lesson.videos);

      lessonVideos.forEach((video) => {
        if (videos.length < 10) {
          videos.push({ ...video, position: videos.length });
        }
      });

      if (lessonVideos.length === 0 && lesson.media_url && videos.length < 10) {
        videos.push({
          url: lesson.media_url,
          title: lesson.title,
          position: videos.length,
        });
      }

      const textFiles = Array.isArray((lesson as any).text_files_urls)
        ? (lesson as any).text_files_urls
        : [];
      const pdfUrl = (lesson as any).pdf_url;

      if (pdfUrl && files.length < 10) {
        const pdfName = pdfUrl.split("/").pop() || "material.pdf";
        files.push({ url: pdfUrl, name: pdfName });
      }

      textFiles.forEach((file: any) => {
        if (files.length < 10 && file?.url) {
          files.push(file);
        }
      });

      if (lesson.body_markdown) {
        if (body) body += "\n\n---\n\n";
        body += `## ${lesson.title}\n\n${lesson.body_markdown}`;
      }
    });

    return {
      mergedVideos: videos,
      mergedFiles: files,
      mergedBody: body,
    };
  }, [selectedLessons]);

  const handleConsolidate = async () => {
    if (selectedIds.length < 2) {
      toast({
        title: "Selecione pelo menos 2 aulas",
        variant: "destructive",
      });
      return;
    }
    const finalTitle = newTitle.trim() || suggestedTitle;

    setIsSaving(true);
    try {
      // Determine content type - prefer video if any video exists
      const contentType = mergedVideos.length > 0 ? "video" : selectedLessons[0]?.content_type || "text";

      // Determine access level - use most restrictive
      const hasPremium = selectedLessons.some((l) => l.access_level === "premium");

      // Calculate total duration
      const totalDuration = selectedLessons.reduce(
        (sum, l) => sum + (l.duration_seconds || 0),
        0
      );
      const totalAudioDuration = selectedLessons.reduce(
        (sum, l) => sum + ((l as any).audio_duration_seconds || 0),
        0
      );

      // Get next position
      const maxPosition = Math.max(...lessons.map((l) => l.position), 0);

      // Separate PDF from other files
      const pdfFile = mergedFiles.find((f) =>
        f.name.toLowerCase().endsWith(".pdf")
      );
      const otherFiles = mergedFiles.filter(
        (f) => !f.name.toLowerCase().endsWith(".pdf")
      );

      // Collect audio_url from first lesson that has one
      const audioUrl = selectedLessons.find((l) => (l as any).audio_url)
        ? (selectedLessons.find((l) => (l as any).audio_url) as any).audio_url
        : null;

      // Create consolidated lesson
      const { error: createError } = await supabase
        .from("course_lessons")
        .insert({
          course_id: courseId,
          module_id: moduleId,
          title: finalTitle,
          content_type: contentType,
          access_level: hasPremium ? "premium" : "basic",
          media_url: mergedVideos.length > 0 ? mergedVideos[0].url : (selectedLessons[0]?.media_url || null),
          audio_url: audioUrl,
          pdf_url: pdfFile?.url || null,
          body_markdown: mergedBody || null,
          duration_seconds: totalDuration > 0 ? totalDuration : null,
          audio_duration_seconds: totalAudioDuration > 0 ? totalAudioDuration : null,
          summary: `Aula consolidada de ${selectedIds.length} partes`,
          is_published: false,
          position: maxPosition + 1,
          videos: mergedVideos.length > 0 ? mergedVideos : [],
          text_files_urls: otherFiles.length > 0 ? otherFiles : [],
        } as any);

      if (createError) throw createError;

      // Soft-delete original fragments
      const { error: deleteError } = await supabase
        .from("course_lessons")
        .update({ deleted_at: new Date().toISOString() })
        .in("id", selectedIds);

      if (deleteError) throw deleteError;

      toast({
        title: "✓ Aulas consolidadas!",
        description: `${selectedIds.length} partes foram unidas em "${finalTitle}". A nova aula está como rascunho.`,
      });

      setOpen(false);
      setSelectedIds([]);
      setNewTitle("");
      onConsolidated();
    } catch (err) {
      console.error("Error consolidating:", err);
      toast({
        title: "Erro ao consolidar",
        description: "Não foi possível consolidar as aulas. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (availableLessons.length < 2) return null;

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="w-full h-9"
        onClick={() => {
          setSelectedIds([]);
          setNewTitle("");
          setOpen(true);
        }}
      >
        <Layers className="w-4 h-4 mr-2" />
        Consolidar Fragmentos
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Consolidar Fragmentos</DialogTitle>
            <DialogDescription>
              Selecione as aulas que deseja unir em uma única aula consolidada.
              Os vídeos e arquivos serão combinados (máx. 10 de cada).
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4 py-2">
            {/* Title for new lesson */}
            <div className="space-y-1.5">
              <Label className="text-sm">Título da aula consolidada</Label>
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder={suggestedTitle || "Ex: Módulo completo - Parte única"}
              />
              {selectedIds.length >= 2 && !newTitle.trim() && (
                <p className="text-xs text-muted-foreground">
                  Se deixar em branco, vamos usar “{suggestedTitle}”.
                </p>
              )}
            </div>

            {/* Lesson selection */}
            <div className="space-y-1.5">
              <Label className="text-sm">
                Selecione as partes ({selectedIds.length} selecionadas)
              </Label>
              <div className="space-y-1 max-h-48 overflow-y-auto border rounded-lg p-2">
                {availableLessons.map((lesson) => (
                  <div
                    key={lesson.id}
                    className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 cursor-pointer"
                    onClick={() => toggleLesson(lesson.id)}
                  >
                    <Checkbox
                      checked={selectedIds.includes(lesson.id)}
                      onClick={(e) => e.stopPropagation()}
                      onCheckedChange={() => toggleLesson(lesson.id)}
                    />
                    <span className="text-sm truncate flex-1">
                      {lesson.title}
                    </span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {lesson.content_type}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Preview */}
            {selectedIds.length >= 2 && (
              <div className="border rounded-lg p-3 bg-muted/30 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Prévia da consolidação
                </p>
                <div className="flex items-center gap-2 text-sm">
                  <Video className="w-4 h-4 text-blue-500" />
                  <span>
                    {mergedVideos.length} vídeo{mergedVideos.length !== 1 && "s"}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="w-4 h-4 text-green-500" />
                  <span>
                    {mergedFiles.length} arquivo{mergedFiles.length !== 1 && "s"}
                  </span>
                </div>
                {mergedBody && (
                  <p className="text-xs text-muted-foreground">
                    Textos serão combinados com separadores
                  </p>
                )}
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                  <ArrowRight className="w-3 h-3" />
                  As aulas originais serão arquivadas (soft delete)
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConsolidate}
              disabled={isSaving || selectedIds.length < 2}
            >
              {isSaving
                ? "Consolidando..."
                : `Consolidar ${selectedIds.length} aulas`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
