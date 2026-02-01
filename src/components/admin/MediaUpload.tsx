import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { X, Video, Music, Loader2, Play, Pause, RotateCcw, Link, Upload } from "lucide-react";
import { toast } from "sonner";
import * as tus from "tus-js-client";

interface MediaUploadProps {
  currentUrl: string | null;
  onUrlChange: (url: string | null) => void;
  onDurationChange?: (seconds: number | null) => void;
  mediaType: "video" | "audio";
  label?: string;
  bucket?: string;
  folder?: string;
}

interface UploadState {
  file: File | null;
  fileName: string | null;
  duration: number | null;
  bytesUploaded: number;
  bytesTotal: number;
}

// 6MB chunk size for TUS uploads
const CHUNK_SIZE = 6 * 1024 * 1024;

export function MediaUpload({
  currentUrl,
  onUrlChange,
  onDurationChange,
  mediaType,
  label,
  bucket = "daily-content",
  folder = "courses",
}: MediaUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadState, setUploadState] = useState<UploadState | null>(null);
  const [canResume, setCanResume] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [externalUrl, setExternalUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement>(null);
  const tusUploadRef = useRef<tus.Upload | null>(null);

  const acceptTypes = mediaType === "video" 
    ? "video/mp4,video/webm,video/quicktime" 
    : "audio/mpeg,audio/wav,audio/ogg,audio/mp4";

  const getMediaDuration = (file: File): Promise<number | null> => {
    return new Promise((resolve) => {
      const element = mediaType === "video" 
        ? document.createElement("video")
        : document.createElement("audio");
      
      element.preload = "metadata";
      element.onloadedmetadata = () => {
        URL.revokeObjectURL(element.src);
        resolve(element.duration);
      };
      element.onerror = () => {
        resolve(null);
      };
      element.src = URL.createObjectURL(file);
    });
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const startTusUpload = useCallback(async (
    file: File, 
    fileName: string, 
    duration: number | null,
    shouldResume?: boolean
  ) => {
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;
    
    if (!accessToken) {
      throw new Error("Sessão expirada. Faça login novamente.");
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

    return new Promise<string>((resolve, reject) => {
      const upload = new tus.Upload(file, {
        endpoint: `${supabaseUrl}/storage/v1/upload/resumable`,
        retryDelays: [0, 1000, 3000, 5000, 10000],
        chunkSize: CHUNK_SIZE,
        headers: {
          authorization: `Bearer ${accessToken}`,
          "x-upsert": "true",
        },
        uploadDataDuringCreation: true,
        removeFingerprintOnSuccess: true,
        metadata: {
          bucketName: bucket,
          objectName: fileName,
          contentType: file.type,
          cacheControl: "3600",
        },
        onError: (error) => {
          console.error("TUS upload error:", error);
          setUploadState({
            file,
            fileName,
            duration,
            bytesUploaded: 0,
            bytesTotal: file.size,
          });
          setCanResume(true);
          setIsUploading(false);
          reject(error);
        },
        onProgress: (bytesUploaded, bytesTotal) => {
          const percentage = Math.round((bytesUploaded / bytesTotal) * 100);
          setUploadProgress(percentage);
          setUploadState(prev => prev ? {
            ...prev,
            bytesUploaded,
            bytesTotal,
          } : null);
        },
        onSuccess: () => {
          const { data: publicUrlData } = supabase.storage
            .from(bucket)
            .getPublicUrl(fileName);
          
          resolve(publicUrlData.publicUrl);
        },
      });

      tusUploadRef.current = upload;

      upload.findPreviousUploads().then((previousUploads) => {
        if (previousUploads.length > 0 && shouldResume) {
          upload.resumeFromPreviousUpload(previousUploads[0]);
        }
        upload.start();
      });
    });
  }, [bucket]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isValidType = mediaType === "video" 
      ? file.type.startsWith("video/")
      : file.type.startsWith("audio/");
    
    if (!isValidType) {
      toast.error(`Por favor, selecione um arquivo de ${mediaType === "video" ? "vídeo" : "áudio"}`);
      return;
    }

    const maxSize = mediaType === "video" ? 3 * 1024 * 1024 * 1024 : 50 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error(`O arquivo deve ter no máximo ${mediaType === "video" ? "3GB" : "50MB"}`);
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setCanResume(false);

    try {
      const duration = await getMediaDuration(file);
      const fileExt = file.name.split(".").pop();
      const fileName = `${folder}/${mediaType}-${Date.now()}.${fileExt}`;

      setUploadState({
        file,
        fileName,
        duration,
        bytesUploaded: 0,
        bytesTotal: file.size,
      });

      const publicUrl = await startTusUpload(file, fileName, duration, false);
      onUrlChange(publicUrl);
      
      if (onDurationChange && duration) {
        onDurationChange(Math.round(duration));
      }
      
      toast.success(`${mediaType === "video" ? "Vídeo" : "Áudio"} enviado!`);
      setUploadState(null);
    } catch (error: unknown) {
      console.error("Upload error:", error);
      if (!canResume) {
        toast.error("Erro no upload. Você pode tentar retomar.");
      }
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleResumeUpload = async () => {
    if (!uploadState?.file || !uploadState?.fileName) {
      toast.error("Não há upload para retomar");
      return;
    }

    setIsUploading(true);
    setCanResume(false);

    try {
      const publicUrl = await startTusUpload(
        uploadState.file, 
        uploadState.fileName, 
        uploadState.duration,
        true
      );

      onUrlChange(publicUrl);
      
      if (onDurationChange && uploadState.duration) {
        onDurationChange(Math.round(uploadState.duration));
      }
      
      toast.success(`${mediaType === "video" ? "Vídeo" : "Áudio"} enviado!`);
      setUploadState(null);
    } catch (error: unknown) {
      console.error("Resume upload error:", error);
      toast.error("Erro ao retomar. Tente novamente.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleCancelUpload = () => {
    if (tusUploadRef.current) {
      tusUploadRef.current.abort();
      tusUploadRef.current = null;
    }
    setIsUploading(false);
    setUploadProgress(0);
    setUploadState(null);
    setCanResume(false);
    toast.info("Upload cancelado");
  };

  const handleRemove = async () => {
    if (!currentUrl) return;

    try {
      const urlParts = currentUrl.split(`/${bucket}/`);
      if (urlParts.length > 1) {
        const filePath = urlParts[1];
        await supabase.storage.from(bucket).remove([filePath]);
      }
      onUrlChange(null);
      if (onDurationChange) {
        onDurationChange(null);
      }
      toast.success("Arquivo removido");
    } catch (error) {
      console.error("Remove error:", error);
      toast.error("Erro ao remover o arquivo");
    }
  };

  const handleAddExternalUrl = () => {
    if (!externalUrl.trim()) return;
    onUrlChange(externalUrl.trim());
    setExternalUrl("");
    toast.success("Link adicionado!");
  };

  const togglePlay = () => {
    if (!mediaRef.current) return;
    
    if (isPlaying) {
      mediaRef.current.pause();
    } else {
      mediaRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleEnded = () => {
    setIsPlaying(false);
  };

  const handleClearResume = () => {
    setUploadState(null);
    setCanResume(false);
    setUploadProgress(0);
  };

  const Icon = mediaType === "video" ? Video : Music;
  const defaultLabel = mediaType === "video" ? "Vídeo" : "Áudio";

  // Has content - show preview
  if (currentUrl) {
    return (
      <div className="space-y-3">
        <Label className="text-base font-medium">{label || defaultLabel}</Label>
        
        <div className="relative rounded-lg overflow-hidden border bg-muted">
          {mediaType === "video" ? (
            <video
              ref={mediaRef as React.RefObject<HTMLVideoElement>}
              src={currentUrl}
              className="w-full h-32 object-cover"
              onEnded={handleEnded}
              controls
            />
          ) : (
            <div className="flex items-center gap-3 p-4">
              <button
                onClick={togglePlay}
                className="w-10 h-10 rounded-full bg-primary flex items-center justify-center hover:bg-primary/90 transition-colors shrink-0"
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4 text-primary-foreground" />
                ) : (
                  <Play className="w-4 h-4 text-primary-foreground ml-0.5" />
                )}
              </button>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground text-sm truncate">Áudio carregado</p>
                <p className="text-xs text-muted-foreground truncate">{currentUrl}</p>
              </div>
              <audio
                ref={mediaRef as React.RefObject<HTMLAudioElement>}
                src={currentUrl}
                onEnded={handleEnded}
                className="hidden"
              />
            </div>
          )}
          <Button
            variant="destructive"
            size="icon"
            onClick={handleRemove}
            className="absolute top-2 right-2 h-7 w-7"
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      </div>
    );
  }

  // No content - show compact upload interface
  return (
    <div className="space-y-3 min-w-0 overflow-x-auto">
      <Label className="text-base font-medium">{label || defaultLabel}</Label>

      <Tabs defaultValue="upload" className="w-full min-w-0">
        <TabsList className="grid w-full grid-cols-2 h-9">
          <TabsTrigger value="upload" className="text-xs gap-1.5">
            <Upload className="w-3.5 h-3.5" />
            Enviar arquivo
          </TabsTrigger>
          <TabsTrigger value="link" className="text-xs gap-1.5">
            <Link className="w-3.5 h-3.5" />
            Link externo
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="mt-3">
          <div
            className={`
              relative border-2 border-dashed rounded-lg p-4 text-center transition-colors
              ${isUploading || canResume
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50"
              }
            `}
          >
            {!isUploading && !canResume && (
              <input
                ref={fileInputRef}
                type="file"
                accept={acceptTypes}
                onChange={handleFileSelect}
                disabled={isUploading}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
              />
            )}

            {isUploading ? (
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 text-primary animate-spin" />
                  <p className="text-sm font-medium">{uploadProgress}%</p>
                </div>
                <Progress value={uploadProgress} className="h-2" />
                {uploadState && (
                  <p className="text-xs text-muted-foreground">
                    {formatBytes(uploadState.bytesUploaded)} / {formatBytes(uploadState.bytesTotal)}
                  </p>
                )}
                <Button variant="ghost" size="sm" onClick={handleCancelUpload} className="h-7 text-xs">
                  <X className="w-3 h-3 mr-1" /> Cancelar
                </Button>
              </div>
            ) : canResume && uploadState ? (
              <div className="space-y-2">
                <p className="text-sm font-medium">Upload interrompido</p>
                <Progress value={uploadProgress} className="h-2" />
                <div className="flex gap-2 justify-center">
                  <Button size="sm" onClick={handleResumeUpload} className="h-7 text-xs">
                    <RotateCcw className="w-3 h-3 mr-1" /> Retomar
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleClearResume} className="h-7 text-xs">
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <Icon className="w-6 h-6 mx-auto text-muted-foreground" />
                <p className="text-sm font-medium">Clique ou arraste</p>
                <p className="text-xs text-muted-foreground">
                  {mediaType === "video" ? "MP4, WebM (máx. 3GB)" : "MP3, WAV (máx. 50MB)"}
                </p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="link" className="mt-3">
          <div className="flex gap-2 min-w-0">
            <Input
              type="url"
              value={externalUrl}
              onChange={(e) => setExternalUrl(e.target.value)}
              placeholder="https://..."
              className="h-10 min-w-0 flex-1"
            />
            <Button 
              onClick={handleAddExternalUrl} 
              disabled={!externalUrl.trim()}
              className="shrink-0"
            >
              Adicionar
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Cole o link do YouTube, Vimeo, Bunny ou outro serviço
          </p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
