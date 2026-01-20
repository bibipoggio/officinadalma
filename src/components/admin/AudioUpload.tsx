import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { Upload, X, Music, Loader2, Check, Video } from "lucide-react";
import { toast } from "sonner";

interface AudioUploadProps {
  currentUrl: string | null;
  onUrlChange: (url: string | null) => void;
  date: string;
}

export function AudioUpload({ currentUrl, onUrlChange, date }: AudioUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type (audio or mp4 video)
    const isAudio = file.type.startsWith("audio/");
    const isMp4 = file.type === "video/mp4";
    if (!isAudio && !isMp4) {
      toast.error("Por favor, selecione um arquivo de áudio ou MP4");
      return;
    }

    // Validate file size (max 50MB)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error("O arquivo deve ter no máximo 50MB");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Create unique filename
      const fileExt = file.name.split(".").pop();
      const fileName = `meditation-${date}.${fileExt}`;
      const filePath = `meditations/${fileName}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from("daily-content")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (error) {
        throw error;
      }

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from("daily-content")
        .getPublicUrl(filePath);

      onUrlChange(publicUrlData.publicUrl);
      toast.success("Áudio enviado com sucesso!");
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error.message || "Erro ao enviar o áudio");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemove = async () => {
    if (!currentUrl) return;

    try {
      // Extract file path from URL
      const urlParts = currentUrl.split("/daily-content/");
      if (urlParts.length > 1) {
        const filePath = urlParts[1];
        await supabase.storage.from("daily-content").remove([filePath]);
      }
      onUrlChange(null);
      toast.success("Áudio removido");
    } catch (error) {
      console.error("Remove error:", error);
      toast.error("Erro ao remover o áudio");
    }
  };

  return (
    <div className="space-y-4">
      <Label className="text-lg font-medium">Áudio da Meditação</Label>
      
      {currentUrl ? (
        <div className="space-y-3">
          {/* Current media preview */}
          <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
            <Check className="w-5 h-5 text-green-600" />
            {currentUrl?.endsWith(".mp4") ? (
              <Video className="w-5 h-5 text-green-600" />
            ) : (
              <Music className="w-5 h-5 text-green-600" />
            )}
            <span className="flex-1 text-sm text-green-700 dark:text-green-400 truncate">
              {currentUrl?.endsWith(".mp4") ? "Vídeo carregado" : "Áudio carregado"}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRemove}
              className="text-destructive hover:text-destructive"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          
          {/* Media player */}
          {currentUrl?.endsWith(".mp4") ? (
            <video controls className="w-full rounded-lg" src={currentUrl}>
              Seu navegador não suporta o elemento de vídeo.
            </video>
          ) : (
            <audio controls className="w-full" src={currentUrl}>
              Seu navegador não suporta o elemento de áudio.
            </audio>
          )}
          
          {/* URL input for manual editing */}
          <div className="space-y-2">
            <Label htmlFor="audio_url_manual" className="text-sm text-muted-foreground">
              Ou insira um link externo
            </Label>
            <Input
              id="audio_url_manual"
              type="url"
              value={currentUrl}
              onChange={(e) => onUrlChange(e.target.value || null)}
              placeholder="https://..."
              className="text-base h-12"
            />
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Upload area */}
          <div
            className={`
              relative border-2 border-dashed rounded-xl p-8 text-center transition-colors
              ${isUploading 
                ? "border-primary bg-primary/5" 
                : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50"
              }
            `}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*,video/mp4"
              onChange={handleFileSelect}
              disabled={isUploading}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
            />
            
            {isUploading ? (
              <div className="space-y-3">
                <Loader2 className="w-10 h-10 mx-auto text-primary animate-spin" />
                <p className="text-lg text-muted-foreground">Enviando...</p>
              </div>
            ) : (
              <div className="space-y-3">
                <Upload className="w-10 h-10 mx-auto text-muted-foreground" />
                <div>
                  <p className="text-lg font-medium text-foreground">
                    Clique ou arraste o arquivo
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    MP3, WAV, M4A, MP4 (máx. 50MB)
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
            <Label htmlFor="audio_url_external" className="text-sm text-muted-foreground">
              Insira um link externo (Bunny, etc.)
            </Label>
            <Input
              id="audio_url_external"
              type="url"
              value=""
              onChange={(e) => onUrlChange(e.target.value || null)}
              placeholder="https://..."
              className="text-base h-12"
            />
          </div>
        </div>
      )}
    </div>
  );
}