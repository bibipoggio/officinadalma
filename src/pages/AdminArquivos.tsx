import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { LoadingState } from "@/components/layout/PageState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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

const AdminArquivos = () => {
  const [buckets, setBuckets] = useState<StorageBucket[]>([]);
  const [selectedBucket, setSelectedBucket] = useState<string>("");
  const [files, setFiles] = useState<StorageFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteFile, setDeleteFile] = useState<StorageFile | null>(null);
  const { toast } = useToast();

  // Fetch buckets on mount
  useEffect(() => {
    fetchBuckets();
  }, []);

  // Fetch files when bucket changes
  useEffect(() => {
    if (selectedBucket) {
      fetchFiles(selectedBucket);
    } else {
      setFiles([]);
    }
  }, [selectedBucket]);

  const fetchBuckets = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.storage.listBuckets();
      if (error) throw error;
      setBuckets(data || []);
      if (data && data.length > 0) {
        setSelectedBucket(data[0].id);
      }
    } catch (error) {
      console.error("Error fetching buckets:", error);
      toast({
        title: "Erro ao carregar buckets",
        description: "Não foi possível carregar os buckets de armazenamento.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchFiles = async (bucketId: string) => {
    setIsLoadingFiles(true);
    try {
      const allFiles: StorageFile[] = [];
      
      // Recursive function to list files in all folders
      const listFilesRecursive = async (path: string = "") => {
        const { data, error } = await supabase.storage.from(bucketId).list(path, {
          limit: 500,
          sortBy: { column: "created_at", order: "desc" },
        });
        
        if (error) throw error;
        
        for (const item of data || []) {
          if (item.id) {
            // It's a file
            const fullPath = path ? `${path}/${item.name}` : item.name;
            allFiles.push({ 
              ...item, 
              name: fullPath,
              bucket_id: bucketId 
            } as StorageFile);
          } else {
            // It's a folder - recurse into it
            const folderPath = path ? `${path}/${item.name}` : item.name;
            await listFilesRecursive(folderPath);
          }
        }
      };
      
      await listFilesRecursive("");
      
      // Sort by created_at descending
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

      // Refresh files list
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

  const getFileIcon = (mimeType?: string) => {
    if (!mimeType) return <File className="w-5 h-5 text-muted-foreground" />;
    if (mimeType.startsWith("image/")) return <Image className="w-5 h-5 text-blue-500" />;
    if (mimeType.startsWith("audio/")) return <Music className="w-5 h-5 text-purple-500" />;
    if (mimeType.startsWith("video/")) return <Video className="w-5 h-5 text-pink-500" />;
    if (mimeType.includes("pdf") || mimeType.includes("text")) return <FileText className="w-5 h-5 text-orange-500" />;
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

  return (
    <AppLayout>
      <div className="space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-semibold text-foreground">
              Gerenciador de Arquivos
            </h1>
            <p className="text-muted-foreground mt-1">
              Visualize e gerencie todos os arquivos da plataforma
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
                  <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <File className="w-6 h-6 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Arquivos</p>
                    <p className="text-2xl font-semibold">{files.length}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <HardDrive className="w-6 h-6 text-green-500" />
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
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[50%]">Arquivo</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Tamanho</TableHead>
                          <TableHead>Data</TableHead>
                          <TableHead className="w-[100px] text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredFiles.map((file) => (
                          <TableRow key={file.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                {getFileIcon(file.metadata?.mimetype)}
                                <span className="truncate max-w-[300px]" title={file.name}>
                                  {file.name}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm text-muted-foreground">
                                {file.metadata?.mimetype?.split("/")[1]?.toUpperCase() || "—"}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm">
                                {formatFileSize(file.metadata?.size)}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm text-muted-foreground">
                                {format(new Date(file.created_at), "dd/MM/yyyy", {
                                  locale: ptBR,
                                })}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => window.open(getFileUrl(file), "_blank")}
                                  title="Abrir arquivo"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  onClick={() => setDeleteFile(file)}
                                  title="Excluir arquivo"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
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
    </AppLayout>
  );
};

export default AdminArquivos;
