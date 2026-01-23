import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Course {
  id: string;
  title: string;
  type: string;
  description_short: string | null;
  cover_image_url: string | null;
  route_slug: string;
  is_published: boolean;
  created_at: string;
}

export interface CourseModule {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  position: number;
  is_published: boolean;
}

export interface CourseLesson {
  id: string;
  course_id: string;
  module_id: string;
  title: string;
  content_type: string;
  access_level: string;
  media_url: string | null;
  audio_url: string | null;
  pdf_url: string | null;
  body_markdown: string | null;
  duration_seconds: number | null;
  audio_duration_seconds: number | null;
  released_at: string | null;
  is_published: boolean;
  position: number;
  summary: string | null;
}

export function useAdminCourses() {
  const { toast } = useToast();
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCourses = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .order("title");

      if (error) throw error;
      setCourses(data || []);
    } catch (error) {
      console.error("Error fetching courses:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os cursos.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const createCourse = async (course: Omit<Course, "id" | "created_at">) => {
    try {
      // Check if slug is unique
      const { data: existing } = await supabase
        .from("courses")
        .select("id")
        .eq("route_slug", course.route_slug)
        .maybeSingle();

      if (existing) {
        toast({
          title: "Erro",
          description: "Já existe um curso com esse endereço (slug).",
          variant: "destructive",
        });
        return null;
      }

      const { data, error } = await supabase
        .from("courses")
        .insert(course)
        .select()
        .single();

      if (error) throw error;

      await fetchCourses();
      toast({ title: "Curso salvo." });
      return data;
    } catch (error) {
      console.error("Error creating course:", error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar. Tente novamente.",
        variant: "destructive",
      });
      return null;
    }
  };

  const updateCourse = async (id: string, updates: Partial<Course>) => {
    try {
      // Check slug uniqueness if updating slug
      if (updates.route_slug) {
        const { data: existing } = await supabase
          .from("courses")
          .select("id")
          .eq("route_slug", updates.route_slug)
          .neq("id", id)
          .maybeSingle();

        if (existing) {
          toast({
            title: "Erro",
            description: "Já existe um curso com esse endereço (slug).",
            variant: "destructive",
          });
          return false;
        }
      }

      const { error } = await supabase
        .from("courses")
        .update(updates)
        .eq("id", id);

      if (error) throw error;

      await fetchCourses();
      toast({ title: "Curso salvo." });
      return true;
    } catch (error) {
      console.error("Error updating course:", error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar. Tente novamente.",
        variant: "destructive",
      });
      return false;
    }
  };

  const toggleCoursePublished = async (id: string, isPublished: boolean) => {
    try {
      const { error } = await supabase
        .from("courses")
        .update({ is_published: isPublished })
        .eq("id", id);

      if (error) throw error;

      await fetchCourses();
      toast({ 
        title: isPublished ? "Curso publicado." : "Curso despublicado." 
      });
      return true;
    } catch (error) {
      console.error("Error toggling course:", error);
      toast({
        title: "Erro",
        description: "Não foi possível alterar. Tente novamente.",
        variant: "destructive",
      });
      return false;
    }
  };

  return {
    courses,
    isLoading,
    fetchCourses,
    createCourse,
    updateCourse,
    toggleCoursePublished,
  };
}

