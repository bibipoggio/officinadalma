import { useState, useEffect, useCallback } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { LoadingState } from "@/components/layout/PageState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  FolderOpen,
  File,
  Image,
  Music,
  Video,
  FileText,
  Trash2,
  ExternalLink,
  Search,
  RefreshCw,
  HardDrive,
  Link2,
  Check,
  Copy,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface StorageBucket {
  id: string;
  name: string;
  public: boolean;
  created_at: string;
}

interface StorageFile {
  id: string;
  name: string;
  bucket_id: string;
  created_at: string;
  updated_at: string;
  metadata: {
    size?: number;
    mimetype?: string;
  } | null;
}

interface LessonOption {
  id: string;
  title: string;
  course_title: string;
  content_type: string;
  media_url: string | null;
  audio_url: string | null;
}

const AdminArquivos = () => {
  const [buckets, setBuckets] = useState<StorageBucket[]>([]);
  const [selectedBucket, setSelectedBucket] = useState<string>("");
  const [files, setFiles] = useState<StorageFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteFile, setDeleteFile] = useState<StorageFile | null>(null);
  const { toast } = useToast();

  // Assign file to lesson state
  const [assignFile, setAssignFile] = useState<StorageFile | null>(null);
  const [lessons, setLessons] = useState<LessonOption[]>([]);
  const [isLoadingLessons, setIsLoadingLessons] = useState(false);
  const [selectedLessonId, setSelectedLessonId] = useState<string>("");
  const [assignTarget, setAssignTarget] = useState<"media_url" | "audio_url">("media_url");
  const [isAssigning, setIsAssigning] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  // Known buckets (listBuckets requires service role, so we hardcode them)
  const KNOWN_BUCKETS: StorageBucket[] = [
    { id: "daily-content", name: "daily-content", public: true, created_at: "" },
    { id: "lesson-content", name: "lesson-content", public: true, created_at: "" },
    { id: "course-images", name: "course-images", public: true, created_at: "" },
    { id: "avatars", name: "avatars", public: true, created_at: "" },
  ];

  // Initialize buckets on mount
  useEffect(() => {
    setBuckets(KNOWN_BUCKETS);
    setSelectedBucket(KNOWN_BUCKETS[0].id);
    setIsLoading(false);
  }, []);

  // Fetch files when bucket changes
  useEffect(() => {
    if (selectedBucket) {
      fetchFiles(selectedBucket);
    } else {
      setFiles([]);
    }
  }, [selectedBucket]);

  const fetchFiles = async (bucketId: string) => {
    setIsLoadingFiles(true);
    try {
      const allFiles: StorageFile[] = [];
      
      const listFilesRecursive = async (path: string = "") => {
        const { data, error } = await supabase.storage.from(bucketId).list(path, {
          limit: 500,
          sortBy: { column: "created_at", order: "desc" },
        });
        
        if (error) throw error;
        
        for (const item of data || []) {
          if (item.id) {
            const fullPath = path ? `${path}/${item.name}` : item.name;
            allFiles.push({ 
              ...item, 
              name: fullPath,
              bucket_id: bucketId 
            } as StorageFile);
          } else {
            const folderPath = path ? `${path}/${item.name}` : item.name;
            await listFilesRecursive(folderPath);
          }
        }
      };
      
      await listFilesRecursive("");
      allFiles.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      
      setFiles(allFiles);
    } catch (error) {
      console.error("Error fetching files:", error);
      toast({
        title: "Erro ao carregar arquivos",
        description: "Não foi possível carregar os arquivos do bucket.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingFiles(false);
    }
  };

  const fetchLessons = useCallback(async () => {
    setIsLoadingLessons(true);
    try {
      const { data: coursesData, error: coursesError } = await supabase
        .from("courses")
        .select("id, title");
      
      if (coursesError) throw coursesError;

      const { data: lessonsData, error: lessonsError } = await supabase
        .from("course_lessons")
        .select("id, title, content_type, media_url, audio_url, course_id, position")
        .is("deleted_at", null)
        .order("position", { ascending: true });

      if (lessonsError) throw lessonsError;

      const courseMap = new Map((coursesData || []).map(c => [c.id, c.title]));
      
      setLessons(
        (lessonsData || []).map(l => ({
          id: l.id,
          title: l.title,
          course_title: courseMap.get(l.course_id) || "Curso desconhecido",
          content_type: l.content_type,
          media_url: l.media_url,
          audio_url: l.audio_url,
        }))
      );
    } catch (error) {
      console.error("Error fetching lessons:", error);
    } finally {
      setIsLoadingLessons(false);
    }
  }, []);

  const handleDeleteFile = async () => {
    if (!deleteFile) return;

    try {
      const { error } = await supabase.storage
        .from(deleteFile.bucket_id)
        .remove([deleteFile.name]);

      if (error) throw error;

      toast({
        title: "Arquivo excluído",
        description: "O arquivo foi excluído com sucesso.",
      });

      fetchFiles(selectedBucket);
    } catch (error) {
      console.error("Error deleting file:", error);
      toast({
        title: "Erro ao excluir",
        description: "Não foi possível excluir o arquivo.",
        variant: "destructive",
      });
    } finally {
      setDeleteFile(null);
    }
  };

  const getFileUrl = (file: StorageFile) => {
    const { data } = supabase.storage.from(file.bucket_id).getPublicUrl(file.name);
    return data.publicUrl;
  };

  const handleOpenAssign = (file: StorageFile) => {
    setAssignFile(file);
    setSelectedLessonId("");
    
    // Auto-detect target based on file type
    const mime = file.metadata?.mimetype || "";
    const name = file.name.toLowerCase();
    if (mime.startsWith("audio/") || name.endsWith(".m4a") || name.endsWith(".mp3")) {
      setAssignTarget("audio_url");
    } else {
      setAssignTarget("media_url");
    }
    
    fetchLessons();
  };

  const handleAssign = async () => {
    if (!assignFile || !selectedLessonId) return;

    setIsAssigning(true);
    try {
      const fileUrl = getFileUrl(assignFile);
      
      const updateData: Record<string, string> = {};
      updateData[assignTarget] = fileUrl;

      const { error } = await supabase
        .from("course_lessons")
        .update(updateData)
        .eq("id", selectedLessonId);

      if (error) throw error;

      toast({
        title: "Arquivo atribuído",
        description: `Arquivo vinculado como ${assignTarget === "media_url" ? "vídeo" : "áudio"} da aula com sucesso.`,
      });

      setAssignFile(null);
      // Refresh lessons data
      fetchLessons();
    } catch (error) {
      console.error("Error assigning file:", error);
      toast({
        title: "Erro ao atribuir",
        description: "Não foi possível vincular o arquivo à aula.",
        variant: "destructive",
      });
    } finally {
      setIsAssigning(false);
    }
  };

  const handleCopyUrl = (file: StorageFile) => {
    const url = getFileUrl(file);
    navigator.clipboard.writeText(url);
    setCopiedUrl(file.id);
    setTimeout(() => setCopiedUrl(null), 2000);
    toast({ title: "URL copiada!" });
  };

  const getFileIcon = (mimeType?: string, fileName?: string) => {
    const name = fileName?.toLowerCase() || "";
    if (!mimeType && !name) return <File className="w-5 h-5 text-muted-foreground" />;
    if (mimeType?.startsWith("image/") || name.endsWith(".jpg") || name.endsWith(".png") || name.endsWith(".webp")) return <Image className="w-5 h-5 text-blue-500" />;
    if (mimeType?.startsWith("audio/") || name.endsWith(".mp3") || name.endsWith(".m4a")) return <Music className="w-5 h-5 text-purple-500" />;
    if (mimeType?.startsWith("video/") || name.endsWith(".mp4")) return <Video className="w-5 h-5 text-pink-500" />;
    if (mimeType?.includes("pdf") || mimeType?.includes("text") || name.endsWith(".pdf")) return <FileText className="w-5 h-5 text-orange-500" />;
    return <File className="w-5 h-5 text-muted-foreground" />;
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const filteredFiles = files.filter(file =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalSize = files.reduce((acc, file) => acc + (file.metadata?.size || 0), 0);

  const selectedLesson = lessons.find(l => l.id === selectedLessonId);

  return (
    <AppLayout>
      <div className="space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-semibold text-foreground">
              Gerenciador de Arquivos
            </h1>
            <p className="text-muted-foreground mt-1">
              Visualize, gerencie e vincule arquivos às aulas
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => selectedBucket && fetchFiles(selectedBucket)}
            disabled={isLoadingFiles}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoadingFiles ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </header>

        {isLoading ? (
          <LoadingState message="Carregando buckets..." />
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FolderOpen className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Buckets</p>
                    <p className="text-2xl font-semibold">{buckets.length}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <File className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Arquivos</p>
                    <p className="text-2xl font-semibold">{files.length}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <HardDrive className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Tamanho Total</p>
                    <p className="text-2xl font-semibold">{formatFileSize(totalSize)}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Bucket Selector & Search */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Arquivos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1 sm:max-w-xs">
                    <Select value={selectedBucket} onValueChange={setSelectedBucket}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um bucket" />
                      </SelectTrigger>
                      <SelectContent>
                        {buckets.map((bucket) => (
                          <SelectItem key={bucket.id} value={bucket.id}>
                            <div className="flex items-center gap-2">
                              <FolderOpen className="w-4 h-4" />
                              {bucket.name}
                              {bucket.public && (
                                <Badge variant="secondary" className="ml-2 text-xs">
                                  Público
                                </Badge>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar arquivos..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {isLoadingFiles ? (
                  <div className="py-8">
                    <LoadingState message="Carregando arquivos..." />
                  </div>
                ) : filteredFiles.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <File className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>
                      {searchQuery
                        ? "Nenhum arquivo encontrado para esta busca"
                        : "Nenhum arquivo neste bucket"}
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Desktop table */}
                    <div className="hidden md:block border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="min-w-[200px]">Arquivo</TableHead>
                            <TableHead className="w-[80px]">Tipo</TableHead>
                            <TableHead className="w-[90px]">Tamanho</TableHead>
                            <TableHead className="w-[100px]">Data</TableHead>
                            <TableHead className="w-[150px] text-right">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredFiles.map((file) => (
                            <TableRow key={file.id}>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  {getFileIcon(file.metadata?.mimetype, file.name)}
                                  <span className="truncate" title={file.name}>
                                    {file.name}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <span className="text-xs text-muted-foreground">
                                  {file.metadata?.mimetype?.split("/")[1]?.toUpperCase() || "—"}
                                </span>
                              </TableCell>
                              <TableCell>
                                <span className="text-xs">
                                  {formatFileSize(file.metadata?.size)}
                                </span>
                              </TableCell>
                              <TableCell>
                                <span className="text-xs text-muted-foreground">
                                  {format(new Date(file.created_at), "dd/MM/yy", { locale: ptBR })}
                                </span>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center justify-end gap-1">
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleCopyUrl(file)} title="Copiar URL">
                                    {copiedUrl === file.id ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenAssign(file)} title="Atribuir a uma aula">
                                    <Link2 className="w-4 h-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => window.open(getFileUrl(file), "_blank")} title="Abrir arquivo">
                                    <ExternalLink className="w-4 h-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteFile(file)} title="Excluir arquivo">
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Mobile card list */}
                    <div className="md:hidden space-y-2">
                      {filteredFiles.map((file) => (
                        <div key={file.id} className="border rounded-lg p-3 space-y-2">
                          <div className="flex items-start gap-2">
                            {getFileIcon(file.metadata?.mimetype, file.name)}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate" title={file.name}>
                                {file.name.split("/").pop()}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                {file.name}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span>{file.metadata?.mimetype?.split("/")[1]?.toUpperCase() || "—"}</span>
                            <span>•</span>
                            <span>{formatFileSize(file.metadata?.size)}</span>
                            <span>•</span>
                            <span>{format(new Date(file.created_at), "dd/MM/yy", { locale: ptBR })}</span>
                          </div>
                          <div className="flex items-center gap-1 pt-1 border-t border-border/50">
                            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 flex-1" onClick={() => handleCopyUrl(file)}>
                              {copiedUrl === file.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                              Copiar
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 flex-1" onClick={() => handleOpenAssign(file)}>
                              <Link2 className="w-3 h-3" />
                              Vincular
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => window.open(getFileUrl(file), "_blank")}>
                              <ExternalLink className="w-3 h-3" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive hover:text-destructive" onClick={() => setDeleteFile(file)}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteFile} onOpenChange={() => setDeleteFile(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir arquivo?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o arquivo "{deleteFile?.name}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteFile}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Assign File to Lesson Dialog */}
      <Dialog open={!!assignFile} onOpenChange={() => setAssignFile(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Atribuir arquivo à aula</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* File info */}
            <div className="rounded-lg bg-muted/50 border p-3">
              <div className="flex items-center gap-3">
                {assignFile && getFileIcon(assignFile.metadata?.mimetype, assignFile.name)}
                <span className="text-sm font-medium truncate">{assignFile?.name}</span>
              </div>
              {assignFile && (
                <p className="text-xs text-muted-foreground mt-1 break-all">
                  {getFileUrl(assignFile)}
                </p>
              )}
            </div>

            {/* Target field */}
            <div className="space-y-2">
              <Label>Vincular como</Label>
              <Select value={assignTarget} onValueChange={(v) => setAssignTarget(v as "media_url" | "audio_url")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="media_url">
                    <div className="flex items-center gap-2">
                      <Video className="w-4 h-4" />
                      Vídeo da aula (media_url)
                    </div>
                  </SelectItem>
                  <SelectItem value="audio_url">
                    <div className="flex items-center gap-2">
                      <Music className="w-4 h-4" />
                      Áudio / Podcast (audio_url)
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Lesson selector */}
            <div className="space-y-2">
              <Label>Selecione a aula</Label>
              {isLoadingLessons ? (
                <p className="text-sm text-muted-foreground">Carregando aulas...</p>
              ) : (
                <Select value={selectedLessonId} onValueChange={setSelectedLessonId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Escolha uma aula..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {lessons.map((lesson) => (
                      <SelectItem key={lesson.id} value={lesson.id}>
                        <div className="flex flex-col">
                          <span className="text-sm">{lesson.title}</span>
                          <span className="text-xs text-muted-foreground">{lesson.course_title}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Current values preview */}
            {selectedLesson && (
              <div className="rounded-lg border p-3 space-y-2 text-sm">
                <p className="font-medium">Valores atuais da aula:</p>
                <div className="space-y-1 text-muted-foreground">
                  <p className="flex items-center gap-2">
                    <Video className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">
                      {selectedLesson.media_url || <span className="italic">Sem vídeo</span>}
                    </span>
                  </p>
                  <p className="flex items-center gap-2">
                    <Music className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">
                      {selectedLesson.audio_url || <span className="italic">Sem áudio</span>}
                    </span>
                  </p>
                </div>
                {assignTarget === "media_url" && selectedLesson.media_url && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                    ⚠️ O vídeo atual será substituído.
                  </p>
                )}
                {assignTarget === "audio_url" && selectedLesson.audio_url && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                    ⚠️ O áudio atual será substituído.
                  </p>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignFile(null)}>
              Cancelar
            </Button>
            <Button
              onClick={handleAssign}
              disabled={!selectedLessonId || isAssigning}
            >
              {isAssigning ? "Atribuindo..." : "Atribuir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default AdminArquivos;
