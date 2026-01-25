import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { FileUp, X, FileText, Loader2, Download, Plus, File } from "lucide-react";
import { toast } from "sonner";

interface TextFile {
  url: string;
  name: string;
}

interface TextFilesUploadProps {
  files: TextFile[];
  onFilesChange: (files: TextFile[]) => void;
  label?: string;
  bucket?: string;
  folder?: string;
  maxFiles?: number;
  acceptedTypes?: string[];
}

const DEFAULT_ACCEPTED_TYPES = [
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/json",
  "text/html",
  "text/css",
  "text/javascript",
  "application/xml",
  "text/xml",
];

const ACCEPTED_EXTENSIONS = ".txt,.md,.csv,.json,.html,.css,.js,.xml";

export function TextFilesUpload({
  files,
  onFilesChange,
  label = "Arquivos de texto",
  bucket = "daily-content",
  folder = "courses/text-files",
  maxFiles = 10,
  acceptedTypes = DEFAULT_ACCEPTED_TYPES,
}: TextFilesUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [manualUrl, setManualUrl] = useState("");
  const [manualName, setManualName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    const remainingSlots = maxFiles - files.length;
    if (remainingSlots <= 0) {
      toast.error(`Máximo de ${maxFiles} arquivos permitido`);
      return;
    }

    const filesToUpload = Array.from(selectedFiles).slice(0, remainingSlots);
    
    // Validate file sizes (max 5MB each)
    const maxSize = 5 * 1024 * 1024;
    for (const file of filesToUpload) {
      if (file.size > maxSize) {
        toast.error(`O arquivo "${file.name}" deve ter no máximo 5MB`);
        return;
      }
    }

    setIsUploading(true);
    const uploadedFiles: TextFile[] = [];

    try {
      for (const file of filesToUpload) {
        const fileExt = file.name.split(".").pop() || "txt";
        const fileName = `${folder}/file-${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;

        const { error } = await supabase.storage
          .from(bucket)
          .upload(fileName, file, {
            cacheControl: "3600",
            upsert: true,
          });

        if (error) throw error;

        const { data: publicUrlData } = supabase.storage
          .from(bucket)
          .getPublicUrl(fileName);

        uploadedFiles.push({
          url: publicUrlData.publicUrl,
          name: file.name,
        });
      }

      onFilesChange([...files, ...uploadedFiles]);
      toast.success(
        uploadedFiles.length === 1
          ? "Arquivo enviado com sucesso!"
          : `${uploadedFiles.length} arquivos enviados com sucesso!`
      );
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error.message || "Erro ao enviar o(s) arquivo(s)");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveFile = async (index: number) => {
    const file = files[index];
    
    try {
      // Try to remove from storage if it's a storage URL
      const urlParts = file.url.split(`/${bucket}/`);
      if (urlParts.length > 1) {
        const filePath = urlParts[1];
        await supabase.storage.from(bucket).remove([filePath]);
      }
      
      const newFiles = files.filter((_, i) => i !== index);
      onFilesChange(newFiles);
      toast.success("Arquivo removido");
    } catch (error) {
      console.error("Remove error:", error);
      // Still remove from the list even if storage removal fails
      const newFiles = files.filter((_, i) => i !== index);
      onFilesChange(newFiles);
    }
  };

  const handleAddManualUrl = () => {
    if (!manualUrl.trim()) {
      toast.error("Insira uma URL válida");
      return;
    }

    if (files.length >= maxFiles) {
      toast.error(`Máximo de ${maxFiles} arquivos permitido`);
      return;
    }

    const name = manualName.trim() || getFileNameFromUrl(manualUrl);
    
    onFilesChange([...files, { url: manualUrl.trim(), name }]);
    setManualUrl("");
    setManualName("");
    toast.success("Arquivo adicionado");
  };

  const getFileNameFromUrl = (url: string) => {
    try {
      const parts = url.split("/");
      return parts[parts.length - 1] || "arquivo.txt";
    } catch {
      return "arquivo.txt";
    }
  };

  const getFileIcon = (name: string) => {
    const ext = name.split(".").pop()?.toLowerCase();
    switch (ext) {
      case "md":
        return "📝";
      case "json":
        return "📋";
      case "csv":
        return "📊";
      case "html":
        return "🌐";
      case "css":
        return "🎨";
      case "js":
        return "⚡";
      case "xml":
        return "📄";
      default:
        return "📄";
    }
  };

  return (
    <div className="space-y-4">
      <Label className="text-base font-medium">{label}</Label>

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-3 rounded-xl border bg-muted/50"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-lg shrink-0">
                {getFileIcon(file.name)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground truncate">{file.url}</p>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => window.open(file.url, "_blank")}
                  title="Abrir arquivo"
                >
                  <Download className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => handleRemoveFile(index)}
                  title="Remover arquivo"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload area */}
      {files.length < maxFiles && (
        <div className="space-y-4">
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
              accept={ACCEPTED_EXTENSIONS}
              multiple
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
                    Clique ou arraste arquivos de texto
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    .txt, .md, .csv, .json, .html, .css, .js, .xml (máx. 5MB cada)
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {files.length}/{maxFiles} arquivos
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

          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="manual_url" className="text-sm text-muted-foreground">
                Adicionar link externo
              </Label>
              <Input
                id="manual_url"
                type="url"
                value={manualUrl}
                onChange={(e) => setManualUrl(e.target.value)}
                placeholder="https://..."
                className="text-base h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="manual_name" className="text-sm text-muted-foreground">
                Nome do arquivo (opcional)
              </Label>
              <Input
                id="manual_name"
                type="text"
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
                placeholder="Ex: material-complementar.txt"
                className="text-base h-11"
              />
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={handleAddManualUrl}
              disabled={!manualUrl.trim()}
            >
              <Plus className="w-4 h-4 mr-2" />
              Adicionar link
            </Button>
          </div>
        </div>
      )}

      {files.length >= maxFiles && (
        <p className="text-sm text-muted-foreground text-center">
          Limite de {maxFiles} arquivos atingido
        </p>
      )}
    </div>
  );
}
