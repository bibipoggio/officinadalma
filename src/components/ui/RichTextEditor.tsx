import { useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Bold, Italic, Underline } from "lucide-react";
import { cn } from "@/lib/utils";

interface RichTextEditorProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
  maxLength?: number;
}

export const RichTextEditor = ({
  id,
  value,
  onChange,
  placeholder,
  className,
  minHeight = "150px",
  maxLength,
}: RichTextEditorProps) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const isInternalChange = useRef(false);

  const execCommand = useCallback((command: string) => {
    document.execCommand(command, false);
    editorRef.current?.focus();
  }, []);

  // Handle keydown to use <br> instead of <div> for Enter
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      document.execCommand("insertLineBreak", false);
    }
  }, []);

  const handleInput = useCallback(() => {
    if (editorRef.current) {
      isInternalChange.current = true;
      let html = editorRef.current.innerHTML;
      // Convert empty div/br to empty string
      if (html === "<br>" || html === "<div><br></div>") {
        html = "";
      }
      // Clean up any remaining div tags and convert to br
      html = html.replace(/<div><br><\/div>/g, "<br>");
      html = html.replace(/<div>/g, "<br>");
      html = html.replace(/<\/div>/g, "");
      // Clean up double br at start
      html = html.replace(/^<br>/, "");
      onChange(html);
    }
  }, [onChange]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    // Replace newlines with <br> for paste
    const htmlText = text.replace(/\n/g, "<br>");
    document.execCommand("insertHTML", false, htmlText);
  }, []);

  // Sync value to editor when it changes externally (not from user input)
  useEffect(() => {
    if (editorRef.current && !isInternalChange.current) {
      // Only update if the value is different from current content
      if (editorRef.current.innerHTML !== value) {
        editorRef.current.innerHTML = value || "";
      }
    }
    isInternalChange.current = false;
  }, [value]);

  return (
    <div className="space-y-2">
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 bg-muted/50 rounded-lg border">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => execCommand("bold")}
          title="Negrito (Ctrl+B)"
        >
          <Bold className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => execCommand("italic")}
          title="Itálico (Ctrl+I)"
        >
          <Italic className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => execCommand("underline")}
          title="Sublinhado (Ctrl+U)"
        >
          <Underline className="w-4 h-4" />
        </Button>
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        id={id}
        contentEditable
        className={cn(
          "w-full rounded-md border border-input bg-background px-3 py-2 text-lg ring-offset-background",
          "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "overflow-y-auto",
          className
        )}
        style={{ minHeight, maxHeight: "400px" }}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        data-placeholder={placeholder}
        suppressContentEditableWarning
      />

      {/* Character count */}
      {maxLength && (
        <p className="text-right text-muted-foreground text-sm">
          {value.replace(/<[^>]*>/g, "").length}/{maxLength} recomendado
        </p>
      )}

      <style>{`
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: hsl(var(--muted-foreground));
          pointer-events: none;
        }
      `}</style>
    </div>
  );
};
