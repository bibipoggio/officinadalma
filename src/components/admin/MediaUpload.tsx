import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { X, Video, Music, Loader2, Play, Pause, RotateCcw } from "lucide-react";
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
          // Save state for resume
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
          // Get public URL
          const { data: publicUrlData } = supabase.storage
            .from(bucket)
            .getPublicUrl(fileName);
          
          resolve(publicUrlData.publicUrl);
        },
      });

      tusUploadRef.current = upload;

      // Check for previous uploads to resume
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

    // Validate file type
    const isValidType = mediaType === "video" 
      ? file.type.startsWith("video/")
      : file.type.startsWith("audio/");
    
    if (!isValidType) {
      toast.error(`Por favor, selecione um arquivo de ${mediaType === "video" ? "vídeo" : "áudio"}`);
      return;
    }

    // Validate file size (max 3GB for video, 50MB for audio)
    const maxSize = mediaType === "video" ? 3 * 1024 * 1024 * 1024 : 50 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error(`O arquivo deve ter no máximo ${mediaType === "video" ? "3GB" : "50MB"}`);
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setCanResume(false);

    try {
      // Get duration from file
      const duration = await getMediaDuration(file);
      
      // Create unique filename
      const fileExt = file.name.split(".").pop();
      const fileName = `${folder}/${mediaType}-${Date.now()}.${fileExt}`;

      // Initialize upload state
      setUploadState({
        file,
        fileName,
        duration,
        bytesUploaded: 0,
        bytesTotal: file.size,
      });

      // Start TUS upload
      const publicUrl = await startTusUpload(file, fileName, duration, false);

      onUrlChange(publicUrl);
      
      if (onDurationChange && duration) {
        onDurationChange(Math.round(duration));
      }
      
      toast.success(`${mediaType === "video" ? "Vídeo" : "Áudio"} enviado com sucesso!`);
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
      
      toast.success(`${mediaType === "video" ? "Vídeo" : "Áudio"} enviado com sucesso!`);
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
      // Extract file path from URL
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
  const defaultLabel = mediaType === "video" ? "Vídeo da Aula" : "Áudio da Aula";

  return (
    <div className="space-y-4">
      <Label className="text-lg font-medium">{label || defaultLabel}</Label>

      {currentUrl ? (
        <div className="space-y-3">
          {/* Media preview */}
          <div className="relative rounded-xl overflow-hidden border bg-muted">
            {mediaType === "video" ? (
              <video
                ref={mediaRef as React.RefObject<HTMLVideoElement>}
                src={currentUrl}
                className="w-full h-48 object-cover"
                onEnded={handleEnded}
                controls
              />
            ) : (
              <div className="flex items-center gap-4 p-6">
                <button
                  onClick={togglePlay}
                  className="w-14 h-14 rounded-full bg-primary flex items-center justify-center hover:bg-primary/90 transition-colors"
                >
                  {isPlaying ? (
                    <Pause className="w-6 h-6 text-primary-foreground" />
                  ) : (
                    <Play className="w-6 h-6 text-primary-foreground ml-1" />
                  )}
                </button>
                <div className="flex-1">
                  <p className="font-medium text-foreground flex items-center gap-2">
                    <Music className="w-4 h-4" />
                    Áudio carregado
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Clique para reproduzir
                  </p>
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
              className="absolute top-2 right-2"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* URL input for manual editing */}
          <div className="space-y-2">
            <Label htmlFor="media_url_manual" className="text-sm text-muted-foreground">
              Ou insira um link externo
            </Label>
            <Input
              id="media_url_manual"
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
              <div className="space-y-4">
                <div className="flex items-center justify-center gap-3">
                  <Loader2 className="w-6 h-6 text-primary animate-spin" />
                  <p className="text-lg font-medium text-foreground">
                    Enviando... {uploadProgress}%
                  </p>
                </div>
                <Progress value={uploadProgress} className="h-3" />
                {uploadState && (
                  <p className="text-sm text-muted-foreground text-center">
                    {formatBytes(uploadState.bytesUploaded)} de {formatBytes(uploadState.bytesTotal)}
                  </p>
                )}
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleCancelUpload}
                  className="mt-2"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancelar
                </Button>
              </div>
            ) : canResume && uploadState ? (
              <div className="space-y-4">
                <div className="flex items-center justify-center gap-3">
                  <RotateCcw className="w-6 h-6 text-accent-foreground" />
                  <p className="text-lg font-medium text-foreground">
                    Upload interrompido
                  </p>
                </div>
                <Progress value={uploadProgress} className="h-3" />
                <p className="text-sm text-muted-foreground text-center">
                  {formatBytes(uploadState.bytesUploaded)} de {formatBytes(uploadState.bytesTotal)} enviados
                </p>
                <div className="flex gap-2 justify-center mt-2">
                  <Button 
                    variant="default" 
                    size="sm" 
                    onClick={handleResumeUpload}
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Retomar upload
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleClearResume}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <Icon className="w-10 h-10 mx-auto text-muted-foreground" />
                <div>
                  <p className="text-lg font-medium text-foreground">
                    Clique ou arraste o {mediaType === "video" ? "vídeo" : "áudio"}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {mediaType === "video" 
                      ? "MP4, WebM (máx. 3GB) • Upload com retomada" 
                      : "MP3, WAV, OGG (máx. 50MB)"}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Manual URL input */}
          {!isUploading && !canResume && (
            <>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-muted" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">ou</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="media_url_external" className="text-sm text-muted-foreground">
                  Insira um link externo
                </Label>
                <Input
                  id="media_url_external"
                  type="url"
                  value=""
                  onChange={(e) => onUrlChange(e.target.value || null)}
                  placeholder="https://..."
                  className="text-base h-12"
                />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
