import type { CourseLesson } from "@/hooks/useAdminCourses";

export type LessonStatusKey = "rascunho" | "publicada" | "incompleta" | "agendada" | "removida";

export interface LessonStatusInfo {
  key: LessonStatusKey;
  label: string;
  /** Tailwind classes (background + text) */
  color: string;
  /** Single character glyph for the badge */
  icon: string;
}

export interface LessonChecklistItem {
  key: "title" | "content";
  label: string;
  ok: boolean;
}

interface LessonLike {
  title?: string | null;
  is_published?: boolean | null;
  released_at?: string | Date | null;
  deleted_at?: string | null;
  media_url?: string | null;
  audio_url?: string | null;
  body_markdown?: string | null;
  pdf_url?: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  videos?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  text_files_urls?: any;
  files?: { url: string; name: string }[];
}

const hasText = (v: string | null | undefined) => !!v && v.trim().length > 0;
const hasArr = (v: unknown) => Array.isArray(v) && v.length > 0;

/** Required-fields checklist used in the admin editor and to derive status. */
export function getLessonChecklist(lesson: LessonLike): LessonChecklistItem[] {
  const hasContent =
    hasText(lesson.media_url) ||
    hasText(lesson.audio_url) ||
    hasText(lesson.body_markdown) ||
    hasText(lesson.pdf_url) ||
    hasArr(lesson.videos) ||
    hasArr(lesson.text_files_urls) ||
    hasArr(lesson.files);

  return [
    { key: "title", label: "Título preenchido", ok: hasText(lesson.title) },
    {
      key: "content",
      label: "Pelo menos 1 vídeo, áudio, texto ou arquivo",
      ok: hasContent,
    },
  ];
}

export function isLessonComplete(lesson: LessonLike): boolean {
  return getLessonChecklist(lesson).every((c) => c.ok);
}

/** Derives the visible status of a lesson for admin/moderator dashboards. */
export function getLessonStatus(lesson: CourseLesson | LessonLike): LessonStatusInfo {
  if ("deleted_at" in lesson && lesson.deleted_at) {
    return {
      key: "removida",
      label: "Removida",
      color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
      icon: "✕",
    };
  }

  const complete = isLessonComplete(lesson);
  const published = !!lesson.is_published;

  if (published && !complete) {
    return {
      key: "incompleta",
      label: "Incompleta",
      color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
      icon: "!",
    };
  }

  if (
    published &&
    lesson.released_at &&
    new Date(lesson.released_at as string | Date) > new Date()
  ) {
    return {
      key: "agendada",
      label: "Agendada",
      color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
      icon: "⏱",
    };
  }

  if (published) {
    return {
      key: "publicada",
      label: "Publicada",
      color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
      icon: "✓",
    };
  }

  return {
    key: "rascunho",
    label: "Rascunho",
    color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
    icon: "●",
  };
}
