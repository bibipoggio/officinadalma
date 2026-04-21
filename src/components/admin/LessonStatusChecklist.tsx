import { Check, X } from "lucide-react";
import { getLessonStatus, type LessonChecklistItem } from "@/lib/lessonStatus";

interface LessonStatusChecklistProps {
  checklist: LessonChecklistItem[];
  isPublished: boolean;
  /** Optional last-saved timestamp shown next to the status. */
  lastSavedAt?: Date | null;
  isSaving?: boolean;
}

export function LessonStatusChecklist({
  checklist,
  isPublished,
  lastSavedAt,
  isSaving,
}: LessonStatusChecklistProps) {
  const allOk = checklist.every((c) => c.ok);
  const status = getLessonStatus({
    title: checklist.find((c) => c.key === "title")?.ok ? "x" : "",
    is_published: isPublished,
    released_at: checklist.find((c) => c.key === "released_at")?.ok ? new Date().toISOString() : null,
    body_markdown: checklist.find((c) => c.key === "content")?.ok ? "x" : "",
  });

  return (
    <div className="rounded-xl border bg-muted/30 p-3 sm:p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${status.color}`}
          >
            <span aria-hidden>{status.icon}</span>
            {status.label}
          </span>
          <span className="text-xs text-muted-foreground">
            {allOk ? "Pronta para publicar" : "Faltam campos obrigatórios"}
          </span>
        </div>
        <div className="text-xs text-muted-foreground" aria-live="polite">
          {isSaving
            ? "Salvando rascunho…"
            : lastSavedAt
            ? `Salvo às ${lastSavedAt.toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
              })}`
            : null}
        </div>
      </div>

      <ul className="grid gap-1.5 sm:grid-cols-3">
        {checklist.map((item) => (
          <li
            key={item.key}
            className={`flex items-center gap-2 rounded-md border bg-background px-2.5 py-1.5 text-xs ${
              item.ok ? "border-green-500/40 text-foreground" : "border-red-500/40 text-muted-foreground"
            }`}
          >
            {item.ok ? (
              <Check className="h-3.5 w-3.5 text-green-600 dark:text-green-400 shrink-0" />
            ) : (
              <X className="h-3.5 w-3.5 text-red-600 dark:text-red-400 shrink-0" />
            )}
            <span className="truncate">{item.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
