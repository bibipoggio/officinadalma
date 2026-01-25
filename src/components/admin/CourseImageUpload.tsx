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

export function CourseImageUpload({ 
  currentUrl, 
  onUrlChange, 
  courseSlug = "new",
  label = "Imagem de Capa"
}: CourseImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione um arquivo de imagem");
      return;
    }

    // Validate file size (max 50MB)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error("A imagem deve ter no máximo 50MB");
      return;
    }

    setIsUploading(true);

    try {
      // Create unique filename
      const fileExt = file.name.split(".").pop();
      const sanitizedSlug = courseSlug.replace(/[^a-z0-9-]/gi, "_");
      const fileName = `cover-${sanitizedSlug}-${Date.now()}.${fileExt}`;
      const filePath = `covers/${fileName}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from("course-images")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (error) {
        throw error;
      }

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from("course-images")
        .getPublicUrl(filePath);

      onUrlChange(publicUrlData.publicUrl);
      toast.success("Imagem enviada com sucesso!");
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error.message || "Erro ao enviar a imagem");
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
          {/* Current image preview */}
          <div className="relative rounded-xl overflow-hidden border bg-muted">
            <img 
              src={currentUrl} 
              alt="Preview da capa" 
              className="w-full h-48 object-cover"
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
                <p className="text-lg text-muted-foreground">Enviando...</p>
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
