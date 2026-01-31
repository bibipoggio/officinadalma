import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { FileUp, X, Loader2, Download, Plus, Link, Upload, FileText, File } from "lucide-react";
import { toast } from "sonner";

interface UploadedFile {
  url: string;
  name: string;
}

interface FilesUploadProps {
  files: UploadedFile[];
  onFilesChange: (files: UploadedFile[]) => void;
  label?: string;
  bucket?: string;
  folder?: string;
  maxFiles?: number;
  /** Accepts PDF, text files, and documents */
  acceptAllFormats?: boolean;
}

// All supported file types including PDF
const ACCEPTED_EXTENSIONS = ".pdf,.txt,.md,.csv,.json,.html,.css,.js,.xml,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.rtf";

const ACCEPTED_MIME_TYPES = [
  "application/pdf",
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/json",
  "text/html",
  "text/css",
  "text/javascript",
  "application/xml",
  "text/xml",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/rtf",
];

export function FilesUpload({
  files,
  onFilesChange,
  label = "Materiais complementares",
  bucket = "daily-content",
  folder = "courses/files",
  maxFiles = 10,
}: FilesUploadProps) {
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
    
    // Validate file sizes (max 20MB each for PDFs, 5MB for others)
    for (const file of filesToUpload) {
      const maxSize = file.type === "application/pdf" ? 20 * 1024 * 1024 : 5 * 1024 * 1024;
      if (file.size > maxSize) {
        const maxSizeMB = file.type === "application/pdf" ? "20MB" : "5MB";
        toast.error(`O arquivo "${file.name}" deve ter no máximo ${maxSizeMB}`);
        return;
      }
    }

    setIsUploading(true);
    const uploadedFiles: UploadedFile[] = [];

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
          ? "Arquivo enviado!"
          : `${uploadedFiles.length} arquivos enviados!`
      );
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error.message || "Erro ao enviar");
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
    toast.success("Link adicionado!");
  };

  const getFileNameFromUrl = (url: string) => {
    try {
      const parts = url.split("/");
      return parts[parts.length - 1] || "arquivo";
    } catch {
      return "arquivo";
    }
  };

  const getFileIcon = (name: string) => {
    const ext = name.split(".").pop()?.toLowerCase();
    switch (ext) {
      case "pdf":
        return <FileText className="w-4 h-4 text-red-500" />;
      case "doc":
      case "docx":
        return <FileText className="w-4 h-4 text-blue-500" />;
      case "xls":
      case "xlsx":
        return <FileText className="w-4 h-4 text-green-500" />;
      case "ppt":
      case "pptx":
        return <FileText className="w-4 h-4 text-orange-500" />;
      case "md":
      case "txt":
        return <FileText className="w-4 h-4 text-muted-foreground" />;
      case "json":
      case "csv":
        return <File className="w-4 h-4 text-muted-foreground" />;
      default:
        return <File className="w-4 h-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-3">
      <Label className="text-base font-medium">{label}</Label>

      {/* File list - compact */}
      {files.length > 0 && (
        <div className="space-y-1.5">
          {files.map((file, index) => (
            <div
              key={index}
              className="flex items-center gap-2 p-2 rounded-lg border bg-muted/50"
            >
              {getFileIcon(file.name)}
              <span className="flex-1 text-sm truncate">{file.name}</span>
              <div className="flex gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => window.open(file.url, "_blank")}
                  title="Abrir arquivo"
                >
                  <Download className="w-3 h-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-destructive hover:text-destructive"
                  onClick={() => handleRemoveFile(index)}
                  title="Remover"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload interface - compact tabs */}
      {files.length < maxFiles && (
        <Tabs defaultValue="upload" className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-8">
            <TabsTrigger value="upload" className="text-xs gap-1">
              <Upload className="w-3 h-3" />
              Enviar
            </TabsTrigger>
            <TabsTrigger value="link" className="text-xs gap-1">
              <Link className="w-3 h-3" />
              Link
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="mt-2">
            <div
              className={`
                relative border-2 border-dashed rounded-lg p-3 text-center transition-colors
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
                <div className="flex items-center justify-center gap-2 py-1">
                  <Loader2 className="w-4 h-4 text-primary animate-spin" />
                  <span className="text-sm">Enviando...</span>
                </div>
              ) : (
                <div className="space-y-0.5">
                  <FileUp className="w-5 h-5 mx-auto text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">
                    PDF, TXT, DOC, XLS, CSV... ({files.length}/{maxFiles})
                  </p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="link" className="mt-2 space-y-2">
            <Input
              type="url"
              value={manualUrl}
              onChange={(e) => setManualUrl(e.target.value)}
              placeholder="https://..."
              className="h-9 text-sm"
            />
            <div className="flex gap-2">
              <Input
                type="text"
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
                placeholder="Nome do arquivo (opcional)"
                className="h-9 text-sm"
              />
              <Button
                size="sm"
                onClick={handleAddManualUrl}
                disabled={!manualUrl.trim()}
                className="shrink-0 h-9"
              >
                <Plus className="w-3 h-3" />
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      )}

      {files.length >= maxFiles && (
        <p className="text-xs text-muted-foreground text-center">
          Limite de {maxFiles} arquivos atingido
        </p>
      )}
    </div>
  );
}
