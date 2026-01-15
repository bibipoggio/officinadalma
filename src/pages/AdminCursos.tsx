import { AppLayout } from "@/components/layout/AppLayout";
import { LoadingState } from "@/components/layout/PageState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useState } from "react";
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
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Step = "courses" | "modules" | "lessons";
type EditMode = "view" | "edit-course" | "new-course" | "edit-module" | "new-module" | "edit-lesson" | "new-lesson";

const typeLabels: Record<string, string> = {
  regular: "Básico",
  aparte: "Premium",
};

const contentTypeLabels: Record<string, string> = {
  video: "Vídeo",
  audio: "Áudio",
  text: "Texto",
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

const getLessonStatus = (lesson: CourseLesson): { label: string; color: string } => {
  if (!lesson.is_published) {
    return { label: "Rascunho", color: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300" };
  }
  if (lesson.released_at && new Date(lesson.released_at) > new Date()) {
    return { label: "Agendada", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400" };
  }
  return { label: "Publicada", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" };
};

const AdminCursos = () => {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("courses");
  const [editMode, setEditMode] = useState<EditMode>("view");
  
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  
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
    body_markdown: string;
    duration_minutes: string;
    released_at: Date | null;
    is_published: boolean;
    summary: string;
  }>({
    title: "",
    access_level: "basic",
    content_type: "video",
    media_url: "",
    body_markdown: "",
    duration_minutes: "",
    released_at: null,
    is_published: false,
    summary: "",
  });
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const { courses, isLoading: coursesLoading, createCourse, updateCourse, toggleCoursePublished } = useAdminCourses();
  const { modules, isLoading: modulesLoading, createModule, updateModule, moveModule } = useAdminModules(selectedCourseId);
  const { lessons, isLoading: lessonsLoading, createLesson, updateLesson, duplicateLesson, moveLesson } = useAdminLessons(selectedModuleId, selectedCourseId);

  const selectedCourse = courses.find(c => c.id === selectedCourseId);
  const selectedModule = modules.find(m => m.id === selectedModuleId);

  // Handlers
  const handleSelectCourse = (courseId: string) => {
    setSelectedCourseId(courseId);
    setSelectedModuleId(null);
    setStep("modules");
    setEditMode("view");
  };

  const handleSelectModule = (moduleId: string) => {
    setSelectedModuleId(moduleId);
    setStep("lessons");
    setEditMode("view");
  };

  const handleBackToCourses = () => {
    setStep("courses");
    setSelectedCourseId(null);
    setSelectedModuleId(null);
    setEditMode("view");
  };

  const handleBackToModules = () => {
    setStep("modules");
    setSelectedModuleId(null);
    setEditMode("view");
  };

  // Course form handlers
  const handleNewCourse = () => {
    setCourseForm({
      title: "",
      type: "regular",
      description_short: "",
      cover_image_url: "",
      route_slug: "",
      is_published: false,
    });
    setEditingId(null);
    setEditMode("new-course");
  };

  const handleEditCourse = (course: Course) => {
    setCourseForm({
      title: course.title,
      type: course.type,
      description_short: course.description_short || "",
      cover_image_url: course.cover_image_url || "",
      route_slug: course.route_slug,
      is_published: course.is_published,
    });
    setEditingId(course.id);
    setEditMode("edit-course");
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
      if (editingId) {
        await updateCourse(editingId, {
          title: courseForm.title.trim(),
          type: courseForm.type,
          description_short: courseForm.description_short.trim() || null,
          cover_image_url: courseForm.cover_image_url.trim() || null,
          route_slug: courseForm.route_slug.trim(),
          is_published: courseForm.is_published,
        });
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
        }
      }
      setEditMode("view");
    } finally {
      setIsSaving(false);
    }
  };

  // Module form handlers
  const handleNewModule = () => {
    setModuleForm({ title: "", is_published: false });
    setEditingId(null);
    setEditMode("new-module");
  };

  const handleEditModule = (module: CourseModule) => {
    setModuleForm({
      title: module.title,
      is_published: module.is_published,
    });
    setEditingId(module.id);
    setEditMode("edit-module");
  };

  const handleSaveModule = async () => {
    if (!moduleForm.title.trim()) {
      toast({ title: "Falta preencher: Nome do módulo", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      if (editingId) {
        await updateModule(editingId, {
          title: moduleForm.title.trim(),
          is_published: moduleForm.is_published,
        });
      } else {
        await createModule(moduleForm.title.trim(), moduleForm.is_published);
      }
      setEditMode("view");
    } finally {
      setIsSaving(false);
    }
  };

  // Lesson form handlers
  const handleNewLesson = () => {
    setLessonForm({
      title: "",
      access_level: "basic",
      content_type: "video",
      media_url: "",
      body_markdown: "",
      duration_minutes: "",
      released_at: null,
      is_published: false,
      summary: "",
    });
    setEditingId(null);
    setEditMode("new-lesson");
  };

  const handleEditLesson = (lesson: CourseLesson) => {
    setLessonForm({
      title: lesson.title,
      access_level: lesson.access_level,
      content_type: lesson.content_type,
      media_url: lesson.media_url || "",
      body_markdown: lesson.body_markdown || "",
      duration_minutes: lesson.duration_seconds ? String(Math.round(lesson.duration_seconds / 60)) : "",
      released_at: lesson.released_at ? new Date(lesson.released_at) : null,
      is_published: lesson.is_published,
      summary: lesson.summary || "",
    });
    setEditingId(lesson.id);
    setEditMode("edit-lesson");
  };

  const handleSaveLesson = async () => {
    if (!lessonForm.title.trim()) {
      toast({ title: "Falta preencher: Título", variant: "destructive" });
      return;
    }

    if ((lessonForm.content_type === "video" || lessonForm.content_type === "audio") && !lessonForm.media_url.trim()) {
      toast({ title: "Falta preencher: Link do vídeo/áudio", variant: "destructive" });
      return;
    }

    if ((lessonForm.content_type === "video" || lessonForm.content_type === "audio") && lessonForm.media_url && !isValidUrl(lessonForm.media_url)) {
      toast({ title: "O link do vídeo/áudio não é válido.", variant: "destructive" });
      return;
    }

    if (lessonForm.content_type === "text" && !lessonForm.body_markdown.trim()) {
      toast({ title: "Falta preencher: Texto da aula", variant: "destructive" });
      return;
    }

    const durationMinutes = parseInt(lessonForm.duration_minutes, 10);
    const durationSeconds = isNaN(durationMinutes) || durationMinutes < 0 ? null : durationMinutes * 60;

    setIsSaving(true);
    try {
      const lessonData = {
        title: lessonForm.title.trim(),
        access_level: lessonForm.access_level,
        content_type: lessonForm.content_type,
        media_url: lessonForm.media_url.trim() || null,
        body_markdown: lessonForm.body_markdown.trim() || null,
        duration_seconds: durationSeconds,
        released_at: lessonForm.released_at?.toISOString() || null,
        is_published: lessonForm.is_published,
        summary: lessonForm.summary.trim() || null,
        course_id: selectedCourseId!,
        module_id: selectedModuleId!,
      };

      if (editingId) {
        await updateLesson(editingId, lessonData);
      } else {
        await createLesson(lessonData);
      }
      setEditMode("view");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDuplicateLesson = async (lesson: CourseLesson) => {
    await duplicateLesson(lesson);
  };

  // Render course form
  const renderCourseForm = () => (
    <div className="bg-card border rounded-2xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-display font-semibold">
          {editingId ? "Editar Curso" : "Novo Curso"}
        </h2>
        <Button variant="ghost" size="lg" onClick={() => setEditMode("view")}>
          <X className="w-5 h-5 mr-2" /> Cancelar
        </Button>
      </div>

      <div className="space-y-5">
        <div className="space-y-2">
          <Label className="text-lg">Nome do curso *</Label>
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
            className="text-lg h-14"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-lg">Tipo *</Label>
          <div className="flex gap-4">
            <Button
              type="button"
              variant={courseForm.type === "regular" ? "default" : "outline"}
              size="lg"
              className="flex-1 text-lg h-14"
              onClick={() => setCourseForm(prev => ({ ...prev, type: "regular" }))}
            >
              Básico
            </Button>
            <Button
              type="button"
              variant={courseForm.type === "aparte" ? "default" : "outline"}
              size="lg"
              className="flex-1 text-lg h-14"
              onClick={() => setCourseForm(prev => ({ ...prev, type: "aparte" }))}
            >
              Premium
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-lg">Resumo curto (opcional)</Label>
          <Textarea
            value={courseForm.description_short}
            onChange={(e) => setCourseForm(prev => ({ ...prev, description_short: e.target.value }))}
            placeholder="Breve descrição do curso..."
            className="text-lg min-h-[100px]"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-lg">Capa (link da imagem) (opcional)</Label>
          <Input
            value={courseForm.cover_image_url}
            onChange={(e) => setCourseForm(prev => ({ ...prev, cover_image_url: e.target.value }))}
            placeholder="https://..."
            className="text-lg h-14"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-lg">Endereço do curso (slug) *</Label>
          <Input
            value={courseForm.route_slug}
            onChange={(e) => setCourseForm(prev => ({ ...prev, route_slug: e.target.value }))}
            placeholder="despertar-interior"
            className="text-lg h-14"
          />
          <p className="text-muted-foreground">Este será o endereço: /aulas/{courseForm.route_slug || "exemplo"}</p>
        </div>

        <div className="flex items-center justify-between bg-muted/50 rounded-xl p-4">
          <Label className="text-lg">Publicado</Label>
          <Switch
            checked={courseForm.is_published}
            onCheckedChange={(checked) => setCourseForm(prev => ({ ...prev, is_published: checked }))}
          />
        </div>
      </div>

      <Button 
        size="lg" 
        className="w-full text-xl h-16"
        onClick={handleSaveCourse}
        disabled={isSaving}
      >
        {isSaving ? "Salvando..." : "Salvar Curso"}
      </Button>
    </div>
  );

  // Render module form
  const renderModuleForm = () => (
    <div className="bg-card border rounded-2xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-display font-semibold">
          {editingId ? "Editar Módulo" : "Novo Módulo"}
        </h2>
        <Button variant="ghost" size="lg" onClick={() => setEditMode("view")}>
          <X className="w-5 h-5 mr-2" /> Cancelar
        </Button>
      </div>

      <div className="space-y-5">
        <div className="space-y-2">
          <Label className="text-lg">Nome do módulo *</Label>
          <Input
            value={moduleForm.title}
            onChange={(e) => setModuleForm(prev => ({ ...prev, title: e.target.value }))}
            placeholder="Ex: Introdução"
            className="text-lg h-14"
          />
        </div>

        <div className="flex items-center justify-between bg-muted/50 rounded-xl p-4">
          <Label className="text-lg">Publicado</Label>
          <Switch
            checked={moduleForm.is_published}
            onCheckedChange={(checked) => setModuleForm(prev => ({ ...prev, is_published: checked }))}
          />
        </div>
      </div>

      <Button 
        size="lg" 
        className="w-full text-xl h-16"
        onClick={handleSaveModule}
        disabled={isSaving}
      >
        {isSaving ? "Salvando..." : "Salvar Módulo"}
      </Button>
    </div>
  );

  // Render lesson form
  const renderLessonForm = () => (
    <div className="bg-card border rounded-2xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-display font-semibold">
          {editingId ? "Editar Aula" : "Nova Aula"}
        </h2>
        <Button variant="ghost" size="lg" onClick={() => setEditMode("view")}>
          <X className="w-5 h-5 mr-2" /> Cancelar
        </Button>
      </div>

      <div className="space-y-5">
        <div className="space-y-2">
          <Label className="text-lg">Título *</Label>
          <Input
            value={lessonForm.title}
            onChange={(e) => setLessonForm(prev => ({ ...prev, title: e.target.value }))}
            placeholder="Ex: Bem-vindo ao curso"
            className="text-lg h-14"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-lg">Acesso *</Label>
          <div className="flex gap-4">
            <Button
              type="button"
              variant={lessonForm.access_level === "basic" ? "default" : "outline"}
              size="lg"
              className="flex-1 text-lg h-14"
              onClick={() => setLessonForm(prev => ({ ...prev, access_level: "basic" }))}
            >
              Básico
            </Button>
            <Button
              type="button"
              variant={lessonForm.access_level === "premium" ? "default" : "outline"}
              size="lg"
              className="flex-1 text-lg h-14"
              onClick={() => setLessonForm(prev => ({ ...prev, access_level: "premium" }))}
            >
              Premium
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-lg">Tipo *</Label>
          <div className="flex gap-4">
            {["video", "audio", "text"].map((type) => (
              <Button
                key={type}
                type="button"
                variant={lessonForm.content_type === type ? "default" : "outline"}
                size="lg"
                className="flex-1 text-lg h-14"
                onClick={() => setLessonForm(prev => ({ ...prev, content_type: type }))}
              >
                {contentTypeLabels[type]}
              </Button>
            ))}
          </div>
        </div>

        {(lessonForm.content_type === "video" || lessonForm.content_type === "audio") && (
          <>
            <div className="space-y-2">
              <Label className="text-lg">Link do {lessonForm.content_type === "video" ? "vídeo" : "áudio"} *</Label>
              <Input
                value={lessonForm.media_url}
                onChange={(e) => setLessonForm(prev => ({ ...prev, media_url: e.target.value }))}
                placeholder="https://..."
                className="text-lg h-14"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-lg">Duração em minutos (opcional)</Label>
              <Input
                type="number"
                min="0"
                value={lessonForm.duration_minutes}
                onChange={(e) => setLessonForm(prev => ({ ...prev, duration_minutes: e.target.value }))}
                placeholder="Ex: 15"
                className="text-lg h-14 w-32"
              />
            </div>
          </>
        )}

        {lessonForm.content_type === "text" && (
          <div className="space-y-2">
            <Label className="text-lg">Texto da aula *</Label>
            <Textarea
              value={lessonForm.body_markdown}
              onChange={(e) => setLessonForm(prev => ({ ...prev, body_markdown: e.target.value }))}
              placeholder="Escreva o conteúdo da aula..."
              className="text-lg min-h-[200px]"
            />
          </div>
        )}

        <div className="space-y-2">
          <Label className="text-lg">Liberar a partir de (opcional)</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="lg" className="w-full text-lg h-14 justify-start">
                <CalendarIcon className="w-5 h-5 mr-3" />
                {lessonForm.released_at ? formatDateDisplay(lessonForm.released_at.toISOString()) : "Selecione uma data"}
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
          {lessonForm.released_at && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLessonForm(prev => ({ ...prev, released_at: null }))}
            >
              Limpar data
            </Button>
          )}
        </div>

        <div className="flex items-center justify-between bg-muted/50 rounded-xl p-4">
          <Label className="text-lg">Publicado</Label>
          <Switch
            checked={lessonForm.is_published}
            onCheckedChange={(checked) => setLessonForm(prev => ({ ...prev, is_published: checked }))}
          />
        </div>
      </div>

      <Button 
        size="lg" 
        className="w-full text-xl h-16"
        onClick={handleSaveLesson}
        disabled={isSaving}
      >
        {isSaving ? "Salvando..." : "Salvar Aula"}
      </Button>
    </div>
  );

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6 pb-12">
        {/* Header */}
        <header className="space-y-2">
          {step !== "courses" && (
            <Button 
              variant="ghost" 
              size="lg" 
              className="text-lg -ml-2"
              onClick={step === "modules" ? handleBackToCourses : handleBackToModules}
            >
              <ChevronLeft className="w-5 h-5 mr-1" />
              {step === "modules" ? "Voltar para Cursos" : "Voltar para Módulos"}
            </Button>
          )}
          <h1 className="text-3xl font-display font-semibold text-foreground">
            {step === "courses" && "Cursos"}
            {step === "modules" && `Módulos: ${selectedCourse?.title || ""}`}
            {step === "lessons" && `Aulas: ${selectedModule?.title || ""}`}
          </h1>
        </header>

        {/* Step 1: Courses */}
        {step === "courses" && (
          <>
            {(editMode === "new-course" || editMode === "edit-course") ? (
              renderCourseForm()
            ) : (
              <>
                {coursesLoading ? (
                  <LoadingState message="Carregando cursos..." />
                ) : (
                  <div className="space-y-4">
                    <Button
                      size="lg"
                      className="w-full text-xl h-16"
                      onClick={handleNewCourse}
                    >
                      <Plus className="w-5 h-5 mr-2" /> Criar novo curso
                    </Button>

                    {courses.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground text-lg">
                        Nenhum curso criado ainda.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {courses.map((course) => (
                          <div
                            key={course.id}
                            className="bg-card border rounded-2xl p-5 space-y-4"
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
                              </div>
                            </div>
                            
                            <div className="flex flex-col sm:flex-row gap-3">
                              <Button
                                variant="outline"
                                size="lg"
                                className="flex-1 text-lg h-14"
                                onClick={() => handleEditCourse(course)}
                              >
                                Editar curso
                              </Button>
                              <Button
                                variant={course.is_published ? "destructive" : "default"}
                                size="lg"
                                className="flex-1 text-lg h-14"
                                onClick={() => toggleCoursePublished(course.id, !course.is_published)}
                              >
                                {course.is_published ? "Despublicar" : "Publicar"}
                              </Button>
                              <Button
                                size="lg"
                                className="flex-1 text-lg h-14"
                                onClick={() => handleSelectCourse(course.id)}
                              >
                                Ver módulos
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* Step 2: Modules */}
        {step === "modules" && (
          <>
            {(editMode === "new-module" || editMode === "edit-module") ? (
              renderModuleForm()
            ) : (
              <>
                {modulesLoading ? (
                  <LoadingState message="Carregando módulos..." />
                ) : (
                  <div className="space-y-4">
                    <Button
                      size="lg"
                      className="w-full text-xl h-16"
                      onClick={handleNewModule}
                    >
                      <Plus className="w-5 h-5 mr-2" /> Adicionar módulo
                    </Button>

                    {modules.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground text-lg">
                        Nenhum módulo criado ainda.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {modules.map((module, index) => (
                          <div
                            key={module.id}
                            className="bg-card border rounded-2xl p-5 space-y-4"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <h3 className="text-xl font-semibold">{module.title}</h3>
                                <span className={`inline-block mt-1 px-3 py-1 rounded-full text-sm font-medium ${
                                  module.is_published
                                    ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                                    : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
                                }`}>
                                  {module.is_published ? "Publicado" : "Rascunho"}
                                </span>
                              </div>
                              <div className="flex flex-col gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-10 w-10"
                                  disabled={index === 0}
                                  onClick={() => moveModule(module.id, "up")}
                                  aria-label="Mover para cima"
                                >
                                  <ChevronUp className="w-5 h-5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-10 w-10"
                                  disabled={index === modules.length - 1}
                                  onClick={() => moveModule(module.id, "down")}
                                  aria-label="Mover para baixo"
                                >
                                  <ChevronDown className="w-5 h-5" />
                                </Button>
                              </div>
                            </div>
                            
                            <div className="flex flex-col sm:flex-row gap-3">
                              <Button
                                variant="outline"
                                size="lg"
                                className="flex-1 text-lg h-14"
                                onClick={() => handleEditModule(module)}
                              >
                                Editar módulo
                              </Button>
                              <Button
                                size="lg"
                                className="flex-1 text-lg h-14"
                                onClick={() => handleSelectModule(module.id)}
                              >
                                Ver aulas
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* Step 3: Lessons */}
        {step === "lessons" && (
          <>
            {(editMode === "new-lesson" || editMode === "edit-lesson") ? (
              renderLessonForm()
            ) : (
              <>
                {lessonsLoading ? (
                  <LoadingState message="Carregando aulas..." />
                ) : (
                  <div className="space-y-4">
                    <Button
                      size="lg"
                      className="w-full text-xl h-16"
                      onClick={handleNewLesson}
                    >
                      <Plus className="w-5 h-5 mr-2" /> Adicionar aula
                    </Button>

                    {lessons.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground text-lg">
                        Nenhuma aula criada ainda.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {lessons.map((lesson, index) => {
                          const status = getLessonStatus(lesson);
                          return (
                            <div
                              key={lesson.id}
                              className="bg-card border rounded-2xl p-5 space-y-4"
                            >
                              <div className="flex items-start justify-between">
                                <div>
                                  <h3 className="text-xl font-semibold">{lesson.title}</h3>
                                  <div className="flex flex-wrap gap-2 mt-2">
                                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-muted text-muted-foreground">
                                      {contentTypeLabels[lesson.content_type] || lesson.content_type}
                                    </span>
                                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                      lesson.access_level === "premium" 
                                        ? "bg-primary/20 text-primary" 
                                        : "bg-muted text-muted-foreground"
                                    }`}>
                                      {accessLabels[lesson.access_level] || lesson.access_level}
                                    </span>
                                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${status.color}`}>
                                      {status.label}
                                    </span>
                                  </div>
                                  {lesson.released_at && (
                                    <p className="text-sm text-muted-foreground mt-2">
                                      Liberar em: {formatDateDisplay(lesson.released_at)}
                                    </p>
                                  )}
                                </div>
                                <div className="flex flex-col gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-10 w-10"
                                    disabled={index === 0}
                                    onClick={() => moveLesson(lesson.id, "up")}
                                    aria-label="Mover para cima"
                                  >
                                    <ChevronUp className="w-5 h-5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-10 w-10"
                                    disabled={index === lessons.length - 1}
                                    onClick={() => moveLesson(lesson.id, "down")}
                                    aria-label="Mover para baixo"
                                  >
                                    <ChevronDown className="w-5 h-5" />
                                  </Button>
                                </div>
                              </div>
                              
                              <div className="flex flex-col sm:flex-row gap-3">
                                <Button
                                  variant="outline"
                                  size="lg"
                                  className="flex-1 text-lg h-14"
                                  onClick={() => handleEditLesson(lesson)}
                                >
                                  Editar aula
                                </Button>
                                <Button
                                  variant="outline"
                                  size="lg"
                                  className="flex-1 text-lg h-14"
                                  onClick={() => handleDuplicateLesson(lesson)}
                                >
                                  <Copy className="w-5 h-5 mr-2" /> Duplicar aula
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
};

export default AdminCursos;
