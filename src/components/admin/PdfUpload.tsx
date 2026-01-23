import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { FileUp, X, FileText, Loader2, Download } from "lucide-react";
import { toast } from "sonner";

interface PdfUploadProps {
  currentUrl: string | null;
  onUrlChange: (url: string | null) => void;
  label?: string;
  bucket?: string;
  folder?: string;
}

export function PdfUpload({
  currentUrl,
  onUrlChange,
  label = "PDF para download",
  bucket = "daily-content",
  folder = "courses/pdfs",
}: PdfUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (file.type !== "application/pdf") {
      toast.error("Por favor, selecione um arquivo PDF");
      return;
    }

    // Validate file size (max 20MB)
    const maxSize = 20 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error("O arquivo deve ter no máximo 20MB");
      return;
    }

    setIsUploading(true);

    try {
      // Create unique filename
      const fileExt = file.name.split(".").pop();
      const fileName = `${folder}/pdf-${Date.now()}.${fileExt}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (error) throw error;

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      onUrlChange(publicUrlData.publicUrl);
      toast.success("PDF enviado com sucesso!");
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error.message || "Erro ao enviar o arquivo");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemove = async () => {
    if (!currentUrl) return;

    try {
      // Extract file path from URL
      const urlParts = currentUrl.split(`/${bucket}/`);
      if (urlParts.length > 1) {
        const filePath = urlParts[1];
        await supabase.storage.from(bucket).remove([filePath]);
      }
      onUrlChange(null);
      toast.success("PDF removido");
    } catch (error) {
      console.error("Remove error:", error);
      toast.error("Erro ao remover o arquivo");
    }
  };

  const getFileName = (url: string) => {
    try {
      const parts = url.split("/");
      return parts[parts.length - 1] || "arquivo.pdf";
    } catch {
      return "arquivo.pdf";
    }
  };

  return (
    <div className="space-y-3">
      <Label className="text-base font-medium">{label}</Label>

      {currentUrl ? (
        <div className="space-y-3">
          {/* PDF preview */}
          <div className="relative rounded-xl border bg-muted/50 p-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
                <FileText className="w-6 h-6 text-destructive" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">
                  {getFileName(currentUrl)}
                </p>
                <p className="text-sm text-muted-foreground">
                  PDF disponível para download
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => window.open(currentUrl, "_blank")}
                  title="Visualizar PDF"
                >
                  <Download className="w-4 h-4" />
                </Button>
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={handleRemove}
                  title="Remover PDF"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* URL input for manual editing */}
          <div className="space-y-2">
            <Label htmlFor="pdf_url_manual" className="text-sm text-muted-foreground">
              Ou insira um link externo
            </Label>
            <Input
              id="pdf_url_manual"
              type="url"
              value={currentUrl}
              onChange={(e) => onUrlChange(e.target.value || null)}
              placeholder="https://..."
              className="text-base h-11"
            />
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Upload area */}
          <div
            className={`
              relative border-2 border-dashed rounded-xl p-6 text-center transition-colors
              ${isUploading
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50"
              }
            `}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              onChange={handleFileSelect}
              disabled={isUploading}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
            />

            {isUploading ? (
              <div className="space-y-2">
                <Loader2 className="w-8 h-8 mx-auto text-primary animate-spin" />
                <p className="text-muted-foreground">Enviando...</p>
              </div>
            ) : (
              <div className="space-y-2">
                <FileUp className="w-8 h-8 mx-auto text-muted-foreground" />
                <div>
                  <p className="font-medium text-foreground">
                    Clique ou arraste o PDF
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Máximo 20MB
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Manual URL input */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-muted" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">ou</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pdf_url_external" className="text-sm text-muted-foreground">
              Insira um link externo
            </Label>
            <Input
              id="pdf_url_external"
              type="url"
              value=""
              onChange={(e) => onUrlChange(e.target.value || null)}
              placeholder="https://..."
              className="text-base h-11"
            />
          </div>
        </div>
      )}
    </div>
  );
}
