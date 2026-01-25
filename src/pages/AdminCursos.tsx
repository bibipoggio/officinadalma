import { AppLayout } from "@/components/layout/AppLayout";
import { LoadingState } from "@/components/layout/PageState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { RichTextEditor } from "@/components/ui/RichTextEditor";
import { MediaUpload } from "@/components/admin/MediaUpload";
import { PdfUpload } from "@/components/admin/PdfUpload";
import { TextFilesUpload } from "@/components/admin/TextFilesUpload";
import { CourseImageUpload } from "@/components/admin/CourseImageUpload";
import { useState, useEffect, useCallback } from "react";
import { useAutoSaveLessonDraft } from "@/hooks/useAutoSaveLessonDraft";
import { 
  useAdminCourses, 
  useAdminModules, 
  useAdminLessons,
  generateSlug,
  isValidUrl,
  type Course,
  type CourseModule,
  type CourseLesson,
} from "@/hooks/useAdminCourses";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  ChevronLeft, 
  ChevronUp, 
  ChevronDown, 
  Plus,
  Copy,
  Calendar as CalendarIcon,
  X,
  Video,
  FileAudio,
  FileText,
  Pencil,
  Trash2,
  GripVertical,
  FileUp,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type ViewMode = "list" | "edit-course";

const typeLabels: Record<string, string> = {
  regular: "Básico",
  aparte: "Premium",
  basic: "Gratuito",
};

const contentTypeConfig = {
  video: { label: "Vídeo", icon: Video, color: "text-blue-600 bg-blue-100 dark:bg-blue-900/30" },
  audio: { label: "Áudio", icon: FileAudio, color: "text-purple-600 bg-purple-100 dark:bg-purple-900/30" },
  text: { label: "Texto", icon: FileText, color: "text-green-600 bg-green-100 dark:bg-green-900/30" },
};

const accessLabels: Record<string, string> = {
  basic: "Básico",
  premium: "Premium",
};

const formatDateDisplay = (dateStr: string | null) => {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return format(date, "dd/MM/yyyy", { locale: ptBR });
};

