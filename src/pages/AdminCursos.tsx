import { supabase } from "@/integrations/supabase/client";
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
import { FilesUpload } from "@/components/admin/FilesUpload";
import { CourseImageUpload } from "@/components/admin/CourseImageUpload";
import { ConfirmModal } from "@/components/ui/Modal";
import { SortableLessonItem } from "@/components/admin/SortableLessonItem";
import { ConsolidateFragments } from "@/components/admin/ConsolidateFragments";
import { useState, useEffect, useCallback } from "react";
import { useAutoSaveLessonDraft } from "@/hooks/useAutoSaveLessonDraft";
import { 
  useAdminCourses, 
  useAdminModules, 
  useAdminLessons,
  generateSlug,
  isValidUrl,
  parseLessonVideos,
  type Course,
  type CourseModule,
  type CourseLesson,
  type LessonVideo,
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
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

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
  if (lesson.deleted_at) {
    return { label: "Removida", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400", icon: "✕" };
  }
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
    body_markdown: string;
    duration_minutes: string;
    audio_duration_minutes: string;
    released_at: Date | null;
    is_published: boolean;
    summary: string;
    module_id: string;
    files: { url: string; name: string }[];
    videos: LessonVideo[];
  }>({
    title: "",
    access_level: "basic",
    content_type: "text",
    media_url: "",
    audio_url: "",
    body_markdown: "",
    duration_minutes: "",
    audio_duration_minutes: "",
    released_at: null,
    is_published: false,
    summary: "",
    module_id: "",
    files: [],
    videos: [],
  });
  
  const [isSaving, setIsSaving] = useState(false);
  const [isCreatingModule, setIsCreatingModule] = useState(false);
  const [isCreatingLesson, setIsCreatingLesson] = useState(false);
  const [creatingLessonForModule, setCreatingLessonForModule] = useState<string | null>(null);
  const [deletingLesson, setDeletingLesson] = useState<CourseLesson | null>(null);
  const [isDeletingLesson, setIsDeletingLesson] = useState(false);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const { courses, isLoading: coursesLoading, createCourse, updateCourse, toggleCoursePublished } = useAdminCourses();
  const { modules, isLoading: modulesLoading, createModule, updateModule, moveModule } = useAdminModules(selectedCourseId);
  
  // We need to fetch lessons for all modules at once
  const [allLessons, setAllLessons] = useState<Record<string, CourseLesson[]>>({});
  const [lessonsLoading, setLessonsLoading] = useState(false);
  const [pendingOrderByModule, setPendingOrderByModule] = useState<Record<string, boolean>>({});
  const [savingOrderModuleId, setSavingOrderModuleId] = useState<string | null>(null);

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

  const clearPendingOrderFlag = useCallback((moduleId: string) => {
    setPendingOrderByModule((prev) => {
      if (!prev[moduleId]) return prev;

      const next = { ...prev };
      delete next[moduleId];
      return next;
    });
  }, []);

  const refreshModuleLessons = useCallback(
    async (moduleId: string) => {
      const { data, error } = await supabase
        .from("course_lessons")
        .select("*")
        .eq("module_id", moduleId)
        .order("position", { ascending: true });

      if (error) throw error;

      setAllLessons((prev) => ({
        ...prev,
        [moduleId]: (data || []) as CourseLesson[],
      }));
      clearPendingOrderFlag(moduleId);

      return (data || []) as CourseLesson[];
    },
    [clearPendingOrderFlag]
  );

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
        const { data } = await supabase
          .from("course_lessons")
          .select("*")
          .eq("module_id", module.id)
          .order("position", { ascending: true });
        
        lessonsMap[module.id] = (data || []) as CourseLesson[];
      }
      
      setAllLessons(lessonsMap);
      setPendingOrderByModule({});
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
      body_markdown: "",
      duration_minutes: "",
      audio_duration_minutes: "",
      released_at: null as Date | null,
      is_published: false,
      summary: "",
      module_id: moduleId,
      files: [] as { url: string; name: string }[],
      videos: [] as LessonVideo[],
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
      // Convert old draft format to new format if needed
      const files: { url: string; name: string }[] = [];
      if ((draft as any).pdf_url) {
        const pdfName = (draft as any).pdf_url.split('/').pop() || 'material.pdf';
        files.push({ url: (draft as any).pdf_url, name: pdfName });
      }
      if ((draft as any).text_files && Array.isArray((draft as any).text_files)) {
        files.push(...(draft as any).text_files);
      }
      if ((draft as any).files && Array.isArray((draft as any).files)) {
        files.push(...(draft as any).files);
      }
      
      setLessonForm({
        title: draft.title || "",
        access_level: draft.access_level || "basic",
        content_type: draft.content_type || "text",
        media_url: draft.media_url || "",
        audio_url: draft.audio_url || "",
        body_markdown: draft.body_markdown || "",
        duration_minutes: draft.duration_minutes || "",
        audio_duration_minutes: draft.audio_duration_minutes || "",
        released_at: draft.released_at ? new Date(draft.released_at) : null,
        is_published: draft.is_published || false,
        summary: draft.summary || "",
        module_id: draft.module_id || "",
        files,
        videos: (draft as any).videos || [],
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
    // Parse files from the lesson data - combine pdf_url and text_files_urls
    const textFiles = (lesson as any).text_files_urls || [];
    const pdfUrl = (lesson as any).pdf_url;
    
    // Combine PDF and text files into unified files array
    const allFiles: { url: string; name: string }[] = [];
    if (pdfUrl) {
      const pdfName = pdfUrl.split('/').pop() || 'material.pdf';
      allFiles.push({ url: pdfUrl, name: pdfName });
    }
    if (Array.isArray(textFiles)) {
      allFiles.push(...textFiles);
    }
    
    setLessonForm({
      title: lesson.title,
      access_level: lesson.access_level,
      content_type: lesson.content_type,
      media_url: lesson.media_url || "",
      audio_url: (lesson as any).audio_url || "",
      body_markdown: lesson.body_markdown || "",
      duration_minutes: lesson.duration_seconds ? String(Math.round(lesson.duration_seconds / 60)) : "",
      audio_duration_minutes: (lesson as any).audio_duration_seconds ? String(Math.round((lesson as any).audio_duration_seconds / 60)) : "",
      released_at: lesson.released_at ? new Date(lesson.released_at) : null,
      is_published: lesson.is_published,
      summary: lesson.summary || "",
      module_id: lesson.module_id,
      files: allFiles,
      videos: parseLessonVideos(lesson.videos),
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

    // Validate required media for video/audio content types
    if (lessonForm.content_type === "video" && !lessonForm.media_url.trim()) {
      toast({ title: "Falta preencher: Arquivo de vídeo", variant: "destructive" });
      return;
    }

    if (lessonForm.content_type === "audio" && !lessonForm.media_url.trim()) {
      toast({ title: "Falta preencher: Arquivo de áudio", variant: "destructive" });
      return;
    }

    // Validate URL format if provided
    if (lessonForm.media_url && !isValidUrl(lessonForm.media_url)) {
      toast({ title: "O link do vídeo não é válido.", variant: "destructive" });
      return;
    }

    if (lessonForm.audio_url && !isValidUrl(lessonForm.audio_url)) {
      toast({ title: "O link do áudio não é válido.", variant: "destructive" });
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
      const audioDurationSeconds = lessonForm.audio_duration_minutes 
        ? parseInt(lessonForm.audio_duration_minutes) * 60 
        : null;

      // Separate PDF from other files for database storage
      const pdfFile = lessonForm.files.find(f => f.name.toLowerCase().endsWith('.pdf'));
      const textFiles = lessonForm.files.filter(f => !f.name.toLowerCase().endsWith('.pdf'));
      
      const lessonData = {
        title: lessonForm.title.trim(),
        access_level: lessonForm.access_level,
        content_type: lessonForm.content_type,
        media_url: lessonForm.media_url.trim() || null,
        audio_url: lessonForm.audio_url.trim() || null,
        pdf_url: pdfFile?.url || null,
        body_markdown: lessonForm.body_markdown.trim() || null,
        duration_seconds: durationSeconds,
        audio_duration_seconds: audioDurationSeconds,
        released_at: lessonForm.released_at?.toISOString() || null,
        is_published: lessonForm.is_published,
        summary: lessonForm.summary.trim() || null,
        text_files_urls: textFiles,
        videos: (lessonForm.videos.length > 0 ? lessonForm.videos : []) as any,
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
          .insert({ ...lessonData, position: nextPosition } as any);
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
      await refreshModuleLessons(lessonForm.module_id);
      
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
    await refreshModuleLessons(lesson.module_id);
    
    toast({ title: "Aula duplicada!" });
  };

  const handleMoveLesson = async (lesson: CourseLesson, direction: "up" | "down") => {
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
    await refreshModuleLessons(lesson.module_id);
  };

  // Quick toggle lesson publish status
  const handleToggleLessonPublish = async (lesson: CourseLesson) => {
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
    await refreshModuleLessons(lesson.module_id);
    
    toast({ 
      title: newStatus ? "✓ Aula publicada!" : "Aula despublicada",
      description: newStatus 
        ? "A aula agora está visível para os alunos."
        : "A aula foi movida para rascunhos."
    });
  };

  // Soft delete lesson handler
  const handleSoftDeleteLesson = async () => {
    if (!deletingLesson) return;
    setIsDeletingLesson(true);
    try {
      const { error } = await supabase
        .from("course_lessons")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", deletingLesson.id);

      if (error) {
        toast({ title: "Erro ao remover aula", description: error.message, variant: "destructive" });
        return;
      }

      // Refresh lessons
      await refreshModuleLessons(deletingLesson.module_id);

      toast({ title: "Aula removida", description: "A aula não está mais disponível para os alunos." });
    } finally {
      setIsDeletingLesson(false);
      setDeletingLesson(null);
    }
  };

  // Drag and drop handler
  const handleDragEnd = async (event: DragEndEvent, moduleId: string) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const moduleLessons = allLessons[moduleId] || [];
    const oldIndex = moduleLessons.findIndex(l => l.id === active.id);
    const newIndex = moduleLessons.findIndex(l => l.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    // Optimistic reorder with updated position fields
    const reordered = [...moduleLessons];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);
    const withPositions = reordered.map((l, i) => ({ ...l, position: i + 1 }));

    setAllLessons(prev => ({ ...prev, [moduleId]: withPositions }));
    setPendingOrderByModule((prev) => ({ ...prev, [moduleId]: true }));
  };

  const handleSaveLessonOrder = async (moduleId: string) => {
    const moduleLessons = allLessons[moduleId] || [];
    if (moduleLessons.length === 0) return;

    setSavingOrderModuleId(moduleId);

    try {
      const results = await Promise.all(
        moduleLessons.map((lesson) =>
          supabase
            .from("course_lessons")
            .update({ position: lesson.position })
            .eq("id", lesson.id)
        )
      );

      const hasError = results.some((result) => result.error);
      if (hasError) {
        throw new Error("Falha ao salvar a nova ordem das aulas");
      }

      await refreshModuleLessons(moduleId);
      toast({ title: "Ordem validada e salva!" });
    } catch (error) {
      console.error("Error saving lesson order:", error);
      toast({
        title: "Erro ao salvar a ordem",
        description: "Não foi possível confirmar a nova ordem. Tente novamente.",
        variant: "destructive",
      });
      await refreshModuleLessons(moduleId);
    } finally {
      setSavingOrderModuleId(null);
    }
  };

  // Render lesson form
  const renderLessonForm = (moduleId: string) => (
    <div className="bg-muted/30 border rounded-xl p-3 sm:p-4 space-y-3 sm:space-y-4 mt-3 -mx-1 sm:mx-0 overflow-visible">
      {/* Draft recovery prompt */}
      {showDraftPrompt && (
        <div className="bg-warning/10 border border-warning/30 rounded-lg p-3 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <FileUp className="w-5 h-5 text-warning shrink-0" />
            <span className="text-sm font-medium">
              Rascunho encontrado. Deseja recuperar?
            </span>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={handleDiscardDraft}
            >
              Descartar
            </Button>
            <Button
              size="sm"
              className="flex-1"
              onClick={handleLoadDraft}
            >
              Recuperar
            </Button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-sm sm:text-base">
          {editingLessonId ? "Editar Aula" : "Nova Aula"}
        </h4>
        <Button variant="ghost" size="sm" onClick={handleCancelLessonEdit}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="grid gap-3 sm:gap-4 min-w-0 overflow-x-auto">
        <div className="space-y-1.5">
          <Label className="text-sm">Título *</Label>
          <Input
            value={lessonForm.title}
            onChange={(e) => setLessonForm(prev => ({ ...prev, title: e.target.value }))}
            placeholder="Ex: Introdução ao tema"
            className="h-10"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm">Tipo de conteúdo *</Label>
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
            {(["text", "video", "audio"] as const).map((type) => {
              const config = contentTypeConfig[type];
              const Icon = config.icon;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setLessonForm(prev => ({ ...prev, content_type: type }))}
                  className={`flex flex-col items-center gap-1 sm:gap-2 p-2 sm:p-3 rounded-lg sm:rounded-xl border-2 transition-all ${
                    lessonForm.content_type === type
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${lessonForm.content_type === type ? "text-primary" : "text-muted-foreground"}`} />
                  <span className="text-xs sm:text-sm font-medium">{config.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {lessonForm.content_type === "text" && (
          <div className="space-y-1.5">
            <Label className="text-sm">Conteúdo do texto *</Label>
            <RichTextEditor
              value={lessonForm.body_markdown}
              onChange={(value) => setLessonForm(prev => ({ ...prev, body_markdown: value }))}
              placeholder="Escreva o conteúdo da aula..."
              minHeight="120px"
            />
          </div>
        )}

        {/* Multiple Videos Editor */}
        {(lessonForm.content_type === "video" || lessonForm.content_type === "text") && (
          <div className="space-y-2 border rounded-lg p-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Vídeos ({lessonForm.videos.length}/10)</Label>
              {lessonForm.videos.length < 10 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setLessonForm(prev => ({
                    ...prev,
                    videos: [...prev.videos, { url: "", title: "", position: prev.videos.length }],
                  }))}
                >
                  <Plus className="w-3 h-3 mr-1" /> Adicionar Vídeo
                </Button>
              )}
            </div>
            {lessonForm.videos.length === 0 && (
              <p className="text-xs text-muted-foreground">Nenhum vídeo adicionado. Use o botão acima ou o campo abaixo para vídeo único.</p>
            )}
            {lessonForm.videos.map((video, idx) => (
              <div key={idx} className="flex gap-2 items-start">
                <div className="flex-1 space-y-1">
                  <Input
                    value={video.title}
                    onChange={(e) => {
                      const updated = [...lessonForm.videos];
                      updated[idx] = { ...updated[idx], title: e.target.value };
                      setLessonForm(prev => ({ ...prev, videos: updated }));
                    }}
                    placeholder={`Título do vídeo ${idx + 1}`}
                    className="h-8 text-xs"
                  />
                  <Input
                    value={video.url}
                    onChange={(e) => {
                      const updated = [...lessonForm.videos];
                      updated[idx] = { ...updated[idx], url: e.target.value };
                      setLessonForm(prev => ({ ...prev, videos: updated }));
                    }}
                    placeholder="URL (YouTube, Vimeo, Bunny ou .mp4)"
                    className="h-8 text-xs"
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 shrink-0 mt-0.5"
                  onClick={() => {
                    const updated = lessonForm.videos.filter((_, i) => i !== idx);
                    setLessonForm(prev => ({ ...prev, videos: updated }));
                  }}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Single Video Upload fallback - available for video and text lessons */}
        {(lessonForm.content_type === "video" || lessonForm.content_type === "text") && lessonForm.videos.length === 0 && (
          <MediaUpload
            currentUrl={lessonForm.media_url || null}
            onUrlChange={(url) => setLessonForm(prev => ({ ...prev, media_url: url || "" }))}
            onDurationChange={(seconds) => setLessonForm(prev => ({ 
              ...prev, 
              duration_minutes: seconds ? String(Math.round(seconds / 60)) : "" 
            }))}
            mediaType="video"
            label={lessonForm.content_type === "video" ? "Vídeo *" : "Vídeo (opcional)"}
          />
        )}

        {/* Audio Upload - available for audio and text lessons */}
        {(lessonForm.content_type === "audio" || lessonForm.content_type === "text") && (
          <MediaUpload
            currentUrl={lessonForm.content_type === "audio" ? lessonForm.media_url || null : lessonForm.audio_url || null}
            onUrlChange={(url) => {
              if (lessonForm.content_type === "audio") {
                setLessonForm(prev => ({ ...prev, media_url: url || "" }));
              } else {
                setLessonForm(prev => ({ ...prev, audio_url: url || "" }));
              }
            }}
            onDurationChange={(seconds) => {
              if (lessonForm.content_type === "audio") {
                setLessonForm(prev => ({ 
                  ...prev, 
                  duration_minutes: seconds ? String(Math.round(seconds / 60)) : "" 
                }));
              } else {
                setLessonForm(prev => ({ 
                  ...prev, 
                  audio_duration_minutes: seconds ? String(Math.round(seconds / 60)) : "" 
                }));
              }
            }}
            mediaType="audio"
            label={lessonForm.content_type === "audio" ? "Áudio *" : "Áudio/Podcast (opcional)"}
          />
        )}

        {/* Alternative Audio for Video Lessons (Podcast mode) */}
        {lessonForm.content_type === "video" && (
          <MediaUpload
            currentUrl={lessonForm.audio_url || null}
            onUrlChange={(url) => setLessonForm(prev => ({ ...prev, audio_url: url || "" }))}
            onDurationChange={(seconds) => setLessonForm(prev => ({ 
              ...prev, 
              audio_duration_minutes: seconds ? String(Math.round(seconds / 60)) : "" 
            }))}
            mediaType="audio"
            label="Áudio alternativo (podcast)"
          />
        )}

        {/* Text Content for Video/Audio Lessons */}
        {(lessonForm.content_type === "video" || lessonForm.content_type === "audio") && (
          <div className="border-t pt-3 sm:pt-4 space-y-1.5">
            <Label className="text-sm">Texto complementar (opcional)</Label>
            <RichTextEditor
              value={lessonForm.body_markdown}
              onChange={(value) => setLessonForm(prev => ({ ...prev, body_markdown: value }))}
              placeholder="Adicione texto, transcrição ou notas..."
              minHeight="100px"
            />
          </div>
        )}

        <div className="space-y-1.5">
          <Label className="text-sm">Resumo (opcional)</Label>
          <Textarea
            value={lessonForm.summary}
            onChange={(e) => setLessonForm(prev => ({ ...prev, summary: e.target.value }))}
            placeholder="Breve descrição do conteúdo..."
            className="min-h-[60px] text-sm"
          />
        </div>

        {/* Materials Attachment - Unified PDF and text files */}
        <div className="border-t pt-3 sm:pt-4">
          <FilesUpload
            files={lessonForm.files}
            onFilesChange={(files) => setLessonForm(prev => ({ ...prev, files }))}
            label="Materiais complementares"
            maxFiles={10}
          />
          <p className="text-xs text-muted-foreground mt-1.5">
            PDFs, documentos, planilhas (opcional)
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-sm">Acesso</Label>
            <div className="flex gap-1.5">
              <Button
                type="button"
                variant={lessonForm.access_level === "basic" ? "default" : "outline"}
                size="sm"
                className="flex-1 h-9"
                onClick={() => setLessonForm(prev => ({ ...prev, access_level: "basic" }))}
              >
                Básico
              </Button>
              <Button
                type="button"
                variant={lessonForm.access_level === "premium" ? "default" : "outline"}
                size="sm"
                className="flex-1 h-9"
                onClick={() => setLessonForm(prev => ({ ...prev, access_level: "premium" }))}
              >
                Premium
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm">Liberar em</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="w-full justify-start h-9">
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  <span className="truncate">
                    {lessonForm.released_at ? formatDateDisplay(lessonForm.released_at.toISOString()) : "Imediato"}
                  </span>
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
          <Label className="text-sm">Publicar aula</Label>
          <Switch
            checked={lessonForm.is_published}
            onCheckedChange={(checked) => setLessonForm(prev => ({ ...prev, is_published: checked }))}
          />
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <Button variant="outline" className="flex-1 h-10" onClick={handleCancelLessonEdit}>
          Cancelar
        </Button>
        <Button className="flex-1 h-10" onClick={handleSaveLesson} disabled={isSaving}>
          {isSaving ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </div>
  );

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6 pb-16 overflow-visible">
        {/* List View */}
        {viewMode === "list" && (
          <>
            <header className="space-y-1 sm:space-y-2">
              <h1 className="text-2xl sm:text-3xl font-display font-semibold text-foreground">
                Cursos e Aulas
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground">
                Gerencie cursos, módulos e aulas
              </p>
            </header>

            {coursesLoading ? (
              <LoadingState message="Carregando cursos..." />
            ) : (
              <div className="space-y-3 sm:space-y-4">
                <Button
                  size="lg"
                  className="w-full text-base sm:text-lg h-12 sm:h-14"
                  onClick={handleNewCourse}
                >
                  <Plus className="w-5 h-5 mr-2" /> Criar novo curso
                </Button>

                {courses.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    Nenhum curso criado ainda.
                  </div>
                ) : (
                  <div className="space-y-2 sm:space-y-3">
                    {courses.map((course) => (
                      <button
                        key={course.id}
                        onClick={() => handleSelectCourse(course)}
                        className="w-full text-left bg-card border rounded-xl sm:rounded-2xl p-4 sm:p-5 hover:border-primary/50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <h3 className="text-lg sm:text-xl font-semibold truncate">{course.title}</h3>
                            <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-2">
                              <span className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs sm:text-sm font-medium ${
                                course.type === "aparte" 
                                  ? "bg-primary/20 text-primary" 
                                  : "bg-muted text-muted-foreground"
                              }`}>
                                {typeLabels[course.type] || course.type}
                              </span>
                              <span className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs sm:text-sm font-medium ${
                                course.is_published
                                  ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                                  : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
                              }`}>
                                {course.is_published ? "Publicado" : "Rascunho"}
                              </span>
                            </div>
                            {course.description_short && (
                              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                                {course.description_short}
                              </p>
                            )}
                          </div>
                          <Pencil className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground shrink-0" />
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
            <header className="space-y-1 sm:space-y-2">
              <Button 
                variant="ghost" 
                size="sm" 
                className="-ml-2"
                onClick={handleBackToList}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Voltar
              </Button>
              <h1 className="text-xl sm:text-2xl font-display font-semibold text-foreground">
                {selectedCourseId ? courseForm.title || "Editar Curso" : "Novo Curso"}
              </h1>
            </header>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full grid grid-cols-3 h-12 sm:h-14">
                <TabsTrigger value="info" className="text-sm sm:text-base font-semibold tracking-wide uppercase">Curso</TabsTrigger>
                <TabsTrigger value="modules" disabled={!selectedCourseId} className="text-sm sm:text-base font-semibold tracking-wide uppercase">
                  Módulos
                </TabsTrigger>
                <TabsTrigger value="content" disabled={!selectedCourseId} className="text-sm sm:text-base font-semibold tracking-wide uppercase">
                  Aulas
                </TabsTrigger>
              </TabsList>

              {/* Tab: Course Info */}
              <TabsContent value="info" className="space-y-4 sm:space-y-6 mt-4 sm:mt-6">
                <div className="bg-card border rounded-xl sm:rounded-2xl p-4 sm:p-6 space-y-4 sm:space-y-5">
                  <div className="space-y-1.5">
                    <Label className="text-sm sm:text-base">Nome do curso *</Label>
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
                      className="text-base h-11 sm:h-12"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-sm sm:text-base">Tipo *</Label>
                    <div className="flex gap-1.5 sm:gap-2">
                      {[
                        { value: "basic", label: "Gratuito" },
                        { value: "regular", label: "Básico" },
                        { value: "aparte", label: "Premium" },
                      ].map((type) => (
                        <Button
                          key={type.value}
                          type="button"
                          variant={courseForm.type === type.value ? "default" : "outline"}
                          className="flex-1 text-xs sm:text-sm h-9 sm:h-10"
                          onClick={() => setCourseForm(prev => ({ ...prev, type: type.value }))}
                        >
                          {type.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-sm sm:text-base">Descrição curta</Label>
                    <Textarea
                      value={courseForm.description_short}
                      onChange={(e) => setCourseForm(prev => ({ ...prev, description_short: e.target.value }))}
                      placeholder="Breve descrição do curso..."
                      className="min-h-[80px] text-sm"
                    />
                  </div>

                  <CourseImageUpload
                    currentUrl={courseForm.cover_image_url || null}
                    onUrlChange={(url) => setCourseForm(prev => ({ ...prev, cover_image_url: url || "" }))}
                    courseSlug={courseForm.route_slug || "new"}
                    label="Imagem de Capa"
                  />

                  <div className="space-y-1.5">
                    <Label className="text-sm sm:text-base">Slug (endereço) *</Label>
                    <Input
                      value={courseForm.route_slug}
                      onChange={(e) => setCourseForm(prev => ({ ...prev, route_slug: e.target.value }))}
                      placeholder="despertar-interior"
                      className="text-sm"
                    />
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      /aulas/{courseForm.route_slug || "exemplo"}
                    </p>
                  </div>

                  <div className="flex items-center justify-between bg-muted/50 rounded-lg sm:rounded-xl p-3 sm:p-4">
                    <Label className="text-sm sm:text-base">Publicar curso</Label>
                    <Switch
                      checked={courseForm.is_published}
                      onCheckedChange={(checked) => setCourseForm(prev => ({ ...prev, is_published: checked }))}
                    />
                  </div>

                  <Button 
                    size="lg" 
                    className="w-full h-11 sm:h-12"
                    onClick={handleSaveCourse}
                    disabled={isSaving}
                  >
                    {isSaving ? "Salvando..." : selectedCourseId ? "Salvar" : "Criar curso"}
                  </Button>
                </div>
              </TabsContent>

              {/* Tab: Modules */}
              <TabsContent value="modules" className="space-y-3 sm:space-y-4 mt-4 sm:mt-6">
                {modulesLoading ? (
                  <LoadingState message="Carregando módulos..." />
                ) : (
                  <>
                    {/* New module form */}
                    {isCreatingModule ? (
                      <div className="bg-card border rounded-xl p-3 sm:p-4 space-y-3 sm:space-y-4">
                        <div className="space-y-1.5">
                          <Label className="text-sm">Nome do módulo *</Label>
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
                            className="bg-card border rounded-xl p-3 sm:p-4"
                          >
                            {editingModuleId === module.id ? (
                              <div className="space-y-3 sm:space-y-4">
                                <div className="space-y-1.5">
                                  <Label className="text-sm">Nome do módulo *</Label>
                                  <Input
                                    value={moduleForm.title}
                                    onChange={(e) => setModuleForm(prev => ({ ...prev, title: e.target.value }))}
                                    autoFocus
                                  />
                                </div>
                                <div className="flex items-center justify-between">
                                  <Label className="text-sm">Publicar</Label>
                                  <Switch
                                    checked={moduleForm.is_published}
                                    onCheckedChange={(checked) => setModuleForm(prev => ({ ...prev, is_published: checked }))}
                                  />
                                </div>
                                <div className="flex gap-2">
                                  <Button variant="outline" className="flex-1 h-9" onClick={handleCancelModuleEdit}>
                                    Cancelar
                                  </Button>
                                  <Button className="flex-1 h-9" onClick={handleSaveModule} disabled={isSaving}>
                                    Salvar
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                                  <div className="flex flex-col gap-0.5">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-5 w-5 sm:h-6 sm:w-6"
                                      disabled={index === 0}
                                      onClick={() => moveModule(module.id, "up")}
                                    >
                                      <ChevronUp className="w-3 h-3 sm:w-4 sm:h-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-5 w-5 sm:h-6 sm:w-6"
                                      disabled={index === modules.length - 1}
                                      onClick={() => moveModule(module.id, "down")}
                                    >
                                      <ChevronDown className="w-3 h-3 sm:w-4 sm:h-4" />
                                    </Button>
                                  </div>
                                  <div className="min-w-0">
                                    <p className="font-medium text-sm sm:text-base truncate">{module.title}</p>
                                    <p className="text-xs sm:text-sm text-muted-foreground">
                                      {(allLessons[module.id] || []).length} aulas • {module.is_published ? "Publicado" : "Rascunho"}
                                    </p>
                                  </div>
                                </div>
                                <Button variant="ghost" size="sm" className="shrink-0" onClick={() => handleEditModule(module)}>
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
              <TabsContent value="content" className="space-y-3 sm:space-y-4 mt-4 sm:mt-6">
                {modulesLoading || lessonsLoading ? (
                  <LoadingState message="Carregando aulas..." />
                ) : modules.length === 0 ? (
                  <div className="text-center py-6 sm:py-8">
                    <p className="text-sm text-muted-foreground mb-4">Crie módulos primeiro na aba "Módulos".</p>
                    <Button size="sm" onClick={() => setActiveTab("modules")}>
                      Ir para Módulos
                    </Button>
                  </div>
                ) : (
                  <Accordion 
                    type="multiple" 
                    value={expandedModules}
                    onValueChange={setExpandedModules}
                    className="space-y-2 sm:space-y-3"
                  >
                    {modules.map((module) => {
                      const moduleLessons = allLessons[module.id] || [];
                      return (
                        <AccordionItem 
                          key={module.id} 
                          value={module.id}
                          className="bg-card border rounded-xl overflow-visible"
                        >
                          <AccordionTrigger className="px-3 sm:px-4 py-2.5 sm:py-3 hover:no-underline">
                            <div className="flex items-center gap-2 sm:gap-3 text-left min-w-0">
                              <div className="min-w-0">
                                <p className="font-semibold text-sm sm:text-base truncate">{module.title}</p>
                                <p className="text-xs sm:text-sm text-muted-foreground">
                                  {moduleLessons.length} {moduleLessons.length === 1 ? "aula" : "aulas"}
                                </p>
                              </div>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="px-2 sm:px-4 pb-3 sm:pb-4 overflow-visible">
                            {/* Lessons list with drag and drop */}
                            {moduleLessons.length > 0 && (
                              <>
                                {pendingOrderByModule[module.id] && (
                                  <div className="mb-3 flex flex-col gap-2 rounded-lg border bg-muted/30 p-3 sm:flex-row sm:items-center sm:justify-between">
                                    <p className="text-xs sm:text-sm text-muted-foreground">
                                      Revise a ordem acima e confirme para salvar a nova sequência das aulas.
                                    </p>
                                    <Button
                                      size="sm"
                                      className="shrink-0"
                                      onClick={() => handleSaveLessonOrder(module.id)}
                                      disabled={savingOrderModuleId === module.id}
                                    >
                                      {savingOrderModuleId === module.id ? "Salvando ordem..." : "Validar e salvar ordem"}
                                    </Button>
                                  </div>
                                )}

                                <DndContext
                                  sensors={sensors}
                                  collisionDetection={closestCenter}
                                  onDragEnd={(event) => handleDragEnd(event, module.id)}
                                >
                                  <SortableContext
                                    items={moduleLessons.map(l => l.id)}
                                    strategy={verticalListSortingStrategy}
                                  >
                                    <div className="space-y-1.5 sm:space-y-2 mb-3 sm:mb-4">
                                      {moduleLessons.map((lesson) => {
                                        if (editingLessonId === lesson.id) {
                                          return (
                                            <div key={lesson.id}>
                                              {renderLessonForm(module.id)}
                                            </div>
                                          );
                                        }
                                        
                                        return (
                                          <SortableLessonItem
                                            key={lesson.id}
                                            lesson={lesson}
                                            onEdit={handleEditLesson}
                                            onDuplicate={handleDuplicateLesson}
                                            onDelete={(l) => setDeletingLesson(l)}
                                            onTogglePublish={handleToggleLessonPublish}
                                          />
                                        );
                                      })}
                                    </div>
                                  </SortableContext>
                                </DndContext>
                              </>
                            )}

                            {/* Creating lesson form */}
                            {isCreatingLesson && creatingLessonForModule === module.id && (
                              renderLessonForm(module.id)
                            )}

                            {/* Add lesson button */}
                            {!isCreatingLesson && !editingLessonId && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full h-9"
                                onClick={() => handleStartCreateLesson(module.id)}
                              >
                                <Plus className="w-4 h-4 mr-2" />
                                Nova aula
                              </Button>
                            )}

                            {/* Consolidate - always visible when there are 2+ lessons */}
                            <ConsolidateFragments
                              lessons={moduleLessons}
                              moduleId={module.id}
                              courseId={selectedCourseId!}
                              onConsolidated={async () => {
                                await refreshModuleLessons(module.id);
                              }}
                            />
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

      {/* Delete confirmation modal */}
      <ConfirmModal
        open={!!deletingLesson}
        onOpenChange={(open) => { if (!open) setDeletingLesson(null); }}
        title="Remover esta aula?"
        description={`"${deletingLesson?.title}" não ficará mais disponível para os alunos. Você pode restaurar depois.`}
        confirmLabel="Remover"
        cancelLabel="Cancelar"
        onConfirm={handleSoftDeleteLesson}
        loading={isDeletingLesson}
      />
    </AppLayout>
  );
};

export default AdminCursos;