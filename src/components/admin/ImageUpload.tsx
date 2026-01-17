import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { Upload, X, Image as ImageIcon, Loader2, Check } from "lucide-react";
import { toast } from "sonner";

interface ImageUploadProps {
  currentUrl: string | null;
  onUrlChange: (url: string | null) => void;
  date: string;
  label?: string;
}

export function ImageUpload({ 
  currentUrl, 
  onUrlChange, 
  date,
  label = "Imagem de Capa"
}: ImageUploadProps) {
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

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error("A imagem deve ter no máximo 10MB");
      return;
    }

    setIsUploading(true);

    try {
      // Create unique filename
      const fileExt = file.name.split(".").pop();
      const fileName = `cover-${date}-${Date.now()}.${fileExt}`;
      const filePath = `images/${fileName}`;

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
      const urlParts = currentUrl.split("/daily-content/");
      if (urlParts.length > 1) {
        const filePath = urlParts[1];
        await supabase.storage.from("daily-content").remove([filePath]);
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
      <Label className="text-lg font-medium">{label}</Label>
      
      {currentUrl ? (
        <div className="space-y-3">
          {/* Current image preview */}
          <div className="relative rounded-xl overflow-hidden border bg-muted">
            <img 
              src={currentUrl} 
              alt="Preview" 
              className="w-full h-48 object-cover"
            />
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
            <Label htmlFor="image_url_manual" className="text-sm text-muted-foreground">
              Ou insira um link externo
            </Label>
            <Input
              id="image_url_manual"
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
                    JPG, PNG, WebP (máx. 10MB)
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
              className="text-base h-12"
            />
          </div>
        </div>
      )}
    </div>
  );
}