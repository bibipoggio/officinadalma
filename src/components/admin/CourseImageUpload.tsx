import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { X, Image as ImageIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface CourseImageUploadProps {
  currentUrl: string | null;
  onUrlChange: (url: string | null) => void;
  courseSlug?: string;
  label?: string;
}

// Target dimensions for course cover images (16:9 aspect ratio)
const TARGET_WIDTH = 1280;
const TARGET_HEIGHT = 720;
const JPEG_QUALITY = 0.85;

/**
 * Compress and resize image to optimize storage and display
 * Returns a Blob with the processed image
 */
async function compressAndResizeImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    img.onload = () => {
      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }

      // Calculate dimensions maintaining aspect ratio within target bounds
      let { width, height } = img;
      const aspectRatio = width / height;
      const targetAspectRatio = TARGET_WIDTH / TARGET_HEIGHT;

      // If image is smaller than target and already correct aspect ratio, use original size
      if (width <= TARGET_WIDTH && height <= TARGET_HEIGHT) {
        // Just ensure minimum quality compression
        canvas.width = width;
        canvas.height = height;
      } else {
        // Resize to fit within target dimensions
        if (aspectRatio > targetAspectRatio) {
          // Image is wider than target ratio
          width = TARGET_WIDTH;
          height = Math.round(TARGET_WIDTH / aspectRatio);
        } else {
          // Image is taller than target ratio
          height = TARGET_HEIGHT;
          width = Math.round(TARGET_HEIGHT * aspectRatio);
        }
        canvas.width = width;
        canvas.height = height;
      }

      // Apply smoothing for better quality
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      // Draw resized image
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Convert to JPEG blob with compression
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("Failed to create image blob"));
          }
        },
        "image/jpeg",
        JPEG_QUALITY
      );
    };

    img.onerror = () => {
      reject(new Error("Failed to load image"));
    };

    // Load image from file
    img.src = URL.createObjectURL(file);
  });
}

export function CourseImageUpload({ 
  currentUrl, 
  onUrlChange, 
  courseSlug = "new",
  label = "Imagem de Capa"
}: CourseImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione um arquivo de imagem");
      return;
    }

    // Validate file size (max 50MB before compression)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error("A imagem deve ter no máximo 50MB");
      return;
    }

    setIsUploading(true);
    setUploadProgress("Comprimindo...");

    try {
      // Compress and resize image
      const compressedBlob = await compressAndResizeImage(file);
      
      // Show compression results
      const originalSizeKB = Math.round(file.size / 1024);
      const compressedSizeKB = Math.round(compressedBlob.size / 1024);
      const savings = Math.round((1 - compressedBlob.size / file.size) * 100);
      
      console.log(`Image compressed: ${originalSizeKB}KB → ${compressedSizeKB}KB (${savings}% reduction)`);
      
      setUploadProgress("Enviando...");

      // Create unique filename (always .jpg since we convert to JPEG)
      const sanitizedSlug = courseSlug.replace(/[^a-z0-9-]/gi, "_");
      const fileName = `cover-${sanitizedSlug}-${Date.now()}.jpg`;
      const filePath = `covers/${fileName}`;

      // Upload compressed image to Supabase Storage
      const { data, error } = await supabase.storage
        .from("course-images")
        .upload(filePath, compressedBlob, {
          cacheControl: "3600",
          upsert: true,
          contentType: "image/jpeg",
        });

      if (error) {
        throw error;
      }

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from("course-images")
        .getPublicUrl(filePath);

      onUrlChange(publicUrlData.publicUrl);
      toast.success(`Imagem enviada! (${compressedSizeKB}KB, ${savings}% menor)`);
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error.message || "Erro ao enviar a imagem");
    } finally {
      setIsUploading(false);
      setUploadProgress("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemove = async () => {
    if (!currentUrl) return;

    try {
      // Extract file path from URL
      const urlParts = currentUrl.split("/course-images/");
      if (urlParts.length > 1) {
        const filePath = urlParts[1];
        await supabase.storage.from("course-images").remove([filePath]);
      }
      onUrlChange(null);
      toast.success("Imagem removida");
    } catch (error) {
      console.error("Remove error:", error);
      toast.error("Erro ao remover a imagem");
    }
  };

  return (
    <div className="space-y-4">
      <Label className="text-base">{label}</Label>
      
      {currentUrl ? (
        <div className="space-y-3">
          {/* Current image preview - aspect-video for 16:9 display */}
          <div className="relative rounded-xl overflow-hidden border bg-muted aspect-video">
            <img 
              src={currentUrl} 
              alt="Preview da capa" 
              className="w-full h-full object-contain bg-muted"
            />
            <Button
              variant="destructive"
              size="icon"
              onClick={handleRemove}
              className="absolute top-2 right-2"
              type="button"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          
          {/* URL input for manual editing */}
          <div className="space-y-2">
            <Label htmlFor="image_url_manual" className="text-sm text-muted-foreground">
              Ou insira um link externo
            </Label>
            <Input
              id="image_url_manual"
              type="url"
              value={currentUrl}
              onChange={(e) => onUrlChange(e.target.value || null)}
              placeholder="https://..."
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
              accept="image/*"
              onChange={handleFileSelect}
              disabled={isUploading}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
            />
            
            {isUploading ? (
              <div className="space-y-3">
                <Loader2 className="w-10 h-10 mx-auto text-primary animate-spin" />
                <p className="text-lg text-muted-foreground">{uploadProgress}</p>
              </div>
            ) : (
              <div className="space-y-3">
                <ImageIcon className="w-10 h-10 mx-auto text-muted-foreground" />
                <div>
                  <p className="text-lg font-medium text-foreground">
                    Clique ou arraste a imagem
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    JPG, PNG, WebP (máx. 50MB)
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Será redimensionada para 1280×720px e comprimida automaticamente
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
            <Label htmlFor="image_url_external" className="text-sm text-muted-foreground">
              Insira um link externo
            </Label>
            <Input
              id="image_url_external"
              type="url"
              value=""
              onChange={(e) => onUrlChange(e.target.value || null)}
              placeholder="https://..."
            />
          </div>
        </div>
      )}
    </div>
  );
}