const getLessonStatus = (lesson: CourseLesson): { label: string; color: string; icon: string } => {
  if (!lesson.is_published) {
    return { label: "Rascunho", color: "bg-muted text-muted-foreground", icon: "●" };
  }
  if (lesson.released_at && new Date(lesson.released_at) > new Date()) {
    return { label: "Agendada", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400", icon: "⏱" };
  }
  return { label: "Publicada", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400", icon: "✓" };
};

const AdminCursos = () => {
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("info");
  
  // Editing states
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [expandedModules, setExpandedModules] = useState<string[]>([]);
  
  // Form states
  const [courseForm, setCourseForm] = useState({
    title: "",
    type: "regular",
    description_short: "",
    cover_image_url: "",
    route_slug: "",
    is_published: false,
  });
  
  const [moduleForm, setModuleForm] = useState({
    title: "",
    is_published: false,
  });
  
  const [lessonForm, setLessonForm] = useState<{
    title: string;
    access_level: string;
    content_type: string;
    media_url: string;
    audio_url: string;
    pdf_url: string;
    body_markdown: string;
    duration_minutes: string;
    audio_duration_minutes: string;
    released_at: Date | null;
    is_published: boolean;
    summary: string;
    module_id: string;
    text_files: { url: string; name: string }[];
  }>({
    title: "",
    access_level: "basic",
    content_type: "text",
    media_url: "",
    audio_url: "",
    pdf_url: "",
    body_markdown: "",
    duration_minutes: "",
    audio_duration_minutes: "",
    released_at: null,
    is_published: false,
    summary: "",
    module_id: "",
    text_files: [],
  });
  
  const [isSaving, setIsSaving] = useState(false);
  const [isCreatingModule, setIsCreatingModule] = useState(false);
  const [isCreatingLesson, setIsCreatingLesson] = useState(false);
  const [creatingLessonForModule, setCreatingLessonForModule] = useState<string | null>(null);

  const { courses, isLoading: coursesLoading, createCourse, updateCourse, toggleCoursePublished } = useAdminCourses();
  const { modules, isLoading: modulesLoading, createModule, updateModule, moveModule } = useAdminModules(selectedCourseId);
  
  // We need to fetch lessons for all modules at once
  const [allLessons, setAllLessons] = useState<Record<string, CourseLesson[]>>({});
  const [lessonsLoading, setLessonsLoading] = useState(false);

  const selectedCourse = courses.find(c => c.id === selectedCourseId);

  // Auto-save hook for lesson drafts
  const { saveDraft, loadDraft, clearDraft, hasDraft } = useAutoSaveLessonDraft(
    {
      ...lessonForm,
      released_at: lessonForm.released_at?.toISOString() || null,
    },
    !!editingLessonId,
    editingLessonId,
    isCreatingLesson,
    creatingLessonForModule
  );
  
  const [showDraftPrompt, setShowDraftPrompt] = useState(false);

  // Fetch lessons when modules change
  useEffect(() => {
    if (!selectedCourseId || modules.length === 0) {
      setAllLessons({});
      return;
    }
    
    const fetchAllLessons = async () => {
      setLessonsLoading(true);
      const lessonsMap: Record<string, CourseLesson[]> = {};
      
      for (const module of modules) {
        const { supabase } = await import("@/integrations/supabase/client");
        const { data } = await supabase
          .from("course_lessons")
          .select("*")
          .eq("module_id", module.id)
          .order("position", { ascending: true });
        
        lessonsMap[module.id] = (data || []) as CourseLesson[];
      }
      
      setAllLessons(lessonsMap);
      setLessonsLoading(false);
    };
    
    fetchAllLessons();
  }, [modules, selectedCourseId]);

  // Handlers
  const handleSelectCourse = (course: Course) => {
    setSelectedCourseId(course.id);
    setCourseForm({
      title: course.title,
      type: course.type,
      description_short: course.description_short || "",
      cover_image_url: course.cover_image_url || "",
      route_slug: course.route_slug,
      is_published: course.is_published,
    });
    setViewMode("edit-course");
    setActiveTab("info");
    setExpandedModules([]);
  };

  const handleNewCourse = () => {
    setSelectedCourseId(null);
    setCourseForm({
      title: "",
      type: "regular",
      description_short: "",
      cover_image_url: "",
      route_slug: "",
      is_published: false,
    });
    setViewMode("edit-course");
    setActiveTab("info");
  };

  const handleBackToList = () => {
    setViewMode("list");
    setSelectedCourseId(null);
    setEditingModuleId(null);
    setEditingLessonId(null);
    setIsCreatingModule(false);
    setIsCreatingLesson(false);
  };

  const handleSaveCourse = async () => {
    if (!courseForm.title.trim()) {
      toast({ title: "Falta preencher: Nome do curso", variant: "destructive" });
      return;
    }
    if (!courseForm.route_slug.trim()) {
      toast({ title: "Falta preencher: Endereço do curso (slug)", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      if (selectedCourseId) {
        await updateCourse(selectedCourseId, {
          title: courseForm.title.trim(),
          type: courseForm.type,
          description_short: courseForm.description_short.trim() || null,
          cover_image_url: courseForm.cover_image_url.trim() || null,
          route_slug: courseForm.route_slug.trim(),
          is_published: courseForm.is_published,
        });
        toast({ title: "Curso salvo com sucesso!" });
      } else {
        const result = await createCourse({
          title: courseForm.title.trim(),
          type: courseForm.type,
          description_short: courseForm.description_short.trim() || null,
          cover_image_url: courseForm.cover_image_url.trim() || null,
          route_slug: courseForm.route_slug.trim(),
          is_published: courseForm.is_published,
        });
        if (result) {
          setSelectedCourseId(result.id);
          toast({ title: "Curso criado! Agora adicione módulos e aulas." });
          setActiveTab("modules");
        }
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Module handlers
  const handleStartCreateModule = () => {
    setModuleForm({ title: "", is_published: false });
    setIsCreatingModule(true);
    setEditingModuleId(null);
  };

  const handleEditModule = (module: CourseModule) => {
    setModuleForm({ title: module.title, is_published: module.is_published });
    setEditingModuleId(module.id);
    setIsCreatingModule(false);
  };

  const handleSaveModule = async () => {
    if (!moduleForm.title.trim()) {
      toast({ title: "Falta preencher: Nome do módulo", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      if (editingModuleId) {
        await updateModule(editingModuleId, {
          title: moduleForm.title.trim(),
          is_published: moduleForm.is_published,
        });
        setEditingModuleId(null);
      } else {
        const newModule = await createModule(moduleForm.title.trim(), moduleForm.is_published);
        if (newModule) {
          setExpandedModules(prev => [...prev, newModule.id]);
        }
        setIsCreatingModule(false);
      }
      setModuleForm({ title: "", is_published: false });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelModuleEdit = () => {
    setEditingModuleId(null);
    setIsCreatingModule(false);
    setModuleForm({ title: "", is_published: false });
  };

  // Lesson handlers
  const handleStartCreateLesson = useCallback((moduleId: string, contentType: string = "text") => {
    const defaultForm = {
      title: "",
      access_level: "basic",
      content_type: contentType,
      media_url: "",
      audio_url: "",
      pdf_url: "",
      body_markdown: "",
      duration_minutes: "",
      audio_duration_minutes: "",
      released_at: null,
      is_published: false,
      summary: "",
      module_id: moduleId,
      text_files: [] as { url: string; name: string }[],
    };
    
    setLessonForm(defaultForm);
    setCreatingLessonForModule(moduleId);
    setIsCreatingLesson(true);
    setEditingLessonId(null);
    
    // Check for existing draft after state is set
    setTimeout(() => {
      const draftKey = `lesson_draft_new_${moduleId}`;
      const savedDraft = localStorage.getItem(draftKey);
      if (savedDraft) {
        setShowDraftPrompt(true);
      }
    }, 100);
  }, []);

  const handleLoadDraft = useCallback(() => {
    const draft = loadDraft();
    if (draft) {
      setLessonForm({
        ...draft,
        released_at: draft.released_at ? new Date(draft.released_at) : null,
      });
      setShowDraftPrompt(false);
      toast({ title: "Rascunho recuperado!" });
    }
  }, [loadDraft, toast]);

  const handleDiscardDraft = useCallback(() => {
    clearDraft();
    setShowDraftPrompt(false);
  }, [clearDraft]);

  const handleEditLesson = useCallback((lesson: CourseLesson) => {
    // Parse text_files from the lesson data
    const textFiles = (lesson as any).text_files_urls || [];
    
    setLessonForm({
      title: lesson.title,
      access_level: lesson.access_level,
      content_type: lesson.content_type,
      media_url: lesson.media_url || "",
      audio_url: (lesson as any).audio_url || "",
      pdf_url: (lesson as any).pdf_url || "",
      body_markdown: lesson.body_markdown || "",
      duration_minutes: lesson.duration_seconds ? String(Math.round(lesson.duration_seconds / 60)) : "",
      audio_duration_minutes: (lesson as any).audio_duration_seconds ? String(Math.round((lesson as any).audio_duration_seconds / 60)) : "",
      released_at: lesson.released_at ? new Date(lesson.released_at) : null,
      is_published: lesson.is_published,
      summary: lesson.summary || "",
      module_id: lesson.module_id,
      text_files: Array.isArray(textFiles) ? textFiles : [],
    });
    setEditingLessonId(lesson.id);
    setIsCreatingLesson(false);
    setCreatingLessonForModule(null);
    
    // Check for existing draft
    setTimeout(() => {
      const draftKey = `lesson_draft_edit_${lesson.id}`;
      const savedDraft = localStorage.getItem(draftKey);
      if (savedDraft) {
        setShowDraftPrompt(true);
      }
    }, 100);
  }, []);

  const handleSaveLesson = async () => {
    if (!lessonForm.title.trim()) {
      toast({ title: "Falta preencher: Título", variant: "destructive" });
      return;
    }

    if ((lessonForm.content_type === "video" || lessonForm.content_type === "audio") && !lessonForm.media_url.trim()) {
      toast({ title: "Falta preencher: Arquivo de mídia", variant: "destructive" });
      return;
    }

    if ((lessonForm.content_type === "video" || lessonForm.content_type === "audio") && lessonForm.media_url && !isValidUrl(lessonForm.media_url)) {
      toast({ title: "O link da mídia não é válido.", variant: "destructive" });
      return;
    }

    if (lessonForm.content_type === "text" && !lessonForm.body_markdown.trim()) {
      toast({ title: "Falta preencher: Conteúdo do texto", variant: "destructive" });
      return;
    }

    const durationMinutes = parseInt(lessonForm.duration_minutes, 10);
    const durationSeconds = isNaN(durationMinutes) || durationMinutes < 0 ? null : durationMinutes * 60;

    setIsSaving(true);
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      
      const audioDurationSeconds = lessonForm.audio_duration_minutes 
        ? parseInt(lessonForm.audio_duration_minutes) * 60 
        : null;

      const lessonData = {
        title: lessonForm.title.trim(),
        access_level: lessonForm.access_level,
        content_type: lessonForm.content_type,
        media_url: lessonForm.media_url.trim() || null,
        audio_url: lessonForm.audio_url.trim() || null,
        pdf_url: lessonForm.pdf_url.trim() || null,
        body_markdown: lessonForm.body_markdown.trim() || null,
        duration_seconds: durationSeconds,
        audio_duration_seconds: audioDurationSeconds,
        released_at: lessonForm.released_at?.toISOString() || null,
        is_published: lessonForm.is_published,
        summary: lessonForm.summary.trim() || null,
        text_files_urls: lessonForm.text_files,
        course_id: selectedCourseId!,
        module_id: lessonForm.module_id,
      };

      let saveError = null;
      
      if (editingLessonId) {
        const { error } = await supabase
          .from("course_lessons")
          .update(lessonData)
          .eq("id", editingLessonId);
        saveError = error;
        if (!error) setEditingLessonId(null);
      } else {
        // Get next position
        const moduleLessons = allLessons[lessonForm.module_id] || [];
        const nextPosition = moduleLessons.length + 1;
        
        const { error } = await supabase
          .from("course_lessons")
          .insert({ ...lessonData, position: nextPosition });
        saveError = error;
        if (!error) {
          setIsCreatingLesson(false);
          setCreatingLessonForModule(null);
        }
      }
      
      if (saveError) {
        console.error("Error saving lesson:", saveError);
        toast({ 
          title: "Erro ao salvar aula", 
          description: saveError.message || "Verifique os dados e tente novamente.",
          variant: "destructive" 
        });
        return;
      }
      
      // Refresh lessons
      const { data: refreshedLessons } = await supabase
        .from("course_lessons")
        .select("*")
        .eq("module_id", lessonForm.module_id)
        .order("position", { ascending: true });
      
      setAllLessons(prev => ({
        ...prev,
        [lessonForm.module_id]: (refreshedLessons || []) as CourseLesson[],
      }));
      
      // Clear draft after successful save
      clearDraft();
      toast({ 
        title: "✓ Aula salva com sucesso!", 
        description: lessonForm.is_published 
          ? "A aula está publicada e visível para alunos." 
          : "A aula foi salva como rascunho."
      });
    } catch (err) {
      console.error("Error saving lesson:", err);
      toast({ 
        title: "Erro ao salvar aula", 
        description: "Ocorreu um erro inesperado. Tente novamente.",
        variant: "destructive" 
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelLessonEdit = useCallback(() => {
    // Ask if user wants to discard draft
    clearDraft();
    setShowDraftPrompt(false);
    setEditingLessonId(null);
    setIsCreatingLesson(false);
    setCreatingLessonForModule(null);
  }, [clearDraft]);

  const handleDuplicateLesson = async (lesson: CourseLesson) => {
    const { supabase } = await import("@/integrations/supabase/client");
    const moduleLessons = allLessons[lesson.module_id] || [];
    const nextPosition = moduleLessons.length + 1;
    
    await supabase
      .from("course_lessons")
      .insert({
        ...lesson,
        id: undefined,
        title: `${lesson.title} (cópia)`,
        position: nextPosition,
        is_published: false,
        created_at: undefined,
        updated_at: undefined,
      });
    
    // Refresh lessons
    const { data: refreshedLessons } = await supabase
      .from("course_lessons")
      .select("*")
      .eq("module_id", lesson.module_id)
      .order("position", { ascending: true });
    
    setAllLessons(prev => ({
      ...prev,
      [lesson.module_id]: (refreshedLessons || []) as CourseLesson[],
    }));
    
    toast({ title: "Aula duplicada!" });
  };

  const handleMoveLesson = async (lesson: CourseLesson, direction: "up" | "down") => {
    const { supabase } = await import("@/integrations/supabase/client");
    const moduleLessons = allLessons[lesson.module_id] || [];
    const currentIndex = moduleLessons.findIndex(l => l.id === lesson.id);
    
    if (direction === "up" && currentIndex > 0) {
      const otherLesson = moduleLessons[currentIndex - 1];
      await supabase.from("course_lessons").update({ position: currentIndex }).eq("id", lesson.id);
      await supabase.from("course_lessons").update({ position: currentIndex + 1 }).eq("id", otherLesson.id);
    } else if (direction === "down" && currentIndex < moduleLessons.length - 1) {
      const otherLesson = moduleLessons[currentIndex + 1];
      await supabase.from("course_lessons").update({ position: currentIndex + 2 }).eq("id", lesson.id);
      await supabase.from("course_lessons").update({ position: currentIndex + 1 }).eq("id", otherLesson.id);
    }
    
    // Refresh lessons
    const { data: refreshedLessons } = await supabase
      .from("course_lessons")
      .select("*")
      .eq("module_id", lesson.module_id)
      .order("position", { ascending: true });
    
    setAllLessons(prev => ({
      ...prev,
      [lesson.module_id]: (refreshedLessons || []) as CourseLesson[],
    }));
  };

  // Quick toggle lesson publish status
  const handleToggleLessonPublish = async (lesson: CourseLesson) => {
    const { supabase } = await import("@/integrations/supabase/client");
    const newStatus = !lesson.is_published;
    
    const { error } = await supabase
      .from("course_lessons")
      .update({ is_published: newStatus })
      .eq("id", lesson.id);
    
    if (error) {
      toast({ 
        title: "Erro ao alterar status", 
        description: error.message,
        variant: "destructive" 
      });
      return;
    }
    
    // Refresh lessons for this module
    const { data: refreshedLessons } = await supabase
      .from("course_lessons")
      .select("*")
      .eq("module_id", lesson.module_id)
      .order("position", { ascending: true });
    
    setAllLessons(prev => ({
      ...prev,
      [lesson.module_id]: (refreshedLessons || []) as CourseLesson[],
    }));
    
    toast({ 
      title: newStatus ? "✓ Aula publicada!" : "Aula despublicada",
      description: newStatus 
        ? "A aula agora está visível para os alunos."
        : "A aula foi movida para rascunhos."
    });
  };

  // Render lesson form
  const renderLessonForm = (moduleId: string) => (
    <div className="bg-muted/30 border rounded-xl p-4 space-y-4 mt-3">
      {/* Draft recovery prompt */}
      {showDraftPrompt && (
        <div className="bg-warning/10 border border-warning/30 rounded-lg p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FileUp className="w-5 h-5 text-warning" />
            <span className="text-sm font-medium">
              Rascunho encontrado. Deseja recuperar?
            </span>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDiscardDraft}
            >
              Descartar
            </Button>
            <Button
              size="sm"
              onClick={handleLoadDraft}
            >
              Recuperar
            </Button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h4 className="font-semibold">
          {editingLessonId ? "Editar Aula" : "Nova Aula"}
        </h4>
        <Button variant="ghost" size="sm" onClick={handleCancelLessonEdit}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="grid gap-4">
        <div className="space-y-2">
          <Label>Título *</Label>
          <Input
            value={lessonForm.title}
            onChange={(e) => setLessonForm(prev => ({ ...prev, title: e.target.value }))}
            placeholder="Ex: Introdução ao tema"
          />
        </div>

        <div className="space-y-2">
          <Label>Tipo de conteúdo *</Label>
          <div className="grid grid-cols-3 gap-2">
            {(["text", "video", "audio"] as const).map((type) => {
              const config = contentTypeConfig[type];
              const Icon = config.icon;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setLessonForm(prev => ({ ...prev, content_type: type }))}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                    lessonForm.content_type === type
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <Icon className={`w-6 h-6 ${lessonForm.content_type === type ? "text-primary" : "text-muted-foreground"}`} />
                  <span className="text-sm font-medium">{config.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {lessonForm.content_type === "text" && (
          <div className="space-y-2">
            <Label>Conteúdo do texto *</Label>
            <RichTextEditor
              value={lessonForm.body_markdown}
              onChange={(value) => setLessonForm(prev => ({ ...prev, body_markdown: value }))}
              placeholder="Escreva o conteúdo da aula..."
              minHeight="150px"
            />
          </div>
        )}

        {(lessonForm.content_type === "video" || lessonForm.content_type === "audio") && (
          <MediaUpload
            currentUrl={lessonForm.media_url || null}
            onUrlChange={(url) => setLessonForm(prev => ({ ...prev, media_url: url || "" }))}
            onDurationChange={(seconds) => setLessonForm(prev => ({ 
              ...prev, 
              duration_minutes: seconds ? String(Math.round(seconds / 60)) : "" 
            }))}
            mediaType={lessonForm.content_type as "video" | "audio"}
            label={`Arquivo de ${lessonForm.content_type === "video" ? "vídeo" : "áudio"} *`}
          />
        )}

        {/* Alternative Audio for Video Lessons (Podcast mode) */}
        {lessonForm.content_type === "video" && (
          <div className="border-t pt-4">
            <MediaUpload
              currentUrl={lessonForm.audio_url || null}
              onUrlChange={(url) => setLessonForm(prev => ({ ...prev, audio_url: url || "" }))}
              onDurationChange={(seconds) => setLessonForm(prev => ({ 
                ...prev, 
                audio_duration_minutes: seconds ? String(Math.round(seconds / 60)) : "" 
              }))}
              mediaType="audio"
              label="Áudio alternativo (modo podcast - opcional)"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Adicione uma versão somente em áudio para que os usuários possam ouvir como podcast.
            </p>
          </div>
        )}

        {/* Text Content for Video/Audio Lessons */}
        {(lessonForm.content_type === "video" || lessonForm.content_type === "audio") && (
          <div className="border-t pt-4 space-y-2">
            <Label>Conteúdo de texto complementar (opcional)</Label>
            <RichTextEditor
              value={lessonForm.body_markdown}
              onChange={(value) => setLessonForm(prev => ({ ...prev, body_markdown: value }))}
              placeholder="Adicione texto complementar, transcrição ou notas..."
              minHeight="120px"
            />
            <p className="text-xs text-muted-foreground">
              Este texto será exibido junto com o vídeo/áudio.
            </p>
          </div>
        )}

        <div className="space-y-2">
          <Label>Resumo (opcional)</Label>
          <Textarea
            value={lessonForm.summary}
            onChange={(e) => setLessonForm(prev => ({ ...prev, summary: e.target.value }))}
            placeholder="Breve descrição do conteúdo..."
            className="min-h-[80px]"
          />
        </div>

        {/* PDF Attachment */}
        <div className="border-t pt-4">
          <PdfUpload
            currentUrl={lessonForm.pdf_url || null}
            onUrlChange={(url) => setLessonForm(prev => ({ ...prev, pdf_url: url || "" }))}
            label="Material complementar em PDF (opcional)"
          />
          <p className="text-xs text-muted-foreground mt-2">
            Adicione um PDF que os usuários podem baixar junto com a aula.
          </p>
        </div>

        {/* Text Files Attachment */}
        <div className="border-t pt-4">
          <TextFilesUpload
            files={lessonForm.text_files}
            onFilesChange={(files) => setLessonForm(prev => ({ ...prev, text_files: files }))}
            label="Arquivos de texto complementares (opcional)"
            maxFiles={10}
          />
          <p className="text-xs text-muted-foreground mt-2">
            Adicione arquivos de texto (.txt, .md, .csv, .json, etc.) como material complementar.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Acesso</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={lessonForm.access_level === "basic" ? "default" : "outline"}
                size="sm"
                className="flex-1"
                onClick={() => setLessonForm(prev => ({ ...prev, access_level: "basic" }))}
              >
                Básico
              </Button>
              <Button
                type="button"
                variant={lessonForm.access_level === "premium" ? "default" : "outline"}
                size="sm"
                className="flex-1"
                onClick={() => setLessonForm(prev => ({ ...prev, access_level: "premium" }))}
              >
                Premium
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Liberar em</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  {lessonForm.released_at ? formatDateDisplay(lessonForm.released_at.toISOString()) : "Imediato"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={lessonForm.released_at || undefined}
                  onSelect={(date) => setLessonForm(prev => ({ ...prev, released_at: date || null }))}
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="flex items-center justify-between bg-background rounded-lg p-3">
          <Label>Publicar aula</Label>
          <Switch
            checked={lessonForm.is_published}
            onCheckedChange={(checked) => setLessonForm(prev => ({ ...prev, is_published: checked }))}
          />
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <Button variant="outline" className="flex-1" onClick={handleCancelLessonEdit}>
          Cancelar
        </Button>
        <Button className="flex-1" onClick={handleSaveLesson} disabled={isSaving}>
          {isSaving ? "Salvando..." : "Salvar Aula"}
        </Button>
      </div>
    </div>
  );

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-6 pb-16">
        {/* List View */}
        {viewMode === "list" && (
          <>
            <header className="space-y-2">
              <h1 className="text-3xl font-display font-semibold text-foreground">
                Cursos e Aulas
              </h1>
              <p className="text-muted-foreground">
                Gerencie cursos, módulos e aulas
              </p>
            </header>

            {coursesLoading ? (
              <LoadingState message="Carregando cursos..." />
            ) : (
              <div className="space-y-4">
                <Button
                  size="lg"
                  className="w-full text-lg h-14"
                  onClick={handleNewCourse}
                >
                  <Plus className="w-5 h-5 mr-2" /> Criar novo curso
                </Button>

                {courses.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    Nenhum curso criado ainda.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {courses.map((course) => (
                      <button
                        key={course.id}
                        onClick={() => handleSelectCourse(course)}
                        className="w-full text-left bg-card border rounded-2xl p-5 hover:border-primary/50 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="text-xl font-semibold">{course.title}</h3>
                            <div className="flex gap-2 mt-2">
                              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                course.type === "aparte" 
                                  ? "bg-primary/20 text-primary" 
                                  : "bg-muted text-muted-foreground"
                              }`}>
                                {typeLabels[course.type] || course.type}
                              </span>
                              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                course.is_published
                                  ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                                  : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
                              }`}>
                                {course.is_published ? "Publicado" : "Rascunho"}
                              </span>
                            </div>
                            {course.description_short && (
                              <p className="text-muted-foreground mt-2 line-clamp-2">
                                {course.description_short}
                              </p>
                            )}
                          </div>
                          <Pencil className="w-5 h-5 text-muted-foreground" />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Edit Course View */}
        {viewMode === "edit-course" && (
          <>
            <header className="space-y-2">
              <Button 
                variant="ghost" 
                size="sm" 
                className="-ml-2"
                onClick={handleBackToList}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Voltar para cursos
              </Button>
              <h1 className="text-2xl font-display font-semibold text-foreground">
                {selectedCourseId ? courseForm.title || "Editar Curso" : "Novo Curso"}
              </h1>
            </header>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full grid grid-cols-3">
                <TabsTrigger value="info">Curso</TabsTrigger>
                <TabsTrigger value="modules" disabled={!selectedCourseId}>
                  Módulos
                </TabsTrigger>
                <TabsTrigger value="content" disabled={!selectedCourseId}>
                  Aulas
                </TabsTrigger>
              </TabsList>

              {/* Tab: Course Info */}
              <TabsContent value="info" className="space-y-6 mt-6">
                <div className="bg-card border rounded-2xl p-6 space-y-5">
                  <div className="space-y-2">
                    <Label className="text-base">Nome do curso *</Label>
                    <Input
                      value={courseForm.title}
                      onChange={(e) => {
                        setCourseForm(prev => ({
                          ...prev,
                          title: e.target.value,
                          route_slug: prev.route_slug || generateSlug(e.target.value),
                        }));
                      }}
                      placeholder="Ex: Despertar Interior"
                      className="text-lg h-12"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-base">Tipo *</Label>
                    <div className="flex gap-2">
                      {[
                        { value: "basic", label: "Gratuito" },
                        { value: "regular", label: "Básico" },
                        { value: "aparte", label: "Premium" },
                      ].map((type) => (
                        <Button
                          key={type.value}
                          type="button"
                          variant={courseForm.type === type.value ? "default" : "outline"}
                          className="flex-1"
                          onClick={() => setCourseForm(prev => ({ ...prev, type: type.value }))}
                        >
                          {type.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-base">Descrição curta</Label>
                    <Textarea
                      value={courseForm.description_short}
                      onChange={(e) => setCourseForm(prev => ({ ...prev, description_short: e.target.value }))}
                      placeholder="Breve descrição do curso..."
                      className="min-h-[100px]"
                    />
                  </div>

                  <CourseImageUpload
                    currentUrl={courseForm.cover_image_url || null}
                    onUrlChange={(url) => setCourseForm(prev => ({ ...prev, cover_image_url: url || "" }))}
                    courseSlug={courseForm.route_slug || "new"}
                    label="Imagem de Capa"
                  />

                  <div className="space-y-2">
                    <Label className="text-base">Slug (endereço) *</Label>
                    <Input
                      value={courseForm.route_slug}
                      onChange={(e) => setCourseForm(prev => ({ ...prev, route_slug: e.target.value }))}
                      placeholder="despertar-interior"
                    />
                    <p className="text-sm text-muted-foreground">
                      Endereço: /aulas/{courseForm.route_slug || "exemplo"}
                    </p>
                  </div>

                  <div className="flex items-center justify-between bg-muted/50 rounded-xl p-4">
                    <Label className="text-base">Publicar curso</Label>
                    <Switch
                      checked={courseForm.is_published}
                      onCheckedChange={(checked) => setCourseForm(prev => ({ ...prev, is_published: checked }))}
                    />
                  </div>

                  <Button 
                    size="lg" 
                    className="w-full"
                    onClick={handleSaveCourse}
                    disabled={isSaving}
                  >
                    {isSaving ? "Salvando..." : selectedCourseId ? "Salvar alterações" : "Criar curso"}
                  </Button>
                </div>
              </TabsContent>

              {/* Tab: Modules */}
              <TabsContent value="modules" className="space-y-4 mt-6">
                {modulesLoading ? (
                  <LoadingState message="Carregando módulos..." />
                ) : (
                  <>
                    {/* New module form */}
                    {isCreatingModule ? (
                      <div className="bg-card border rounded-xl p-4 space-y-4">
                        <div className="space-y-2">
                          <Label>Nome do módulo *</Label>
                          <Input
                            value={moduleForm.title}
                            onChange={(e) => setModuleForm(prev => ({ ...prev, title: e.target.value }))}
                            placeholder="Ex: Introdução"
                            autoFocus
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label>Publicar</Label>
                          <Switch
                            checked={moduleForm.is_published}
                            onCheckedChange={(checked) => setModuleForm(prev => ({ ...prev, is_published: checked }))}
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" className="flex-1" onClick={handleCancelModuleEdit}>
                            Cancelar
                          </Button>
                          <Button className="flex-1" onClick={handleSaveModule} disabled={isSaving}>
                            {isSaving ? "Salvando..." : "Criar módulo"}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={handleStartCreateModule}
                      >
                        <Plus className="w-4 h-4 mr-2" /> Adicionar módulo
                      </Button>
                    )}

                    {modules.length === 0 && !isCreatingModule ? (
                      <div className="text-center py-8 text-muted-foreground">
                        Nenhum módulo criado ainda.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {modules.map((module, index) => (
                          <div
                            key={module.id}
                            className="bg-card border rounded-xl p-4"
                          >
                            {editingModuleId === module.id ? (
                              <div className="space-y-4">
                                <div className="space-y-2">
                                  <Label>Nome do módulo *</Label>
                                  <Input
                                    value={moduleForm.title}
                                    onChange={(e) => setModuleForm(prev => ({ ...prev, title: e.target.value }))}
                                    autoFocus
                                  />
                                </div>
                                <div className="flex items-center justify-between">
                                  <Label>Publicar</Label>
                                  <Switch
                                    checked={moduleForm.is_published}
                                    onCheckedChange={(checked) => setModuleForm(prev => ({ ...prev, is_published: checked }))}
                                  />
                                </div>
                                <div className="flex gap-2">
                                  <Button variant="outline" className="flex-1" onClick={handleCancelModuleEdit}>
                                    Cancelar
                                  </Button>
                                  <Button className="flex-1" onClick={handleSaveModule} disabled={isSaving}>
                                    Salvar
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="flex flex-col gap-0.5">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6"
                                      disabled={index === 0}
                                      onClick={() => moveModule(module.id, "up")}
                                    >
                                      <ChevronUp className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6"
                                      disabled={index === modules.length - 1}
                                      onClick={() => moveModule(module.id, "down")}
                                    >
                                      <ChevronDown className="w-4 h-4" />
                                    </Button>
                                  </div>
                                  <div>
                                    <p className="font-medium">{module.title}</p>
                                    <p className="text-sm text-muted-foreground">
                                      {(allLessons[module.id] || []).length} aulas • {module.is_published ? "Publicado" : "Rascunho"}
                                    </p>
                                  </div>
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => handleEditModule(module)}>
                                  <Pencil className="w-4 h-4" />
                                </Button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </TabsContent>

              {/* Tab: Aulas (Modules + Lessons) */}
              <TabsContent value="content" className="space-y-4 mt-6">
                {modulesLoading || lessonsLoading ? (
                  <LoadingState message="Carregando aulas..." />
                ) : modules.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-4">Crie módulos primeiro na aba "Módulos".</p>
                    <Button onClick={() => setActiveTab("modules")}>
                      Ir para Módulos
                    </Button>
                  </div>
                ) : (
                  <Accordion 
                    type="multiple" 
                    value={expandedModules}
                    onValueChange={setExpandedModules}
                    className="space-y-3"
                  >
                    {modules.map((module) => {
                      const moduleLessons = allLessons[module.id] || [];
                      return (
                        <AccordionItem 
                          key={module.id} 
                          value={module.id}
                          className="bg-card border rounded-xl overflow-hidden"
                        >
                          <AccordionTrigger className="px-4 py-3 hover:no-underline">
                            <div className="flex items-center gap-3 text-left">
                              <div>
                                <p className="font-semibold">{module.title}</p>
                                <p className="text-sm text-muted-foreground">
                                  {moduleLessons.length} {moduleLessons.length === 1 ? "aula" : "aulas"}
                                </p>
                              </div>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="px-4 pb-4">
                            {/* Lessons list */}
                            {moduleLessons.length > 0 && (
                              <div className="space-y-2 mb-4">
                                {moduleLessons.map((lesson, lessonIndex) => {
                                  const status = getLessonStatus(lesson);
                                  const config = contentTypeConfig[lesson.content_type as keyof typeof contentTypeConfig];
                                  const Icon = config?.icon || FileText;
                                  
                                  if (editingLessonId === lesson.id) {
                                    return (
                                      <div key={lesson.id}>
                                        {renderLessonForm(module.id)}
                                      </div>
                                    );
                                  }
                                  
                                  return (
                                    <div
                                      key={lesson.id}
                                      className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg group hover:bg-muted/50 transition-colors"
                                    >
                                      <div className="flex flex-col gap-0.5">
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-5 w-5 opacity-0 group-hover:opacity-100"
                                          disabled={lessonIndex === 0}
                                          onClick={() => handleMoveLesson(lesson, "up")}
                                        >
                                          <ChevronUp className="w-3 h-3" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-5 w-5 opacity-0 group-hover:opacity-100"
                                          disabled={lessonIndex === moduleLessons.length - 1}
                                          onClick={() => handleMoveLesson(lesson, "down")}
                                        >
                                          <ChevronDown className="w-3 h-3" />
                                        </Button>
                                      </div>
                                      
                                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${config?.color || "bg-muted"}`}>
                                        <Icon className="w-4 h-4" />
                                      </div>
                                      
                                      <div className="flex-1 min-w-0">
                                        <p className="font-medium truncate">{lesson.title}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                          <button
                                            onClick={() => handleToggleLessonPublish(lesson)}
                                            className={`px-2 py-0.5 rounded text-xs font-medium flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity ${status.color}`}
                                            title={lesson.is_published ? "Clique para despublicar" : "Clique para publicar"}
                                          >
                                            <span>{status.icon}</span>
                                            {status.label}
                                          </button>
                                          {lesson.access_level === "premium" && (
                                            <span className="px-2 py-0.5 rounded text-xs bg-primary/20 text-primary">
                                              Premium
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                      
                                      <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8"
                                          onClick={() => handleEditLesson(lesson)}
                                          title="Editar"
                                        >
                                          <Pencil className="w-4 h-4" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8"
                                          onClick={() => handleDuplicateLesson(lesson)}
                                          title="Duplicar"
                                        >
                                          <Copy className="w-4 h-4" />
                                        </Button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {/* Creating lesson form */}
                            {isCreatingLesson && creatingLessonForModule === module.id && (
                              renderLessonForm(module.id)
                            )}

                            {/* Add lesson button - simplified */}
                            {!isCreatingLesson && !editingLessonId && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full"
                                onClick={() => handleStartCreateLesson(module.id)}
                              >
                                <Plus className="w-4 h-4 mr-2" />
                                Nova aula
                              </Button>
                            )}
                          </AccordionContent>
                        </AccordionItem>
                      );
                    })}
                  </Accordion>
                )}
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </AppLayout>
  );
};

export default AdminCursos;