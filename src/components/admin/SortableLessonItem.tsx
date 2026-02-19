import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { GripVertical, Pencil, Copy, Trash2, FileText, Video, FileAudio } from "lucide-react";
import type { CourseLesson } from "@/hooks/useAdminCourses";

const contentTypeConfig = {
  video: { label: "Vídeo", icon: Video, color: "text-blue-600 bg-blue-100 dark:bg-blue-900/30" },
  audio: { label: "Áudio", icon: FileAudio, color: "text-purple-600 bg-purple-100 dark:bg-purple-900/30" },
  text: { label: "Texto", icon: FileText, color: "text-green-600 bg-green-100 dark:bg-green-900/30" },
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

interface SortableLessonItemProps {
  lesson: CourseLesson;
  onEdit: (lesson: CourseLesson) => void;
  onDuplicate: (lesson: CourseLesson) => void;
  onDelete: (lesson: CourseLesson) => void;
  onTogglePublish: (lesson: CourseLesson) => void;
}

export function SortableLessonItem({ lesson, onEdit, onDuplicate, onDelete, onTogglePublish }: SortableLessonItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lesson.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const status = getLessonStatus(lesson);
  const config = contentTypeConfig[lesson.content_type as keyof typeof contentTypeConfig];
  const Icon = config?.icon || FileText;
  const isDeleted = !!lesson.deleted_at;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-muted/30 rounded-lg group hover:bg-muted/50 transition-colors ${isDeleted ? "opacity-50" : ""}`}
    >
      {/* Drag handle */}
      <button
        className="cursor-grab active:cursor-grabbing touch-none p-0.5"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="w-4 h-4 text-muted-foreground" />
      </button>

      <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0 ${config?.color || "bg-muted"}`}>
        <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
      </div>

      <div className="flex-1 min-w-0">
        <p className={`font-medium text-sm truncate ${isDeleted ? "line-through" : ""}`}>{lesson.title}</p>
        <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5 sm:mt-1 flex-wrap">
          {!isDeleted ? (
            <button
              onClick={() => onTogglePublish(lesson)}
              className={`px-1.5 sm:px-2 py-0.5 rounded text-[10px] sm:text-xs font-medium flex items-center gap-0.5 sm:gap-1 cursor-pointer hover:opacity-80 transition-opacity ${status.color}`}
              title={lesson.is_published ? "Clique para despublicar" : "Clique para publicar"}
            >
              <span>{status.icon}</span>
              {status.label}
            </button>
          ) : (
            <span className={`px-1.5 sm:px-2 py-0.5 rounded text-[10px] sm:text-xs font-medium flex items-center gap-0.5 sm:gap-1 ${status.color}`}>
              <span>{status.icon}</span>
              {status.label}
            </span>
          )}
          {lesson.access_level === "premium" && (
            <span className="px-1.5 sm:px-2 py-0.5 rounded text-[10px] sm:text-xs bg-primary/20 text-primary">
              Premium
            </span>
          )}
        </div>
      </div>

      {/* Action buttons */}
      {!isDeleted && (
        <div className="flex gap-0.5 sm:gap-1 sm:opacity-0 sm:group-hover:opacity-100 shrink-0">
          <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8" onClick={() => onEdit(lesson)} title="Editar">
            <Pencil className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8 hidden sm:flex" onClick={() => onDuplicate(lesson)} title="Duplicar">
            <Copy className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8 text-destructive hover:text-destructive" onClick={() => onDelete(lesson)} title="Remover aula">
            <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
