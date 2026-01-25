import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, FileDown } from "lucide-react";
import { createSafeHtml } from "@/lib/sanitize";
import { formatDuration, getCourseTypeLabel, type TextFile } from "@/hooks/useLessonDetails";

interface LessonContentProps {
  lesson: {
    title: string;
    summary: string | null;
    body_markdown: string | null;
    duration_seconds: number | null;
    pdf_url: string | null;
    text_files_urls: TextFile[] | null;
  };
  course: {
    type: string;
  };
  isCompleted: boolean;
  isSaving: boolean;
  onMarkCompleted: () => void;
}

export function LessonContent({
  lesson,
  course,
  isCompleted,
  isSaving,
  onMarkCompleted,
}: LessonContentProps) {
  const hasAttachments = lesson.pdf_url || (lesson.text_files_urls && lesson.text_files_urls.length > 0);

  return (
    <div className="p-5 sm:p-6 space-y-5">
      {/* Header */}
      <header className="space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant={course.type === "aparte" ? "default" : "secondary"}>
            {getCourseTypeLabel(course.type)}
          </Badge>
          {isCompleted && (
            <Badge variant="outline" className="text-success border-success/30">
              <CheckCircle className="w-3 h-3 mr-1" />
              Concluída
            </Badge>
          )}
        </div>

        <h1 className="text-2xl sm:text-3xl font-display font-semibold text-foreground leading-tight">
          {lesson.title}
        </h1>

        {lesson.duration_seconds && (
          <p className="text-sm text-muted-foreground font-body">
            Duração: {formatDuration(lesson.duration_seconds)}
          </p>
        )}
      </header>

      {/* Summary */}
      {lesson.summary && (
        <div className="rounded-xl bg-muted/50 border border-border/50 p-4">
          <p
            className="text-muted-foreground font-body text-sm leading-relaxed"
            dangerouslySetInnerHTML={createSafeHtml(lesson.summary)}
          />
        </div>
      )}

      {/* Text/Markdown Content */}
      {lesson.body_markdown && (
        <div className="rounded-xl bg-card border border-border p-5 sm:p-6 shadow-sm">
          <div
            className="prose prose-sm sm:prose-base dark:prose-invert max-w-none
              font-body text-foreground leading-relaxed
              prose-headings:font-display prose-headings:text-foreground prose-headings:font-semibold
              prose-p:text-foreground/90 prose-p:leading-relaxed
              prose-strong:text-foreground prose-strong:font-semibold
              prose-a:text-primary prose-a:no-underline hover:prose-a:underline
              prose-li:text-foreground/90
              [&_br]:block [&_br]:my-2"
            dangerouslySetInnerHTML={createSafeHtml(lesson.body_markdown)}
          />
        </div>
      )}

      {/* Attachments Section */}
      {hasAttachments && (
        <div className="space-y-3 pt-2 border-t">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <FileDown className="w-4 h-4" />
            Materiais para download
          </h3>
          <div className="grid gap-2">
            {lesson.pdf_url && (
              <a
                href={lesson.pdf_url}
                target="_blank"
                rel="noopener noreferrer"
                download
                className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors group"
              >
                <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
                  <FileDown className="w-5 h-5 text-destructive" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">Material Complementar</p>
                  <p className="text-xs text-muted-foreground">PDF</p>
                </div>
              </a>
            )}
            {lesson.text_files_urls?.map((file, index) => (
              <a
                key={index}
                href={file.url}
                target="_blank"
                rel="noopener noreferrer"
                download
                className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors group"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <FileDown className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">Arquivo de texto</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Complete Button */}
      <Button
        variant={isCompleted ? "outline" : "default"}
        className="w-full"
        size="lg"
        onClick={onMarkCompleted}
        disabled={isSaving || isCompleted}
      >
        {isCompleted ? (
          <>
            <CheckCircle className="w-5 h-5 mr-2 text-success" />
            Aula Concluída
          </>
        ) : isSaving ? (
          "Salvando..."
        ) : (
          "Marcar como Concluída"
        )}
      </Button>
    </div>
  );
}