export function useAdminModules(courseId: string | null) {
  const { toast } = useToast();
  const [modules, setModules] = useState<CourseModule[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchModules = useCallback(async () => {
    if (!courseId) {
      setModules([]);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("course_modules")
        .select("*")
        .eq("course_id", courseId)
        .order("position");

      if (error) throw error;
      setModules(data || []);
    } catch (error) {
      console.error("Error fetching modules:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os módulos.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [courseId, toast]);

  useEffect(() => {
    fetchModules();
  }, [fetchModules]);

  const createModule = async (title: string, isPublished: boolean = false) => {
    if (!courseId) return null;

    try {
      const nextPosition = modules.length > 0 
        ? Math.max(...modules.map(m => m.position)) + 1 
        : 1;

      const { data, error } = await supabase
        .from("course_modules")
        .insert({
          course_id: courseId,
          title,
          position: nextPosition,
          is_published: isPublished,
        })
        .select()
        .single();

      if (error) throw error;

      await fetchModules();
      toast({ title: "Módulo salvo." });
      return data;
    } catch (error) {
      console.error("Error creating module:", error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar. Tente novamente.",
        variant: "destructive",
      });
      return null;
    }
  };

  const updateModule = async (id: string, updates: Partial<CourseModule>) => {
    try {
      const { error } = await supabase
        .from("course_modules")
        .update(updates)
        .eq("id", id);

      if (error) throw error;

      await fetchModules();
      toast({ title: "Módulo salvo." });
      return true;
    } catch (error) {
      console.error("Error updating module:", error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar. Tente novamente.",
        variant: "destructive",
      });
      return false;
    }
  };

  const moveModule = async (id: string, direction: "up" | "down") => {
    const index = modules.findIndex(m => m.id === id);
    if (index === -1) return;
    
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= modules.length) return;

    const currentModule = modules[index];
    const swapModule = modules[newIndex];

    try {
      await supabase
        .from("course_modules")
        .update({ position: swapModule.position })
        .eq("id", currentModule.id);

      await supabase
        .from("course_modules")
        .update({ position: currentModule.position })
        .eq("id", swapModule.id);

      await fetchModules();
    } catch (error) {
      console.error("Error reordering modules:", error);
      toast({
        title: "Erro",
        description: "Não foi possível reordenar.",
        variant: "destructive",
      });
    }
  };

  return {
    modules,
    isLoading,
    fetchModules,
    createModule,
    updateModule,
    moveModule,
  };
}

export function useAdminLessons(moduleId: string | null, courseId: string | null) {
  const { toast } = useToast();
  const [lessons, setLessons] = useState<CourseLesson[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchLessons = useCallback(async () => {
    if (!moduleId) {
      setLessons([]);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("course_lessons")
        .select("*")
        .eq("module_id", moduleId)
        .order("position");

      if (error) throw error;
      setLessons(data || []);
    } catch (error) {
      console.error("Error fetching lessons:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as aulas.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [moduleId, toast]);

  useEffect(() => {
    fetchLessons();
  }, [fetchLessons]);

  const createLesson = async (lesson: Omit<CourseLesson, "id" | "position">) => {
    if (!moduleId || !courseId) return null;

    try {
      const nextPosition = lessons.length > 0 
        ? Math.max(...lessons.map(l => l.position)) + 1 
        : 1;

      const { data, error } = await supabase
        .from("course_lessons")
        .insert({
          ...lesson,
          course_id: courseId,
          module_id: moduleId,
          position: nextPosition,
        })
        .select()
        .single();

      if (error) throw error;

      await fetchLessons();
      toast({ title: "Aula salva." });
      return data;
    } catch (error) {
      console.error("Error creating lesson:", error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar. Tente novamente.",
        variant: "destructive",
      });
      return null;
    }
  };

  const updateLesson = async (id: string, updates: Partial<CourseLesson>) => {
    try {
      const { error } = await supabase
        .from("course_lessons")
        .update(updates)
        .eq("id", id);

      if (error) throw error;

      await fetchLessons();
      toast({ title: "Aula salva." });
      return true;
    } catch (error) {
      console.error("Error updating lesson:", error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar. Tente novamente.",
        variant: "destructive",
      });
      return false;
    }
  };

  const duplicateLesson = async (lesson: CourseLesson) => {
    if (!moduleId || !courseId) return null;

    try {
      const nextPosition = lessons.length > 0 
        ? Math.max(...lessons.map(l => l.position)) + 1 
        : 1;

      const { data, error } = await supabase
        .from("course_lessons")
        .insert({
          course_id: courseId,
          module_id: moduleId,
          title: `${lesson.title} (Cópia)`,
          content_type: lesson.content_type,
          access_level: lesson.access_level,
          media_url: lesson.media_url,
          body_markdown: lesson.body_markdown,
          duration_seconds: lesson.duration_seconds,
          released_at: lesson.released_at,
          summary: lesson.summary,
          is_published: false,
          position: nextPosition,
        })
        .select()
        .single();

      if (error) throw error;

      await fetchLessons();
      toast({ title: "Aula duplicada." });
      return data;
    } catch (error) {
      console.error("Error duplicating lesson:", error);
      toast({
        title: "Erro",
        description: "Não foi possível duplicar. Tente novamente.",
        variant: "destructive",
      });
      return null;
    }
  };

  const moveLesson = async (id: string, direction: "up" | "down") => {
    const index = lessons.findIndex(l => l.id === id);
    if (index === -1) return;
    
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= lessons.length) return;

    const currentLesson = lessons[index];
    const swapLesson = lessons[newIndex];

    try {
      await supabase
        .from("course_lessons")
        .update({ position: swapLesson.position })
        .eq("id", currentLesson.id);

      await supabase
        .from("course_lessons")
        .update({ position: currentLesson.position })
        .eq("id", swapLesson.id);

      await fetchLessons();
    } catch (error) {
      console.error("Error reordering lessons:", error);
      toast({
        title: "Erro",
        description: "Não foi possível reordenar.",
        variant: "destructive",
      });
    }
  };

  return {
    lessons,
    isLoading,
    fetchLessons,
    createLesson,
    updateLesson,
    duplicateLesson,
    moveLesson,
  };
}

export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function isValidUrl(string: string): boolean {
  try {
    new URL(string);
    return true;
  } catch {
    return false;
  }
}
